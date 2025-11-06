# 5-Step Script Workflow - Implementation Scenarios & Approaches

## Overview

This document outlines implementation scenarios and approaches for the 5-step script workflow in `ScriptCueCards.tsx`. Each step represents a different phase in the script lifecycle: Generate → Enhance → Validate → Finalize → Insights.

---

## Step 1: Generate - Create or Scaffold Initial Script

### Scenario 1: Template-Based Generation
**Approach**: Provide a library of pre-built templates that users can select and customize.

**Flow**:
1. User clicks "Import Sample Script"
2. Modal/dialog opens showing available templates:
   - Basic login flow
   - E-commerce checkout
   - Form submission
   - API testing
   - Data-driven testing
3. User selects a template
4. System creates a new script with:
   - Pre-populated code structure
   - Placeholder selectors
   - Basic test steps
   - Comments explaining structure
5. Script is saved to database with status "draft"
6. User is redirected to script editor to customize

**Data Flow**:
- Frontend: Fetch template list from backend or use static templates
- Backend: `GET /api/scripts/templates` (optional - can be client-side)
- Create script: `POST /api/scripts` with template code
- Update UI: Add new script to scripts list

### Scenario 2: Recording-Based Generation
**Approach**: Use browser extension recorder to generate initial script.

**Flow**:
1. User clicks "Import Sample Script"
2. System checks if browser extension is available
3. If available: Open extension recorder interface
4. User records actions in browser
5. Extension generates script code
6. Code is sent to backend and saved as new script
7. If extension not available: Show template selection (fallback to Scenario 1)

**Data Flow**:
- Extension → Frontend: Message passing with recorded steps
- Frontend → Backend: `POST /api/scripts` with recorded code
- Backend: Save script, return script ID

### Scenario 3: AI-Powered Initial Generation
**Approach**: User describes what they want to test, AI generates initial script.

**Flow**:
1. User clicks "Import Sample Script"
2. Modal opens with text input: "Describe your test scenario"
3. User enters: "Test login page with valid credentials"
4. Frontend calls AI service (OpenAI/Claude/etc.)
5. AI generates initial Playwright script
6. User reviews generated code
7. User accepts or modifies before saving

**Data Flow**:
- Frontend → Backend: `POST /api/scripts/generate` with user description
- Backend → AI Service: Generate code based on description
- Backend → Frontend: Return generated code
- User accepts → `POST /api/scripts` to save

---

## Step 2: Enhance with AI - Improve Locators and Flows

### Scenario 1: Batch Enhancement
**Approach**: Analyze entire script and suggest improvements for all locators.

**Flow**:
1. User clicks "Open AI Enhancement"
2. System fetches current script code
3. AI service analyzes:
   - All selectors (CSS, XPath, data-testid)
   - Wait conditions
   - Error handling
   - Best practices
4. AI generates enhanced version with:
   - More robust selectors
   - Better wait strategies
   - Improved error messages
   - Code comments
5. System shows diff view: old vs. new code
6. User reviews changes:
   - Side-by-side comparison
   - Highlighted differences
   - Explanation for each change
7. User can:
   - Accept all changes
   - Accept selected changes
   - Reject all changes
   - Request re-generation with different focus

**Data Flow**:
- Frontend: `GET /api/scripts/{id}` to fetch current script
- Frontend → Backend: `POST /api/scripts/{id}/enhance` with enhancement request
- Backend → AI Service: Send code for analysis
- Backend: Store enhancement proposal (create change set record)
- Backend → Frontend: Return enhanced code + diff
- User accepts → `POST /api/scripts/{id}/changesets/{id}/accept`
- Backend: Apply changes to script, mark change set as accepted

### Scenario 2: Interactive Enhancement
**Approach**: User selects specific parts to enhance, AI provides focused suggestions.

**Flow**:
1. User clicks "Open AI Enhancement"
2. Script editor opens with enhancement mode
3. User selects:
   - Specific lines of code
   - Specific selectors
   - Specific test steps
