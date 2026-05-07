# ⚙️ Productix AI: Backend Product Requirements Document (PRD)

## 1. Overview
The **Productix AI Backend** is a multi-tenant, agentic API designed to power high-frequency business intelligence. It manages complex data relationships, AI orchestration (RAG), and real-time telemetry simulations.

---

## 2. Core Architecture
- **Framework**: FastAPI (Python 3.10+).
- **Tenancy**: Hard isolation of data at the `organization_id` level.
- **Plugin System**: Modular industry plugins (Retail, Auto, Telco) with their own specific route prefixes and logic layers.
- **Database**: 
    - Development: SQLite (`productix.db`).
    - Production: PostgreSQL (Supabase/Render).
- **Migrations**: Alembic for database schema evolution.

---

## 3. Key Services & Logic

### 3.1 Multi-tenant Identity Management (IAM)
- **Roles**: `system_admin`, `org_admin`, `org_user`.
- **RBAC**: Middleware to enforce role-based access to specific endpoints (e.g., only `system_admin` can create Organizations).

### 3.2 Product & Shift Management
- **ShiftEntry**: The core unit of data. Stores daily inputs (materials, costs) and outputs (units produced, sales).
- **Batch Tracking**: Groups shift entries into production or sales cycles.
- **Dynamic Fields**: Products define their own required input/output fields, allowing for cross-industry flexibility.

### 3.3 AI & Analytics Engine
- **Prediction Engine**: 
    - Linear regression for basic trend forecasting.
    - Gemini/OpenAI integration for more complex, text-based strategic insights.
- **RAG (Retrieval Augmented Generation)**: 
    - Processing database records into context for the AI Chatbot.
    - Enabling natural language queries over business data history.
- **Calculations**: Automated computation of Overall Equipment Effectiveness (OEE) and Productivity Ratios.

### 3.4 Hybrid Data Resolver
- Logic that checks if "Live" data exists for an organization.
- If data is missing (New org), it serves "Demo" mockups to provide an immediate "Wow" factor during the trial.

### 3.5 IoT & Hardware Integration
- **Simulated Telemetry**: Endpoints providing high-velocity data streams (Vibration, Energy, Footfall).
- **Physical Integration**: Prepared for MQTT gateways and REST callbacks from ESP32/Pi devices.

---

## 4. API Endpoints (Core Groups)
- `auth/*`: Login, Signup, Password Reset.
- `api/feed/*`: The core logic powering the TikTok Swipe UI.
- `api/plugins/retail/*`: Inventory, Sales KPIs, Retail Actions.
- `api/plugins/auto/*`: OEE, Line Status, Predictive Maintenance.
- `api/uploads/*`: Excel parsing (Openpyxl) and database synchronization.

---

## 5. Security & Performance
- **Authentication**: JWT tokens with 24h expiry.
- **CORS**: Restricted to specific frontend domains (Localhost + Production URLs).
- **Concurrency**: Asynchronous tasks for heavy AI processing or large file uploads.

---
**Version**: 1.0.0
**Context**: Backend Specification
