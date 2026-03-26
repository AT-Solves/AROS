import sys
import json
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import ingestion
from ingestion.aros_ingestion import run_ingestion

# Import all agents
from agents.signal_detection.agent import detect_signals
from agents.diagnosis.agent import diagnose_causes
from agents.strategy.agent import recommend_strategies
from agents.simulation.agent import simulate_strategy
from agents.decision.agent import make_decision
from agents.execution.agent import execute_strategy


def run_pipeline(execute_approved_only: bool = False):
    """
    Run full AROS pipeline:
    Ingestion → Signal Detection → Diagnosis → Strategy → Simulation → Decision → Execution
    
    Args:
        execute_approved_only: If True, only execute AUTO-approved strategies
    
    Returns:
        Pipeline output dict with all agent results
    """
    
    print("\n" + "="*70)
    print(" AROS PIPELINE: FULL END-TO-END EXECUTION")
    print("="*70 + "\n")
    
    pipeline_output = {}
    
    # ──────────────────────────────────────────────────────────────────────────
    # STEP 1: INGESTION
    # ──────────────────────────────────────────────────────────────────────────
    print("Step 1/6: INGESTION - Fetching live KPI data...\n")
    try:
        raw_data = run_ingestion()
        print(f"✓ Ingestion complete. Fetched {len(raw_data.get('current', {}))} KPI metrics.\n")
        pipeline_output["ingestion"] = {"status": "SUCCESS", "data": raw_data}
    except Exception as e:
        print(f"✗ Ingestion failed: {e}\n")
        return {"status": "FAILED", "error": str(e)}
    
    # ──────────────────────────────────────────────────────────────────────────
    # STEP 2: SIGNAL DETECTION
    # ──────────────────────────────────────────────────────────────────────────
    print("Step 2/6: SIGNAL DETECTION - Analyzing KPI anomalies...\n")
    try:
        signal_output = detect_signals(raw_data)
        alert = signal_output.get("alert", False)
        severity = signal_output.get("severity", "LOW")
        
        if alert:
            print(f"🔴 ANOMALY DETECTED - Severity: {severity}")
            print(f"   Signals: {[s['type'] for s in signal_output.get('signals', [])]}")
            print(f"   Confidence: {signal_output.get('confidence', 0):.0%}\n")
        else:
            print("✓ No anomalies detected. Stopping pipeline.\n")
            return {"status": "NO_ANOMALY", "signal_output": signal_output}
        
        pipeline_output["signal_detection"] = signal_output
    except Exception as e:
        print(f"✗ Signal detection failed: {e}\n")
        return {"status": "FAILED", "error": str(e)}
    
    # ──────────────────────────────────────────────────────────────────────────
    # STEP 3: DIAGNOSIS
    # ──────────────────────────────────────────────────────────────────────────
    print("Step 3/6: DIAGNOSIS - Identifying root causes...\n")
    try:
        diagnosis_output = diagnose_causes(signal_output, raw_data)
        causes = diagnosis_output.get("diagnosed_causes", [])
        
        print(f"✓ Diagnosis complete. Identified {len(causes)} root cause(s):")
        for i, cause in enumerate(causes, 1):
            print(f"   {i}. {cause['cause']} (confidence: {cause['confidence']:.0%})")
        print()
        
        if diagnosis_output.get("fraud_score", 0) > 0.65:
            print(f"⚠️  FRAUD ALERT: Score {diagnosis_output['fraud_score']:.2f} (>0.65 threshold)\n")
        
        pipeline_output["diagnosis"] = diagnosis_output
    except Exception as e:
        print(f"✗ Diagnosis failed: {e}\n")
        return {"status": "FAILED", "error": str(e)}
    
    # ──────────────────────────────────────────────────────────────────────────
    # STEP 4: STRATEGY
    # ──────────────────────────────────────────────────────────────────────────
    print("Step 4/6: STRATEGY - Recommending optimization strategies...\n")
    try:
        strategy_output = recommend_strategies(diagnosis_output, raw_data)
        strategies = strategy_output.get("strategies", [])
        primary = strategy_output.get("primary_strategy", {})
        
        print(f"✓ Strategy generation complete. {len(strategies)} option(s) available:")
        for i, strat in enumerate(strategies, 1):
            print(f"   {i}. {strat['action_type']}")
            print(f"      Uplift: +{strat['expected_uplift_pct']:.1f}% | Budget: ${strat['budget_required']:,.0f} | ROI: {strat['expected_roi']:.1f}x")
        print(f"\n   Selected: {primary.get('action_type')} (best ROI)\n")
        
        pipeline_output["strategy"] = strategy_output
    except Exception as e:
        print(f"✗ Strategy generation failed: {e}\n")
        return {"status": "FAILED", "error": str(e)}
    
    # ──────────────────────────────────────────────────────────────────────────
    # STEP 5: SIMULATION
    # ──────────────────────────────────────────────────────────────────────────
    print("Step 5/6: SIMULATION - Running 500-trial Monte Carlo...\n")
    try:
        simulation_output = simulate_strategy(strategy_output, diagnosis_output, raw_data)
        
        baseline_rev = simulation_output["simulated_metrics"]["revenue"]["baseline"]
        median_rev = simulation_output["simulated_metrics"]["revenue"]["median"]
        uplift = median_rev - baseline_rev
        confidence = simulation_output.get("confidence", 0)
        
        print(f"✓ Simulation complete.")
        print(f"   Baseline revenue: ${baseline_rev:,.0f}")
        print(f"   Median projected: ${median_rev:,.0f}")
        print(f"   Expected uplift: ${uplift:+,.0f} ({uplift/baseline_rev*100:+.1f}%)")
        print(f"   Confidence: {confidence:.0%}\n")
        
        pipeline_output["simulation"] = simulation_output
    except Exception as e:
        print(f"✗ Simulation failed: {e}\n")
        return {"status": "FAILED", "error": str(e)}
    
    # ──────────────────────────────────────────────────────────────────────────
    # STEP 6: DECISION
    # ──────────────────────────────────────────────────────────────────────────
    print("Step 6/6: DECISION - Applying governance policies...\n")
    try:
        decision_output = make_decision(simulation_output, strategy_output, diagnosis_output, signal_output)
        decision = decision_output.get("decision", "NOTIFY")
        decision_id = decision_output.get("decision_id", "")
        
        print(f"✓ Decision complete.")
        print(f"   Decision: {decision}")
        print(f"   Decision ID: {decision_id}")
        
        governance = decision_output.get("governance_check", {})
        violations = governance.get("violations", [])
        if violations:
            print(f"   Policy violations: {len(violations)}")
            for v in violations:
                print(f"      - {v['message']} ({v['severity']})")
        
        print()
        
        pipeline_output["decision"] = decision_output
    except Exception as e:
        print(f"✗ Decision failed: {e}\n")
        return {"status": "FAILED", "error": str(e)}
    
    # ──────────────────────────────────────────────────────────────────────────
    # STEP 7: EXECUTION (conditional)
    # ──────────────────────────────────────────────────────────────────────────
    decision_type = decision_output.get("decision", "NOTIFY")
    should_execute = decision_type == "AUTO" or (decision_type == "NOTIFY" and not execute_approved_only)
    
    if should_execute:
        print("EXECUTION - Deploying strategy...\n")
        try:
            execution_output = execute_strategy(decision_output, approved=(decision_type != "AUTO"))
            status = execution_output.get("execution_status", "UNKNOWN")
            deployment_id = execution_output.get("deployment_id", "")
            
            print(f"✓ Execution complete.")
            print(f"   Status: {status}")
            print(f"   Deployment ID: {deployment_id}\n")
            
            pipeline_output["execution"] = execution_output
        except Exception as e:
            print(f"✗ Execution failed: {e}\n")
            return {"status": "FAILED", "error": str(e)}
    else:
        print(f"⏸️  Execution paused - awaiting {decision_type} review\n")
        pipeline_output["execution"] = {
            "status": "PENDING_APPROVAL",
            "decision_type": decision_type,
            "decision_id": decision_output.get("decision_id")
        }
    
    # ──────────────────────────────────────────────────────────────────────────
    # PIPELINE COMPLETE
    # ──────────────────────────────────────────────────────────────────────────
    print("="*70)
    print(" PIPELINE EXECUTION COMPLETE")
    print("="*70 + "\n")
    
    pipeline_output["status"] = "SUCCESS"
    pipeline_output["timestamp"] = signal_output.get("log", {}).get("timestamp", "")
    
    return pipeline_output


if __name__ == "__main__":
    result = run_pipeline()
    print("\n" + "="*70)
    print(" FULL PIPELINE OUTPUT")
    print("="*70 + "\n")
    print(json.dumps(result, indent=2, default=str))