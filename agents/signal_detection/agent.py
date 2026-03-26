"""
AROS – Signal Detection Agent
Analyzes current vs previous KPI metrics and detects anomalies that may impact revenue.
"""

import json
import sys
from datetime import datetime, timezone


# ─── Thresholds ──────────────────────────────────────────────────────────────
REVENUE_DROP_THRESHOLD = -15       # %
CONVERSION_DROP_THRESHOLD = -20    # %
ABANDONMENT_RISE_THRESHOLD = 15    # %
PAYMENT_FAILURE_THRESHOLD = 10     # %
LATENCY_THRESHOLD = 700            # ms
HIGH_SEVERITY_DROP = 30            # % (absolute) triggers HIGH severity

# Priority order for primary_signal selection (first match wins)
_SIGNAL_PRIORITY = [
    "payment_issue",
    "performance_issue",
    "revenue_drop",
    "conversion_drop",
    "behavioral_shift",
]


def compute_pct_change(current: float, previous: float) -> float:
    """Return percentage change from previous to current."""
    if previous == 0:
        return 0.0
    return round(((current - previous) / previous) * 100, 2)


# ─── Per-signal strength weights ─────────────────────────────────────────────
# Revenue / conversion signals are weighted higher because they directly
# represent revenue impact.  Others contribute equally.
_SIGNAL_WEIGHTS: dict[str, float] = {
    "revenue_drop": 1.5,
    "conversion_drop": 1.5,
    "behavioral_shift": 1.0,
    "payment_issue": 1.0,
    "performance_issue": 1.0,
}

# Maximum overshoot ratios used to normalise each signal's strength to [0, 1].
# e.g. a revenue drop of −60% when the threshold is −15% has
#   overshoot = (60 − 15) / 45 = 1.0   →  max strength.
_MAX_OVERSHOOT: dict[str, float] = {
    "revenue_drop": 45,           # −15% threshold → −60% is "max"
    "conversion_drop": 40,        # −20% threshold → −60% is "max"
    "behavioral_shift": 45,       # +15% threshold → +60% is "max"
    "payment_issue": 40,          # >10% threshold → 50% is "max"
    "performance_issue": 800,     # >700ms threshold → 1500ms is "max"
}


def _signal_strength(signal: dict) -> float:
    """
    Return a strength score in [0, 1] for a single signal based on how far
    the metric exceeds its detection threshold.
    """
    sig_type = signal["type"]
    value = signal["current_value"]

    # Map signal type → its detection threshold (absolute value used).
    threshold_map = {
        "revenue_drop": abs(REVENUE_DROP_THRESHOLD),
        "conversion_drop": abs(CONVERSION_DROP_THRESHOLD),
        "behavioral_shift": ABANDONMENT_RISE_THRESHOLD,
        "payment_issue": PAYMENT_FAILURE_THRESHOLD,
        "performance_issue": LATENCY_THRESHOLD,
    }

    threshold = threshold_map[sig_type]
    max_over = _MAX_OVERSHOOT[sig_type]

    # For %-change signals, use the absolute change_pct; for absolute-value
    # signals (latency, payment failure), use the raw current_value.
    if isinstance(signal["change_pct"], (int, float)):
        metric_value = abs(signal["change_pct"])
    else:
        metric_value = value

    overshoot = max(metric_value - threshold, 0)
    return min(overshoot / max_over, 1.0)


def _compute_confidence(signals: list[dict]) -> float:
    """
    Dynamically compute a confidence score in [0, 0.95].

    Formula:
        confidence  = 0.6  (base)
                    + 0.1 × number_of_signals
                    + 0.1  if payment_failure_rate > 20
                    + 0.1  if latency_ms > 1000
        confidence  = min(confidence, 0.95)
    """
    if not signals:
        return 0.0

    confidence = 0.6 + (0.1 * len(signals))

    # Severity bonuses for extreme absolute values
    for sig in signals:
        if sig["type"] == "payment_issue" and sig["current_value"] > 20:
            confidence += 0.1
        if sig["type"] == "performance_issue" and sig["current_value"] > 1000:
            confidence += 0.1

    return round(min(confidence, 0.95), 2)


