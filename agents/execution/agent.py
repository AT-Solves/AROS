# AROS – Execution Agent (Unified: Old + New + Policy + Communication)

import json
import os
import sys
from typing import Dict, Any
from datetime import datetime
import uuid
from dotenv import load_dotenv

load_dotenv()


# ─────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────
CONFIG = {
    "max_actions_per_run": 1,
    "allow_auto_execution": os.getenv("ALLOW_AUTO_EXECUTION", "false").lower() == "true",
}


# ─────────────────────────────────────────────
# OLD + NEW ACTION MAPPING (MERGED)
# ─────────────────────────────────────────────
def map_action(action: str) -> Dict[str, Any]:

    normalized = (action or "").strip().lower()

    # 🔥 NEW ACTION TYPES (from strategy agent)
    if normalized == "apply_discount":
        return {
            "type": "apply_discount",
            "endpoint": "/api/pricing/discount",
            "method": "POST",
        }

    if normalized == "optimize_performance":
        return {
            "type": "scale_infrastructure",
            "endpoint": "/api/system/scale",
            "method": "POST",
        }

    if normalized == "investigate_payments":
        return {
            "type": "check_payment_gateway",
            "endpoint": "/api/payments/health",
            "method": "GET",
        }

    if normalized == "improve_checkout":
        return {
            "type": "optimize_checkout_flow",
            "endpoint": "/api/checkout/optimize",
            "method": "POST",
        }

    # 🔥 OLD LOGIC (fallback / compatibility)
    if "discount" in normalized:
        return {
            "type": "apply_discount",
            "endpoint": "/api/pricing/discount",
            "method": "POST",
        }

    if "performance" in normalized or "latency" in normalized:
        return {
            "type": "scale_infrastructure",
            "endpoint": "/api/system/scale",
            "method": "POST",
        }

    if "payment" in normalized:
        return {
            "type": "check_payment_gateway",
            "endpoint": "/api/payments/health",
            "method": "GET",
        }

    return {"type": "noop", "endpoint": None, "method": None}


# ─────────────────────────────────────────────
# VALIDATION (SAFE EXECUTION)
# ─────────────────────────────────────────────
def validate_execution(decision: Dict[str, Any]) -> bool:

    if decision.get("decision") != "EXECUTE":
        return False

    if decision.get("requires_human_approval"):
        return False

    try:
        confidence = float(decision.get("confidence", 0))
    except:
        confidence = 0

    if confidence < 0.6:
        return False

    action_config = map_action(decision.get("selected_action"))
    if action_config["type"] == "noop":
        return False

    return True


# ─────────────────────────────────────────────
# ACTION EXECUTION (SIMULATED)
# ─────────────────────────────────────────────
def execute_action(action_config: Dict[str, Any]) -> Dict[str, Any]:

    return {
        "status": "success",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "details": f"Executed {action_config.get('type')}",
        "endpoint": action_config.get("endpoint"),
        "method": action_config.get("method"),
    }


# ─────────────────────────────────────────────
# EMAIL GENERATION
# ─────────────────────────────────────────────
def generate_email(decision: Dict[str, Any]):

    action = decision.get("selected_action")

    templates = {
        "apply_discount": "We’re offering you an exclusive discount to enhance your experience!",
        "optimize_performance": "We’ve improved performance for faster browsing.",
        "investigate_payments": "We’re improving payment reliability for smoother transactions.",
        "improve_checkout": "We’ve simplified checkout to make your purchase easier.",
    }

    return {
        "subject": "Update from AROS 🚀",
        "body": templates.get(action, "We’re continuously improving your experience.")
    }


# ─────────────────────────────────────────────
# ALERTING
# ─────────────────────────────────────────────
def send_slack_alert(message: str):
    print("\n[SLACK ALERT]")
    print(message)


def send_email(email_content: Dict[str, Any]):
    print("\n[EMAIL SENT]")
    print(email_content)


# ─────────────────────────────────────────────
# ROLLBACK
# ─────────────────────────────────────────────
def rollback_action(deployment_id: str):
    return {
        "status": "rollback_available",
        "deployment_id": deployment_id
    }


# ─────────────────────────────────────────────
# MAIN EXECUTION
# ─────────────────────────────────────────────
def run_execution(data: Dict[str, Any]) -> Dict[str, Any]:

    deployment_id = str(uuid.uuid4())
    action_config = map_action(data.get("selected_action"))

    result = {
        "agent": "ExecutionAgent",
        "deployment_id": deployment_id,
        "action": action_config,
        "executed": False,
        "mode": "dry_run",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "monitoring": {"status": "pending", "check_after_minutes": 30},
    }

    # ─────────────────────────────
    # EXECUTION CONTROL
    # ─────────────────────────────
    if validate_execution(data) and CONFIG["allow_auto_execution"]:

        execution_result = execute_action(action_config)

        result.update({
            "executed": True,
            "mode": "auto",
            "execution_result": execution_result,
            "monitoring": {"status": "initiated", "check_after_minutes": 15},
        })

    else:
        result["reason"] = "blocked_by_guardrails_or_manual_mode"

    # ─────────────────────────────
    # COMMUNICATION LAYER
    # ─────────────────────────────
    if data.get("notify"):

        slack_message = f"""
🚨 AROS ALERT
Action: {data.get('selected_action')}
Decision: {data.get('policy_decision')}
Reason: {data.get('reason')}
Confidence: {data.get('confidence')}
"""

        send_slack_alert(slack_message)

        email = generate_email(data)
        send_email(email)

        result["notifications"] = {
            "slack": True,
            "email": email
        }

    # ─────────────────────────────
    # ROLLBACK SUPPORT
    # ─────────────────────────────
    result["rollback"] = rollback_action(deployment_id)

    return result


# ─────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────
if __name__ == "__main__":
    raw = sys.stdin.read() or "{}"
    payload = json.loads(raw)
    output = run_execution(payload)
    print(json.dumps(output, indent=2))