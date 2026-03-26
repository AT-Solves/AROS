"""
AROS – Execution Agent
Deploys approved strategies to the production system.
"""

import json
import sys
import uuid
from datetime import datetime, timezone


def execute_strategy(decision_output: dict, approved: bool = False) -> dict:
    """
    Execute an approved strategy.
    
    Args:
        decision_output: Output from DecisionAgent
        approved: Whether strategy has been explicitly approved
    
    Returns:
        {
            "agent": "ExecutionAgent",
            "deployment_id": str,
            "execution_status": "SUCCESS" | "PENDING_APPROVAL" | "FAILED",
            "action_type": str,
            "details": dict,
            "deployed_at": str,
            "estimated_duration": str,
            "rollback_available": bool,
            "reasoning": str,
            "log": dict
        }
    """
    
    decision = decision_output.get("decision", "NOTIFY")
    strategy_id = decision_output.get("strategy_id", "UNKNOWN")
    action_type = decision_output.get("action_type", "")
    deployment_id = str(uuid.uuid4())[:8]
    
    # ── Execution logic ──────────────────────────────────────────────────────
    # AUTO → execute immediately
    # NOTIFY → pending human approval
    # ESCALATE → pending escalation review
    
    if decision == "AUTO":
        execution_status = "SUCCESS"
        reason = "AUTO-approved strategy executing now"
        estimated_duration = get_execution_duration(action_type)
    elif decision == "NOTIFY" and approved:
        execution_status = "SUCCESS"
        reason = "Human-approved strategy executing now"
        estimated_duration = get_execution_duration(action_type)
    else:
        execution_status = "PENDING_APPROVAL"
        reason = f"Awaiting {decision} review before execution"
        estimated_duration = None
    
    # ── Generate execution details based on action type ──────────────────────
    if action_type == "discount":
        details = {
            "type": "apply_discount_promotion",
            "discount_pct": 25,
            "duration_hours": 24,
            "target_segments": ["high_value_users", "recent_abandoners"],
            "channels": ["email", "web_banner", "mobile_app"],
            "budget_cap": 100000,
        }
    elif action_type == "infrastructure_optimization":
        details = {
            "type": "scale_infrastructure",
            "actions": [
                "Scale web servers +50%",
                "Optimize checkout query (cache strategy)",
                "Enable CDN for static assets"
            ],
            "estimated_latency_reduction_ms": 200,
        }
    elif action_type == "fraud_mitigation":
        details = {
            "type": "adjust_fraud_policies",
            "actions": [
                "Reduce false-positive fraud block rate by 20%",
                "Whitelist previously-blocked payment methods",
                "Increase allowance for repeat customers"
            ],
            "expected_payment_recovery_pct": 15,
        }
    elif action_type == "marketing_campaign":
        details = {
            "type": "launch_cart_recovery_campaign",
            "channels": ["email", "sms"],
            "offer": "15% off + free shipping",
            "target_segment": "abandoned_carts_24h",
            "campaign_duration_hours": 48,
            "estimated_reach": 50000,
        }
    elif action_type == "ui_change":
        details = {
            "type": "deploy_ui_changes",
            "changes": [
                "Reduce checkout form from 15 to 7 fields",
                "Enable Apple Pay / Google Pay",
                "Add progress indicator to checkout"
            ],
            "rollout_strategy": "gradual (10% → 50% → 100% over 3 hours)",
            "requires_monitored_rollout": True,
        }
    else:
        details = {"type": "unknown"}
    
    # ── Rollback availability ────────────────────────────────────────────────
    rollback_available = action_type in ["discount", "marketing_campaign", "ui_change"]
    
    # ── Build reasoning ──────────────────────────────────────────────────────
    reasoning = f"Strategy {strategy_id} ({action_type}). " \
                f"Decision: {decision}. " \
                f"Status: {execution_status}. " \
                f"{reason}."
    
    if execution_status == "SUCCESS":
        reasoning += f" Deployment ID: {deployment_id}. Monitor for 30 min."
    
    return {
        "agent": "ExecutionAgent",
        "deployment_id": deployment_id,
        "execution_status": execution_status,
        "strategy_id": strategy_id,
        "action_type": action_type,
        "details": details,
        "deployed_at": datetime.now(timezone.utc).isoformat() if execution_status == "SUCCESS" else None,
        "estimated_duration": estimated_duration,
        "rollback_available": rollback_available,
        "reasoning": reasoning,
        "log": {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "deployment_id": deployment_id,
            "execution_status": execution_status,
            "strategy_id": strategy_id,
        }
    }


def get_execution_duration(action_type: str) -> str:
    """Return estimated execution duration for action type"""
    durations = {
        "discount": "5 minutes",
        "infrastructure_optimization": "30 minutes",
        "fraud_mitigation": "10 minutes",
        "marketing_campaign": "2 hours",
        "ui_change": "3-6 hours (gradual rollout)",
    }
    return durations.get(action_type, "Unknown")


# ─── CLI entry point ────────────────────────────────────────────────────────
if __name__ == "__main__":
    if len(sys.argv) > 1:
        with open(sys.argv[1], "r") as f:
            raw = f.read()
    else:
        raw = sys.stdin.read()
    
    input_data = json.loads(raw)
    result = execute_strategy(input_data)
    print(json.dumps(result, indent=2))
