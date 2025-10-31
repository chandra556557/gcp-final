# 🤖 AI Healing Feature - Complete Guide

## ✅ Feature Status: FULLY IMPLEMENTED

The AI-Powered Self-Healing feature is now live and integrated into your Playwright CRX system!

---

## 🚀 Quick Access

### Frontend Dashboard
1. **Open**: http://localhost:5174
2. **Navigate**: Click **🤖 AI Healing** in the sidebar (under Test Management)
3. **Explore**: View strategies, benefits, and how AI healing works

### Backend API
- **Base URL**: http://localhost:3000/api/ai-healing
- **Auth**: Requires Bearer token in Authorization header

---

## 📋 API Endpoints

### 1. Analyze Broken Locator
**Endpoint**: `POST /api/ai-healing/analyze`

**Request Body**:
```json
{
  "brokenLocator": "button.submit-btn-12345",
  "brokenType": "css",
  "pageContext": {
    "selectorCounts": {
      "[role='button']": 5,
      "button": 12
    }
  },
  "elementSnapshot": {
    "tagName": "button",
    "textContent": "Submit",
    "attributes": {
      "id": "submit-form",
      "class": "btn btn-primary submit-btn-12345",
      "data-testid": "submit-button",
      "aria-label": "Submit form",
      "role": "button"
    },
    "boundingBox": { "x": 100, "y": 200, "width": 150, "height": 40 }
  },
  "scriptId": 1
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "confidence": 0.95,
    "suggestedLocators": [
      {
        "locator": "[data-testid=\"submit-button\"]",
        "type": "css",
        "score": 0.95,
        "reasoning": "Data test ID is the most stable selector for testing"
      },
      {
        "locator": "#submit-form",
        "type": "css",
        "score": 0.90,
        "reasoning": "Unique ID provides strong element identification"
      },
      {
        "locator": "[aria-label=\"Submit form\"]",
        "type": "css",
        "score": 0.85,
        "reasoning": "ARIA label is semantic and accessibility-friendly"
      },
      {
        "locator": "text=Submit",
        "type": "playwright",
        "score": 0.78,
        "reasoning": "Text-based selector is human-readable and intuitive"
      }
    ],
    "elementContext": {
      "tag": "button",
      "text": "Submit",
      "attributes": {
        "id": "submit-form",
        "data-testid": "submit-button",
        "aria-label": "Submit form"
      },
      "position": { "x": 100, "y": 200 },
      "size": { "width": 150, "height": 40 }
    },
    "similarElements": 1,
    "recommendedAction": "auto_fix"
  }
}
```

---

### 2. Batch Analyze Multiple Locators
**Endpoint**: `POST /api/ai-healing/batch-analyze`

**Request Body**:
```json
{
  "locators": [
    {
      "brokenLocator": ".old-class-123",
      "brokenType": "css",
      "pageContext": {},
      "elementSnapshot": {
        "tagName": "div",
        "attributes": { "data-testid": "user-card" }
      }
    },
    {
      "brokenLocator": "//span[@id='temp-456']",
      "brokenType": "xpath",
      "pageContext": {},
      "elementSnapshot": {
        "tagName": "span",
        "textContent": "Welcome",
        "attributes": { "aria-label": "Welcome message" }
      }
    }
  ]
}
```

**Response**: Array of analysis results (same format as single analyze)

---

### 3. Auto-Heal High Confidence Suggestion
**Endpoint**: `POST /api/ai-healing/auto-heal/:id`

**Example**: `POST /api/ai-healing/auto-heal/42`

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Auto-healed successfully"
}
```

**Response** (400 Bad Request - Low Confidence):
```json
{
  "success": false,
  "message": "Confidence too low for auto-healing"
}
```

---

### 4. Get AI Healing Statistics
**Endpoint**: `GET /api/ai-healing/stats`

**Response** (200 OK):
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

## 🎯 10 AI Strategies (Priority Order)

| # | Strategy | Confidence | Example Locator | Use Case |
|---|----------|------------|-----------------|----------|
| 1️⃣ | **Data Test ID** | 95% | `[data-testid="submit-btn"]` | Explicit test attributes |
| 2️⃣ | **Unique ID** | 90% | `#user-profile` | Stable, non-dynamic IDs |
| 3️⃣ | **ARIA Label** | 85% | `[aria-label="Close dialog"]` | Accessibility attributes |
| 4️⃣ | **Role-Based** | 80% | `[role="navigation"]` | Semantic HTML roles |
| 5️⃣ | **Text Content** | 78% | `text=Login` | Visible text matching |
| 6️⃣ | **Name Attribute** | 75% | `input[name="email"]` | Form elements |
| 7️⃣ | **Stable Classes** | 70% | `.user-card.primary` | Filtered stable classes |
| 8️⃣ | **XPath with Text** | 65% | `//button[text()="Save"]` | XPath fallback |
| 9️⃣ | **Nth-child** | 55% | `div:nth-child(3)` | Structural position |
| 🔟 | **Historical Learning** | Variable | From DB patterns | ML from past approvals |

---

## 🧠 How Machine Learning Works

### Learning Process
1. **Data Collection**: Every approved suggestion is stored in `SelfHealingLocator` table
2. **Pattern Analysis**: AI queries historical data for similar broken locators
3. **Scoring**: Combines usage count + average confidence from past approvals
4. **Suggestion**: Returns learned pattern with boosted confidence (+0.1)

### Example SQL Query
```sql
SELECT "validLocator", "validType", 
       COUNT(*) as usage_count, 
       AVG(confidence) as avg_confidence
FROM "SelfHealingLocator"
WHERE status = 'approved' 
  AND "brokenType" = 'css'
  AND "brokenLocator" LIKE '%submit%'
GROUP BY "validLocator", "validType"
ORDER BY usage_count DESC, avg_confidence DESC
LIMIT 1
```

