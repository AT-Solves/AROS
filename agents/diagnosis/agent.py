"""
AROS – Diagnosis Agent
Analyzes signals and raw data to identify 1–3 root causes with evidence.
"""

import json
import sys
from datetime import datetime, timezone


def diagnose_causes(signal_output: dict, raw_data: dict = None) -> dict:
    """
    Analyze signal output and identify root causes.
    
    Args:
        signal_output: Output from SignalDetectionAgent (contains signals, severity, etc.)
        raw_data: Raw KPI metrics (for evidence gathering)
    
    Returns:
        {
            "agent": "DiagnosisAgent",
            "diagnosed_causes": [
                {
                    "cause": str,
                    "confidence": float (0-1),
                    "evidence": [list of evidence],
                    "affected_metric": str,
                    "severity": "LOW" | "MEDIUM" | "HIGH"
                },
                ...
            ],
            "primary_cause": str,
            "fraud_score": float (0-1),
            "reasoning": str,
            "next_agent": "StrategyAgent",
            "log": dict
        }
    """
    
    signals = signal_output.get("signals", [])
    primary_signal = signal_output.get("primary_signal")
    severity = signal_output.get("severity", "LOW")
    
    diagnosed_causes = []
    fraud_score = 0.0
    
    # ── Analyze each signal to infer root cause ──────────────────────────────
    
    for sig in signals:
        sig_type = sig.get("type")
        
        # ── Payment Issue Detection ──────────────────────────────────────────
        if sig_type == "payment_issue":
            failure_rate = sig.get("current_value", 0)
            
            # High failure rate suggests gateway outage or fraud detection
            if failure_rate > 20:
                diagnosed_causes.append({
                    "cause": "Payment Gateway Outage or Fraud Detection Triggered",
                    "confidence": 0.85,
                    "evidence": [
                        f"Payment failure rate: {failure_rate}%",
                        "Baseline typically 5-10%",
                        "Spike indicates systemic issue or fraud block"
                    ],
                    "affected_metric": "payment_failure_rate",
                    "severity": "HIGH" if failure_rate > 30 else "MEDIUM",
                    "priority": 1
                })
                fraud_score = min(0.5 + (failure_rate - 10) / 50, 1.0)
        
        # ── Performance/Latency Issue ────────────────────────────────────────
        elif sig_type == "performance_issue":
            latency = sig.get("current_value", 0)
            
            if latency > 1000:
                diagnosed_causes.append({
                    "cause": "Severe Performance Degradation (High Latency)",
                    "confidence": 0.90,
                    "evidence": [
                        f"Average latency: {latency}ms",
                        "Baseline: 400-500ms",
                        "Users experiencing slow checkout = higher abandonment"
                    ],
                    "affected_metric": "latency_ms",
                    "severity": "HIGH",
                    "priority": 2
                })
            else:
                diagnosed_causes.append({
                    "cause": "Moderate Latency Increase",
                    "confidence": 0.75,
                    "evidence": [
                        f"Average latency: {latency}ms",
                        "May cause conversion drop if combined with other factors"
                    ],
                    "affected_metric": "latency_ms",
                    "severity": "MEDIUM",
                    "priority": 2
                })
        
        # ── Revenue Drop Detection ───────────────────────────────────────────
        elif sig_type == "revenue_drop":
            revenue_change = sig.get("change_pct", 0)
            
            # Revenue drop often cascades from other issues
            diagnosed_causes.append({
                "cause": "Revenue Impact from Primary Issues",
                "confidence": 0.80,
                "evidence": [
                    f"Revenue dropped: {revenue_change}%",
                    "Likely consequence of payment failures, latency, or abandonment",
                    "Indicates customer friction upstream"
                ],
                "affected_metric": "revenue",
                "severity": "HIGH",
                "priority": 1
            })
        
        # ── Conversion Drop Detection ────────────────────────────────────────
        elif sig_type == "conversion_drop":
            conversion_change = sig.get("change_pct", 0)
            
            diagnosed_causes.append({
                "cause": "Conversion Funnel Breakdown",
                "confidence": 0.85,
                "evidence": [
                    f"Conversion rate dropped: {conversion_change}%",
                    "Causes: Latency spike, payment issues, or UX friction"
                ],
                "affected_metric": "conversion_rate",
                "severity": "HIGH" if abs(conversion_change) > 30 else "MEDIUM",
                "priority": 3
            })
        
        # ── Behavioral Shift (Abandonment) ───────────────────────────────────
        elif sig_type == "behavioral_shift":
            abandonment_change = sig.get("change_pct", 0)
            
            diagnosed_causes.append({
                "cause": "Cart Abandonment Surge",
                "confidence": 0.78,
                "evidence": [
                    f"Abandonment rate increased: +{abandonment_change}%",
                    "Users dropping items before checkout",
                    "Likely causes: price concerns, shipping costs, payment issues"
                ],
                "affected_metric": "cart_abandonment_rate",
                "severity": "MEDIUM",
                "priority": 4
            })
    
    # ── Rank causes by priority ──────────────────────────────────────────────
    diagnosed_causes = sorted(diagnosed_causes, key=lambda x: x.get("priority", 99))
    
    # Keep top 3 causes
    diagnosed_causes = diagnosed_causes[:3]
    
    # Remove priority from output
    for cause in diagnosed_causes:
        del cause["priority"]
    
    # ── Determine primary cause ──────────────────────────────────────────────
    primary_cause = diagnosed_causes[0]["cause"] if diagnosed_causes else "Unknown"
    
    # ── Build reasoning ──────────────────────────────────────────────────────
    reasoning_parts = [
        f"Analyzed {len(signals)} signals across KPI metrics.",
        f"Primary signal: {primary_signal}.",
        f"Identified {len(diagnosed_causes)} root cause(s)."
    ]
    
    if fraud_score > 0.65:
        reasoning_parts.append(f"⚠️  FRAUD RISK DETECTED (score: {fraud_score:.2f}). Escalation required.")
    
    reasoning = " ".join(reasoning_parts)
    
    return {
        "agent": "DiagnosisAgent",
        "diagnosed_causes": diagnosed_causes,
        "primary_cause": primary_cause,
        "fraud_score": fraud_score,
        "reasoning": reasoning,
        "next_agent": "StrategyAgent",
        "log": {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "causes_identified": len(diagnosed_causes),
            "signals_analyzed": len(signals),
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
    result = diagnose_causes(input_data)
    print(json.dumps(result, indent=2))
