<div align="center">

# ⚡ DomainForge AI
### *Autonomous Domain-Specific AI Agent Engine & Builder*

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.0+-61DAFB.svg?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4+-38B2AC.svg?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Motor%20%7C%20MongoMock-47A248.svg?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![Python](https://img.shields.io/badge/Python-3.11%20%7C%203.14-3776AB.svg?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

<p align="center">
  <b>Turn domain expertise into production-ready, verifiable AI agents without writing code.</b><br/>
  Featuring real-time Server-Sent Events (SSE) streaming, deterministic domain analysis tools, and LLM-powered synthesis.
</p>

[Explore Features](#-key-features) • [System Architecture](#-system-architecture) • [Quick Start](#-quick-start) • [API Reference](#-api-endpoints) • [Testing](#-verification--tests)

---

</div>

## 📖 Overview

**DomainForge AI** bridges the gap between non-technical domain experts (civil engineers, urban planners, accessibility auditors, healthcare caseworkers) and autonomous AI systems. Instead of prompting raw chatbots, users specify problem statements, evidence constraints, and expected outcomes. DomainForge synthesizes a verifiable agent pipeline equipped with **domain-specific analysis tools**, **quality assurance rubrics**, and **instant deployment endpoints**.

Originally conceived for the *Accessibility & Social Good* domain, DomainForge now features a **Live Full-Stack Execution Engine** with real-time token and step streaming, statistical incident log analysis, spatial clustering, and automated evidence-gap auditing.

---

## ✨ Key Features

| Capability | Description |
| :--- | :--- |
| 🧙 **Master Agent Proposal Generator** | Transform natural-language problem descriptions into structured agent architectures with inputs, workflow steps, tools, and quality criteria. |
| ⚡ **Live Real-Time Streaming (SSE)** | Follow agent execution live with real-time Server-Sent Events showing phase transitions, tool executions, and analytical logs. |
| 🛠️ **Domain Analysis Tools** | Built-in civil engineering & municipal audit engines: <ul><li>`summarize_incident_logs`: Statistical frequency, duration, and drain status analysis.</li><li>`extract_spatial_clusters`: Geographic hotspot aggregation and severity ranking.</li><li>`evaluate_evidence_gaps`: Automated audits for missing engineering parameters (e.g., invert elevation, soil infiltration rate, peak rainfall).</li></ul> |
| 🧠 **Multi-Provider LLM Synthesis** | Integrates with **Google Gemini (`google-genai`)** and **OpenAI SDK** with strict Pydantic schema validation, backed by an offline domain synthesis fallback. |
| 🛡️ **Verifiable Governance Checklist** | Strict *Draft → Test → Publish* lifecycle. Agents must satisfy pre-publish verification checks and complete successful test executions before going live. |
| 🚀 **Instant Public Slug & REST API** | One-click publishing generates a public link (`/p/:slug`) and provides a production-ready `curl` snippet for programmatic consumption. |

---

## 🏛 System Architecture

```mermaid
flowchart TD
    subgraph Client["Frontend (React + Tailwind + shadcn/ui)"]
        UI["Workspace & Agent Builder"]
        RunView["Live Runner & Log Streamer"]
        ResultsView["Interactive Report & Quality Checklist"]
    end

    subgraph Server["Backend (FastAPI Engine)"]
        API["REST & SSE Endpoints (/api/agents)"]
        Runner["Agent Execution Engine (services/agent_runner.py)"]
        
        subgraph Tools["Domain Analysis Suite"]
            T1["Incident Summarizer"]
            T2["Spatial Hotspot Clusterer"]
            T3["Evidence Gap Evaluator"]
        end
        
        subgraph LLM["Structured Synthesis"]
            Gemini["Gemini (google-genai)"]
            OpenAI["OpenAI SDK"]
            Fallback["Heuristic Domain Synthesizer"]
        end
    end

    subgraph Storage["Persistence Layer"]
        Mongo[("MongoDB / Motor")]
        Mock[("MongoMock Fallback")]
    end

    UI -->|POST /api/agents/{id}/runs| API
    API -->|Initialize Run record| Mongo
    API -->|AsyncGenerator SSE stream| RunView
    Runner --> Tools
    Tools --> Runner
    Runner --> LLM
    LLM --> Runner
    Runner -->|Save Result & Traces| Mongo
    Mongo -.->|Offline In-Memory| Mock
    RunView --> ResultsView
```

---

## 🚀 Quick Start

### Prerequisites
- **Python**: 3.11+ (Tested on Python 3.14)
- **Node.js**: 18+ & **npm**
- **MongoDB**: Local daemon running on port 27017 *(optional — in-memory fallback enabled automatically)*

### 1. Clone the Repository
```bash
git clone https://github.com/aeternum-core/domainforgeai.git
cd domainforgeai
```

### 2. Backend Setup
```bash
cd backend

# Create and activate virtual environment (optional)
python -m venv venv
# On Windows: venv\Scripts\activate
# On Linux/macOS: source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI development server
uvicorn server:app --host 127.0.0.1 --port 8001 --reload
```
> The API will be available at **`http://127.0.0.1:8001`** and Swagger docs at **`http://127.0.0.1:8001/docs`**.

### 3. Frontend Setup
In a new terminal window:
```bash
cd frontend

# Install npm dependencies
npm install

# Start React development server
npm start
```
> The web application will launch at **`http://localhost:3000`**.

---

## ⚙️ Environment Variables

### `backend/.env`
```ini
MONGO_URL=mongodb://localhost:27017
DB_NAME=domainforge
PORT=8001

# Optional LLM API Keys (defaults to internal deterministic engine if omitted)
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

### `frontend/.env`
```ini
PORT=3000
REACT_APP_BACKEND_URL=http://localhost:8001
```

---

## 📡 API Endpoints

### 🤖 Agent Management
| Method | Route | Description |
| :--- | :--- | :--- |
| `POST` | `/api/agents/generate` | Generates a structured agent proposal using the Master Agent |
| `GET` | `/api/agents` | Lists all created agents |
| `POST` | `/api/agents` | Saves and persists a new agent specification |
| `GET` | `/api/agents/{id}` | Fetches full agent metadata, workflow, and tools |
| `PUT` | `/api/agents/{id}` | Updates an existing agent specification |
| `DELETE` | `/api/agents/{id}` | Deletes an agent |

### ⚡ Live Execution & Streaming
| Method | Route | Description |
| :--- | :--- | :--- |
| `POST` | `/api/agents/{id}/runs` | Initializes a live execution run with field observations |
| `GET` | `/api/agents/{id}/runs/{run_id}/stream` | **Server-Sent Events (SSE)** stream of live execution events & logs |
| `GET` | `/api/agents/{id}/runs/{run_id}` | Retrieves completed run output, checklist, and tool traces |

### 🌐 Governance & Public Access
| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/api/agents/{id}/prepublish` | Audits agent readiness (inputs, tools, successful test run) |
| `POST` | `/api/agents/{id}/publish` | Publishes agent to a stable version snapshot and slug |
| `POST` | `/api/agents/{id}/unpublish` | Disables public availability |
| `GET` | `/api/public/{slug}` | Returns public-facing agent specification |
| `POST` | `/api/public/{slug}/runs` | Standalone public execution endpoint |

---

## 💻 Sample Programmatic Execution

Once published, any agent can be triggered programmatically via standard HTTP:

```bash
curl -X POST "http://localhost:8001/api/public/demo-waterlog-agent/runs" \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": {
      "situation": "Field report: recurrent standing water of 35cm observed along Market Street corridor following 45mm/hr storm event."
    },
    "use_sample": true
  }'
```

---

## 🧪 Verification & Tests

DomainForge includes a comprehensive pytest suite covering live workflow execution, SSE streaming, domain analysis tools, and CRUD operations:

```bash
cd backend
python -m pytest tests/ -v
```

**Results:**
```text
tests/test_live_engine.py::test_summarize_incident_logs PASSED
tests/test_live_engine.py::test_extract_spatial_clusters PASSED
tests/test_live_engine.py::test_evaluate_evidence_gaps PASSED
tests/test_live_engine.py::test_live_run_initialization_and_stream PASSED
tests/test_live_engine.py::test_public_endpoints PASSED
tests/test_domainforge.py::test_root PASSED
tests/test_domainforge.py::test_list_templates PASSED
tests/test_domainforge.py::test_get_agent PASSED
...
============================= 16 passed in 5.98s =============================
```

To run frontend production compilation verification:
```bash
cd frontend
npm run build
```

---

## 🛡️ Built for Social Good & Safety

DomainForge AI enforces strict safety rails for non-software domains:
1. **Clear Attribution & Assumptions**: Every agent workflow surfaces explicit system assumptions, evidence limitations, and beneficiaries.
2. **Actionable Gap Audits**: Instead of hallucinating certainty, missing critical variables (e.g., rainfall depth, runoff coefficients) are flagged as priority field investigations.
3. **Quality Rubrics**: Every execution evaluates confidence against an automated pass/review quality checklist.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