---

## 🎬 Usage Workflow

### Scenario: Button Locator Breaks

**1. Test Fails**
```javascript
// Old locator breaks
await page.click('.btn-submit-xyz123'); // ❌ Element not found
```

**2. AI Analyzes**
```bash
POST /api/ai-healing/analyze
{
  "brokenLocator": ".btn-submit-xyz123",
  "brokenType": "css",
  "elementSnapshot": { ... }
}
```

**3. AI Suggests**
```json
{
  "confidence": 0.95,
  "suggestedLocators": [
    { "locator": "[data-testid='submit-btn']", "score": 0.95 },
    { "locator": "button:has-text('Submit')", "score": 0.78 }
  ],
  "recommendedAction": "auto_fix"
}
```

**4. Auto-Heal (85%+ confidence)**
```bash
POST /api/ai-healing/auto-heal/42
# Suggestion automatically approved
```

**5. Updated Test**
```javascript
// New stable locator
await page.click('[data-testid="submit-btn"]'); // ✅ Works!
```

---

## 📊 Confidence-Based Actions

| Confidence Range | Action | Description |
|------------------|--------|-------------|
| **≥ 85%** | `auto_fix` | Automatically approve and apply |
| **60-84%** | `manual_review` | Queue for human review |
| **< 60%** | `ignore` | Too low confidence, skip |

---

## 🔧 Integration with Self-Healing

The AI Healing system works seamlessly with the existing Self-Healing feature:

1. **Test fails** → Self-Healing detects broken locator
2. **AI analyzes** → Generates smart suggestions
3. **Suggestions stored** → Saved to `SelfHealingLocator` table
4. **Review/Approve** → View in Dashboard → Self-Healing tab
5. **Learning** → Approved patterns feed back into AI

---

## 🌐 Frontend UI Features

### Navigation
- **Location**: Sidebar → Test Management → 🤖 AI Healing

### Sections
1. **Intelligent Locator Analysis** - Feature overview
2. **AI Features Grid** - 4 key capabilities
3. **AI Healing Strategies** - 6 prioritized strategies explained
4. **Try AI Healing** - Quick start guide
5. **Benefits** - 6 value propositions

### Interactive Elements
- **View Self-Healing Suggestions** button → Navigates to healing tab
- **Strategy cards** with priority badges (High/Medium/Low)
- **Benefits grid** with emoji icons

---

## 🧪 Testing the API

### Using PowerShell (Windows)

```powershell
# Get your auth token first
$token = "YOUR_JWT_TOKEN_HERE"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Test analyze endpoint
$body = @{
    brokenLocator = "button.old-class"
    brokenType = "css"
    pageContext = @{}
    elementSnapshot = @{
        tagName = "button"
        textContent = "Click Me"
        attributes = @{
            "data-testid" = "my-button"
            "id" = "btn-submit"
        }
    }
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/ai-healing/analyze" `
    -Method POST `
    -Headers $headers `
    -Body $body
```

### Expected Response
```json
{
  "success": true,
  "data": {
    "confidence": 0.95,
    "suggestedLocators": [
      {
        "locator": "[data-testid=\"my-button\"]",
        "type": "css",
        "score": 0.95,
        "reasoning": "Data test ID is the most stable selector for testing"
      }
    ],
    "recommendedAction": "auto_fix"
  }
}
```

---

## 📁 Code Files

### Backend
- **Service**: `backend/src/services/aiHealing/aiHealing.service.ts` (412 lines)
- **Controller**: `backend/src/controllers/aiHealing.controller.ts` (96 lines)
- **Routes**: `backend/src/routes/aiHealing.routes.ts` (23 lines)
- **Integration**: `backend/src/index.ts` (line 158)

### Frontend
- **Dashboard**: `frontend/src/components/Dashboard.tsx` (lines 429-580)
- **Styles**: `frontend/src/components/Dashboard.css` (AI Healing section)

### Database
Uses existing `SelfHealingLocator` table:
```sql
SELECT * FROM "SelfHealingLocator" WHERE status = 'approved';
```

---

## 🎉 What's Working Right Now

✅ **Backend API** - All 4 endpoints live
✅ **AI Analysis Engine** - 10-strategy algorithm
✅ **Machine Learning** - Historical pattern learning
✅ **Auto-Healing** - High confidence auto-approval
✅ **Frontend UI** - Dashboard integration complete
✅ **Statistics** - Real-time metrics tracking
✅ **Database Integration** - Queries existing self-healing table

---

## 🚦 Next Steps

### To Start Using:

1. **Open Dashboard**: http://localhost:5174
2. **Login** with your credentials
3. **Navigate** to 🤖 AI Healing
4. **Read** the strategies and benefits
5. **Click** "View Self-Healing Suggestions"
6. **Review** any pending suggestions with AI confidence scores

### To Test API:

1. Get JWT token from login
2. Use the PowerShell example above
3. Send a broken locator with element snapshot
4. Receive AI-powered suggestions instantly

---

## 📚 Documentation

Full feature documentation available at:
- `AI_HEALING_FEATURE.md` (409 lines)

---

## 💡 Pro Tips

1. **Always include element snapshots** for best AI results
2. **High confidence (95%+)** means data-testid or unique ID found
3. **Review 60-84% suggestions** manually before approving
4. **The more you approve**, the smarter the AI becomes
5. **Check stats regularly** to track AI performance

---

**Built with ❤️ using TypeScript, Express, React, and PostgreSQL**
