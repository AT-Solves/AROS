# AROS – Execution Agent (Unified: Old + New + Policy + Communication)

import json
import os
import sys
from typing import Dict, Any, List
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
# ACTION DESCRIPTIONS
# ─────────────────────────────────────────────
ACTION_META = {
    "investigate_payments": {
        "label": "Investigate Payment Gateway",
        "endpoint": "/api/payments/health",
        "method": "GET",
        "description": "Run a health check and diagnostic sweep on the payment gateway to identify failures or latency spikes.",
        "impact": "Identifies root cause of payment failures; low blast radius.",
    },
    "optimize_performance": {
        "label": "Optimize System Performance",
        "endpoint": "/api/system/scale",
        "method": "POST",
        "description": "Scale up infrastructure resources and apply performance tuning configurations.",
        "impact": "Reduces latency and improves throughput; medium blast radius.",
    },
    "scale_infrastructure": {
        "label": "Scale Infrastructure",
        "endpoint": "/api/system/scale",
        "method": "POST",
        "description": "Provision additional compute capacity to absorb demand spikes.",
        "impact": "Improves stability under load; medium blast radius.",
    },
    "improve_checkout": {
        "label": "Improve Checkout Flow",
        "endpoint": "/api/checkout/optimize",
        "method": "POST",
        "description": "Apply UX and flow optimizations to the checkout pipeline to reduce drop-off.",
        "impact": "Lifts conversion rate; low risk, self-contained change.",
    },
    "apply_discount": {
        "label": "Apply Discount",
        "endpoint": "/api/pricing/discount",
        "method": "POST",
        "description": "Issue a time-limited discount to incentivize purchases and recover revenue.",
        "impact": "Boosts conversion; margin impact must be approved.",
    },
    "fraud_mitigation": {
        "label": "Fraud Mitigation",
        "endpoint": "/api/fraud/mitigate",
        "method": "POST",
        "description": "Activate fraud scoring rules and flag suspicious transactions for manual review.",
        "impact": "Reduces fraud exposure; may cause false-positive friction.",
    },
    "investigate_issue": {
        "label": "Investigate General Issue",
        "endpoint": "/api/ops/investigate",
        "method": "GET",
        "description": "Trigger a broad diagnostic sweep across affected services.",
        "impact": "Low risk investigative action; no direct system change.",
    },
}


# ─────────────────────────────────────────────
# OLD + NEW ACTION MAPPING (MERGED)
# ─────────────────────────────────────────────
def map_action(action: str) -> Dict[str, Any]:

    normalized = (action or "").strip().lower()

    meta = ACTION_META.get(normalized)
    if meta:
        return {"type": normalized, "endpoint": meta["endpoint"], "method": meta["method"]}

    if "discount" in normalized:
        return {"type": "apply_discount", "endpoint": "/api/pricing/discount", "method": "POST"}
    if "performance" in normalized or "latency" in normalized or "scale" in normalized:
        return {"type": "optimize_performance", "endpoint": "/api/system/scale", "method": "POST"}
    if "payment" in normalized or "fraud" in normalized:
        return {"type": "investigate_payments", "endpoint": "/api/payments/health", "method": "GET"}
    if "checkout" in normalized:
        return {"type": "improve_checkout", "endpoint": "/api/checkout/optimize", "method": "POST"}

    return {"type": "noop", "endpoint": None, "method": None}


# ─────────────────────────────────────────────
# PROBLEM CONTEXT EXTRACTION
# ─────────────────────────────────────────────
def extract_problem_context(data: Dict[str, Any]) -> Dict[str, Any]:
    diagnosed_causes = (
        data.get("diagnosed_causes")
        or (data.get("diagnosis") or {}).get("root_causes")
        or []
    )
    signals = data.get("signals") or []
    return {
        "primary_cause": data.get("primary_cause") or (diagnosed_causes[0].get("cause") if diagnosed_causes else "Unknown"),
        "diagnosed_causes": [
            {
                "cause": c.get("cause") or c.get("name", ""),
                "signal_type": c.get("signal_type", ""),
                "severity": c.get("severity", ""),
                "confidence": c.get("confidence", 0),
            }
            for c in (diagnosed_causes or [])
        ],
        "signal_count": data.get("signal_count") or len(signals),
        "fraud_score": round(float(data.get("fraud_score") or 0), 3),
        "severity": data.get("severity", "unknown"),
    }


