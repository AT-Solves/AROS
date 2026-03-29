# AROS – Diagnosis Agent (All-Signal Coverage)

import json
import sys
from datetime import datetime, timezone
from typing import Dict, Any, List


def _pick_metric(signal: Dict[str, Any]) -> str:
    return signal.get("metric") or signal.get("affected_metric") or "unknown_metric"


def _format_evidence(signal: Dict[str, Any]) -> List[str]:
    metric = _pick_metric(signal)
    current = signal.get("current_value", "N/A")
    previous = signal.get("previous_value", "N/A")
    change = signal.get("change_pct", "N/A")

    return [
        f"Signal type: {signal.get('type', 'unknown')}",
        f"Metric: {metric}",
        f"Current value: {current}",
        f"Previous value: {previous}",
        f"Change: {change}",
    ]


def _signal_to_cause(signal: Dict[str, Any]) -> Dict[str, Any]:
    signal_type = signal.get("type", "unknown")
    metric = _pick_metric(signal)
    sev = signal.get("severity", "MEDIUM")
    conf = signal.get("confidence", 0.6)

    cause_map = {
        "latency_spike": "Severe Performance Degradation (High Latency)",
        "user_latency_high": "User Experience Latency Friction",
        "payment_failures_high": "Payment Gateway Outage or Fraud Detection Triggered",
        "cart_abandonment_high": "Checkout Funnel Friction and Cart Drop-off",
        "user_drop_off_high": "High User Drop-off During Session Journey",
        "order_conversion_low": "Order Conversion Breakdown in Checkout Journey",
        "revenue_drop": "Revenue Contraction Driven by Conversion and Checkout Issues",
        "conversion_drop": "Conversion Funnel Performance Deterioration",
    }

    return {
        "cause": cause_map.get(signal_type, f"Anomaly linked to {signal_type}"),
        "evidence": _format_evidence(signal),
        "severity": sev,
        "confidence": conf,
        "affected_metric": metric,
        "signal_type": signal_type,
    }


def _severity_rank(value: str) -> int:
    return {"LOW": 1, "MEDIUM": 2, "HIGH": 3}.get(value, 1)


def _derive_fraud_score(signals: List[Dict[str, Any]]) -> float:
    has_payment = any(s.get("type") == "payment_failures_high" for s in signals)
    has_dropoff = any(s.get("type") in ("cart_abandonment_high", "user_drop_off_high") for s in signals)
    has_latency = any(s.get("type") in ("latency_spike", "user_latency_high") for s in signals)

    score = 0.2
    if has_payment:
        score += 0.35
    if has_dropoff:
        score += 0.2
    if has_latency:
        score += 0.1

    return round(min(0.95, score), 2)


def _build_reasoning(signals: List[Dict[str, Any]], diagnosed_causes: List[Dict[str, Any]], primary: str, fraud_score: float) -> str:
    if not signals:
        return "No active signals detected. Diagnosis remains in monitoring mode."

    signal_types = ", ".join(s.get("type", "unknown") for s in signals)
    cause_names = ", ".join(c.get("cause", "unknown") for c in diagnosed_causes)
    return (
        f"Analyzed {len(signals)} signals: {signal_types}. "
        f"Derived {len(diagnosed_causes)} causes. "
        f"Primary cause: {primary}. "
        f"Fraud risk score: {fraud_score:.2f}. "
        f"Cause set: {cause_names}."
    )


def diagnose(data: Dict[str, Any]) -> Dict[str, Any]:
    signals = data.get("signals", []) or []
    diagnosed_causes = [_signal_to_cause(sig) for sig in signals]

    if diagnosed_causes:
        primary_cause_obj = max(
            diagnosed_causes,
            key=lambda c: (_severity_rank(c.get("severity", "LOW")), c.get("confidence", 0)),
        )
        primary_cause = primary_cause_obj.get("cause", "unknown")
        confidence = round(
            sum(c.get("confidence", 0) for c in diagnosed_causes) / len(diagnosed_causes),
            2,
        )
        uncertainty = False
    else:
        primary_cause = "unknown"
        confidence = 0.3
        uncertainty = True

    fraud_score = _derive_fraud_score(signals)

    diagnosis_obj = {
        "root_causes": [c.get("cause") for c in diagnosed_causes],
        "primary_cause": primary_cause,
        "confidence": confidence,
        "uncertainty": uncertainty,
    }

    result = {
        "agent": "DiagnosisAgent",
        "signals": signals,
        "signal_count": len(signals),
        "severity": data.get("severity", "LOW"),
        "confidence": confidence,
        "requires_attention": len(signals) > 0,
        "diagnosis": diagnosis_obj,
        # keep legacy keys for compatibility with existing DB-shaped UI
        "diagnosed_causes": diagnosed_causes,
        "primary_cause": primary_cause,
        "fraud_score": fraud_score,
        "reasoning": _build_reasoning(signals, diagnosed_causes, primary_cause, fraud_score),
        "next_agent": "StrategyAgent",
        "log": {
            "status": "completed",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "signals_analyzed": len(signals),
            "causes_identified": len(diagnosed_causes),
            "uncertainty": uncertainty,
        },
    }

    print("\n=== DIAGNOSIS OUTPUT (ALL-SIGNAL) ===\n")
    print(json.dumps(result, indent=2))

    return result


if __name__ == "__main__":
    raw = sys.stdin.read() or "{}"
    data = json.loads(raw)
    output = diagnose(data)
    print(json.dumps(output, indent=2))