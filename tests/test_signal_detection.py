"""
Tests for the Signal Detection Agent.
Covers: no-alert, single-signal, multi-signal, and edge-case scenarios.
Confidence values are now dynamic, so tests use range assertions.
"""

import json
import sys
import os

# Ensure the project root is on sys.path so we can import the agent module.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from agents.signal_detection_agent import detect_signals, _signal_strength, _compute_confidence


def _run(current: dict, previous: dict) -> dict:
    """Helper to build the input envelope and run detection."""
    return detect_signals({"current": current, "previous": previous})


# ── Test 1: No anomalies → alert=false ───────────────────────────────────────
def test_no_anomaly():
    result = _run(
        current={
            "revenue": 100000,
            "conversion_rate": 3.0,
            "cart_abandonment_rate": 25.0,
            "latency_ms": 200,
            "payment_failure_rate": 2.0,
        },
        previous={
            "revenue": 100000,
            "conversion_rate": 3.0,
            "cart_abandonment_rate": 25.0,
        },
    )
    assert result["alert"] is False
    assert result["signals"] == []
    assert result["severity"] == "LOW"
    assert result["confidence"] == 0.0
    assert result["primary_signal"] is None
    assert result["requires_attention"] is False
    assert result["next_agent"] == "None"
    assert result["log"]["event"] == "no_anomaly"
    assert result["log"]["signal_count"] == 0
    print("✅ test_no_anomaly passed")


# ── Test 2: Single signal (revenue drop −20%) → MEDIUM, low-to-mid confidence
def test_single_signal_revenue_drop():
    result = _run(
        current={
            "revenue": 80000,
            "conversion_rate": 3.0,
            "cart_abandonment_rate": 25.0,
            "latency_ms": 300,
            "payment_failure_rate": 3.0,
        },
        previous={
            "revenue": 100000,
            "conversion_rate": 3.0,
            "cart_abandonment_rate": 25.0,
        },
    )
    assert result["alert"] is True
    assert len(result["signals"]) == 1
    assert result["signals"][0]["type"] == "revenue_drop"
    assert result["severity"] == "MEDIUM"
    # 1 signal, no bonuses → 0.6 + 0.1 = 0.70
    assert result["confidence"] == 0.70, f"Got {result['confidence']}"
    assert result["primary_signal"] == "revenue_drop"
    assert result["requires_attention"] is False  # MEDIUM, not HIGH
    assert result["next_agent"] == "DiagnosisAgent"
    assert result["log"]["event"] == "anomaly_detected"
    print("✅ test_single_signal_revenue_drop passed")


# ── Test 3: Multiple signals → HIGH severity, high confidence ────────────────
def test_multiple_signals():
    result = _run(
        current={
            "revenue": 60000,
            "conversion_rate": 1.9,
            "cart_abandonment_rate": 41.0,
            "latency_ms": 900,
            "payment_failure_rate": 31.0,
        },
        previous={
            "revenue": 100000,
            "conversion_rate": 3.0,
            "cart_abandonment_rate": 25.0,
        },
    )
    assert result["alert"] is True
    assert len(result["signals"]) >= 3
    assert result["severity"] == "HIGH"
    assert result["confidence"] == 0.95, f"Got {result['confidence']}"
    assert result["primary_signal"] == "payment_issue"  # highest priority
    assert result["requires_attention"] is True
    assert result["next_agent"] == "DiagnosisAgent"
    assert result["log"]["signal_count"] >= 3
    assert result["log"]["primary_issue"] == "payment_issue"
    # Verify threshold_breach for payment/latency signals
    for s in result["signals"]:
        if s["type"] in ("payment_issue", "performance_issue"):
            assert s["change_pct"] == "threshold_breach"
    print("✅ test_multiple_signals passed")


# ── Test 4: Large single drop (>30%) → HIGH severity ────────────────────────
def test_large_single_drop():
    result = _run(
        current={
            "revenue": 60000,
            "conversion_rate": 3.0,
            "cart_abandonment_rate": 25.0,
            "latency_ms": 200,
            "payment_failure_rate": 2.0,
        },
        previous={
            "revenue": 100000,
            "conversion_rate": 3.0,
            "cart_abandonment_rate": 25.0,
        },
    )
    assert result["alert"] is True
    assert result["severity"] == "HIGH"  # -40% drop > 30% threshold
    # 1 signal, no bonuses → 0.6 + 0.1 = 0.70
    assert result["confidence"] == 0.70, f"Got {result['confidence']}"
    print("✅ test_large_single_drop passed")


