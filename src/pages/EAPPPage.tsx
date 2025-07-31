// src/pages/EAPPPage.tsx
import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

interface DegradationConfig {
  type: string;
  parameters: Record<string, any>;
  enabled: boolean;
}

const AVAILABLE_DEGRADATIONS = [
  {
    type: 'motion_blur',
    name: 'Motion Blur',
    parameters: [
      { name: 'kernel_size', type: 'number', min: 3, max: 15, default: 5 },
      { name: 'angle', type: 'number', min: 0, max: 360, default: 0 },
    ],
  },
  {
    type: 'gaussian_blur',
    name: 'Gaussian Blur',
    parameters: [
      { name: 'sigma', type: 'number', min: 0.5, max: 5, default: 1.0, step: 0.1 },
    ],
  },
  {
    type: 'brightness',
    name: 'Brightness Adjustment',
    parameters: [
      { name: 'factor', type: 'number', min: 0.1, max: 2.0, default: 1.0, step: 0.1 },
    ],
  },
  {
    type: 'noise',
    name: 'Add Noise',
    parameters: [
      { name: 'level', type: 'number', min: 0, max: 1, default: 0.1, step: 0.05 },
    ],
  },
  {
    type: 'occlusion',
    name: 'Random Occlusions',
    parameters: [
      { name: 'count', type: 'number', min: 1, max: 10, default: 3 },
    ],
  },
];

function EAPPPage() {
  const [experimentName, setExperimentName] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [degradations, setDegradations] = useState<DegradationConfig[]>(
    AVAILABLE_DEGRADATIONS.map(d => ({
      type: d.type,
      parameters: d.parameters.reduce((acc, p) => ({ ...acc, [p.name]: p.default }), {}),
      enabled: false,
    }))
  );
  const [activeExperimentId, setActiveExperimentId] = useState<string | null>(null);

  // Fetch available tags
  const { data: tagsData } = useQuery({
    queryKey: ['media-tags'],
    queryFn: () => apiClient.get('/dam/media/tags'),
  });

  // Create experiment mutation
  const createExperimentMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/eapp/experiments', data),
    onSuccess: (response) => {
      setActiveExperimentId(response.data.id);
    },
  });

  // Monitor experiment status
  const { data: experimentStatus } = useQuery({
    queryKey: ['experiment-status', activeExperimentId],
    queryFn: () => apiClient.get(`/eapp/experiments/${activeExperimentId}`),
    enabled: !!activeExperimentId,
    refetchInterval: 2000,
  });

  const handleDegradationToggle = (index: number) => {
    const updated = [...degradations];
    updated[index].enabled = !updated[index].enabled;
    setDegradations(updated);
  };

  const handleParameterChange = (degIndex: number, paramName: string, value: number) => {
    const updated = [...degradations];
    updated[degIndex].parameters[paramName] = value;
    setDegradations(updated);
  };

  const handleCreateExperiment = () => {
    const enabledDegradations = degradations
      .filter(d => d.enabled)
      .map(d => ({ type: d.type, parameters: d.parameters }));

    if (enabledDegradations.length === 0) {
      alert('Please enable at least one degradation');
      return;
    }

    createExperimentMutation.mutate({
      name: experimentName || `Experiment ${new Date().toISOString()}`,
      configuration: {
        tags: selectedTags,
        degradations: enabledDegradations,
        limit: 100,
      },
    });
  };

  return (
    <div className="eapp-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <h2>Experimental Augmentation & Processing Pipeline</h2>
      <p style={{ marginBottom: '2rem' }}>Create controlled degradation experiments to test model robustness.</p>

      {!activeExperimentId ? (
        <div className="experiment-setup">
          <div className="card" style={{ marginBottom: '2rem' }}>
            <div className="card-header">
              <h3>Experiment Configuration</h3>
            </div>
            <div className="card-body">
              <div style={{ marginBottom: '1.5rem' }}>
                <label>Experiment Name</label>
                <input
                  type="text"
                  value={experimentName}
                  onChange={(e) => setExperimentName(e.target.value)}
                  placeholder="My Robustness Test"
                  style={{ width: '100%', padding: '0.5rem' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label>Filter by Tags</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {tagsData?.data?.map((tag: string) => (
                    <label key={tag} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <input
                        type="checkbox"
                        checked={selectedTags.includes(tag)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTags([...selectedTags, tag]);
                          } else {
                            setSelectedTags(selectedTags.filter(t => t !== tag));
                          }
                        }}
                      />
                      {tag}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Degradation Configuration</h3>
            </div>
            <div className="card-body">
              {AVAILABLE_DEGRADATIONS.map((degType, index) => {
                const config = degradations[index];
                return (
                  <div key={degType.type} className="degradation-item" 
                       style={{ 
                         marginBottom: '1.5rem', 
                         padding: '1rem', 
                         border: '1px solid #333',
                         borderRadius: '8px',
                         backgroundColor: config.enabled ? '#1e1e1e' : 'transparent'
                       }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                      <input
                        type="checkbox"
                        id={`deg-${degType.type}`}
                        checked={config.enabled}
                        onChange={() => handleDegradationToggle(index)}
                      />
                      <label htmlFor={`deg-${degType.type}`} style={{ marginLeft: '0.5rem', fontWeight: 'bold' }}>
                        {degType.name}
                      </label>
                    </div>
                    
                    {config.enabled && (
                      <div style={{ marginLeft: '2rem' }}>
                        {degType.parameters.map(param => (
                          <div key={param.name} style={{ marginBottom: '0.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                              {param.name}: {config.parameters[param.name]}
                            </label>
                            <input
                              type="range"
                              min={param.min}
                              max={param.max}
                              step={param.step || 1}
                              value={config.parameters[param.name]}
                              onChange={(e) => handleParameterChange(index, param.name, Number(e.target.value))}
                              style={{ width: '100%' }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <button 
            onClick={handleCreateExperiment}
            disabled={createExperimentMutation.isPending}
            className="btn btn-primary"
            style={{ marginTop: '2rem', padding: '0.75rem 2rem' }}
          >
            {createExperimentMutation.isPending ? 'Creating Experiment...' : 'Start Experiment'}
          </button>
        </div>
      ) : (
        <div className="experiment-monitor">
          <div className="card">
            <div className="card-header">
              <h3>Experiment Status</h3>
            </div>
            <div className="card-body">
              <p><strong>ID:</strong> {activeExperimentId}</p>
              <p><strong>Status:</strong> 
                <span className={`status status-${experimentStatus?.data?.status?.toLowerCase()}`}>
                  {experimentStatus?.data?.status}
                </span>
              </p>
              
              {experimentStatus?.data?.status === 'RUNNING' && (
                <div>
                  <p>Processing images with configured degradations...</p>
                  <div className="progress-bar-container">
                    <div className="progress-bar" style={{ width: '50%' }}>50%</div>
                  </div>
                </div>
              )}

              {experimentStatus?.data?.status === 'COMPLETED' && (
                <div>
                  <p>Experiment completed successfully!</p>
                  <button 
                    onClick={() => window.location.href = `/taid?experimentId=${activeExperimentId}`}
                    className="btn btn-primary"
                  >
                    View Analysis Results
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EAPPPage;