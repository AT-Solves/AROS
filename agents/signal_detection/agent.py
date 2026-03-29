# AROS – Signal Detection Agent (Multi-Source Intelligence)

import json
import sys
from typing import Dict, Any, List


# -------------------------------
# HELPER FUNCTIONS
# -------------------------------
def pct_change(current, previous):
    if previous == 0:
        return 0.0
    return round(((current - previous) / previous) * 100, 2)


def severity_from_change(change):
    if abs(change) > 40:
        return "HIGH"
    elif abs(change) > 20:
        return "MEDIUM"
    else:
        return "LOW"


# -------------------------------
# KPI SIGNALS
# -------------------------------
def detect_kpi_signals(kpi: Dict[str, Any]) -> List[Dict[str, Any]]:
    signals = []

    current = kpi.get("current", {})
    previous = kpi.get("previous", {})

    # Revenue drop
    rev_change = pct_change(current.get("revenue", 0), previous.get("revenue", 0))
    if rev_change < -10:
        signals.append({
            "type": "revenue_drop",
            "metric": "revenue",
            "severity": severity_from_change(rev_change),
            "change_pct": rev_change,
            "current_value": current.get("revenue"),
            "previous_value": previous.get("revenue"),
            "confidence": 0.7
        })

    # Conversion drop
    conv_change = pct_change(current.get("conversion_rate", 0), previous.get("conversion_rate", 0))
    if conv_change < -5:
        signals.append({
            "type": "conversion_drop",
            "metric": "conversion_rate",
            "severity": severity_from_change(conv_change),
            "change_pct": conv_change,
            "current_value": current.get("conversion_rate"),
            "previous_value": previous.get("conversion_rate"),
            "confidence": 0.7
        })

    # Latency spike
    lat_change = pct_change(current.get("latency_ms", 0), previous.get("latency_ms", 0))
    if lat_change > 20:
        signals.append({
            "type": "latency_spike",
            "metric": "latency_ms",
            "severity": severity_from_change(lat_change),
            "change_pct": lat_change,
            "current_value": current.get("latency_ms"),
            "previous_value": previous.get("latency_ms"),
            "confidence": 0.6
        })

    # Cart abandonment rate spike (from KPI window)
    cart_change = pct_change(
        current.get("cart_abandonment_rate", 0),
        previous.get("cart_abandonment_rate", 0)
    )
    kpi_cart_rate = current.get("cart_abandonment_rate", 0)
    if kpi_cart_rate > 40:
        signals.append({
            "type": "cart_abandonment_high",
            "metric": "cart_abandonment_rate",
            "severity": severity_from_change(cart_change) if previous.get("cart_abandonment_rate") else "HIGH",
            "change_pct": cart_change if previous.get("cart_abandonment_rate") else "threshold_breach",
            "current_value": kpi_cart_rate,
            "previous_value": previous.get("cart_abandonment_rate"),
            "confidence": 0.8
        })

    return signals


# -------------------------------
# PAYMENT SIGNALS
# -------------------------------
def detect_payment_signals(kpi: Dict[str, Any]) -> List[Dict[str, Any]]:
    signals = []

    current = kpi.get("current", {})
    failure_rate = current.get("payment_failure_rate", 0)

    if failure_rate > 10:
        signals.append({
            "type": "payment_failures_high",
            "metric": "payment_failure_rate",
            "severity": "HIGH",
            "change_pct": "threshold_breach",
            "current_value": failure_rate,
            "previous_value": kpi.get("previous", {}).get("payment_failure_rate"),
            "confidence": 0.8
        })

    return signals


# -------------------------------
# BEHAVIOR SIGNALS
# -------------------------------
def detect_behavior_signals(behavior: Dict[str, Any]) -> List[Dict[str, Any]]:
    signals = []

    avg_latency = behavior.get("avg_latency", 0)
    if avg_latency > 500:
        signals.append({
            "type": "user_latency_high",
            "metric": "avg_latency",
            "severity": "MEDIUM",
            "change_pct": "threshold_breach",
            "current_value": avg_latency,
            "previous_value": None,
            "confidence": 0.6
        })

    drop_actions = behavior.get("drop_actions", 0)
    if drop_actions > 50:
        signals.append({
            "type": "user_drop_off_high",
            "metric": "drop_actions",
            "severity": "HIGH",
            "change_pct": "threshold_breach",
            "current_value": drop_actions,
            "previous_value": None,
            "confidence": 0.7
        })

    return signals