def detect_signals(data: dict) -> dict:
    """
    Core detection logic.
    Accepts a dict with 'current' and 'previous' keys and returns the
    SignalDetectionAgent output as a dict.
    """
    current = data["current"]
    previous = data["previous"]

    # ── 1. Compute percentage changes ────────────────────────────────────
    revenue_change = compute_pct_change(current["revenue"], previous["revenue"])
    conversion_change = compute_pct_change(
        current["conversion_rate"], previous["conversion_rate"]
    )
    abandonment_change = compute_pct_change(
        current["cart_abandonment_rate"], previous["cart_abandonment_rate"]
    )

    # ── 2. Detect anomalies ──────────────────────────────────────────────
    signals: list[dict] = []

    if revenue_change < REVENUE_DROP_THRESHOLD:
        signals.append({
            "type": "revenue_drop",
            "metric": "revenue",
            "change_pct": revenue_change,
            "current_value": current["revenue"],
            "previous_value": previous["revenue"],
        })

    if conversion_change < CONVERSION_DROP_THRESHOLD:
        signals.append({
            "type": "conversion_drop",
            "metric": "conversion_rate",
            "change_pct": conversion_change,
            "current_value": current["conversion_rate"],
            "previous_value": previous["conversion_rate"],
        })

    if abandonment_change > ABANDONMENT_RISE_THRESHOLD:
        signals.append({
            "type": "behavioral_shift",
            "metric": "cart_abandonment_rate",
            "change_pct": abandonment_change,
            "current_value": current["cart_abandonment_rate"],
            "previous_value": previous["cart_abandonment_rate"],
        })

    if current["payment_failure_rate"] > PAYMENT_FAILURE_THRESHOLD:
        signals.append({
            "type": "payment_issue",
            "metric": "payment_failure_rate",
            "change_pct": "threshold_breach",
            "current_value": current["payment_failure_rate"],
            "previous_value": None,
        })

    if current["latency_ms"] > LATENCY_THRESHOLD:
        signals.append({
            "type": "performance_issue",
            "metric": "latency_ms",
            "change_pct": "threshold_breach",
            "current_value": current["latency_ms"],
            "previous_value": None,
        })

    alert = len(signals) > 0

    # ── 3. Severity ──────────────────────────────────────────────────────
    any_large_drop = any(
        isinstance(s["change_pct"], (int, float)) and abs(s["change_pct"]) > HIGH_SEVERITY_DROP
        for s in signals
    )

    if len(signals) >= 2 or any_large_drop:
        severity = "HIGH"
    elif len(signals) == 1:
        severity = "MEDIUM"
    else:
        severity = "LOW"

    # ── 4. Confidence (dynamic) ───────────────────────────────────────────
    #  Each signal contributes a *strength* score (0‒1) based on how far
    #  the metric exceeds its threshold.  Final confidence blends:
    #    • signal-count weight  (more signals → higher base)
    #    • average signal strength (bigger breaches → higher score)
    confidence = _compute_confidence(signals)

    # ── 5. Reasoning ─────────────────────────────────────────────────────
    parts: list[str] = []
    parts.append(f"Revenue change: {revenue_change}%")
    parts.append(f"Conversion change: {conversion_change}%")
    parts.append(f"Abandonment change: {abandonment_change}%")
    parts.append(f"Payment failure rate: {current['payment_failure_rate']}%")
    parts.append(f"Latency: {current['latency_ms']}ms")

    if alert:
        triggered = [s["type"] for s in signals]
        parts.append(f"Triggered signals: {', '.join(triggered)}.")
    else:
        parts.append("No thresholds breached.")

    reasoning = " | ".join(parts)

    # ── 6. Primary signal (priority: payment > performance > others) ────
    primary_signal = None
    if signals:
        signal_types = {s["type"] for s in signals}
        for candidate in _SIGNAL_PRIORITY:
            if candidate in signal_types:
                primary_signal = candidate
                break

    # ── 7. Governance hook ───────────────────────────────────────────────
    requires_attention = severity == "HIGH"

    # ── 8. Next agent ────────────────────────────────────────────────────
    next_agent = "DiagnosisAgent" if alert else "None"

    # ── 9. Logging block ─────────────────────────────────────────────────
    log = {
        "event": "anomaly_detected" if alert else "no_anomaly",
        "signal_count": len(signals),
        "primary_issue": primary_signal,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    return {
        "agent": "SignalDetectionAgent",
        "alert": alert,
        "signals": signals,
        "primary_signal": primary_signal,
        "severity": severity,
        "confidence": confidence,
        "requires_attention": requires_attention,
        "reasoning": reasoning,
        "next_agent": next_agent,
        "log": log,
    }


# ─── CLI entry point ────────────────────────────────────────────────────────
if __name__ == "__main__":
    # Accept JSON from stdin or as a file path argument.
    if len(sys.argv) > 1:
        with open(sys.argv[1], "r") as f:
            raw = f.read()
    else:
        raw = sys.stdin.read()

    input_data = json.loads(raw)
    result = detect_signals(input_data)
    print(json.dumps(result, indent=2))