# ── Test 5: Latency-only issue → MEDIUM ─────────────────────────────────────
def test_latency_only():
    result = _run(
        current={
            "revenue": 100000,
            "conversion_rate": 3.0,
            "cart_abandonment_rate": 25.0,
            "latency_ms": 1200,
            "payment_failure_rate": 2.0,
        },
        previous={
            "revenue": 100000,
            "conversion_rate": 3.0,
            "cart_abandonment_rate": 25.0,
        },
    )
    assert result["alert"] is True
    assert result["signals"][0]["type"] == "performance_issue"
    assert result["signals"][0]["change_pct"] == "threshold_breach"
    assert result["severity"] == "MEDIUM"
    assert result["primary_signal"] == "performance_issue"
    print("✅ test_latency_only passed")


# ── Test 6: README example scenario ─────────────────────────────────────────
def test_readme_scenario():
    """Conversion 3% → 1.9%, abandonment → 41%, payment failures 31%."""
    result = _run(
        current={
            "revenue": 95000,
            "conversion_rate": 1.9,
            "cart_abandonment_rate": 41.0,
            "latency_ms": 400,
            "payment_failure_rate": 31.0,
        },
        previous={
            "revenue": 100000,
            "conversion_rate": 3.0,
            "cart_abandonment_rate": 25.0,
        },
    )
    types = {s["type"] for s in result["signals"]}
    assert "conversion_drop" in types
    assert "behavioral_shift" in types
    assert "payment_issue" in types
    assert result["severity"] == "HIGH"
    # 3 signals + payment>20 → 0.6 + 0.3 + 0.1 = 1.0 → capped 0.95
    assert result["confidence"] == 0.95, f"Got {result['confidence']}"
    assert result["next_agent"] == "DiagnosisAgent"
    print("✅ test_readme_scenario passed")


# ── Test 7: Severity bonuses increase confidence ────────────────────────────
def test_confidence_bonus_for_severe_values():
    """Payment > 20% or latency > 1000ms should add bonus confidence."""
    no_bonus = _run(
        current={"revenue": 80000, "conversion_rate": 3.0,
                 "cart_abandonment_rate": 25.0, "latency_ms": 200,
                 "payment_failure_rate": 15.0},
        previous={"revenue": 100000, "conversion_rate": 3.0,
                  "cart_abandonment_rate": 25.0},
    )
    with_bonus = _run(
        current={"revenue": 80000, "conversion_rate": 3.0,
                 "cart_abandonment_rate": 25.0, "latency_ms": 200,
                 "payment_failure_rate": 25.0},
        previous={"revenue": 100000, "conversion_rate": 3.0,
                  "cart_abandonment_rate": 25.0},
    )
    # Both have 2 signals (revenue_drop + payment_issue), but with_bonus
    # gets +0.1 for payment > 20
    assert with_bonus["confidence"] > no_bonus["confidence"], (
        f"with_bonus ({with_bonus['confidence']}) should > no_bonus ({no_bonus['confidence']})"
    )
    print("✅ test_confidence_bonus_for_severe_values passed")


# ── Test 8: More signals → higher confidence ────────────────────────────────
def test_more_signals_boost_confidence():
    """Adding a second signal should increase confidence."""
    one_signal = _run(
        current={"revenue": 80000, "conversion_rate": 3.0,
                 "cart_abandonment_rate": 25.0, "latency_ms": 200,
                 "payment_failure_rate": 2.0},
        previous={"revenue": 100000, "conversion_rate": 3.0,
                  "cart_abandonment_rate": 25.0},
    )
    two_signals = _run(
        current={"revenue": 80000, "conversion_rate": 3.0,
                 "cart_abandonment_rate": 25.0, "latency_ms": 900,
                 "payment_failure_rate": 2.0},
        previous={"revenue": 100000, "conversion_rate": 3.0,
                  "cart_abandonment_rate": 25.0},
    )
    assert two_signals["confidence"] > one_signal["confidence"], (
        f"two ({two_signals['confidence']}) should > one ({one_signal['confidence']})"
    )
    print("✅ test_more_signals_boost_confidence passed")


# ── Run all ──────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    test_no_anomaly()
    test_single_signal_revenue_drop()
    test_multiple_signals()
    test_large_single_drop()
    test_latency_only()
    test_readme_scenario()
    test_confidence_bonus_for_severe_values()
    test_more_signals_boost_confidence()
    print("\n🎉 All Signal Detection Agent tests passed!")
