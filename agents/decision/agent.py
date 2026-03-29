# AROS – Decision Agent (Policy Integrated)

import json
import sys
from datetime import datetime, timezone
from typing import Dict, Any, List
from governance.policy_engine import validate_strategy


def _get_fraud_score(data: Dict[str, Any]) -> float:
    """Read fraud_score from flat merged pipeline data or nested diagnosis dict."""
    return float(
        data.get("fraud_score")
        or (data.get("diagnosis") or {}).get("fraud_score", 0)
        or 0
    )


def _extract_strategies(data: Dict[str, Any]) -> List[Dict]:
    """Pull all strategy objects from merged pipeline data."""
    return data.get("strategies") or []


def _extract_simulations(data: Dict[str, Any]) -> List[Dict]:
    """Pull all simulation objects from merged pipeline data."""
    return data.get("simulations") or []


def make_decision(data: Dict[str, Any]) -> Dict[str, Any]:

    simulation = data.get("recommended_action") or {}
    fraud_score = _get_fraud_score(data)
    strategies = _extract_strategies(data)
    simulations = _extract_simulations(data)

    strategy_input = {
        "action_type": simulation.get("action_type"),
        "confidence": simulation.get("confidence", 0.5),
        "risk_level": simulation.get("risk_level", "medium"),
        "budget_required": 0,
        "discount_pct": simulation.get("discount_pct", 0)
    }

    diagnosis_ctx = {"fraud_score": fraud_score}
    policy_result = validate_strategy(strategy_input, diagnosis_ctx, data)

    strategies_evaluated = [s.get("action_type") for s in strategies if s.get("action_type")]
    simulations_evaluated = [s.get("action_type") for s in simulations if s.get("action_type")]

    result = {
        "agent": "DecisionAgent",

        "decision": policy_result["execution_decision"],   # EXECUTE / INVESTIGATE
        "policy_decision": policy_result["decision"],      # AUTO / NOTIFY / ESCALATE

        "selected_action": simulation.get("action_type"),
        "confidence": simulation.get("confidence"),
        "risk_level": simulation.get("risk_level"),
        "blast_radius": policy_result.get("blast_radius", "LOW"),

        "violations": policy_result.get("violations", []),
        "requires_human_approval": policy_result.get("required_approvals", []),

        "notify": policy_result.get("notify", False),
        "channels": policy_result.get("channels", []),

        "reason": policy_result.get("reasoning"),

        "strategies_evaluated": strategies_evaluated,
        "simulations_evaluated": simulations_evaluated,
        "coverage_mode": "all_simulations" if simulations_evaluated else "recommended_only",

        "log": {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "strategies_input": len(strategies_evaluated),
            "simulations_input": len(simulations_evaluated),
            "decision_type": policy_result["execution_decision"],
            "violations_count": len(policy_result.get("violations", [])),
            "fraud_score": round(fraud_score, 3),
        },

        "next_agent": "ExecutionAgent"
    }

    print("\n=== DECISION OUTPUT (POLICY GOVERNED) ===\n")
    print(json.dumps(result, indent=2))

    return result


if __name__ == "__main__":
    raw = sys.stdin.read() or "{}"
    data = json.loads(raw)
    output = make_decision(data)
    print(json.dumps(output, indent=2))