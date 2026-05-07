import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Calculator, ChevronDown, Save, Eye, AlertCircle, CheckCircle, X, GripVertical, Info } from 'lucide-react';
import { formulaService } from '../services/api';

// ── Fixed column data (mirrors backend formula_engine.py) ─────────────────────
const TOWER_EXPENSES_COLS = [
  { name: 'Date', type: 'date', eligible: false },
  { name: 'Tower ID', type: 'text', eligible: false },
  { name: 'Tower Name', type: 'text', eligible: false },
  { name: 'City', type: 'text', eligible: false },
  { name: 'Fuel Cost', type: 'currency', eligible: true },
  { name: 'WAPDA Cost', type: 'currency', eligible: true },
  { name: 'HR Cost', type: 'currency', eligible: true },
  { name: 'Rent', type: 'currency', eligible: true },
  { name: 'Other Costs', type: 'currency', eligible: true },
  { name: 'Total Capacity (KW)', type: 'number', eligible: true },
  { name: 'KW Produced', type: 'number', eligible: true },
  { name: 'KW Sold', type: 'number', eligible: true },
  { name: 'Attached Tenants', type: 'number', eligible: true },
  { name: 'Max Tenants', type: 'number', eligible: true },
  { name: 'Total OPEX', type: 'currency', eligible: true },
  { name: 'Daily Cost', type: 'currency', eligible: true },
  { name: 'Monthly OPEX', type: 'currency', eligible: true },
  { name: 'Capacity Utilization %', type: 'percent', eligible: true },
  { name: 'Idle Capacity (KW)', type: 'number', eligible: true },
  { name: 'Cost per KW', type: 'currency', eligible: true },
  { name: 'Tenant Utilization %', type: 'percent', eligible: true },
  { name: 'Total Revenue', type: 'currency', eligible: true },
  { name: 'Profit', type: 'currency', eligible: true },
  { name: 'Idle Capacity Value', type: 'currency', eligible: true },
];

const TOWER_REVENUE_COLS = [
  { name: 'Date', type: 'date', eligible: false },
  { name: 'Tenant Name', type: 'text', eligible: false },
  { name: 'Tower ID', type: 'text', eligible: false },
  { name: 'KW Sold', type: 'number', eligible: true },
  { name: 'Price per KW', type: 'currency', eligible: true },
  { name: 'Daily Revenue', type: 'currency', eligible: true },
  { name: 'Monthly Revenue', type: 'currency', eligible: true },
];

const TEMPLATES = [
  { id: 'ratio',         label: 'Ratio',        pattern: 'A / B',             minCols: 2, outputType: 'number' },
  { id: 'percentage',    label: 'Percentage',    pattern: '(A / B) × 100',    minCols: 2, outputType: 'percentage' },
  { id: 'total',         label: 'Total (Sum)',   pattern: 'A + B + …',        minCols: 2, outputType: 'number' },
  { id: 'difference',    label: 'Difference',   pattern: 'A − B',             minCols: 2, outputType: 'number' },
  { id: 'product',       label: 'Product',      pattern: 'A × B',             minCols: 2, outputType: 'number' },
  { id: 'cost_per_unit', label: 'Cost per Unit', pattern: 'A / B',            minCols: 2, outputType: 'currency' },
  { id: 'margin',        label: 'Margin %',     pattern: '(A − B) / A × 100', minCols: 2, outputType: 'percentage' },
  { id: 'average',       label: 'Average',      pattern: '(A + B + …) / Count', minCols: 2, outputType: 'number' },
];

// ── Sample row for live preview ────────────────────────────────────────────────
const SAMPLE = {
  'Fuel Cost': 50000, 'WAPDA Cost': 30000, 'HR Cost': 20000, 'Rent': 40000,
  'Other Costs': 10000, 'Total Capacity (KW)': 100, 'KW Produced': 80, 'KW Sold': 60,
  'Attached Tenants': 3, 'Max Tenants': 5, 'Total OPEX': 150000, 'Daily Cost': 5000,
  'Monthly OPEX': 150000, 'Capacity Utilization %': 60, 'Idle Capacity (KW)': 40,
  'Cost per KW': 2500, 'Tenant Utilization %': 60, 'Total Revenue': 300000,
  'Profit': 150000, 'Idle Capacity Value': 20000, 'Price per KW': 500,
  'Daily Revenue': 10000, 'Monthly Revenue': 300000,
};

