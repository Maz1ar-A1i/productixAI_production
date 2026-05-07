# 🎨 Productix AI: Frontend Product Requirements Document (PRD)

## 1. Overview
The **Productix AI Frontend** is a high-performance, industrial-grade React application designed to provide a "TikTok-style" experience for business intelligence. It focuses on high visualization density, ease of use, and a premium "Bloomberg-style" aesthetic.

---

## 2. Visual Design & Identity
- **Industrial Dark Theme**: Primary background: `#020617` (Deep Navy/Black). Accents: Emerald Green (Success), Rose Red (Alerts), Indigo (AI).
- **Glassmorphism**: Use of translucent backgrounds with `backdrop-filter: blur(12px)` for cards, sidebars, and overlays.
- **Typography**: Modern sans-serif (Inter/Outfit) for maximum readability.
- **Animations**: 
    - Smooth vertical "Swipe" transitions between industry agents.
    - Subtle Pulsing effects for "Live" data indicators.
    - Smooth entry/exit for modal dialogs.

---

## 3. Core Features

### 3.1 TikTok-Style Swipe UI
- Users can swipe up/down (or scroll) to transition between different industry sectors (e.g., Retail → Automotive → FMCG).
- Each sector is presented as a "Full Height" agent card.

### 3.2 Track → Predict → Act (Tabs)
Every agent card contains three primary tabs:
1.  **Track**: 
    - Real-time KPI dashboard.
    - Charts (Line, Bar, Radial) showing current performance.
    - Status indicators (Up/Down/Stable).
2.  **Predict**:
    - AI-generated forecasts.
    - Visual trend lines showing 30-day or 7-day projections.
    - Confidence intervals for predictions.
3.  **Act**:
    - Actionable insight cards.
    - "Execute" buttons to trigger automated or manual workflows.

### 3.3 Data Ingestion
- **Excel Upload**: Drag-and-drop zone for standard Productix templates.
- **Validation**: Real-time feedback on file format and data completeness.
- **Status Mapping**: Transition from "Demo Mode" to "Live Mode" once data is uploaded.

### 3.4 Interactive AI Chatbot
- Floating or sidebar chatbot with a dark "AI" aesthetic.
- Capable of answering questions about the uploaded business data (RAG integration).

### 3.5 Multi-tenant IAM
- **System Admin**: Identity and Organization management.
- **Organization Admin**: Data uploads and user management for their specific org.
- **Organization User**: View-only or limited action access.

---

## 4. Technical Stack
- **Framework**: React 18 + Vite (for rapid build and HMR).
- **Styling**: Tailwind CSS for utility-first responsive design.
- **Icons**: Lucide React + Heroicons.
- **Charts**: Recharts (for responsive, animated data visualization).
- **Network**: Axios with JWT interceptors for secure API calls.
- **Routing**: React Router DOM (v6+).

---

## 5. User Journey
1.  **Onboarding**: User lands on a high-fidelity marketing page.
2.  **Authentication**: Secure login with JWT.
3.  **Identity Setup**: System Admin creates an Organization.
4.  **Data Sync**: Org Admin uploads shift entries.
5.  **Intelligence**: User explores insights via the Swipe UI and Chatbot.

---
**Version**: 1.0.0
**Context**: Frontend Specification
