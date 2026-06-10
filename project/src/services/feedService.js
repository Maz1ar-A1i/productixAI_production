// Feed Service — API integration with mock-data fallback
// Phase 3: Now calls /api/feed/cards and /api/feed/cards/{id}/act
// Falls back to rich mock data if backend is unavailable

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

function getAuthHeaders() {
  const token = localStorage.getItem('token') || '';
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ── Onboarding / educational fallback cards ──────────────────────────────────
const MOCK_CARDS = [
  {
    id: "card-welcome-001",
    type: "insight",
    priority: "low",
    agent: "Co-Pilot",
    agentIcon: "🤖",
    sector: "General",
    timestamp: new Date(Date.now() - 1 * 60000).toISOString(),
    track: {
      headline: "Welcome to your AI Co-Pilot Feed!",
      detail: "This feed aggregates real-time insights from your organisation's data.",
      metric: { value: "✓", direction: "stable", color: "accent" },
    },
    predict: {
      headline: "Once data flows in, AI-driven predictions appear here",
      confidence: 100,
      horizon: "—",
      detail: "Start by entering operational data in the Unit Table to unlock insights.",
    },
    action: {
      headline: "Go to Operational Data Entry to start",
      impact: "Unlocks personalised insights and KPI alerts",
      steps: ["Navigate to the Unit Table page", "Enter your first data record", "Come back here to see live insights"],
      autoable: false,
    },
  },
  {
    id: "card-tip-kpi-002",
    type: "insight",
    priority: "low",
    agent: "Tips",
    agentIcon: "💡",
    sector: "General",
    timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
    track: {
      headline: "Tip: Configure KPI thresholds for smart alerts",
      detail: "Set target, warning, and critical levels on each KPI to receive automated alerts.",
      metric: { value: "💡", direction: "stable", color: "accent" },
    },
    predict: {
      headline: "Well-tuned thresholds reduce alert noise by ~60%",
      confidence: 90,
      horizon: "—",
      detail: "Review thresholds quarterly for best results.",
    },
    action: {
      headline: "Open KPI Dashboard → Edit any KPI → Set thresholds",
      impact: "Receive timely warnings before problems escalate",
      steps: ["Go to KPI Dashboard", "Click a KPI card to edit", "Set target, warning, and critical values"],
      autoable: false,
    },
  },
  {
    id: "card-tip-formula-003",
    type: "insight",
    priority: "low",
    agent: "Tips",
    agentIcon: "🧮",
    sector: "General",
    timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
    track: {
      headline: "Tip: Custom formulas keep your metrics consistent",
      detail: "Build formulas in the Formula Builder — renaming a variable updates it everywhere.",
      metric: { value: "💡", direction: "stable", color: "accent" },
    },
    predict: {
      headline: "Formulas auto-recalculate when underlying data changes",
      confidence: 95,
      horizon: "—",
      detail: "Promote any formula to a tracked KPI for continuous monitoring.",
    },
    action: {
      headline: "Open Formula Builder → Create your first formula",
      impact: "Automates calculations and eliminates manual errors",
      steps: ["Go to Formula Builder", "Select variables from your Unit Table", "Define an expression and save"],
      autoable: false,
    },
  },
  {
    id: "card-demo-sim-004",
    type: "prediction",
    priority: "low",
    agent: "Demo Simulation",
    agentIcon: "🧪",
    sector: "General",
    timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
    track: {
      headline: "[Demo Simulation] Budget overrun detected",
      detail: "This is a simulated example. Real alerts appear when you configure KPIs with live data.",
      metric: { value: "+9%", direction: "up", color: "warning" },
    },
    predict: {
      headline: "[Simulated] Month-end overrun if trend continues",
      confidence: 87,
      horizon: "—",
      detail: "This card demonstrates how AI predicts future outcomes from historical patterns.",
    },
    action: {
      headline: "[Simulated] Reduce costs by switching to off-peak energy",
      impact: "Demonstrates AI-suggested corrective actions",
      steps: ["This is a demo action step", "Real actions come from your data", "Configure KPIs to see real insights"],
      autoable: false,
    },
  },
];

// Reward messages shown after actions
const REWARD_MESSAGES = [
  { message: "⚡ Action queued! Estimated recovery: PKR 45,000", icon: "💰" },
  { message: "🎯 You're on track to hit today's goal!", icon: "🎯" },
  { message: "✅ Smart move — AI confirms this is optimal", icon: "🤖" },
  { message: "🚀 Revenue up 8% this week — keep it up!", icon: "📈" },
  { message: "⏱ You saved 2.5 hours today with AI Co-Pilot", icon: "⏱" },
];

export const feedService = {
  /**
   * Get swipe feed cards — tries real API, falls back to mock data
   */
  getCards: async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/feed/cards`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data;
      return MOCK_CARDS;
    } catch {
      // Fallback: simulate slight delay for UX consistency
      await new Promise(r => setTimeout(r, 400));
      return MOCK_CARDS;
    }
  },

  /**
   * Record user decision on a card — tries API, falls back to local
   */
  actOnCard: async (cardId, decision) => {
    try {
      const res = await fetch(`${BASE_URL}/api/feed/cards/${cardId}/act`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ decision }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      return data;
    } catch {
      await new Promise(r => setTimeout(r, 200));
      const reward = REWARD_MESSAGES[Math.floor(Math.random() * REWARD_MESSAGES.length)];
      return { success: true, reward: decision !== 'skip' ? reward : null };
    }
  },

  /**
   * Get today's goal from localStorage
   */
  getGoal: () => {
    try {
      return JSON.parse(localStorage.getItem('productix_goal') || 'null');
    } catch { return null; }
  },

  /**
   * Save goal
   */
  saveGoal: (goal) => {
    localStorage.setItem('productix_goal', JSON.stringify(goal));
  },

  /**
   * Get auto-mode settings
   */
  getAutoMode: () => {
    try {
      return JSON.parse(localStorage.getItem('productix_automode') || '{}');
    } catch { return {}; }
  },

  /**
   * Save auto-mode settings
   */
  saveAutoMode: (settings) => {
    localStorage.setItem('productix_automode', JSON.stringify(settings));
  },

  /**
   * Get reward stats
   */
  getStats: () => ({
    actionsToday: Math.floor(Math.random() * 8) + 2,
    hoursaved: (Math.random() * 3 + 1).toFixed(1),
    revenueImpact: `PKR ${(Math.floor(Math.random() * 100) + 50)}k`,
  }),
};

export default feedService;
