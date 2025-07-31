// src/pages/TAIDPage.tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import {
  BarChart, Bar, LineChart, Line, HeatmapChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell
} from 'recharts';

const SEVERITY_COLORS = {
  low: '#82ca9d',
  medium: '#ffc658',
  high: '#ff7c7c',
  critical: '#d32f2f',
};

function TAIDPage() {
  const [selectedExperimentId, setSelectedExperimentId] = useState<string | null>(null);

  // Fetch list of experiments
  const { data: experimentsData } = useQuery({
    queryKey: ['experiments'],
    queryFn: () => apiClient.get('/eapp/experiments'),
  });

  // Fetch experiment report
  const { data: reportData, isLoading: reportLoading } = useQuery({
    queryKey: ['experiment-report', selectedExperimentId],
    queryFn: () => apiClient.get(`/taid/reports/${selectedExperimentId}`),
    enabled: !!selectedExperimentId,
  });

  const report = reportData?.data;

  return (
    <div className="taid-container">
      <h2>Test Analytics & Insights Dashboard</h2>
      <p style={{ marginBottom: '2rem' }}>Analyze model performance under various degradation conditions.</p>

      <div style={{ marginBottom: '2rem' }}>
        <label>Select Experiment:</label>
        <select 
          value={selectedExperimentId || ''}
          onChange={(e) => setSelectedExperimentId(e.target.value || null)}
          style={{ marginLeft: '1rem', padding: '0.5rem' }}
        >
          <option value="">-- Select an experiment --</option>
          {experimentsData?.data?.map((exp: any) => (
            <option key={exp.id} value={exp.id}>
              {exp.name} ({exp.status}) - {new Date(exp.createdAt).toLocaleDateString()}
            </option>
          ))}
        </select>
      </div>

      {selectedExperimentId && report && (
        <div className="report-content">
          {/* Summary Card */}
          <div className="card" style={{ marginBottom: '2rem' }}>
            <div className="card-header">
              <h3>Experiment Summary</h3>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                <div className="stat-box">
                  <h4>{report.summary.totalImages}</h4>
                  <p>Total Images</p>
                </div>
                <div className="stat-box">
                  <h4>{report.summary.modelsAnalyzed}</h4>
                  <p>Models Analyzed</p>
                </div>
                <div className="stat-box">
                  <h4>{report.summary.degradationTypes.length}</h4>
                  <p>Degradation Types</p>
                </div>
                <div className="stat-box">
                  <h4>{report.experiment.status}</h4>
                  <p>Status</p>
                </div>
              </div>
            </div>
          </div>

          {/* Model Performance Comparison */}
          <div className="card" style={{ marginBottom: '2rem' }}>
            <div className="card-header">
              <h3>Model Performance Comparison</h3>
            </div>
            <div className="card-body" style={{ height: '400px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.visualizations.performanceComparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="model" stroke="#e0e0e0" />
                  <YAxis stroke="#e0e0e0" domain={[0, 1]} />
                  <Tooltip contentStyle={{ backgroundColor: '#2a2a2a', border: '1px solid #333' }} />
                  <Legend />
                  <Bar dataKey="mAP" fill="#6A5ACD" name="mAP" />
                  <Bar dataKey="precision" fill="#82ca9d" name="Precision" />
                  <Bar dataKey="recall" fill="#ffc658" name="Recall" />
                  <Bar dataKey="f1Score" fill="#8884d8" name="F1 Score" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Degradation Impact Heatmap */}
          <div className="card" style={{ marginBottom: '2rem' }}>
            <div className="card-header">
              <h3>Degradation Impact Analysis</h3>
            </div>
            <div className="card-body">
              <div className="heatmap-container">
                {report.visualizations.degradationHeatmap.map((item: any, idx: number) => (
                  <div key={idx} className="heatmap-row" style={{ display: 'flex', marginBottom: '0.5rem' }}>
                    <div style={{ width: '150px', padding: '0.5rem' }}>{item.model}</div>
                    <div style={{ width: '150px', padding: '0.5rem' }}>{item.degradation}</div>
                    <div 
                      style={{ 
                        flex: 1, 
                        padding: '0.5rem',
                        backgroundColor: SEVERITY_COLORS[item.severity],
                        color: item.severity === 'critical' || item.severity === 'high' ? 'white' : 'black',
                        borderRadius: '4px',
                      }}
                    >
                      {(item.dropRate * 100).toFixed(1)}% accuracy drop
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Critical Findings & Recommendations */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div className="card">
              <div className="card-header">
                <h3>Critical Findings</h3>
              </div>
              <div className="card-body">
                <ul>
                  {report.modelPerformance[0]?.insights?.criticalFindings?.map((finding: string, idx: number) => (
                    <li key={idx} style={{ marginBottom: '0.5rem' }}>{finding}</li>
                  )) || <li>No critical issues detected</li>}
                </ul>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3>Recommendations</h3>
              </div>
              <div className="card-body">
                <ul>
                  {report.recommendations?.map((rec: string, idx: number) => (
                    <li key={idx} style={{ marginBottom: '0.5rem' }}>{rec}</li>
                  )) || <li>No specific recommendations</li>}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TAIDPage;