# Architecture & Technical Decisions

This document outlines the high-level architecture of MLCC Copilot and details the reasoning behind key technical decisions made during its development.

## Architecture Flowchart

```mermaid
graph TD
    subgraph Client [Browser / Frontend]
        UI[Next.js React UI]
        Forms[Input Forms]
        Charts[Recharts Visualizations]
        
        UI --> Forms
        UI --> Charts
    end
    
    subgraph Backend [Next.js API Routes]
        Zod[Zod Input Validation]
        PredictAPI[/api/predict-performance]
        SuggestAPI[/api/suggest-design]
        InspectAPI[/api/inspect]
        
        Forms -- JSON POST --> Zod
        Zod -- Validated Data --> PredictAPI
        Zod -- Validated Data --> SuggestAPI
        Zod -- Validated Data --> InspectAPI
        
        Adam[Custom Adam Optimizer]
        SuggestAPI <--> Adam
    end
    
    subgraph Inference [ONNX Runtime Node]
        PINN[(PINN Surrogate Model)]
        CNN[(AOI Vision Model)]
        
        PredictAPI -- Tensor --> PINN
        Adam -- Batch Tensors --> PINN
        InspectAPI -- Image Tensor --> CNN
    end
    
    PINN -- Predictions --> PredictAPI
    PINN -- Batch Predictions --> Adam
    CNN -- Defect Probabilities --> InspectAPI
    
    PredictAPI -- JSON --> UI
    SuggestAPI -- JSON --> UI
    InspectAPI -- JSON --> UI
```

## Technical Decisions Log

### 1. Fully Stateless Architecture (No Database)
**Decision:** Removed PostgreSQL and all database dependencies.
**Why:** The ONNX models run inferences in milliseconds. Storing and retrieving past prediction results from a database introduced unnecessary complexity, latency, and state management. Because computation is virtually free and instantaneous, it is better to simply rerun the prediction on the fly rather than caching it.

### 2. ONNX Runtime Node vs. Python Subprocesses
**Decision:** Serve models using `onnxruntime-node` directly inside the Next.js API routes instead of spinning up a Flask server or Python subprocesses.
**Why:** Spawning Python subprocesses or maintaining a separate Python microservice introduces significant latency (cold starts, IPC overhead, and HTTP round trips). Running the C++ ONNX binaries natively in the Node.js process gives us sub-millisecond inference latency, which is strictly required for the Auto-Tune engine.

### 3. Custom Adam Optimizer in TypeScript
**Decision:** Built a custom Adam Gradient Descent optimizer in TypeScript using Finite Differences for the Auto-Tune feature.
**Why:** We needed inverse design capabilities (finding geometric inputs that hit a target capacitance). Using brute-force Monte Carlo was too slow. Because the PINN model is served in Node, we had to write the optimizer in TypeScript to keep the feedback loop tight. The optimizer runs hundreds of batched predictions per second locally in Node, achieving convergence in under 50 iterations.

### 4. Zod Schema Validation
**Decision:** Introduced strict runtime validation on all API endpoints using `zod`.
**Why:** The ONNX C++ bindings will crash the Node process if fed `NaN` or completely invalid tensor shapes. Zod ensures that all inputs (like layer count or dielectric constant) are strictly numeric and within physical bounds before ever touching the inference engine, ensuring rock-solid stability.

### 5. Standard Build vs. Dockerization
**Decision:** Stripped out Docker components in favor of a standard Node.js (`npm run build && npm start`) deployment.
**Why:** Modern PaaS platforms (like Render.com, Vercel, or Railway) have native support for Node.js environments. By removing Docker, we reduced the repository footprint, eliminated container build times, and simplified the CI/CD pipeline, relying entirely on `package.json` for dependency management.

### 6. Client-Side Rendering vs. Server Components
**Decision:** The UI heavily leverages Client Components (`'use client'`) for pages containing forms and Recharts.
**Why:** MLCC Copilot is a highly interactive engineering tool rather than a static content site. We need immediate state updates for the Predict Comparison Mode and dynamic charting, making client-side state management the most appropriate paradigm. 
