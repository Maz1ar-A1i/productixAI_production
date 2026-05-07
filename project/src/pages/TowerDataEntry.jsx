import React, { useState, useEffect, useMemo } from "react";
import { Save, Plus, Trash2, ClipboardPaste, Calendar, CheckCircle2, AlertCircle, Calculator, TrendingUp, DollarSign, Activity } from "lucide-react";
import { formulaService } from "../services/api";

const TowerDataEntry = () => {
  const [towers, setTowers] = useState([]);
  const [selectedTowerId, setSelectedTowerId] = useState("");
  
  const [towerColumns, setTowerColumns] = useState([]);
  const [tenantColumns, setTenantColumns] = useState([]);
  
  const [towerRows, setTowerRows] = useState([]);
  const [tenantRows, setTenantRows] = useState([]);
  
  const [formulas, setFormulas] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");

  const [message, setMessage] = useState({ type: "", text: "" });

  const [colMap, setColMap] = useState({});

  // Load configured towers & formulas
  useEffect(() => {
    try { setColMap(JSON.parse(localStorage.getItem("telco_col_map") || "{}")); } catch {}

    try {
      const stored = JSON.parse(localStorage.getItem("telco_towers_v1") || "[]");
      setTowers(stored);
      if (stored.length > 0) handleSelectTower(stored[0].id, stored);
    } catch {
      setTowers([]);
    }

    formulaService.list()
      .then(res => setFormulas(res.data))
      .catch(err => console.error("Failed to load formulas", err));
  }, []);

  const handleSelectTower = (id, towerList = towers) => {
    setSelectedTowerId(id);
    const tower = towerList.find(t => t.id === id);
    if (!tower) return;

    // We need to read colMap directly from localStorage here in case it hasn't populated yet or to get freshest
    let currentMap = {};
    try { currentMap = JSON.parse(localStorage.getItem("telco_col_map") || "{}"); } catch {}
    setColMap(currentMap);

    // Generate Tower schema
    const towCols = [{ key: "Date", label: "Date", type: "date" }];
    (tower.tower_vars || []).forEach(v => {
      towCols.push({ key: `tower_${v}`, label: currentMap[v] || v });
    });
    setTowerColumns(towCols);

    // Generate Tenant schema
    const tenCols = [
      { key: "Date", label: "Date", type: "date" },
      { key: "Tenant", label: "Select Tenant", type: "dropdown", options: tower.tenants || [] }
    ];
    (tower.tenant_vars || []).forEach(v => {
      tenCols.push({ key: `tenant_${v}`, label: currentMap[v] || v });
    });
    setTenantColumns(tenCols);

    // Load existing data
    try {
      const allData = JSON.parse(localStorage.getItem("telco_tower_data_v2") || "{}");
      const existingData = allData[id] || { towerRows: [], tenantRows: [] };
      
      setTowerRows(existingData.towerRows.length > 0 ? existingData.towerRows : [createEmptyRow(towCols)]);
      setTenantRows(existingData.tenantRows.length > 0 ? existingData.tenantRows : [createEmptyRow(tenCols)]);
    } catch {
      setTowerRows([createEmptyRow(towCols)]);
      setTenantRows([createEmptyRow(tenCols)]);
    }
    setSelectedDate("");
  };

  const createEmptyRow = (cols) => {
    const row = { id: Date.now() + Math.random() };
    cols.forEach(c => { 
      row[c.key] = c.key === "Tenant" && c.options && c.options.length > 0 ? c.options[0] : ""; 
    });
    return row;
  };

  // Generic Handlers
  const addRow = (type) => {
    if (type === "tower") setTowerRows([...towerRows, createEmptyRow(towerColumns)]);
    else setTenantRows([...tenantRows, createEmptyRow(tenantColumns)]);
  };

  const removeRow = (index, type) => {
    if (type === "tower") {
      const newRows = [...towerRows];
      newRows.splice(index, 1);
      if (newRows.length === 0) newRows.push(createEmptyRow(towerColumns));
      setTowerRows(newRows);
    } else {
      const newRows = [...tenantRows];
      newRows.splice(index, 1);
      if (newRows.length === 0) newRows.push(createEmptyRow(tenantColumns));
      setTenantRows(newRows);
    }
  };

  const handleCellChange = (index, key, value, type) => {
    if (type === "tower") {
      const newRows = [...towerRows];
      newRows[index][key] = value;
      setTowerRows(newRows);
    } else {
      const newRows = [...tenantRows];
      newRows[index][key] = value;
      setTenantRows(newRows);
    }
  };

  const handlePaste = (e, type) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("Text");
    if (!pasteData) return;

    const cols = type === "tower" ? towerColumns : tenantColumns;
    const lines = pasteData.split("\n").filter(line => line.trim() !== "");
    
    const newRows = lines.map(line => {
      const values = line.split("\t");
      const row = { id: Date.now() + Math.random() };
      cols.forEach((c, i) => {
        row[c.key] = values[i] !== undefined ? values[i].trim() : "";
      });
      return row;
    });

    if (type === "tower") {
      setTowerRows(prev => {
        const filtered = prev.filter(r => cols.some(c => r[c.key] !== ""));
        return [...filtered, ...newRows];
      });
    } else {
      setTenantRows(prev => {
        const filtered = prev.filter(r => cols.some(c => r[c.key] !== ""));
        return [...filtered, ...newRows];
      });
    }
    showMsg("success", `Pasted ${newRows.length} rows into ${type} data`);
  };

  const saveTowerData = () => {
    try {
      const allData = JSON.parse(localStorage.getItem("telco_tower_data_v2") || "{}");
      allData[selectedTowerId] = { towerRows, tenantRows };
      localStorage.setItem("telco_tower_data_v2", JSON.stringify(allData));
      showMsg("success", "Data saved successfully");
    } catch {
      showMsg("error", "Failed to save data");
    }
  };

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 4000);
  };

  // Dates for the dropdown
  const availableDates = useMemo(() => {
    const dates = new Set();
    towerRows.forEach(r => r.Date && dates.add(r.Date));
    tenantRows.forEach(r => r.Date && dates.add(r.Date));
    return Array.from(dates).sort((a, b) => new Date(b) - new Date(a)); // Descending
  }, [towerRows, tenantRows]);

  // Frontend Formula Evaluation Engine
  const evaluatedFormulas = useMemo(() => {
    if (!selectedDate || formulas.length === 0) return [];

    const towerData = towerRows.find(r => r.Date === selectedDate) || {};
    const tVars = {};
    towerColumns.forEach(c => {
      if (c.key.startsWith('tower_')) tVars[c.label] = Number(towerData[c.key] || 0);
    });

    const tntData = tenantRows.filter(r => r.Date === selectedDate);
    const tenantVars = {};

    tntData.forEach(row => {
      const tenant = row.Tenant;
      if (!tenant) return;
      tenantVars[tenant] = {};
      tenantColumns.forEach(c => {
        if (c.key.startsWith('tenant_')) {
          tenantVars[tenant][c.label] = Number(row[c.key] || 0);
        }
      });
    });

    return formulas.map(f => {
      const expr = f.expression_string;
      if (!expr) return { ...f, success: false, error: "Empty expression" };

      // Backend / FormulaBuilder uses [Var Name], not {Var Name}
      const requiredVars = [...expr.matchAll(/\[([^\]]+)\]/g)].map(m => m[1]);
      
      // Check which variables are missing from the current tower's schema
      const missingVars = requiredVars.filter(v => {
        const isTowerVar = towerColumns.some(tc => tc.label === v);
        const isTenantVar = tenantColumns.some(tc => tc.label === v);
        return !isTowerVar && !isTenantVar;
      });

      if (missingVars.length > 0) {
        return { ...f, success: false, error: `Missing variables: ${missingVars.join(', ')}` };
      }

      const isTenantFormula = requiredVars.some(v => tenantColumns.some(tc => tc.label === v));
      let resultObj = { ...f, isTenantFormula, success: false };

      if (isTenantFormula) {
        const tenantResults = {};
        if (Object.keys(tenantVars).length === 0) {
           return { ...f, success: false, error: "No tenant data entered" };
        }
        
        // 1. Calculate PER TENANT
        Object.keys(tenantVars).forEach(tenant => {
          let evalStr = expr;
          let canEval = true;
          requiredVars.forEach(v => {
            let val = tenantVars[tenant][v]; // Check tenant scope first
            if (val === undefined) val = tVars[v]; // Fallback to tower scope (e.g. for global costs)
            if (val === undefined) canEval = false;
            evalStr = evalStr.replaceAll(`[${v}]`, val);
          });
          if (canEval) {
            try { tenantResults[tenant] = eval(evalStr); } catch (e) { tenantResults[tenant] = "Err"; }
          }
        });

        // 2. Calculate OVERALL TOWER
        let globalEvalStr = expr;
        let canGlobalEval = true;
        requiredVars.forEach(v => {
          let val = tVars[v]; // Strictly check tower scope for tower aggregate
          if (val === undefined) canGlobalEval = false;
          globalEvalStr = globalEvalStr.replaceAll(`[${v}]`, val);
        });

        if (canGlobalEval) {
          try { resultObj.globalResult = eval(globalEvalStr); } catch (e) { resultObj.globalResult = "Err"; }
        }
        
        if (Object.keys(tenantResults).length > 0) {
          resultObj.tenantResults = tenantResults;
          resultObj.success = true;
        } else {
          resultObj.error = "Could not evaluate for any tenant";
        }
      } else {
        // purely tower formula
        let evalStr = expr;
        let canEval = true;
        requiredVars.forEach(v => {
          let val = tVars[v];
          if (val === undefined) canEval = false;
          evalStr = evalStr.replaceAll(`[${v}]`, val);
        });
        if (canEval) {
          try {
            resultObj.globalResult = eval(evalStr);
            resultObj.success = true;
          } catch (e) { 
            resultObj.success = false;
            resultObj.error = "Math Error"; 
          }
        } else {
          resultObj.error = "Variables missing in data";
        }
      }
      return resultObj;
    });
  }, [selectedDate, formulas, towerRows, tenantRows, towerColumns, tenantColumns]);

  const formatOutput = (val, type) => {
    if (val === "Err" || isNaN(val)) return "N/A";
    if (type === "percentage") return `${(val).toFixed(2)}%`;
    if (type === "currency") return `$${Number(val).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    return Number(val).toLocaleString(undefined, {maximumFractionDigits: 2});
  };

  const getOutputIcon = (type) => {
    if (type === "currency") return <DollarSign size={18} className="text-emerald-500" />;
    if (type === "percentage") return <Activity size={18} className="text-blue-500" />;
    return <TrendingUp size={18} className="text-purple-500" />;
  };

  const selectedTowerObj = towers.find(t => t.id === selectedTowerId);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)", padding: "32px" }}>
      
      {message.text && (
        <div className={`fixed top-8 right-8 z-[100] p-4 rounded-xl border flex items-center gap-3 animate-in slide-in-from-right ${
          message.type === "success" ? "bg-teal-500/10 border-teal-500 text-teal-500" : "bg-red-500/10 border-red-500 text-red-500"
        }`}>
          {message.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span className="font-semibold text-sm">{message.text}</span>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-4xl font-black mb-2 tracking-tight" style={{ color: "var(--text-primary)" }}>
          Operational Data Entry & Insights
        </h1>
        <p style={{ color: "var(--text-secondary)" }} className="text-base">
          Manage operational records and view dynamic daily formula outputs.
        </p>
      </div>

      <div className="glass-card p-6 mb-8 flex flex-wrap items-end gap-6">
        <div className="w-full md:w-1/3">
          <label className="text-xs font-black text-white/40 uppercase mb-2 block">Select Tower</label>
          <select 
            value={selectedTowerId}
            onChange={(e) => handleSelectTower(e.target.value)}
            className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold outline-none focus:border-teal-500"
          >
            <option value="" disabled>-- Select a configured tower --</option>
            {towers.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.city})</option>
            ))}
          </select>
        </div>
        
        {selectedTowerObj && (
          <div className="flex-1 flex gap-4">
            <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-500">
              <span className="text-[10px] font-black uppercase opacity-60 block">Tenants</span>
              <span className="font-bold">{(selectedTowerObj.tenants || []).length} Active</span>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-white">
              <span className="text-[10px] font-black uppercase opacity-40 block">Tracking</span>
              <span className="font-bold">{(towerColumns.length - 1) + (tenantColumns.length - 2)} Metrics</span>
            </div>
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-500">
              <span className="text-[10px] font-black uppercase opacity-60 block">Formulas</span>
              <span className="font-bold">{formulas.length} Available</span>
            </div>
          </div>
        )}

        <button onClick={saveTowerData} className="btn-primary px-8 py-3 font-black flex items-center gap-2 h-fit">
          <Save size={18} /> SAVE RECORDS
        </button>
      </div>

      {selectedTowerId ? (
        <>
          {/* DAILY FORMULA DASHBOARD */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3 text-white">
                <Calculator className="text-teal-500" />
                <h2 className="text-2xl font-black">Daily Formula Dashboard</h2>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-white/50 uppercase">Calculate For Date:</label>
                <select 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="p-2 px-4 rounded-lg bg-[#121212] border border-white/10 text-white font-mono text-sm outline-none focus:border-teal-500"
                >
                  <option value="">-- Select Date --</option>
                  {availableDates.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            {selectedDate ? (
              evaluatedFormulas.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {evaluatedFormulas.map(f => (
                    <div key={f.id} className={`glass-card p-5 border-t-4 hover:-translate-y-1 transition-transform ${!f.success ? 'border-red-500/50 opacity-70' : ''}`} style={{ borderTopColor: f.success ? 'var(--accent)' : '' }}>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 pr-4">
                          <h3 className="font-bold text-white text-sm line-clamp-1" title={f.formula_name}>{f.formula_name}</h3>
                          <span className="text-[10px] font-black uppercase text-white/40 tracking-wider">
                            {f.output_type}
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-white/5">
                          {getOutputIcon(f.output_type)}
                        </div>
                      </div>

                      {!f.success ? (
                        <div className="mt-4 pt-4 border-t border-red-500/10">
                           <div className="flex items-start gap-2 text-red-400">
                             <AlertCircle size={14} className="mt-0.5 shrink-0" />
                             <span className="text-xs font-medium leading-tight">{f.error}</span>
                           </div>
                        </div>
                      ) : (
                        <div className="mt-4 pt-4 border-t border-white/5">
                          {/* Tower Aggregate Value */}
                          <div className="mb-2">
                            <span className="text-[10px] font-black uppercase text-white/30 tracking-wider block mb-1">Overall Tower</span>
                            <div className="text-3xl font-black font-mono text-white tracking-tight leading-none">
                              {formatOutput(f.globalResult, f.output_type)}
                            </div>
                          </div>

                          {/* Tenant Breakdown */}
                          {f.isTenantFormula && f.tenantResults && Object.keys(f.tenantResults).length > 0 && (
                            <div className="mt-4 space-y-2 pt-3 border-t border-white/5">
                              <span className="text-[10px] font-black uppercase text-white/30 tracking-wider block mb-2">Tenant Breakdown</span>
                              {Object.entries(f.tenantResults).map(([tenant, val]) => (
                                <div key={tenant} className="flex justify-between items-center bg-black/20 p-1.5 px-2 rounded">
                                  <span className="text-xs font-bold text-white/60">{tenant}</span>
                                  <span className="font-mono font-bold text-white text-sm">{formatOutput(val, f.output_type)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass-card p-8 text-center text-white/40 border border-dashed border-white/10">
                  <Calculator size={32} className="mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No valid formula outputs for this date.</p>
                  <p className="text-xs mt-1">Ensure the required variables have been entered in the tables below.</p>
                </div>
              )
            ) : (
              <div className="glass-card p-8 flex items-center justify-center text-white/30 border border-dashed border-white/10">
                Select a date from the dropdown above to view formula results.
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-8">
            
            {/* TOWER TABLE */}
            <div className="glass-card overflow-hidden flex flex-col">
              <div className="p-4 border-b border-white/5 bg-white/2 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-white">Overall Tower Operations</h2>
                  <div className="flex items-center gap-2 mt-1 text-white/40">
                    <ClipboardPaste size={12} />
                    <span className="text-xs font-medium">Use <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-white">Ctrl+V</kbd> to paste data here.</span>
                  </div>
                </div>
                <button onClick={() => addRow("tower")} className="px-4 py-2 rounded-lg bg-teal-500/10 text-teal-500 hover:bg-teal-500 hover:text-black font-bold text-sm flex items-center gap-2 transition-all">
                  <Plus size={16} /> ADD TOWER ROW
                </button>
              </div>
              
              <div className="flex-1 overflow-auto custom-scrollbar max-h-[50vh]" onPaste={(e) => handlePaste(e, "tower")}>
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-[#121212] z-10 shadow-md">
                    <tr>
                      <th className="p-3 text-[10px] font-black uppercase tracking-widest text-white/30 border-b border-white/10 w-12 text-center">#</th>
                      {towerColumns.map(c => (
                        <th key={c.key} className="p-3 text-[10px] font-black uppercase tracking-wider text-teal-500/60 border-b border-white/10 whitespace-nowrap">
                          {c.label}
                        </th>
                      ))}
                      <th className="p-3 border-b border-white/10 w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {towerRows.map((row, rIndex) => (
                      <tr key={row.id} className="hover:bg-white/5 group border-b border-white/5 last:border-0 transition-colors">
                        <td className="p-2 text-center text-xs text-white/20 font-mono">{rIndex + 1}</td>
                        {towerColumns.map(c => (
                          <td key={c.key} className="p-1 min-w-[150px]">
                            <input
                              type={c.type === "date" ? "date" : "text"}
                              value={row[c.key] || ""}
                              onChange={e => handleCellChange(rIndex, c.key, e.target.value, "tower")}
                              placeholder="-"
                              className="w-full p-2 bg-transparent text-sm text-white focus:bg-white/5 focus:outline-none rounded transition-colors"
                            />
                          </td>
                        ))}
                        <td className="p-2 text-center">
                          <button onClick={() => removeRow(rIndex, "tower")} className="text-red-500/40 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {towerRows.length === 0 && (
                  <div className="p-12 text-center text-white/20">
                    <Calendar size={32} className="mx-auto mb-3 opacity-50" />
                    <p>No tower data. Click Add Row or Paste data.</p>
                  </div>
                )}
              </div>
            </div>

            {/* TENANT TABLE */}
            {tenantColumns.length > 2 && (
              <div className="glass-card overflow-hidden flex flex-col">
                <div className="p-4 border-b border-white/5 bg-white/2 flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-bold text-white">Tenant Specific Operations</h2>
                    <div className="flex items-center gap-2 mt-1 text-white/40">
                      <ClipboardPaste size={12} />
                      <span className="text-xs font-medium">Use <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-white">Ctrl+V</kbd> to paste data here.</span>
                    </div>
                  </div>
                  <button onClick={() => addRow("tenant")} className="px-4 py-2 rounded-lg bg-[#EAB308]/10 text-[#EAB308] hover:bg-[#EAB308] hover:text-black font-bold text-sm flex items-center gap-2 transition-all">
                    <Plus size={16} /> ADD TENANT ROW
                  </button>
                </div>
                
                <div className="flex-1 overflow-auto custom-scrollbar max-h-[50vh]" onPaste={(e) => handlePaste(e, "tenant")}>
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-[#121212] z-10 shadow-md">
                      <tr>
                        <th className="p-3 text-[10px] font-black uppercase tracking-widest text-white/30 border-b border-white/10 w-12 text-center">#</th>
                        {tenantColumns.map(c => (
                          <th key={c.key} className="p-3 text-[10px] font-black uppercase tracking-wider text-[#EAB308]/80 border-b border-white/10 whitespace-nowrap">
                            {c.label}
                          </th>
                        ))}
                        <th className="p-3 border-b border-white/10 w-12"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {tenantRows.map((row, rIndex) => (
                        <tr key={row.id} className="hover:bg-white/5 group border-b border-white/5 last:border-0 transition-colors">
                          <td className="p-2 text-center text-xs text-white/20 font-mono">{rIndex + 1}</td>
                          {tenantColumns.map(c => (
                            <td key={c.key} className="p-1 min-w-[150px]">
                              {c.type === "dropdown" ? (
                                <select 
                                  value={row[c.key] || ""}
                                  onChange={e => handleCellChange(rIndex, c.key, e.target.value, "tenant")}
                                  className="w-full p-2 bg-transparent text-sm text-white focus:bg-white/5 focus:outline-none rounded transition-colors appearance-none"
                                  style={{
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                                    backgroundRepeat: 'no-repeat',
                                    backgroundPosition: 'right 0.5rem center',
                                    backgroundSize: '1em 1em',
                                    paddingRight: '2rem'
                                  }}
                                >
                                  {c.options.map(opt => <option key={opt} value={opt} className="bg-gray-800">{opt}</option>)}
                                </select>
                              ) : (
                                <input
                                  type={c.type === "date" ? "date" : "text"}
                                  value={row[c.key] || ""}
                                  onChange={e => handleCellChange(rIndex, c.key, e.target.value, "tenant")}
                                  placeholder="-"
                                  className="w-full p-2 bg-transparent text-sm text-white focus:bg-white/5 focus:outline-none rounded transition-colors"
                                />
                              )}
                            </td>
                          ))}
                          <td className="p-2 text-center">
                            <button onClick={() => removeRow(rIndex, "tenant")} className="text-red-500/40 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {tenantRows.length === 0 && (
                    <div className="p-12 text-center text-white/20">
                      <Calendar size={32} className="mx-auto mb-3 opacity-50" />
                      <p>No tenant data. Click Add Row or Paste data.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </>
      ) : (
        <div className="glass-card p-16 text-center text-white/20">
          <AlertCircle size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-xl font-bold">No Tower Selected</p>
          <p className="text-sm mt-2">Please select a tower from the dropdown to enter data.</p>
        </div>
      )}

    </div>
  );
};

export default TowerDataEntry;
