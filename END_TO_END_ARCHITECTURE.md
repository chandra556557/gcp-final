# 🏗️ Playwright CRX - End-to-End Architecture Documentation

**Version**: 1.0.0  
**Date**: 2025-10-29  
**Scope**: Complete workflow from Chrome Extension to Backend to Database

---

## 📋 Table of Contents

1. [System Overview](#1-system-overview)
2. [Chrome Extension Architecture](#2-chrome-extension-architecture)
3. [Backend API Architecture](#3-backend-api-architecture)
4. [Database Schema & Relationships](#4-database-schema--relationships)
5. [Authentication & Security Flow](#5-authentication--security-flow)
6. [Test Execution Workflow](#6-test-execution-workflow)
7. [Self-Healing Mechanism](#7-self-healing-mechanism)
8. [Data Flow Diagrams](#8-data-flow-diagrams)
9. [Component Interactions](#9-component-interactions)
10. [Deployment Architecture](#10-deployment-architecture)

---

## 1. SYSTEM OVERVIEW

### High-Level Architecture

```mermaid
graph TB
    subgraph ClientLayer["Client Layer"]
        Browser["Chrome Browser"]
        Extension["Playwright CRX Extension"]
        UserInterface["React UI Components"]
    end
    
    subgraph NetworkLayer["Network Layer"]
        HTTPS["HTTPS/REST API"]
        WebSocket["WebSocket Connection"]
    end
    
    subgraph ServerLayer["Server Layer"]
        API["Node.js/Express API"]
        Auth["Authentication Service"]
        TestRunner["Test Execution Engine"]
        WebSocketServer["WebSocket Server"]
    end
    
    subgraph DataLayer["Data Layer"]
        PostgreSQL[(PostgreSQL Database)]
        Prisma["Prisma ORM"]
    end
    
    Browser --> Extension
    Extension --> UserInterface
    UserInterface -->|HTTP/HTTPS| API
    UserInterface -->|WebSocket| WebSocketServer
    API --> Auth
    API --> TestRunner
    WebSocketServer --> TestRunner
    API --> Prisma
    TestRunner --> Prisma
    Prisma --> PostgreSQL
```

### Core Components

1. **Chrome Extension**: Browser-based test recording and execution interface
2. **Backend API**: RESTful services for data management and test execution
3. **Database**: PostgreSQL for persistent storage of scripts, results, and user data
4. **WebSocket**: Real-time communication for test execution progress

---

## 2. CHROME EXTENSION ARCHITECTURE

### Extension Structure

```mermaid
graph TD
    subgraph Extension["Chrome Extension"]
        Background[Background Service Worker]
        Content[Content Scripts]
        UI[React UI Components]
        Storage[Chrome Storage API]
    end
    
    subgraph UIComponents["UI Components"]
        Recorder[crxRecorder.tsx]
        TestExecutor[testExecutorUI.tsx]
        SelfHealing[selfHealingUI.tsx]
        DDT[ddtManager.tsx]
        Debugger[debuggerUI.tsx]
        APITesting[apiTestingUI.tsx]
    end
    
    subgraph Services["Extension Services"]
        APIService[apiService.ts]
        CodeGenerator[codeGenerator.ts]
        Settings[settings.ts]
        Auth[auth handling]
    end
    
    Background --> UI
    UI --> UIComponents
    UIComponents --> Services
    Services --> Storage
    Services -->|API Calls| Backend
```

### Key Extension Files

| Component | File | Purpose |
|-----------|------|---------|
| Main UI | [`crxRecorder.tsx`](examples/recorder-crx/src/crxRecorder.tsx) | Primary recorder interface with authentication |
| Test Executor | [`testExecutorUI.tsx`](examples/recorder-crx/src/testExecutorUI.tsx) | Test execution interface |
| Self-Healing | [`selfHealingUI.tsx`](examples/recorder-crx/src/selfHealingUI.tsx) | Self-healing configuration |
| API Service | [`apiService.ts`](examples/recorder-crx/src/apiService.ts) | Backend communication |
| Code Generator | [`codeGenerator.ts`](examples/recorder-crx/src/codeGenerator.ts) | Multi-language code generation |

### Extension Workflow

1. **Initialization**: Extension loads, checks authentication status
2. **Recording Mode**: Captures user interactions and generates test code
3. **Execution Mode**: Runs saved tests with real-time progress updates
4. **Storage**: Saves scripts locally or to backend database

---

## 3. BACKEND API ARCHITECTURE

### Backend Structure

```mermaid
graph LR
    subgraph Backend["Backend (Node.js/Express)"]
        subgraph Controllers["Controllers"]
            AuthCtrl[auth.controller.ts]
            ScriptCtrl[script.controller.ts]
            TestRunCtrl[testRun.controller.ts]
            ProjectCtrl[project.controller.ts]
            AllureCtrl[allure.controller.ts]
        end
        
        subgraph Services["Services"]
            AuthService[auth.service.ts]
            TestRunner[testRunner.service.ts]
            AllureService[allure.service.ts]
            SelfHealingService[selfHealing.service.ts]
        end
        
        subgraph Middleware["Middleware"]
            AuthMW[auth.middleware.ts]
            ValidationMW[validate.ts]
            ErrorMW[errorHandler.ts]
        end
        
        subgraph Routes["Routes"]
            AuthRoutes[auth.routes.ts]
            ScriptRoutes[script.routes.ts]
            TestRunRoutes[testRun.routes.ts]
        end
    end
    
    Routes --> Middleware
    Middleware --> Controllers
    Controllers --> Services
    Services --> Database
```

### API Endpoints

| Category | Endpoints | Purpose |
|----------|-----------|---------|
| Authentication | `/api/auth/*` | Login, register, token management |
| Scripts | `/api/scripts/*` | CRUD operations for test scripts |
| Test Runs | `/api/test-runs/*` | Test execution management |
| Projects | `/api/projects/*` | Project organization |
| Self-Healing | `/api/self-healing/*` | Locator healing strategies |
| Allure Reports | `/api/allure/*` | Test report generation |

### WebSocket Implementation

```typescript
// Real-time test execution updates
WebSocket.on('connection', (ws) => {
  ws.on('message', (message) => {
    // Handle test execution commands
    // Send progress updates
    // Stream logs and results
  });
});
```

---

## 4. DATABASE SCHEMA & RELATIONSHIPS

### Entity Relationship Diagram

```mermaid
erDiagram
    User ||--o{ Project : owns
    User ||--o{ Script : creates
    User ||--o{ TestRun : executes
    User ||--o{ RefreshToken : has
    User ||--o{ ExtensionScript : uploads
    
    Project ||--o{ Script : contains
    
    Script ||--o{ TestRun : executes
    Script ||--o{ SelfHealingLocator : has
    Script ||--o{ Variable : defines
    Script ||--o{ Breakpoint : has
    
    TestRun ||--o{ TestStep : contains
    
    User {
        string id PK
        string email UK
        string password
        string name
        datetime createdAt
        datetime updatedAt
    }
    
    Script {
        string id PK
        string name
        string description
        string language
        text code
        string projectId FK
        string userId FK
        boolean selfHealingEnabled
        datetime createdAt
        datetime updatedAt
    }
    
    TestRun {
        string id PK
        string scriptId FK
        string userId FK
        string status
        int duration
        string errorMsg
        datetime startedAt
        datetime completedAt
    }
    
    SelfHealingLocator {
        string id PK
        string scriptId FK
        string brokenLocator
        string validLocator
        float confidence
        string status
        datetime createdAt
    }
```

### Key Tables

1. **Users**: Authentication and user management
2. **Scripts**: Test script storage with metadata
3. **TestRuns**: Execution history and results
4. **SelfHealingLocators**: Automatic locator healing data
5. **Projects**: Script organization and grouping

---

## 5. AUTHENTICATION & SECURITY FLOW

### Authentication Architecture

```mermaid
sequenceDiagram
    participant Extension
    participant AuthAPI
    participant Database
    participant JWT
    participant Storage
    
    Extension->>AuthAPI: POST /api/auth/login
    AuthAPI->>Database: Verify credentials
    Database-->>AuthAPI: User data
    AuthAPI->>JWT: Generate tokens
    JWT-->>AuthAPI: Access + Refresh tokens
    AuthAPI-->>Extension: Token response
    Extension->>Storage: Save tokens
    
    Note over Extension,AuthAPI: Subsequent requests
    Extension->>AuthAPI: Request + Access Token
    AuthAPI->>JWT: Validate token
    JWT-->>AuthAPI: Token validity
    AuthAPI-->>Extension: Protected resource
```

### Security Implementation

1. **JWT Tokens**: Access tokens (15min) + Refresh tokens (7days)
2. **Password Hashing**: bcrypt for secure password storage
3. **CORS Configuration**: Restricted to allowed origins
4. **Input Validation**: Comprehensive validation middleware
5. **Rate Limiting**: Prevent brute force attacks

---

## 6. TEST EXECUTION WORKFLOW

### Execution Flow

```mermaid
graph TD
    Start[User Clicks Execute] --> LoadScript[Load Script from DB]
    LoadScript --> CreateRun[Create Test Run Record]
    CreateRun --> InitWS[Initialize WebSocket]
    InitWS --> ParseSteps[Parse Test Steps]
    
    ParseSteps --> ExecuteStep[Execute Step]
    ExecuteStep --> StepSuccess{Step Success?}
    
    StepSuccess -->|Yes| SendProgress[Send Progress Update]
    StepSuccess -->|No| TrySelfHeal{Self-Healing Enabled?}
    
    TrySelfHeal -->|Yes| FindAlternative[Find Alternative Locator]
    TrySelfHeal -->|No| LogError[Log Error]
    
    FindAlternative --> AlternativeFound{Found?}
    AlternativeFound -->|Yes| SaveHealed[Save Healed Locator]
    AlternativeFound -->|No| LogError
    
    SaveHealed --> SendProgress
    LogError --> SendProgress
    
    SendProgress --> MoreSteps{More Steps?}
    MoreSteps -->|Yes| ExecuteStep
    MoreSteps -->|No| Complete[Mark Run Complete]
    Complete --> SaveResults[Save Results to DB]
    SaveResults --> Notify[Notify User]
```

### Real-time Updates

- **WebSocket Events**: 
  - `test-start`: Test execution initiated
  - `step-progress`: Individual step completion
  - `test-complete`: Full test completion
  - `error`: Execution errors

---

## 7. SELF-HEALING MECHANISM

### Self-Healing Strategy

```mermaid
graph TD
    ElementNotFound[Element Not Found] --> CheckEnabled{Self-Healing Enabled?}
    CheckEnabled -->|No| Fail[Test Fails]
    CheckEnabled -->|Yes| AnalyzeElement[Analyze Element Context]
    
    AnalyzeElement --> TryStrategies[Try Locator Strategies]
    TryStrategies --> TestID[Test ID Attribute]
    TryStrategies --> Text[Text Content]
    TryStrategies --> ARIA[ARIA Labels]
    TryStrategies --> CSS[CSS Selectors]
    TryStrategies --> XPath[XPath]
    
    TestID --> Found{Element Found?}
    Text --> Found
    ARIA --> Found
    CSS --> Found
    XPath --> Found
    
    Found -->|Yes| CalculateConfidence[Calculate Confidence Score]
    Found -->|No| NextStrategy{More Strategies?}
    
    NextStrategy -->|Yes| TryStrategies
    NextStrategy -->|No| Fail
    
    CalculateConfidence --> HighConfidence{Confidence > 80%?}
    HighConfidence -->|Yes| UseLocator[Use New Locator]
    HighConfidence -->|No| RequestApproval[Request User Approval]
    
    RequestApproval --> Approved{User Approved?}
    Approved -->|Yes| SaveToDB[Save to Database]
    Approved -->|No| Fail
    
    UseLocator --> SaveToDB
    SaveToDB --> ContinueTest[Continue Test]
```

### Healing Process

1. **Detection**: Element not found with original locator
2. **Analysis**: Examine DOM structure and element attributes
3. **Strategy Application**: Try multiple locator strategies in priority order
4. **Confidence Scoring**: Calculate match confidence
5. **Persistence**: Save successful alternatives for future use

---

## 8. DATA FLOW DIAGRAMS

### Complete Data Flow

```mermaid
sequenceDiagram
    participant User
    participant Extension
    participant API
    participant Database
    participant WebSocket
    participant TestEngine
    
    User->>Extension: Record Test Actions
    Extension->>Extension: Generate Test Code
    User->>Extension: Save Script
    Extension->>API: POST /api/scripts
    API->>Database: Store Script
    Database-->>API: Script ID
    API-->>Extension: Success Response
    
    User->>Extension: Execute Test
    Extension->>API: POST /api/test-runs
    API->>Database: Create Test Run
    API->>WebSocket: Initialize Connection
    WebSocket-->>Extension: Connected
    
    API->>TestEngine: Start Execution
    loop Each Test Step
        TestEngine->>WebSocket: Step Progress
        WebSocket-->>Extension: Real-time Update
        Extension-->>User: Progress Display
    end
    
    TestEngine->>API: Execution Complete
    API->>Database: Update Test Run
    API-->>Extension: Final Results
```

---

## 9. COMPONENT INTERACTIONS

### Extension-Backend Communication

```mermaid
graph TB
    subgraph Extension["Chrome Extension"]
        UI[React Components]
        Auth[Auth Module]
        API[API Service]
        WS[WebSocket Client]
    end
    
    subgraph Backend["Backend Server"]
        Routes[API Routes]
        Controllers[Controllers]
        Services[Business Logic]
        WS_Server[WebSocket Server]
        DB[(Database)]
    end
    
    UI --> Auth
    UI --> API
    UI --> WS
    
    Auth -->|Login/Register| Routes
    API -->|CRUD Operations| Routes
    WS -->|Real-time| WS_Server
    
    Routes --> Controllers
    Controllers --> Services
    Services --> DB
    WS_Server --> Services
```

### Key Interactions

1. **Authentication Flow**: Extension ↔ Auth Controller ↔ User Table
2. **Script Management**: Extension ↔ Script Controller ↔ Script Table
3. **Test Execution**: Extension ↔ WebSocket ↔ Test Runner Service
4. **Self-Healing**: Test Engine ↔ Self-Healing Service ↔ Locator Table

---

## 10. DEPLOYMENT ARCHITECTURE

### Production Deployment

```mermaid
graph TB
    subgraph Client["Client Side"]
        ChromeStore[Chrome Web Store]
        Browser[User Browser]
        Extension[Installed Extension]
    end
    
    subgraph Infrastructure["Infrastructure"]
        LoadBalancer[Load Balancer]
        CDN[Static Assets CDN]
        
        subgraph BackendCluster["Backend Cluster"]
            API1[API Server 1]
            API2[API Server 2]
            API3[API Server 3]
        end
        
        subgraph Database["Database Layer"]
            PrimaryDB[(PostgreSQL Primary)]
            ReplicaDB[(PostgreSQL Replica)]
            Redis[(Redis Cache)]
        end
        
        subgraph Monitoring["Monitoring"]
            Logs[Log Aggregation]
            Metrics[Metrics Collection]
            Alerts[Alerting System]
        end
    end
    
    ChromeStore --> Browser
    Browser --> Extension
    Extension -->|HTTPS| LoadBalancer
    LoadBalancer --> CDN
    LoadBalancer --> API1
    LoadBalancer --> API2
    LoadBalancer --> API3
    
    API1 --> PrimaryDB
    API2 --> PrimaryDB
    API3 --> PrimaryDB
    API1 --> ReplicaDB
    API2 --> ReplicaDB
    API3 --> ReplicaDB
    
    API1 --> Redis
    API2 --> Redis
    API3 --> Redis
    
    API1 --> Logs
    API2 --> Logs
    API3 --> Logs
    API1 --> Metrics
    API2 --> Metrics
    API3 --> Metrics
```

### Environment Configuration

| Environment | Database | Backend URL | Extension Source |
|------------|----------|-------------|------------------|
| Development | Local PostgreSQL | http://localhost:3000 | Local build |
| Staging | Staging DB | https://staging-api.example.com | Staging build |
| Production | PostgreSQL Cluster | https://api.example.com | Chrome Web Store |

---

## 🔧 TECHNOLOGY STACK

### Frontend (Extension)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI**: Custom CSS with VS Code theme
- **State Management**: React Hooks
- **Communication**: Fetch API + WebSocket

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Authentication**: JWT + bcrypt
- **Database ORM**: Prisma
- **Real-time**: WebSocket (ws library)

### Database
- **Primary**: PostgreSQL 14+
- **Caching**: Redis (optional)
- **Migrations**: Prisma Migrate
- **Seeding**: Custom seed scripts

### DevOps
- **Containerization**: Docker
- **Process Management**: PM2
- **Monitoring**: Winston (logs)
- **Testing**: Jest + Playwright Test

---

## 📊 PERFORMANCE CONSIDERATIONS

### Extension Optimization
- Lazy loading of UI components
- Efficient state management
- Minimal background processing
- Optimized bundle size

### Backend Optimization
- Database connection pooling
- Query optimization with indexes
- Response caching where appropriate
- WebSocket connection management

### Database Optimization
- Strategic indexing on frequently queried columns
- Connection pooling
- Read replicas for scaling
- Regular maintenance and cleanup

---

## 🛡️ SECURITY MEASURES

1. **Input Validation**: Comprehensive validation on all inputs
2. **SQL Injection Prevention**: Prisma ORM parameterized queries
3. **XSS Protection**: Content Security Policy in extension
4. **Authentication**: Secure JWT implementation
5. **HTTPS Only**: Enforce secure communication
6. **Rate Limiting**: Prevent abuse and brute force

---

## 🔄 FUTURE SCALABILITY

### Horizontal Scaling
- Stateless API design for easy scaling
- Load balancer support
- Database read replicas
- Microservices potential

### Feature Expansion
- Plugin architecture for custom test frameworks
- Additional browser support
- Cloud execution environments
- Advanced analytics and reporting

---

**Document Status**: Complete ✅  
**Last Updated**: 2025-10-29  
**Next Review**: 2025-11-29