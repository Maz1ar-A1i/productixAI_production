import React, { useState, useEffect } from 'react';
import { Check, Zap, X, AlertTriangle } from 'lucide-react';

/**
 * ActionConfirmation
 * ------------------
 * Props:
 *   action   : { title, entity, quantity, reason, impact, steps, autoable }
 *   onConfirm: (mode: 'manual' | 'auto') => void
 *   onCancel : () => void
 *   isOpen   : bool
 */
export default function ActionConfirmation({ action, onConfirm, onCancel, isOpen }) {
  const [mode, setMode] = useState(null);        // 'manual' | 'auto'
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!isOpen) { setMode(null); setConfirming(false); }
  }, [isOpen]);

  if (!isOpen || !action) return null;

  const handleConfirm = async (m) => {
    setMode(m);
    setConfirming(true);
    await new Promise(r => setTimeout(r, 600));
    onConfirm(m);
  };

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="w-full max-w-md glass-card animate-fade-up"
        style={{ border: '1px solid var(--border-hover)', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div className="p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} style={{ color: 'var(--warning)' }} />
              <span className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                Confirm Action
              </span>
            </div>
            <button
              onClick={onCancel}
              className="p-1.5 rounded-lg transition-colors"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
            >
              <X size={16} />
            </button>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Review the details before proceeding
          </p>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4">
          {/* Action title */}
          <div>
            <div className="section-title mb-1">Action</div>
            <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              💡 {action.title}
            </div>
          </div>

          {/* Details row */}
          <div className="grid grid-cols-2 gap-3">
            {action.entity && (
              <div
                className="rounded-xl p-3"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
              >
                <div className="section-title mb-1">Entity</div>
                <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {action.entity}
                </div>
              </div>
            )}
            {action.quantity && (
              <div
                className="rounded-xl p-3"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
              >
                <div className="section-title mb-1">Quantity</div>
                <div className="mono text-sm font-bold" style={{ color: 'var(--accent)' }}>
                  {action.quantity}
                </div>
              </div>
            )}
          </div>

          {/* Reason */}
          {action.reason && (
            <div
              className="rounded-xl p-3"
              style={{ background: 'var(--info-dim)', border: '1px solid rgba(59,130,246,0.2)' }}
            >
              <div className="section-title mb-1" style={{ color: 'var(--info)' }}>Why this action?</div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{action.reason}</div>
            </div>
          )}

          {/* Impact */}
          {action.impact && (
            <div
              className="rounded-xl p-3"
              style={{ background: 'var(--accent-dim)', border: '1px solid rgba(0,212,170,0.2)' }}
            >
              <div className="section-title mb-1" style={{ color: 'var(--accent)' }}>Estimated impact</div>
              <div className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
                {action.impact}
              </div>
            </div>
          )}

          {/* Steps */}
          {action.steps && action.steps.length > 0 && (
            <div>
              <div className="section-title mb-2">Steps</div>
              <ul className="flex flex-col gap-1.5">
                {action.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <span className="mono font-bold" style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }}>
                      {i + 1}.
                    </span>
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer — action buttons */}
        <div
          className="p-5 border-t grid gap-3"
          style={{ borderColor: 'var(--border)', gridTemplateColumns: action.autoable ? '1fr 1fr 1fr' : '1fr 1fr' }}
        >
          {/* Confirm manually */}
          <button
            onClick={() => handleConfirm('manual')}
            disabled={confirming}
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-95"
            style={{
              background: confirming && mode === 'manual' ? 'var(--success)' : 'var(--success-dim)',
              border: '1px solid rgba(16,185,129,0.3)',
              color: confirming && mode === 'manual' ? '#000' : 'var(--success)',
            }}
          >
            <Check size={18} />
            <span className="text-xs">{confirming && mode === 'manual' ? 'Done!' : 'Confirm'}</span>
          </button>

          {/* Automate — only if action supports it */}
          {action.autoable && (
            <button
              onClick={() => handleConfirm('auto')}
              disabled={confirming}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-95"
              style={{
                background: confirming && mode === 'auto' ? 'var(--accent)' : 'var(--accent-dim)',
                border: '1px solid rgba(0,212,170,0.3)',
                color: confirming && mode === 'auto' ? '#000' : 'var(--accent)',
              }}
            >
              <Zap size={18} />
              <span className="text-xs">{confirming && mode === 'auto' ? 'Automating…' : 'Automate'}</span>
            </button>
          )}

          {/* Cancel */}
          <button
            onClick={onCancel}
            disabled={confirming}
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-95"
            style={{
              background: 'var(--danger-dim)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: 'var(--danger)',
            }}
          >
            <X size={18} />
            <span className="text-xs">Cancel</span>
          </button>
        </div>
      </div>
    </div>
  );
}
