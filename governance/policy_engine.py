"""
AROS – Governance & Policy Engine
Enforces strict business rules before executing any strategy or decision.
"""

from datetime import datetime, timezone
from typing import Literal


# ─── STRICT BUSINESS RULES ──────────────────────────────────────────────────
MAX_DISCOUNT_PCT = 30           # Rule: No discount > 30%
FRAUD_SCORE_THRESHOLD = 0.65    # Rule: Fraud score > 0.65 must escalate
HIGH_RISK_THRESHOLD = 0.75      # Rule: High-risk strategies require approval
MIN_MARGIN = 0.15               # Rule: Never go below 15% margin on pricing


def validate_strategy(strategy: dict, diagnosis: dict = None, raw_data: dict = None) -> dict:
    """
    Validate a proposed strategy against all AROS governance policies.
    
    Args:
        strategy: Strategy dict from StrategyAgent (contains action, uplift %, budget, risk_level)
        diagnosis: Diagnosis output (contains root causes, fraud info)
        raw_data: Raw KPI/payment data for context
    
    Returns:
        {
            "is_compliant": bool,
            "violations": [list of rule violations],
            "decision": "AUTO" | "NOTIFY" | "ESCALATE",
            "required_approvals": [list of who needs to approve],
            "reasoning": str,
            "log": dict
        }
    """
    violations = []
    required_approvals = []
    blast_radius = "LOW"
    
    # ── Rule 1: Discount cannot exceed 30% ──────────────────────────────────
    if strategy.get("action_type") == "discount":
        discount_pct = strategy.get("discount_pct", 0)
        if discount_pct > MAX_DISCOUNT_PCT:
            violations.append({
                "rule": "max_discount",
                "message": f"Discount {discount_pct}% exceeds max {MAX_DISCOUNT_PCT}%",
                "severity": "CRITICAL"
            })
            required_approvals.append("DIRECTOR")
    
    # ── Rule 2: Fraud Score > 0.65 must trigger escalation ──────────────────
    if diagnosis and diagnosis.get("fraud_score", 0) > FRAUD_SCORE_THRESHOLD:
        violations.append({
            "rule": "fraud_threshold",
            "message": f"Fraud score {diagnosis['fraud_score']:.2f} exceeds {FRAUD_SCORE_THRESHOLD}",
            "severity": "CRITICAL"
        })
        required_approvals.append("SECURITY_TEAM")
        blast_radius = "CRITICAL"
    
    # ── Rule 3: High-risk strategies require human approval ──────────────────
    strategy_risk = strategy.get("risk_level", "LOW")
    if strategy_risk == "HIGH":
        violations.append({
            "rule": "high_risk_strategy",
            "message": f"Strategy has HIGH risk level; requires human review",
            "severity": "HIGH"
        })
        required_approvals.append("OPERATIONS_MANAGER")
        blast_radius = "HIGH"
    
    # ── Rule 4: Pricing decisions need cost validation ──────────────────────
    if strategy.get("action_type") == "price_adjustment":
        new_price = strategy.get("new_price", 0)
        cost_price = strategy.get("cost_price", 0)
        if cost_price > 0 and new_price < cost_price:
            violations.append({
                "rule": "price_below_cost",
                "message": f"New price ${new_price} below cost ${cost_price}",
                "severity": "CRITICAL"
            })
            required_approvals.append("FINANCE_MANAGER")
    
    # ── Rule 5: High budget changes need approval ──────────────────────────
    budget = strategy.get("budget_required", 0)
    if budget > 100000:  # > $100K requires approval
        required_approvals.append("CFO")
        blast_radius = "HIGH"
    
    # ── Rule 6: UI changes must have simulation completed ───────────────────
    if strategy.get("action_type") == "ui_change":
        if not strategy.get("simulation_completed", False):
            violations.append({
                "rule": "ui_no_simulation",
                "message": "UI changes must have simulation completed before approval",
                "severity": "HIGH"
            })
            required_approvals.append("PRODUCT_MANAGER")
    
    # ─────────────────────────────────────────────────────────────────────────
    # Determine decision outcome
    # ─────────────────────────────────────────────────────────────────────────
    
    is_compliant = len(violations) == 0
    
    # Decision logic:
    # - All violations → ESCALATE (humans must review)
    # - Low risk + high confidence → AUTO
    # - Otherwise → NOTIFY (review but can auto-execute if approved)
    
    if violations:
        decision = "ESCALATE"
    elif blast_radius == "CRITICAL":
        decision = "ESCALATE"
    elif strategy.get("risk_level") == "LOW" and strategy.get("confidence", 0) > 0.80:
        decision = "AUTO"
    else:
        decision = "NOTIFY"
    
    # ─────────────────────────────────────────────────────────────────────────
    # Build reasoning
    # ─────────────────────────────────────────────────────────────────────────
    
    reasoning_parts = []
    if is_compliant:
        reasoning_parts.append("All governance policies passed.")
    else:
        reasoning_parts.append(f"{len(violations)} policy violation(s) detected.")
    
    reasoning_parts.append(f"Blast radius: {blast_radius}.")
    
    if required_approvals:
        reasoning_parts.append(f"Requires approval from: {', '.join(required_approvals)}.")
    
    reasoning = " ".join(reasoning_parts)
    
    return {
        "agent": "GovernanceEngine",
        "is_compliant": is_compliant,
        "decision": decision,
        "violations": violations,
        "required_approvals": required_approvals,
        "blast_radius": blast_radius,
        "reasoning": reasoning,
        "log": {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "policy_checks": 6,
            "violations_count": len(violations),
        }
    }


def should_escalate(signal_severity: str, fraud_score: float = None) -> bool:
    """
    Quick check: should this anomaly be escalated to humans?
    """
    if signal_severity == "HIGH":
        return True
    if fraud_score and fraud_score > FRAUD_SCORE_THRESHOLD:
        return True
    return False


# ─── CLI entry point ────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys
    import json
    
    if len(sys.argv) > 1:
        with open(sys.argv[1], "r") as f:
            raw = f.read()
    else:
        raw = sys.stdin.read()
    
    input_data = json.loads(raw)
    result = validate_strategy(input_data)
    print(json.dumps(result, indent=2))
