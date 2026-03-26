import sys
import json
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import ingestion
from ingestion.aros_ingestion import run_ingestion

# Import signal agent
from agents.signal_detection.agent import detect_signals


def run_pipeline():
    print("\n=== AROS PIPELINE STARTED ===\n")

    # Step 1: Ingestion
    print("Step 1: Fetching data from DB...")
    data = run_ingestion()

    # Step 2: Signal Detection
    print("\nStep 2: Running Signal Detection Agent...\n")
    signal_output = detect_signals(data)

    # Step 3: Output
    print("\n=== SIGNAL AGENT OUTPUT ===\n")
    print(json.dumps(signal_output, indent=2))

    return signal_output


if __name__ == "__main__":
    run_pipeline()