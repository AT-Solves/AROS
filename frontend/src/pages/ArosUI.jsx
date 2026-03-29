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
import ActionCenterSignals from "../components/ActionCenterSignals";
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

const T = {
  card: "#ffffff",
  cardAlt: "#f4f7f1",
  border: "#d7e2d8",
  primary: "#2f6f4f",
  primarySoft: "#e6f2ec",
  text: "#1a2e22",
  muted: "#5a7a65",
  badge: "#c8e6d0",
};

function StatusBadge({ status }) {
  const color = status === "complete" ? T.primary : status === "in-progress" ? "#b08b00" : "#888";
  const bg = status === "complete" ? T.primarySoft : status === "in-progress" ? "#fff8dc" : "#f5f5f5";
  return (
    <span style={{ background: bg, color, border: `1px solid ${color}40`, borderRadius: 4, padding: "2px 8px", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase" }}>
      {String(status || "pending").replace("_", " ")}
    </span>
  );
}

function ActionCenterView({ viewModel, loading, error, onRetry }) {
  const statusValues = Object.values(viewModel.statusByStage || {});
  const completedCount = statusValues.filter((s) => s === "complete").length;
  const inProgressCount = statusValues.filter((s) => s === "in-progress").length;
  const blockedCount = statusValues.filter((s) => s === "blocked").length;

  const signals = viewModel.stageDetails?.signal_detection?.signals || [];
  const decision = viewModel.stageDetails?.decision;
  const revenueInsights = viewModel.revenueInsights || {
    potentialRevenueLeaked: 0,
    potentialRevertable: 0,
    alreadyReverted: 0,
  };

  const currency = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

  const metricCards = [
    { label: "Total Decisions", value: viewModel.totalDecisions },
    { label: "Latest Decision ID", value: viewModel.latestDecisionId || "N/A", compact: true },
    { label: "Completed Stages", value: completedCount },
    { label: "In Progress", value: inProgressCount },
    { label: "Blocked Stages", value: blockedCount },
    { label: "Execution Mode", value: viewModel.executionMode || "N/A" },
  ];

  if (loading) return <EmptyWorkspace message="Loading pipeline data..." onRetry={onRetry} />;
  if (error) return <EmptyWorkspace message={error} onRetry={onRetry} />;

  return (
    <div className="fade-in-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Primary Validation Scenario */}
      <div
        className="card"
        style={{
          padding: 24,
          border: `2px solid ${T.primary}`,
          background: "linear-gradient(180deg, #eff8f3 0%, #ffffff 100%)",
          boxShadow: "0 8px 24px rgba(47, 111, 79, 0.12)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
          <h3 style={{ margin: 0, color: T.text, fontSize: "1.03rem", fontWeight: 800 }}>
            Revenue Insights
          </h3>
          <span
            style={{
              border: `1px solid ${T.border}`,
              borderRadius: 20,
              background: T.primarySoft,
              color: T.primary,
              padding: "3px 11px",
              fontSize: "0.72rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            High Priority
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 12 }}>
          <div style={{ background: "#ffffff", border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: "0.73rem", color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>
              Potential Revenue Leaked
            </div>
            <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#b02020", marginBottom: 5 }}>
              {currency.format(revenueInsights.potentialRevenueLeaked || 0)}
            </div>
            <div style={{ fontSize: "0.74rem", color: T.muted, lineHeight: 1.35 }}>
              previous revenue minus current revenue from ingestion KPI window
            </div>
          </div>

          <div style={{ background: "#ffffff", border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: "0.73rem", color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>
              Potential Revertable
            </div>
            <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#b08b00", marginBottom: 5 }}>
              {currency.format(revenueInsights.potentialRevertable || 0)}
            </div>
            <div style={{ fontSize: "0.74rem", color: T.muted, lineHeight: 1.35 }}>
              best available among simulation median uplift, decision expected impact amount, or expected uplift percent applied to current revenue
            </div>
          </div>

          <div style={{ background: "#ffffff", border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: "0.73rem", color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>
              Already Reverted
            </div>
            <div style={{ fontSize: "1.15rem", fontWeight: 800, color: T.primary, marginBottom: 5 }}>
              {currency.format(revenueInsights.alreadyReverted || 0)}
            </div>
            <div style={{ fontSize: "0.74rem", color: T.muted, lineHeight: 1.35 }}>
              execution actual revenue change (or actual outcome revenue fields when present)
            </div>
          </div>
        </div>
      </div>

      {/* Signal List */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h3 style={{ margin: 0, color: T.text, fontSize: "1rem", fontWeight: 700 }}>
            Detected Signals
          </h3>
          <span style={{
            background: signals.length > 0 ? "#fdecea" : T.primarySoft,
            color: signals.length > 0 ? "#b02020" : T.primary,
            border: `1px solid ${signals.length > 0 ? "#f5c6cb" : T.border}`,
            borderRadius: 20, padding: "3px 12px", fontSize: "0.75rem", fontWeight: 700,
          }}>
            {signals.length} signal{signals.length !== 1 ? "s" : ""}
          </span>
        </div>
        <ActionCenterSignals
          signals={signals}
          decision={decision}
          diagnosis={viewModel.stageDetails?.diagnosis}
          strategy={viewModel.stageDetails?.strategy}
          simulation={viewModel.stageDetails?.simulation}
        />
      </div>

      {/* Pipeline Stage Status */}
      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ margin: "0 0 16px", color: T.text, fontSize: "1rem", fontWeight: 700 }}>Pipeline Stage Status</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(viewModel.pipelineStages || []).map((stage) => {
            const status = viewModel.statusByStage?.[stage.id];
            const details = viewModel.stageDetails?.[stage.id] || {};
            const metricKeys = Object.keys(details).filter((k) => typeof details[k] !== "object" && typeof details[k] !== "undefined").slice(0, 2);
            return (
              <div key={stage.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: T.cardAlt, borderRadius: 7, border: `1px solid ${T.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontWeight: 600, color: T.text, fontSize: "0.9rem" }}>{stage.label}</span>
                  {metricKeys.map((k) => (
                    <span key={k} style={{ fontSize: "0.75rem", color: T.muted }}>
                      {k}: <strong style={{ color: T.text }}>{String(details[k])}</strong>
                    </span>
                  ))}
                </div>
                <StatusBadge status={status} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Latest Decision Summary */}
      {viewModel.stageDetails?.decision ? (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ margin: "0 0 16px", color: T.text, fontSize: "1rem", fontWeight: 700 }}>Latest Decision Summary</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {Object.entries(viewModel.stageDetails.decision)
              .filter(([, v]) => typeof v !== "object" && v !== undefined && v !== null)
              .slice(0, 6)
              .map(([k, v]) => (
                <div key={k} style={{ background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 8, padding: "12px 16px" }}>
                  <div style={{ fontSize: "0.72rem", color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{k.replace(/_/g, " ")}</div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 600, color: T.text }}>{String(v)}</div>
                </div>
              ))}
          </div>
        </div>
      ) : null}

      {/* Reflection Summary */}
      {viewModel.stageDetails?.reflection?.evaluation ? (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ margin: "0 0 16px", color: T.text, fontSize: "1rem", fontWeight: 700 }}>Reflection Summary</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
            <span style={{ fontSize: "2rem", fontWeight: 800, color: T.primary }}>{viewModel.stageDetails.reflection.evaluation.score ?? "—"}</span>
            <div>
              <div style={{ fontSize: "0.8rem", color: T.muted }}>Readiness Score</div>
              <StatusBadge status={viewModel.stageDetails.reflection.evaluation.status} />
            </div>
            <div style={{ flex: 1, background: T.border, borderRadius: 4, height: 8, overflow: "hidden" }}>
              <div style={{ width: `${viewModel.stageDetails.reflection.evaluation.score ?? 0}%`, background: T.primary, height: "100%", borderRadius: 4 }} />
            </div>
          </div>
          {viewModel.stageDetails.reflection.learning?.summary ? (
            <p style={{ margin: 0, color: T.muted, fontSize: "0.88rem", lineHeight: 1.5 }}>
              {viewModel.stageDetails.reflection.learning.summary}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Operational Metrics */}
      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ margin: "0 0 16px", color: T.text, fontSize: "1rem", fontWeight: 700 }}>Operational Metrics</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
          {metricCards.map(({ label, value, helper, compact }) => (
            <div key={label} style={{ background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 8, padding: "14px 16px" }}>
              <div style={{ fontSize: "0.72rem", color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{label}</div>
              <div
                style={{
                  fontSize: compact ? "0.95rem" : "1.25rem",
                  lineHeight: compact ? 1.25 : 1.1,
                  fontWeight: 700,
                  color: T.primary,
                  wordBreak: "break-word",
                  overflowWrap: "anywhere",
                }}
              >
                {value}
              </div>
              {helper ? (
                <div style={{ marginTop: 6, fontSize: "0.7rem", color: T.muted, lineHeight: 1.35 }}>{helper}</div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ArosUI() {
  const [overview, setOverview] = useState(null);
  const [selectedStage, setSelectedStage] = useState("ingestion");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [operatorAction, setOperatorAction] = useState("");
  const [activeTab, setActiveTab] = useState("action-center");

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
          activeTab={activeTab}
          setActiveTab={setActiveTab}
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

        {activeTab === "action-center" ? (
          <ActionCenterView
            viewModel={viewModel}
            loading={loading}
            error={error}
            onRetry={handleRefresh}
          />
        ) : (
          <>
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
          </>
        )}
      </div>
    </Layout>
  );
}