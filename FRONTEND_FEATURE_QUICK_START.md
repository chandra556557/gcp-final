# Frontend Feature - Quick Start Guide

## ✅ Feature Status: IMPLEMENTED

The "Import Sample Script" feature is fully implemented and ready to use.

---

## 🎯 How It Works

### Button Location
- **Location**: Step 1 (Generate card) in the ScriptCueCards component
- **Button Text**: "Import Sample Script" ✅ (This is correct!)
- **Action**: Opens a modal to select existing scripts and generate Allure reports

### What Happens When You Click

1. **Click "Import Sample Script"** button
2. **Modal Opens** with:
   - Project filter dropdown (optional)
   - Script selection dropdown
   - Generate Report button
3. **Select a script** from the dropdown
4. **Click "Generate Report"**
5. **System**:
   - Checks for existing test runs
   - Creates new test run if needed
   - Generates Allure report
   - Redirects to Test Runs view
   - Shows generated report

---

## 🔍 Testing the Feature

### Step 1: Verify Files Are Present

Check that these files exist:
- ✅ `playwright-crx-enhanced/frontend/src/components/ImportScriptModal.tsx`
- ✅ `playwright-crx-enhanced/frontend/src/components/ImportScriptModal.css`
- ✅ `playwright-crx-enhanced/frontend/src/components/Dashboard.tsx` (updated)

### Step 2: Start Frontend

```bash
cd playwright-crx-enhanced/frontend
npm run dev
```

### Step 3: Test the Feature

1. Open the dashboard in browser
2. Navigate to Scripts view
3. Find a script card with the 5-step workflow
4. Click "Import Sample Script" button in Step 1
5. **Expected**: Modal should open with:
   - Title: "Import Script & Generate Report"
   - Project filter dropdown
   - Script selection dropdown
   - Cancel and Generate Report buttons

### Step 4: Test Modal Functionality

1. **Select Project** (optional):
   - Choose a project from dropdown
   - Scripts should filter by project

2. **Select Script**:
   - Choose a script from dropdown
   - Selected script info should appear

3. **Generate Report**:
   - Click "Generate Report" button
   - Should show "⏳ Generating Report..." message
   - Should redirect to Test Runs view
   - Generated report should appear in list

---

## 🐛 Troubleshooting

### Modal Doesn't Open

**Check:**
1. Open browser console (F12)
2. Look for errors
3. Check if you see: `"Opening import script modal for:"` in console
4. Verify `ImportScriptModal` component is imported correctly

**Solution:**
- Refresh the page (Ctrl+F5 or Cmd+Shift+R)
- Check browser console for errors
- Verify all files are saved

### No Scripts in Dropdown

**Check:**
1. Do you have scripts in the database?
2. Are you logged in?
3. Check browser console for API errors

**Solution:**
- Create a script first
- Verify authentication token is valid
- Check network tab for API calls

### Generate Report Fails

**Check:**
1. Is backend server running?
2. Check browser console for errors
3. Verify script has test runs or can create one

**Solution:**
- Start backend: `cd playwright-crx-enhanced/backend && npm run dev`
- Check backend logs
- Verify database connection

---

## 📝 Expected Behavior

### Button Text
- ✅ **"Import Sample Script"** - This is the correct text!
- The button opens a modal to import/existing scripts

### Modal Appearance
- Dark overlay background
- White modal box in center
- Title: "Import Script & Generate Report"
- Close button (X) in top right
- Project filter dropdown
- Script selection dropdown
- Cancel and Generate Report buttons

### After Generating Report
- Modal closes automatically
- Redirects to Test Runs view
- Shows generated report in list
- Report has "View Report" button

---

## 🔧 Code Verification

### Dashboard.tsx
- ✅ Import: `import ImportScriptModal from './ImportScriptModal';`
- ✅ State: `importScriptModalOpen`, `currentScriptForModal`
- ✅ Handler: `handleOpenImportScriptModal`
- ✅ Handler: `handleImportScriptAndGenerateReport`
- ✅ Modal component rendered at bottom

### ScriptCueCards.tsx
- ✅ Button text: "Import Sample Script"
- ✅ onClick: `onGenerate(script)` - calls handler from Dashboard

### ImportScriptModal.tsx
- ✅ Props: `isOpen`, `onClose`, `onGenerateReport`, `currentScriptId`
- ✅ Early return: `if (!isOpen) return null;`
- ✅ Modal overlay and content rendering

---

## 🎨 Visual Indicators

When the feature is working:
- ✅ Button is clickable
- ✅ Modal opens on click
- ✅ Dropdowns populate
- ✅ Loading states show
- ✅ Error messages display if needed
- ✅ Success redirects to Test Runs view

---

## 📚 Next Steps

1. **Test the feature**:
   - Click "Import Sample Script"
   - Verify modal opens
   - Select a script
   - Generate report
   - Verify redirect works

2. **Check browser console**:
   - Look for any errors
   - Verify API calls are made
   - Check network tab

3. **Verify backend**:
   - Ensure backend is running
   - Test API endpoints
   - Check database connection

---

## ✅ Summary

The feature is **fully implemented**. The button text "Import Sample Script" is correct and intentional. When clicked, it should:
1. Open a modal
2. Show existing scripts
3. Allow selection
4. Generate Allure reports
5. Redirect to execution reports view

If the modal doesn't open, check:
- Browser console for errors
- Network tab for failed API calls
- Backend server status
- File imports and exports

