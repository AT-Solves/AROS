# AROS – Reflection Agent (Learning + Feedback Loop)

import json
import sys
from typing import Dict, Any, List
from datetime import datetime


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except Exception:
        return default


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except Exception:
        return default


def build_inputs_considered(data: Dict[str, Any]) -> Dict[str, Any]:
    issue_trace = data.get("issue_trace") or []
    coverage = data.get("coverage_summary") or {}
    diagnosed_causes = data.get("diagnosed_causes") or []
    strategies = data.get("strategies") or []
    simulations = data.get("simulations") or []

    return {
        "signal_count": _safe_int(data.get("signal_count"), 0),
        "causes_count": len(diagnosed_causes),
        "strategies_count": len(strategies),
        "simulations_count": len(simulations),
        "issues_total": _safe_int(coverage.get("issues_total"), len(issue_trace)),
        "issues_with_strategy": _safe_int(coverage.get("issues_with_strategy"), 0),
        "issues_with_simulation": _safe_int(coverage.get("issues_with_simulation"), 0),
        "issues_selected_by_decision": _safe_int(coverage.get("issues_selected_by_decision"), 0),
        "selected_action": data.get("selected_action") or (data.get("decision_taken") or {}).get("selected_action"),
        "decision": data.get("decision") or (data.get("decision_taken") or {}).get("decision"),
        "policy_decision": data.get("policy_decision") or (data.get("decision_taken") or {}).get("policy_decision"),
        "execution_mode": data.get("mode", "dry_run"),
    }


def evaluate_reflection(data: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
    score = 100
    issues_total = inputs.get("issues_total", 0)
    with_strategy = inputs.get("issues_with_strategy", 0)
    with_sim = inputs.get("issues_with_simulation", 0)
    selected_by_decision = inputs.get("issues_selected_by_decision", 0)

    if issues_total > 0 and with_strategy < issues_total:
        score -= 25
    if issues_total > 0 and with_sim < issues_total:
        score -= 20
    if issues_total > 0 and selected_by_decision == 0:
        score -= 20

    violations = (data.get("violations") or (data.get("decision_taken") or {}).get("violations") or [])
    if len(violations) > 0:
        score -= 15

    decision = str(inputs.get("decision") or "INVESTIGATE").upper()
    mode = str(inputs.get("execution_mode") or "dry_run").lower()
    if decision == "EXECUTE" and mode != "auto":
        score -= 10

    if score >= 85:
        status = "strong"
    elif score >= 65:
        status = "moderate"
    else:
        status = "needs_improvement"

    return {
        "status": status,
        "score": max(0, min(100, score)),
        "coverage_ok": issues_total == 0 or (with_strategy == issues_total and with_sim == issues_total),
        "decision_alignment_ok": issues_total == 0 or selected_by_decision > 0,
        "execution_readiness": "ready" if decision == "EXECUTE" and mode == "auto" else "gated",
    }


def build_issue_feedback(data: Dict[str, Any]) -> List[Dict[str, Any]]:
    rows = data.get("issue_trace") or []
    out = []
    for row in rows:
        strategy_status = row.get("strategy_status", "UNMAPPED")
        simulation_status = row.get("simulation_status", "N/A")
        decision_status = row.get("decision_status", "N/A")

        actions = []
        if strategy_status != "COVERED":
            actions.append("Add strategy mapping for this issue.")
        if simulation_status not in ("SIMULATED", "NOT_REQUIRED"):
            actions.append("Add simulation scenario for mapped strategy.")
        if decision_status != "SELECTED" and strategy_status == "COVERED":
            actions.append("Review decision ranking or confidence weighting.")
        if not actions:
            actions.append("No action needed. Issue is fully traced.")

        out.append({
            "issue": row.get("issue", "Unknown"),
            "severity": row.get("severity", "UNKNOWN"),
            "strategy_status": strategy_status,
            "simulation_status": simulation_status,
            "decision_status": decision_status,
            "recommended_actions": actions,
        })
    return out


def generate_learning(evaluation: Dict[str, Any], inputs: Dict[str, Any], issue_feedback: List[Dict[str, Any]]) -> Dict[str, Any]:
    actions = []
    if not evaluation.get("coverage_ok"):
        actions.append("Ensure all issues are mapped to strategies and simulations before final decision.")
    if not evaluation.get("decision_alignment_ok"):
        actions.append("Tune decision policy to prioritize issue-linked actions.")
    if evaluation.get("execution_readiness") != "ready":
        actions.append("Collect required approvals and confidence threshold before auto execution.")
    if not actions:
        actions.append("Pipeline alignment is healthy. Continue monitoring post-execution KPIs.")

    return {
        "summary": f"Reflection status is {evaluation.get('status')} with score {evaluation.get('score')}.",
        "actions": actions,
        "issues_reviewed": len(issue_feedback),
        "selected_action": inputs.get("selected_action"),
    }


def reflect(data: Dict[str, Any]) -> Dict[str, Any]:
    inputs = build_inputs_considered(data)
    evaluation = evaluate_reflection(data, inputs)
    issue_feedback = build_issue_feedback(data)
    learning = generate_learning(evaluation, inputs, issue_feedback)

    result = {
        "agent": "ReflectionAgent",
        "inputs_considered": inputs,
        "evaluation": evaluation,
        "issue_feedback": issue_feedback,
        "learning": learning,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "log": {
            "status": "completed",
            "issues_reviewed": len(issue_feedback),
            "score": evaluation.get("score"),
        },
    }

    print("\n=== REFLECTION OUTPUT ===\n")
    print(json.dumps(result, indent=2))

    return result


# ─────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────
if __name__ == "__main__":
    raw = sys.stdin.read() or "{}"
    data = json.loads(raw)
    output = reflect(data)
    print(json.dumps(output, indent=2))