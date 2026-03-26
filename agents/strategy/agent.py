"""
AROS – Strategy Agent
Recommends revenue optimization strategies based on diagnosed root causes.
"""

import json
import sys
from datetime import datetime, timezone


def recommend_strategies(diagnosis_output: dict, raw_data: dict = None) -> dict:
    """
    Recommend 1–3 optimization strategies based on root causes.
    
    Args:
        diagnosis_output: Output from DiagnosisAgent
        raw_data: Raw KPI metrics for context
    
    Returns:
        {
            "agent": "StrategyAgent",
            "strategies": [
                {
                    "strategy_id": str,
                    "action_type": str,
                    "description": str,
                    "expected_uplift_pct": float,
                    "estimated_cost": float,
                    "budget_required": float,
                    "expected_roi": float,
                    "risk_level": "LOW" | "MEDIUM" | "HIGH",
                    "implementation_time": str,
                    "rationale": str
                },
                ...
            ],
            "primary_strategy": dict (best candidate),
            "reasoning": str,
            "next_agent": "SimulationAgent",
            "log": dict
        }
    """
    
    diagnosed_causes = diagnosis_output.get("diagnosed_causes", [])
    fraud_score = diagnosis_output.get("fraud_score", 0.0)
    
    strategies = []
    
    # ── Strategy Template 1: Discount Promotion ──────────────────────────────
    # Good for: Revenue recovery, conversion recovery, payment issues
    if diagnosed_causes and any(cause["cause"].find("Revenue") >= 0 for cause in diagnosed_causes):
        strategies.append({
            "strategy_id": "STR_001_DISCOUNT_PROMOTION",
            "action_type": "discount",
            "description": "25% limited-time discount to recover revenue and boost conversion",
            "discount_pct": 25,
            "expected_uplift_pct": 8.5,
            "estimated_cost": 100000,
            "budget_required": 100000,
            "expected_roi": 3.2,  # $320K uplift per $100K spent
            "risk_level": "MEDIUM",
            "implementation_time": "Immediate",
            "rationale": "Discount incentivizes users to complete purchases despite friction points",
            "confidence": 0.78,
            "success_rate_historical": 0.82
        })
    
    # ── Strategy Template 2: Performance Optimization ───────────────────────
    # Good for: Latency issues
    if diagnosed_causes and any(cause["cause"].find("Latency") >= 0 for cause in diagnosed_causes):
        strategies.append({
            "strategy_id": "STR_002_PERFORMANCE_FIX",
            "action_type": "infrastructure_optimization",
            "description": "Scale infrastructure and optimize checkout latency",
            "expected_uplift_pct": 5.2,
            "estimated_cost": 50000,
            "budget_required": 50000,
            "expected_roi": 4.1,
            "risk_level": "LOW",
            "implementation_time": "2-4 hours",
            "rationale": "Reducing latency <500ms improves conversion and user experience",
            "confidence": 0.85,
            "success_rate_historical": 0.90
        })
    
    # ── Strategy Template 3: Fraud Mitigation ───────────────────────────────
    # Good for: Fraud spike, payment issues
    if fraud_score > 0.65 or any(cause["cause"].find("Payment") >= 0 for cause in diagnosed_causes):
        strategies.append({
            "strategy_id": "STR_003_FRAUD_MITIGATION",
            "action_type": "fraud_mitigation",
            "description": "Tighten fraud detection + whitelist legitimate payment methods",
            "expected_uplift_pct": 6.0,
            "estimated_cost": 0,
            "budget_required": 0,
            "expected_roi": float('inf'),  # No cost, just config
            "risk_level": "LOW",
            "implementation_time": "30 minutes",
            "rationale": "Reduce false-positive fraud blocks on legitimate transactions",
            "confidence": 0.88,
            "success_rate_historical": 0.91
        })
    
    # ── Strategy Template 4: Marketing Campaign ──────────────────────────────
    # Good for: Abandonment spike
    if diagnosed_causes and any(cause["cause"].find("Abandonment") >= 0 for cause in diagnosed_causes):
        strategies.append({
            "strategy_id": "STR_004_MARKETING_CAMPAIGN",
            "action_type": "marketing_campaign",
            "description": "Cart recovery email campaign with 15% off coupon",
            "expected_uplift_pct": 3.8,
            "estimated_cost": 30000,
            "budget_required": 30000,
            "expected_roi": 5.2,
            "risk_level": "LOW",
            "implementation_time": "1 hour",
            "rationale": "Re-engage abandoning customers with targeted incentive",
            "confidence": 0.75,
            "success_rate_historical": 0.78
        })
    
    # ── Strategy Template 5: Conversion Funnel Optimization ──────────────────
    if diagnosed_causes and any(cause["cause"].find("Funnel") >= 0 for cause in diagnosed_causes):
        strategies.append({
            "strategy_id": "STR_005_FUNNEL_OPTIMIZE",
            "action_type": "ui_change",
            "description": "Simplify checkout flow (reduce form fields, enable 1-click pay)",
            "expected_uplift_pct": 7.2,
            "estimated_cost": 75000,
            "budget_required": 75000,
            "expected_roi": 2.8,
            "risk_level": "MEDIUM",
            "implementation_time": "1-2 days",
            "rationale": "Reduce checkout friction by 30%, improving both conversion and latency",
            "confidence": 0.80,
            "success_rate_historical": 0.85,
            "simulation_completed": False  # Requires simulation before approval
        })
    
    # ── Sort by expected ROI (best first) ─────────────────────────────────────
    strategies.sort(key=lambda s: s.get("expected_roi", 0), reverse=True)
    
    # Keep top 3
    strategies = strategies[:3]
    
    # Primary strategy is the top-ranked one
    primary_strategy = strategies[0] if strategies else {}
    
    # ── Build reasoning ──────────────────────────────────────────────────────
    reasoning_parts = [
        f"Analyzed {len(diagnosed_causes)} root cause(s).",
        f"Recommended {len(strategies)} strategic option(s)."
    ]
    
    if primary_strategy:
        reasoning_parts.append(f"Primary recommendation: {primary_strategy.get('action_type')} strategy (${primary_strategy.get('budget_required')}K budget, +{primary_strategy.get('expected_uplift_pct'):.1f}% uplift).")
    
    if fraud_score > 0.65:
        reasoning_parts.append("⚠️  Fraud mitigation included due to high fraud risk.")
    
    reasoning = " ".join(reasoning_parts)
    
    return {
        "agent": "StrategyAgent",
        "strategies": strategies,
        "primary_strategy": primary_strategy,
        "reasoning": reasoning,
        "next_agent": "SimulationAgent",
        "log": {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "strategies_generated": len(strategies),
            "fraud_score": round(fraud_score, 3),
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
    result = recommend_strategies(input_data)
    print(json.dumps(result, indent=2))
