import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Trash2, Radio,
  Settings, Zap, CheckCircle2, AlertCircle, X,
  Calculator, BookOpen, ChevronRight, Save
} from "lucide-react";
import api, { productService } from "../services/api";

// ── Fixed unit variables (locked – admin cannot add/remove these) ────────────
const FIXED_VARIABLES = [
  { name: "Fuel Cost",               type: "number", table: "expenses" },
  { name: "WAPDA Cost",              type: "number", table: "expenses" },
  { name: "HR Cost",                 type: "number", table: "expenses" },
  { name: "Rent",                    type: "number", table: "expenses" },
  { name: "Other Costs",             type: "number", table: "expenses" },
  { name: "Total Capacity (KW)",     type: "number", table: "expenses" },
  { name: "KW Produced",             type: "number", table: "expenses" },
  { name: "KW Sold",                 type: "number", table: "expenses" },
  { name: "Attached Customers",      type: "number", table: "expenses" },
  { name: "Max Customers",           type: "number", table: "expenses" },
  { name: "Total OPEX",              type: "number", table: "expenses" },
  { name: "Daily Cost",              type: "number", table: "expenses" },
  { name: "Monthly OPEX",            type: "number", table: "expenses" },
  { name: "Capacity Utilization",    type: "number", table: "expenses" },
  { name: "Idle Capacity (KW)",      type: "number", table: "expenses" },
  { name: "Cost per KW",             type: "number", table: "expenses" },
  { name: "Customer Utilization",    type: "number", table: "expenses" },
  { name: "Total Revenue",           type: "number", table: "expenses" },
  { name: "Profit",                  type: "number", table: "expenses" },
  { name: "Idle Capacity Value",     type: "number", table: "expenses" },
  { name: "Price per KW",            type: "number", table: "revenue"  },
  { name: "Daily Revenue",           type: "number", table: "revenue"  },
  { name: "Monthly Revenue",         type: "number", table: "revenue"  },
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
        display: "inline-flex", alignItems: "center",
        padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700,
        background: "rgba(0, 212, 170, 0.08)", border: "1px solid rgba(0, 212, 170, 0.2)",
        color: "var(--accent)",
        cursor: onRename ? "pointer" : "default"
      }}>
      {displayName}
    </span>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const UnitManager = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState("units");
  const [units, setUnits] = useState([]);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Unit modal state
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [unitForm, setUnitForm] = useState({ 
    name: "", city: "", location: "Urban", 
    date: new Date().toISOString().split('T')[0],
    customers: [] // Array of strings (e.g. ["Jazz", "Ufone"])
  });
  const [newCustomerInput, setNewCustomerInput] = useState("");
  
  // Variables linked to the Unit itself
  const [unitVars, setUnitVars] = useState([]);
  // Variables linked to Customers
  const [customerVars, setCustomerVars] = useState([]);
  const [colMap, setColMap] = useState({});

  const userRole = localStorage.getItem("role");
  const isAdmin = userRole === "system_admin" || userRole === "org_admin" || userRole === "admin";

  const loadOrgMappings = async () => {
    try {
      const res = await api.get("/organizations/me");
      if (res.data && res.data.column_mappings) {
        setColMap(res.data.column_mappings);
        localStorage.setItem("telco_unit_col_map", JSON.stringify(res.data.column_mappings));
      }
    } catch (err) {
      console.error("Failed to load organization mappings:", err);
    }
  };

  useEffect(() => { 
    try { setColMap(JSON.parse(localStorage.getItem("telco_unit_col_map") || "{}")); } catch {}
    loadOrgMappings();
    loadUnits(); 
  }, []);

  // ── Units (stored in database and cached in localStorage) ─────────
  const STORAGE_KEY = "telco_units_v1";
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dbUnits));
    } catch (err) {
      console.error("Failed to load units from database, using cache:", err);
      try { setUnits(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")); } catch { setUnits([]); }
    }
  };

  const openNewUnit = () => {
    setEditingUnit(null);
    setUnitForm({ 
      name: "", city: "", location: "Urban", 
      date: new Date().toISOString().split('T')[0],
      customers: [] 
    });
    setNewCustomerInput("");
    setUnitVars([]); // start unchecked by default so user selects what they want
    setCustomerVars([]); // none selected for customers by default
    setShowUnitModal(true);
  };

  const openEditUnit = (u) => {
    setEditingUnit(u);
    setUnitForm({ 
      name: u.name, city: u.city, location: u.location, 
      date: u.date || new Date().toISOString().split('T')[0],
      customers: u.customers || []
    });
    setNewCustomerInput("");
    setUnitVars(u.unit_vars || []);
    setCustomerVars(u.customer_vars || []);
    setShowUnitModal(true);
  };

  const handleAddCustomer = () => {
    if (!newCustomerInput.trim()) return;
    if (unitForm.customers.includes(newCustomerInput.trim())) {
      return showMsg("error", "Customer already added");
    }
    setUnitForm({ ...unitForm, customers: [...unitForm.customers, newCustomerInput.trim()] });
    setNewCustomerInput("");
  };

  const handleRemoveCustomer = (customerName) => {
    setUnitForm({ ...unitForm, customers: unitForm.customers.filter(c => c !== customerName) });
  };

  const handleSaveUnit = async () => {
    if (!unitForm.name || !unitForm.city) return showMsg("error", "Name and city are required");
    const payload = {
      name: unitForm.name,
      description: unitForm.city,
      region: unitForm.region || unitForm.city,
      location: unitForm.location || "Urban",
      customers: unitForm.customers || [],
      unit_vars: unitVars,
      customer_vars: customerVars,
      sector: "Telecom"
    };

    try {
      if (editingUnit && !isNaN(Number(editingUnit.id))) {
        await productService.updateProduct(editingUnit.id, payload);
        showMsg("success", "Table updated in database!");
      } else {
        await productService.createProduct(payload);
        showMsg("success", "Table created in database!");
      }
      setShowUnitModal(false);
      loadUnits();
    } catch (err) {
      console.error("Failed to save unit to database:", err);
      showMsg("error", "Failed to save unit to database.");
    }
  };

  const deleteUnit = async (id) => {
    try {
      if (!isNaN(Number(id))) {
        await productService.deleteProduct(id);
      }
      showMsg("success", "Table removed from database!");
      loadUnits();
    } catch (err) {
      console.error("Failed to delete unit:", err);
      showMsg("error", "Failed to delete unit from database.");
    }
  };

  const toggleUnitVar = (name) =>
    setUnitVars(prev => prev.includes(name) ? prev.filter(v => v !== name) : [...prev, name]);

  const toggleCustomerVar = (name) =>
    setCustomerVars(prev => prev.includes(name) ? prev.filter(v => v !== name) : [...prev, name]);

  const handleRenameVar = async (v) => {
    const currentName = colMap[v.name] || v.name;
    const newName = window.prompt(`Rename column "${currentName}":`, currentName);
    if (!newName || newName.trim() === "" || newName === currentName) return;
    
    try {
      const res = await api.put("/organizations/me/rename-column", {
        canonical_name: v.name,
        new_display_name: newName.trim()
      });
      if (res.data && res.data.column_mappings) {
        setColMap(res.data.column_mappings);
        localStorage.setItem("telco_unit_col_map", JSON.stringify(res.data.column_mappings));
      } else {
        const newMap = { ...colMap, [v.name]: newName.trim() };
        setColMap(newMap);
        localStorage.setItem("telco_unit_col_map", JSON.stringify(newMap));
      }
      showMsg("success", "Column renamed across database and formulas successfully");
      loadUnits();
    } catch (err) {
      console.error("Failed to rename column on server:", err);
      showMsg("error", err.response?.data?.detail || "Failed to rename column on server.");
    }
  };

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 4000);
  };

  const TABS = [
    { id: "units",   label: "Unit Tables",    icon: Radio    },
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

      {/* ── UNITS TAB ── */}
      {tab === "units" && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>Operational Table Registry</h2>
              <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                Create a table for a branch/unit, set the sub-units and parameters, and link columns.
              </p>
            </div>
            <button onClick={openNewUnit} className="btn-primary flex items-center gap-2 font-black">
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

          {units.length === 0 ? (
            <div className="glass-card p-16 text-center border-dashed">
              <Radio size={52} className="mx-auto mb-4 text-white/20" />
              <p className="text-xl font-bold text-white/30">No tables configured</p>
              <p className="text-sm text-white/20 mt-2">Click CREATE TABLE to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {units.map(u => (
                <div key={u.id} className="glass-card p-6 flex flex-col justify-between group hover:border-teal-500/50 transition-all">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center border border-teal-500/20">
                        <Radio size={20} className="text-teal-500" />
                      </div>
                      <span className="text-[10px] font-black px-2 py-1 rounded-md bg-white/5 border border-white/10 text-white/40">
                        {u.location}
                      </span>
                    </div>
                    <h3 className="font-black text-lg mb-1" style={{ color: "var(--text-primary)" }}>{u.name}</h3>
                    <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>{u.city} | {u.date}</p>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-center">
                        <p className="text-[10px] text-white/30 uppercase font-black">Customers</p>
                        <p className="font-black text-white">{(u.customers || []).length}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-center">
                        <p className="text-[10px] text-white/30 uppercase font-black">Linked Cols</p>
                        <p className="font-black text-teal-500">{(u.unit_vars || []).length + (u.customer_vars || []).length}</p>
                      </div>
                    </div>
                    {(u.customers || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {u.customers.map(customer => (
                          <span key={customer} className="text-[10px] font-bold px-2 py-1 bg-white/5 border border-white/10 rounded-full text-white/60">
                            {customer}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEditUnit(u)}
                      className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl bg-teal-500/10 text-teal-500 hover:bg-teal-500 hover:text-black font-black text-xs transition-all">
                      <Settings size={14} /> CONFIGURE
                    </button>
                    <button onClick={() => deleteUnit(u.id)}
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
              { step: "2", icon: Settings,   title: "Link Columns",        desc: "For each table, link columns to either the Unit itself or individual Customers." },
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

      {/* ── Unit Modal ── */}
      <Modal isOpen={showUnitModal} onClose={() => setShowUnitModal(false)}
        title={editingUnit ? `Configure Table: ${editingUnit.name}` : "Create Table"} wide>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Unit Parameters & Customers */}
          <div className="space-y-6">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-white/30 mb-3">1. Table Parameters</p>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-white/40 uppercase">Table Name</label>
                  <input placeholder="e.g. KHI-Unit-04" value={unitForm.name}
                    onChange={e => setUnitForm({ ...unitForm, name: e.target.value })}
                    className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-teal-500 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-white/40 uppercase">City</label>
                    <input placeholder="e.g. Karachi" value={unitForm.city}
                      onChange={e => setUnitForm({ ...unitForm, city: e.target.value })}
                      className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-teal-500 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-white/40 uppercase">Location Type</label>
                    <select value={unitForm.location} onChange={e => setUnitForm({ ...unitForm, location: e.target.value })}
                      className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold outline-none focus:border-teal-500">
                      <option>Urban</option><option>SemiUrban</option><option>Rural</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-white/40 uppercase">Date</label>
                  <input type="date" value={unitForm.date}
                    onChange={e => setUnitForm({ ...unitForm, date: e.target.value })}
                    className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-teal-500 outline-none" />
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-widest text-white/30 mb-3">2. Customers Config</p>
              <div className="flex gap-2 mb-3">
                <input placeholder="e.g. Jazz, Ufone..." value={newCustomerInput}
                  onChange={e => setNewCustomerInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddCustomer()}
                  className="flex-1 p-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-teal-500 outline-none text-sm" />
                <button onClick={handleAddCustomer} className="px-4 rounded-xl bg-teal-500/10 text-teal-500 hover:bg-teal-500 hover:text-black font-black transition-all">
                  ADD
                </button>
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                {unitForm.customers.length === 0 && <p className="text-xs text-white/30 italic">No customers added yet.</p>}
                {unitForm.customers.map(c => (
                  <div key={c} className="flex justify-between items-center p-2.5 rounded-lg bg-white/5 border border-white/10">
                    <span className="font-bold text-sm text-white">{c}</span>
                    <button onClick={() => handleRemoveCustomer(c)} className="text-red-500/40 hover:text-red-500">
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
                  <span className="text-sm font-black text-teal-500">Linked to Unit (Overall)</span>
                  <span className="text-xs font-bold text-white/40">{unitVars.length} selected</span>
                </div>
                <p className="text-xs text-white/40 mb-3">Data applying to the whole unit (e.g. total rent, fuel cost)</p>
                <div className="space-y-1 max-h-40 overflow-y-auto pr-1 custom-scrollbar border-t border-white/5 pt-2">
                  {FIXED_VARIABLES.map(v => {
                    const on = unitVars.includes(v.name);
                    const displayName = colMap[v.name] || v.name;
                    return (
                      <label key={`unit-${v.name}`} className="flex items-center gap-3 p-1.5 rounded-lg cursor-pointer hover:bg-white/5 transition-colors">
                        <input type="checkbox" checked={on} onChange={() => toggleUnitVar(v.name)}
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
                  <span className="text-sm font-black text-teal-500">Linked to Customers</span>
                  <span className="text-xs font-bold text-white/40">{customerVars.length} selected</span>
                </div>
                <p className="text-xs text-white/40 mb-3">Data recorded separately for each customer (e.g. KW Sold, capacity)</p>
                <div className="space-y-1 max-h-40 overflow-y-auto pr-1 custom-scrollbar border-t border-white/5 pt-2">
                  {FIXED_VARIABLES.map(v => {
                    const on = customerVars.includes(v.name);
                    const displayName = colMap[v.name] || v.name;
                    return (
                      <label key={`customer-${v.name}`} className="flex items-center gap-3 p-1.5 rounded-lg cursor-pointer hover:bg-white/5 transition-colors">
                        <input type="checkbox" checked={on} onChange={() => toggleCustomerVar(v.name)}
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

        <button onClick={handleSaveUnit} className="btn-primary w-full py-4 font-black mt-8 flex items-center justify-center gap-2">
          <Save size={16} /> {editingUnit ? "UPDATE TABLE CONFIG" : "CREATE TABLE CONFIG"}
        </button>
      </Modal>
    </div>
  );
};

export default UnitManager;
