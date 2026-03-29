# AROS – Governance & Policy Engine (Upgraded for Agentic Flow)

from datetime import datetime, timezone
from typing import Dict, Any, List


# ─── BUSINESS RULES ─────────────────────────────────────────────
MAX_DISCOUNT_PCT = 30
FRAUD_SCORE_THRESHOLD = 0.65
HIGH_RISK_THRESHOLD = 0.75
MIN_MARGIN = 0.15

PAYMENT_FAILURE_THRESHOLD = 10.0
LATENCY_MS_THRESHOLD = 1000.0
CART_ABANDONMENT_THRESHOLD = 40.0


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


def _as_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except Exception:
        return default


def _derive_signal_violations(raw_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    violations = []
    if not raw_data:
        return violations

    signals = raw_data.get("signals") or []
    for signal in signals:
        metric = signal.get("metric")
        current = _as_float(signal.get("current_value"), 0)

        if metric == "payment_failure_rate" and current > PAYMENT_FAILURE_THRESHOLD:
            violations.append({
                "rule": "payment_failure_threshold",
                "message": f"Payment failure rate {current:.2f}% exceeds {PAYMENT_FAILURE_THRESHOLD:.2f}% threshold",
                "severity": "CRITICAL",
                "metric": metric,
                "current_value": current,
                "threshold": PAYMENT_FAILURE_THRESHOLD,
            })

        if metric == "latency_ms" and current > LATENCY_MS_THRESHOLD:
            violations.append({
                "rule": "latency_threshold",
                "message": f"Latency {current:.2f}ms exceeds {LATENCY_MS_THRESHOLD:.2f}ms threshold",
                "severity": "HIGH",
                "metric": metric,
                "current_value": current,
                "threshold": LATENCY_MS_THRESHOLD,
            })

        if metric in ("cart_abandonment_rate", "abandonment_rate") and current > CART_ABANDONMENT_THRESHOLD:
            violations.append({
                "rule": "cart_abandonment_threshold",
                "message": f"Cart abandonment {current:.2f}% exceeds {CART_ABANDONMENT_THRESHOLD:.2f}% threshold",
                "severity": "HIGH",
                "metric": metric,
                "current_value": current,
                "threshold": CART_ABANDONMENT_THRESHOLD,
            })

    return violations


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
    fraud_score = _as_float((diagnosis or {}).get("fraud_score"), 0)
    if fraud_score > FRAUD_SCORE_THRESHOLD:
        violations.append({
            "rule": "fraud_threshold",
            "message": f"Fraud score {fraud_score:.2f} exceeds {FRAUD_SCORE_THRESHOLD:.2f}",
            "severity": "CRITICAL",
            "metric": "fraud_score",
            "current_value": fraud_score,
            "threshold": FRAUD_SCORE_THRESHOLD,
        })
        required_approvals.append("SECURITY_TEAM")
        blast_radius = "CRITICAL"

    # ── Rule 2b: Signal-level violations from real observed metrics
    for v in _derive_signal_violations(raw_data or {}):
        violations.append(v)
        if v.get("severity") == "CRITICAL":
            required_approvals.append("SECURITY_TEAM")
            blast_radius = "CRITICAL"
        elif blast_radius == "LOW":
            blast_radius = "HIGH"

    # ── Rule 3: High risk strategy
    if str(strategy.get("risk_level", "LOW")).upper() == "HIGH":
        violations.append({
            "rule": "high_risk_strategy",
            "message": f"Selected action '{strategy.get('action_type', 'unknown')}' is marked HIGH risk",
            "severity": "HIGH",
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
            "message": f"Confidence {strategy.get('confidence', 0):.2f} is below 0.60 minimum",
            "severity": "MEDIUM",
        })

    # De-duplicate approvals and repeated violations by rule+message.
    required_approvals = sorted(set(required_approvals))
    unique_violations = []
    seen = set()
    for v in violations:
        key = (v.get("rule"), v.get("message"))
        if key in seen:
            continue
        seen.add(key)
        unique_violations.append(v)
    violations = unique_violations

    # ─────────────────────────────────────────────
    # DECISION LOGIC
    # ─────────────────────────────────────────────
    is_compliant = len(violations) == 0

    if violations:
        decision = "ESCALATE"
    elif blast_radius == "CRITICAL":
        decision = "ESCALATE"
    elif str(strategy.get("risk_level", "")).lower() == "low" and strategy.get("confidence", 0) >= 0.8:
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