# -------------------------------
# CART SIGNALS (domain-level fallback)
# -------------------------------
def detect_cart_signals(cart: Dict[str, Any], already_detected: List[str]) -> List[Dict[str, Any]]:
    """Secondary cart check using domain metric, only if KPI-level check didn't already fire."""
    signals = []

    if "cart_abandonment_high" in already_detected:
        return signals

    abandonment_rate = cart.get("abandonment_rate", 0)
    if abandonment_rate > 40:
        signals.append({
            "type": "cart_abandonment_high",
            "metric": "abandonment_rate",
            "severity": "HIGH",
            "change_pct": "threshold_breach",
            "current_value": abandonment_rate,
            "previous_value": None,
            "confidence": 0.8
        })

    return signals


# -------------------------------
# ORDER SIGNALS
# -------------------------------
def detect_order_signals(orders: Dict[str, Any]) -> List[Dict[str, Any]]:
    signals = []

    conv_rate = orders.get("conversion_rate", 0)
    if conv_rate < 5:
        signals.append({
            "type": "order_conversion_low",
            "metric": "order_conversion_rate",
            "severity": "MEDIUM",
            "change_pct": "threshold_breach",
            "current_value": conv_rate,
            "previous_value": None,
            "confidence": 0.7
        })

    return signals


# -------------------------------
# MAIN SIGNAL DETECTION
# -------------------------------
def detect_signals(data: Dict[str, Any]) -> Dict[str, Any]:

    kpi_signals = detect_kpi_signals(data.get("kpi", {}))
    payment_signals = detect_payment_signals(data.get("kpi", {}))
    behavior_signals = detect_behavior_signals(data.get("behavior", {}))

    already_detected = [s["type"] for s in kpi_signals]
    cart_signals = detect_cart_signals(data.get("cart", {}), already_detected)
    order_signals = detect_order_signals(data.get("orders", {}))

    all_signals = (
        kpi_signals +
        payment_signals +
        behavior_signals +
        cart_signals +
        order_signals
    )

    # -------------------------------
    # META ANALYSIS
    # -------------------------------
    severity = "LOW"
    if any(s["severity"] == "HIGH" for s in all_signals):
        severity = "HIGH"
    elif any(s["severity"] == "MEDIUM" for s in all_signals):
        severity = "MEDIUM"

    primary_signal = all_signals[0]["type"] if all_signals else None

    # Build human-readable reasoning
    kpi = data.get("kpi", {})
    current = kpi.get("current", {})
    previous = kpi.get("previous", {})
    rev_change = pct_change(current.get("revenue", 0), previous.get("revenue", 0))
    conv_change = pct_change(current.get("conversion_rate", 0), previous.get("conversion_rate", 0))
    cart_change = pct_change(
        current.get("cart_abandonment_rate", 0),
        previous.get("cart_abandonment_rate", 0)
    )
    reasoning_parts = [
        f"Revenue change: {rev_change:.2f}%",
        f"Conversion change: {conv_change:.2f}%",
        f"Abandonment change: {cart_change:.2f}%",
        f"Payment failure rate: {current.get('payment_failure_rate', 0)}%",
        f"Latency: {current.get('latency_ms', 0):.2f}ms",
        f"Triggered signals: {', '.join(s['type'] for s in all_signals) if all_signals else 'none'}.",
    ]
    reasoning = " | ".join(reasoning_parts)

    result = {
        "agent": "SignalAgent",
        "signals": all_signals,
        "signal_count": len(all_signals),
        "severity": severity,
        "alert": len(all_signals) > 0,
        "requires_attention": severity in ("HIGH", "MEDIUM"),
        "primary_signal": primary_signal,
        "reasoning": reasoning,
        "confidence": round(min(1.0, 0.5 + 0.1 * len(all_signals)), 2),
        "next_agent": "DiagnosisAgent",
        "log": {
            "status": "completed",
            "event": "anomaly_detected" if all_signals else "no_anomaly",
            "signal_count": len(all_signals),
            "primary_issue": primary_signal,
        }
    }

    print("\n=== SIGNAL OUTPUT (MULTI-SOURCE) ===\n")
    print(json.dumps(result, indent=2))

    return result


# -------------------------------
# ENTRY POINT
# -------------------------------
if __name__ == "__main__":
    raw = sys.stdin.read() or "{}"
    data = json.loads(raw)
    output = detect_signals(data)
    print(json.dumps(output, indent=2))