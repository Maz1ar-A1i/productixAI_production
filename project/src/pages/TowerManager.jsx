import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Trash2, Radio,
  Settings, Zap, CheckCircle2, AlertCircle, X,
  Calculator, BookOpen, ChevronRight, Save
} from "lucide-react";

// ── Fixed tower variables (locked – admin cannot add/remove these) ────────────
const FIXED_VARIABLES = [
  { name: "Fuel Cost",               type: "currency", table: "expenses" },
  { name: "WAPDA Cost",              type: "currency", table: "expenses" },
  { name: "HR Cost",                 type: "currency", table: "expenses" },
  { name: "Rent",                    type: "currency", table: "expenses" },
  { name: "Other Costs",             type: "currency", table: "expenses" },
  { name: "Total Capacity (KW)",     type: "number",   table: "expenses" },
  { name: "KW Produced",             type: "number",   table: "expenses" },
  { name: "KW Sold",                 type: "number",   table: "expenses" },
  { name: "Attached Tenants",        type: "number",   table: "expenses" },
  { name: "Max Tenants",             type: "number",   table: "expenses" },
  { name: "Total OPEX",              type: "currency", table: "expenses" },
  { name: "Daily Cost",              type: "currency", table: "expenses" },
  { name: "Monthly OPEX",            type: "currency", table: "expenses" },
  { name: "Capacity Utilization %",  type: "percent",  table: "expenses" },
  { name: "Idle Capacity (KW)",      type: "number",   table: "expenses" },
  { name: "Cost per KW",             type: "currency", table: "expenses" },
  { name: "Tenant Utilization %",    type: "percent",  table: "expenses" },
  { name: "Total Revenue",           type: "currency", table: "expenses" },
  { name: "Profit",                  type: "currency", table: "expenses" },
  { name: "Idle Capacity Value",     type: "currency", table: "expenses" },
  { name: "Price per KW",            type: "currency", table: "revenue"  },
  { name: "Daily Revenue",           type: "currency", table: "revenue"  },
  { name: "Monthly Revenue",         type: "currency", table: "revenue"  },
];

const TYPE_COLOR = { currency: "#f59e0b", number: "#3b82f6", percent: "#00d4aa" };
const TYPE_LABEL = { currency: "PKR", number: "NUM", percent: "%" };

// ── Modal wrapper ─────────────────────────────────────────────────────────────
const Modal = ({ isOpen, onClose, title, children, wide }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`glass-card ${wide ? "w-full max-w-4xl" : "w-full max-w-lg"} p-8 relative overflow-y-auto max-h-[90vh]`}>
        <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white">
          <X size={22} />
        </button>
        <h2 className="text-xl font-black mb-6" style={{ color: "var(--text-primary)" }}>{title}</h2>
        {children}
      </div>
    </div>
  );
};

