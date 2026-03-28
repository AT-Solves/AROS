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
            "severity": severity_from_change(rev_change),
            "change_pct": rev_change,
            "confidence": 0.7
        })

    # Conversion drop
    conv_change = pct_change(current.get("conversion_rate", 0), previous.get("conversion_rate", 0))
    if conv_change < -5:
        signals.append({
            "type": "conversion_drop",
            "severity": severity_from_change(conv_change),
            "change_pct": conv_change,
            "confidence": 0.7
        })

    # Latency spike
    lat_change = pct_change(current.get("latency_ms", 0), previous.get("latency_ms", 0))
    if lat_change > 20:
        signals.append({
            "type": "latency_spike",
            "severity": severity_from_change(lat_change),
            "change_pct": lat_change,
            "confidence": 0.6
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
            "severity": "HIGH",
            "value": failure_rate,
            "confidence": 0.8
        })

    return signals


# -------------------------------
# BEHAVIOR SIGNALS
# -------------------------------
def detect_behavior_signals(behavior: Dict[str, Any]) -> List[Dict[str, Any]]:
    signals = []

    if behavior.get("avg_latency", 0) > 500:
        signals.append({
            "type": "user_latency_high",
            "severity": "MEDIUM",
            "confidence": 0.6
        })

    if behavior.get("drop_actions", 0) > 50:
        signals.append({
            "type": "user_drop_off_high",
            "severity": "HIGH",
            "confidence": 0.7
        })

    return signals


# -------------------------------
# CART SIGNALS
# -------------------------------
def detect_cart_signals(cart: Dict[str, Any]) -> List[Dict[str, Any]]:
    signals = []

    if cart.get("abandonment_rate", 0) > 40:
        signals.append({
            "type": "cart_abandonment_high",
            "severity": "HIGH",
            "confidence": 0.8
        })

    return signals


# -------------------------------
# ORDER SIGNALS
# -------------------------------
def detect_order_signals(orders: Dict[str, Any]) -> List[Dict[str, Any]]:
    signals = []

    if orders.get("conversion_rate", 0) < 5:
        signals.append({
            "type": "order_conversion_low",
            "severity": "MEDIUM",
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
    cart_signals = detect_cart_signals(data.get("cart", {}))
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

    result = {
        "agent": "SignalAgent",
        "signals": all_signals,
        "signal_count": len(all_signals),
        "severity": severity,
        "alert": len(all_signals) > 0,
        "confidence": round(min(1.0, 0.5 + 0.1 * len(all_signals)), 2),
        "next_agent": "DiagnosisAgent",
        "log": {
            "status": "completed"
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