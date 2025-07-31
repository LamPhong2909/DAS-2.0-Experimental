# DAS 2.0 - Data Augmentation & Synthesis System

[![Build Status](https://img.shields.io/github/workflow/status/te4gri/das/CI-CD)](https://github.com/te4gri/das/actions)
[![Coverage](https://img.shields.io/codecov/c/github/te4gri/das)](https://codecov.io/gh/te4gri/das)
[![License](https://img.shields.io/badge/license-proprietary-red)](LICENSE)

## Overview

DAS 2.0 is a state-of-the-art data augmentation and synthesis platform designed to enhance AI model robustness through systematic data degradation and analysis. Built with a microservices architecture, it provides end-to-end automation from data acquisition to model performance insights.

## Key Features

- **Intelligent Data Acquisition (DAM)**: Multi-source data collection with deduplication and metadata enrichment
- **Controlled Degradation Pipeline (EAPP)**: Systematic augmentation with reproducible transformations  
- **Real-time Analytics (TAID)**: Automated weakness detection and performance correlation analysis
- **Enterprise-grade Architecture**: Scalable, secure, and fully observable microservices

## Quick Start

### Prerequisites

- Docker & Docker Compose v2.20+
- Node.js v20+ with pnpm v8+
- PostgreSQL 15+ (for local development)
- MinIO or S3-compatible storage

### Installation

1. Clone the repository:
```bash
git clone https://github.com/te4gri/das.git
cd das