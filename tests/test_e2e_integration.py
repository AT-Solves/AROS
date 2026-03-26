"""
AROS – End-to-End Integration Test
Tests full pipeline: Signal → Diagnosis → Strategy → Simulation → Decision → Execution
"""

import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.signal_detection.agent import detect_signals
from agents.diagnosis.agent import diagnose_causes
from agents.strategy.agent import recommend_strategies
from agents.simulation.agent import simulate_strategy
from agents.decision.agent import make_decision
from agents.execution.agent import execute_strategy
from governance.policy_engine import validate_strategy


def test_pipeline_e2e():
    """Test end-to-end pipeline with mock data that triggers anomalies"""
    
    print("\n" + "="*70)
    print(" AROS FULL INTEGRATION TEST")
    print("="*70 + "\n")
    
    # ── Mock data with ANOMALIES to trigger full pipeline ──────────────────
    test_data = {
        "current": {
            "revenue": 315000000.00,        # DOWN 18% from baseline
            "conversion_rate": 6.20,         # DOWN 22% from baseline
            "cart_abandonment_rate": 86.45,  # UP 15% from baseline
            "latency_ms": 850.00,            # UP 50% from baseline (>700ms threshold)
            "payment_failure_rate": 24.00    # UP 140% from baseline (>10% threshold)
        },
        "previous": {
            "revenue": 385225600.00,
            "conversion_rate": 7.98,
            "cart_abandonment_rate": 74.83
        }
    }
    
    print("1️⃣  SIGNAL DETECTION")
    print("-" * 70)
    try:
        signal_output = detect_signals(test_data)
        alert = signal_output.get("alert")
        severity = signal_output.get("severity")
        signals = signal_output.get("signals", [])
        
        print(f"✓ Alert: {alert}")
        print(f"✓ Severity: {severity}")
        print(f"✓ Signals detected: {len(signals)}")
        for sig in signals:
            print(f"   - {sig['type']}: {sig['change_pct']}%")
        print()
        
        if not alert:
            print("❌ Test FAILED: Expected anomaly not detected\n")
            return False
    except Exception as e:
        print(f"❌ Signal detection error: {e}\n")
        return False
    
    print("2️⃣  DIAGNOSIS")
    print("-" * 70)
    try:
        diagnosis_output = diagnose_causes(signal_output, test_data)
        causes = diagnosis_output.get("diagnosed_causes", [])
        fraud_score = diagnosis_output.get("fraud_score", 0)
        
        print(f"✓ Causes identified: {len(causes)}")
        for i, cause in enumerate(causes, 1):
            print(f"   {i}. {cause['cause']} ({cause['confidence']:.0%})")
        print(f"✓ Fraud score: {fraud_score:.2f}")
        print()
    except Exception as e:
        print(f"❌ Diagnosis error: {e}\n")
        return False
    
    print("3️⃣  STRATEGY RECOMMENDATION")
    print("-" * 70)
    try:
        strategy_output = recommend_strategies(diagnosis_output, test_data)
        strategies = strategy_output.get("strategies", [])
        primary = strategy_output.get("primary_strategy", {})
        
        print(f"✓ Strategies generated: {len(strategies)}")
        for strat in strategies:
            print(f"   - {strat['action_type']}: +{strat['expected_uplift_pct']:.1f}% uplift, ${strat['budget_required']:,.0f} budget")
        print(f"✓ Primary: {primary.get('action_type')}")
        print()
    except Exception as e:
        print(f"❌ Strategy error: {e}\n")
        return False
    
    print("4️⃣  SIMULATION (500 trials)")
    print("-" * 70)
    try:
        simulation_output = simulate_strategy(strategy_output, diagnosis_output, test_data)
        
        metrics = simulation_output.get("simulated_metrics", {})
        revenue = metrics.get("revenue", {})
        uplift = simulation_output.get("median_revenue_uplift", 0)
        confidence = simulation_output.get("confidence", 0)
        
        print(f"✓ Baseline revenue: ${revenue.get('baseline'):,.0f}")
        print(f"✓ Median projected: ${revenue.get('median'):,.0f}")
        print(f"✓ Uplift: ${uplift:+,.0f} ({simulation_output.get('expected_uplift_pct'):+.1f}%)")
        print(f"✓ Confidence: {confidence:.0%}")
        print(f"✓ 90% CI: [${revenue.get('p10'):,.0f}, ${revenue.get('p90'):,.0f}]")
        print()
    except Exception as e:
        print(f"❌ Simulation error: {e}\n")
        return False
    
    print("5️⃣  DECISION (Governance Check)")
    print("-" * 70)
    try:
        decision_output = make_decision(simulation_output, strategy_output, diagnosis_output, signal_output)
        
        decision = decision_output.get("decision", "UNKNOWN")
        decision_id = decision_output.get("decision_id", "")
        governance = decision_output.get("governance_check", {})
        violations = governance.get("violations", [])
        
        print(f"✓ Decision: {decision}")
        print(f"✓ Decision ID: {decision_id}")
        print(f"✓ Blast radius: {decision_output.get('blast_radius', 'UNKNOWN')}")
        
        if violations:
            print(f"✓ Violations: {len(violations)}")
            for v in violations:
                print(f"   - {v['message']} ({v['severity']})")
        else:
            print(f"✓ Violations: None (compliant)")
        
        print()
    except Exception as e:
        print(f"❌ Decision error: {e}\n")
        return False
    
    print("6️⃣  EXECUTION")
    print("-" * 70)
    try:
        execution_output = execute_strategy(decision_output, approved=(decision == "NOTIFY"))
        
        status = execution_output.get("execution_status", "UNKNOWN")
        deployment_id = execution_output.get("deployment_id", "")
        
        print(f"✓ Status: {status}")
        print(f"✓ Deployment ID: {deployment_id}")
        print()
    except Exception as e:
        print(f"❌ Execution error: {e}\n")
        return False
    
    # ── Summary ──────────────────────────────────────────────────────────────
    print("="*70)
    print(" ✅ ALL TESTS PASSED — FULL PIPELINE WORKING END-TO-END")
    print("="*70 + "\n")
    
    return True


