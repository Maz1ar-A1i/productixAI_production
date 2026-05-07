import React, { useEffect, useState } from "react";
import { Boxes, Plus, Edit2, Search, X, Loader2, AlertTriangle } from "lucide-react";
import api from "../../services/api";

const Batches = () => {
  const [batches, setBatches] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal states
  const [showAdd, setShowAdd] = useState(false);
  const [confirmClose, setConfirmClose] = useState(null);

  // Form states
  const [productId, setProductId] = useState("");
  const [startDate, setStartDate] = useState("");

  useEffect(() => {
    fetchBatches();
    fetchProducts();
  }, []);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const res = await api.get("/batches/org");
      setBatches(res.data);
      setLoading(false);
    } catch (err) {
      setError("Failed to load batches");
      setLoading(false);
      console.error("Error fetching batches", err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get("/products");
      setProducts(res.data);
    } catch (err) {
      console.error("Error fetching products", err);
    }
  };

  const handleAddBatch = async (e) => {
    e.preventDefault();

    if (!productId || !startDate) {
      alert("Please select a product and a start date.");
      return;
    }

    try {
      const payload = {
        product_id: parseInt(productId, 10),
        start_date: startDate,
        status: "open"
      };

      const res = await api.post("/batches", payload);
      setBatches([...batches, res.data]);

      setShowAdd(false);
      setProductId("");
      setStartDate("");

      fetchBatches(); // Refresh data
    } catch (err) {
      alert("Failed to add batch");
      console.error("Error adding batch", err);
    }
  };

  const handleCloseBatch = async (batchId) => {
    try {
      const res = await api.put(`/batches/${batchId}/close`);
      setBatches(batches.map(b => b.id === batchId ? res.data : b));
      setConfirmClose(null);
    } catch (err) {
      alert("Failed to close batch");
      console.error("Error closing batch", err);
    }
  };

  const filteredBatches = batches.filter(batch => {
    const batchNo = (batch.batch_no ?? "").toString().toLowerCase();
    const productName = (batch.product?.name ?? "").toLowerCase();
    const startDateStr = (batch.start_date ?? "").toString().toLowerCase();

    return (
      batchNo.includes(searchTerm.toLowerCase()) ||
      productName.includes(searchTerm.toLowerCase()) ||
      startDateStr.includes(searchTerm.toLowerCase())
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-white/60">Loading batches...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 rounded-lg">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent flex items-center gap-3">
              <Boxes className="w-10 h-10 text-purple-400" />
              Batch Management
            </h1>
            <p className="text-white/40 text-sm">Track and manage all production batches</p>
          </div>

          <button
            className="group relative px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105 flex items-center gap-2"
            onClick={() => setShowAdd(true)}
          >
            <Plus className="w-5 h-5" />
            Add Batch
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-6 relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5" />
          <input
            type="text"
            placeholder="Search batches by batch number, product name, or date..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all duration-300"
          />
        </div>

        {/* Batches Table */}
        <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-6 text-white/60 font-semibold text-sm uppercase tracking-wider">Batch No</th>
                  <th className="text-left py-4 px-6 text-white/60 font-semibold text-sm uppercase tracking-wider">Product</th>
                  <th className="text-left py-4 px-6 text-white/60 font-semibold text-sm uppercase tracking-wider">Start Date</th>
                  <th className="text-left py-4 px-6 text-white/60 font-semibold text-sm uppercase tracking-wider">End Date</th>
                  <th className="text-left py-4 px-6 text-white/60 font-semibold text-sm uppercase tracking-wider">Status</th>
                  <th className="text-right py-4 px-6 text-white/60 font-semibold text-sm uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBatches.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-12">
                      <Boxes className="w-16 h-16 text-white/20 mx-auto mb-4" />
                      <p className="text-white/40">No batches found</p>
                    </td>
                  </tr>
                ) : (
                  filteredBatches.map((batch) => (
                    <tr
                      key={batch.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors duration-200 group"
                    >
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-purple-500/10 text-purple-300 font-semibold text-sm">
                          {batch.batch_number ?? "-"}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                            <Boxes className="w-5 h-5 text-purple-400" />
                          </div>
                          <span className="text-white font-medium">{batch.product?.name ?? "-"}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-white/60">
                        {batch.start_date ?? "-"}
                      </td>
                      <td className="py-4 px-6 text-white/60">
                        {batch.end_date ?? <span className="text-white/30 italic">Not closed</span>}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`px-3 py-1.5 text-xs font-semibold rounded-full border ${batch.status === "open"
                            ? "bg-green-500/10 text-green-400 border-green-500/20"
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                            }`}
                        >
                          {(batch.status ?? "open").charAt(0).toUpperCase() + (batch.status ?? "open").slice(1)}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        {batch.status === "open" && (
                          <button
                            className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/50 rounded-lg text-red-400 text-sm font-medium transition-all duration-300 hover:scale-105"
                            onClick={() => setConfirmClose(batch.id)}
                          >
                            <AlertTriangle className="w-4 h-4" />
                            Close Batch
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 text-center text-white/40 text-sm">
          Showing {filteredBatches.length} of {batches.length} batches
        </div>
      </div>

      {/* Add Batch Modal */}
      {showAdd && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50 p-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl text-white font-bold flex items-center gap-2">
                <Plus className="w-6 h-6 text-purple-400" />
                Add Batch
              </h2>
              <button
                onClick={() => setShowAdd(false)}
                className="text-white/40 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddBatch} className="space-y-4">
              <div>
                <label className="block text-white/60 text-sm font-medium mb-2">Product</label>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all duration-300"
                  required
                >
                  <option value="" disabled className="text-white bg-gray-800">Select a product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id} className="text-white bg-gray-800">
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-white/60 text-sm font-medium mb-2">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all duration-300 [color-scheme:dark]"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105"
                >
                  Create Batch
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-6 py-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl font-semibold text-white transition-all duration-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Close Modal */}
      {confirmClose && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50 p-4">
          <div className="bg-gradient-to-br from-red-900/20 to-slate-900 border border-red-500/20 rounded-2xl p-6 w-full max-w-md shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-500/10 border-4 border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="text-red-400 w-8 h-8" />
            </div>

            <h2 className="text-2xl text-white font-bold mb-2">Confirm Close Batch</h2>
            <p className="text-white/60 mb-6">
              Are you sure you want to close this batch? This action cannot be undone.
            </p>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => handleCloseBatch(confirmClose)}
                className="px-6 py-3 bg-red-500 hover:bg-red-600 rounded-xl font-semibold text-white shadow-lg shadow-red-500/30 hover:shadow-red-500/50 transition-all duration-300 hover:scale-105"
              >
                Yes, Close It
              </button>
              <button
                onClick={() => setConfirmClose(null)}
                className="px-6 py-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl font-semibold text-white transition-all duration-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Batches;