4. User clicks "Enhance Selection"
5. AI analyzes only selected portions
6. AI provides:
   - Multiple alternative suggestions
   - Confidence scores for each
   - Explanation of improvements
7. User compares options and selects best one
8. Changes are applied to script

**Data Flow**:
- Frontend: User selection stored in component state
- Frontend → Backend: `POST /api/scripts/{id}/enhance` with code selection
- Backend → AI Service: Focused analysis on selection
- Backend → Frontend: Return multiple enhancement options
- User selects → `PUT /api/scripts/{id}` with selected enhancement

### Scenario 3: Continuous Enhancement During Editing
**Approach**: AI provides real-time suggestions as user types.

**Flow**:
1. User is editing script in editor
2. As user types, AI analyzes:
   - Current line/selection
   - Context of surrounding code
3. AI suggests:
   - Better selector alternatives
   - Missing wait conditions
   - Code improvements
4. Suggestions appear as:
   - Inline hints
   - Tooltips
   - Lightbulb icons
5. User can accept suggestions with one click

**Data Flow**:
- Frontend: Debounced analysis (wait 500ms after user stops typing)
- Frontend → Backend: `POST /api/scripts/{id}/suggest` with code snippet
- Backend → AI Service: Quick analysis
- Backend → Frontend: Return suggestions
- User accepts → Apply to local editor state, save on script update

---

## Step 3: Human Validation - Review Logic and Verify Selectors

### Scenario 1: Change Set Review
**Approach**: Review AI-generated changes before applying them.

**Flow**:
1. User clicks "Start Validation Review"
2. System fetches pending change sets for script
3. Review interface shows:
   - List of proposed changes
   - Original code vs. proposed code
   - AI confidence scores
   - Change descriptions
4. For each change, user can:
   - View before/after
   - Test selector in browser (if applicable)
   - Accept change
   - Reject change
   - Request modification
   - Add comment
5. User reviews all changes
6. User clicks "Apply Approved Changes"
7. System applies only accepted changes to script
8. Change set is marked as "validated"

**Data Flow**:
- Frontend: `GET /api/scripts/{id}/changesets?status=pending`
- Each change set has: original code, proposed code, diff, metadata
- User actions:
  - `POST /api/scripts/{id}/changesets/{id}/accept`
  - `POST /api/scripts/{id}/changesets/{id}/reject`
  - `POST /api/scripts/{id}/changesets/{id}/modify` (with user edits)
- Final apply: `POST /api/scripts/{id}/apply-changesets`
- Backend: Apply accepted changes, update script version

### Scenario 2: Side-by-Side Code Review
**Approach**: Compare current script with enhanced version in split view.

**Flow**:
1. User clicks "Start Validation Review"
2. System fetches:
   - Current script version
   - Latest enhanced version (if exists)
3. Split-screen interface:
   - Left: Current script
   - Right: Enhanced version
   - Middle: Diff highlighting
4. User can:
   - Navigate between differences
   - See line-by-line comparisons
   - Accept/reject individual lines
   - Edit either side
5. User creates review comments
6. User submits review with selected changes
7. System applies changes

**Data Flow**:
- Frontend: `GET /api/scripts/{id}` (current)
- Frontend: `GET /api/scripts/{id}/enhanced` (latest enhancement)
- Backend: Calculate diff server-side or client-side
- User edits: Stored in component state
- Final submit: `PUT /api/scripts/{id}` with validated code

### Scenario 3: Selector Validation Tool
**Approach**: Test each selector in real browser before accepting.

**Flow**:
1. User clicks "Start Validation Review"
2. System identifies all selectors in script
3. For each selector:
   - Show selector string
   - Show context (which step uses it)
   - Provide "Test Selector" button
4. User clicks "Test Selector"
5. System opens browser preview/iframe
6. System navigates to target page
7. System highlights element(s) matching selector
8. User verifies:
   - Correct element is highlighted
   - Element is visible
   - Element is stable (not flaky)
