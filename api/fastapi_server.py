"""
AROS – FastAPI Server with WebSocket Support
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

# ─── In-Memory State (for demo; replace with DB/Redis in production) ───────
active_decisions: Dict[str, dict] = {}
execution_events = []
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
    """Run pipeline and emit WebSocket events for each step"""
    
    try:
        # Emit start event
        await manager.broadcast({
            "type": "pipeline_start",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "task_id": task_id
        })
        
        # Run pipeline
        result = run_pipeline(execute_approved_only=False)
        
        # Store decision if generated
        if "decision" in result:
            decision = result["decision"]
            decision_id = decision.get("decision_id", "")
            active_decisions[decision_id] = {
                "task_id": task_id,
                "decision": decision,
                "simulation": result.get("simulation", {}),
                "strategy": result.get("strategy", {}),
                "signal": result.get("signal_detection", {}),
                "diagnosis": result.get("diagnosis", {}),
            }
        
        # Emit completion event
        await manager.broadcast({
            "type": "pipeline_complete",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "task_id": task_id,
            "status": result.get("status", ""),
            "decision_id": result.get("decision", {}).get("decision_id", ""),
        })
        
        return result
    
    except Exception as e:
        await manager.broadcast({
            "type": "pipeline_error",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "task_id": task_id,
            "error": str(e)
        })
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
async def list_decisions():
    """List all pending decisions requiring human action"""
    
    pending = [
        {
            "decision_id": dec_id,
            "decision_type": dec.get("decision", {}).get("decision", ""),
            "strategy": dec.get("strategy", {}).get("primary_strategy", {}).get("action_type", ""),
            "expected_uplift_pct": dec.get("simulation", {}).get("expected_uplift_pct", 0),
            "blast_radius": dec.get("decision", {}).get("blast_radius", "LOW"),
        }
        for dec_id, dec in active_decisions.items()
    ]
    
    return {
        "count": len(pending),
        "decisions": pending
    }


@app.get("/decision/{decision_id}")
async def get_decision(decision_id: str):
    """Get full decision context (Signal → Diagnosis → Strategy → Simulation → Decision)"""
    
    if decision_id not in active_decisions:
        raise HTTPException(status_code=404, detail=f"Decision {decision_id} not found")
    
    dec = active_decisions[decision_id]
    
    return {
        "decision_id": decision_id,
        "signal": dec.get("signal", {}),
        "diagnosis": dec.get("diagnosis", {}),
        "strategy": dec.get("strategy", {}),
        "simulation": dec.get("simulation", {}),
        "decision": dec.get("decision", {}),
    }


@app.post("/approve")
async def approve_decision(request: ApprovalRequest):
    """Approve a decision and trigger execution"""
    
    if request.decision_id not in active_decisions:
        raise HTTPException(status_code=404, detail=f"Decision {request.decision_id} not found")
    
    dec = active_decisions[request.decision_id]
    
    # Trigger execution
    from agents.execution.agent import execute_strategy
    
    decision_output = dec.get("decision", {})
    execution_result = execute_strategy(decision_output, approved=True)
    
    # Emit event
    await manager.broadcast({
        "type": "decision_approved",
        "decision_id": request.decision_id,
        "deployment_id": execution_result.get("deployment_id"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    
    return {
        "status": "approved",
        "decision_id": request.decision_id,
        "deployment_id": execution_result.get("deployment_id"),
        "execution_status": execution_result.get("execution_status"),
    }


@app.post("/reject")
async def reject_decision(decision_id: str):
    """Reject a decision"""
    
    if decision_id not in active_decisions:
        raise HTTPException(status_code=404, detail=f"Decision {decision_id} not found")
    
    del active_decisions[decision_id]
    
    # Emit event
    await manager.broadcast({
        "type": "decision_rejected",
        "decision_id": decision_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    
    return {
        "status": "rejected",
        "decision_id": decision_id,
    }


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
    print("\n" + "="*70 + "\n")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
