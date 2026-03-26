import React, { useState, useEffect } from 'react';
import MonitoringDashboard from './components/MonitoringDashboard';
import PipelineFlow from './components/PipelineFlow';
import DecisionExplorer from './components/DecisionExplorer';
import ApprovalCenter from './components/ApprovalCenter';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('monitoring');
  const [pipeline, setPipeline] = useState(null);
  const [selectedDecision, setSelectedDecision] = useState(null);
  const [ws, setWs] = useState(null);

  // Connect to WebSocket on mount
  useEffect(() => {
    const websocket = new WebSocket('ws://localhost:8000/ws');
    
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('WebSocket event:', data);
      
      // Handle different event types
      if (data.type === 'pipeline_complete') {
        console.log('Pipeline complete, fetching result');
      } else if (data.type === 'decision_approved') {
        console.log('Decision approved:', data.decision_id);
      }
    };
    
    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    setWs(websocket);
    
    return () => websocket.close();
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>🚀 AROS – Autonomous Revenue Optimization System</h1>
        <p>Real-time revenue anomaly detection & autonomous optimization</p>
      </header>

      <nav className="app-nav">
        <button
          className={`nav-btn ${activeTab === 'monitoring' ? 'active' : ''}`}
          onClick={() => setActiveTab('monitoring')}
        >
          📊 Real-Time Monitoring
        </button>
        <button
          className={`nav-btn ${activeTab === 'pipeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('pipeline')}
        >
          ⚙️ Pipeline Flow
        </button>
        <button
          className={`nav-btn ${activeTab === 'explorer' ? 'active' : ''}`}
          onClick={() => setActiveTab('explorer')}
        >
          🔍 Decision Explorer
        </button>
        <button
          className={`nav-btn ${activeTab === 'approval' ? 'active' : ''}`}
          onClick={() => setActiveTab('approval')}
        >
          ✋ Approval Center
        </button>
      </nav>

      <main className="app-main">
        {activeTab === 'monitoring' && (
          <MonitoringDashboard
            onSelectAlert={(decision) => {
              setSelectedDecision(decision);
              setActiveTab('explorer');
            }}
          />
        )}
        {activeTab === 'pipeline' && <PipelineFlow />}
        {activeTab === 'explorer' && (
          <DecisionExplorer decision={selectedDecision} />
        )}
        {activeTab === 'approval' && <ApprovalCenter ws={ws} />}
      </main>
    </div>
  );
}