// ── Variable badge ────────────────────────────────────────────────────────────
const VarBadge = ({ v, colMap = {}, onRename }) => {
  const displayName = colMap[v.name] || v.name;
  return (
    <span 
      onClick={() => onRename && onRename(v)}
      title={onRename ? "Click to rename" : ""}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700,
        background: `${TYPE_COLOR[v.type]}22`, border: `1px solid ${TYPE_COLOR[v.type]}44`,
        color: TYPE_COLOR[v.type],
        cursor: onRename ? "pointer" : "default"
      }}>
      {TYPE_LABEL[v.type]} {displayName}
    </span>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const TowerManager = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState("towers");
  const [towers, setTowers] = useState([]);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Tower modal state
  const [showTowerModal, setShowTowerModal] = useState(false);
  const [editingTower, setEditingTower] = useState(null);
  const [towerForm, setTowerForm] = useState({ 
    name: "", city: "", location: "Urban", 
    date: new Date().toISOString().split('T')[0],
    tenants: [] // Array of strings (e.g. ["Jazz", "Ufone"])
  });
  const [newTenantInput, setNewTenantInput] = useState("");
  
  // Variables linked to the Tower itself
  const [towerVars, setTowerVars] = useState([]);
  // Variables linked to Tenants
  const [tenantVars, setTenantVars] = useState([]);
  const [colMap, setColMap] = useState({});

  const userRole = localStorage.getItem("role");
  const isAdmin = userRole === "system_admin" || userRole === "org_admin" || userRole === "admin";

  useEffect(() => { 
    try { setColMap(JSON.parse(localStorage.getItem("telco_col_map") || "{}")); } catch {}
    loadTowers(); 
  }, []);

  // ── Towers (stored in localStorage as backend tower model may vary) ─────────
  const STORAGE_KEY = "telco_towers_v1";
  const loadTowers = () => {
    try { setTowers(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")); } catch { setTowers([]); }
  };
  const saveTowers = (list) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    setTowers(list);
  };

  const openNewTower = () => {
    setEditingTower(null);
    setTowerForm({ 
      name: "", city: "", location: "Urban", 
      date: new Date().toISOString().split('T')[0],
      tenants: [] 
    });
    setNewTenantInput("");
    setTowerVars(FIXED_VARIABLES.map(v => v.name)); // default all selected for tower
    setTenantVars([]); // none selected for tenants by default
    setShowTowerModal(true);
  };

  const openEditTower = (t) => {
    setEditingTower(t);
    setTowerForm({ 
      name: t.name, city: t.city, location: t.location, 
      date: t.date || new Date().toISOString().split('T')[0],
      tenants: t.tenants || []
    });
    setNewTenantInput("");
    setTowerVars(t.tower_vars || FIXED_VARIABLES.map(v => v.name));
    setTenantVars(t.tenant_vars || []);
    setShowTowerModal(true);
  };

  const handleAddTenant = () => {
    if (!newTenantInput.trim()) return;
    if (towerForm.tenants.includes(newTenantInput.trim())) {
      return showMsg("error", "Tenant already added");
    }
    setTowerForm({ ...towerForm, tenants: [...towerForm.tenants, newTenantInput.trim()] });
    setNewTenantInput("");
  };

  const handleRemoveTenant = (tenantName) => {
    setTowerForm({ ...towerForm, tenants: towerForm.tenants.filter(t => t !== tenantName) });
  };

  const handleSaveTower = () => {
    if (!towerForm.name || !towerForm.city) return showMsg("error", "Name and city are required");
    const payload = {
      id: editingTower?.id || `TWR-${Date.now()}`,
      ...towerForm,
      tower_vars: towerVars,
      tenant_vars: tenantVars,
      created_at: editingTower?.created_at || new Date().toISOString(),
    };
    if (editingTower) {
      saveTowers(towers.map(t => t.id === editingTower.id ? payload : t));
      showMsg("success", "Table updated");
    } else {
      saveTowers([...towers, payload]);
      showMsg("success", "Table created");
    }
    setShowTowerModal(false);
  };

  const deleteTower = (id) => {
    saveTowers(towers.filter(t => t.id !== id));
    showMsg("success", "Table removed");
  };

  const toggleTowerVar = (name) =>
    setTowerVars(prev => prev.includes(name) ? prev.filter(v => v !== name) : [...prev, name]);

  const toggleTenantVar = (name) =>
    setTenantVars(prev => prev.includes(name) ? prev.filter(v => v !== name) : [...prev, name]);

  const handleRenameVar = (v) => {
    const currentName = colMap[v.name] || v.name;
    const newName = window.prompt(`Rename column "${currentName}":`, currentName);
    if (!newName || newName.trim() === "" || newName === currentName) return;
    
    const newMap = { ...colMap, [v.name]: newName.trim() };
    setColMap(newMap);
    localStorage.setItem("telco_col_map", JSON.stringify(newMap));
    showMsg("success", "Column renamed successfully");
  };

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 4000);
  };

  const TABS = [
    { id: "towers",   label: "Tower Tables",    icon: Radio    },
    { id: "formulas", label: "Formula Settings", icon: Calculator },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)", padding: "32px" }}>

      {/* Alert */}
      {message.text && (
        <div className={`fixed top-8 right-8 z-[100] p-4 rounded-xl border flex items-center gap-3 ${
          message.type === "success" ? "bg-teal-500/10 border-teal-500 text-teal-500" : "bg-red-500/10 border-red-500 text-red-500"
        }`}>
          {message.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span className="font-semibold text-sm">{message.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-black mb-2 tracking-tight" style={{ color: "var(--text-primary)" }}>
          Operational Tables
        </h1>
        <p style={{ color: "var(--text-secondary)" }} className="text-base">
          Create operational tables, define sub-units, set parameters, and generate formulas.
        </p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-2 mb-8 p-1 rounded-2xl w-fit" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-300"
            style={{
              background: tab === t.id ? "var(--accent)" : "transparent",
              color: tab === t.id ? "#000" : "var(--text-secondary)",
            }}
          >
            <t.icon size={17} /> {t.label}
          </button>
        ))}
      </div>

      {/* ── TOWERS TAB ── */}
      {tab === "towers" && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>Operational Table Registry</h2>
              <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                Create a table for a branch/unit, set the sub-units and parameters, and link columns.
              </p>
            </div>
            <button onClick={openNewTower} className="btn-primary flex items-center gap-2 font-black">
              <Plus size={16} /> CREATE TABLE
            </button>
          </div>

          {/* Fixed Variables Reference */}
          <div className="glass-card p-6 mb-6">
            <p className="text-xs font-black uppercase tracking-widest text-white/30 mb-3 flex items-center gap-2">
              Fixed System Variables (Columns)
              {isAdmin && <span className="text-[10px] font-normal lowercase bg-white/10 px-2 py-0.5 rounded text-white/50">Click any badge to rename</span>}
            </p>
            <div className="flex flex-wrap gap-2">
              {FIXED_VARIABLES.map(v => <VarBadge key={v.name} v={v} colMap={colMap} onRename={isAdmin ? handleRenameVar : null} />)}
            </div>
          </div>

          {towers.length === 0 ? (
            <div className="glass-card p-16 text-center border-dashed">
              <Radio size={52} className="mx-auto mb-4 text-white/20" />
              <p className="text-xl font-bold text-white/30">No tables configured</p>
              <p className="text-sm text-white/20 mt-2">Click CREATE TABLE to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {towers.map(t => (
                <div key={t.id} className="glass-card p-6 flex flex-col justify-between group hover:border-teal-500/50 transition-all">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center border border-teal-500/20">
                        <Radio size={20} className="text-teal-500" />
                      </div>
                      <span className="text-[10px] font-black px-2 py-1 rounded-md bg-white/5 border border-white/10 text-white/40">
                        {t.location}
                      </span>
                    </div>
                    <h3 className="font-black text-lg mb-1" style={{ color: "var(--text-primary)" }}>{t.name}</h3>
                    <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>{t.city} | {t.date}</p>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-center">
                        <p className="text-[10px] text-white/30 uppercase font-black">Tenants</p>
                        <p className="font-black text-white">{(t.tenants || []).length}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-center">
                        <p className="text-[10px] text-white/30 uppercase font-black">Linked Cols</p>
                        <p className="font-black text-teal-500">{(t.tower_vars || []).length + (t.tenant_vars || []).length}</p>
                      </div>
                    </div>
                    {(t.tenants || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {t.tenants.map(tenant => (
                          <span key={tenant} className="text-[10px] font-bold px-2 py-1 bg-white/5 border border-white/10 rounded-full text-white/60">
                            {tenant}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEditTower(t)}
                      className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl bg-teal-500/10 text-teal-500 hover:bg-teal-500 hover:text-black font-black text-xs transition-all">
                      <Settings size={14} /> CONFIGURE
                    </button>
                    <button onClick={() => deleteTower(t.id)}
                      className="p-3 rounded-xl bg-red-500/5 text-red-500/40 hover:bg-red-500 hover:text-white transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── FORMULAS TAB ── */}
      {tab === "formulas" && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>Formula Management</h2>
              <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                Generate formulas by selecting columns for the table.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => navigate("/formula-library")}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-teal-500/50 text-white font-bold transition-all text-sm">
                <BookOpen size={16} className="text-teal-500" /> View Library
              </button>
              <button onClick={() => navigate("/formula-builder")} className="btn-primary flex items-center gap-2 font-black">
                <Plus size={16} /> GENERATE FORMULA
              </button>
            </div>
          </div>

          {/* How it works */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[
              { step: "1", icon: Radio,      title: "Fixed Columns",       desc: "System columns like Fuel Cost, WAPDA Cost, HR Cost are locked." },
              { step: "2", icon: Settings,   title: "Link Columns",        desc: "For each table, link columns to either the Tower itself or individual Tenants." },
              { step: "3", icon: Calculator, title: "Generate Formula",    desc: "Use the Formula Builder to generate the formula based on the linked columns." },
            ].map(item => (
              <div key={item.step} className="glass-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-500 font-black text-sm">{item.step}</div>
                  <item.icon size={18} className="text-teal-500" />
                  <span className="font-black text-sm" style={{ color: "var(--text-primary)" }}>{item.title}</span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{item.desc}</p>
              </div>
            ))}
          </div>

          <button onClick={() => navigate("/formula-builder")}
            className="w-full py-5 rounded-2xl border-2 border-dashed border-teal-500/30 hover:border-teal-500 hover:bg-teal-500/5 transition-all flex items-center justify-center gap-3 text-teal-500 font-black">
            <Plus size={20} /> GENERATE FORMULA
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* ── Tower Modal ── */}
      <Modal isOpen={showTowerModal} onClose={() => setShowTowerModal(false)}
        title={editingTower ? `Configure Table: ${editingTower.name}` : "Create Table"} wide>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Tower Parameters & Tenants */}
          <div className="space-y-6">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-white/30 mb-3">1. Table Parameters</p>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-white/40 uppercase">Table Name</label>
                  <input placeholder="e.g. KHI-Tower-04" value={towerForm.name}
                    onChange={e => setTowerForm({ ...towerForm, name: e.target.value })}
                    className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-teal-500 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-white/40 uppercase">City</label>
                    <input placeholder="e.g. Karachi" value={towerForm.city}
                      onChange={e => setTowerForm({ ...towerForm, city: e.target.value })}
                      className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-teal-500 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-white/40 uppercase">Location Type</label>
                    <select value={towerForm.location} onChange={e => setTowerForm({ ...towerForm, location: e.target.value })}
                      className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold outline-none focus:border-teal-500">
                      <option>Urban</option><option>SemiUrban</option><option>Rural</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-white/40 uppercase">Date</label>
                  <input type="date" value={towerForm.date}
                    onChange={e => setTowerForm({ ...towerForm, date: e.target.value })}
                    className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-teal-500 outline-none" />
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-widest text-white/30 mb-3">2. Tenants Config</p>
              <div className="flex gap-2 mb-3">
                <input placeholder="e.g. Jazz, Ufone..." value={newTenantInput}
                  onChange={e => setNewTenantInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddTenant()}
                  className="flex-1 p-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-teal-500 outline-none text-sm" />
                <button onClick={handleAddTenant} className="px-4 rounded-xl bg-teal-500/10 text-teal-500 hover:bg-teal-500 hover:text-black font-black transition-all">
                  ADD
                </button>
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                {towerForm.tenants.length === 0 && <p className="text-xs text-white/30 italic">No tenants added yet.</p>}
                {towerForm.tenants.map(t => (
                  <div key={t} className="flex justify-between items-center p-2.5 rounded-lg bg-white/5 border border-white/10">
                    <span className="font-bold text-sm text-white">{t}</span>
                    <button onClick={() => handleRemoveTenant(t)} className="text-red-500/40 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Link Columns */}
          <div className="flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <p className="text-xs font-black uppercase tracking-widest text-white/30">3. Link Columns</p>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              
              <div className="glass-card p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-black text-teal-500">Linked to Tower (Overall)</span>
                  <span className="text-xs font-bold text-white/40">{towerVars.length} selected</span>
                </div>
                <p className="text-xs text-white/40 mb-3">Data applying to the whole tower (e.g. total rent, fuel cost)</p>
                <div className="space-y-1 max-h-40 overflow-y-auto pr-1 custom-scrollbar border-t border-white/5 pt-2">
                  {FIXED_VARIABLES.map(v => {
                    const on = towerVars.includes(v.name);
                    const displayName = colMap[v.name] || v.name;
                    return (
                      <label key={`tower-${v.name}`} className="flex items-center gap-3 p-1.5 rounded-lg cursor-pointer hover:bg-white/5 transition-colors">
                        <input type="checkbox" checked={on} onChange={() => toggleTowerVar(v.name)}
                          style={{ accentColor: "var(--accent)", width: 14, height: 14 }} />
                        <span className="flex-1 text-sm" style={{ color: on ? "var(--text-primary)" : "var(--text-muted)", fontWeight: on ? 600 : 400 }}>
                          {displayName}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="glass-card p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-black text-teal-500">Linked to Tenants</span>
                  <span className="text-xs font-bold text-white/40">{tenantVars.length} selected</span>
                </div>
                <p className="text-xs text-white/40 mb-3">Data recorded separately for each tenant (e.g. KW Sold, capacity)</p>
                <div className="space-y-1 max-h-40 overflow-y-auto pr-1 custom-scrollbar border-t border-white/5 pt-2">
                  {FIXED_VARIABLES.map(v => {
                    const on = tenantVars.includes(v.name);
                    const displayName = colMap[v.name] || v.name;
                    return (
                      <label key={`tenant-${v.name}`} className="flex items-center gap-3 p-1.5 rounded-lg cursor-pointer hover:bg-white/5 transition-colors">
                        <input type="checkbox" checked={on} onChange={() => toggleTenantVar(v.name)}
                          style={{ accentColor: "var(--accent)", width: 14, height: 14 }} />
                        <span className="flex-1 text-sm" style={{ color: on ? "var(--text-primary)" : "var(--text-muted)", fontWeight: on ? 600 : 400 }}>
                          {displayName}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        </div>

        <button onClick={handleSaveTower} className="btn-primary w-full py-4 font-black mt-8 flex items-center justify-center gap-2">
          <Save size={16} /> {editingTower ? "UPDATE TABLE CONFIG" : "CREATE TABLE CONFIG"}
        </button>
      </Modal>
    </div>
  );
};

export default TowerManager;
