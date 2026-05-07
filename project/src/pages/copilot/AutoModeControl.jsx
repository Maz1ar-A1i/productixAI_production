import React, { useState, useEffect } from 'react';
import { Settings, Zap, Info } from 'lucide-react';
import { feedService } from '../../services/feedService';

const AGENTS = [
  { id: 'sales',      label: 'Sales Agent',      emoji: '🧑‍💼', description: 'Lead management, follow-ups, revenue alerts' },
  { id: 'inventory',  label: 'Inventory Agent',   emoji: '📦', description: 'Stock alerts, auto-reorders, supplier triggers' },
  { id: 'production', label: 'Production Agent',  emoji: '🏭', description: 'Machine scoring, operator assignments, batch tracking' },
  { id: 'finance',    label: 'Finance Agent',     emoji: '💰', description: 'Budget alerts, cost optimization, profit gap detection' },
  { id: 'growth',     label: 'Growth Agent',      emoji: '📈', description: 'Market trends, opportunity detection, competitive signals' },
];

const MODE_OPTIONS = [
  { value: 'recommend', label: 'Recommend', color: 'var(--info)', desc: 'Suggests actions, you decide' },
  { value: 'assist',    label: 'Assist',    color: 'var(--warning)', desc: 'Prepares actions, 1-tap confirm' },
  { value: 'auto',      label: 'Auto',      color: 'var(--accent)', desc: 'Acts automatically, logs all actions' },
];

const Toggle = ({ on, onChange }) => (
  <button
    onClick={() => onChange(!on)}
    className={`toggle-track ${on ? 'on' : ''}`}
  >
    <div className="toggle-thumb" />
  </button>
);

const ModeSelector = ({ value, onChange }) => (
  <div className="flex gap-1">
    {MODE_OPTIONS.map(opt => (
      <button
        key={opt.value}
        onClick={() => onChange(opt.value)}
        className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-200"
        style={{
          background: value === opt.value ? opt.color : 'var(--bg-elevated)',
          color: value === opt.value ? (opt.value === 'auto' ? '#000' : '#000') : 'var(--text-secondary)',
          border: `1px solid ${value === opt.value ? opt.color : 'var(--border)'}`,
        }}
        title={opt.desc}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

export default function AutoModeControl() {
  const [settings, setSettings] = useState({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = feedService.getAutoMode();
    const defaults = {};
    AGENTS.forEach(a => {
      defaults[a.id] = stored[a.id] || { enabled: false, mode: 'recommend' };
    });
    setSettings(defaults);
  }, []);

  const updateAgent = (id, key, value) => {
    setSettings(prev => ({
      ...prev,
      [id]: { ...prev[id], [key]: value },
    }));
    setSaved(false);
  };

  const handleSave = () => {
    feedService.saveAutoMode(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const autoCount = Object.values(settings).filter(s => s.enabled && s.mode === 'auto').length;
  const assistCount = Object.values(settings).filter(s => s.enabled && s.mode === 'assist').length;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)', padding: '24px' }}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Settings size={22} style={{ color: 'var(--accent)' }} />
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Auto Mode</h1>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Control how autonomously each AI agent operates.
        </p>

        {/* Summary */}
        <div className="flex gap-3 mt-4">
          <div
            className="flex-1 rounded-xl p-3 text-center"
            style={{ background: 'var(--accent-dim)', border: '1px solid rgba(0,212,170,0.2)' }}
          >
            <div className="mono text-xl font-bold" style={{ color: 'var(--accent)' }}>{autoCount}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Fully Auto</div>
          </div>
          <div
            className="flex-1 rounded-xl p-3 text-center"
            style={{ background: 'var(--warning-dim)', border: '1px solid rgba(245,158,11,0.2)' }}
          >
            <div className="mono text-xl font-bold" style={{ color: 'var(--warning)' }}>{assistCount}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Assist Mode</div>
          </div>
          <div
            className="flex-1 rounded-xl p-3 text-center"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          >
            <div className="mono text-xl font-bold" style={{ color: 'var(--text-secondary)' }}>
              {AGENTS.length - autoCount - assistCount}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Recommend Only</div>
          </div>
        </div>
      </div>

      {/* Mode legend */}
      <div className="glass-card p-4 mb-6 flex items-start gap-3">
        <Info size={15} style={{ color: 'var(--info)', flexShrink: 0, marginTop: 1 }} />
        <div className="flex flex-col gap-1">
          {MODE_OPTIONS.map(opt => (
            <div key={opt.value} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span className="font-bold" style={{ color: opt.color, width: 70, flexShrink: 0 }}>{opt.label}</span>
              {opt.desc}
            </div>
          ))}
        </div>
      </div>

      {/* Agent Controls */}
      <div className="flex flex-col gap-3 mb-6">
        {AGENTS.map(agent => {
          const s = settings[agent.id] || { enabled: false, mode: 'recommend' };
          return (
            <div
              key={agent.id}
              className="glass-card p-5 transition-all duration-200"
              style={{
                border: s.enabled ? '1px solid var(--border-hover)' : '1px solid var(--border)',
                opacity: s.enabled ? 1 : 0.7,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                  >
                    {agent.emoji}
                  </div>
                  <div>
                    <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {agent.label}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {agent.description}
                    </div>
                  </div>
                </div>

                <Toggle
                  on={s.enabled}
                  onChange={(v) => updateAgent(agent.id, 'enabled', v)}
                />
              </div>

              {s.enabled && (
                <div className="mt-4 pt-4 border-t animate-fade-up" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between">
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Autonomy level</div>
                    <ModeSelector
                      value={s.mode}
                      onChange={(v) => updateAgent(agent.id, 'mode', v)}
                    />
                  </div>

                  {/* Mode description */}
                  <div className="mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {s.mode === 'recommend' && '🔔 AI will surface insights and ranked actions — you approve each one.'}
                    {s.mode === 'assist' && '⚡ AI prepares the action (draft order, draft message) — you confirm with one tap.'}
                    {s.mode === 'auto' && '🤖 AI acts fully automatically and logs everything. You review after.'}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Warning for full auto */}
      {autoCount > 0 && (
        <div
          className="rounded-xl p-4 mb-6 flex items-start gap-3 animate-fade-up"
          style={{ background: 'var(--warning-dim)', border: '1px solid rgba(245,158,11,0.3)' }}
        >
          <Zap size={16} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: 1 }} />
          <div className="text-sm" style={{ color: 'var(--warning)' }}>
            <strong>{autoCount} agent{autoCount > 1 ? 's' : ''} in Full Auto mode.</strong> All actions will be executed automatically and logged for your review. Ensure your business rules are configured before proceeding.
          </div>
        </div>
      )}

      {/* Save */}
      <button
        onClick={handleSave}
        className="btn-primary w-full py-3 text-base justify-center"
      >
        {saved ? '✅ Settings Saved!' : '💾 Save Auto Mode Settings'}
      </button>
    </div>
  );
}
