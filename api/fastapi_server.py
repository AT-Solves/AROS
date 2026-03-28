"""
AROS – FastAPI Server with PostgreSQL Persistence
Exposes pipeline as REST API and WebSocket for real-time events.
"""

import json
import asyncio
from typing import Dict, List
from datetime import datetime, timezone
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, WebSocket, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

from pipeline.run_pipeline import run_pipeline
from db.connection import get_db_manager, DatabaseConfig

# ─── FastAPI App ────────────────────────────────────────────────────────────
app = FastAPI(
    title="AROS – Autonomous Revenue Optimization System",
    description="Real-time revenue anomaly detection, diagnosis, and optimization",
    version="1.0.0"
)

# ─── CORS Middleware ────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Database Initialization ────────────────────────────────────────────────
db_config = DatabaseConfig(dbname="aros", user="postgres", password="test123",
                           host="localhost", port="5432")
db_manager = get_db_manager(db_config)

# WebSocket manager for broadcast
active_websockets: List[WebSocket] = []


# ─── Request/Response Models ────────────────────────────────────────────────
class ApprovalRequest(BaseModel):
    decision_id: str
    approved: bool
    comment: str = ""


class SimulationRequest(BaseModel):
    decision_id: str
    discount_pct: float = None
    budget_max: float = None


# ─── WebSocket Manager ──────────────────────────────────────────────────────
class WebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    async def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
    
    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"WebSocket send error: {e}")


manager = WebSocketManager()


# ─── Pipeline Execution (in background, emitting events) ───────────────────
async def run_pipeline_with_events(task_id: str):
    """Run pipeline and emit WebSocket events + save to DB"""
    
    try:
        # Emit start event
        await manager.broadcast({
            "type": "pipeline_start",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "task_id": task_id
        })
        
        # Log event to DB
        db_manager.log_event("pipeline_start", task_id=task_id)
        
        # Run pipeline
        result = run_pipeline(execute_approved_only=False)
        
        # Store decision in DB if generated
        if "decision" in result and result["decision"]:
            decision = result["decision"]
            decision_id = decision.get("decision_id", "")
            
            # Prepare decision data for persistence
            decision_data = {
                'decision_id': decision_id,
                'task_id': task_id,
                'signal_detection': result.get("signal_detection", {}),
                'diagnosis': result.get("diagnosis", {}),
                'strategy': result.get("strategy", {}),
                'simulation': result.get("simulation", {}),
                'governance_check': decision.get("governance_check", {}),
                'decision_output': decision,
                'decision_type': decision.get("decision", "NOTIFY"),
                'blast_radius': decision.get("blast_radius", "LOW"),
                'expected_uplift_pct': decision.get("expected_impact", {}).get("uplift_pct", 0),
                'confidence': decision.get("confidence", 0)
            }
            
            # Save to database
            db_id = db_manager.create_decision(decision_data)
            
            # Log audit entry
            db_manager.log_audit_action(
                decision_id=db_id,
                action="CREATED",
                actor="SYSTEM",
                actor_role="SYSTEM",
                reason="Pipeline auto-generated"
            )
            
            # Log event to DB
            db_manager.log_event("decision_created", task_id=task_id, decision_id=db_id,
                               event_data={'decision_type': decision.get("decision")})
        
        # Emit completion event
        await manager.broadcast({
            "type": "pipeline_complete",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "task_id": task_id,
            "status": result.get("status", ""),
            "decision_id": result.get("decision", {}).get("decision_id", ""),
        })
        
        # Log completion to DB
        db_manager.log_event("pipeline_complete", task_id=task_id, 
                           event_data={'status': result.get("status")})
        
        return result
    
    except Exception as e:
        await manager.broadcast({
            "type": "pipeline_error",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "task_id": task_id,
            "error": str(e)
        })
        
        # Log error to DB
        db_manager.log_event("pipeline_error", task_id=task_id, 
                           event_data={'error': str(e)})
        
        raise


# ─── REST Endpoints ─────────────────────────────────────────────────────────

