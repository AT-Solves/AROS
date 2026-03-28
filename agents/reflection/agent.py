# AROS – Reflection Agent (Learning + Feedback Loop)

import json
import sys
from typing import Dict, Any
from datetime import datetime


# ─────────────────────────────────────────────
# SAFE HELPERS
# ─────────────────────────────────────────────
def safe_get(d, path, default=0):
    try:
        for p in path:
            d = d[p]
        return d
    except:
        return default


# ─────────────────────────────────────────────
# CORE EVALUATION LOGIC
# ─────────────────────────────────────────────
def evaluate_outcome(data: Dict[str, Any]) -> Dict[str, Any]:

    simulation = data.get("recommended_action", {})
    execution = data.get("execution_result", {})
    kpi_before = data.get("kpi", {}).get("current", {})
    kpi_after = data.get("post_kpi", {})  # optional future extension

    expected_revenue = safe_get(simulation, ["expected_impact", "revenue_change_pct"], 0)

    # If no post KPI available → fallback
    if not kpi_after:
        return {
            "status": "insufficient_data",
            "learning": "No post-execution KPI available",
            "success": False
        }

    before = kpi_before.get("revenue", 0)
    after = kpi_after.get("revenue", 0)

    actual_change = 0
    if before > 0:
        actual_change = ((after - before) / before) * 100

    deviation = actual_change - expected_revenue

    success = actual_change > 0

    return {
        "expected_revenue_change_pct": expected_revenue,
        "actual_revenue_change_pct": round(actual_change, 2),
        "deviation": round(deviation, 2),
        "success": success
    }


# ─────────────────────────────────────────────
# LEARNING GENERATION
# ─────────────────────────────────────────────
def generate_learning(evaluation: Dict[str, Any]) -> Dict[str, Any]:

    if evaluation.get("status") == "insufficient_data":
        return {
            "lesson": "Need post-execution metrics to evaluate",
            "adjustment": "delay evaluation"
        }

    deviation = evaluation.get("deviation", 0)

    if abs(deviation) < 5:
        return {
            "lesson": "Model prediction accurate",
            "adjustment": "no_change"
        }

    if deviation > 0:
        return {
            "lesson": "Underestimated impact",
            "adjustment": "increase_confidence"
        }

    return {
        "lesson": "Overestimated impact",
        "adjustment": "reduce_confidence"
    }


# ─────────────────────────────────────────────
# MAIN REFLECTION FUNCTION
# ─────────────────────────────────────────────
def reflect(data: Dict[str, Any]) -> Dict[str, Any]:

    evaluation = evaluate_outcome(data)
    learning = generate_learning(evaluation)

    result = {
        "agent": "ReflectionAgent",
        "evaluation": evaluation,
        "learning": learning,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "log": {
            "status": "completed"
        }
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