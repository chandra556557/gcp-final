# Backend API Integration - Self-Healing & AI Healing

## ✅ Implementation Status

Both **Self-Healing** and **AI Healing** features are now **fully integrated** with backend API calls!

---

## 📡 Self-Healing API Calls

### 1. **Load Healing Suggestions**
**Location**: `Dashboard.tsx` → `loadData()` function (line ~88)

```typescript
const healingRes = await axios.get(`${API_URL}/self-healing/suggestions`, { headers });
```

**Backend Endpoint**: `GET /api/self-healing/suggestions`

**Response**:
```json
{
  "suggestions": [
    {
      "id": "1",
      "brokenLocator": "button.old-class",
      "validLocator": "[data-testid='submit-btn']",
      "confidence": 0.95,
      "status": "pending",
      "scriptName": "Login Test",
      "createdAt": "2025-10-28T10:00:00Z"
    }
  ]
}
```

---

### 2. **Approve Suggestion**
**Location**: `Dashboard.tsx` → `approveSuggestion()` function (line ~128)

```typescript
const approveSuggestion = async (id: string) => {
  await axios.post(`${API_URL}/self-healing/suggestions/${id}/approve`, {}, { headers });
  await loadData();
};
```

**Backend Endpoint**: `POST /api/self-healing/suggestions/:id/approve`

**Response**:
```json
{
  "success": true,
  "message": "Suggestion approved"
}
```

---

### 3. **Reject Suggestion**
**Location**: `Dashboard.tsx` → `rejectSuggestion()` function (line ~136)

```typescript
const rejectSuggestion = async (id: string) => {
  await axios.post(`${API_URL}/self-healing/suggestions/${id}/reject`, {}, { headers });
  await loadData();
};
```

**Backend Endpoint**: `POST /api/self-healing/suggestions/:id/reject`

**Response**:
```json
{
  "success": true,
  "message": "Suggestion rejected"
}
```

---

## 🤖 AI Healing API Calls

### 1. **Analyze Locator with AI**
**Location**: `Dashboard.tsx` → `analyzeLocatorWithAI()` function (line ~144)

```typescript
const analyzeLocatorWithAI = async () => {
  const response = await axios.post(`${API_URL}/ai-healing/analyze`, {
    brokenLocator: testLocator,
    brokenType: testLocatorType,
    pageContext: {},
    elementSnapshot: JSON.parse(testElementSnapshot)
  }, { headers });

  setAiAnalysisResult(response.data.data);
};
```

**Backend Endpoint**: `POST /api/ai-healing/analyze`

**Request Body**:
```json
{
  "brokenLocator": "button.submit-btn-12345",
  "brokenType": "css",
  "pageContext": {},
  "elementSnapshot": {
    "tagName": "button",
    "textContent": "Submit",
    "attributes": {
      "data-testid": "submit-btn",
      "id": "submit-form",
      "aria-label": "Submit form"
    }
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "confidence": 0.95,
    "suggestedLocators": [
      {
        "locator": "[data-testid=\"submit-btn\"]",
        "type": "css",
        "score": 0.95,
        "reasoning": "Data test ID is the most stable selector for testing"
      },
      {
        "locator": "#submit-form",
        "type": "css",
        "score": 0.90,
        "reasoning": "Unique ID provides strong element identification"
      }
    ],
    "elementContext": {
      "tag": "button",
      "text": "Submit",
      "attributes": { ... }
    },
    "similarElements": 1,
    "recommendedAction": "auto_fix"
  }
}
```

---

### 2. **Get AI Healing Statistics**
**Location**: `Dashboard.tsx` → `loadAIStats()` function (line ~175)

```typescript
const loadAIStats = async () => {
  const response = await axios.get(`${API_URL}/ai-healing/stats`, { headers });
  setAiStats(response.data.data);
};
```

**Backend Endpoint**: `GET /api/ai-healing/stats`

**Response**:
```json
{
  "success": true,
  "data": {
    "totalAnalyzed": 156,
    "autoHealed": 89,
    "manualReview": 45,
    "successRate": 85.9,
    "avgConfidence": 0.82
  }
}
```

