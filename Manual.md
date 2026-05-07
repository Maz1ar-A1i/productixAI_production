# 📘 Productix AI Co-Pilot: Complete User Manual

Welcome to **Productix AI**, your AI-driven business intelligence co-pilot. This manual provides a clear guide on how to use the platform, what features are currently active, and how to scale up using IoT devices.

---

## 1. Project Overview
Productix AI is a "Bloomberg-style" dashboard with a "TikTok-style" swipe interface. It is designed to track, predict, and act on your business data across different sectors (Retail, Automotive, FMCG).

### Key Logic
- **Track**: Real-time monitoring of your business numbers.
- **Predict**: AI-driven forecasts (Sales, Machine failure, Lead times).
- **Act**: One-click solutions suggest by the AI to solve detected problems.

---

## 2. Feature Status (What's Working?)

| Category | Feature | Status | Requirement |
| :--- | :--- | :--- | :--- |
| **Auth** | User/Admin Login | ✅ **Live** | Database |
| **IAM** | Identity/Org Mgmt | ✅ **Live** | System Admin Access |
| **Data** | Excel Uploads | ✅ **Live** | Standard Template |
| **Retail** | Sales/Inventory KPIs | ✅ **Live** | Shift Entry Data |
| **Auto** | OEE/Batch Tracking | ✅ **Live** | Batch Data |
| **AI** | Sales Forecasting | ✅ **Live** | History (5+ records) |
| **IoT** | Line Telemetry | ⚠️ **Simulated**| See IoT Section below |
| **FMCG** | Agent Dashboard | ⚠️ **Visual Only**| Needs Data Mapping |

---

## 3. IoT Integration Guide
To unlock the "Full AI" potential of Productix (True Real-Time), you need to connect physical hardware.

### Required IoT Devices:
1. **For Manufacturing (Automotive Agent)**:
   - **Vibration Sensors (MPU6050)**: Attached to motors to predict mechanical failure.
   - **Smart Energy Meters (PZEM-004T)**: To track real-time machine power usage/OEE.
   - **Gateway**: An ESP32 or Raspberry Pi running MQTT to send data to the backend.

2. **For Retail/Inventory**:
   - **RFID Gateways**: For real-time inventory tracking without manual scanning.
   - **Network Cameras (AI-Vision)**: Connect to a local server to count store footfall (people counting).

3. **For Logistics**:
   - **GPS Trackers (Global/SIM)**: To feed live lead-time data for "Supply Chain" predictions.

---

## 4. Step-by-Step Usage Guide

### Step 1: Accessing the App
1. **Url**: `http://localhost:5173` (or current dev port).
2. **System Admin Login**:
   - **Email**: `rahmat@irp.edu.pk`
   - **Password**: `Pakistan786`
3. **Identity Setup**: Go to the **System Admin** icon (Sidebar) to create your Organization and add Organization Admins.

### Step 2: Ingesting Business Data
1. Log in with an **Organization Admin** account.
2. Go to the **Inventory/Batch** section.
3. Click "Upload Excel."
4. **Important**: Use the provided **Productix Template**. Fill in your Products, active Batches, and daily Shift Entries.
5. Once uploaded, the system automatically transitions from "Demo Mode" to **"Live Data."**

### Step 3: Using the AI Co-Pilot
1. **Swipe Interface**: Use your mouse or trackpad to swipe up/down between the Retail and Automotive agents.
2. **Track Tab**: View your real-time performance (Daily Sales or Machine Uptime).
3. **Predict Tab**: View the AI's 30-day sales projection.
4. **Act Tab**: Review the AI's "Actionable Insights." Click **Execute** to authorize an emergency reorder or a preventive maintenance shift.

---

## 5. Developer Specs
- **Frontend**: React + Vite (Port 5173)
- **Backend**: FastAPI + Python 3.10+ (Port 8000)
- **Database**: SQLite (`productix.db`)
- **API Root**: `http://localhost:8000/api/v1`

---
> [!TIP]
> **Pro Tip**: To keep the dashboard "Live," encourage your field staff to upload the daily shift entry file every evening. This keeps the AI engine accurate.
