# AROS – Governance & Policy Engine (Upgraded for Agentic Flow)

from datetime import datetime, timezone
from typing import Dict, Any


# ─── BUSINESS RULES ─────────────────────────────────────────────
MAX_DISCOUNT_PCT = 30
FRAUD_SCORE_THRESHOLD = 0.65
HIGH_RISK_THRESHOLD = 0.75
MIN_MARGIN = 0.15


# ─── DECISION MAPPING (NEW) ─────────────────────────────────────
def map_to_execution_decision(policy_decision: str) -> str:
    mapping = {
        "AUTO": "EXECUTE",
        "NOTIFY": "INVESTIGATE",
        "ESCALATE": "INVESTIGATE"
    }
    return mapping.get(policy_decision, "INVESTIGATE")


# ─── NORMALIZE ACTION TYPES (NEW) ───────────────────────────────
def normalize_action(strategy: Dict[str, Any]) -> Dict[str, Any]:
    action = strategy.get("action_type", "").lower()

    mapping = {
        "apply_discount": "discount",
        "improve_checkout": "ui_change",
        "optimize_performance": "performance",
        "investigate_payments": "payment"
    }

    strategy["action_type"] = mapping.get(action, action)
    return strategy


# ─── MAIN POLICY VALIDATION ─────────────────────────────────────
def validate_strategy(strategy: dict, diagnosis: dict = None, raw_data: dict = None) -> dict:

    strategy = normalize_action(strategy)

    violations = []
    required_approvals = []
    blast_radius = "LOW"

    # ── Rule 1: Discount limit
    if strategy.get("action_type") == "discount":
        discount_pct = strategy.get("discount_pct", 0)
        if discount_pct > MAX_DISCOUNT_PCT:
            violations.append({
                "rule": "max_discount",
                "message": f"Discount {discount_pct}% exceeds {MAX_DISCOUNT_PCT}%",
                "severity": "CRITICAL"
            })
            required_approvals.append("DIRECTOR")

    # ── Rule 2: Fraud escalation
    if diagnosis and diagnosis.get("fraud_score", 0) > FRAUD_SCORE_THRESHOLD:
        violations.append({
            "rule": "fraud_threshold",
            "message": "High fraud score detected",
            "severity": "CRITICAL"
        })
        required_approvals.append("SECURITY_TEAM")
        blast_radius = "CRITICAL"

    # ── Rule 3: High risk strategy
    if strategy.get("risk_level", "LOW") == "HIGH":
        violations.append({
            "rule": "high_risk_strategy",
            "message": "High-risk strategy requires approval",
            "severity": "HIGH"
        })
        required_approvals.append("OPERATIONS_MANAGER")
        blast_radius = "HIGH"

    # ── Rule 4: Budget threshold
    if strategy.get("budget_required", 0) > 100000:
        required_approvals.append("CFO")
        blast_radius = "HIGH"

    # ── Rule 5: Confidence threshold
    if strategy.get("confidence", 0) < 0.6:
        violations.append({
            "rule": "low_confidence",
            "message": "Low confidence decision",
            "severity": "MEDIUM"
        })

    # ─────────────────────────────────────────────
    # DECISION LOGIC
    # ─────────────────────────────────────────────
    is_compliant = len(violations) == 0

    if violations:
        decision = "ESCALATE"
    elif blast_radius == "CRITICAL":
        decision = "ESCALATE"
    elif strategy.get("risk_level") == "LOW" and strategy.get("confidence", 0) > 0.8:
        decision = "AUTO"
    else:
        decision = "NOTIFY"

    # ─────────────────────────────────────────────
    # COMMUNICATION FLAGS (NEW)
    # ─────────────────────────────────────────────
    notify = decision in ["NOTIFY", "ESCALATE"]

    reasoning = f"{len(violations)} violations. Blast radius: {blast_radius}"

    return {
        "agent": "PolicyEngine",
        "is_compliant": is_compliant,
        "decision": decision,
        "execution_decision": map_to_execution_decision(decision),
        "violations": violations,
        "required_approvals": required_approvals,
        "blast_radius": blast_radius,
        "reasoning": reasoning,
        "notify": notify,
        "channels": ["slack", "email"] if notify else [],
        "log": {
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    }