# AROS – Pipeline Runner (Using Orchestrator)

import json

# ─────────────────────────────────────────────
# IMPORT AGENTS
# ─────────────────────────────────────────────
from agents.ingestion.aros_ingestion import run_ingestion
from agents.signal_detection.agent import detect_signals
from agents.diagnosis.agent import diagnose
from agents.strategy.agent import recommend_strategy
from agents.simulation.agent import simulate
from agents.decision.agent import make_decision
from agents.execution.agent import run_execution
from agents.reflection.agent import reflect

# ORCHESTRATOR
from agents.orchestrator.agent import Orchestrator


# ─────────────────────────────────────────────
# PIPELINE RUNNER (ENTRY POINT)
# ─────────────────────────────────────────────
def run_pipeline():

    print("\n=== 🚀 AROS PIPELINE (ORCHESTRATED) START ===\n")

    orchestrator = Orchestrator()

    agents = {
        "ingestion": run_ingestion,
        "signal": detect_signals,
        "diagnosis": diagnose,
        "strategy": recommend_strategy,
        "simulation": simulate,
        "decision": make_decision,
        "execution": run_execution,
        "reflection": reflect
    }

    # Run full orchestrated workflow
    final_context = orchestrator.run(agents)

    print("\n=== ✅ FINAL OUTPUT ===\n")
    print(json.dumps(final_context, indent=2))

    return final_context


# ─────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────
if __name__ == "__main__":
    run_pipeline()