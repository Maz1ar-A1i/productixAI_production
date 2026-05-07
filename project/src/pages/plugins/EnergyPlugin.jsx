import React, { useState, useMemo, useEffect } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';
import { Zap, TrendingUp, Send, Loader, Calendar, Database, Target, Clock, Award, Droplet, Sun, DollarSign } from 'lucide-react';
import api from '../../services/api';

const COLORS = ['#3b82f6', '#f59e0b', '#00d4aa', '#ef4444', '#a855f7', '#6366f1'];

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
            {typeof p.value === 'number' ? (p.value > 100 ? fmt(p.value) : p.value.toFixed(2)) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── KPI Card ────────────────────────────────────────────────
const KPICard = ({ label, value, sub, icon: Icon, color = '#3b82f6' }) => (
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
    return <div className="py-20 text-center text-white/20">No energy data found for the selected context.</div>;
  }

  const agg = useMemo(() => {
    const totalGrid = data.reduce((sum, r) => sum + (Number(r.grid_kwh) || 0), 0);
    const totalFuel = data.reduce((sum, r) => sum + (Number(r.fuel_consumed) || 0), 0);
    const totalProduced = data.reduce((sum, r) => sum + (Number(r.kw_produced) || 0), 0);
    const totalRevenue = data.reduce((sum, r) => sum + (Number(r.revenue) || 0), 0);
    
    const totalInputKwh = totalGrid + (totalFuel * 3.5);
    const avgEfficiency = totalInputKwh > 0 ? (totalProduced / totalInputKwh).toFixed(2) : '0.00';

    const energyMix = [
      { name: 'Grid kWh', value: totalGrid },
      { name: 'Diesel kWh', value: totalFuel * 3.5 },
    ];

    return { totalGrid, totalFuel, totalProduced, avgEfficiency, energyMix, totalRevenue };
  }, [data]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Grid Consumption" value={`${fmt(agg.totalGrid)} kWh`} sub="Utility Power" icon={Zap} color="#3b82f6" />
        <KPICard label="Total Produced" value={`${fmt(agg.totalProduced)} kW`} sub="Energy Output" icon={Award} color="#00d4aa" />
        <KPICard label="Fuel Usage" value={`${fmt(agg.totalFuel)} L`} sub="Diesel Consumption" icon={Droplet} color="#f59e0b" />
        <KPICard label="System Efficiency" value={`${agg.avgEfficiency}`} sub="kW Out / kWh In" icon={TrendingUp} color="#a855f7" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
             <Calendar size={18} className="text-accent" />
             Energy Consumption Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorGrid" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorFuel" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="grid_kwh" name="Grid (kWh)" stroke="#3b82f6" fillOpacity={1} fill="url(#colorGrid)" strokeWidth={3} />
              <Area type="monotone" dataKey="fuel_consumed" name="Fuel (L)" stroke="#f59e0b" fillOpacity={1} fill="url(#colorFuel)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-6">Energy Source Mix</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={agg.energyMix}
                cx="50%" cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {agg.energyMix.map((entry, index) => (
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
  const [inputs, setInputs] = useState({ grid_availability: 18, solar_capacity: 50, load: 120 });
  const [prediction, setPrediction] = useState(null);

  const handlePredict = () => {
    // Mock predictive logic for energy
    const gridShortage = Math.max(0, 24 - inputs.grid_availability);
    const predictedFuel = (gridShortage * inputs.load * 0.25).toFixed(2); // 0.25L per kWh approx
    const savings = (inputs.solar_capacity * 4 * 0.15).toFixed(2); // 4 hours sun, $0.15/kWh

    setPrediction({
      fuel_needed: predictedFuel,
      solar_savings: savings,
      efficiency_index: (inputs.grid_availability / 24 * 100).toFixed(1),
      status: gridShortage > 6 ? 'High Cost Risk' : 'Optimal'
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Sun size={18} className="text-yellow-400" />
          Renewable Energy Planner
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-white/40 uppercase mb-2">Grid Availability (Hours/Day)</label>
            <input 
              type="number" value={inputs.grid_availability} 
              onChange={e => setInputs({...inputs, grid_availability: e.target.value})}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-xs text-white/40 uppercase mb-2">Solar Capacity (kWp)</label>
            <input 
              type="number" value={inputs.solar_capacity} 
              onChange={e => setInputs({...inputs, solar_capacity: e.target.value})}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-xs text-white/40 uppercase mb-2">Avg Site Load (kW)</label>
            <input 
              type="number" value={inputs.load} 
              onChange={e => setInputs({...inputs, load: e.target.value})}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent"
            />
          </div>
          <button 
            onClick={handlePredict} 
            className="w-full font-bold py-3 rounded-xl hover:scale-[1.02] transition-all text-white shadow-lg shadow-accent/20"
            style={{ background: 'var(--accent)' }}
          >
            Predict Consumption & Savings
          </button>
        </div>
      </div>

      {prediction && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 animate-fade-up">
          <div className="text-xs text-white/40 uppercase mb-4">AI Forecast Summary</div>
          <div className="grid grid-cols-2 gap-4 mb-6">
             <div className="p-4 bg-white/5 rounded-xl">
                <div className="text-[10px] text-white/30 uppercase">Fuel Needed</div>
                <div className="text-2xl font-bold text-white">{prediction.fuel_needed}L</div>
             </div>
             <div className="p-4 bg-white/5 rounded-xl">
                <div className="text-[10px] text-white/30 uppercase">Solar Offset</div>
                <div className="text-2xl font-bold text-accent">${prediction.solar_savings}</div>
             </div>
          </div>
          <div className="flex items-center gap-2 mb-6">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
              prediction.status === 'Optimal' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {prediction.status}
            </span>
            <span className="text-xs text-white/30">{prediction.efficiency_index}% Grid Reliability</span>
          </div>
          <div className="p-4 bg-white/5 rounded-xl border border-white/5">
            <p className="text-sm text-white/60 leading-relaxed">
              To minimize diesel dependency, consider increasing solar capacity by {((inputs.load - inputs.solar_capacity) * 0.4).toFixed(0)} kWp. 
              {prediction.status === 'High Cost Risk' ? ' Critical fuel expenditure detected for next period.' : ' Current mix is cost-effective.'}
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
      content: 'I\'m your Energy Strategy Agent. I\'ve reviewed your energy consumption patterns. Ask me about fuel reduction, solar ROI, or grid optimization.',
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
        query: `Energy Productivity Context (Last 10 Days): ${JSON.stringify(contextData)}\n\nUser Question: ${text}`,
        history: messages.slice(-5).map(m => ({ role: m.role, content: m.content })),
      });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.response || res.data }]);
    } catch (err) {
      console.error("Chatbot Error:", err);
      const errMsg = err.response?.data?.detail || err.response?.data?.response || err.message;
      setMessages(prev => [...prev, { role: 'assistant', content: `Agent Error: ${errMsg}` }]);
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
        {loading && <div className="text-white/20 text-xs animate-pulse">Agent is thinking...</div>}
        <div ref={bottomRef} />
      </div>
      <div className="p-4 bg-white/5 border-t border-white/10 flex gap-2">
        <input 
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Ask your Energy Agent..."
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
export default function EnergyPlugin() {
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
        
        // Fetch towers from LocalStorage
        const lsTowers = JSON.parse(localStorage.getItem("telco_towers_v1") || "[]").map(t => ({
          id: `ls_${t.id}`,
          name: `${t.name} (Local)`,
          isLocal: true
        }));

        setProducts([...prodRes.data, ...lsTowers]);

        // Fetch local tower data (Dictionary structure: { towerId: { towerRows: [], tenantRows: [] } })
        const allData = JSON.parse(localStorage.getItem("telco_tower_data_v2") || "{}");
        let flattenedRows = [];
        
        Object.keys(allData).forEach(tId => {
          const fullId = `ls_${tId}`;
          if (!filters.productId || filters.productId === fullId || filters.productId === tId) {
            const rows = allData[tId].towerRows || [];
            flattenedRows = [...flattenedRows, ...rows];
          }
        });
        
        // Helper to find value by keyword in keys
        const getVal = (row, keyword) => {
          const key = Object.keys(row).find(k => k.toLowerCase().replace(/_/g, ' ').includes(keyword.toLowerCase()));
          return key ? Number(row[key]) || 0 : 0;
        };

        // Map to energy specific metrics
        const energyRecords = flattenedRows.map(r => {
          const grid = getVal(r, 'grid');
          const fuel = getVal(r, 'fuel');
          const produced = getVal(r, 'produced') || getVal(r, 'sold') || getVal(r, 'output');
          const revenue = getVal(r, 'revenue');
          
          const consumption = grid + (fuel * 3.5); // Convert fuel to kWh equivalent approx

          return {
            label: r.Date || 'N/A',
            grid_kwh: grid,
            fuel_consumed: fuel,
            kw_produced: produced,
            revenue: revenue,
            productivity: consumption > 0 ? (produced / consumption) : 0,
            ...r
          };
        });

        setAnalyticsData(energyRecords);
      } catch (err) {
        console.error("Energy Plugin Load Error:", err);
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
              <Zap className="w-8 h-8 text-accent" />
              Energy Productivity Plugin
            </h1>
            <p className="text-white/40 text-sm mt-1">Grid reliability tracking and diesel consumption optimization</p>
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
              <span className="text-xs font-bold text-white/40 uppercase">Tower / Unit:</span>
              <select 
                className="bg-transparent text-white font-bold text-sm focus:outline-none"
                value={filters.productId || ''}
                onChange={e => setFilters({...filters, productId: e.target.value || null})}
              >
                <option value="">All Towers</option>
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
            <span className="text-white/20 text-sm">Synchronizing energy telemetry...</span>
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
