import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, TrendingUp, TrendingDown, 
  Users, Package, AlertTriangle, BarChart3,
  Search, Filter, ArrowRight, Zap, RefreshCcw,
  Database
} from 'lucide-react';
import api from '../../services/api';

export default function RetailPlugin() {
  const [tab, setTab] = useState('track');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    kpis: [],
    inventory: [],
    actions: [],
    source: 'demo'
  });

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [kpiRes, invRes, actRes] = await Promise.all([
        api.get('/plugins/retail/kpis'),
        api.get('/plugins/retail/inventory'),
        api.get('/plugins/retail/actions'),
      ]);
      
      setData({
        kpis: kpiRes.data.kpis,
        inventory: invRes.data.inventory,
        actions: actRes.data.actions,
        source: kpiRes.data.source || 'demo'
      });
    } catch (err) {
      console.error("Failed to fetch retail data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)', padding: '24px' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
           <div className="flex items-center gap-2 mb-1">
             <ShoppingBag size={22} style={{ color: 'var(--accent)' }} />
             <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Energy productivity Dashboard</h1>
             <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border ml-2 ${
               data.source === 'live' 
               ? 'bg-teal-500/10 text-teal-500 border-teal-500/20' 
               : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
             }`}>
               <div className={`w-1.5 h-1.5 rounded-full ${data.source === 'live' ? 'bg-teal-500 animate-pulse' : 'bg-amber-500'}`} />
               {data.source === 'live' ? 'LIVE DATA' : 'DEMO MODE'}
             </div>
           </div>
           <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
             Energy consumption efficiency, utility velocity, and cost analysis
           </p>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={fetchAllData}
             className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all flex items-center gap-2"
           >
              <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
           </button>
           <button className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all">
              <Filter size={18} />
           </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 p-1 rounded-2xl w-fit" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
        {['track', 'predict', 'act'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-6 py-2 rounded-xl text-sm font-semibold capitalize transition-all duration-200"
            style={{
              background: tab === t ? 'var(--accent)' : 'transparent',
              color:      tab === t ? '#000' : 'var(--text-secondary)',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── TRACK TAB ── */}
      {tab === 'track' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             {data.kpis.map(k => (
               <div key={k.label} className="metric-card">
                 <div className="metric-label">{k.label}</div>
                 <div className="metric-value font-bold" style={{ fontSize: 24, marginTop: 12, color: 'var(--text-primary)' }}>{k.value}</div>
                 <div className="flex items-center gap-1 mt-1">
                   {k.status === 'up' ? <TrendingUp size={14} style={{ color: 'var(--success)' }} /> : <TrendingDown size={14} style={{ color: 'var(--warning)' }} />}
                   <span className="text-xs font-bold" style={{ color: k.status === 'up' ? 'var(--success)' : 'var(--warning)' }}>
                     {k.change}
                   </span>
                 </div>
               </div>
             ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <div className="glass-card p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                   <Package size={18} style={{ color: 'var(--accent)' }} /> 
                   Critical Inventory
                </h3>
                <div className="space-y-3">
                   {data.inventory.length > 0 ? data.inventory.map(item => (
                     <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                        <div>
                           <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{item.name}</div>
                           <div className="mono text-[10px] opacity-40">{item.id}</div>
                        </div>
                        <div className="text-right">
                           <div className="text-sm font-bold" style={{ color: item.status === 'Critical' ? 'var(--danger)' : item.status === 'Low' ? 'var(--warning)' : 'var(--success)' }}>
                              {item.stock} / {item.reorder}
                           </div>
                           <div className="text-[10px] opacity-40 uppercase font-bold">{item.status}</div>
                        </div>
                     </div>
                   )) : (
                     <div className="text-center py-8 opacity-20 text-xs text-white">No inventory mapped in DB</div>
                   )}
                </div>
             </div>

             <div className="glass-card p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                   <Users size={18} style={{ color: 'var(--info)' }} /> 
                   Peak Hour Footfall
                </h3>
                <div className="flex items-end gap-1.5 h-32 mt-8">
                   {[30, 45, 60, 85, 100, 95, 70, 40, 20].map((v, i) => (
                     <div key={i} className="flex-1 rounded-t-lg bg-teal-500/20 relative group border-t border-teal-500/50" style={{ height: `${v}%` }}>
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-teal-500">
                           {v}%
                        </div>
                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] opacity-40">
                           {10 + i}h
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      )}

      {/* ── PREDICT TAB ── */}
      {tab === 'predict' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <div className="lg:col-span-2 space-y-6">
              <div className="glass-card p-8">
                 <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Sales Forecast</h3>
                 <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>AI projection for the next 30 days based on seasonal trends</p>
                 
                 <div className="relative h-48 w-full">
                    {/* SVG Chart Placeholder */}
                    <svg className="w-full h-full overflow-visible">
                       <path 
                         d="M0 100 Q 50 120, 100 80 T 200 60 T 300 90 T 400 40 T 500 70" 
                         fill="none" 
                         stroke="var(--accent)" 
                         strokeWidth="3"
                         className="chart-path"
                       />
                       <path 
                         d="M0 100 Q 50 120, 100 80 T 200 60 T 300 90 T 400 40 T 500 70 V 200 H 0 Z" 
                         fill="url(#gradient)"
                         opacity="0.1"
                       />
                       <defs>
                          <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="0%" stopColor="var(--accent)" />
                             <stop offset="100%" stopColor="transparent" />
                          </linearGradient>
                       </defs>
                    </svg>
                 </div>
                 <div className="flex justify-between items-center mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2">
                       <Zap size={16} className="text-teal-500" />
                       <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          Demand spike of <span className="text-teal-500 font-bold">+22%</span> predicted for upcoming weekend
                       </span>
                    </div>
                    <span className="badge badge-accent">88% Conf.</span>
                 </div>
              </div>
           </div>

           <div className="space-y-6">
              <div className="glass-card p-6">
                 <h3 className="font-bold text-sm mb-4" style={{ color: 'var(--text-primary)' }}>Stockout Probability</h3>
                 <div className="space-y-4">
                    {[
                      { item: 'Linen Trousers', prob: 94, color: 'var(--danger)' },
                      { item: 'Cotton Tee', prob: 68, color: 'var(--warning)' },
                      { item: 'Denim Jacket', prob: 12, color: 'var(--success)' },
                    ].map(st => (
                      <div key={st.item}>
                         <div className="flex justify-between text-xs mb-1 font-bold">
                            <span style={{ color: 'var(--text-secondary)' }}>{st.item}</span>
                            <span style={{ color: st.color }}>{st.prob}%</span>
                         </div>
                         <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${st.prob}%`, background: st.color }} />
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
              
              <div className="glass-card p-6 bg-teal-500/5">
                 <h3 className="font-bold text-sm mb-2" style={{ color: 'var(--accent)' }}>AI Opportunity</h3>
                 <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
                    Basket size can be improved by 14% by cross-merchandising Silk Scarfs with Linen Trousers at checkout.
                 </p>
                 <button className="btn-primary w-full text-xs py-2">Apply Recommendation</button>
              </div>
           </div>
        </div>
      )}

      {/* ── ACT TAB ── */}
      {tab === 'act' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {data.actions.map((action, i) => (
             <div key={i} className="glass-card p-6 hover:border-teal-500/30 transition-all">
                <div className="flex justify-between items-start mb-4">
                   <div className="p-2 rounded-xl bg-teal-500/10 text-teal-500">
                      <Zap size={20} />
                   </div>
                   {action.autoable && <span className="badge badge-accent">Auto-Eligible</span>}
                </div>
                <h3 className="font-bold text-base mb-1" style={{ color: 'var(--text-primary)' }}>{action.title}</h3>
                <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>{action.reason}</p>
                
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 mb-4">
                   <div className="text-[10px] font-bold opacity-40 uppercase mb-1">Impact</div>
                   <div className="text-sm font-bold" style={{ color: 'var(--accent)' }}>{action.impact}</div>
                </div>

                <ul className="space-y-1.5 mb-6">
                   {action.steps.map((s, j) => (
                     <li key={j} className="flex items-center gap-2 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                        <ArrowRight size={10} className="text-teal-500" /> {s}
                     </li>
                   ))}
                </ul>

                <button className="btn-primary w-full py-2.5 text-sm">
                   Confirm & Execute
                </button>
             </div>
           ))}
        </div>
      )}
    </div>
  );
}
