# Import Script & Generate Allure Report - Implementation Scenarios

## Overview

This document outlines implementation scenarios for the "Import Sample Script" feature in `ScriptCueCards.tsx` that allows users to:
1. Fetch existing scripts from database
2. Select scripts via dropdown (filtered by project)
3. Generate Allure reports for selected scripts
4. Display reports in execution reports view

---

## Scenario 1: Basic Import & Generate Flow

### User Flow
1. User is viewing a script in the dashboard (showing ScriptCueCards component)
2. User clicks "Import Sample Script" button in Step 1 (Generate card)
3. Modal/dialog opens with:
   - Title: "Import Existing Script"
   - Project filter dropdown (if user has multiple projects)
   - Script dropdown showing available scripts
   - Loading state while fetching scripts
4. User selects a project (optional - shows all if not selected)
5. Script dropdown populates with scripts filtered by selected project
6. User selects a script from dropdown
7. User clicks "Generate Report" button
8. System:
   - Creates a test run for the selected script
   - Executes the test run (or uses existing test run if available)
   - Generates Allure report for the test run
   - Saves report URL to database
9. Modal closes
10. User is redirected to "Test Runs" view (execution reports)
11. Generated report appears in the list with "View Report" button
12. User can click "View Report" to see the Allure report

### Data Flow

**Step 1: Fetch Scripts**
- Frontend: `GET /api/scripts?projectId={projectId}` (optional project filter)
- Backend: Returns list of scripts for current user
- Frontend: Populates dropdown with script names and IDs

**Step 2: Generate Report**
- Frontend: User selects script, clicks "Generate Report"
- Frontend: Check if script has existing test run
  - Option A: Use existing test run (if recent and completed)
  - Option B: Create new test run
- Frontend: `POST /api/test-runs/start` with `{ scriptId: selectedScriptId }`
- Backend: Creates TestRun record with status "queued" or "running"
- Backend: If test needs execution, queue it or execute immediately
- Frontend: Wait for test run completion (polling or WebSocket)
- Frontend: `POST /api/allure/generate/{testRunId}`
- Backend: Generates Allure report using AllureService
- Backend: Updates TestRun with `executionReportUrl`
- Frontend: Redirects to Test Runs view
- Frontend: Shows newly generated report in list

### Edge Cases

**No Scripts Available**
- Show message: "No scripts available. Create a script first."
- Disable "Generate Report" button

**Script Has No Test Runs**
- Create new test run before generating report
- Show loading state: "Creating test run..."
- Show execution progress if test needs to run

**Script Has Existing Test Runs**
- Option A: Use most recent test run
- Option B: Ask user: "Use existing test run or create new?"
- Option C: Always create new test run

**Report Generation Fails**
- Show error message: "Failed to generate report. Please try again."
- Allow retry
- Log error for debugging

---

## Scenario 2: Quick Generate from Existing Test Run

### User Flow
1. User clicks "Import Sample Script"
2. Modal opens with script dropdown
3. User selects a script
4. System checks for existing test runs for this script
5. If test runs exist, show dropdown:
   - "Use Most Recent Test Run"
   - "Create New Test Run"
   - List of recent test runs (if user wants to select specific one)
6. User selects option
7. If "Create New Test Run":
   - Execute script
   - Generate report after completion
8. If "Use Existing Test Run":
   - Check if report already exists
   - If exists: Show "View Report" button
   - If not: Generate report for existing test run
9. Redirect to Test Runs view

### Data Flow

**Check Existing Test Runs**
- Frontend: `GET /api/test-runs?scriptId={scriptId}&limit=5`
- Backend: Returns recent test runs for script
- Frontend: Shows options based on results

**Use Existing Test Run**
- Frontend: `POST /api/allure/generate/{testRunId}`
- Backend: Checks if report exists
- If exists: Return existing report URL
- If not: Generate new report

**Create New Test Run**
- Same as Scenario 1, Step 2

---

## Scenario 3: Project-Based Filtering

### User Flow
1. User clicks "Import Sample Script"
2. Modal opens with:
   - Project filter dropdown at top (shows "All Projects" by default)
   - Script dropdown below (initially empty or shows all scripts)
3. User selects project from filter
4. Script dropdown updates to show only scripts from selected project
5. User selects script
6. User clicks "Generate Report"
7. Continue with report generation flow

### Data Flow

**Initial Load**
- Frontend: `GET /api/projects` to fetch user's projects
- Frontend: `GET /api/scripts` to fetch all scripts (or filtered by default project)
- Frontend: Populate project dropdown
- Frontend: Populate script dropdown