// ── Client-side expression builder ────────────────────────────────────────────
function buildExpression(templateId, cols) {
  const c = cols.map(n => `[${n}]`);
  switch (templateId) {
    case 'ratio':         return `${c[0]} / ${c[1]}`;
    case 'percentage':    return `(${c[0]} / ${c[1]}) * 100`;
    case 'total':         return c.join(' + ');
    case 'difference':    return `${c[0]} - ${c[1]}`;
    case 'product':       return `${c[0]} * ${c[1]}`;
    case 'cost_per_unit': return `${c[0]} / ${c[1]}`;
    case 'margin':        return `(${c[0]} - ${c[1]}) / ${c[0]} * 100`;
    case 'average':       return `(${c.join(' + ')}) / ${cols.length}`;
    default: return '';
  }
}

// ── Client-side safe evaluator (mirrors backend logic) ─────────────────────────
function safeEval(expr) {
  try {
    const substituted = expr.replace(/\[([^\]]+)\]/g, (_, name) => {
      const v = SAMPLE[name];
      return v != null ? String(v) : 'null';
    });
    if (/null/.test(substituted)) return null;
    if (!/^[\d\s+\-*/().,]+$/.test(substituted)) return null;
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${substituted})`)();
    return typeof result === 'number' && isFinite(result) ? Math.round(result * 100) / 100 : null;
  } catch { return null; }
}

function formatResult(value, outputType) {
  if (value == null) return 'N/A';
  if (outputType === 'percentage') return `${value.toFixed(1)}%`;
  if (outputType === 'currency') return `PKR ${value.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
  return value.toLocaleString('en-PK', { maximumFractionDigits: 2 });
}

const TYPE_BADGE = {
  currency: { label: 'PKR', color: 'var(--warning)' },
  number:   { label: 'NUM', color: 'var(--info)' },
  percent:  { label: '%',   color: 'var(--accent)' },
  date:     { label: 'TXT', color: 'var(--text-muted)' },
  text:     { label: 'TXT', color: 'var(--text-muted)' },
};

// ── Column Pill ────────────────────────────────────────────────────────────────
const SelectedPill = ({ name, colMap = {}, onRemove, index }) => {
  const displayName = colMap[name] || name;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px',
      background: 'var(--accent-dim)', border: '1px solid var(--border-hover)',
      borderRadius: 999, fontSize: 12, color: 'var(--accent)', fontWeight: 600,
    }}>
      <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>{index + 1}</span>
      <GripVertical size={11} style={{ color: 'var(--text-muted)', cursor: 'grab' }} />
      {displayName}
      <button onClick={() => onRemove(name)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-muted)', display: 'flex' }}>
        <X size={12} />
      </button>
    </div>
  );
};

