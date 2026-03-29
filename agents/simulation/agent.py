# AROS – Simulation Agent (Predictive + Risk-Aware)

import json
import sys
from typing import Dict, Any, List


# -------------------------------
# HEURISTIC IMPACT MODELS
# -------------------------------
def simulate_discount(kpi):
    return {
        "revenue_change_pct": 10,
        "conversion_change_pct": 8,
        "risk": "medium"
    }


def simulate_performance_fix(kpi):
    return {
        "revenue_change_pct": 6,
        "conversion_change_pct": 5,
        "risk": "low"
    }


def simulate_payment_fix(kpi):
    return {
        "revenue_change_pct": 12,
        "conversion_change_pct": 10,
        "risk": "low"
    }


def simulate_checkout_improvement(kpi):
    return {
        "revenue_change_pct": 8,
        "conversion_change_pct": 7,
        "risk": "low"
    }


def simulate_monitor():
    return {
        "revenue_change_pct": 0,
        "conversion_change_pct": 0,
        "risk": "low"
    }


# -------------------------------
# STRATEGY → SIMULATION MAPPER
# -------------------------------
def simulate_strategy(strategy: Dict[str, Any], kpi: Dict[str, Any]) -> Dict[str, Any]:

    action = strategy.get("action_type")

    if action in ("apply_discount",):
        impact = simulate_discount(kpi)

    elif action in ("optimize_performance", "infrastructure_optimization", "scale_infrastructure"):
        impact = simulate_performance_fix(kpi)

    elif action in ("investigate_payments", "add_payment_fallback", "fraud_mitigation"):
        impact = simulate_payment_fix(kpi)

    elif action in ("improve_checkout",):
        impact = simulate_checkout_improvement(kpi)

    else:
        impact = simulate_monitor()

    return {
        "action_type": action,
        "expected_impact": impact,
        "confidence": strategy.get("confidence", 0.5),
        "risk_level": impact["risk"]
    }


# -------------------------------
# AGGREGATE BEST STRATEGY
# -------------------------------
def pick_best_strategy(simulations: List[Dict[str, Any]]):

    if not simulations:
        return None

    # score = revenue uplift - risk penalty
    def score(s):
        uplift = s["expected_impact"]["revenue_change_pct"]
        risk_penalty = {"low": 1, "medium": 3, "high": 6}.get(s["risk_level"], 3)
        return uplift - risk_penalty

    return max(simulations, key=score)


# -------------------------------
# MAIN FUNCTION
# -------------------------------
def simulate(data: Dict[str, Any]) -> Dict[str, Any]:

    strategies = data.get("strategies", [])
    kpi = data.get("kpi", {}).get("current", {})

    simulations = []

    for strategy in strategies:
        sim = simulate_strategy(strategy, kpi)
        simulations.append(sim)

    best = pick_best_strategy(simulations)

    result = {
        "agent": "SimulationAgent",
        "simulations": simulations,
        "recommended_action": best,
        "next_agent": "DecisionAgent",
        "log": {
            "status": "completed",
            "simulated_count": len(simulations)
        }
    }

    print("\n=== SIMULATION OUTPUT (PREDICTIVE) ===\n")
    print(json.dumps(result, indent=2))

    return result


# -------------------------------
# ENTRY POINT
# -------------------------------
if __name__ == "__main__":
    raw = sys.stdin.read() or "{}"
    data = json.loads(raw)
    output = simulate(data)
    print(json.dumps(output, indent=2))