---

### 3. **Auto-Heal Suggestion** 🆕
**Location**: `Dashboard.tsx` → `autoHealSuggestion()` function (line ~183)

```typescript
const autoHealSuggestion = async (suggestionId: number) => {
  const response = await axios.post(`${API_URL}/ai-healing/auto-heal/${suggestionId}`, {}, { headers });
  alert(response.data.message);
  await loadData();
};
```

**Backend Endpoint**: `POST /api/ai-healing/auto-heal/:id`

**Response** (Success):
```json
{
  "success": true,
  "message": "Auto-healed successfully"
}
```

**Response** (Low Confidence):
```json
{
  "success": false,
  "message": "Confidence too low for auto-healing"
}
```

---

## 🔄 Data Flow

### Self-Healing Flow
```
1. Test Fails → Backend creates suggestion
2. Frontend loads suggestions via GET /api/self-healing/suggestions
3. User sees pending suggestions in Dashboard
4. User clicks:
   - "🤖 AI Auto-Heal" → POST /api/ai-healing/auto-heal/:id (if confidence ≥85%)
   - "✓ Approve" → POST /api/self-healing/suggestions/:id/approve
   - "✗ Reject" → POST /api/self-healing/suggestions/:id/reject
5. Frontend reloads data
```

### AI Healing Flow
```
1. User enters broken locator in AI Healing tab
2. User provides optional element snapshot (JSON)
3. User clicks "🔍 Analyze with AI"
4. Frontend → POST /api/ai-healing/analyze
5. Backend analyzes with 10 strategies
6. Frontend displays:
   - Confidence score with color-coding
   - Recommended action (auto_fix/manual_review/ignore)
   - Top 5 suggestions with reasoning
   - Element context
```

---

## 📊 UI Integration Points

### Dashboard Component
**File**: `frontend/src/components/Dashboard.tsx`

#### State Variables
```typescript
const [aiAnalyzing, setAiAnalyzing] = useState(false);
const [aiAnalysisResult, setAiAnalysisResult] = useState<AIAnalysisResult | null>(null);
const [aiStats, setAiStats] = useState<AIStats | null>(null);
const [testLocator, setTestLocator] = useState('');
const [testLocatorType, setTestLocatorType] = useState('css');
const [testElementSnapshot, setTestElementSnapshot] = useState('');
```

#### useEffect Hooks
```typescript
// Load data on mount
useEffect(() => {
  loadData();
  loadAIStats();
}, []);

// Refresh AI stats when switching to AI Healing view
useEffect(() => {
  if (activeView === 'aihealing') {
    loadAIStats();
  }
}, [activeView]);
```

---

## 🎨 UI Features

### Self-Healing View (`activeView === 'healing'`)

✅ **Stats Dashboard**
- Total suggestions count
- Pending count (with badge in sidebar)
- Approved count

✅ **High-Confidence Indicator**
- Green badge for confidence ≥85%
- Shows "🤖 (Auto-Healable)" label
- Displays "🤖 AI Auto-Heal" button

✅ **Action Buttons**
- 🤖 AI Auto-Heal (only for confidence ≥85%)
- ✓ Approve (manual approval)
- ✗ Reject (manual rejection)

---

### AI Healing View (`activeView === 'aihealing'`)

✅ **Live AI Stats** (5 metrics)
- Total Analyzed
- Auto-Healed
- Manual Review
- Success Rate %
- Average Confidence %

✅ **Live AI Analyzer Form**
- Broken Locator input
- Locator Type dropdown (CSS/XPath/Playwright)
- Element Snapshot textarea (optional JSON)
- "🔍 Analyze with AI" button

✅ **Analysis Results Display**
- Confidence badge (color-coded: green ≥85%, yellow 60-84%, red <60%)
- Recommended action badge
- Top suggestions list with:
  - Rank number
  - Confidence score
  - Locator code
  - Type badge
  - Reasoning explanation
- Element context summary

---

