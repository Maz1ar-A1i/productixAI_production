import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronUp, ChevronDown, Check, Zap, X, TrendingUp, TrendingDown,
  Target, Mic, BarChart3, Clock, AlertTriangle, Sparkles, ArrowRight
} from 'lucide-react';
import { feedService } from '../../services/feedService';
import { authService, formulaService } from '../../services/api';

// ─── Helpers ──────────────────────────────────────────────
const priorityConfig = {
  high:   { color: 'var(--danger)',  label: 'URGENT',  cls: 'badge-danger' },
  medium: { color: 'var(--warning)', label: 'WATCH',   cls: 'badge-warning' },
  low:    { color: 'var(--accent)',  label: 'INSIGHT', cls: 'badge-accent' },
};

const MetricArrow = ({ direction }) =>
  direction === 'up'
    ? <TrendingUp size={16} style={{ color: 'var(--danger)' }} />
    : <TrendingDown size={16} style={{ color: 'var(--success)' }} />;

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff}m ago`;
  return `${Math.floor(diff / 60)}h ago`;
}

// ─── Confidence Bar ────────────────────────────────────────
const ConfidenceBar = ({ value }) => (
  <div className="mt-2">
    <div className="flex justify-between mb-1">
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Confidence</span>
      <span className="text-xs font-bold mono" style={{ color: 'var(--accent)' }}>{value}%</span>
    </div>
    <div className="h-1.5 rounded-full" style={{ background: 'var(--border)' }}>
      <div
        className="h-1.5 rounded-full transition-all duration-700"
        style={{ width: `${value}%`, background: 'var(--accent)' }}
      />
    </div>
  </div>
);

// ─── Reward Toast ──────────────────────────────────────────
const RewardToast = ({ reward, onDismiss }) => {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      className="fixed top-6 left-1/2 z-50 animate-reward-pop"
      style={{ transform: 'translateX(-50%)' }}
    >
      <div
        className="glass-card px-5 py-3 flex items-center gap-3 border"
        style={{ borderColor: 'var(--accent)', minWidth: 280 }}
      >
        <span className="text-xl">{reward.icon}</span>
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {reward.message}
        </span>
      </div>
    </div>
  );
};

// ─── Single Swipe Card ─────────────────────────────────────
const FeedCard = ({ card, onAction, isActive }) => {
  const [acting, setActing] = useState(false);
  const cfg = priorityConfig[card.priority];

  const handleAction = async (type) => {
    setActing(true);
    await onAction(card.id, type);
    setActing(false);
  };

  return (
    <div
      className="h-full flex flex-col gap-4 overflow-y-auto pb-4"
      style={{ scrollbarWidth: 'none' }}
    >
      {/* ── Card Header ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{card.agentIcon}</span>
          <div>
            <div className="text-xs font-bold" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {card.agent} Agent
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{timeAgo(card.timestamp)}</span>
            </div>
          </div>
        </div>
        <div className="live-dot" style={{ flexShrink: 0, marginTop: 6 }} />
      </div>

      {/* ── TRACK Section ── */}
      <div
        className="glass-card p-4 border-l-2"
        style={{ borderLeftColor: 'var(--info)' }}
      >
        <div className="section-title mb-2 flex items-center gap-2">
          <BarChart3 size={11} style={{ color: 'var(--info)' }} />
          TRACK
        </div>
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-sm leading-snug" style={{ color: 'var(--text-primary)' }}>
            {card.track.headline}
          </p>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span
              className="mono text-base font-bold"
              style={{ color: card.track.metric.color === 'danger' ? 'var(--danger)' : card.track.metric.color === 'warning' ? 'var(--warning)' : 'var(--accent)' }}
            >
              {card.track.metric.value}
            </span>
            <MetricArrow direction={card.track.metric.direction} />
          </div>
        </div>
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{card.track.detail}</p>
      </div>

      {/* ── PREDICT Section ── */}
      <div
        className="glass-card p-4 border-l-2"
        style={{ borderLeftColor: 'var(--warning)' }}
      >
        <div className="section-title mb-2 flex items-center gap-2">
          <Sparkles size={11} style={{ color: 'var(--warning)' }} />
          PREDICT
        </div>
        <p className="font-semibold text-sm leading-snug" style={{ color: 'var(--text-primary)' }}>
          {card.predict.headline}
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{card.predict.detail}</p>
        <ConfidenceBar value={card.predict.confidence} />
      </div>

      {/* ── ACT Section ── */}
      <div
        className="glass-card p-4 border-l-2"
        style={{ borderLeftColor: 'var(--accent)' }}
      >
        <div className="section-title mb-2 flex items-center gap-2">
          <Zap size={11} style={{ color: 'var(--accent)' }} />
          ACT
        </div>
        <p className="font-semibold text-sm leading-snug" style={{ color: 'var(--text-primary)' }}>
          💡 {card.action.headline}
        </p>
        <p className="text-xs mt-1 font-semibold" style={{ color: 'var(--accent)' }}>
          {card.action.impact}
        </p>
        <ul className="mt-2 flex flex-col gap-1">
          {card.action.steps.map((step, i) => (
            <li key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span className="mono font-bold mt-0.5" style={{ color: 'var(--accent)', flexShrink: 0 }}>{i + 1}.</span>
              {step}
            </li>
          ))}
        </ul>
      </div>

      {/* ── Action Buttons ── */}
      <div className="grid grid-cols-3 gap-3 mt-auto pt-2">
        <button
          onClick={() => handleAction('do_it')}
          disabled={acting}
          className="flex flex-col items-center gap-1.5 py-3 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-95"
          style={{
            background: 'var(--success-dim)',
            border: '1px solid rgba(16,185,129,0.3)',
            color: 'var(--success)',
          }}
        >
          <Check size={20} />
          <span className="text-xs">Do It</span>
        </button>

        <button
          onClick={() => handleAction('auto')}
          disabled={acting || !card.action.autoable}
          className="flex flex-col items-center gap-1.5 py-3 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-95"
          style={{
            background: 'var(--accent-dim)',
            border: `1px solid ${card.action.autoable ? 'rgba(0,212,170,0.3)' : 'var(--border)'}`,
            color: card.action.autoable ? 'var(--accent)' : 'var(--text-muted)',
            cursor: card.action.autoable ? 'pointer' : 'not-allowed',
          }}
        >
          <Zap size={20} />
          <span className="text-xs">Auto</span>
        </button>

        <button
          onClick={() => handleAction('skip')}
          disabled={acting}
          className="flex flex-col items-center gap-1.5 py-3 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-95"
          style={{
            background: 'var(--danger-dim)',
            border: '1px solid rgba(239,68,68,0.2)',
            color: 'var(--danger)',
          }}
        >
          <X size={20} />
          <span className="text-xs">Skip</span>
        </button>
      </div>
    </div>
  );
};

// ─── Loading Skeleton ──────────────────────────────────────
const CardSkeleton = () => (
  <div className="flex flex-col gap-4 h-full">
    {[120, 160, 180, 80].map((h, i) => (
      <div key={i} className="skeleton" style={{ height: h }} />
    ))}
  </div>
);

// ─── Custom Metrics Widget (Formula Builder results) ──────
const OUTPUT_METRIC_COLORS = { currency: 'var(--warning)', percentage: 'var(--accent)', number: 'var(--info)' };

const CustomMetricsWidget = () => {
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    formulaService.evaluateAll()
      .then(r => setMetrics(r.data || []))
      .catch(() => setMetrics([]))
      .finally(() => setLoading(false));
  }, []);

  if (!loading && metrics.length === 0) return null;

  return (
    <div style={{ flexShrink: 0, borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', padding: '10px 16px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Custom Metrics</div>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 2 }}>
        {loading ? [1,2,3].map(i => <div key={i} className="skeleton" style={{ width: 120, height: 54, flexShrink: 0 }} />) :
          metrics.map(m => (
            <div key={m.formula_id} style={{ flexShrink: 0, minWidth: 130, padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, transition: 'border-color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', marginBottom: 4 }}>
                {m.formula_name}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 17, fontWeight: 700, color: OUTPUT_METRIC_COLORS[m.output_type] || 'var(--text-primary)' }}>
                {m.formatted || 'N/A'}
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
};

// ─── Main Home Feed ────────────────────────────────────────
export default function HomeFeed() {
  const [cards, setCards] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [animDir, setAnimDir] = useState(null); // 'up' | 'down' | null
  const [reward, setReward] = useState(null);
  const [stats, setStats] = useState(null);
  const [goal, setGoal] = useState(null);
  const navigate = useNavigate();
  const touchStartY = useRef(0);

  useEffect(() => {
    feedService.getCards().then(data => {
      setCards(data);
      setLoading(false);
    });
    setStats(feedService.getStats());
    setGoal(feedService.getGoal());
  }, []);

  const goTo = useCallback((dir) => {
    if (dir === 'next' && index < cards.length - 1) {
      setAnimDir('up');
      setTimeout(() => { setIndex(i => i + 1); setAnimDir(null); }, 300);
    } else if (dir === 'prev' && index > 0) {
      setAnimDir('down');
      setTimeout(() => { setIndex(i => i - 1); setAnimDir(null); }, 300);
    }
  }, [index, cards.length]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') goTo('prev');
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') goTo('next');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goTo]);

  // Touch swipe
  const handleTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
  const handleTouchEnd = (e) => {
    const diff = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(diff) > 50) goTo(diff > 0 ? 'next' : 'prev');
  };

  // Wheel scroll
  const wheelLock = useRef(false);
  const handleWheel = useCallback((e) => {
    if (wheelLock.current) return;
    wheelLock.current = true;
    goTo(e.deltaY > 0 ? 'next' : 'prev');
    setTimeout(() => { wheelLock.current = false; }, 600);
  }, [goTo]);

  const handleAction = async (cardId, decision) => {
    const result = await feedService.actOnCard(cardId, decision);
    if (result.reward) setReward(result.reward);
    // Auto advance on do_it / skip
    if (decision !== 'auto') setTimeout(() => goTo('next'), 500);
  };

  const currentCard = cards[index];

  // ── User greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div
      className="flex flex-col h-screen"
      style={{ background: 'var(--bg-primary)', overflow: 'hidden' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      {/* ── Top Bar ── */}
      <div
        className="flex-shrink-0 px-6 py-4 flex items-start justify-between border-b"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              👋 {greeting}
            </span>
            <div className="live-dot" />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>LIVE</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Target size={13} style={{ color: 'var(--accent)' }} />
            <span className="text-xs" style={{ color: 'var(--accent)' }}>
              {goal ? `Goal: ${goal.label} +${goal.target}%` : "Set a goal →"}
            </span>
          </div>
        </div>

        {/* Stats Row */}
        {stats && (
          <div className="flex items-center gap-4">
            {[
              { label: 'Actions', value: stats.actionsToday, color: 'var(--accent)' },
              { label: 'Saved', value: `${stats.hoursaved}h`, color: 'var(--success)' },
              { label: 'Impact', value: stats.revenueImpact, color: 'var(--warning)' },
            ].map(s => (
              <div key={s.label} className="text-right hidden sm:block">
                <div className="mono text-sm font-bold" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Progress Dots ── */}
      {!loading && cards.length > 0 && (
        <div className="flex-shrink-0 flex justify-center gap-1.5 py-2">
          {cards.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className="transition-all duration-200"
              style={{
                width: i === index ? 20 : 6,
                height: 6,
                borderRadius: 3,
                background: i === index ? 'var(--accent)' : 'var(--border)',
                border: 'none',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>
      )}

      {/* ── Card Area ── */}
      <div className="flex-1 relative overflow-hidden">
        {/* Nav: previous */}
        {index > 0 && (
          <button
            onClick={() => goTo('prev')}
            className="absolute top-3 left-1/2 z-10 p-1.5 rounded-full transition-all duration-200 hover:scale-110 -translate-x-1/2"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          >
            <ChevronUp size={18} style={{ color: 'var(--text-muted)' }} />
          </button>
        )}

        {/* Card content */}
        <div
          className={`absolute inset-0 px-4 py-3 pt-8 ${
            animDir === 'up' ? 'animate-swipe-out-up' :
            animDir === 'down' ? 'animate-swipe-out-down' :
            'animate-swipe-in'
          }`}
        >
          {loading ? (
            <CardSkeleton />
          ) : currentCard ? (
            <FeedCard card={currentCard} onAction={handleAction} isActive />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="text-4xl">🎉</div>
              <div className="text-center">
                <div className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                  All caught up!
                </div>
                <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  No more actions for now. AI is monitoring for new signals.
                </div>
              </div>
              <div
                className="badge badge-accent animate-float"
                onClick={() => { setIndex(0); setLoading(true); feedService.getCards().then(d => { setCards(d); setLoading(false); }); }}
                style={{ cursor: 'pointer', padding: '8px 20px', fontSize: 13 }}
              >
                ↺ Refresh Feed
              </div>
            </div>
          )}
        </div>

        {/* Nav: next */}
        {!loading && index < cards.length - 1 && (
          <button
            onClick={() => goTo('next')}
            className="absolute bottom-3 left-1/2 z-10 p-1.5 rounded-full transition-all duration-200 hover:scale-110 -translate-x-1/2"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          >
            <ChevronDown size={18} style={{ color: 'var(--text-muted)' }} />
          </button>
        )}
      </div>

      {/* ── Bottom Nav Hint ── */}
      <div
        className="flex-shrink-0 flex items-center justify-around py-3 border-t"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
      >
        {[
          { icon: '🏠', label: 'Feed', path: '/feed', active: true },
          { icon: '⚡', label: 'Agents', path: '/agents' },
          { icon: '🎙', label: 'Voice', path: '/voice' },
          { icon: '📊', label: 'Reports', path: '/productivity/reports' },
          { icon: '⚙️', label: 'Settings', path: '/auto-mode' },
        ].map(item => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-all duration-150"
            style={{ background: item.active ? 'var(--accent-dim)' : 'transparent' }}
          >
            <span style={{ fontSize: 18 }}>{item.icon}</span>
            <span className="text-xs font-medium" style={{ color: item.active ? 'var(--accent)' : 'var(--text-muted)' }}>
              {item.label}
            </span>
          </button>
        ))}
      </div>

      {/* ── Custom Metrics Widget ── */}
      <CustomMetricsWidget />

      {/* ── Reward Toast ── */}
      {reward && <RewardToast reward={reward} onDismiss={() => setReward(null)} />}
    </div>
  );
}
