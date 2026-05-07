import React, { useState, useEffect } from "react";
import {
  Plus, Trash2, Eye, EyeOff, Users, Package,
  Settings, Shield, Zap, Target, BarChart3,
  CheckCircle2, AlertCircle, Download, Upload, X,
  Calendar, Layers, Clock, FileText, ChevronRight
} from "lucide-react";
import api, { productService } from "../services/api";

const OrgAdminDashboard = () => {
  const [tab, setTab] = useState("users"); // users, products, copilot
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [showPassword, setShowPassword] = useState({});
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "" });

  // Modals state
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showAddBatchModal, setShowAddBatchModal] = useState(false);
  const [showAddSessionModal, setShowAddSessionModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batches, setBatches] = useState([]);

  // Form states
  const [productForm, setProductForm] = useState({ name: "", description: "", input_fields: "[]", output_fields: "[]" });
  const [batchForm, setBatchForm] = useState({ product_id: "", start_date: new Date().toISOString().split('T')[0], end_date: "", status: "open" });
  const [sessionForm, setSessionForm] = useState({ batch_id: "", date: new Date().toISOString().split('T')[0], shift_no: "Morning", input_materials: "{}", output_products: "{}", admin_notes: "" });
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Co-Pilot settings
  const [copilotSettings, setCopilotSettings] = useState({
    activeGoal: "Increase Efficiency",
    targetValue: 85,
    autoModeEnabled: false,
    agents: [
      { id: "sales", name: "Sales Agent", enabled: true },
      { id: "inventory", name: "Inventory Agent", enabled: true },
      { id: "production", name: "Production Agent", enabled: true },
    ]
  });

  useEffect(() => {
    fetchUsers();
    fetchProducts();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get("/users/");
      const orgUsers = res.data.filter(user => user.role === "org_user");
      setUsers(orgUsers);
    } catch (err) { console.error("Fetch users failed", err); }
  };

  const fetchProducts = async () => {
    try {
      const res = await productService.getProducts();
      setProducts(res.data);
    } catch (err) { console.error("Fetch products failed", err); }
  };

  const fetchBatches = async (productId) => {
    try {
      const res = await productService.getBatches(productId);
      setBatches(res.data);
    } catch (err) { console.error("Fetch batches failed", err); }
  };

  const addUser = async (e) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email || !newUser.password) return;
    try {
      await api.post("/users/", { ...newUser, role: "org_user" });
      setNewUser({ name: "", email: "", password: "" });
      fetchUsers();
      showMsg("success", "User added successfully");
    } catch (err) { showMsg("error", "Failed to add user"); }
  };

  const deleteUser = async (id) => {
    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
      showMsg("success", "User deleted");
    } catch (err) { showMsg("error", "Failed to delete user"); }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...productForm,
        input_fields: JSON.parse(productForm.input_fields),
        output_fields: JSON.parse(productForm.output_fields)
      };
      await productService.createProduct(data);
      setShowAddProductModal(false);
      fetchProducts();
      showMsg("success", "Product created successfully");
    } catch (err) {
      console.error(err);
      showMsg("error", "Failed to create product. Ensure JSON fields are valid arrays.");
    }
  };

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    try {
      await productService.createBatch({
        ...batchForm,
        product_id: selectedProduct.id
      });
      setShowAddBatchModal(false);
      showMsg("success", "Batch created successfully");
    } catch (err) { showMsg("error", "Failed to create batch"); }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...sessionForm,
        batch_id: selectedBatch.id,
        input_materials: JSON.parse(sessionForm.input_materials),
        output_products: JSON.parse(sessionForm.output_products)
      };
      await productService.createShift(data);
      setShowAddSessionModal(false);
      showMsg("success", "Session added successfully");
    } catch (err) {
      console.error(err);
      showMsg("error", "Failed to add session. Ensure JSON fields are valid objects.");
    }
  };

  const handleExcelUpload = async () => {
    if (!uploadFile) return;
    setUploadLoading(true);
    const formData = new FormData();
    formData.append("file", uploadFile);
    try {
      await productService.uploadExcel(formData);
      showMsg("success", "Excel processed successfully");
      setShowUploadModal(false);
      fetchProducts();
    } catch (err) { showMsg("error", "Excel upload failed"); }
    finally { setUploadLoading(false); }
  };

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 5000);
  };

  const TableHeader = ({ icon: Icon, title }) => (
    <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
      <Icon size={20} style={{ color: 'var(--accent)' }} />
      {title}
    </h3>
  );

  const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="glass-card w-full max-w-lg p-8 relative animate-in fade-in zoom-in duration-200">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white">
            <X size={24} />
          </button>
          <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>{title}</h2>
          {children}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)', padding: '32px' }}>
      {/* Alert Message */}
      {message.text && (
        <div className={`fixed top-8 right-8 z-[100] p-4 rounded-xl border flex items-center gap-3 animate-in slide-in-from-right duration-300 ${message.type === 'success' ? 'bg-teal-500/10 border-teal-500 text-teal-500' : 'bg-red-500/10 border-red-500 text-red-500'
          }`}>
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="font-semibold">{message.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black mb-2 tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Admin Control
          </h1>
          <p style={{ color: 'var(--text-secondary)' }} className="text-lg">
            Operational backbone of your enterprise AI
          </p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-white/5 border border-white/10 hover:border-teal-500 transition-all text-white"
          >
            <Upload size={18} className="text-teal-500" />
            Bulk Import
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 p-1 rounded-2xl w-fit" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
        {[
          { id: 'users', label: 'Team Members', icon: Users },
          { id: 'products', label: 'Inventory & Products', icon: Package },
          { id: 'copilot', label: 'Co-Pilot Tuning', icon: Zap },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-300"
            style={{
              background: tab === t.id ? 'var(--accent)' : 'transparent',
              color: tab === t.id ? '#000' : 'var(--text-secondary)',
              boxShadow: tab === t.id ? '0 4px 20px rgba(0,212,170,0.3)' : 'none'
            }}
          >
            <t.icon size={18} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Users Tab ── */}
      {tab === "users" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="glass-card p-8 h-fit">
            <TableHeader icon={Plus} title="Invite Member" />
            <form onSubmit={addUser} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-white/40 uppercase ml-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white focus:border-teal-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-white/40 uppercase ml-1">Email Address</label>
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white focus:border-teal-500 outline-none"
                />
              </div>
              <div className="space-y-1 relative">
                <label className="text-xs font-bold text-white/40 uppercase ml-1">Initial Password</label>
                <input
                  type={showPassword["new"] ? "text" : "password"}
                  placeholder="••••••••"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white focus:border-teal-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword({ ...showPassword, new: !showPassword["new"] })}
                  className="absolute right-4 top-[38px] text-white/20 hover:text-white"
                >
                  {showPassword["new"] ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <button type="submit" className="btn-primary w-full py-4 mt-4 font-black">
                CREATE OPERATOR
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {users.length === 0 && (
              <div className="glass-card p-12 text-center text-white/20 border-dashed">
                <Users size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-xl font-bold">No operators found in this organization</p>
              </div>
            )}
            {users.map((user) => (
              <div key={user.id} className="glass-card p-6 flex justify-between items-center group hover:border-teal-500/50 transition-all hover:translate-x-1">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-teal-500/10 text-teal-500 font-black text-2xl border border-teal-500/20">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-black text-lg" style={{ color: 'var(--text-primary)' }}>{user.name}</h4>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{user.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] font-black tracking-widest text-white/40 border border-white/10">OPERATOR</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowPassword({ ...showPassword, [user.id]: !showPassword[user.id] })}
                    className="p-3 rounded-xl bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    {showPassword[user.id] ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                  <button
                    onClick={() => deleteUser(user.id)}
                    className="p-3 rounded-xl bg-red-500/5 text-red-500/40 hover:bg-red-500 hover:text-white transition-all"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Products Tab ── */}
      {tab === "products" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div
            onClick={() => setShowAddProductModal(true)}
            className="glass-card p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:border-teal-500 transition-all group border-dashed border-2 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-20 h-20 rounded-3xl bg-teal-500/10 flex items-center justify-center text-teal-500 mb-6 group-hover:scale-110 transition-transform">
              <Plus size={40} />
            </div>
            <h3 className="text-xl font-black mb-2" style={{ color: 'var(--text-primary)' }}>New Product</h3>
            <p className="text-sm px-6 font-medium leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Define SKU name, description, and custom input/output tracking fields.
            </p>
          </div>

          {products.map(p => (
            <div key={p.id} className="glass-card p-8 group relative flex flex-col justify-between">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-teal-500 border border-white/10">
                  <Package size={24} />
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div>
                <h3 className="font-black text-2xl mb-2 tracking-tight" style={{ color: 'var(--text-primary)' }}>{p.name}</h3>
                <p className="text-sm mb-6 line-clamp-2 font-medium" style={{ color: 'var(--text-secondary)' }}>{p.description}</p>

                <div className="grid grid-cols-2 gap-3 mb-8">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[10px] font-black text-white/30 uppercase mb-1">Inputs</p>
                    <p className="text-sm font-bold text-white">{(p.input_fields || []).length} Types</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[10px] font-black text-white/30 uppercase mb-1">Outputs</p>
                    <p className="text-sm font-bold text-white">{(p.output_fields || []).length} Metrics</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mt-auto">
                <button
                  onClick={() => {
                    setSelectedProduct(p);
                    setBatchForm({ ...batchForm, product_id: p.id });
                    fetchBatches(p.id);
                    setShowAddBatchModal(true);
                  }}
                  className="w-full flex items-center justify-between p-4 rounded-xl bg-teal-500/10 text-teal-500 font-black hover:bg-teal-500 hover:text-black transition-all group/btn"
                >
                  <span className="flex items-center gap-2">
                    <Layers size={18} />
                    ADD BATCH
                  </span>
                  <ChevronRight size={18} className="translate-x-0 group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Co-Pilot Config Tab ── */}
      {tab === "copilot" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="glass-card p-8">
              <TableHeader icon={Target} title="Core Objective" />
              <p className="text-sm mb-6 font-medium" style={{ color: 'var(--text-secondary)' }}>Select the primary optimization target for the AI engine.</p>
              <select className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white font-bold outline-none focus:border-teal-500 mb-8 appearance-none cursor-pointer">
                <option>Increase Production Efficiency</option>
                <option>Minimize Operational Down-time</option>
                <option>Maximize Sales Velocity</option>
                <option>Optimize Inventory Turnover</option>
              </select>
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>TARGET PERFORMANCE</span>
                  <span className="text-2xl font-black text-teal-500">85%</span>
                </div>
                <div className="relative h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="absolute top-0 left-0 h-full bg-teal-500" style={{ width: '85%' }} />
                </div>
                <input type="range" className="w-full accent-teal-500 opacity-0 absolute cursor-pointer" />
              </div>
            </div>

            <div className="glass-card p-8 bg-gradient-to-br from-white/5 to-transparent">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <TableHeader icon={Zap} title="Autonomous Operations" />
                  <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Enable AI to execute routine adjustments without manual supervisor sign-off.
                  </p>
                </div>
                <div className={`w-14 h-7 rounded-full relative cursor-pointer transition-all duration-300 ${copilotSettings.autoModeEnabled ? 'bg-teal-500 shadow-[0_0_20px_rgba(0,212,170,0.3)]' : 'bg-white/10'}`}
                  onClick={() => setCopilotSettings(s => ({ ...s, autoModeEnabled: !s.autoModeEnabled }))}>
                  <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all shadow-xl ${copilotSettings.autoModeEnabled ? 'right-1' : 'left-1'}`} />
                </div>
              </div>
              <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex gap-4">
                <AlertCircle size={20} className="text-amber-500 shrink-0" />
                <p className="text-xs text-amber-200/60 leading-relaxed font-medium">
                  Critical operations (batch cancellation, personnel shifts) will always remain in "Human-in-the-Loop" mode for safety.
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card p-8">
            <TableHeader icon={BarChart3} title="Agent Fleet" />
            <p className="text-sm mb-8 font-medium" style={{ color: 'var(--text-secondary)' }}>Toggle specialized intelligence units across your workflow.</p>
            <div className="space-y-6">
              {copilotSettings.agents.map(agent => (
                <div key={agent.id} className="p-5 rounded-2xl border border-white/5 bg-white/2 hover:border-teal-500/30 transition-all flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full transition-all duration-500 ${agent.enabled ? 'bg-teal-500 shadow-[0_0_12px_rgba(0,212,170,0.6)] animate-pulse' : 'bg-white/10'}`} />
                    <span className="font-black text-lg tracking-tight" style={{ color: 'var(--text-secondary)' }}>{agent.name}</span>
                  </div>
                  <button className={`px-6 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${agent.enabled ? 'bg-teal-500 text-black' : 'bg-white/5 text-white/20 hover:text-white/40'}`}>
                    {agent.enabled ? 'ONLINE' : 'OFFLINE'}
                  </button>
                </div>
              ))}
            </div>
            <button className="btn-primary w-full py-4 mt-10 font-black shadow-xl">
              DEPLOY CONFIGURATION
            </button>
          </div>
        </div>
      )}

      {/* ── MODALS ── */}

      {/* Add Product Modal */}
      <Modal isOpen={showAddProductModal} onClose={() => setShowAddProductModal(false)} title="New Product Definition">
        <form onSubmit={handleCreateProduct} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-white/40 uppercase">Product Name</label>
            <input
              required
              className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white focus:border-teal-500 outline-none"
              placeholder="e.g. Premium Widget X"
              value={productForm.name}
              onChange={e => setProductForm({ ...productForm, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-white/40 uppercase">Description</label>
            <textarea
              className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white focus:border-teal-500 outline-none h-24"
              placeholder="Primary SKU for Q2 export..."
              value={productForm.description}
              onChange={e => setProductForm({ ...productForm, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-white/40 uppercase">Input Fields (JSON Array)</label>
              <input
                className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono focus:border-teal-500 outline-none"
                placeholder='["Steel", "Plastic"]'
                value={productForm.input_fields}
                onChange={e => setProductForm({ ...productForm, input_fields: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-white/40 uppercase">Output Fields (JSON Array)</label>
              <input
                className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono focus:border-teal-500 outline-none"
                placeholder='["Units", "Rejected"]'
                value={productForm.output_fields}
                onChange={e => setProductForm({ ...productForm, output_fields: e.target.value })}
              />
            </div>
          </div>
          <button type="submit" className="btn-primary w-full py-4 font-black mt-4">INITIALIZE PRODUCT</button>
        </form>
      </Modal>

      {/* Add Batch Modal */}
      <Modal isOpen={showAddBatchModal} onClose={() => setShowAddBatchModal(false)} title={`Create Batch for ${selectedProduct?.name}`}>
        <form onSubmit={handleCreateBatch} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-white/40 uppercase">Batch Auto-ID</label>
            <div className="w-full p-4 rounded-xl bg-white/5 border border-white/5 text-white/40 font-bold italic">
              System generated (e.g. BATCH-001)
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-white/40 uppercase">Start Date</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-4 text-teal-500" size={18} />
                <input
                  type="date"
                  required
                  className="w-full p-4 pl-12 rounded-xl bg-white/5 border border-white/10 text-white focus:border-teal-500 outline-none"
                  value={batchForm.start_date}
                  onChange={e => setBatchForm({ ...batchForm, start_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-white/40 uppercase">Initial Status</label>
              <select
                className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white font-bold outline-none"
                value={batchForm.status}
                onChange={e => setBatchForm({ ...batchForm, status: e.target.value })}
              >
                <option value="open">OPEN</option>
                <option value="closed">CLOSED</option>
              </select>
            </div>
          </div>
          <button type="submit" className="btn-primary w-full py-4 font-black mt-4">CONFIRM BATCH</button>

          <div className="pt-6 border-t border-white/5">
            <h4 className="text-xs font-black text-white/40 uppercase mb-4">Existing Batches</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {batches.length === 0 && <p className="text-white/20 text-xs italic">No batches created yet</p>}
              {batches.map(b => (
                <div key={b.id} className="p-3 rounded-xl bg-white/2 border border-white/5 flex justify-between items-center group/item hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <Layers size={14} className="text-teal-500" />
                    <span className="text-sm font-bold text-white/80">{b.batch_number}</span>
                    <span className={`text-[8px] px-1.5 py-0.5 rounded bg-white/5 font-black uppercase text-white/40`}>{b.status}</span>
                  </div>
                  <button
                    onClick={(e) => { e.preventDefault(); setSelectedBatch(b); setShowAddSessionModal(true); setShowAddBatchModal(false); }}
                    className="text-[10px] font-black text-teal-500 hover:text-teal-400 opacity-0 group-hover/item:opacity-100 transition-opacity"
                  >
                    + SESSION
                  </button>
                </div>
              ))}
            </div>
          </div>
        </form>
      </Modal>

      {/* Add Session Modal */}
      <Modal isOpen={showAddSessionModal} onClose={() => setShowAddSessionModal(false)} title={`New Session: ${selectedBatch?.batch_number}`}>
        <form onSubmit={handleCreateSession} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-white/40 uppercase">Session Date</label>
              <input
                type="date"
                required
                className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white focus:border-teal-500 outline-none"
                value={sessionForm.date}
                onChange={e => setSessionForm({ ...sessionForm, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-white/40 uppercase">Shift Type</label>
              <select
                className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white font-bold outline-none"
                value={sessionForm.shift_no}
                onChange={e => setSessionForm({ ...sessionForm, shift_no: e.target.value })}
              >
                <option value="Morning">MORNING</option>
                <option value="Evening">EVENING</option>
                <option value="Night">NIGHT</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-white/40 uppercase flex justify-between">
              Input Data (JSON)
              <span className="text-[10px] normal-case opacity-50">{"{ \"Material\": { \"amount\": 10, \"unit_price\": 1 } }"}</span>
            </label>
            <textarea
              className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono focus:border-teal-500 outline-none h-20"
              placeholder='{"Material": {"amount": 50, "unit_price": 5.0}}'
              value={sessionForm.input_materials}
              onChange={e => setSessionForm({ ...sessionForm, input_materials: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-white/40 uppercase flex justify-between">
              Output Data (JSON)
              <span className="text-[10px] normal-case opacity-50">{"{ \"Metric\": { \"amount\": 10 } }"}</span>
            </label>
            <textarea
              className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono focus:border-teal-500 outline-none h-20"
              placeholder='{"Units": {"amount": 45}}'
              value={sessionForm.output_products}
              onChange={e => setSessionForm({ ...sessionForm, output_products: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-white/40 uppercase">Session Notes</label>
            <input
              className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white focus:border-teal-500 outline-none"
              placeholder="e.g. Optimal humidity levels..."
              value={sessionForm.admin_notes}
              onChange={e => setSessionForm({ ...sessionForm, admin_notes: e.target.value })}
            />
          </div>

          <button type="submit" className="btn-primary w-full py-4 font-black mt-4 uppercase">SAVE SESSION RECORD</button>
        </form>
      </Modal>

      {/* Excel Upload Modal */}
      <Modal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} title="Bulk Intelligence Import">
        <div className="space-y-8">
          <div className="p-6 rounded-2xl bg-teal-500/5 border border-teal-500/20 text-center">
            <p className="text-sm font-medium mb-4" style={{ color: 'var(--text-secondary)' }}>
              Download our master template to prepare your products, batches, and records for bulk processing.
            </p>
            <a
              href={productService.downloadTemplate()}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-500 text-black font-black hover:shadow-[0_0_20px_rgba(0,212,170,0.4)] transition-all"
            >
              <Download size={18} />
              DOWNLOAD TEMPLATE
            </a>
          </div>

          <div className="space-y-4">
            <div className="relative group/upload">
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={(e) => setUploadFile(e.target.files[0])}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
              />
              <div className="w-full p-10 rounded-2xl border-2 border-dashed border-white/10 group-hover/upload:border-teal-500/50 transition-colors flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/20 group-hover/upload:text-teal-500 transition-colors mb-4">
                  <Upload size={32} />
                </div>
                <p className="font-bold text-white/60 mb-1">
                  {uploadFile ? uploadFile.name : "Click or drag your XLSX file here"}
                </p>
                <p className="text-xs text-white/20">Maximum file size: 10MB</p>
              </div>
            </div>

            <button
              onClick={handleExcelUpload}
              disabled={!uploadFile || uploadLoading}
              className={`w-full py-4 rounded-xl font-black transition-all ${!uploadFile || uploadLoading ? 'bg-white/5 text-white/20 cursor-not-allowed' : 'btn-primary'
                }`}
            >
              {uploadLoading ? "PROCESSING DATA..." : "EXECUTE IMPORT"}
            </button>
          </div>

          <div className="flex gap-4 p-4 rounded-xl bg-white/2 border border-white/5">
            <FileText size={16} className="text-white/20 shrink-0 mt-0.5" />
            <p className="text-[10px] text-white/40 leading-relaxed uppercase tracking-wider font-black">
              The engine will automatically map product names, validate batch numbers, and append shift entries.
              Duplicate records will be updated based on their unique identifiers.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default OrgAdminDashboard;

