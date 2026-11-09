# MedLink Connect Architecture

## Overview
MedLink Connect is an offline-first telemedicine and EMR platform for hospitals operating in inconsistent connectivity conditions. The system uses a Django REST API backend, a React + TypeScript PWA frontend, PostgreSQL for transactional data, Redis for caching and task coordination, and Celery for asynchronous work.

## Core Services
- Authentication and authorization
- Patient registration and EMR
- Scheduling, triage, labs, pharmacy, and messaging
- Sync engine and offline queue
- Optional AI clinical summarization module

## Deployment Topology
- Frontend: React PWA hosted on Azure Static Web Apps or Nginx
- Backend: Django API hosted on Azure App Service or Container Apps
- Data: PostgreSQL managed service
- Cache/queue: Redis + Celery workers
- Offline storage: IndexedDB in browser with encrypted local payloads

## Security Model
- MFA for privileged roles
- RBAC by role and hospital
- AES-256 style encryption for offline payloads
- Audit logging for every critical action
- Advisory AI-only suggestions with human oversight
