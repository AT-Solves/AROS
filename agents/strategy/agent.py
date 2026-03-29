# AROS – Strategy Agent (All-Cause Coverage)

import json
import sys
from typing import Dict, Any, List


def _risk_rank(level: str) -> int:
    return {"low": 1, "medium": 2, "high": 3}.get((level or "medium").lower(), 2)


def _extract_diagnosis(data: Dict[str, Any]) -> Dict[str, Any]:
    diagnosis_obj = data.get("diagnosis", {}) or {}
    diagnosed_causes = data.get("diagnosed_causes", []) or []

    if not diagnosed_causes and diagnosis_obj.get("root_causes"):
        diagnosed_causes = [
            {
                "cause": item,
                "signal_type": "unknown",
                "severity": data.get("severity", "MEDIUM"),
                "confidence": diagnosis_obj.get("confidence", 0.6),
                "affected_metric": "unknown_metric",
            }
            for item in diagnosis_obj.get("root_causes", [])
        ]

    primary_cause = (
        diagnosis_obj.get("primary_cause")
        or data.get("primary_cause")
        or (diagnosed_causes[0].get("cause") if diagnosed_causes else "unknown")
    )

    return {
        "primary_cause": primary_cause,
        "diagnosed_causes": diagnosed_causes,
        "fraud_score": data.get("fraud_score", 0),
    }


def _strategy_template(action_type: str) -> Dict[str, Any]:
    templates = {
        "optimize_performance": {
            "description": "Scale infrastructure and optimize latency-critical paths.",
            "expected_impact": "Reduce latency and abandonment from performance bottlenecks.",
            "confidence": 0.82,
            "risk_level": "low",
        },
        "investigate_payments": {
            "description": "Add payment retry/fallback and tighten payment monitoring.",
            "expected_impact": "Lower payment failures and recover checkout completions.",
            "confidence": 0.86,
            "risk_level": "low",
        },
        "improve_checkout": {
            "description": "Optimize checkout UX and reduce friction in funnel steps.",
            "expected_impact": "Improve conversion and reduce cart drop-off.",
            "confidence": 0.8,
            "risk_level": "low",
        },
        "apply_discount": {
            "description": "Run targeted incentive campaign for at-risk cohorts.",
            "expected_impact": "Recover conversion and short-term revenue.",
            "confidence": 0.72,
            "risk_level": "medium",
        },
        "investigate_issue": {
            "description": "Escalate for deeper investigation with safe-guard monitoring.",
            "expected_impact": "Contain uncertainty while collecting root-cause evidence.",
            "confidence": 0.6,
            "risk_level": "low",
        },
    }
    return templates.get(action_type, templates["investigate_issue"])


def _map_cause_to_action(cause: Dict[str, Any]) -> str:
    signal_type = (cause.get("signal_type") or "").lower()
    cause_text = (cause.get("cause") or "").lower()

    if signal_type in ("latency_spike", "user_latency_high") or "latency" in cause_text or "scaling" in cause_text:
        return "optimize_performance"

    if signal_type in ("payment_failures_high",) or "payment" in cause_text or "fraud" in cause_text:
        return "investigate_payments"

    if signal_type in ("cart_abandonment_high", "order_conversion_low", "conversion_drop", "user_drop_off_high"):
        return "improve_checkout"

    if signal_type in ("revenue_drop",) or "revenue" in cause_text:
        return "apply_discount"

    return "investigate_issue"


def _build_strategies_from_causes(diagnosed_causes: List[Dict[str, Any]], fraud_score: float) -> List[Dict[str, Any]]:
    strategy_by_action = {}

    for cause in diagnosed_causes:
        action = _map_cause_to_action(cause)
        base = _strategy_template(action)

        if action not in strategy_by_action:
            strategy_by_action[action] = {
                "action_type": action,
                "description": base["description"],
                "expected_impact": base["expected_impact"],
                "confidence": base["confidence"],
                "risk_level": base["risk_level"],
                "covers": [],
            }

        strategy_by_action[action]["covers"].append(cause.get("cause", "unknown"))

        cause_conf = cause.get("confidence", base["confidence"])
        strategy_by_action[action]["confidence"] = round(
            max(strategy_by_action[action]["confidence"], cause_conf),
            2,
        )

    if fraud_score >= 0.65 and "investigate_payments" not in strategy_by_action:
        base = _strategy_template("investigate_payments")
        strategy_by_action["investigate_payments"] = {
            "action_type": "investigate_payments",
            "description": base["description"],
            "expected_impact": base["expected_impact"],
            "confidence": max(base["confidence"], 0.85),
            "risk_level": "low",
            "covers": ["fraud_risk_signal"],
        }

    if not strategy_by_action:
        base = _strategy_template("investigate_issue")
        strategy_by_action["investigate_issue"] = {
            "action_type": "investigate_issue",
            "description": base["description"],
            "expected_impact": base["expected_impact"],
            "confidence": base["confidence"],
            "risk_level": base["risk_level"],
            "covers": ["unknown"],
        }

    strategies = list(strategy_by_action.values())

    # pick higher-confidence, lower-risk options first
    strategies.sort(key=lambda s: (s.get("confidence", 0), -_risk_rank(s.get("risk_level"))), reverse=True)
    return strategies


def recommend_strategy(data: Dict[str, Any]) -> Dict[str, Any]:
    diagnosis_ctx = _extract_diagnosis(data)
    diagnosed_causes = diagnosis_ctx["diagnosed_causes"]
    fraud_score = diagnosis_ctx["fraud_score"]

    strategies = _build_strategies_from_causes(diagnosed_causes, fraud_score)
    primary_strategy = strategies[0]["action_type"] if strategies else "none"

    result = {
        "agent": "StrategyAgent",
        "strategies": strategies,
        "primary_strategy": primary_strategy,
        "reasoning": (
            f"Analyzed {len(diagnosed_causes)} root cause(s). "
            f"Generated {len(strategies)} strategy option(s) covering all detected causes. "
            f"Primary recommendation: {primary_strategy}."
        ),
        "next_agent": "SimulationAgent",
        "log": {
            "status": "completed",
            "strategy_count": len(strategies),
            "causes_analyzed": len(diagnosed_causes),
            "coverage_mode": "all_causes",
        },
    }

    print("\n=== STRATEGY OUTPUT (ALL-CAUSE) ===\n")
    print(json.dumps(result, indent=2))

    return result


if __name__ == "__main__":
    raw = sys.stdin.read() or "{}"
    data = json.loads(raw)
    output = recommend_strategy(data)
    print(json.dumps(output, indent=2))