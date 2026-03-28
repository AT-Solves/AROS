# AROS – Decision Agent (Policy Integrated)

import json
import sys
from typing import Dict, Any
from governance.policy_engine import validate_strategy


def make_decision(data: Dict[str, Any]) -> Dict[str, Any]:

    simulation = data.get("recommended_action", {})
    diagnosis = data.get("diagnosis", {})

    strategy_input = {
        "action_type": simulation.get("action_type"),
        "confidence": simulation.get("confidence", 0.5),
        "risk_level": simulation.get("risk_level", "medium"),
        "budget_required": 0,
        "discount_pct": simulation.get("discount_pct", 0)
    }

    policy_result = validate_strategy(strategy_input, diagnosis)

    result = {
        "agent": "DecisionAgent",

        "decision": policy_result["execution_decision"],   # EXECUTE / INVESTIGATE
        "policy_decision": policy_result["decision"],

        "selected_action": simulation.get("action_type"),
        "confidence": simulation.get("confidence"),
        "risk_level": simulation.get("risk_level"),

        "violations": policy_result.get("violations"),
        "requires_human_approval": policy_result.get("required_approvals"),

        "notify": policy_result.get("notify"),
        "channels": policy_result.get("channels"),

        "reason": policy_result.get("reasoning"),

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