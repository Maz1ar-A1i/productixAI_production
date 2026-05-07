import React, { useState } from 'react';
import { Shirt, TrendingUp, TrendingDown, Zap, Package, AlertTriangle } from 'lucide-react';

const KPIS = [
  { label: 'Production Today',   value: '4,280 m',  change: '+8%',   up: true  },
  { label: 'Defect Rate',        value: '2.1%',     change: '-0.4%', up: true  },
  { label: 'Machine Utilisation',value: '81%',      change: '+3%',   up: true  },
  { label: 'Energy / 1000m',     value: '14.2 kWh', change: '+1.1',  up: false },
];

const MACHINES = [
  { id: 'Loom A1',  status: 'Running',  output: 920, target: 1000, efficiency: 92 },
  { id: 'Loom A2',  status: 'Running',  output: 870, target: 1000, efficiency: 87 },
  { id: 'Loom B1',  status: 'Warning',  output: 620, target: 1000, efficiency: 62 },
  { id: 'Loom B2',  status: 'Idle',     output: 0,   target: 1000, efficiency: 0  },
  { id: 'Dyeing 1', status: 'Running',  output: 380, target: 400,  efficiency: 95 },
];

const ALERTS = [
  { msg: 'Loom B1 efficiency below threshold — check yarn tension', severity: 'high' },
  { msg: 'Loom B2 idle for 2.5 hours — maintenance in progress',    severity: 'medium' },
  { msg: 'Fabric defect spike in Roll #47 — batch QC recommended',  severity: 'high' },
];

const statusColor = {
  Running: 'var(--success)',
  Warning: 'var(--warning)',
  Idle:    'var(--danger)',
};

