import React, { useState, useEffect } from 'react';
import { 
  Settings, TrendingUp, TrendingDown, 
  Wrench, Activity, AlertCircle, BarChart3,
  Clock, Truck, ArrowRight, Zap, PenTool, RefreshCcw
} from 'lucide-react';
import api from '../../services/api';

export default function AutoPlugin() {
  const [tab, setTab] = useState('track');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    kpis: [],
    lines: [],
    actions: [],
    source: 'demo'
  });

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [kpiRes, lineRes, actRes] = await Promise.all([
        api.get('/plugins/auto/kpis'),
        api.get('/plugins/auto/line-status'),
        api.get('/plugins/auto/actions'),
      ]);
      
      setData({
        kpis: kpiRes.data.kpis,
        lines: lineRes.data.lines,
        actions: actRes.data.actions,
        source: kpiRes.data.source || 'demo'
      });
    } catch (err) {
      console.error("Failed to fetch auto data", err);
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
             <Settings size={22} style={{ color: 'var(--accent)' }} />
             <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Automotive Agent</h1>
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
             Assembly line yield, OEE monitoring, and component lead-time prediction
           </p>
        </div>
        <div className="flex gap-2">
            <button 
              onClick={fetchAllData}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all flex items-center gap-2"
            >
               <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             <div className="lg:col-span-2 glass-card p-6">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                   <Activity size={18} style={{ color: 'var(--accent)' }} /> 
                   Assembly Line Status
                </h3>
                <div className="space-y-6">
                   {data.lines.length > 0 ? data.lines.map(line => (
                     <div key={line.id}>
                        <div className="flex justify-between items-center mb-2">
                           <div className="flex items-center gap-3">
                              <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{line.id}</span>
                              <span className="text-[10px] opacity-40 uppercase">{line.station}</span>
                           </div>
                           <div className="flex items-center gap-4">
                              <span className="mono text-xs opacity-60 text-white">Uptime: {line.uptime}%</span>
                              <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${line.status === 'Running' ? 'bg-teal-500/10 text-teal-500' : line.status === 'Warning' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'}`}>
                                 {line.status}
                              </div>
                           </div>
                        </div>
                        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                           <div className="h-full rounded-full transition-all duration-1000" 
                                style={{ 
                                  width: `${line.efficiency}%`, 
                                  background: line.efficiency > 85 ? 'var(--success)' : line.efficiency > 50 ? 'var(--warning)' : 'var(--danger)' 
                                }} 
                           />
                        </div>
                     </div>
                   )) : (
                     <div className="text-center py-12 opacity-20 text-xs text-white">No active assembly batches detected</div>
                   )}
                </div>
             </div>

             <div className="glass-card p-6 flex flex-col justify-between">
                <div>
                   <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--info)' }}>
                      <Clock size={18} /> 
                      Shift Performance
                   </h3>
                   <div className="p-4 rounded-xl bg-white/5 border border-white/10 mb-4">
                      <div className="text-[10px] font-bold opacity-40 mb-1 font-mono uppercase">Current Volume</div>
                      <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        {data.kpis.find(k => k.label === 'Total Production')?.value || '0'} 
                        <span className="text-xs opacity-40 font-normal ml-2">units</span>
                      </div>
                   </div>
                   <div className="space-y-4">
                      <div className="flex justify-between text-xs">
                         <span style={{ color: 'var(--text-secondary)' }}>Shift Efficiency</span>
                         <span style={{ color: 'var(--success)' }}>{data.kpis.find(k => k.label === 'Shift Efficiency')?.value || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                         <span style={{ color: 'var(--text-secondary)' }}>Defect Rate</span>
                         <span style={{ color: 'var(--danger)' }}>{data.kpis.find(k => k.label === 'Defect Rate')?.value || '0.00%'}</span>
                      </div>
                   </div>
                </div>
                <button className="btn-primary w-full py-2.5 text-xs mt-6">View Shift Report</button>
             </div>
          </div>
        </div>
      )}

      {/* ── PREDICT TAB ── */}
      {tab === 'predict' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <div className="glass-card p-6">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                 <Truck size={18} style={{ color: 'var(--accent)' }} /> 
                 Supply Chain Lead-Time Forecast
              </h3>
              <div className="space-y-4">
                 {[
                   { part: 'Alloy Wheels (Batch A)', current: 12, predicted: 19, risk: 'High', color: 'var(--danger)' },
                   { part: 'Engine Blocks (V6)',    current: 8,  predicted: 9,  risk: 'Low',  color: 'var(--success)' },
                   { part: 'Leather Trim (Global)', current: 15, predicted: 24, risk: 'High', color: 'var(--danger)' },
                   { part: 'Brake Rotors',           current: 5,  predicted: 6,  risk: 'Med',  color: 'var(--warning)' },
                 ].map(p => (
                   <div key={p.part} className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                      <div>
                         <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{p.part}</div>
                         <div className="text-[10px] opacity-40">Current: {p.current} days | <span style={{ color: p.color }}>Est: {p.predicted} days</span></div>
                      </div>
                      <div className="text-right">
                         <div className="badge uppercase" style={{ color: p.color, background: `${p.color}20`, borderColor: `${p.color}40` }}>{p.risk} Risk</div>
                      </div>
                   </div>
                 ))}
              </div>
           </div>

           <div className="space-y-6">
              <div className="glass-card p-6">
                 <h3 className="font-bold text-sm mb-4" style={{ color: 'var(--text-primary)' }}>Preventive Maintenance Signals</h3>
                 <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                    <div className="flex items-center gap-3 mb-3">
                       <Wrench className="text-amber-500" size={20} />
                       <div className="font-bold text-xs text-amber-500">AI Node Analytics</div>
                    </div>
                    <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
                       Dynamic analysis of assembly harmonics. High confidence signals will appear here once shift data stabilizes.
                    </p>
                    <div className="flex gap-2">
                       <button className="flex-1 py-2 rounded-lg bg-amber-500 text-black font-bold text-[10px] uppercase">Review Logs</button>
                       <button className="p-2 rounded-lg bg-white/5 text-white/40"><AlertCircle size={14}/></button>
                    </div>
                 </div>
              </div>

              <div className="glass-card p-6 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-teal-500/10 text-teal-500">
                       <BarChart3 size={24} />
                    </div>
                    <div>
                       <div className="text-xs opacity-60">Cycle Time Variance</div>
                       <div className="text-xl font-bold">Stable <span className="text-[10px] font-normal opacity-40">vs prev. month</span></div>
                    </div>
                 </div>
                 <Zap className="text-teal-500" size={20} />
              </div>
           </div>
        </div>
      )}

      {/* ── ACT TAB ── */}
      {tab === 'act' && (
        <div className="flex flex-col gap-4">
           {data.actions.map((action, i) => (
             <div key={i} className="glass-card p-6 flex flex-col md:flex-row gap-6 items-start">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10" style={{ color: action.priority === 'high' ? 'var(--danger)' : 'var(--accent)' }}>
                   {action.priority === 'high' ? <AlertCircle size={28} /> : <Zap size={28} />}
                </div>
                <div className="flex-1">
                   <div className="flex items-center gap-3 mb-2">
                      <span className={`badge uppercase ${action.priority === 'high' ? 'badge-danger' : 'badge-warning'}`}>{action.priority}</span>
                      {action.autoable && <span className="badge badge-accent uppercase">Auto-Ready</span>}
                   </div>
                   <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{action.title}</h3>
                   <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>{action.reason}</p>
                   
                   <div className="flex flex-wrap gap-2 mb-6">
                      {action.steps.map((s, idx) => (
                        <div key={idx} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                           {idx + 1}. {s}
                        </div>
                      ))}
                   </div>
                </div>
                <div className="w-full md:w-64 space-y-3">
                   <div className="p-4 rounded-xl bg-teal-500/5 border border-teal-500/10 text-center">
                      <div className="text-[10px] uppercase font-bold opacity-40 mb-1">Impact</div>
                      <div className="text-sm font-bold text-teal-500">{action.impact}</div>
                   </div>
                   <button className="btn-primary w-full py-3">Execute Action</button>
                </div>
             </div>
           ))}
        </div>
      )}
    </div>
  );
}