// ── Section wrapper ────────────────────────────────────────────────────────────
const Section = ({ num, title, children, disabled }) => (
  <div className="glass-card" style={{ padding: 20, opacity: disabled ? 0.45 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <div style={{
        width: 26, height: 26, borderRadius: '50%', background: 'var(--accent-dim)',
        border: '1px solid var(--border-hover)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--accent)',
        fontFamily: 'var(--font-mono)', flexShrink: 0,
      }}>{num}</div>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.04em' }}>{title}</span>
    </div>
    {children}
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────────
export default function FormulaBuilder() {
  const location = useLocation();
  const navigate = useNavigate();
  const editFormula = location.state?.formula || null;

  const [selectedCols, setSelectedCols] = useState(editFormula?.selected_columns || []);
  const [template, setTemplate]         = useState(editFormula?.formula_template || '');
  const [formulaName, setFormulaName]   = useState(editFormula?.formula_name || '');
  const [saving, setSaving]             = useState(false);
  const [saveError, setSaveError]       = useState('');
  const [saveSuccess, setSaveSuccess]   = useState(false);
  const [nameError, setNameError]       = useState('');
  const [colMap, setColMap]             = useState({});

  useEffect(() => {
    try { setColMap(JSON.parse(localStorage.getItem("telco_col_map") || "{}")); } catch {}
  }, []);

  const tmplObj   = TEMPLATES.find(t => t.id === template);
  const canSelect = true;
  const canTemplate = selectedCols.length >= 2;
  const expression  = template && canTemplate ? buildExpression(template, selectedCols) : '';
  const sampleResult = expression ? safeEval(expression) : null;
  const canSave  = selectedCols.length >= 2 && template && formulaName.trim().length > 0;

  // Warning: template only uses first 2 but admin selected more
  const showColWarning = tmplObj && !['total', 'average'].includes(template) && selectedCols.length > 2;

  const toggleCol = (colName) => {
    setSelectedCols(prev =>
      prev.includes(colName) ? prev.filter(c => c !== colName) : [...prev, colName]
    );
  };
  const removeCol = (colName) => setSelectedCols(prev => prev.filter(c => c !== colName));

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true); setSaveError(''); setNameError('');
    try {
      const payload = {
        formula_name: formulaName.trim(),
        formula_template: template,
        selected_columns: selectedCols,
        source_table: 'tower_expenses',
        expression_string: expression,
        output_type: tmplObj?.outputType || 'number',
      };
      if (editFormula) {
        await formulaService.update(editFormula.id, payload);
      } else {
        await formulaService.create(payload);
      }
      setSaveSuccess(true);
      setTimeout(() => navigate('/formula-library'), 1200);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to save formula.';
      if (msg.toLowerCase().includes('already exists') || msg.includes('taken')) {
        setNameError(msg);
      } else {
        setSaveError(msg);
      }
    } finally { setSaving(false); }
  };

  const ColRow = ({ col }) => {
    const isSelected = selectedCols.includes(col.name);
    const badge = TYPE_BADGE[col.type] || TYPE_BADGE.text;
    const displayName = colMap[col.name] || col.name;
    return (
      <label style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
        borderRadius: 8, cursor: col.eligible ? 'pointer' : 'not-allowed',
        background: isSelected ? 'var(--accent-dim)' : 'transparent',
        opacity: col.eligible ? 1 : 0.4, transition: 'background 0.15s',
      }}>
        <input
          type="checkbox" checked={isSelected} onChange={() => col.eligible && toggleCol(col.name)}
          disabled={!col.eligible}
          style={{ accentColor: 'var(--accent)', width: 14, height: 14 }}
        />
        <span style={{ flex: 1, fontSize: 13, color: col.eligible ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: isSelected ? 600 : 400 }}>
          {displayName}
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, color: badge.color, fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>
          {badge.label}
        </span>
        {!col.eligible && <span title="Text column — cannot be used in formulas" style={{ fontSize: 10, color: 'var(--text-muted)' }}>⊘</span>}
      </label>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '24px 28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--accent-dim)', border: '1px solid var(--border-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calculator size={20} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              {editFormula ? 'Edit Formula' : 'Formula Builder'}
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Create custom metric formulas using fixed tower columns
            </p>
          </div>
        </div>
        <button onClick={() => navigate('/formula-library')} className="btn-ghost" style={{ fontSize: 13 }}>
          View Library →
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20, alignItems: 'start' }}>
        {/* Left column: Column Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Section num="1" title="Select Columns" disabled={false}>
            {/* Selected pills */}
            {selectedCols.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14, padding: '10px 12px', background: 'rgba(0,212,170,0.05)', borderRadius: 10, border: '1px dashed var(--border-hover)' }}>
                {selectedCols.map((c, i) => <SelectedPill key={c} name={c} colMap={colMap} index={i} onRemove={removeCol} />)}
              </div>
            )}
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Tower Expenses Columns
            </div>
            {TOWER_EXPENSES_COLS.map(c => <ColRow key={c.name} col={c} />)}

            <div style={{ fontSize: 11, color: 'var(--text-muted)', margin: '14px 0 10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Tower Revenue Columns
            </div>
            {TOWER_REVENUE_COLS.map(c => <ColRow key={`rev-${c.name}`} col={{ ...c, name: c.name === 'KW Sold' ? 'KW Sold (Revenue)' : c.name }} />)}

            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
              {selectedCols.length} column{selectedCols.length !== 1 ? 's' : ''} selected
            </div>
          </Section>
        </div>

        {/* Right column: Template, Preview, Save */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Template Dropdown */}
          <Section num="2" title="Choose Formula Template" disabled={!canTemplate}>
            {!canTemplate && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>Select at least 2 columns first.</p>
            )}
            <select
              value={template}
              onChange={e => setTemplate(e.target.value)}
              className="input-field"
              style={{ fontSize: 14 }}
            >
              <option value="">-- Select template --</option>
              {TEMPLATES.map(t => (
                <option key={t.id} value={t.id}>{t.label} — {t.pattern}</option>
              ))}
            </select>
            {showColWarning && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, padding: '8px 12px', background: 'var(--warning-dim)', borderRadius: 8, border: '1px solid rgba(245,158,11,0.2)' }}>
                <Info size={14} style={{ color: 'var(--warning)', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--warning)' }}>
                  This template uses only the first 2 selected columns.
                </span>
              </div>
            )}
          </Section>

          {/* Live Preview */}
          <Section num="3" title="Live Formula Preview" disabled={!expression}>
            {!expression ? (
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Select columns and a template to see the preview.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ padding: '14px 16px', background: 'rgba(0,212,170,0.06)', borderRadius: 10, border: '1px solid var(--border-hover)', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)', letterSpacing: '0.02em', lineHeight: 1.6, wordBreak: 'break-all' }}>
                  {expression}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Output type:</span>
                  <span className="badge badge-accent" style={{ textTransform: 'capitalize' }}>{tmplObj?.outputType}</span>
                </div>
                {/* Sample calculation */}
                <div style={{ padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                    Sample: TWR-001 · April 2026
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: sampleResult != null ? 'var(--accent)' : 'var(--text-muted)' }}>
                    {formatResult(sampleResult, tmplObj?.outputType)}
                  </div>
                  {sampleResult == null && (
                    <div style={{ fontSize: 11, color: 'var(--warning)', marginTop: 4 }}>
                      One or more columns not available in sample row.
                    </div>
                  )}
                </div>
              </div>
            )}
          </Section>

          {/* Save Panel */}
          <Section num="4" title="Name & Save Formula" disabled={!expression}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="form-label">Formula Name</label>
                <input
                  id="formula-name-input"
                  type="text"
                  placeholder='e.g. "My Profit Margin"'
                  value={formulaName}
                  onChange={e => { setFormulaName(e.target.value); setNameError(''); }}
                  className="input-field"
                />
                {nameError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12, color: 'var(--danger)' }}>
                    <AlertCircle size={13} /> {nameError}
                  </div>
                )}
              </div>

              {saveError && (
                <div style={{ padding: '10px 14px', background: 'var(--danger-dim)', borderRadius: 8, fontSize: 12, color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  {saveError}
                </div>
              )}
              {saveSuccess && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--success-dim)', borderRadius: 8, fontSize: 12, color: 'var(--success)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <CheckCircle size={14} /> Formula saved! Redirecting to library…
                </div>
              )}

              <button
                id="save-formula-btn"
                onClick={handleSave}
                disabled={!canSave || saving || saveSuccess}
                className="btn-primary"
                style={{ gap: 8, justifyContent: 'center', opacity: canSave ? 1 : 0.4 }}
              >
                <Save size={16} />
                {saving ? 'Saving…' : editFormula ? 'Update Formula' : 'Save Formula'}
              </button>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
