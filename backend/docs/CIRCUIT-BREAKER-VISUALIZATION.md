# Circuit Breaker Implementation Visualization

This document provides visual representations of the circuit breaker pattern implementation across the Risk Assessment Application microservices.

## Architecture Overview

The following diagram illustrates how the circuit breaker pattern is integrated into the microservice architecture:

```mermaid
graph TD
    Client[Client]
    
    subgraph "API Gateway"
        AG[API Gateway Service]
        CB_M[Circuit Breaker Monitor]
        Health[Health Monitoring]
    end
    
    subgraph "Auth Service"
        Auth[Authentication Service]
        Auth_CB[Circuit Breaker]
    end
    
    subgraph "Questionnaire Service"
        Quest[Questionnaire Service]
        Quest_CB[Circuit Breaker]
    end
    
    subgraph "Analysis Service"
        Analysis[Analysis Service]
        Analysis_CB[Circuit Breaker]
        WebSocket[WebSocket Manager]
    end
    
    subgraph "Report Service"
        Report[Report Service]
        Report_CB[Circuit Breaker]
    end
    
    subgraph "Payment Service"
        Payment[Payment Service]
        Payment_CB[Circuit Breaker]
    end
    
    Client --> AG
    
    AG --> Auth_CB
    Auth_CB --> Auth
    
    AG --> Quest_CB
    Quest_CB --> Quest
    
    AG --> Analysis_CB
    Analysis_CB --> Analysis
    Analysis --> WebSocket
    
    AG --> Report_CB
    Report_CB --> Report
    
    AG --> Payment_CB
    Payment_CB --> Payment
    
    Health -.-> Auth_CB
    Health -.-> Quest_CB
    Health -.-> Analysis_CB
    Health -.-> Report_CB
    Health -.-> Payment_CB
    
    CB_M -.-> Auth_CB
    CB_M -.-> Quest_CB
    CB_M -.-> Analysis_CB
    CB_M -.-> Report_CB
    CB_M -.-> Payment_CB
    
    Quest --> Analysis_CB
    Analysis --> Report_CB
    
    classDef service fill:#f9f,stroke:#333,stroke-width:2px;
    classDef circuitBreaker fill:#bbf,stroke:#33f,stroke-width:2px;
    classDef monitor fill:#bfb,stroke:#3f3,stroke-width:2px;
    
    class Auth,Quest,Analysis,Report,Payment service;
    class Auth_CB,Quest_CB,Analysis_CB,Report_CB,Payment_CB circuitBreaker;
    class Health,CB_M monitor;
```

## Circuit Breaker States

The circuit breaker pattern operates in three states:

```mermaid
stateDiagram-v2
    [*] --> Closed
    
    Closed --> Open: Error threshold exceeded
    Open --> HalfOpen: Reset timeout expires
    HalfOpen --> Closed: Test requests succeed
    HalfOpen --> Open: Test requests fail
    
    state Closed {
        [*] --> Normal
        Normal --> Monitoring: Errors occur
        Monitoring --> Normal: Errors stop
        Monitoring --> [*]: Error threshold reached
    }
    
    state Open {
        [*] --> Tripped
        Tripped --> Waiting: Start recovery timer
        Waiting --> [*]: Timer expires
    }
    
    state HalfOpen {
        [*] --> Testing
        Testing --> Success: Test succeeds
        Testing --> Failure: Test fails
        Success --> [*]: All tests pass
        Failure --> [*]: Any test fails
    }
```

## Service Health Monitoring Integration

The following diagram shows how the health monitoring system integrates with circuit breakers:

```mermaid
graph TD
    Client[Client/Admin] --> AG[API Gateway]
    
    subgraph "Health Monitoring System"
        HMS[Health Monitor Service]
        HC[Health Controller]
        SC[Security Controller]
        Cache[Health Cache]
    end
    
    subgraph "Circuit Breaker System"
        CBS[Circuit Breaker Status]
        CBM[Circuit Breaker Monitor]
        CBR[Circuit Breaker Reset]
    end
    
    AG --> HMS
    HMS --> HC
    HMS --> SC
    HMS <--> Cache
    
    HC --> |Status| CBS
    SC --> |Management| CBR
    CBM --> |Monitoring| CBS
    
    subgraph "Health API Endpoints"
        PublicAPI[Public Health Endpoints]
        AdminAPI[Admin Health Endpoints]
    end
    
    HC --> PublicAPI
    SC --> AdminAPI
    
    PublicAPI --> |Basic Info| Client
    AdminAPI --> |Detailed Info| Client
    
    classDef component fill:#f9f,stroke:#333,stroke-width:2px;
    classDef endpoint fill:#bbf,stroke:#33f,stroke-width:2px;
    classDef cache fill:#bfb,stroke:#3f3,stroke-width:2px;
    
    class HMS,HC,SC,CBS,CBM,CBR component;
    class PublicAPI,AdminAPI endpoint;
    class Cache cache;
```

## Circuit Breaker Request Flow

The following sequence diagram illustrates the flow of a request through the circuit breaker:

```mermaid
sequenceDiagram
    participant Client
    participant Gateway as API Gateway
    participant CB as Circuit Breaker
    participant Service
    
    Client->>Gateway: Request
    Gateway->>CB: Forward Request
    
    alt Circuit Closed
        CB->>Service: Forward Request
        Service->>CB: Response
        CB->>Gateway: Response
        Gateway->>Client: Response
    else Circuit Open
        CB-->>Gateway: Circuit Open Error
        Gateway-->>Client: Fallback Response
    else Circuit Half-Open
        CB->>Service: Test Request
        alt Service Recovered
            Service->>CB: Success Response
            CB->>CB: Close Circuit
            CB->>Gateway: Response
            Gateway->>Client: Response
        else Service Still Failing
            Service-->>CB: Error Response
            CB->>CB: Keep Circuit Open
            CB-->>Gateway: Circuit Open Error
            Gateway-->>Client: Fallback Response
        end
    end
```

## Health Check Data Flow

The following sequence diagram shows the flow of health check data:

```mermaid
sequenceDiagram
    participant Client
    participant Gateway as API Gateway
    participant HC as Health Controller
    participant CBS as Circuit Breaker Status
    participant Cache
    participant Services
    
    Client->>Gateway: GET /health
    Gateway->>HC: Forward Request
    
    alt Cache Valid
        HC->>Cache: Get Health Data
        Cache->>HC: Return Cached Data
    else Cache Invalid
        HC->>CBS: Get Circuit Status
        CBS->>HC: Return Circuit Status
        HC->>Services: Check Health Status
        Services->>HC: Return Health Status
        HC->>Cache: Update Cache
    end
    
    HC->>Gateway: Health Response
    Gateway->>Client: Health Response
```

These visualizations provide a clear understanding of how the circuit breaker pattern is implemented and integrated across the Risk Assessment Application.