9. User marks selector as:
   - ✅ Valid
   - ❌ Invalid (needs change)
   - ⚠️ Flaky (may need wait condition)
10. After testing all selectors, user applies fixes

**Data Flow**:
- Frontend: Parse script to extract selectors
- Frontend → Backend: `POST /api/scripts/{id}/validate-selectors`
- Backend: Extract selectors, return list with metadata
- For testing: `POST /api/scripts/{id}/test-selector` with selector string
- Backend: Execute in headless browser, return element info
- User marks validation → Store in validation record
- Final: `PUT /api/scripts/{id}` with validated selectors

---

## Step 4: Finalize / Run - Save, Run, and Monitor Execution

### Scenario 1: Save and Execute Immediately
**Approach**: Save script changes and start test run in one action.

**Flow**:
1. User clicks "Finalize and Execute"
2. System checks:
   - Are there unsaved changes?
   - Is script valid (syntax check)?
   - Are required fields complete?
3. If changes exist:
   - Show confirmation: "Save changes and run?"
   - User confirms
4. System saves script: `PUT /api/scripts/{id}`
5. System creates test run: `POST /api/test-runs/start`
6. System redirects to test run monitoring view
7. Real-time execution updates via WebSocket:
   - Step progress
   - Screenshots
   - Errors
   - Logs
8. User monitors execution in real-time
9. On completion: Show results summary

**Data Flow**:
- Frontend: Check for unsaved changes in editor state
- Frontend → Backend: `PUT /api/scripts/{id}` (save script)
- Frontend → Backend: `POST /api/test-runs/start` with scriptId
- Backend: Create TestRun record, queue execution
- Backend: WebSocket connection established
- Backend: Send progress updates via WebSocket
- Frontend: Display updates in real-time UI
- Backend: Complete execution, save results
- Frontend: `GET /api/test-runs/{id}` for final results

### Scenario 2: Configure Before Running
**Approach**: User configures run parameters before execution.

**Flow**:
1. User clicks "Finalize and Execute"
2. Modal opens with run configuration:
   - Environment: Development / Staging / Production
   - Browser: Chromium / Firefox / WebKit
   - Viewport size
   - Test data file (if data-driven)
   - Parallel execution count
   - Timeout settings
   - Retry on failure
3. User sets configuration
4. User clicks "Save and Run"
5. System saves script with current changes
6. System creates test run with configuration
7. System starts execution
8. User monitors in real-time

**Data Flow**:
- Frontend: Show configuration modal
- User configures: Stored in component state
- Frontend → Backend: `PUT /api/scripts/{id}` (save script)
- Frontend → Backend: `POST /api/test-runs/start` with config
- Backend: Store config in TestRun record
- Execution starts with configuration applied

### Scenario 3: Schedule Execution
**Approach**: Option to schedule test run for later.

**Flow**:
1. User clicks "Finalize and Execute"
2. Modal opens with options:
   - "Run Now"
   - "Schedule for Later"
3. If "Schedule":
   - User selects date/time
   - User selects recurrence (one-time / daily / weekly)
   - User sets notification preferences
4. System saves script
5. System creates scheduled test run
6. System stores schedule in database
7. Background job checks schedule and executes at specified time

**Data Flow**:
- Frontend: Show scheduling modal
- User schedules: Store in component state
- Frontend → Backend: `PUT /api/scripts/{id}` (save script)
- Frontend → Backend: `POST /api/test-runs/schedule` with schedule config
- Backend: Create TestRun with status "scheduled"
- Backend: Create Schedule record (if not exists)
- Background job: Check schedules, execute at time

---

## Step 5: AI Insights - View Reliability Trends and Healing Tips

### Scenario 1: Post-Execution Analysis
**Approach**: Analyze completed test runs to provide insights.

