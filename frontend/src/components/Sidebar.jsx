import React from "react";

export default function Sidebar({ activeTab, setActiveTab }) {
  return (
    <div className="sidebar-content fade-in-up">
      <div className="brand-block">
        <p className="eyebrow">AROS CONTROL</p>
        <h1>Autonomous Revenue Optimization System</h1>
      </div>

      <div className="sidebar-tabs" role="tablist" aria-label="Navigation sections">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "action-center"}
          className={`sidebar-tab ${activeTab === "action-center" ? "active" : ""}`}
          onClick={() => setActiveTab("action-center")}
        >
          Action Center
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "workflow"}
          className={`sidebar-tab ${activeTab === "workflow" ? "active" : ""}`}
          onClick={() => setActiveTab("workflow")}
        >
          Workflow
        </button>
      </div>
    </div>
  );
}