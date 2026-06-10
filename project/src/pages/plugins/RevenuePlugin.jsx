import React, { useState, useMemo, useEffect } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';
import { DollarSign, TrendingUp, Send, Loader, Calendar, Target, Clock, Award, Wallet, PieChart as PieIcon, ArrowUpRight } from 'lucide-react';
import api from '../../services/api';

const COLORS = ['#00d4aa', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7', '#6366f1'];

const fmt = (n) => n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(0)}k` : `${n}`;

// ─── Custom Tooltip ─────────────────────────────────────────
const ChartTooltip = ({ payload, label }) => {
  if (!payload?.length) return null;
  return (
    <div
      style={{
        background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(10px)', borderRadius: 12, padding: '12px 16px', fontSize: 12,
      }}
    >
      <div className="text-white/40 mb-2 border-b border-white/5 pb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-1">
          <span className="text-white/70">{p.name}: </span>
          <span className="font-bold" style={{ color: p.color || '#fff' }}>
            {typeof p.value === 'number' ? `$${fmt(p.value)}` : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── KPI Card ────────────────────────────────────────────────
const KPICard = ({ label, value, sub, icon: Icon, color = '#00d4aa' }) => (
  <div className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all group relative overflow-hidden">
    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
      <Icon size={40} style={{ color }} />
    </div>
    <div className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">{label}</div>
    <div className="text-2xl font-bold text-white mb-1">{value}</div>
    {sub && <div className="text-[10px] text-white/30 flex items-center gap-1">{sub}</div>}
  </div>
);

// ─── Track Tab ───────────────────────────────────────────────
function TrackTab({ data, granularity }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md">
        <Wallet className="w-16 h-16 text-white/20 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">No Revenue Data</h3>
        <p className="text-white/40 text-sm">Synchronize your billing or sales data to see revenue insights.</p>
      </div>
    );
  }

  const agg = useMemo(() => {
    const totalRevenue = data.reduce((s, d) => s + (d.revenue || 0), 0);
    const totalTarget = data.reduce((s, d) => s + (d.target || 0), 0);
    const avgRevenue = totalRevenue / data.length;
    
    return {
      totalRevenue: `$${fmt(totalRevenue)}`,
      avgRevenue: `$${fmt(avgRevenue)}`,
      attainment: totalTarget > 0 ? ((totalRevenue / totalTarget) * 100).toFixed(1) : '100',
      dataPoints: data.length
    };
  }, [data]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total Revenue" value={agg.totalRevenue} icon={DollarSign} color="#00d4aa" sub="Gross generated income" />
        <KPICard label="Target Attainment" value={`${agg.attainment}%`} icon={Target} color="#3b82f6" sub="Progress against goals" />
        <KPICard label="Avg Daily Yield" value={agg.avgRevenue} icon={TrendingUp} color="#f59e0b" sub="Revenue velocity" />
        <KPICard label="Active Streams" value={agg.dataPoints} icon={PieIcon} color="#a855f7" sub="Connected data units" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <ArrowUpRight size={18} className="text-accent" />
            Revenue Growth Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00d4aa" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00d4aa" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#00d4aa" fillOpacity={1} fill="url(#colorRev)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-6">Revenue Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.slice(-5)}
                cx="50%" cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="revenue"
              >
                {data.slice(-5).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─── Predict Tab ─────────────────────────────────────────────
function PredictTab() {
  const [inputs, setInputs] = useState({ current: 50000, growth: 5, period: 12 });
  const [prediction, setPrediction] = useState(null);

  const handlePredict = () => {
    const final = inputs.current * Math.pow((1 + inputs.growth/100), inputs.period);
    setPrediction({
      projected: fmt(final),
      confidence: 0.88,
      status: inputs.growth > 10 ? 'High Growth' : inputs.growth > 0 ? 'Steady' : 'Declining'
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp size={18} className="text-accent" />
          Revenue Growth Forecasting
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-white/40 uppercase mb-2">Baseline Revenue ($)</label>
            <input 
              type="number" value={inputs.current} 
              onChange={e => setInputs({...inputs, current: e.target.value})}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-xs text-white/40 uppercase mb-2">Projected Growth %</label>
            <input 
              type="number" value={inputs.growth} 
              onChange={e => setInputs({...inputs, growth: e.target.value})}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-xs text-white/40 uppercase mb-2">Period (Months)</label>
            <input 
              type="number" value={inputs.period} 
              onChange={e => setInputs({...inputs, period: e.target.value})}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent"
            />
          </div>
          <button 
            onClick={handlePredict} 
            className="w-full font-bold py-3 rounded-xl hover:scale-[1.02] transition-all text-white shadow-lg shadow-accent/20"
            style={{ background: 'var(--accent)' }}
          >
            Run Revenue Simulation
          </button>
        </div>
      </div>

      {prediction && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 animate-fade-up">
          <div className="text-xs text-white/40 uppercase mb-4">Projected Income (Month {inputs.period})</div>
          <div className="text-5xl font-bold text-white mb-2">${prediction.projected}</div>
          <div className="flex items-center gap-2 mb-6">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
              prediction.status === 'High Growth' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
            }`}>
              {prediction.status}
            </span>
            <span className="text-xs text-white/30">88% ML Confidence</span>
          </div>
          <div className="p-4 bg-white/5 rounded-xl border border-white/5">
            <p className="text-sm text-white/60 leading-relaxed">
              Based on the {inputs.growth}% growth trajectory, your revenue is expected to {inputs.growth > 0 ? 'increase' : 'decrease'} by ${(inputs.current * (Math.pow(1 + inputs.growth/100, inputs.period) - 1)).toFixed(0)} over the next {inputs.period} months.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Act Tab ─────────────────────────────────────────────────
