</head> <body> <div class="container"> <h1>TE4GRI: AI-Powered Smart Agriculture Ecosystem (Master Blueprint)</h1>
    <div class="vision-box">
        <h2 style="color: white; border: none; margin-top: 0;">"Clarity over Cleverness. Design for 100x."</h2>
        <p>Welcome to the official repository of <strong>TE4GRI</strong>. This is not just source code; this is the blueprint for the future of precision agriculture. This document serves as the <strong>Technical Specification (SRS)</strong>, <strong>Architecture Document (SAD)</strong>, and <strong>Operational Guide</strong> for the entire project.</p>
    </div>

   <div class="toc">
        <h2>📑 Table of Contents</h2>
        <ul>
            <li><a href="#vision">🔭 Vision & Mission</a></li>
            <li><a href="#architecture">🏗 System Architecture</a></li>
            <li><a href="#srs">📝 Software Requirements Specification (SRS)</a></li>
            <li><a href="#data">💎 Data Strategy: The Golden Record</a></li>
            <li><a href="#api">🔌 API Specification</a></li>
            <li><a href="#tech">🛠 Technology Stack</a></li>
            <li><a href="#testing">🧪 Testing Strategy</a></li>
            <li><a href="#risks">🛡 Risk Analysis & Cost</a></li>
            <li><a href="#installation">🚀 Installation & Development Guide</a></li>
        </ul>
    </div>

   <section id="vision">
        <h2>🔭 Vision & Mission</h2>
        <p><strong>TE4GRI</strong> is not just a crop disease diagnosis application. It is a <strong>Data-Centric AI</strong> system comprising:</p>
        
   <div class="component-card">
            <h3>1. TE4BOT</h3>
            <p>AI virtual assistant for disease diagnosis and cultivation advice based on context (weather, location).</p>
        </div>
        
   <div class="component-card">
            <h3>2. DAS (Dataset Acquisition System)</h3>
            <p>Automated data factory for collecting (DAM), labeling, and augmenting data (EAPP) to continuously improve AI models.</p>
        </div>
    </section>

   <section id="architecture">
        <h2>🏗 System Architecture</h2>
        <p>We implement <strong>Event-Driven Microservices</strong> architecture to ensure independent scalability and high fault tolerance.</p>
        
   <div class="diagram-container">
            <h3>Overview Diagram (Mermaid Context Diagram)</h3>
            <div class="mermaid">
                graph TD
                User((Farmer)) -->|Zalo Mini App| Zalo[Zalo Platform]
                Zalo -->|HTTPS/REST| APIGW[API Gateway / Load Balancer]
                
   subgraph "TE4GRI Cloud Infrastructure (K8s Cluster)"
                APIGW --> Auth[Auth Service]
                APIGW --> TE4BOT[AI Service (TE4BOT)]
                APIGW --> DAM[DAM Service (Crawler)]
                APIGW --> TAID[TAID Service (Analytics)]
                
   TE4BOT -->|Pub/Sub| MQ{Message Queue (RabbitMQ)}
                DAM -->|Pub/Sub| MQ
                
 MQ --> Worker[Background Workers (Image Processing)]
                MQ --> Noti[Notification Service]
                
   TE4BOT --> Redis[(Redis Cache)]
                TE4BOT --> DB[(PostgreSQL - Metadata)]
                Worker --> MinIO[(MinIO/S3 - Blob Storage)]
                TE4BOT -.->|External Call| WeatherAPI[Weather API]
                end
            </div>
        </div>
        
   <h3>Core Components</h3>
        
   <div class="component-card">
            <h4>1. API Gateway (Nginx/Kong)</h4>
            <p>Single entry point, handles Rate Limiting, SSL Termination, and Routing.</p>
        </div>
        
   <div class="component-card">
            <h4>2. Auth Service</h4>
            <p>Manages sessions, converts Zalo Access Token to Internal JWT.</p>
        </div>
        
   <div class="component-card">
            <h4>3. AI Service (TE4BOT)</h4>
            <p>The heart of the system. Contains Controller logic and Inference Engine.</p>
        </div>
        
   <div class="component-card">
            <h4>4. DAS Services (DAM/EAPP/TAID)</h4>
            <ul>
                <li><strong>DAM:</strong> Intelligent crawler for web data collection</li>
                <li><strong>EAPP:</strong> Image processing pipeline (Remove Background, Augmentation)</li>
                <li><strong>TAID:</strong> Model performance analytics dashboard</li>
            </ul>
        </div>
        
   <div class="component-card">
            <h4>5. Persistence Layer</h4>
            <ul>
                <li><strong>PostgreSQL:</strong> Relational data (Users, History, Disease Info)</li>
                <li><strong>Redis:</strong> Caching diagnosis results (TTL 1 hour) and Session Store</li>
                <li><strong>MinIO/S3:</strong> Object storage for raw and processed images</li>
            </ul>
        </div>
    </section>

   <section id="srs">
        <h2>📝 Software Requirements Specification (SRS)</h2>
        <p>All feature development must trace back to these requirements.</p>
        
   <h3>Functional Requirements</h3>
        <table class="requirement-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Requirement Name</th>
                    <th>Description</th>
                    <th>Acceptance Criteria</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><strong>FR-BOT-01</strong></td>
                    <td>Image-based Diagnosis</td>
                    <td>System receives rice/crop leaf images and returns disease name + confidence score</td>
                    <td>
                        <ul style="margin: 0; padding-left: 20px;">
                            <li>Accuracy > 90% for 5 common diseases</li>
                            <li>Response time < 3 seconds</li>
                        </ul>
                    </td>
                </tr>
                <tr>
                    <td><strong>FR-BOT-02</strong></td>
                    <td>Contextual Advisory</td>
                    <td>Advice must be based on current weather at user's location</td>
                    <td>
                        <ul style="margin: 0; padding-left: 20px;">
                            <li>If raining, warn NOT to spray pesticide</li>
                            <li>Correct weather data retrieval by Lat/Long</li>
                        </ul>
                    </td>
                </tr>
                <tr>
                    <td><strong>FR-BOT-03</strong></td>
                    <td>History Query</td>
                    <td>Users can view diagnosis history</td>
                    <td>
                        <ul style="margin: 0; padding-left: 20px;">
                            <li>Display list in descending chronological order</li>
                            <li>Ability to reload old images</li>
                        </ul>
                    </td>
                </tr>
                <tr>
                    <td><strong>FR-DAS-01</strong></td>
                    <td>Automated Collection</td>
                    <td>DAM Service automatically crawls images from configured sources</td>
                    <td>
                        <ul style="margin: 0; padding-left: 20px;">
                            <li>No duplicate crawling (uses Image Hashing)</li>
                            <li>Automatic source metadata storage</li>
                        </ul>
                    </td>
                </tr>
            </tbody>
        </table>
        
   <h3>Non-Functional Requirements</h3>
        <div class="info">
            <ul>
                <li><strong>NFR-PERF-01:</strong> System handles 1000 CCU (Concurrent Users) without crashing</li>
                <li><strong>NFR-SEC-01:</strong> User PII data must be AES-256 encrypted at rest</li>
                <li><strong>NFR-RELI-01:</strong> Apply <strong>Circuit Breaker</strong> for Weather API. If weather API fails, system still returns diagnosis results (with missing weather data warning)</li>
            </ul>
        </div>
    </section>

   <section id="data">
        <h2>💎 Data Strategy: The Golden Record</h2>
        <p>To ensure data consistency (Data Centricity), all data exchange flows in the system must comply with the <strong>Golden Record</strong> schema.</p>
        
   <div class="code-block">
            <pre>{"record_id": "UUID-v4",
"timestamp": "ISO-8601",
"user_id": "encrypted_user_hash",
"input": {
"image_url": "s3://te4gri-data/raw/img_01.jpg",
"location": { "lat": 10.762, "long": 106.660 },
"device_info": { "model": "iPhone 14", "os": "iOS 16" }
},
"context": {
"weather": { "condition": "Rainy", "humidity": 85, "temp": 28 },
"season": "Winter-Spring"
},
"diagnosis": {
"disease_code": "BLAST_01",
"confidence_score": 0.95,
"model_version": "v2.1.0"
},
"action": {
"recommendation_id": "REC_BLAST_RAINY",
"is_sent_to_user": true
}
}</pre>
</div>
</section>
    <section id="api">
        <h2>🔌 API Specification</h2>
        <p>We use <strong>OpenAPI 3.0</strong> standard. Below is the most critical endpoint.</p>
        
   <div class="api-endpoint">
            <h3>1. Diagnose Disease</h3>
            <p><span class="api-method post">POST</span> <strong>/api/v1/ai/diagnose</strong></p>
            <p><strong>Auth:</strong> Bearer Token (JWT)</p>
            <p><strong>Request Body:</strong> multipart/form-data</p>
            <ul>
                <li>image: Binary file (max 5MB)</li>
                <li>lat: float</li>
                <li>long: float</li>
            </ul>
            <p><strong>Response (200 OK):</strong></p>
            <div class="code-block">
                <pre>{"success": true,
"data": {
"disease_name": "Rice Blast",
"confidence": 0.92,
"advice": "Due to current rain, please DO NOT spray immediately. Wait 2 hours after rain stops...",
"warning": "High spread risk due to humidity > 80%."
}
}</pre>
</div>
</div>

   <div class="api-endpoint">
            <h3>2. Feedback (User corrects diagnosis)</h3>
            <p><span class="api-method post">POST</span> <strong>/api/v1/ai/feedback</strong></p>
            <p><strong>Body:</strong> { "record_id": "UUID", "is_correct": false, "user_correction": "Brown Spot Disease" }</p>
            <p><strong>Impact:</strong> This data is pushed to EAPP for model retraining (Active Learning).</p>
        </div>
    </section>

   <section id="tech">
        <h2>🛠 Technology Stack</h2>
        <p>Technology selection based on criteria: <strong>Stable, Popular, High Performance</strong>.</p>
        
   <div class="tech-stack-grid">
            <div class="tech-card">
                <h4>Backend Framework</h4>
                <p><strong>NestJS (Node.js)</strong></p>
                <p>Tight module structure, TypeScript support, easy maintenance for large teams.</p>
            </div>
            
   <div class="tech-card">
                <h4>AI Service</h4>
                <p><strong>FastAPI (Python)</strong></p>
                <p>Highest performance for Python, native async, excellent PyTorch/TensorFlow integration.</p>
            </div>
            
   <div class="tech-card">
                <h4>Database</h4>
                <p><strong>PostgreSQL + Prisma</strong></p>
                <p>Strong relations, Type-safe query builder.</p>
            </div>
            
   <div class="tech-card">
                <h4>Cache/Queue</h4>
                <p><strong>Redis</strong></p>
                <p>High speed, serves as both cache and lightweight Pub/Sub.</p>
            </div>
            
   <div class="tech-card">
                <h4>Infrastructure</h4>
                <p><strong>Docker & K8s</strong></p>
                <p>Standardized environment from Dev to Prod.</p>
            </div>
            
   <div class="tech-card">
                <h4>Monitoring</h4>
                <p><strong>ELK Stack + Prometheus</strong></p>
                <p>Centralized logging and real-time alerts.</p>
            </div>
        </div>
    </section>

   <section id="testing">
        <h2>🧪 Testing Strategy</h2>
        <p>Strict adherence to <strong>Testing Pyramid</strong>.</p>
        
   <div class="component-card">
            <h3>1. Unit Tests (70%)</h3>
            <ul>
                <li><strong>Backend:</strong> Jest with > 85% coverage</li>
                <li><strong>AI:</strong> Pytest for image processing and NLP functions</li>
            </ul>
        </div>
        
   <div class="component-card">
            <h3>2. Integration Tests (20%)</h3>
            <ul>
                <li>Communication between Controller and Database</li>
                <li>Weather API integration (using Mock server)</li>
            </ul>
        </div>
        
   <div class="component-card">
            <h3>3. End-to-End (E2E) Tests (10%)</h3>
            <ul>
                <li><strong>Tools:</strong> Playwright or K6</li>
                <li><strong>Flow:</strong> Upload image → Wait processing → Receive result</li>
            </ul>
        </div>
        
   <div class="component-card">
            <h3>4. Performance Test</h3>
            <ul>
                <li><strong>Tool:</strong> Locust</li>
                <li><strong>Scenario:</strong> Simulate 500 concurrent users hitting diagnosis API</li>
            </ul>
        </div>
    </section>

   <section id="risks">
        <h2>🛡 Risk Analysis & Cost</h2>
        
   <h3>Risk Register</h3>
        <div class="risk-matrix">
            <div class="risk-card risk-high">
                <h4>Model Hallucination</h4>
                <p><strong>Level:</strong> High</p>
                <p><strong>Mitigation:</strong> Apply Confidence Threshold. If < 70%, switch to safe response or request retake.</p>
            </div>
            
   <div class="risk-card risk-medium">
                <h4>DDoS Attack</h4>
                <p><strong>Level:</strong> Medium</p>
                <p><strong>Mitigation:</strong> Configure Rate Limiting at API Gateway (Nginx).</p>
            </div>
            
   <div class="risk-card risk-medium">
                <h4>Dependency Hell</h4>
                <p><strong>Level:</strong> Medium</p>
                <p><strong>Mitigation:</strong> Strict use of Docker and lock files (package-lock.json, poetry.lock).</p>
            </div>
            
   <div class="risk-card risk-high">
                <h4>Image Data Loss</h4>
                <p><strong>Level:</strong> High</p>
                <p><strong>Mitigation:</strong> Configure Replication for MinIO/S3 and regular Database backups.</p>
            </div>
        </div>
        
   <h3>Monthly Cost Estimate</h3>
        <div class="cost-table">
            <p><em>Assumption: 10,000 Active Users/month</em></p>
            <table>
                <thead>
                    <tr>
                        <th>Category</th>
                        <th>Service (AWS/GCP/VNPT)</th>
                        <th>Estimated Configuration</th>
                        <th>Estimated Cost</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Compute</strong></td>
                        <td>EKS / Cloud Run</td>
                        <td>2 Nodes (4vCPU, 8GB RAM)</td>
                        <td>$80</td>
                    </tr>
                    <tr>
                        <td><strong>Database</strong></td>
                        <td>Managed Postgres</td>
                        <td>1 Instance (2vCPU, Storage 50GB)</td>
                        <td>$40</td>
                    </tr>
                    <tr>
                        <td><strong>Storage</strong></td>
                        <td>S3 / Blob</td>
                        <td>500GB Images & Logs</td>
                        <td>$15</td>
                    </tr>
                    <tr>
                        <td><strong>Cache</strong></td>
                        <td>Redis Managed</td>
                        <td>Small Cluster</td>
                        <td>$15</td>
                    </tr>
                    <tr>
                        <td><strong>AI Inference</strong></td>
                        <td>Spot Instances (GPU T4)</td>
                        <td>Demand-based (Auto-scale)</td>
                        <td>$50</td>
                    </tr>
                </tbody>
            </table>
            <div class="cost-total">
                Total Estimated Monthly Cost: <strong>~$200/month</strong>
            </div>
        </div>
    </section>

   <section id="installation">
        <h2>🚀 Installation & Development Guide</h2>
        
   <div class="installation-steps">
            <h3>Prerequisites</h3>
            <div class="step">Docker & Docker Compose</div>
            <div class="step">Node.js >= 18 LTS</div>
            <div class="step">Python >= 3.9</div>
            <div class="step">Pnpm (Package Manager)</div>
        </div>
        
   <h3>Quick Start</h3>
        <div class="installation-steps">
            <div class="step">
                <strong>Clone Repository:</strong><br>
                <div class="code-block">
                    git clone https://github.com/te4gri/te4gri-platform.git<br>
                    cd te4gri-platform
                </div>
            </div>
            
   <div class="step">
                <strong>Setup Environment Variables:</strong><br>
                <div class="code-block">
                    cp .env.example .env<br>
                    # Update API Keys (Weather, Zalo...) in .env file
                </div>
            </div>
            
   <div class="step">
                <strong>Start Infrastructure (DB, Redis, MinIO):</strong><br>
                <div class="code-block">
                    docker-compose up -d postgres redis minio
                </div>
            </div>
            
   <div class="step">
                <strong>Run Backend Services:</strong><br>
                <div class="code-block">
                    pnpm install<br>
                    pnpm nx run-many --target=serve --all
                </div>
            </div>
        </div>
        
   <div class="info">
            <h4>Development Notes</h4>
            <p>For local development with hot-reload:</p>
            <div class="code-block">
                pnpm nx serve te4bot  # Start AI Service<br>
                pnpm nx serve gateway # Start API Gateway<br>
                pnpm nx serve auth    # Start Auth Service
            </div>
        </div>
    </section>

   <footer>
        <h3>TE4GRI Engineering Team</h3>
        <p>Developed with ❤️ for Vietnamese Agriculture.</p>
        <p><strong>Approved by Phong Lam - Leader of TE4GRI ecosystem</strong></p>
        <p style="font-size: 0.8em; margin-top: 20px;">Version: 2.1.0 | Last Updated: 2025-01-07</p>
    </footer>
</div>
