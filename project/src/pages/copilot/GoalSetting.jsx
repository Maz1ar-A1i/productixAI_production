import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, TrendingUp, Check } from 'lucide-react';
import { feedService } from '../../services/feedService';

const GOAL_OPTIONS = [
  { id: 'sales', label: 'Increase Sales', emoji: '💰', description: 'Drive revenue growth and close more deals', defaultTarget: 20 },
  { id: 'profit', label: 'Improve Profit', emoji: '📈', description: 'Reduce costs and improve your margins', defaultTarget: 15 },
  { id: 'inventory', label: 'Reduce Inventory Cost', emoji: '📦', description: 'Optimize stock levels and reduce waste', defaultTarget: 10 },
  { id: 'efficiency', label: 'Improve Efficiency', emoji: '⚡', description: 'Boost machine output and reduce downtime', defaultTarget: 25 },
  { id: 'opex', label: 'Cut OPEX', emoji: '✂️', description: 'Reduce operating expenses across all areas', defaultTarget: 12 },
  { id: 'custom', label: 'Custom Goal', emoji: '🎯', description: 'Define your own improvement target', defaultTarget: 10 },
];

const TIMELINES = ['This Week', 'This Month', 'This Quarter'];

export default function GoalSetting() {
  const navigate = useNavigate();
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [target, setTarget] = useState(20);
  const [timeline, setTimeline] = useState('This Month');
  const [saved, setSaved] = useState(false);
  const [existing, setExisting] = useState(null);

  useEffect(() => {
    const g = feedService.getGoal();
    if (g) { setExisting(g); setSelectedGoal(g.id); setTarget(g.target); setTimeline(g.timeline || 'This Month'); }
  }, []);

  const handleSelectGoal = (g) => {
    setSelectedGoal(g.id);
    setTarget(g.defaultTarget);
    setSaved(false);
  };

  const handleSave = () => {
    if (!selectedGoal) return;
    const g = GOAL_OPTIONS.find(o => o.id === selectedGoal);
    feedService.saveGoal({ id: selectedGoal, label: g.label, target, timeline, emoji: g.emoji });
    setSaved(true);
    setTimeout(() => navigate('/feed'), 1200);
  };

  const currentGoalObj = GOAL_OPTIONS.find(o => o.id === selectedGoal);

  // Estimated impact
  const impactMap = {
    sales: `+₨${Math.round(target * 28000).toLocaleString()} / month`,
    profit: `+${(target * 0.8).toFixed(1)}% margin`,
    inventory: `₨${Math.round(target * 12000).toLocaleString()} saved / month`,
    efficiency: `+${Math.round(target * 12)} units / shift`,
    opex: `-₨${Math.round(target * 15000).toLocaleString()} / month`,
    custom: 'Impact calculated after AI analysis',
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)', padding: '24px' }}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Target size={22} style={{ color: 'var(--accent)' }} />
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Set Your Goal</h1>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Your AI Co-Pilot will align every recommendation to hit this target.
        </p>
        {existing && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--accent-dim)', border: '1px solid rgba(0,212,170,0.2)' }}>
            <span>{existing.emoji}</span>
            <span className="text-sm" style={{ color: 'var(--accent)' }}>
              Current goal: {existing.label} +{existing.target}% ({existing.timeline})
            </span>
          </div>
        )}
      </div>

      {/* Goal Options Grid */}
      <div className="section-title mb-3">What do you want to improve?</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {GOAL_OPTIONS.map(g => (
          <button
            key={g.id}
            onClick={() => handleSelectGoal(g)}
            className="glass-card p-4 text-left transition-all duration-200 hover:scale-[1.02]"
            style={{
              border: selectedGoal === g.id
                ? '1px solid var(--accent)'
                : '1px solid var(--border)',
              background: selectedGoal === g.id ? 'var(--accent-dim)' : undefined,
            }}
          >
            <div className="flex items-start justify-between mb-2">
              <span style={{ fontSize: 28 }}>{g.emoji}</span>
              {selectedGoal === g.id && (
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--accent)' }}>
                  <Check size={12} style={{ color: '#000' }} />
                </div>
              )}
            </div>
            <div className="font-semibold text-sm" style={{ color: selectedGoal === g.id ? 'var(--accent)' : 'var(--text-primary)' }}>
              {g.label}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {g.description}
            </div>
          </button>
        ))}
      </div>

      {/* Target Slider */}
      {selectedGoal && (
        <div className="glass-card p-6 mb-6 animate-fade-up">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                {currentGoalObj?.label} by how much?
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                AI will bias all recommendations toward this target
              </div>
            </div>
            <div
              className="mono text-3xl font-bold glow-text"
              style={{ minWidth: 80, textAlign: 'right' }}
            >
              {target}%
            </div>
          </div>

          <input
            type="range"
            min={1}
            max={50}
            value={target}
            onChange={e => setTarget(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, var(--accent) ${target * 2}%, var(--border) ${target * 2}%)`,
              outline: 'none',
            }}
          />

          <div className="flex justify-between mt-1">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>1%</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>50%</span>
          </div>

          {/* Estimated impact */}
          <div
            className="mt-4 flex items-center gap-3 px-4 py-3 rounded-lg"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          >
            <TrendingUp size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Estimated impact</div>
              <div className="font-semibold text-sm" style={{ color: 'var(--accent)' }}>
                {impactMap[selectedGoal]}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      {selectedGoal && (
        <div className="mb-8 animate-fade-up">
          <div className="section-title mb-3">Timeline</div>
          <div className="flex gap-3">
            {TIMELINES.map(t => (
              <button
                key={t}
                onClick={() => setTimeline(t)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                style={{
                  background: timeline === t ? 'var(--accent)' : 'var(--bg-elevated)',
                  color: timeline === t ? '#000' : 'var(--text-secondary)',
                  border: '1px solid',
                  borderColor: timeline === t ? 'var(--accent)' : 'var(--border)',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Save Button */}
      {selectedGoal && (
        <div className="animate-fade-up">
          <button
            onClick={handleSave}
            disabled={saved}
            className="btn-primary w-full py-3 text-base justify-center"
          >
            {saved ? '✅ Goal Saved! Redirecting...' : `🎯 Set Goal: ${currentGoalObj?.label} +${target}% (${timeline})`}
          </button>
          <p className="text-center text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
            All AI recommendations will align to your goal. You can update anytime.
          </p>
        </div>
      )}
    </div>
  );
}
