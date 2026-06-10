import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Calculator, Save, AlertCircle, CheckCircle, X, GripVertical, Info, Filter } from 'lucide-react';
import api, { formulaService, productService } from '../services/api';

// ── Fixed column data (mirrors backend formula_engine.py) ─────────────────────
const UNIT_EXPENSES_COLS = [
  { name: 'Date', type: 'date', eligible: false },
  { name: 'Unit ID', type: 'text', eligible: false },
  { name: 'Unit Name', type: 'text', eligible: false },
  { name: 'City', type: 'text', eligible: false },
  { name: 'Fuel Cost', type: 'number', eligible: true },
  { name: 'WAPDA Cost', type: 'number', eligible: true },
  { name: 'HR Cost', type: 'number', eligible: true },
  { name: 'Rent', type: 'number', eligible: true },
  { name: 'Other Costs', type: 'number', eligible: true },
  { name: 'Total Capacity (KW)', type: 'number', eligible: true },
  { name: 'KW Produced', type: 'number', eligible: true },
  { name: 'KW Sold', type: 'number', eligible: true },
  { name: 'Attached Customers', type: 'number', eligible: true },
  { name: 'Max Customers', type: 'number', eligible: true },
  { name: 'Total OPEX', type: 'number', eligible: true },
  { name: 'Daily Cost', type: 'number', eligible: true },
  { name: 'Monthly OPEX', type: 'number', eligible: true },
  { name: 'Capacity Utilization', type: 'number', eligible: true },
  { name: 'Idle Capacity (KW)', type: 'number', eligible: true },
  { name: 'Cost per KW', type: 'number', eligible: true },
  { name: 'Customer Utilization', type: 'number', eligible: true },
  { name: 'Total Revenue', type: 'number', eligible: true },
  { name: 'Profit', type: 'number', eligible: true },
  { name: 'Idle Capacity Value', type: 'number', eligible: true },
];

const UNIT_REVENUE_COLS = [
  { name: 'Date', type: 'date', eligible: false },
  { name: 'Customer Name', type: 'text', eligible: false },
  { name: 'Unit ID', type: 'text', eligible: false },
  { name: 'KW Sold', type: 'number', eligible: true },
  { name: 'Price per KW', type: 'number', eligible: true },
  { name: 'Daily Revenue', type: 'number', eligible: true },
  { name: 'Monthly Revenue', type: 'number', eligible: true },
];

const TEMPLATES = [
  { id: 'ratio',         label: 'Ratio',        pattern: 'A / B',             minCols: 2, outputType: 'number' },
  { id: 'percentage',    label: 'Percentage',    pattern: '(A / B) × 100',    minCols: 2, outputType: 'percentage' },
  { id: 'total',         label: 'Total (Sum)',   pattern: 'A + B + …',        minCols: 2, outputType: 'number' },
  { id: 'difference',    label: 'Difference',   pattern: 'A − B',             minCols: 2, outputType: 'number' },
  { id: 'product',       label: 'Product',      pattern: 'A × B',             minCols: 2, outputType: 'number' },
  { id: 'margin',        label: 'Margin %',     pattern: '(A − B) / A × 100', minCols: 2, outputType: 'percentage' },
  { id: 'average',       label: 'Average',      pattern: '(A + B + …) / Count', minCols: 2, outputType: 'number' },
];

