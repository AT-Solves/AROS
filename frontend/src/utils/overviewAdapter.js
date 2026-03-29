const PIPELINE_STAGES = [
  { id: "ingestion", label: "Ingestion" },
  { id: "signal_detection", label: "Signal Detection" },
  { id: "diagnosis", label: "Diagnosis" },
  { id: "strategy", label: "Strategy" },
  { id: "simulation", label: "Simulation" },
  { id: "decision", label: "Decision" },
  { id: "execution", label: "Execution" },
  { id: "reflection", label: "Reflection" }
];

const STAGE_META = {
  ingestion: {
    title: "Ingestion Agent",
    description:
      "Collects operational and revenue telemetry from core systems to establish pipeline context.",
    workflow: [
      "Read latest KPI and behavior records from persistence tables.",
      "Assemble baseline and current windows for comparison.",
      "Pass normalized context to Signal Detection."
    ],
    inputSources: ["decisions", "signal_history", "baseline_calibration"]
  },
  signal_detection: {
    title: "Signal Detection Agent",
    description:
      "Identifies anomalies, spikes, and degradation patterns requiring downstream diagnosis.",
    workflow: [
      "Evaluate KPI drift and event anomalies.",
      "Assign severity and confidence for each signal.",
      "Publish prioritized signals for root-cause analysis."
    ],
    inputSources: ["ingestion context", "signal history"]
  },
  diagnosis: {
    title: "Diagnosis Agent",
    description:
      "Explains likely causes behind abnormal metrics and determines operational urgency.",
    workflow: [
      "Correlate signals with known failure patterns.",
      "Estimate causal confidence and uncertainty.",
      "Deliver causes and risk indicators to strategy."
    ],
    inputSources: ["signal_detection output", "system_health"]
  },
  strategy: {
    title: "Strategy Agent",
    description:
      "Generates candidate mitigations and ranks interventions by expected business impact.",
    workflow: [
      "Enumerate potential remediation actions.",
      "Estimate impact versus risk for each option.",
      "Select primary strategy for simulation."
    ],
    inputSources: ["diagnosis output", "strategy_performance_log"]
  },
  simulation: {
    title: "Simulation Agent",
    description:
      "Runs scenario projections to estimate uplift, confidence, and downside risk before action.",
    workflow: [
      "Simulate candidate strategies against baseline.",
      "Compare projected conversion and revenue outcomes.",
      "Recommend highest confidence scenario."
    ],
    inputSources: ["strategy output", "baseline calibration"]
  },
  decision: {
    title: "Decision Agent",
    description:
      "Applies governance policies and determines whether to execute, investigate, or defer.",
    workflow: [
      "Validate policy compliance and blast radius.",
      "Assess risk, confidence, and required approvals.",
      "Issue final decision and rationale."
    ],
    inputSources: ["simulation output", "governance policies"]
  },
  execution: {
    title: "Execution Agent",
    description:
      "Applies approved actions and emits operational notifications with rollback context.",
    workflow: [
      "Validate execution gates and operator approvals.",
      "Run action or produce recommendation-only mode.",
      "Record deployment metadata and notification outputs."
    ],
    inputSources: ["decision output", "execution guardrails"]
  },
  reflection: {
    title: "Reflection Agent",
    description:
      "Compares expected versus actual outcomes and captures learnings for future policy tuning.",
    workflow: [
      "Collect post-execution outcomes and KPIs.",
      "Measure strategy effectiveness and variance.",
      "Store learning insights for future runs."
    ],
    inputSources: ["execution result", "actual_outcome_30min"]
  }
};

const STAGE_KEY_PATHS = {
  ingestion: null,
  signal_detection: ["signal_detection"],
  diagnosis: ["diagnosis"],
  strategy: ["strategy"],
  simulation: ["simulation"],
  decision: ["decision_output"],
  execution: ["execution_result"],
  reflection: ["actual_outcome_30min", "reflection"]
};

function isObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function hasContent(value) {
  if (value == null) {
    return false;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (isObject(value)) {
    return Object.keys(value).length > 0;
  }
  return true;
}

function getByPath(source, path) {
  return path.split(".").reduce((acc, key) => (acc ? acc[key] : undefined), source);
}

function getAgentDetails(overview, id) {
  const agent = (overview?.agents || []).find((entry) => entry.id === id);
  return agent?.details || {};
}

function normalizeDecisionDecision(decision) {
  return String(decision || "NO_ACTION").toUpperCase();
}

function normalizeDecisionDetails(rawDecision, latestDecision) {
  const governance = rawDecision?.governance_check || {};

  return {
    ...(rawDecision || {}),
    decision: rawDecision?.decision || latestDecision?.decision_type || "NO_ACTION",
    confidence: rawDecision?.confidence ?? latestDecision?.confidence ?? 0,
    risk_level:
      rawDecision?.risk_level ||
      governance?.blast_radius ||
      rawDecision?.blast_radius ||
      latestDecision?.blast_radius ||
      "unknown",
    reason:
      rawDecision?.reason ||
      rawDecision?.justification ||
      governance?.reasoning ||
      "No decision rationale available.",
    violations: rawDecision?.violations || governance?.violations || [],
    requires_human_approval:
      rawDecision?.requires_human_approval || governance?.required_approvals || []
  };
}

function normalizeExecutionStatus(execution, decision) {
  const executionStatus = String(execution?.execution_status || "").toUpperCase();

  if (["SUCCESS", "EXECUTED", "APPLIED"].includes(executionStatus)) {
    return "applied";
  }

  if (execution?.executed === true) {
    return "applied";
  }

  if (normalizeDecisionDecision(decision?.decision) !== "EXECUTE") {
    return "recommended";
  }

  if (execution?.execution_status) {
    return String(execution.execution_status).toLowerCase();
  }

  return "pending";
}

function buildTrendSeries(latestDecision, ingestionDetails) {
  const kpi = ingestionDetails?.kpi || latestDecision?.kpi || {};
  const previous = kpi.previous || {};
  const current = kpi.current || {};

  const rows = [
    {
      period: "Previous",
      revenue: previous.revenue ?? null,
      conversion: previous.conversion_rate ?? null,
      latency: previous.latency_ms ?? null,
      paymentFailure: previous.payment_failure_rate ?? null
    },
    {
      period: "Current",
      revenue: current.revenue ?? null,
      conversion: current.conversion_rate ?? null,
      latency: current.latency_ms ?? null,
      paymentFailure: current.payment_failure_rate ?? null
    }
  ];

  return rows.filter((row) =>
    ["revenue", "conversion", "latency", "paymentFailure"].some(
      (key) => row[key] !== null && row[key] !== undefined
    )
  );
}

function buildSimulationSeries(simulation, strategy) {
  const simulations = simulation?.simulations || [];

  if (simulations.length > 0) {
    return simulations.map((item, index) => ({
      scenario: item.action_type || `Scenario ${index + 1}`,
      revenueChange: item?.expected_impact?.revenue_change_pct ?? null,
      conversionChange: item?.expected_impact?.conversion_change_pct ?? null,
      confidence: item?.confidence ?? null
    }));
  }

  const strategyRows = strategy?.strategies || [];
  if (strategyRows.length > 0) {
    return strategyRows.map((item, index) => ({
      scenario: item.action_type || `Scenario ${index + 1}`,
      revenueChange: item?.expected_uplift_pct ?? null,
      conversionChange: null,
      confidence: item?.confidence ?? null
    }));
  }

  if (simulation?.action_type || simulation?.expected_uplift_pct != null) {
    return [
      {
        scenario: simulation?.action_type || "Recommended Action",
        revenueChange: simulation?.expected_uplift_pct ?? null,
        conversionChange: null,
        confidence: simulation?.confidence ?? null
      }
    ];
  }

  return simulations.map((item, index) => ({
    scenario: item.action_type || `Scenario ${index + 1}`,
    revenueChange: item?.expected_impact?.revenue_change_pct ?? null,
    conversionChange: item?.expected_impact?.conversion_change_pct ?? null,
    confidence: item?.confidence ?? null
  }));
}

function buildPipelineStatus(stageId, stageDetails, decisionDetails, executionDetails) {
  const decisionType = normalizeDecisionDecision(decisionDetails?.decision);

  if (stageId === "execution") {
    if (executionDetails?.executed === true) {
      return "complete";
    }
    if (decisionType !== "EXECUTE") {
      return "blocked";
    }
    return hasContent(executionDetails) ? "in-progress" : "pending";
  }

  if (stageId === "reflection") {
    if (hasContent(stageDetails.reflection)) {
      return "complete";
    }
    return hasContent(stageDetails.execution) ? "in-progress" : "pending";
  }

  return hasContent(stageDetails[stageId]) ? "complete" : "pending";
}

function getCurrentStage(statusByStage) {
  const firstInProgress = PIPELINE_STAGES.find(
    (stage) => statusByStage[stage.id] === "in-progress"
  );
  if (firstInProgress) {
    return firstInProgress.id;
  }

  const firstPending = PIPELINE_STAGES.find(
    (stage) => statusByStage[stage.id] === "pending"
  );

  return firstPending ? firstPending.id : "reflection";
}

export function buildOverviewViewModel(overview) {
  const latestDecision = overview?.latest_decision || {};
  const rawDecision =
    getAgentDetails(overview, "decision") ||
    getByPath(latestDecision, STAGE_KEY_PATHS.decision[0]);

  const ingestionAgentDetails = getAgentDetails(overview, "ingestion");

  const stageDetails = {
    ingestion: ingestionAgentDetails,
    signal_detection:
      getAgentDetails(overview, "signal_detection") ||
      getByPath(latestDecision, STAGE_KEY_PATHS.signal_detection[0]),
    diagnosis:
      getAgentDetails(overview, "diagnosis") ||
      getByPath(latestDecision, STAGE_KEY_PATHS.diagnosis[0]),
    strategy:
      getAgentDetails(overview, "strategy") ||
      getByPath(latestDecision, STAGE_KEY_PATHS.strategy[0]),
    simulation:
      getAgentDetails(overview, "simulation") ||
      getByPath(latestDecision, STAGE_KEY_PATHS.simulation[0]),
    decision: normalizeDecisionDetails(rawDecision, latestDecision),
    execution: getAgentDetails(overview, "execution") || getByPath(latestDecision, STAGE_KEY_PATHS.execution[0]),
    reflection:
      getAgentDetails(overview, "reflection") ||
      getByPath(latestDecision, STAGE_KEY_PATHS.reflection[0]) ||
      getByPath(latestDecision, STAGE_KEY_PATHS.reflection[1]) ||
      {}
  };

  const statusByStage = {};
  PIPELINE_STAGES.forEach((stage) => {
    statusByStage[stage.id] = buildPipelineStatus(
      stage.id,
      stageDetails,
      stageDetails.decision,
      stageDetails.execution
    );
  });

  return {
    raw: overview,
    latestDecisionId: overview?.latest_decision_id || null,
    totalDecisions: overview?.total_decisions || 0,
    statusCounts: overview?.status_counts || {},
    tableSummaries: overview?.table_summaries || {},
    links: overview?.links || {},
    stageDetails,
    statusByStage,
    currentStage: getCurrentStage(statusByStage),
    trendSeries: buildTrendSeries(latestDecision, ingestionAgentDetails),
    simulationSeries: buildSimulationSeries(stageDetails.simulation, stageDetails.strategy),
    executionMode: normalizeExecutionStatus(stageDetails.execution, stageDetails.decision),
    pipelineStages: PIPELINE_STAGES,
    stageMeta: STAGE_META
  };
}

export { PIPELINE_STAGES, STAGE_META };