# ─────────────────────────────────────────────
# EXECUTION OPTIONS (all strategies)
# ─────────────────────────────────────────────
def build_execution_options(strategies: List[Dict], selected_action: str) -> List[Dict]:
    options = []
    seen = set()
    for s in (strategies or []):
        action = s.get("action_type", "")
        if not action or action in seen:
            continue
        seen.add(action)
        meta = ACTION_META.get(action, {})
        mapped = map_action(action)
        options.append({
            "action_type": action,
            "label": meta.get("label", action.replace("_", " ").title()),
            "endpoint": mapped.get("endpoint", "—"),
            "method": mapped.get("method", "—"),
            "description": meta.get("description", ""),
            "impact": meta.get("impact", ""),
            "covers": s.get("covers", []),
            "confidence": s.get("confidence", 0),
            "risk_level": s.get("risk_level", "medium"),
            "is_selected": action == selected_action,
        })
    if selected_action and selected_action not in seen:
        meta = ACTION_META.get(selected_action, {})
        mapped = map_action(selected_action)
        options.append({
            "action_type": selected_action,
            "label": meta.get("label", selected_action.replace("_", " ").title()),
            "endpoint": mapped.get("endpoint", "—"),
            "method": mapped.get("method", "—"),
            "description": meta.get("description", ""),
            "impact": meta.get("impact", ""),
            "covers": [],
            "confidence": 0,
            "risk_level": "medium",
            "is_selected": True,
        })
    return options


def build_issue_trace(problem_context: Dict[str, Any], strategies: List[Dict], simulations: List[Dict], selected_action: str) -> Dict[str, Any]:
    """Trace each diagnosed issue through strategy, simulation, and final decision selection."""
    strategy_actions = [s.get("action_type") for s in (strategies or []) if s.get("action_type")]
    simulation_actions = {s.get("action_type") for s in (simulations or []) if s.get("action_type")}
    rows = []

    causes = problem_context.get("diagnosed_causes") or []
    for c in causes:
        cause_name = c.get("cause", "")
        severity = str(c.get("severity", "")).lower()
        requires_simulation = severity in ("high", "critical")

        mapped_strategy = []
        for s in (strategies or []):
            action = s.get("action_type")
            covered = s.get("covers") or []
            if action and cause_name and cause_name in covered:
                mapped_strategy.append(action)

        strategy_status = "COVERED" if mapped_strategy else "UNMAPPED"
        simulated_actions = [a for a in mapped_strategy if a in simulation_actions]
        if not requires_simulation and mapped_strategy:
            simulation_status = "NOT_REQUIRED"
        else:
            simulation_status = "SIMULATED" if simulated_actions else ("MISSING" if mapped_strategy else "N/A")

        decision_status = "SELECTED" if selected_action and selected_action in mapped_strategy else ("NOT_SELECTED" if mapped_strategy else "N/A")

        rows.append({
            "issue": cause_name,
            "severity": str(c.get("severity", "")).upper() or "UNKNOWN",
            "strategy_actions": mapped_strategy,
            "strategy_status": strategy_status,
            "requires_simulation": requires_simulation,
            "simulation_actions": simulated_actions,
            "simulation_status": simulation_status,
            "decision_action": selected_action or "",
            "decision_status": decision_status,
        })

    with_strategy = sum(1 for r in rows if r["strategy_status"] == "COVERED")
    with_simulation = sum(1 for r in rows if r["simulation_status"] in ("SIMULATED", "NOT_REQUIRED"))
    selected_count = sum(1 for r in rows if r["decision_status"] == "SELECTED")

    return {
        "issue_trace": rows,
        "coverage_summary": {
            "issues_total": len(rows),
            "issues_with_strategy": with_strategy,
            "issues_with_simulation": with_simulation,
            "issues_selected_by_decision": selected_count,
            "strategy_actions_total": len(strategy_actions),
            "simulation_actions_total": len(simulation_actions),
        },
    }


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
    selected_action = data.get("selected_action", "")
    action_config = map_action(selected_action)
    strategies = data.get("strategies") or []
    simulations = data.get("simulations") or []
    problem_context = extract_problem_context(data)
    trace = build_issue_trace(problem_context, strategies, simulations, selected_action)

    result = {
        "agent": "ExecutionAgent",
        "deployment_id": deployment_id,
        "action": action_config,
        "executed": False,
        "mode": "dry_run",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "monitoring": {"status": "pending", "check_after_minutes": 30},

        "problem_context": problem_context,
        "decision_taken": {
            "decision": data.get("decision", "INVESTIGATE"),
            "policy_decision": data.get("policy_decision", "NOTIFY"),
            "selected_action": selected_action,
            "confidence": data.get("confidence"),
            "blast_radius": data.get("blast_radius", "LOW"),
            "violations": data.get("violations") or [],
            "reason": data.get("reason", ""),
        },
        "execution_options": build_execution_options(strategies, selected_action),
        "issue_trace": trace["issue_trace"],
        "coverage_summary": trace["coverage_summary"],
    }

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