export default function TextilePlugin() {
  const [tab, setTab] = useState('track');

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)', padding: '24px' }}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Shirt size={22} style={{ color: 'var(--accent)' }} />
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Process time productivity Dashboard</h1>
        <span className="badge badge-warning ml-2">Beta</span>
      </div>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        Machine cycles, process time efficiency, and operational bottlenecks
      </p>

      {/* Tabs */}
      <div className="flex gap-2 mb-8">
        {['track', 'predict', 'act'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-5 py-2 rounded-xl text-sm font-semibold capitalize transition-all duration-200"
            style={{
              background: tab === t ? 'var(--accent)' : 'var(--bg-elevated)',
              color:      tab === t ? '#000' : 'var(--text-secondary)',
              border:     '1px solid',
              borderColor: tab === t ? 'var(--accent)' : 'var(--border)',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── TRACK TAB ── */}
      {tab === 'track' && (
        <>
          {/* KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {KPIS.map(k => (
              <div key={k.label} className="metric-card">
                <div className="metric-label">{k.label}</div>
                <div className="metric-value" style={{ fontSize: 20, marginTop: 8 }}>{k.value}</div>
                <div className="flex items-center gap-1 mt-1">
                  {k.up ? <TrendingUp size={12} style={{ color: 'var(--success)' }} /> : <TrendingDown size={12} style={{ color: 'var(--danger)' }} />}
                  <span className="text-xs" style={{ color: k.up ? 'var(--success)' : 'var(--danger)' }}>
                    {k.change}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Machine Status */}
          <div className="glass-card p-5 mb-6">
            <div className="font-semibold text-sm mb-4" style={{ color: 'var(--text-primary)' }}>
              Machine Status — Live
            </div>
            <div className="flex flex-col gap-3">
              {MACHINES.map(m => (
                <div key={m.id} className="flex items-center gap-4">
                  <div className="w-20 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{m.id}</div>
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: statusColor[m.status] }}
                  />
                  <div className="flex-1">
                    <div
                      className="h-2 rounded-full"
                      style={{ background: 'var(--border)' }}
                    >
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${m.efficiency}%`,
                          background: m.efficiency > 80 ? 'var(--success)' : m.efficiency > 50 ? 'var(--warning)' : 'var(--danger)',
                        }}
                      />
                    </div>
                  </div>
                  <div className="mono text-xs w-16 text-right" style={{ color: 'var(--text-muted)' }}>
                    {m.output}/{m.target}m
                  </div>
                  <div
                    className="mono text-xs font-bold w-10 text-right"
                    style={{ color: statusColor[m.status] }}
                  >
                    {m.efficiency}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Alerts */}
          <div className="glass-card p-5">
            <div className="font-semibold text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <AlertTriangle size={15} style={{ color: 'var(--warning)' }} />
              Active Alerts
            </div>
            <div className="flex flex-col gap-2">
              {ALERTS.map((a, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 px-3 py-2.5 rounded-xl"
                  style={{
                    background: a.severity === 'high' ? 'var(--danger-dim)' : 'var(--warning-dim)',
                    border: `1px solid ${a.severity === 'high' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
                  }}
                >
                  <div
                    className="live-dot mt-1 flex-shrink-0"
                    style={{ background: a.severity === 'high' ? 'var(--danger)' : 'var(--warning)' }}
                  />
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{a.msg}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── PREDICT TAB ── */}
      {tab === 'predict' && (
        <div className="flex flex-col gap-6">
          <div className="glass-card p-6">
            <div className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Production Forecast — Next 7 Days
            </div>
            <div className="grid grid-cols-7 gap-2">
              {[4100, 4300, 4250, 4450, 4380, 4520, 4600].map((v, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-lg transition-all duration-500"
                    style={{
                      height: `${Math.round((v / 5000) * 100)}px`,
                      background: `linear-gradient(to top, var(--accent), rgba(0,212,170,0.4))`,
                    }}
                  />
                  <div className="mono text-xs" style={{ color: 'var(--text-muted)' }}>
                    D+{i + 1}
                  </div>
                  <div className="mono text-xs font-bold" style={{ color: 'var(--accent)' }}>
                    {(v / 1000).toFixed(1)}k
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                AI predicts +7.5% output improvement over 7 days if Loom B1 & B2 are restored — Confidence: 83%
              </span>
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              Defect Rate Forecast
            </div>
            <div className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              Current defect rate: 2.1% | Predicted in 30 days: <span style={{ color: 'var(--success)' }}>1.6%</span>
            </div>
            <div className="flex items-center gap-3 mt-2 p-3 rounded-xl" style={{ background: 'var(--success-dim)' }}>
              <TrendingDown size={18} style={{ color: 'var(--success)' }} />
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--success)' }}>
                  Defects trending down
                </div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Based on recent QC improvements and reduced machine stress
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ACT TAB ── */}
      {tab === 'act' && (
        <div className="flex flex-col gap-4">
          {[
            {
              title: 'Restore Loom B1 — adjust yarn tension to spec',
              priority: 'high',
              impact: '+320 m/shift recovery',
              autoable: false,
              steps: ['Stop loom B1', 'Adjust tension to 2.4 N/mm²', 'Run QC test on 50m sample', 'Resume production'],
            },
            {
              title: 'Schedule maintenance window for Loom B2 (3hrs)',
              priority: 'high',
              impact: 'Prevents PKR 48,000 in downtime losses',
              autoable: true,
              steps: ['Notify maintenance team', 'Source replacement bearings', 'Schedule 11pm–2am window'],
            },
            {
              title: 'Batch QC inspection on Roll #47–52',
              priority: 'medium',
              impact: 'Prevent defective shipment (≈ PKR 80,000 rejection risk)',
              autoable: false,
              steps: ['Pull rolls #47–52 from line', 'Run Q-check protocol', 'Log pass/fail in system'],
            },
          ].map((action, i) => (
            <div
              key={i}
              className="glass-card p-5"
              style={{ borderLeft: `2px solid ${action.priority === 'high' ? 'var(--danger)' : 'var(--warning)'}` }}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <span className={`badge ${action.priority === 'high' ? 'badge-danger' : 'badge-warning'} mb-2`}>
                    {action.priority.toUpperCase()}
                  </span>
                  <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                    💡 {action.title}
                  </div>
                  <div className="text-xs mt-1 font-semibold" style={{ color: 'var(--accent)' }}>
                    {action.impact}
                  </div>
                </div>
                {action.autoable && (
                  <span className="badge badge-accent flex-shrink-0">Auto-eligible</span>
                )}
              </div>
              <ul className="flex flex-col gap-1 mb-4">
                {action.steps.map((s, j) => (
                  <li key={j} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <span className="mono font-bold mt-0.5" style={{ color: 'var(--accent)', flexShrink: 0 }}>{j + 1}.</span>
                    {s}
                  </li>
                ))}
              </ul>
              <button className="btn-primary text-sm px-4 py-2">
                ✅ Take Action
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
