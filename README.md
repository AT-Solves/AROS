# AROS - Autonomous Revenue Optimization System

AROS is an agentic pipeline that detects revenue-impacting anomalies, diagnoses probable causes, proposes strategies, simulates impact, applies governance, and optionally executes actions under guardrails.

## Overview

Pipeline stages:

1. Ingestion
2. Signal Detection
3. Diagnosis
4. Strategy
5. Simulation
6. Decision
7. Execution
8. Reflection

Primary entry points:

- Pipeline runner: `pipeline/run_pipeline.py`
- API server: `api/fastapi_server.py`
- Frontend (Vite React): `frontend/`

## Architecture

Execution flow:

```text
Ingestion -> Signal Detection -> Diagnosis -> Strategy -> Simulation -> Decision -> Execution -> Reflection
```

Orchestration is implemented in `agents/orchestrator/agent.py` and merges each stage output into a shared context object.

## Agents and Responsibilities

| Stage | Module | Responsibility |
| --- | --- | --- |
| Ingestion | `agents/ingestion/aros_ingestion.py` | Pulls KPI and domain data from PostgreSQL, computes summaries/trends/distributions |
| Signal Detection | `agents/signal_detection/agent.py` | Detects anomaly signals and stage-level severity/confidence |
| Diagnosis | `agents/diagnosis/agent.py` | Maps signals to root causes and computes fraud risk context |
| Strategy | `agents/strategy/agent.py` | Generates action candidates covering diagnosed causes |
| Simulation | `agents/simulation/agent.py` | Applies heuristic impact models and selects recommended action |
| Decision | `agents/decision/agent.py` | Runs governance policy checks and emits EXECUTE/INVESTIGATE decision |
| Execution | `agents/execution/agent.py` | Applies execution guardrails, dry-run/auto execution, notifications, rollback metadata |
| Reflection | `agents/reflection/agent.py` | Scores coverage/alignment and emits learning actions |

Governance logic is in `governance/policy_engine.py`.

## Core Policy Guardrails

Current thresholds (policy engine):

- `MAX_DISCOUNT_PCT = 30`
- `FRAUD_SCORE_THRESHOLD = 0.65`
- `PAYMENT_FAILURE_THRESHOLD = 10.0`
- `LATENCY_MS_THRESHOLD = 1000.0`
- `CART_ABANDONMENT_THRESHOLD = 40.0`
- Low-confidence violation when confidence `< 0.60`

Policy decision mapping:

- `AUTO -> EXECUTE`
- `NOTIFY -> INVESTIGATE`
- `ESCALATE -> INVESTIGATE`

## Persistence Layer

PostgreSQL schema lives in `db/schema.sql` and includes:

- `decisions`
- `decision_audit_log`
- `strategy_performance_log`
- `baseline_calibration`
- `signal_history`
- `execution_events`
- `system_health`
- `schema_migrations`

DB access and JSON parsing utilities are in `db/connection.py`.

## API Endpoints

Implemented in `api/fastapi_server.py`:

- `GET /` - health/info
- `POST /run-pipeline` - trigger pipeline
- `GET /decisions` - list decisions
- `GET /decision/{decision_id}` - decision context
- `GET /decision/{decision_id}/events` - audit and event log
- `POST /approve` - approve decision
- `POST /reject` - reject decision
- `GET /agents/overview` - stage-by-stage dashboard payload
- `GET /test-data` - test fixtures for UI validation
- `WS /ws` - realtime event stream

## Frontend

Frontend app is in `frontend/` (React + Vite).

Key adapter for dashboard shaping:

- `frontend/src/utils/overviewAdapter.js`

It normalizes API output into stage cards, stage statuses, trend series, simulation series, and Revenue Insights.

## Configuration

Environment variables are read in `config.py` and execution agent config:

- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_HOST`
- `DB_PORT`
- `OPENAI_API_KEY` (optional depending on usage)
- `GROQ_API_KEY` (optional depending on usage)
- `ALLOW_AUTO_EXECUTION` (`true` or `false`)

Example `.env`:

```env
DB_NAME=aros
DB_USER=postgres
DB_PASSWORD=test123
DB_HOST=localhost
DB_PORT=5432
ALLOW_AUTO_EXECUTION=false
```

## Local Setup

### 1. Create and activate virtual environment

Windows PowerShell:

```powershell
python -m venv .venv
& .\.venv\Scripts\Activate.ps1
```

### 2. Install Python dependencies

```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Initialize database schema

```powershell
python db\init_db.py
```

### 4. Run backend API

```powershell
$env:PYTHONPATH = (Get-Location).Path
python -m uvicorn api.fastapi_server:app --host 127.0.0.1 --port 8000
```

### 5. Run frontend

```powershell
cd frontend
npm install
npm run dev
```

## Execution Behavior

Execution stage is blocked unless all are true:

1. Decision is `EXECUTE`
2. `requires_human_approval` is empty
3. Confidence is at least `0.6`
4. Selected action maps to a known action
5. `ALLOW_AUTO_EXECUTION=true`

If any condition fails, execution remains dry-run and reason is set to `blocked_by_guardrails_or_manual_mode`.

## Operational Notes

- `Simulation` output includes both recommendation payload and orchestration metadata such as `next_agent`.
- `Execution` status can show as blocked in UI when decision is `INVESTIGATE` (expected by current adapter logic).
- Revenue Insights is derived in frontend adapter from ingestion, simulation, decision, and execution fields.

## Known Integration Gaps (Current Codebase)

These are currently visible in source and should be aligned before production hardening:

1. `api/fastapi_server.py` calls `run_pipeline(execute_approved_only=False)` while `pipeline/run_pipeline.py` defines `run_pipeline()` without parameters.
2. `api/fastapi_server.py` imports `execute_strategy` in approval flow, but execution module currently exposes `run_execution` and `execute_action`.
3. Legacy tests in `tests/test_e2e_integration.py` reference older function names not matching current agent exports.

## Testing

Project contains tests and fixtures in `tests/`.

Run tests (if environment is set):

```powershell
pytest -q
```

## Repository Structure (High-Level)

```text
agents/
api/
db/
frontend/
governance/
pipeline/
tests/
utils/
```

## License

See `LICENSE`.