**Flow**:
1. User clicks "Open Insights"
2. System fetches all test runs for this script
3. AI analyzes:
   - Success/failure patterns
   - Flaky test steps
   - Slow-performing steps
   - Common failure points
   - Selector reliability
   - Healing suggestions used
4. System displays insights dashboard:
   - Reliability score (% success rate)
   - Trend chart (success over time)
   - Top failing steps
   - Flaky selectors list
   - Suggested improvements
   - Healing history
5. User can:
   - Drill down into specific insights
   - View historical data
   - Apply suggested fixes
   - Export insights report

**Data Flow**:
- Frontend: `GET /api/scripts/{id}/insights`
- Backend: Fetch all TestRuns for script
- Backend: Analyze TestStep records for patterns
- Backend: Calculate metrics (success rate, flakiness, etc.)
- Backend → AI Service: Analyze patterns, generate insights
- Backend → Frontend: Return insights JSON
- Frontend: Display in dashboard/charts

### Scenario 2: Predictive Insights
**Approach**: AI predicts potential issues before they occur.

**Flow**:
1. User clicks "Open Insights"
2. System analyzes:
   - Current script code
   - Historical test runs
   - Similar scripts in system
   - Industry best practices
3. AI generates predictions:
   - "Selector X may become flaky (used in 5 similar scripts that failed)"
   - "Step Y is slow (average 3s, consider optimization)"
   - "Missing wait condition after step Z (common failure point)"
4. System shows:
   - Risk assessment
   - Confidence scores
   - Recommended actions
5. User can:
   - Accept predictive suggestions
   - Dismiss if not relevant
   - Set up alerts for predicted issues

**Data Flow**:
- Frontend: `GET /api/scripts/{id}/insights?type=predictive`
- Backend: Fetch script + related scripts
- Backend → AI Service: Predictive analysis
- Backend → Frontend: Return predictions with confidence
- User accepts → Apply preventive fixes

### Scenario 3: Comparative Insights
**Approach**: Compare script performance against similar scripts.

**Flow**:
1. User clicks "Open Insights"
2. System identifies similar scripts:
   - Same project
   - Similar functionality
   - Similar selectors
3. System compares:
   - Success rates
   - Execution times
   - Flakiness scores
   - Healing usage
4. System shows:
   - "Your script performs better/worse than similar scripts"
   - Best practices from top-performing scripts
   - Recommendations based on successful patterns
5. User can:
   - View comparison charts
   - Learn from successful scripts
   - Apply proven patterns

**Data Flow**:
- Frontend: `GET /api/scripts/{id}/insights?type=comparative`
- Backend: Find similar scripts (by project, tags, patterns)
- Backend: Compare metrics across scripts
- Backend → Frontend: Return comparative analysis
- Frontend: Display comparison visualizations

---

## Implementation Priority Recommendations

### Phase 1: Core Functionality (MVP)
1. **Generate**: Template-based generation (Scenario 1)
2. **Enhance**: Batch enhancement (Scenario 1)
3. **Validate**: Change set review (Scenario 1)
4. **Finalize**: Save and execute immediately (Scenario 1)
5. **Insights**: Post-execution analysis (Scenario 1)

### Phase 2: Enhanced Features
1. **Generate**: Add recording-based generation
2. **Enhance**: Add interactive enhancement
3. **Validate**: Add selector validation tool
4. **Finalize**: Add configuration before running
5. **Insights**: Add predictive insights

### Phase 3: Advanced Features
1. **Generate**: AI-powered initial generation
2. **Enhance**: Continuous enhancement during editing
3. **Validate**: Advanced side-by-side review
4. **Finalize**: Schedule execution
5. **Insights**: Comparative insights

---

## Data Model Considerations

### New Tables/Fields Needed

1. **ScriptChangeSet** (for validation step)
   - id, scriptId, proposedCode, originalCode, diff, status, confidence, createdAt

2. **ScriptTemplate** (for generation step)
   - id, name, description, category, code, metadata

