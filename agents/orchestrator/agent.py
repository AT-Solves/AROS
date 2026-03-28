# AROS – Orchestrator Agent (Dynamic Workflow Controller)

import json
from typing import Dict, Any


class Orchestrator:

    def __init__(self):
        self.state = {}

    # -------------------------------
    # DECIDE NEXT STEP
    # -------------------------------
    def next_step(self, stage: str, context: Dict[str, Any]) -> str:

        if stage == "ingestion":
            return "signal"

        if stage == "signal":
            signals = context.get("signals", [])
            if not signals:
                return "stop"
            return "diagnosis"

        if stage == "diagnosis":
            diagnosis = context.get("diagnosis", {})
            if diagnosis.get("uncertainty", True):
                return "investigate"
            return "strategy"

        if stage == "strategy":
            strategies = context.get("strategies", [])
            if not strategies:
                return "stop"
            return "simulation"

        if stage == "simulation":
            confidence = context.get("confidence", 0)
            if confidence < 0.5:
                return "strategy"  # retry strategy
            return "decision"

        if stage == "decision":
            decision = context.get("decision_output", {}).get("decision")

            if decision == "NO_ACTION":
                return "stop"

            if decision == "INVESTIGATE":
                return "investigate"

            return "execution"

        if stage == "execution":
            return "reflection"

        if stage == "reflection":
            effectiveness = context.get("reflection", {}).get("effectiveness")

            if effectiveness == "low":
                return "strategy"  # re-optimize

            return "stop"

        return "stop"

    # -------------------------------
    # RUN WORKFLOW
    # -------------------------------
    def run(self, agents: Dict[str, Any]) -> Dict[str, Any]:

        stage = "ingestion"
        context = {}

        print("\n=== ORCHESTRATED EXECUTION START ===\n")

        while True:

            print(f"Running stage: {stage.upper()}")

            if stage == "ingestion":
                context = agents["ingestion"]()

            elif stage == "signal":
                context = {**context, **agents["signal"](context)}

            elif stage == "diagnosis":
                context = {**context, **agents["diagnosis"](context)}

            elif stage == "strategy":
                context = {**context, **agents["strategy"](context)}

            elif stage == "simulation":
                context = {**context, **agents["simulation"](context)}

            elif stage == "decision":
                context = {**context, **agents["decision"](context)}

            elif stage == "execution":
                context = {**context, **agents["execution"](context)}

            elif stage == "reflection":
                context = {**context, **agents["reflection"](context)}

            elif stage == "investigate":
                print("⚠️ Investigation required. Stopping.")
                break

            elif stage == "stop":
                print("✅ Workflow complete.")
                break

            stage = self.next_step(stage, context)

        print("\n=== ORCHESTRATED EXECUTION END ===\n")

        return context