// ── Sample row for live preview ────────────────────────────────────────────────
const SAMPLE = {
  'Fuel Cost': 50000, 'WAPDA Cost': 30000, 'HR Cost': 20000, 'Rent': 40000,
  'Other Costs': 10000, 'Total Capacity (KW)': 100, 'KW Produced': 80, 'KW Sold': 60,
  'Attached Customers': 3, 'Max Customers': 5, 'Total OPEX': 150000, 'Daily Cost': 5000,
  'Monthly OPEX': 150000, 'Capacity Utilization': 60, 'Idle Capacity (KW)': 40,
  'Cost per KW': 2500, 'Customer Utilization': 60, 'Total Revenue': 300000,
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
  const [targetColumn, setTargetColumn] = useState(editFormula?.target_column || '');
  const [saving, setSaving]             = useState(false);
  const [saveError, setSaveError]       = useState('');
  const [saveSuccess, setSaveSuccess]   = useState(false);
  const [nameError, setNameError]       = useState('');
  const [colMap, setColMap]             = useState({});

  // ── Unit filter state ──────────────────────────────────────────────────────
  const [units, setUnits]               = useState([]);
  const [selectedUnitId, setSelectedUnitId] = useState('');

  const loadOrgMappings = async () => {
    try {
      const res = await api.get("/organizations/me");
      if (res.data && res.data.column_mappings) {
        setColMap(res.data.column_mappings);
        localStorage.setItem("telco_unit_col_map", JSON.stringify(res.data.column_mappings));
      }
    } catch (err) {
      console.error("Failed to load organization mappings in FormulaBuilder:", err);
    }
  };

  useEffect(() => {
    try { setColMap(JSON.parse(localStorage.getItem("telco_unit_col_map") || "{}")); } catch {}
    loadOrgMappings();
    // Load units from API
    const loadUnits = async () => {
      try {
        const res = await productService.getProducts();
        const dbUnits = res.data.map(p => ({
          id: p.id,
          name: p.name,
          city: p.description || "",
          region: p.region || p.description || "",
          location: p.location || "Urban",
          customers: p.customers || [],
          unit_vars: p.unit_vars || [],
          customer_vars: p.customer_vars || [],
          created_at: p.created_at || new Date().toISOString()
        }));
        setUnits(dbUnits);
        localStorage.setItem("telco_units_v1", JSON.stringify(dbUnits));
      } catch (err) {
        console.error("Failed to load units in FormulaBuilder:", err);
        try {
          const stored = JSON.parse(localStorage.getItem("telco_units_v1") || "[]");
          setUnits(stored);
        } catch { setUnits([]); }
      }
    };
    loadUnits();
  }, []);

  // ── Derive columns that are active for the selected unit ───────────────────
  const selectedUnit = useMemo(() => {
    return units.find(u => String(u.id) === String(selectedUnitId)) || null;
  }, [units, selectedUnitId]);

  // All eligible unit-level column names for the selected unit
  const unitActiveVarNames = useMemo(() => {
    return selectedUnit ? (selectedUnit.unit_vars || []) : null;
  }, [selectedUnit]);

  // All eligible customer-level column names for the selected unit
  const customerActiveVarNames = useMemo(() => {
    return selectedUnit ? (selectedUnit.customer_vars || []) : null;
  }, [selectedUnit]);

  // Filter UNIT_EXPENSES_COLS to show only what this unit uses (or all if no unit selected)
  const filteredExpensesCols = useMemo(() => {
    return UNIT_EXPENSES_COLS.filter(c => {
      if (!unitActiveVarNames) return true; // no filter
      if (!c.eligible) return false; // hide ineligible text cols when unit is selected
      return unitActiveVarNames.includes(c.name);
    });
  }, [unitActiveVarNames]);

  // Filter UNIT_REVENUE_COLS dynamically based on customerActiveVarNames
  const filteredRevenueCols = useMemo(() => {
    if (!customerActiveVarNames) return UNIT_REVENUE_COLS; // no filter (show defaults)
    
    // If unit is selected, show whatever is in customerActiveVarNames
    const seen = new Set();
    const cols = [];
    customerActiveVarNames.forEach(varName => {
      // Find metadata from UNIT_EXPENSES_COLS or UNIT_REVENUE_COLS
      const matched = [...UNIT_EXPENSES_COLS, ...UNIT_REVENUE_COLS].find(v => v.name === varName);
      if (matched && !seen.has(varName)) {
        seen.add(varName);
        cols.push(matched);
      } else if (!seen.has(varName)) {
        seen.add(varName);
        cols.push({ name: varName, type: 'number', eligible: true });
      }
    });
    return cols;
  }, [customerActiveVarNames]);

  // Target columns: unique list from filtered active columns, excluding selected inputs
  const TARGET_COLUMNS = useMemo(() => {
    const seen = new Set();
    const cols = [];
    const normalizedSelected = new Set(selectedCols.map(c => c.replace(/\s*\(Revenue\)$/i, '')));
    
    [...filteredExpensesCols, ...filteredRevenueCols].forEach(c => {
      const canonical = c.name;
      if (c.eligible && !seen.has(canonical) && !normalizedSelected.has(canonical)) {
        seen.add(canonical);
        cols.push(c);
      }
    });
    return cols;
  }, [filteredExpensesCols, filteredRevenueCols, selectedCols]);

  const tmplObj   = useMemo(() => TEMPLATES.find(t => t.id === template), [template]);
  const canTemplate = selectedCols.length >= 2;
  const expression  = template && canTemplate ? buildExpression(template, selectedCols) : '';
  const sampleResult = expression ? safeEval(expression) : null;

  // Generate formula name automatically from template + columns
  const autoName = template && selectedCols.length >= 2
    ? `${tmplObj?.label || template}: ${selectedCols.slice(0, 2).map(c => colMap[c] || c).join(' & ')}`
    : '';

  // canSave: need cols, template, target column. Name is auto-generated.
  const effectiveName = formulaName.trim() || autoName;
  const canSave  = selectedCols.length >= 2 && template && targetColumn !== '' && effectiveName.length > 0;

  // Warning: template only uses first 2 but admin selected more
  const showColWarning = tmplObj && !['total', 'average'].includes(template) && selectedCols.length > 2;

  // Clear selected cols that are no longer in the filtered list when unit changes
  useEffect(() => {
    const allowedNames = new Set([
      ...filteredExpensesCols.map(c => c.name),
      ...filteredRevenueCols.map(c => c.name === 'KW Sold' ? 'KW Sold (Revenue)' : c.name),
    ]);
    setSelectedCols(prev => {
      const filtered = prev.filter(c => allowedNames.has(c));
      // Only trigger state update if elements actually differ to avoid infinite rendering loops
      if (filtered.length === prev.length && filtered.every((val, index) => val === prev[index])) {
        return prev;
      }
      return filtered;
    });
  }, [filteredExpensesCols, filteredRevenueCols]);

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
        formula_name: effectiveName,
        formula_template: template,
        selected_columns: selectedCols,
        source_table: 'unit_expenses',
        expression_string: expression,
        output_type: tmplObj?.outputType || 'number',
        target_column: targetColumn || null,
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
        {!col.eligible && <span title="Text column — cannot be used in formulas" style={{ fontSize: 10, color: 'var(--text-muted)' }}>⊘</span>}
      </label>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '24px 28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--accent-dim)', border: '1px solid var(--border-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calculator size={20} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              {editFormula ? 'Edit Formula' : 'Formula Builder'}
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Create custom metric formulas using fixed unit columns
            </p>
          </div>
        </div>
        <button onClick={() => navigate('/formula-library')} className="btn-ghost" style={{ fontSize: 13 }}>
          View Library →
        </button>
      </div>

      {/* ── Unit Filter ── */}
      <div className="glass-card" style={{ padding: '14px 18px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={15} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
              FILTER BY UNIT
            </span>
          </div>
          <select
            id="unit-filter-select"
            value={selectedUnitId}
            onChange={e => { setSelectedUnitId(e.target.value); }}
            className="input-field"
            style={{ fontSize: 13, minWidth: 240, flex: 1, maxWidth: 360 }}
          >
            <option value="">— Show All Columns (No Unit Filter) —</option>
            {units.map(u => (
              <option key={u.id} value={u.id}>{u.name} ({u.city})</option>
            ))}
          </select>
          {selectedUnit && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 999, background: 'var(--accent-dim)', border: '1px solid var(--border-hover)', color: 'var(--accent)', fontWeight: 600 }}>
                {(selectedUnit.unit_vars || []).length} unit cols
              </span>
              <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 999, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: 'var(--warning)', fontWeight: 600 }}>
                {(selectedUnit.customer_vars || []).length} customer cols
              </span>
              <button
                onClick={() => setSelectedUnitId('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
              >
                <X size={12} /> Clear filter
              </button>
            </div>
          )}
          {units.length === 0 && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
              No units configured yet. Go to Unit Tables to create units first.
            </span>
          )}
        </div>
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

            {/* Unit Expenses Columns */}
            {filteredExpensesCols.length > 0 && (
              <>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Unit Expenses Columns
                  {selectedUnit && <span style={{ marginLeft: 6, color: 'var(--accent)', fontWeight: 400 }}>({filteredExpensesCols.length})</span>}
                </div>
                {filteredExpensesCols.map(c => <ColRow key={c.name} col={c} />)}
              </>
            )}

            {/* Unit Revenue Columns */}
            {filteredRevenueCols.length > 0 && (
              <>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', margin: '14px 0 10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Customer / Revenue Columns
                  {selectedUnit && <span style={{ marginLeft: 6, color: 'var(--warning)', fontWeight: 400 }}>({filteredRevenueCols.length})</span>}
                </div>
                {filteredRevenueCols.map(c => (
                  <ColRow key={`rev-${c.name}`} col={{ ...c, name: c.name === 'KW Sold' ? 'KW Sold (Revenue)' : c.name }} />
                ))}
              </>
            )}

            {/* No columns message */}
            {selectedUnit && filteredExpensesCols.length === 0 && filteredRevenueCols.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No columns linked to this unit yet.<br />
                <span style={{ fontSize: 11 }}>Configure columns in Unit Manager.</span>
              </div>
            )}

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

          {/* Target Column Picker */}
          <Section num="3" title="Which Column Does This Formula Fill?" disabled={!expression}>
            {!expression ? (
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Complete steps 1 & 2 first.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                  Select the column in the Data Entry table that this formula will <strong style={{ color: 'var(--accent)' }}>auto-fill</strong>.
                </p>
                <select
                  value={targetColumn}
                  onChange={e => setTargetColumn(e.target.value)}
                  className="input-field"
                  style={{ fontSize: 14 }}
                >
                  <option value="">-- Select target column --</option>
                  {TARGET_COLUMNS.map(c => {
                    const display = colMap[c.name] || c.name;
                    return <option key={c.name} value={c.name}>{display}</option>;
                  })}
                </select>
                {targetColumn && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(0,212,170,0.08)', borderRadius: 8, border: '1px solid var(--border-hover)' }}>
                    <CheckCircle size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: 'var(--accent)' }}>
                      This formula will auto-fill: <strong>{colMap[targetColumn] || targetColumn}</strong>
                    </span>
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* Live Preview */}
          <Section num="4" title="Live Formula Preview" disabled={!expression}>
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

                {/* Auto-generated name preview */}
                {autoName && (
                  <div style={{ padding: '8px 12px', background: 'rgba(0,212,170,0.04)', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Auto formula name: </span>
                    <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{autoName}</span>
                  </div>
                )}

                {/* Save section inline */}
                <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {nameError && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--danger)' }}>
                      <AlertCircle size={13} /> {nameError}
                    </div>
                  )}
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
                  {!targetColumn && expression && (
                    <p style={{ fontSize: 11, color: 'var(--warning)', textAlign: 'center', margin: 0 }}>
                      ⚠️ Select a target column in Step 3 to enable saving.
                    </p>
                  )}
                </div>
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