3. **ScriptInsight** (for insights step)
   - id, scriptId, type, severity, summary, details, confidence, createdAt

4. **ScheduledTestRun** (for scheduling)
   - id, scriptId, scheduledAt, recurrence, status

5. **ScriptValidation** (for validation step)
   - id, scriptId, selectorId, status, testedAt, notes

---

## User Experience Flow

### Complete Workflow Example

1. **User starts new script**
   - Clicks "Generate" → Selects template → Gets scaffolded script

2. **User enhances script**
   - Clicks "Enhance with AI" → AI suggests improvements → User reviews diff

3. **User validates changes**
   - Clicks "Validate" → Reviews changes → Accepts/rejects → Applies changes

4. **User finalizes and runs**
   - Clicks "Finalize and Execute" → Configures run → Monitors execution

5. **User reviews insights**
   - Clicks "Insights" → Views analysis → Applies recommendations → Iterates

### Navigation Between Steps

- Each step can be accessed independently
- Steps show completion status (✅ completed, ⏳ in-progress, ⭕ not started)
- Progress indicator shows overall workflow status
- Users can skip steps or go back to previous steps
- Changes are auto-saved at each step

---

## Error Handling Scenarios

### Generate Step
- **No templates available**: Show message, provide manual editor option
- **Template load fails**: Retry with fallback template
- **Script creation fails**: Show error, allow retry

### Enhance Step
- **AI service unavailable**: Show cached suggestions or queue for later
- **Enhancement timeout**: Show progress, allow cancellation
- **Invalid code structure**: Return error with suggestions to fix

### Validate Step
- **No pending changes**: Show message, redirect to enhance step
- **Change set expired**: Regenerate changes, notify user
- **Validation conflict**: Show merge conflict resolution

### Finalize Step
- **Script has errors**: Block execution, show error list
- **Test run creation fails**: Retry with exponential backoff
- **Execution fails immediately**: Show error, allow configuration adjustment

### Insights Step
- **No test runs available**: Show message, suggest running tests first
- **Analysis timeout**: Show partial results, queue full analysis
- **No insights found**: Show message, suggest running more tests

---

## Integration Points

### Backend APIs Needed

1. `GET /api/scripts/templates` - List available templates
2. `POST /api/scripts/generate` - AI-generated script from description
3. `POST /api/scripts/{id}/enhance` - Request AI enhancement
4. `GET /api/scripts/{id}/changesets` - Get pending changes
5. `POST /api/scripts/{id}/changesets/{id}/accept` - Accept change
6. `POST /api/scripts/{id}/changesets/{id}/reject` - Reject change
7. `POST /api/scripts/{id}/validate-selectors` - Validate selectors
8. `GET /api/scripts/{id}/insights` - Get insights
9. `GET /api/scripts/{id}/insights?type=predictive` - Predictive insights
10. `GET /api/scripts/{id}/insights?type=comparative` - Comparative insights

### External Services

- **AI Service**: OpenAI/Anthropic for code generation and enhancement
- **Browser Automation**: Playwright for selector validation
- **WebSocket**: Real-time execution updates
- **Analytics Engine**: Pattern analysis and insights generation

---

## Success Metrics

### User Adoption
- % of users completing all 5 steps
- Average time spent per step
- Step completion rates

### Quality Improvements
- Reduction in test failures after enhancement
- Increase in selector reliability
- Decrease in flaky tests

### User Satisfaction
- Feature usage frequency
- User feedback scores
- Support ticket reduction

---

## Future Enhancements

1. **Collaborative Review**: Multiple users can review and comment
2. **Version History**: Track changes across all steps
3. **Automated Workflows**: Auto-enhance and validate on save
4. **ML Learning**: System learns from user accept/reject patterns
5. **Integration Hub**: Connect with CI/CD pipelines
6. **Mobile Preview**: Test mobile viewport during validation
7. **Accessibility Insights**: AI suggests accessibility improvements
8. **Performance Insights**: Identify slow steps and bottlenecks

