import React, { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import Sidebar from "../components/Sidebar";
import Pipeline from "../components/Pipeline";
import AgentPanel from "../components/AgentPanel";
import ChartCard from "../components/ChartCard";
import DecisionCard from "../components/DecisionCard";
import ExecutionPanel from "../components/ExecutionPanel";
import ReflectionPanel from "../components/ReflectionPanel";
import IngestionPanel from "../components/IngestionPanel";
import SignalDetectionPanel from "../components/SignalDetectionPanel";
import DiagnosisPanel from "../components/DiagnosisPanel";
import StrategyPanel from "../components/StrategyPanel";
import SimulationPanel from "../components/SimulationPanel";
import DecisionPanel from "../components/DecisionPanel";
import { buildOverviewViewModel } from "../utils/overviewAdapter";
import "../styles/theme.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "/api" : "http://localhost:8000");

function EmptyWorkspace({ message, onRetry }) {
  return (
    <div className="card empty-workspace">
      <h3>Waiting for pipeline data</h3>
      <p>{message}</p>
      <button type="button" className="action-btn approve" onClick={onRetry}>
        Retry Load
      </button>
    </div>
  );
}

export default function ArosUI() {
  const [overview, setOverview] = useState(null);
  const [selectedStage, setSelectedStage] = useState("ingestion");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [operatorAction, setOperatorAction] = useState("");

  const viewModel = useMemo(() => buildOverviewViewModel(overview), [overview]);

  useEffect(() => {
    let cancelled = false;

    async function fetchOverview() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`${API_BASE}/agents/overview`);
        if (!response.ok) {
          throw new Error(`API error ${response.status}`);
        }
        const data = await response.json();
        if (!cancelled) {
          setOverview(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to fetch overview.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchOverview();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!viewModel.pipelineStages.find((stage) => stage.id === selectedStage)) {
      setSelectedStage(viewModel.currentStage);
    }
  }, [selectedStage, viewModel.currentStage, viewModel.pipelineStages]);

  const selectedDetails = viewModel.stageDetails[selectedStage] || {};

  function handleRefresh() {
    setOverview(null);
    setLoading(true);
    setError("");
    fetch(`${API_BASE}/agents/overview`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`API error ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        setOverview(data);
      })
      .catch((err) => {
        setError(err.message || "Failed to fetch overview.");
      })
      .finally(() => {
        setLoading(false);
      });
  }

  function handleDecisionAction(action) {
    setOperatorAction(`Operator action recorded: ${action.toUpperCase()}`);
  }

  return (
    <Layout
      sidebar={
        <Sidebar
          selected={selectedStage}
          setSelected={setSelectedStage}
          stages={viewModel.pipelineStages}
          statusByStage={viewModel.statusByStage}
          totalDecisions={viewModel.totalDecisions}
          latestDecisionId={viewModel.latestDecisionId}
        />
      }
    >
      <div className="main-stack">
        <header className="page-header fade-in-up">
          <div>
            <p className="eyebrow">AI DECISION CONTROL SYSTEM</p>
            <h2>AROS Workflow Explainability Center</h2>
            <p>
              Every stage is inspectable, policy-aware, and ready for human-in-the-loop governance.
            </p>
          </div>
          <button type="button" className="action-btn defer" onClick={handleRefresh}>
            Refresh Data
          </button>
        </header>

        <Pipeline
          stages={viewModel.pipelineStages}
          current={selectedStage}
          statusByStage={viewModel.statusByStage}
          onSelect={setSelectedStage}
        />

        {loading ? (
          <EmptyWorkspace message="Loading /agents/overview from local API..." onRetry={handleRefresh} />
        ) : null}

        {!loading && error ? <EmptyWorkspace message={error} onRetry={handleRefresh} /> : null}

        {!loading && !error ? (
          <>
            {operatorAction ? <p className="operator-feedback">{operatorAction}</p> : null}

            <div className={selectedStage === "ingestion" || selectedStage === "signal_detection" || selectedStage === "diagnosis" || selectedStage === "strategy" || selectedStage === "simulation" || selectedStage === "decision" || selectedStage === "execution" || selectedStage === "reflection" ? "workspace-full" : "workspace-grid"}>
              <section className="workspace-primary">
                {selectedStage === "ingestion" ? (
                  <IngestionPanel details={viewModel.stageDetails.ingestion} />
                ) : selectedStage === "signal_detection" ? (
                  <SignalDetectionPanel details={viewModel.stageDetails.signal_detection} />
                ) : selectedStage === "diagnosis" ? (
                  <DiagnosisPanel
                    details={viewModel.stageDetails.diagnosis}
                    liveSignals={viewModel.stageDetails.signal_detection?.signals || []}
                  />
                ) : selectedStage === "strategy" ? (
                  <StrategyPanel
                    details={viewModel.stageDetails.strategy}
                    diagnosis={viewModel.stageDetails.diagnosis}
                  />
                ) : selectedStage === "simulation" ? (
                  <SimulationPanel
                    details={viewModel.stageDetails.simulation}
                    strategy={viewModel.stageDetails.strategy}
                  />
                ) : selectedStage === "decision" ? (
                  <DecisionPanel
                    details={viewModel.stageDetails.decision}
                    simulation={viewModel.stageDetails.simulation}
                  />
                ) : selectedStage === "execution" ? (
                  <ExecutionPanel
                    execution={viewModel.stageDetails.execution}
                    executionMode={viewModel.executionMode}
                    decision={viewModel.stageDetails.decision}
                  />
                ) : selectedStage === "reflection" ? (
                  <ReflectionPanel
                    reflection={viewModel.stageDetails.reflection}
                    execution={viewModel.stageDetails.execution}
                    decision={viewModel.stageDetails.decision}
                    simulation={viewModel.stageDetails.simulation}
                  />
                ) : (
                  <AgentPanel
                    stage={selectedStage}
                    stageMeta={viewModel.stageMeta}
                    details={selectedDetails}
                    tableSummaries={viewModel.tableSummaries}
                  />
                )}
                <ChartCard trendSeries={viewModel.trendSeries} simulationSeries={viewModel.simulationSeries} />
              </section>

              {selectedStage !== "ingestion" && selectedStage !== "signal_detection" && selectedStage !== "diagnosis" && selectedStage !== "strategy" && selectedStage !== "simulation" && selectedStage !== "decision" && selectedStage !== "execution" && selectedStage !== "reflection" && (
                <section className="workspace-secondary">
                  <DecisionCard decision={viewModel.stageDetails.decision} onAction={handleDecisionAction} />
                  <ExecutionPanel
                    execution={viewModel.stageDetails.execution}
                    executionMode={viewModel.executionMode}
                  />
                  <ReflectionPanel
                    reflection={viewModel.stageDetails.reflection}
                    simulation={viewModel.stageDetails.simulation}
                  />
                </section>
              )}
            </div>
          </>
        ) : null}
      </div>
    </Layout>
  );
}