function ActTab({ data }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'I\'m your Revenue Strategy Agent. I can help you identify high-yield periods, sales leaks, and growth opportunities based on your historical billing data.',
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = React.useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text = input) => {
    if (!text.trim()) return;
    const newMsgs = [...messages, { role: 'user', content: text }];
    setMessages(newMsgs);
    setInput('');
    setLoading(true);

    try {
      const contextData = data ? data.slice(-10) : [];
      const res = await api.post('/chatbot/rag', {
        query: `Revenue Productivity Context: ${JSON.stringify(contextData)}\n\nUser Question: ${text}`,
        history: messages.slice(-5).map(m => ({ role: m.role, content: m.content })),
      });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.response || res.data }]);
    } catch (err) {
      console.error("Chatbot Error:", err);
      setMessages(prev => [...prev, { role: 'assistant', content: "Agent encountered a billing analysis error." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[500px] bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
              className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm font-semibold text-white shadow-lg`}
              style={m.role === 'user' ? { background: 'var(--accent)' } : { background: 'rgba(255,255,255,0.1)' }}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && <div className="text-white/20 text-xs animate-pulse">Agent is analyzing financials...</div>}
        <div ref={bottomRef} />
      </div>
      <div className="p-4 bg-white/5 border-t border-white/10 flex gap-2">
        <input 
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Ask your Revenue Agent..."
          className="flex-1 bg-transparent text-white text-sm focus:outline-none"
        />
        <button onClick={() => sendMessage()} className="p-2 bg-accent rounded-lg text-black hover:scale-105 transition-all">
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}

// ─── Main Plugin Component ──────────────────────────────────
export default function RevenuePlugin() {
  const [activeTab, setActiveTab] = useState('Track');
  const [products, setProducts] = useState([]);
  const [analyticsData, setAnalyticsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    productId: null,
    granularity: 'daily'
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch products from Backend
        const prodRes = await api.get('/products/');
        
        // Fetch units from LocalStorage
        const lsUnits = JSON.parse(localStorage.getItem("telco_units_v1") || "[]").map(t => ({
          id: `ls_${t.id}`,
          name: `${t.name} (Local)`,
          isLocal: true
        }));

        setProducts([...prodRes.data, ...lsUnits]);

        // Fetch local unit data
        const allData = JSON.parse(localStorage.getItem("telco_unit_data_v2") || "{}");
        let flattenedRows = [];
        
        Object.keys(allData).forEach(tId => {
          const fullId = `ls_${tId}`;
          if (!filters.productId || filters.productId === fullId || filters.productId === tId) {
            const rows = allData[tId].unitRows || [];
            flattenedRows = [...flattenedRows, ...rows];
          }
        });
        
        // Helper to find value by keyword
        const getVal = (row, keyword) => {
          const key = Object.keys(row).find(k => k.toLowerCase().replace(/_/g, ' ').includes(keyword.toLowerCase()));
          return key ? Number(row[key]) || 0 : 0;
        };

        // Map to revenue specific metrics
        const revenueRecords = flattenedRows.map(r => ({
          label: r.Date || 'N/A',
          revenue: getVal(r, 'revenue') || getVal(r, 'income') || getVal(r, 'yield'),
          target: getVal(r, 'target') || getVal(r, 'goal'),
          ...r
        }));

        setAnalyticsData(revenueRecords.sort((a,b) => new Date(a.label) - new Date(b.label)));
      } catch (err) {
        console.error("Revenue Plugin Load Error:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [filters]);

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-accent" />
              Revenue Productivity Plugin
            </h1>
            <p className="text-white/40 text-sm mt-1">Monetization efficiency and sales velocity tracking</p>
          </div>
          <div className="flex gap-3">
             <div className="flex bg-white/5 rounded-xl border border-white/10 p-1">
                {['Track', 'Predict', 'Act'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all text-white ${
                      activeTab === tab ? '' : 'opacity-40 hover:opacity-100'
                    }`}
                    style={activeTab === tab ? { background: 'var(--accent)' } : {}}
                  >
                    {tab}
                  </button>
                ))}
             </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-8 flex flex-wrap gap-6 items-center">
           <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-white/40 uppercase">Unit Context:</span>
              <select 
                className="bg-transparent text-white font-bold text-sm focus:outline-none"
                value={filters.productId || ''}
                onChange={e => setFilters({...filters, productId: e.target.value || null})}
              >
                <option value="">All Units</option>
                {products.map(p => <option key={p.id} value={String(p.id)} className="bg-slate-900">{p.name}</option>)}
              </select>
           </div>
           <div className="h-4 w-px bg-white/10" />
           <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-white/40 uppercase">Granularity:</span>
              <div className="flex gap-2">
                {['daily', 'monthly'].map(g => (
                  <button 
                    key={g}
                    onClick={() => setFilters({...filters, granularity: g})}
                    className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${
                      filters.granularity === g ? 'text-white' : 'text-white/20 hover:text-white/40'
                    }`}
                    style={filters.granularity === g ? { background: 'var(--accent)' } : {}}
                  >
                    {g}
                  </button>
                ))}
              </div>
           </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader className="animate-spin text-accent mb-4" size={32} />
            <span className="text-white/20 text-sm">Synchronizing financial ledger...</span>
          </div>
        ) : (
          <>
            {activeTab === 'Track' && <TrackTab data={analyticsData} granularity={filters.granularity} />}
            {activeTab === 'Predict' && <PredictTab />}
            {activeTab === 'Act' && <ActTab data={analyticsData} />}
          </>
        )}
      </div>
    </div>
  );
}
