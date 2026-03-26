# AROS – Autonomous Revenue Optimization System

🚀 **Complete end-to-end revenue anomaly detection, diagnosis, and autonomous optimization platform.**

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│ AROS PIPELINE: 6-Agent Autonomous Architecture         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. Ingestion        → Fetch KPI metrics from DB       │
│  2. Signal Detection → Detect revenue anomalies        │
│  3. Diagnosis        → Identify root causes            │
│  4. Strategy         → Recommend optimization actions  │
│  5. Simulation       → Predict impact (Monte Carlo)    │
│  6. Decision         → Apply governance, decide AUTO   │
│     (+Governance)     | NOTIFY | ESCALATE              │
│  7. Execution        → Deploy approved strategies      │
│                                                          │
│  API Server (FastAPI + WebSocket)                      │
│         ↕ JSON + Real-time Events                      │
│  Frontend Dashboard (React + D3 + Mermaid)             │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
AROS/
├── agents/                      # 6 autonomous agents
│   ├── signal_detection/        # Anomaly detection
│   ├── diagnosis/               # Root cause analysis
│   ├── strategy/                # Strategy recommendation
│   ├── simulation/              # Impact prediction
│   ├── decision/                # Governance + decisions
│   └── execution/               # Safe deployment
│
├── governance/
│   └── policy_engine.py         # Business rules enforcement
│
├── ingestion/
│   └── aros_ingestion.py        # KPI data fetching
│
├── pipeline/
│   └── run_pipeline.py          # Orchestrator (agents in sequence)
│
├── api/
│   └── fastapi_server.py        # REST API + WebSocket
│
├── tests/
│   ├── test_e2e_integration.py  # Full pipeline tests
│   ├── test_signal_detection.py # Agent unit tests
│   └── test_scenarios.json      # Test data
│
├── frontend/                    # React dashboard
│   ├── src/
│   │   ├── components/
│   │   │   ├── MonitoringDashboard.jsx
│   │   │   ├── PipelineFlow.jsx
│   │   │   ├── DecisionExplorer.jsx
│   │   │   └── ApprovalCenter.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
└── README.md
```

---

## Quick Start

### Prerequisites

- **Python 3.8+**
- **Node.js 16+** (for frontend)
- **PostgreSQL** (for KPI metrics database)
- **pip** (Python package manager)
- **npm** (Node package manager)

### 1. Backend Setup

#### Install Python dependencies:

```bash
cd c:\Capstone Projects\AROS\Agent\AROS

pip install fastapi uvicorn psycopg2-binary pandas
```

#### Test the backend pipeline (with mock data):

```bash
python tests/test_e2e_integration.py
```

**Expected output:**
```
✓ Signal Detection: 5 signals detected (HIGH severity)
✓ Diagnosis: 3 root causes identified
✓ Strategy: 3 strategies recommended
✓ Simulation: 500 trials, +$18M median uplift
✓ Decision: ESCALATE (fraud score > 0.65)
✓ Execution: PENDING_APPROVAL
✅ ALL TESTS PASSED
```

---

### 2. FastAPI Server Setup

#### Start the API server:

```bash
python api/fastapi_server.py
```

**Expected output:**
```
======================================================================
 AROS API SERVER STARTING
======================================================================

Server: http://localhost:8000
API Docs: http://localhost:8000/docs
WebSocket: ws://localhost:8000/ws

======================================================================
```

The server will:
- Listen on `http://localhost:8000`
- Expose REST API endpoints
- Support WebSocket for real-time pipeline events
- Serve Swagger UI at `/docs`

---

### 3. Frontend Setup

#### Install frontend dependencies:

```bash
cd frontend
npm install
```

#### Start the dev server:

```bash
npm run dev
```

**Expected terminal output:**
```
VITE v4.4.0 ready in 123 ms

➜  Local:   http://localhost:3000
➜  press h to show help
```

Open your browser to **http://localhost:3000** → You'll see the AROS Dashboard!

---

## Dashboard Features

### **View 1: Real-Time Monitoring** 📊
- Live alert cards (revenue drop, payment failure, latency spike)
- Pending approvals queue
- Key metrics (Revenue, Conversion, Latency) trending
- Quick action buttons

### **View 2: Pipeline Flow** ⚙️
- Swimlane visualization of 6 agents executing in sequence
- Status badges (✅ Complete, ⏳ In Progress, ❌ Failed)
- Execution time for each agent
- Decision preview with blast radius

### **View 3: Decision Explorer** 🔍
- **Full drill-down:** Signal → Diagnosis → Strategy → Simulation → Decision
- Collapsible sections with evidence links
- Root cause analysis with confidence scores
- Strategy comparison (uplift %, budget, ROI)
- Monte Carlo simulation results (90% CI)
- Governance policy check results
- What-if simulation (adjust discount % → see impact)
- Full audit trail

