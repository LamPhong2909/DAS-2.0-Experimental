import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createScrapeJob, getJobStatus, ScrapeWebRequest, ScrapingJob } from '../api/client';
import { AxiosResponse } from 'axios';

const JobStatusDisplay = ({ jobId }: { jobId: string | null }) => {
    const { data, error, isLoading } = useQuery<AxiosResponse<ScrapingJob>, Error>({
        queryKey: ['jobStatus', jobId],
        queryFn: () => getJobStatus(jobId!),
        enabled: !!jobId,
        refetchInterval: (query) => {
            const status = query.state.data?.data?.status;
            // Stop refetching if the job is completed or failed
            return (status === 'PENDING' || status === 'ACTIVE') ? 3000 : false;
        },
    });

    if (!jobId) {
        return (
            <div className="card">
                <div className="card-body">
                    <p>No job has been created in this session yet. Submit a new job to begin tracking.</p>
                </div>
            </div>
        );
    }
    
    const jobData = data?.data;

    return (
        <div className="card">
            <div className="card-header">
                <h3>Job Status</h3>
            </div>
            <div className="card-body">
                {isLoading && !jobData && <p>Loading job status...</p>}
                {error && <p className="text-danger">Error fetching job status: {error.message}</p>}
                {jobData && (
                    <div>
                        <p><strong>Job ID:</strong> {jobData.id}</p>
                        <p><strong>Status:</strong> <span className={`status status-${jobData.status.toLowerCase()}`}>{jobData.status}</span></p>
                        <p><strong>Progress:</strong></p>
                        <div className="progress-bar-container">
                            <div className="progress-bar" style={{ width: `${jobData.progress || 0}%` }}>
                                {jobData.progress || 0}%
                            </div>
                        </div>
                        <details style={{marginTop: '1rem'}}>
                            <summary>View Full Details</summary>
                            <pre style={{ background: '#1e1e1e', padding: '1rem', borderRadius: '8px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', marginTop: '0.5rem' }}>
                                {JSON.stringify(jobData, null, 2)}
                            </pre>
                        </details>
                    </div>
                )}
            </div>
        </div>
    );
};


function DAMPage() {
    const [urls, setUrls] = useState('https://www.lsuagcenter.com/topics/crops/rice/diseases');
    const [selector, setSelector] = useState('img');
    const [lastJobId, setLastJobId] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (data: ScrapeWebRequest) => createScrapeJob(data),
        onSuccess: (response) => {
            const jobId = response.data.jobId; 
            if (jobId) {
                setLastJobId(jobId);
                queryClient.invalidateQueries({ queryKey: ['jobStatus', jobId] });
            } else {
                alert('Job queued, but could not get Job ID from backend. Polling is not possible.');
            }
        },
        onError: (error: any) => {
            console.error('Failed to create job:', error);
            alert(`Failed to create job: ${error.response?.data?.message || error.message}`);
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload: ScrapeWebRequest = {
            urls: urls.split('\n').map(url => url.trim()).filter(Boolean),
            rules: { selector }
        };
        if (payload.urls.length === 0) {
            alert("Please provide at least one URL.");
            return;
        }
        mutation.mutate(payload);
    };

    return (
        <div>
            <h2>Data Acquisition Matrix (DAM)</h2>
            <p style={{marginBottom: '1.5rem'}}>Create and monitor data scraping jobs.</p>
            
            <div className="card" style={{marginBottom: '2rem'}}>
                <div className="card-header"><h3>Create New Scrape Job</h3></div>
                <div className="card-body">
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label htmlFor="urls" style={{display: 'block', marginBottom: '0.5rem'}}>Seed URLs (one per line)</label>
                            <textarea
                                id="urls"
                                value={urls}
                                onChange={(e) => setUrls(e.target.value)}
                                className="form-input"
                                style={{width: '100%', minHeight: '80px', padding: '0.5rem'}}
                                rows={4}
                                placeholder='e.g. https://www.example.com/gallery1&#10;https://www.example.com/gallery2'
                            />
                        </div>
                        <div>
                            <label htmlFor="selector" style={{display: 'block', marginBottom: '0.5rem'}}>CSS Selector for Target Elements</label>
                            <input
                                id="selector"
                                type="text"
                                value={selector}
                                onChange={(e) => setSelector(e.target.value)}
                                className="form-input"
                                style={{width: '100%', padding: '0.5rem'}}
                                placeholder="e.g., .gallery img"
                            />
                        </div>
                        <button type="submit" disabled={mutation.isPending} className="btn btn-primary" style={{ padding: '0.75rem', cursor: 'pointer', alignSelf: 'flex-start' }}>
                            {mutation.isPending ? 'Queuing Job...' : 'Create Scrape Job'}
                        </button>
                    </form>
                </div>
            </div>

            <JobStatusDisplay jobId={lastJobId} />
        </div>
    );
}

export default DAMPage;