**Project Filter Change**
- Frontend: User selects project
- Frontend: `GET /api/scripts?projectId={selectedProjectId}`
- Backend: Returns scripts filtered by project
- Frontend: Updates script dropdown with filtered results

**No Project Selected (All Projects)**
- Frontend: `GET /api/scripts` (no projectId parameter)
- Backend: Returns all scripts for user
- Frontend: Shows all scripts in dropdown

### UI Considerations

**Project Filter Dropdown**
- First option: "All Projects" (default)
- Then list of user's projects
- Shows project name
- Can show project description as tooltip

**Script Dropdown**
- Shows script name
- Can show additional info:
  - Script language (TypeScript, JavaScript)
  - Last modified date
  - Number of test runs
  - Script description (if available)

**Empty States**
- No projects: "No projects found. Create a project first."
- No scripts in project: "No scripts in this project. Create a script first."
- No scripts at all: "No scripts available. Create a script first."

---

## Scenario 4: Modal with Multiple Actions

### User Flow
1. User clicks "Import Sample Script"
2. Modal opens with:
   - Project filter
   - Script dropdown
   - Action buttons:
     - "Import Script" (copy script code to current script)
     - "Generate Report" (generate Allure report)
     - "View Script Details" (open script editor)
3. User selects script
4. User chooses action:
   - **Import Script**: Copy selected script's code to current script editor
   - **Generate Report**: Generate Allure report (as in previous scenarios)
   - **View Details**: Open script in new tab/editor

### Data Flow

**Import Script Action**
- Frontend: `GET /api/scripts/{selectedScriptId}`
- Backend: Returns full script with code
- Frontend: Copies script code to current script editor
- Frontend: Updates current script with imported code
- Frontend: `PUT /api/scripts/{currentScriptId}` to save
- Modal closes

**Generate Report Action**
- Same as Scenario 1, Step 2

**View Script Details**
- Frontend: Opens script editor/viewer
- Frontend: `GET /api/scripts/{selectedScriptId}`
- Show full script details in modal or new view

---

## Scenario 5: Batch Report Generation

### User Flow
1. User clicks "Import Sample Script"
2. Modal opens with script selection
3. User can select multiple scripts (checkboxes)
4. User clicks "Generate Reports for Selected"
5. System:
   - Creates test runs for each selected script
   - Generates Allure reports for each
   - Shows progress for each script
6. When all complete, redirect to Test Runs view
7. All generated reports appear in list

### Data Flow

**Select Multiple Scripts**
- Frontend: User selects multiple scripts
- Frontend: Stores selected script IDs in state

**Generate Reports**
- Frontend: `POST /api/test-runs/batch-start` with `{ scriptIds: [id1, id2, ...] }`
- Backend: Creates test runs for each script
- Backend: Returns array of test run IDs
- Frontend: For each test run:
  - Poll for completion
  - `POST /api/allure/generate/{testRunId}`
  - Show progress indicator
- Frontend: When all complete, redirect to Test Runs view

**Progress Tracking**
- Show progress bar: "Generating reports: 2/5"
- Show status for each script:
  - ⏳ Queued
  - 🔄 Running
  - 📊 Generating Report
  - ✅ Complete
  - ❌ Failed

---

## Implementation Priority

### Phase 1: MVP (Minimum Viable Product)
- **Scenario 1**: Basic Import & Generate Flow
  - Modal with script dropdown
  - Project filter (optional)
  - Generate report for selected script
  - Redirect to Test Runs view

### Phase 2: Enhanced Features
- **Scenario 3**: Enhanced Project-Based Filtering
  - Better project filtering UI
  - Script metadata in dropdown

### Phase 3: Advanced Features
- **Scenario 2**: Quick Generate from Existing Test Run
  - Use existing test runs
  - Smart selection logic

- **Scenario 4**: Modal with Multiple Actions
  - Import script functionality
  - View script details

### Phase 4: Batch Operations
- **Scenario 5**: Batch Report Generation
  - Multiple script selection
  - Batch processing

---

## UI/UX Considerations

### Modal Design

**Modal Header**
- Title: "Import Script & Generate Report"
- Close button (X)
- Can be draggable/resizable

**Modal Body**
- Project filter section (if user has projects)
- Script selection section
- Action buttons section

**Modal Footer**
- "Cancel" button (closes modal)
- "Generate Report" button (primary action)
- Loading state when processing

**Loading States**
- Fetching scripts: "Loading scripts..."
- Generating report: "Generating Allure report... This may take a moment."
- Creating test run: "Creating test run..."

