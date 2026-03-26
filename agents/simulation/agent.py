"""
AROS – Simulation Agent
Predicts impact of recommended strategies using Monte Carlo simulation.
"""

import json
import sys
import random
from datetime import datetime, timezone


def simulate_strategy(
    strategy_output: dict,
    diagnosis_output: dict = None,
    raw_data: dict = None,
    num_trials: int = 500
) -> dict:
    """
    Simulate the impact of a strategy on KPI metrics.
    
    Args:
        strategy_output: Output from StrategyAgent
        diagnosis_output: Output from DiagnosisAgent
        raw_data: Raw KPI metrics
        num_trials: Number of Monte Carlo trials (default 500)
    
    Returns:
        {
            "agent": "SimulationAgent",
            "strategy_id": str,
            "simulated_metrics": {
                "revenue": {
                    "baseline": float,
                    "median": float,
                    "p10": float,
                    "p90": float,
                    "mean": float
                },
                "conversion_rate": {...},
                "cart_abandonment": {...}
            },
            "expected_uplift_pct": float,
            "confidence": float,
            "distribution": dict (for UI charts),
            "reasoning": str,
            "next_agent": "DecisionAgent",
            "log": dict
        }
    """
    
    primary_strategy = strategy_output.get("primary_strategy", {})
    strategy_id = primary_strategy.get("strategy_id", "UNKNOWN")
    action_type = primary_strategy.get("action_type", "")
    expected_uplift = primary_strategy.get("expected_uplift_pct", 0)
    confidence = primary_strategy.get("confidence", 0.5)
    
    # Baseline metrics (from raw_data or defaults)
    baseline_revenue = raw_data.get("current", {}).get("revenue", 371981400) if raw_data else 371981400
    baseline_conversion = raw_data.get("current", {}).get("conversion_rate", 7.98) if raw_data else 7.98
    baseline_abandonment = raw_data.get("current", {}).get("cart_abandonment_rate", 74.83) if raw_data else 74.83
    
    # ── Monte Carlo Simulation ───────────────────────────────────────────────
    # Each trial: apply strategy effect + random variance
    revenue_trials = []
    conversion_trials = []
    abandonment_trials = []
    
    for _ in range(num_trials):
        # Apply strategy uplift with confidence-based variance
        # Higher confidence = tighter distribution
        variance = (1 - confidence) * 0.15  # ±15% at low confidence, ±3% at high confidence
        
        noise = random.gauss(0, variance)
        
        # Revenue impact
        if action_type == "discount":
            # Discount drives immediate uplift but with elasticity uncertainty
            revenue_multiplier = 1.0 + (expected_uplift / 100.0) + noise
            conversion_multiplier = 1.08 + noise  # Discount boosts conversion +8%
            abandonment_multiplier = 0.92 + noise  # Slightly reduces abandonment
        
        elif action_type == "infrastructure_optimization":
            # Performance improvement drives gradual uplift
            revenue_multiplier = 1.0 + (expected_uplift / 100.0) + noise
            conversion_multiplier = 1.05 + noise  # Latency improvement → +5% conversion
            abandonment_multiplier = 0.95 + noise
        
        elif action_type == "fraud_mitigation":
            # Fraud mitigation reduces false rejections
            revenue_multiplier = 1.0 + (expected_uplift / 100.0) + noise
            conversion_multiplier = 1.06 + noise  # More legit transactions approved
            abandonment_multiplier = 0.97 + noise
        
        elif action_type == "marketing_campaign":
            # Marketing engages abandoning users
            revenue_multiplier = 1.0 + (expected_uplift / 100.0) + noise
            conversion_multiplier = 1.04 + noise
            abandonment_multiplier = 0.88 + noise  # Cart recovery campaign
        
        elif action_type == "ui_change":
            # UX simplification drives strong uplift
            revenue_multiplier = 1.0 + (expected_uplift / 100.0) + noise
            conversion_multiplier = 1.07 + noise  # Simpler checkout → +7%
            abandonment_multiplier = 0.85 + noise  # Less friction
        
        else:
            # Default conservative impact
            revenue_multiplier = 1.0 + (expected_uplift / 100.0) + noise
            conversion_multiplier = 1.03 + noise
            abandonment_multiplier = 0.98 + noise
        
        revenue_trials.append(baseline_revenue * revenue_multiplier)
        conversion_trials.append(baseline_conversion * conversion_multiplier)
        abandonment_trials.append(baseline_abandonment * abandonment_multiplier)
    
    # ── Calculate statistics ─────────────────────────────────────────────────
    def percentile(data, p):
        """Calculate pth percentile"""
        sorted_data = sorted(data)
        idx = int(len(sorted_data) * (p / 100.0))
        return sorted_data[max(0, idx - 1)]
    
    simulated_metrics = {
        "revenue": {
            "baseline": baseline_revenue,
            "median": percentile(revenue_trials, 50),
            "mean": sum(revenue_trials) / len(revenue_trials),
            "p10": percentile(revenue_trials, 10),
            "p90": percentile(revenue_trials, 90),
            "min": min(revenue_trials),
            "max": max(revenue_trials),
        },
        "conversion_rate": {
            "baseline": baseline_conversion,
            "median": percentile(conversion_trials, 50),
            "mean": sum(conversion_trials) / len(conversion_trials),
            "p10": percentile(conversion_trials, 10),
            "p90": percentile(conversion_trials, 90),
            "min": min(conversion_trials),
            "max": max(conversion_trials),
        },
        "cart_abandonment": {
            "baseline": baseline_abandonment,
            "median": percentile(abandonment_trials, 50),
            "mean": sum(abandonment_trials) / len(abandonment_trials),
            "p10": percentile(abandonment_trials, 10),
            "p90": percentile(abandonment_trials, 90),
            "min": min(abandonment_trials),
            "max": max(abandonment_trials),
        },
    }
    
    # ── Compute actual confidence (adjusted from simulation) ─────────────────
    median_uplift = (simulated_metrics["revenue"]["median"] - baseline_revenue) / baseline_revenue * 100
    uplift_variance = (simulated_metrics["revenue"]["p90"] - simulated_metrics["revenue"]["p10"]) / baseline_revenue * 100
    
    # Higher variance = lower confidence
    simulation_confidence = confidence * (1 - (uplift_variance / 100) * 0.1)
    simulation_confidence = round(max(0, min(simulation_confidence, 0.95)), 2)
    
    # ── Distribution data for charting ───────────────────────────────────────
    distribution = {
        "revenue_distribution": {
            "bins": 30,
            "data": sorted(revenue_trials),  # Can be reduced to 30 bins for UI
            "mean": simulated_metrics["revenue"]["mean"],
            "std_dev": calculate_std_dev(revenue_trials),
        },
        "conversion_distribution": {
            "bins": 20,
            "data": sorted(conversion_trials),
            "mean": simulated_metrics["conversion_rate"]["mean"],
            "std_dev": calculate_std_dev(conversion_trials),
        }
    }
    
    # ── Reasoning ────────────────────────────────────────────────────────────
    expected_revenue_uplift = simulated_metrics["revenue"]["median"] - baseline_revenue
    
    reasoning = f"Ran {num_trials}-trial Monte Carlo simulation. " \
                f"Strategy: {action_type}. " \
                f"Median revenue: ${expected_revenue_uplift:,.0f} uplift (${simulated_metrics['revenue']['median']:,.0f}). " \
                f"Confidence: {simulation_confidence:.0%}. " \
                f"90% confidence interval: [${simulated_metrics['revenue']['p10']:,.0f}, ${simulated_metrics['revenue']['p90']:,.0f}]."
    
    return {
        "agent": "SimulationAgent",
        "strategy_id": strategy_id,
        "action_type": action_type,
        "simulated_metrics": simulated_metrics,
        "median_revenue_uplift": expected_revenue_uplift,
        "expected_uplift_pct": round(median_uplift, 1),
        "confidence": simulation_confidence,
        "num_trials": num_trials,
        "distribution": distribution,
        "reasoning": reasoning,
        "next_agent": "DecisionAgent",
        "log": {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "trials_completed": num_trials,
            "strategy_id": strategy_id,
        }
    }


def calculate_std_dev(data):
    """Calculate standard deviation"""
    if len(data) < 2:
        return 0
    mean = sum(data) / len(data)
    variance = sum((x - mean) ** 2 for x in data) / (len(data) - 1)
    return variance ** 0.5


# ─── CLI entry point ────────────────────────────────────────────────────────
if __name__ == "__main__":
    if len(sys.argv) > 1:
        with open(sys.argv[1], "r") as f:
            raw = f.read()
    else:
        raw = sys.stdin.read()
    
    input_data = json.loads(raw)
    result = simulate_strategy(input_data)
    print(json.dumps(result, indent=2))