def test_governance_edge_cases():
    """Test governance policy enforcement"""
    
    print("="*70)
    print(" GOVERNANCE POLICY TESTS")
    print("="*70 + "\n")
    
    # Test 1: Discount > 30%
    print("Test 1: Discount exceeds 30% limit")
    result = validate_strategy({
        "action_type": "discount",
        "discount_pct": 35,  # VIOLATION
        "budget_required": 80000,
        "expected_uplift_pct": 10,
        "confidence": 0.75,
        "risk_level": "LOW"
    })
    assert result["decision"] == "ESCALATE", "Should escalate for >30% discount"
    print(f"✓ Correctly escalates: {result['violations'][0]['message']}\n")
    
    # Test 2: Fraud score > 0.65
    print("Test 2: Fraud score > 0.65 triggers escalation")
    result = validate_strategy(
        {"action_type": "discount", "discount_pct": 15, "budget_required": 50000, "confidence": 0.80, "risk_level": "LOW"},
        diagnosis={"fraud_score": 0.72}  # VIOLATION
    )
    assert result["decision"] == "ESCALATE", "Should escalate for high fraud"
    print(f"✓ Correctly escalates: Fraud score 0.72 > 0.65\n")
    
    # Test 3: Strategy passes all checks → AUTO
    print("Test 3: Low-risk, high-confidence strategy → AUTO")
    result = validate_strategy({
        "action_type": "fraud_mitigation",
        "budget_required": 0,
        "expected_uplift_pct": 6,
        "confidence": 0.88,
        "risk_level": "LOW"
    })
    assert result["decision"] == "AUTO", "Should AUTO-approve low-risk strategies"
    print(f"✓ Decision: {result['decision']} (no violations)\n")
    
    print("="*70)
    print(" ✅ GOVERNANCE TESTS PASSED")
    print("="*70 + "\n")


if __name__ == "__main__":
    # Run tests
    success = test_pipeline_e2e()
    
    if success:
        test_governance_edge_cases()
    
    sys.exit(0 if success else 1)