**Success States**
- Report generated: "Report generated successfully! Redirecting..."
- Auto-redirect after 2-3 seconds

**Error States**
- Network error: "Failed to load scripts. Please try again."
- Generation error: "Failed to generate report. Please check the test run status."
- Validation error: "Please select a script before generating report."

---

## Data Requirements

### Backend API Endpoints Needed

1. **Get Scripts** (already exists)
   - `GET /api/scripts?projectId={projectId}`
   - Returns scripts filtered by project

2. **Get Projects** (already exists)
   - `GET /api/projects`
   - Returns user's projects

3. **Start Test Run** (already exists)
   - `POST /api/test-runs/start`
   - Creates test run for script

4. **Generate Allure Report** (already exists)
   - `POST /api/allure/generate/{testRunId}`
   - Generates report for test run

5. **Get Test Run Status** (may need)
   - `GET /api/test-runs/{id}`
   - Check if test run is complete before generating report

6. **Get Test Runs for Script** (may need)
   - `GET /api/test-runs?scriptId={scriptId}`
   - Get existing test runs for script

### Frontend State Management

**Modal State**
- `isModalOpen`: boolean
- `selectedProjectId`: string | null
- `selectedScriptId`: string | null
- `scripts`: Script[]
- `projects`: Project[]
- `loadingScripts`: boolean
- `generatingReport`: boolean
- `testRunId`: string | null

**Component Props**
- `script`: ScriptMinimal (current script being viewed)
- `onGenerate`: Function (callback after report generation)
- `onClose`: Function (optional, close modal)

---

## Integration Points

### With ScriptCueCards Component

**Current Button**
- Button: "Import Sample Script"
- onClick: `onGenerate(script)`

**New Implementation**
- Button: "Import Sample Script"
- onClick: Open modal with script selection
- Modal handles:
  - Script fetching
  - Project filtering
  - Report generation
  - Redirect to Test Runs view

### With Dashboard Component

**Test Runs View**
- Already shows test runs
- Already has "Generate Report" button
- Already has "View Report" button
- Redirect from modal should:
  - Set `activeView` to 'runs'
  - Optionally scroll to newly generated report
  - Highlight the new report

### With Allure Service

**Report Generation**
- Uses existing `allureService.generateReport()`
- Uses existing `allureService.getReportUrl()`
- Updates TestRun record with `executionReportUrl`

---

## Error Handling Scenarios

### Network Errors
- **Script fetch fails**: Show error message, allow retry
- **Report generation fails**: Show error, allow retry
- **Test run creation fails**: Show error, suggest checking script validity

### Validation Errors
- **No script selected**: Disable "Generate Report" button
- **Script has errors**: Show warning, allow generation anyway or block
- **Test run in progress**: Show message, allow waiting or cancel

### State Errors
- **Modal state lost**: Refresh scripts list
- **Report generation timeout**: Show timeout message, allow retry
- **Test run not found**: Show error, suggest creating new test run

---

## Success Metrics

### User Adoption
- % of users using "Import Sample Script" feature
- Average scripts imported per user
- Average reports generated per user

### Performance
- Time to fetch scripts
- Time to generate report
- Time from click to report view

### User Satisfaction
- Feature usage frequency
- Error rate
- User feedback

---

## Future Enhancements

1. **Script Search**: Search/filter scripts in dropdown
2. **Script Preview**: Preview script code before selecting
3. **Template Scripts**: Pre-built template scripts
4. **Recent Scripts**: Show recently used scripts first
5. **Favorites**: Mark scripts as favorites
6. **Script Groups**: Group scripts by tags/categories
7. **Scheduled Reports**: Schedule automatic report generation
8. **Report Comparison**: Compare reports from different scripts
9. **Export Reports**: Download reports as PDF/HTML
10. **Share Reports**: Share report links with team

---

## Testing Scenarios

### Unit Tests
- Modal opens/closes correctly
- Script dropdown populates
- Project filter works
- Report generation triggers correctly

### Integration Tests
- End-to-end flow: Click button → Select script → Generate report → View report
- Error handling: Network failures, validation errors
- State management: Modal state, loading states

### User Acceptance Tests
- User can select script from dropdown
- User can filter by project
- User can generate report
- User can view report in Test Runs view
- Error messages are clear and helpful

---

## Notes

- All existing API endpoints appear to be available
- Allure report generation is already implemented
- Test run creation is already implemented
- Main work is in frontend: Modal component, state management, UI/UX
- Backend may need minor enhancements for batch operations (Phase 4)

