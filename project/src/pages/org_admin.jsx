import React, { useState, useEffect } from "react";
import {
  Plus, Trash2, Eye, EyeOff, Users,
  CheckCircle2, AlertCircle, X
} from "lucide-react";
import api from "../services/api";

const OrgAdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [showPassword, setShowPassword] = useState({});
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState({ type: "", text: "" });

  const [availableUnits, setAvailableUnits] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUserForAssign, setSelectedUserForAssign] = useState(null);
  const [assignedUnitIds, setAssignedUnitIds] = useState([]);
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    try {
      const res = await api.get("/products/");
      setAvailableUnits(res.data || []);
    } catch (err) { console.error("Fetch units failed", err); }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get("/users/");
      const orgUsers = res.data.filter(user => user.role === "org_user");
      
      const enrichedUsers = await Promise.all(orgUsers.map(async (u) => {
        try {
          const assignRes = await api.get(`/users/${u.id}/assigned-units`);
          return { ...u, assignedUnits: assignRes.data || [] };
        } catch {
          return { ...u, assignedUnits: [] };
        }
      }));
      setUsers(enrichedUsers);
    } catch (err) { console.error("Fetch users failed", err); }
  };

  const handleOpenAssignModal = async (user) => {
    setSelectedUserForAssign(user);
    setAssignedUnitIds([]);
    setShowAssignModal(true);
    try {
      const res = await api.get(`/users/${user.id}/assigned-units`);
      setAssignedUnitIds(res.data.map(p => p.id));
    } catch (err) {
      console.error("Failed to load assigned units", err);
    }
  };

  const handleSaveAssignments = async () => {
    if (!selectedUserForAssign) return;
    setIsAssigning(true);
    try {
      await api.post(`/users/${selectedUserForAssign.id}/assign-units`, {
        product_ids: assignedUnitIds
      });
      showMsg("success", `Units assigned successfully to ${selectedUserForAssign.name}`);
      setShowAssignModal(false);
      fetchUsers();
    } catch (err) {
      showMsg("error", "Failed to assign units");
    } finally {
      setIsAssigning(false);
    }
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
      </div>

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
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] font-black tracking-widest text-white/40 border border-white/10">OPERATOR</span>
                      {user.assignedUnits && user.assignedUnits.length > 0 ? (
                        user.assignedUnits.map(unit => (
                          <span key={unit.id} className="px-2 py-0.5 rounded-md bg-teal-500/10 text-[10px] font-bold text-teal-400 border border-teal-500/20">
                            {unit.name}
                          </span>
                        ))
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-[10px] font-bold text-red-400 border border-red-500/20">
                          No Units Assigned
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleOpenAssignModal(user)}
                    className="px-3.5 py-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 hover:bg-teal-500 hover:text-black font-black text-xs transition-all"
                  >
                    Assign Units
                  </button>
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

      {/* Assign Units Modal */}
      {showAssignModal && selectedUserForAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowAssignModal(false)}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Assign Units</h2>
              <button onClick={() => setShowAssignModal(false)} className="text-white/40 hover:text-white text-xl">✕</button>
            </div>

            <p className="text-white/60 text-sm mb-4">
              Select which units <strong>{selectedUserForAssign.name}</strong> is allowed to access and manage:
            </p>

            <div className="space-y-2 mb-6 max-h-[40vh] overflow-y-auto pr-1">
              {availableUnits.length === 0 ? (
                <p className="text-white/30 text-sm text-center py-4">No units found. Add units in "Unit Tables" first.</p>
              ) : (
                availableUnits.map(unit => {
                  const isChecked = assignedUnitIds.includes(unit.id);
                  return (
                    <label
                      key={unit.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all hover:bg-white/5 ${isChecked ? 'bg-teal-500/5 border-teal-500/30' : 'bg-white/5 border-white/10'}`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAssignedUnitIds([...assignedUnitIds, unit.id]);
                          } else {
                            setAssignedUnitIds(assignedUnitIds.filter(id => id !== unit.id));
                          }
                        }}
                        className="w-4 h-4 rounded accent-teal-500 bg-white/10 border-white/10 outline-none"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-bold text-white">{unit.name}</span>
                        {unit.description && (
                          <span className="text-xs text-white/40 block">{unit.description}</span>
                        )}
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            <button
              onClick={handleSaveAssignments}
              disabled={isAssigning}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-black font-black text-sm hover:opacity-90 disabled:opacity-40 transition-all"
            >
              {isAssigning ? 'Saving...' : 'Save Assignments'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrgAdminDashboard;