## 🔧 Backend Services

### Self-Healing Service
**File**: `backend/src/services/selfHealing/selfHealing.service.ts`

**Key Methods**:
- `getSuggestions()` - Get all suggestions for a user
- `approveSuggestion()` - Approve a suggestion
- `rejectSuggestion()` - Reject a suggestion

---

### AI Healing Service
**File**: `backend/src/services/aiHealing/aiHealing.service.ts`

**Key Methods**:
- `analyzeLocator()` - Analyze broken locator with 10 strategies
- `autoHeal()` - Auto-approve high-confidence suggestions
- `getStats()` - Get AI performance metrics
- `batchAnalyze()` - Analyze multiple locators at once

**10 AI Strategies**:
1. Data Test IDs (95%)
2. Unique IDs (90%)
3. ARIA Labels (85%)
4. Role-based (80%)
5. Text Content (78%)
6. Name Attribute (75%)
7. Stable Classes (70%)
8. XPath with Text (65%)
9. Nth-child (55%)
10. Historical Learning (variable)

---

## 🧪 Testing the Integration

### Option 1: Browser Testing

1. **Open Dashboard**: http://localhost:5174
2. **Login** with credentials
3. **Navigate to AI Healing** tab
4. **Enter test data**:
   - Broken Locator: `button.old-submit-123`
   - Locator Type: `css`
   - Element Snapshot:
     ```json
     {
       "tagName": "button",
       "textContent": "Submit",
       "attributes": {
         "data-testid": "submit-btn",
         "id": "submit-form"
       }
     }
     ```
5. **Click "Analyze with AI"**
6. **See Results** with suggestions and confidence scores

---

### Option 2: API Testing (PowerShell)

```powershell
# Login to get token
$loginBody = @{
    email = "test@example.com"
    password = "password123"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/login" `
    -Method POST -ContentType "application/json" -Body $loginBody
$token = ($response.Content | ConvertFrom-Json).accessToken

# Test AI Healing
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$analyzeBody = @{
    brokenLocator = "button.old-class"
    brokenType = "css"
    elementSnapshot = @{
        tagName = "button"
        textContent = "Click Me"
        attributes = @{
            "data-testid" = "my-button"
        }
    }
} | ConvertTo-Json -Depth 3

Invoke-WebRequest -Uri "http://localhost:3000/api/ai-healing/analyze" `
    -Method POST -Headers $headers -Body $analyzeBody
```

---

## 📈 Network Tab Verification

Open **Chrome DevTools** → **Network** tab:

1. Navigate to Self-Healing → See `GET /api/self-healing/suggestions`
2. Click Approve → See `POST /api/self-healing/suggestions/:id/approve`
3. Navigate to AI Healing → See `GET /api/ai-healing/stats`
4. Click Analyze → See `POST /api/ai-healing/analyze`
5. Click AI Auto-Heal → See `POST /api/ai-healing/auto-heal/:id`

All requests should show **Status 200** with proper responses.

---

## ✨ New Features Added

### Self-Healing Enhancements
✅ High-confidence badge styling (green background)
✅ Auto-healable indicator
✅ AI Auto-Heal button (only for ≥85% confidence)
✅ Link to AI Healing tab from empty state

### AI Healing Features
✅ Live AI stats dashboard
✅ Interactive locator analyzer form
✅ Real-time API calls to backend
✅ Color-coded confidence badges
✅ Recommended action indicators
✅ Detailed suggestion cards with reasoning
✅ Element context display

---

## 🎉 Summary

**Backend Integration**: ✅ Complete
- Self-Healing: 3 endpoints (load, approve, reject)
- AI Healing: 3 endpoints (analyze, auto-heal, stats)

**Frontend Integration**: ✅ Complete
- Interactive forms with state management
- Real-time API calls with axios
- Error handling and loading states
- Beautiful UI with animations

**User Experience**: ✅ Enhanced
- Live feedback on analysis
- Clear confidence indicators
- One-click auto-healing
- Detailed explanations

---

**All backend calls are now working! 🚀**
