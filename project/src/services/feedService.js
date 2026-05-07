// Feed Service — API integration with mock-data fallback
// Phase 3: Now calls /api/feed/cards and /api/feed/cards/{id}/act
// Falls back to rich mock data if backend is unavailable

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getAuthHeaders() {
  const token = localStorage.getItem('productix_token') || localStorage.getItem('token') || '';
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ── Mock data (used as fallback and seeding) ─────────────────────────────────
const MOCK_CARDS = [
  {
    id: "card-001",
    type: "alert",
    priority: "high",
    agent: "Sales",
    agentIcon: "💼",
    sector: "General",
    timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
    track: {
      headline: "Revenue dropped 14% vs yesterday",
      detail: "Total sales: PKR 284,000 (vs PKR 330,000 yesterday)",
      metric: { value: "-14%", direction: "down", color: "danger" },
    },
    predict: {
      headline: "Decline likely to continue through tomorrow",
      confidence: 82,
      horizon: "24 hours",
      detail: "Pattern matches 3 previous Q1 dips — recovered within 48 hrs",
    },
    action: {
      headline: "Contact top 5 leads in pipeline",
      impact: "Potential +PKR 45,000 recovery",
      steps: ["Open CRM → filter by 'Hot Lead'", "Call within next 2 hours", "Log outcome in system"],
      autoable: true,
    },
  },
  {
    id: "card-002",
    type: "insight",
    priority: "high",
    agent: "Inventory",
    agentIcon: "📦",
    sector: "General",
    timestamp: new Date(Date.now() - 12 * 60000).toISOString(),
    track: {
      headline: "Stock critically low — Product A",
      detail: "Current stock: 47 units. Avg daily consumption: 38 units",
      metric: { value: "47 units", direction: "down", color: "warning" },
    },
    predict: {
      headline: "Stockout in 1.2 days at current consumption rate",
      confidence: 94,
      horizon: "1.2 days",
      detail: "Demand up 28% this week — standard reorder not sufficient",
    },
    action: {
      headline: "Reorder 800 units from Supplier B now",
      impact: "Prevents PKR 90,000 in lost sales",
      steps: ["Generate PO for 800 units", "Send to Supplier B (fastest delivery)", "Expected arrival: 3 days"],
      autoable: true,
    },
  },
  {
    id: "card-003",
    type: "insight",
    priority: "medium",
    agent: "Production",
    agentIcon: "🏭",
    sector: "General",
    timestamp: new Date(Date.now() - 25 * 60000).toISOString(),
    track: {
      headline: "Machine C efficiency at 67% — below 80% threshold",
      detail: "Shift 2 output: 340 units vs target 460 units",
      metric: { value: "67%", direction: "down", color: "warning" },
    },
    predict: {
      headline: "Output gap: ~120 units short by end of shift",
      confidence: 78,
      horizon: "6 hours",
      detail: "Consistent underperformance on Tuesdays — correlates with crew rotation",
    },
    action: {
      headline: "Reassign Operator A to Machine C for this shift",
      impact: "Recovers ~80 units (PKR 24,000 value)",
      steps: ["Notify shift supervisor", "Swap Operator A from Machine B", "Monitor for 30 mins"],
      autoable: false,
    },
  },
  {
    id: "card-004",
    type: "prediction",
    priority: "medium",
    agent: "Finance",
    agentIcon: "💰",
    sector: "General",
    timestamp: new Date(Date.now() - 40 * 60000).toISOString(),
    track: {
      headline: "OPEX running 9% over budget this month",
      detail: "Actual: PKR 1.24M vs Budget: PKR 1.14M",
      metric: { value: "+9%", direction: "up", color: "danger" },
    },
    predict: {
      headline: "Month-end overrun: PKR 180,000 if trend continues",
      confidence: 87,
      horizon: "18 days",
      detail: "Fuel costs +31%, energy +12%, maintenance on schedule",
    },
    action: {
      headline: "Reduce diesel consumption — switch to grid during off-peak",
      impact: "Save PKR 80,000–120,000 this month",
      steps: ["Identify peak diesel hours", "Schedule grid shift 11pm–5am", "Review vendor fuel contract"],
      autoable: false,
    },
  },
  {
    id: "card-005",
    type: "opportunity",
    priority: "low",
    agent: "Growth",
    agentIcon: "📈",
    sector: "General",
    timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
    track: {
      headline: "Customer segment B up 34% this quarter",
      detail: "Segment B orders: 2,840 units (vs 2,120 last quarter)",
      metric: { value: "+34%", direction: "up", color: "accent" },
    },
    predict: {
      headline: "Segment B projected to be your #1 revenue source by Q3",
      confidence: 71,
      horizon: "3 months",
      detail: "Growth driven by product line X — 3 competitors exited this segment",
    },
    action: {
      headline: "Increase Segment B marketing budget by 15%",
      impact: "Potential PKR 320,000 additional quarterly revenue",
      steps: ["Reallocate 15% from Segment A budget", "Launch targeted campaign", "Track conversion rate"],
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
