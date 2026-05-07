import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { authService } from './services/api';

// Layout
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/layout';

// Auth Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Verify_Result from './pages/verify_result';

// Admin Pages
import SuperAdmin from './pages/system_admin';
import OrgDashboard from './pages/org_admin';

// ── Formula Builder Module
import FormulaBuilder from './pages/FormulaBuilder';
import FormulaLibrary from './pages/FormulaLibrary';
import TowerManager from './pages/TowerManager';

// ── Co-Pilot Pages
import HomeFeed from './pages/copilot/HomeFeed';
import VoiceInterface from './pages/copilot/VoiceInterface';
import AgentsScreen from './pages/copilot/AgentsScreen';
import GoalSetting from './pages/copilot/GoalSetting';
import AutoModeControl from './pages/copilot/AutoModeControl';

// ── Sector Plugin Pages
import TelcoPlugin from './pages/plugins/TelcoPlugin';
import RetailPlugin from './pages/plugins/RetailPlugin';
import EnergyPlugin from './pages/plugins/EnergyPlugin';
import RevenuePlugin from './pages/plugins/RevenuePlugin';
import TextilePlugin from './pages/plugins/TextilePlugin';

// ── Legacy Productivity Module
import Dashboard from './pages/Dashboard';
import Calculate from './pages/Calculate';
import Analyze from './pages/Analyze';
import Chatbot from './pages/Chatbot';
import Agent from './pages/Agent';
import Reports from './pages/productivity/Reports';
import AIAnalysis from './pages/productivity/AIAnalysis';
import RAGChat from './pages/productivity/RAGChat';
import ExcelUpload from "./pages/productivity/upload";
import TowerDataEntry from "./pages/TowerDataEntry";

// Public route guard (redirect if already logged in)
const PublicRoute = ({ children }) => {
  const isAuthenticated = authService.isAuthenticated();
  return isAuthenticated ? <Navigate to="/feed" replace /> : children;
};

// Wrapped protected route with layout
const LayoutRoute = ({ element, roles }) => (
  <ProtectedRoute allowedRoles={roles}>
    <Layout>{element}</Layout>
  </ProtectedRoute>
);

function App() {
  return (
    <Router>
      <div className="page-wrapper">
        <Routes>
          {/* ── Public Routes ── */}
          <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
          <Route path="/verify-result" element={<Verify_Result />} />

          {/* ── Co-Pilot Routes (PRIMARY) ── */}
          <Route path="/feed" element={<LayoutRoute element={<HomeFeed />} />} />
          <Route path="/voice" element={<LayoutRoute element={<VoiceInterface />} />} />
          <Route path="/agents" element={<LayoutRoute element={<AgentsScreen />} />} />
          <Route path="/goals" element={<LayoutRoute element={<GoalSetting />} />} />
          <Route path="/auto-mode" element={<LayoutRoute element={<AutoModeControl />} />} />

          {/* ── Sector Plugin Routes ── */}
          <Route path="/plugins/telco" element={<LayoutRoute element={<TelcoPlugin />} />} />
          <Route path="/plugins/energy" element={<LayoutRoute element={<EnergyPlugin />} />} />
          <Route path="/plugins/revenue" element={<LayoutRoute element={<RevenuePlugin />} />} />
          <Route path="/plugins/retail" element={<LayoutRoute element={<RetailPlugin />} />} />
          <Route path="/plugins/textile" element={<LayoutRoute element={<TextilePlugin />} />} />

          {/* ── Legacy Productivity Routes ── */}
          <Route path="/dashboard" element={<LayoutRoute element={<Dashboard />} />} />
          <Route path="/calculate" element={<LayoutRoute element={<Calculate />} />} />
          <Route path="/analyze" element={<LayoutRoute element={<Analyze />} />} />
          <Route path="/chatbot" element={<LayoutRoute element={<Chatbot />} />} />
          <Route path="/agent" element={<LayoutRoute element={<Agent />} />} />
          <Route path="/productivity/reports" element={<LayoutRoute element={<Reports />} />} />
          <Route path="/productivity/ai" element={<LayoutRoute element={<AIAnalysis />} />} />
          <Route path="/productivity/rag-chat" element={<LayoutRoute element={<RAGChat />} />} />
          <Route path="/productivity/excel-upload" element={<LayoutRoute element={<ExcelUpload />} />} />
          <Route path="/tower-data" element={
            <ProtectedRoute allowedRoles={['org_user']}>
              <Layout><TowerDataEntry /></Layout>
            </ProtectedRoute>
          } />
          {/* ── Formula Builder Routes (org_admin only) ── */}
          <Route path="/tower-manager" element={
            <ProtectedRoute allowedRoles={['org_admin']}>
              <Layout><TowerManager /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/formula-builder" element={
            <ProtectedRoute allowedRoles={['org_admin']}>
              <Layout><FormulaBuilder /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/formula-library" element={
            <ProtectedRoute allowedRoles={['org_admin']}>
              <Layout><FormulaLibrary /></Layout>
            </ProtectedRoute>
          } />

          {/* ── Admin Routes ── */}
          <Route path="/org_admin" element={
            <ProtectedRoute allowedRoles={['org_admin']}>
              <Layout><OrgDashboard /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/system_admin" element={
            <ProtectedRoute>
              <SuperAdmin />
            </ProtectedRoute>
          } />

          {/* ── Catch All ── */}
          <Route path="*" element={<Navigate to="/feed" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