@app.get("/")
async def root():
    """Health check / API info"""
    return {
        "status": "healthy",
        "service": "AROS API Server",
        "version": "1.0.0",
        "endpoints": {
            "POST /run-pipeline": "Start anomaly detection pipeline",
            "GET /decisions": "List pending decisions",
            "GET /decision/{id}": "Get full decision context",
            "POST /approve": "Approve a decision",
            "POST /reject": "Reject a decision",
            "WS /ws": "WebSocket for real-time events",
        }
    }


@app.post("/run-pipeline")
async def start_pipeline(background_tasks: BackgroundTasks):
    """
    Trigger full AROS pipeline: Ingestion → Signal → Diagnosis → Strategy → Simulation → Decision
    
    Returns:
        {
            "status": "started" | "no_anomaly" | "error",
            "task_id": str,
            "message": str
        }
    """
    task_id = f"TASK_{int(datetime.now(timezone.utc).timestamp() * 1000)}"
    
    # Run pipeline in background
    background_tasks.add_task(run_pipeline_with_events, task_id)
    
    return {
        "status": "started",
        "task_id": task_id,
        "message": "Pipeline execution started. Subscribe to WebSocket for real-time updates.",
    }


@app.get("/decisions")
async def list_decisions(status: str = None):
    """List decisions, optionally filtered by status"""
    
    try:
        # Fetch from database
        decisions = db_manager.list_decisions(status=status, limit=50)
        
        return {
            "count": len(decisions),
            "decisions": [
                {
                    "decision_id": dec.get("decision_id"),
                    "decision_type": dec.get("decision_type"),
                    "strategy": dec.get("strategy", {}).get("primary_strategy", {}).get("action_type", ""),
                    "expected_uplift_pct": dec.get("expected_uplift_pct"),
                    "blast_radius": dec.get("blast_radius"),
                    "created_at": dec.get("created_at").isoformat() if dec.get("created_at") else None,
                    "status": dec.get("status")
                }
                for dec in decisions
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/agents/overview")
async def agents_overview():
    """Return DB-backed summaries for each pipeline agent"""
    try:
        decisions = db_manager.list_decisions(limit=50)
        status_counts = {}
        for dec in decisions:
            status = dec.get("status") or "UNKNOWN"
            status_counts[status] = status_counts.get(status, 0) + 1

        latest = decisions[0] if decisions else None
        latest_id = latest.get("decision_id") if latest else None
        latest_data = latest or {}

        table_summaries = db_manager.get_overview_table_summaries()
        return {
            "total_decisions": len(decisions),
            "status_counts": status_counts,
            "latest_decision_id": latest_id,
            "latest_decision": latest_data,
            "table_summaries": table_summaries,
            "agents": [
                {
                    "id": "ingestion",
                    "title": "Ingestion Agent",
                    "description": "Pulls KPI and baseline data from PostgreSQL to seed the agent pipeline.",
                    "primary_metrics": {
                        "decisions_analyzed": len(decisions),
                        "latest_status": latest_data.get("status", "N/A"),
                    },
                    "details": latest_data.get("signal_detection") or {},
                },
                {
                    "id": "signal_detection",
                    "title": "Signal Detection Agent",
                    "description": "Detects anomalies and signals from ingested KPIs, then reports severity and confidence.",
                    "primary_metrics": {
                        "severity": (latest_data.get("signal_detection") or {}).get("severity", "N/A"),
                        "signal_count": len((latest_data.get("signal_detection") or {}).get("signals", [])),
                        "confidence": (latest_data.get("signal_detection") or {}).get("confidence", 0),
                    },
                    "details": latest_data.get("signal_detection") or {},
                },
                {
                    "id": "diagnosis",
                    "title": "Diagnosis Agent",
                    "description": "Analyzes root causes and risk drivers for the detected signals.",
                    "primary_metrics": {
                        "causes": len((latest_data.get("diagnosis") or {}).get("diagnosed_causes", [])),
                        "fraud_score": (latest_data.get("diagnosis") or {}).get("fraud_score", 0),
                    },
                    "details": latest_data.get("diagnosis") or {},
                },
                {
                    "id": "strategy",
                    "title": "Strategy Agent",
                    "description": "Recommends actions and prioritizes them based on uplift, cost, and risk.",
                    "primary_metrics": {
                        "options": len((latest_data.get("strategy") or {}).get("strategies", [])),
                        "selected": (latest_data.get("strategy") or {}).get("primary_strategy", {}).get("action_type", "N/A"),
                    },
                    "details": latest_data.get("strategy") or {},
                },
                {
                    "id": "simulation",
                    "title": "Simulation Agent",
                    "description": "Runs Monte Carlo projections to estimate expected uplift and confidence.",
                    "primary_metrics": {
                        "confidence": (latest_data.get("simulation") or {}).get("confidence", 0),
                        "baseline_revenue": ((latest_data.get("simulation") or {}).get("simulated_metrics") or {}).get("revenue", {}).get("baseline", "N/A"),
                    },
                    "details": latest_data.get("simulation") or {},
                },
                {
                    "id": "decision",
                    "title": "Decision Agent",
                    "description": "Applies governance and determines the final course of action.",
                    "primary_metrics": {
                        "decision": ((latest_data.get("decision_output") or {})).get("decision", "N/A"),
                        "blast_radius": ((latest_data.get("decision_output") or {})).get("blast_radius", "N/A"),
                    },
                    "details": latest_data.get("decision_output") or {},
                },
                {
                    "id": "execution",
                    "title": "Execution Agent",
                    "description": "Executes the approved strategy and logs deployment outcomes.",
                    "primary_metrics": {
                        "execution_status": ((latest_data.get("execution_result") or {})).get("execution_status", "PENDING"),
                        "deployment_id": ((latest_data.get("execution_result") or {})).get("deployment_id", "N/A"),
                    },
                    "details": latest_data.get("execution_result") or {},
                },
            ],
            "links": {
                "latest_decision": f"/decision/{latest_id}" if latest_id else None,
                "latest_decision_events": f"/decision/{latest_id}/events" if latest_id else None,
                "test_data": "/test-data"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/decision/{decision_id}/events")
async def get_decision_events(decision_id: str):
    """Return audit trail and execution event log for a decision"""
    try:
        dec = db_manager.get_decision(decision_id)
        if not dec:
            raise HTTPException(status_code=404, detail=f"Decision {decision_id} not found")

        audit_log = db_manager.get_audit_log(decision_id)
        event_log = db_manager.get_events_by_decision(decision_id)

        return {
            "decision_id": decision_id,
            "audit_log": audit_log,
            "event_log": event_log,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/test-data")
async def get_test_data():
    """Return sample test input and expected output data for UI validation"""
    try:
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        input_path = os.path.join(project_root, 'tests', 'test_input.json')
        output_path = os.path.join(project_root, 'tests', 'test_output.json')

        test_input = {}
        test_output = {}

        if os.path.exists(input_path):
            with open(input_path, 'r', encoding='utf-8') as fp:
                test_input = json.load(fp)

        if os.path.exists(output_path):
            with open(output_path, 'r', encoding='utf-8') as fp:
                test_output = json.load(fp)

        return {
            "test_input": test_input,
            "test_output": test_output,
            "note": "These files show representative input and output used during pipeline testing."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unable to load test data: {str(e)}")


@app.get("/decision/{decision_id}")
async def get_decision(decision_id: str):
    """Get full decision context from database"""
    
    try:
        # Fetch from database
        dec = db_manager.get_decision(decision_id)
        
        if not dec:
            raise HTTPException(status_code=404, detail=f"Decision {decision_id} not found")
        
        # Fetch audit log
        audit_log = db_manager.get_audit_log(decision_id)
        
        return {
            "decision_id": decision_id,
            "status": dec.get("status"),
            "created_at": dec.get("created_at").isoformat() if dec.get("created_at") else None,
            "signal": dec.get("signal_detection"),
            "diagnosis": dec.get("diagnosis"),
            "strategy": dec.get("strategy"),
            "simulation": dec.get("simulation"),
            "governance_check": dec.get("governance_check"),
            "decision": dec.get("decision_output"),
            "execution_result": dec.get("execution_result"),
            "actual_outcome_30min": dec.get("actual_outcome_30min"),
            "audit_log": audit_log
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.post("/approve")
async def approve_decision(request: ApprovalRequest):
    """Approve a decision and trigger execution"""
    
    try:
        # Fetch decision from DB
        dec = db_manager.get_decision(request.decision_id)
        
        if not dec:
            raise HTTPException(status_code=404, detail=f"Decision {request.decision_id} not found")
        
        # Update decision status in DB
        db_manager.update_decision_status(
            request.decision_id, 
            "APPROVED",
            approved_by=request.comment or "API_USER",
            reason=request.comment
        )
        
        # Log approval
        db_manager.log_audit_action(
            decision_id=request.decision_id,
            action="APPROVED",
            actor="HUMAN_OPERATOR",
            actor_role="HUMAN_OPERATOR",
            reason=request.comment
        )
        
        # Trigger execution
        from agents.execution.agent import execute_strategy
        
        decision_output = dec.get("decision_output", {})
        execution_result = execute_strategy(decision_output, approved=True)
        
        # Store execution result in DB
        db_manager.update_execution_result(request.decision_id, execution_result)
        
        # Log execution
        db_manager.log_audit_action(
            decision_id=request.decision_id,
            action="EXECUTED",
            actor="SYSTEM",
            actor_role="SYSTEM",
            details=execution_result
        )
        
        # Emit event
        await manager.broadcast({
            "type": "decision_approved",
            "decision_id": request.decision_id,
            "deployment_id": execution_result.get("deployment_id"),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        
        # Log event
        db_manager.log_event("decision_approved", decision_id=request.decision_id,
                           event_data=execution_result)
        
        return {
            "status": "approved",
            "decision_id": request.decision_id,
            "deployment_id": execution_result.get("deployment_id"),
            "execution_status": execution_result.get("execution_status"),
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@app.post("/reject")
async def reject_decision(decision_id: str, reason: str = ""):
    """Reject a decision"""
    
    try:
        # Fetch from DB
        dec = db_manager.get_decision(decision_id)
        
        if not dec:
            raise HTTPException(status_code=404, detail=f"Decision {decision_id} not found")
        
        # Update status in DB
        db_manager.update_decision_status(
            decision_id,
            "REJECTED",
            approved_by="HUMAN_OPERATOR",
            reason=reason
        )
        
        # Log rejection
        db_manager.log_audit_action(
            decision_id=decision_id,
            action="REJECTED",
            actor="HUMAN_OPERATOR",
            actor_role="HUMAN_OPERATOR",
            reason=reason
        )
        
        # Emit event
        await manager.broadcast({
            "type": "decision_rejected",
            "decision_id": decision_id,
            "reason": reason,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        
        # Log event
        db_manager.log_event("decision_rejected", decision_id=decision_id,
                           event_data={'reason': reason})
        
        return {
            "status": "rejected",
            "decision_id": decision_id,
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


# ─── WebSocket Endpoint ─────────────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket for real-time pipeline events.
    
    Client subscribes and receives:
    - pipeline_start
    - pipeline_complete
    - pipeline_error
    - decision_approved
    - decision_rejected
    """
    
    await manager.connect(websocket)
    
    try:
        while True:
            # Keep connection alive, receive any messages from client
            data = await websocket.receive_text()
            
            # Echo back with timestamp
            await websocket.send_json({
                "type": "echo",
                "message": data,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
    
    except Exception as e:
        await manager.disconnect(websocket)


# ─── CLI Entry ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("\n" + "="*70)
    print(" AROS API SERVER STARTING")
    print("="*70)
    print("\nServer: http://localhost:8000")
    print("API Docs: http://localhost:8000/docs")
    print("WebSocket: ws://localhost:8000/ws")
    print(f"Database: PostgreSQL on {db_config.host}:{db_config.port}/{db_config.dbname}")
    print("✓ Using persistent PostgreSQL storage (NOT in-memory)")
    print("\n" + "="*70 + "\n")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
