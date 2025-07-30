import axios from 'axios';

// API Gateway base URL from environment variables (for production)
// or local development default.
const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor for attaching JWT tokens to requests
apiClient.interceptors.request.use(
  (config) => {
    // const token = localStorage.getItem('jwt_token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Interceptor for handling global API errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // e.g., handle 401 Unauthorized errors by redirecting to login
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  },
);

// --- Type Definitions ---

interface ScrapeRules {
  selector: string;
  depth?: number;
}

export interface ScrapeWebRequest {
  urls: string[];
  rules: ScrapeRules;
  priority?: number;
}

export interface ScrapingJob {
  id: string;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'FAILED';
  progress: number;
  payload: ScrapeWebRequest;
  logs: string[];
  createdAt: string; // ISO Date string
  updatedAt: string; // ISO Date string
}

// --- API Functions ---

// DAM Service
export const createScrapeJob = (data: ScrapeWebRequest) => apiClient.post<{ jobId: string }>('/dam/jobs/scrape-web', data);
export const getJobStatus = (jobId: string) => apiClient.get<ScrapingJob>(`/dam/jobs/${jobId}`);

// Add other API functions for EAPP, TAID etc. here