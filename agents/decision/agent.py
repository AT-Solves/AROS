"""
AROS – Decision Agent
Applies governance policies and determines AUTO / NOTIFY / ESCALATE decision.
"""

import json
import sys
from datetime import datetime, timezone
from governance.policy_engine import validate_strategy


def make_decision(
    simulation_output: dict,
    strategy_output: dict = None,
    diagnosis_output: dict = None,
    signal_output: dict = None
) -> dict:
    """
    Apply governance policies and determine decision (AUTO / NOTIFY / ESCALATE).
    
    Args:
        simulation_output: Output from SimulationAgent (simulated metrics)
        strategy_output: Output from StrategyAgent
        diagnosis_output: Output from DiagnosisAgent
        signal_output: Output from SignalDetectionAgent
    
    Returns:
        {
            "agent": "DecisionAgent",
            "decision": "AUTO" | "NOTIFY" | "ESCALATE",
            "decision_id": str,
            "strategy_id": str,
            "justification": str,
            "governance_check": dict,
            "expected_impact": dict,
            "required_approvals": [list of roles],
            "ttl_seconds": int (time before auto-escalate if not approved),
            "next_agent": "ExecutionAgent" if decision=="AUTO" else "HumanReview",
            "log": dict
        }
    """
    
    primary_strategy = strategy_output.get("primary_strategy", {}) if strategy_output else {}
    simulated_metrics = simulation_output.get("simulated_metrics", {})
    diagnosed_causes = diagnosis_output.get("diagnosed_causes", []) if diagnosis_output else []
    fraud_score = diagnosis_output.get("fraud_score", 0.0) if diagnosis_output else 0.0
    signal_severity = signal_output.get("severity", "LOW") if signal_output else "LOW"
    
    # ── Generate decision ID ─────────────────────────────────────────────────
    import time
    decision_id = f"DEC_{int(time.time())}_{hash(json.dumps(primary_strategy)) % 10000}"
    
    # ── Run governance validation ────────────────────────────────────────────
    governance_check = validate_strategy(
        strategy=primary_strategy,
        diagnosis={"fraud_score": fraud_score},
        raw_data={}
    )
    
    # ── Extract validation results ─────────────────────────────────────────
    governance_decision = governance_check.get("decision", "NOTIFY")
    is_compliant = governance_check.get("is_compliant", False)
    violations = governance_check.get("violations", [])
    required_approvals = governance_check.get("required_approvals", [])
    blast_radius = governance_check.get("blast_radius", "LOW")
    
    # ── Compute expected impact ──────────────────────────────────────────────
    revenue_baseline = simulated_metrics.get("revenue", {}).get("baseline", 0)
    revenue_median = simulated_metrics.get("revenue", {}).get("median", 0)
    revenue_uplift = revenue_median - revenue_baseline
    confidence = simulation_output.get("confidence", 0.5)
    budget = primary_strategy.get("budget_required", 0)
    
    # ROI calculation
    roi = (revenue_uplift - budget) / max(budget, 1) if budget > 0 else (revenue_uplift / revenue_baseline if revenue_baseline > 0 else 0)
    
    expected_impact = {
        "metric": "revenue",
        "baseline": revenue_baseline,
        "projected_median": revenue_median,
        "uplift_amount": revenue_uplift,
        "uplift_pct": round((revenue_uplift / revenue_baseline * 100) if revenue_baseline > 0 else 0, 1),
        "budget_required": budget,
        "roi": round(roi, 2),
        "confidence": confidence,
    }
    
    # ── Decision logic ───────────────────────────────────────────────────────
    # 1. If governance says ESCALATE → ESCALATE
    # 2. If signal HIGH + > $100K budget → NOTIFY (review required)
    # 3. If LOW risk + high confidence + < $50K → AUTO
    # 4. Otherwise → NOTIFY
    
    if governance_decision == "ESCALATE":
        decision = "ESCALATE"
        ttl_seconds = 3600  # 1 hour for ESCALATE
    elif signal_severity == "HIGH" and budget > 100000:
        decision = "NOTIFY"
        ttl_seconds = 1800  # 30 min for NOTIFY
    elif governance_decision == "AUTO" and confidence > 0.80 and budget <= 50000:
        decision = "AUTO"
        ttl_seconds = 300  # 5 min before auto-execute
    else:
        decision = "NOTIFY"
        ttl_seconds = 1800  # 30 min for NOTIFY
    
    # ── Build justification ──────────────────────────────────────────────────
    justification_parts = [
        f"Governance check: {governance_check['reasoning']}",
        f"Expected impact: ${revenue_uplift:+,.0f} ({expected_impact['uplift_pct']:+.1f}%) with {confidence:.0%} confidence.",
        f"Budget: ${budget:,.0f}.",
    ]
    
    if violations:
        justification_parts.append(f"Policy violations: {len(violations)}.")
    
    if blast_radius == "HIGH" or blast_radius == "CRITICAL":
        justification_parts.append(f"⚠️  High blast radius ({blast_radius}). Requires human review.")
    
    justification = " ".join(justification_parts)
    
    # ── Determine next agent ─────────────────────────────────────────────────
    next_agent = "ExecutionAgent" if decision == "AUTO" else "HumanReview"
    
    return {
        "agent": "DecisionAgent",
        "decision": decision,
        "decision_id": decision_id,
        "strategy_id": primary_strategy.get("strategy_id", "UNKNOWN"),
        "action_type": primary_strategy.get("action_type", ""),
        "justification": justification,
        "governance_check": {
            "is_compliant": is_compliant,
            "violations_count": len(violations),
            "violations": violations,
            "required_approvals": required_approvals,
            "blast_radius": blast_radius,
        },
        "expected_impact": expected_impact,
        "confidence": confidence,
        "blast_radius": blast_radius,
        "signal_severity": signal_severity,
        "ttl_seconds": ttl_seconds,
        "next_agent": next_agent,
        "log": {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "decision_id": decision_id,
            "decision_type": decision,
            "governance_violations": len(violations),
        }
    }


# ─── CLI entry point ────────────────────────────────────────────────────────
if __name__ == "__main__":
    if len(sys.argv) > 1:
        with open(sys.argv[1], "r") as f:
            raw = f.read()
    else:
        raw = sys.stdin.read()
    
    input_data = json.loads(raw)
    result = make_decision(input_data)
    print(json.dumps(result, indent=2))