### **View 4: Approval Center** ✋
- Queue of pending decisions (sorted by priority)
- One-click Approve / Reject / Defer buttons
- Completed decisions history (last 24h)
- Required approvals checklist
- Budget and risk indicators

---

## API Endpoints

### REST API

```
POST   /run-pipeline           → Trigger full anomaly detection pipeline
GET    /decisions              → List all pending decisions
GET    /decision/{id}          → Get full decision context
POST   /approve                → Approve a decision (trigger execution)
POST   /reject                 → Reject a decision
```

### WebSocket

```
WS     /ws                     → Subscribe to real-time pipeline events
```

**Events emitted:**
```
- pipeline_start: Pipeline execution started
- pipeline_complete: All agents finished
- pipeline_error: Error during execution
- decision_approved: User approved a decision
- decision_rejected: User rejected a decision
```

---

## Example Workflow

### **Scenario: Revenue anomaly detected**

1. **User opens dashboard** → Sees 🔴 alert: "Revenue down 18%"
2. **Clicks alert card** → Navigates to Decision Explorer
3. **Reads Signal** → Revenue drop -18%, Payment failure +140%, Latency +112%
4. **Reads Diagnosis** → 3 root causes: Payment gateway issue (85%), Fraud spike (78%)
5. **Sees Strategies** → 3 options: Fraud mitigation (+6%), Discount campaign (+8.5%)
6. **Views Simulation** → 500 trials predict +$18M median uplift
7. **Checks Decision** → Fraud score 0.78 > 0.65 threshold → ESCALATE
8. **Navigates to Approval Center**
9. **Clicks ✅ APPROVE** → Execution agent deploys fraud mitigation (0% cost, high confidence)
10. **Watches status update** → Execution completes in real-time via WebSocket

---

## Governance Rules (Strict)

✋ **AROS enforces 6 strict business rules:**

| Rule | Enforcement |
|------|------------|
| No discount > 30% | VIOLATE → ESCALATE |
| Fraud score > 0.65 | VIOLATE → ESCALATE + SECURITY_TEAM approval |
| No pricing below cost | VIOLATE → ESCALATE + CFO approval |
| High-risk strategies | HIGH risk + blast_radius:CRITICAL → NOTIFY |
| Budget > $100K | → NOTIFY (requires approval) |
| UI changes w/o simulation | → ESCALATE |

---

## Decision Outcomes

```
AUTO     → Execute immediately (low risk + high confidence + no violations)
NOTIFY   → Awaiting human approval (medium risk / policy violations)
ESCALATE → Requires escalation review (high risk / critical fraud / major violations)
```

---

## Testing

### Run all integration tests:

```bash
python tests/test_e2e_integration.py
```

### Test specific agent:

```bash
python tests/test_signal_detection.py
```

### Manual pipeline execution:

```bash
python pipeline/run_pipeline.py
```

---

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| **6 agents + orchestrator** | Separation of concerns; each agent testable independently |
| **Governance layer** | Separate policy engine (auditable, enforceable, reusable) |
| **FastAPI + WebSocket** | Real-time events for live dashboard; REST for traditional clients |
| **React + D3 + Mermaid** | Interactive, responsive UI; flow diagrams; charts |
| **Decision enum** | AUTO / NOTIFY / ESCALATE (clear escalation path) |
| **JSON I/O** | Language-agnostic; easy to debug; full audit trail |

---

## Performance

- **Signal Detection:** ~0.8s
- **Diagnosis:** ~1.1s
- **Strategy:** ~0.5s
- **Simulation (500 trials):** ~2.1s
- **Decision + Execution:** ~0.3s
- **Total pipeline:** ~5.7s

---

## Future Enhancements

1. ✅ **Monitoring Agent** – Track actual vs. predicted outcomes
2. ✅ **Reflection Agent** – Improve strategy models over time
3. ✅ **Mobile UI** – On-call team mobile access
4. ✅ **Slack/Email** – External notifications
5. ✅ **Audit Dashboard** – Historical analysis & compliance reporting
6. ✅ **Multi-tenant** – Support multiple platforms/regions
7. ✅ **Predictive Alerts** – Forecast anomalies before they hit

---

## Support

For issues or questions, refer to:
- **Agent logic**: Read docstrings in each agent
- **Governance rules**: See `governance/policy_engine.py`
- **API integration**: Check `api/fastapi_server.py`
- **Dashboard**: Review component files in `frontend/src/components/`

---

## License

Capstone Project © 2026

---

**🎯 AROS: Autonomous Revenue Optimization. Detect. Diagnose. Decide. Deploy.**
