import React, { useState } from "react";
import api from "../../services/api";
import {
  Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle,
  Loader, File, Info, Table2, Hash
} from 'lucide-react';

const COLUMN_INFO = [
  { col: "Date", desc: "Precise date (e.g. 2026-04-17)", required: true },
  { col: "Tower", desc: "Tower/site name — auto-created if new", required: true },
  { col: "Tenant", desc: "Tenant name", required: true },
  { col: "TotalKilowattsProduced", desc: "KW produced for this tenant", required: false },
  { col: "FuelExpense", desc: "Fuel consumed cost", required: false },
  { col: "OperationExpense", desc: "Operational cost", required: false },
];

const ExcelUpload = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    processFile(selected);
  };

  const processFile = (selected) => {
    if (!selected) return;
    if (selected.name.endsWith('.xlsx') || selected.name.endsWith('.xls')) {
      setFile(selected);
      setError("");
      setResult(null);
    } else {
      setError("Please select a valid Excel file (.xlsx or .xls)");
      setFile(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    processFile(dropped);
  };

  const handleUpload = async () => {
    if (!file) { setError("Please select a file first!"); return; }
    try {
      setLoading(true);
      setError("");
      setResult(null);
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/api/v1/uploads/excel", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data);
      setFile(null);
    } catch (err) {
      setError(err.response?.data?.detail || "Upload failed. Please check your file format.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/v1/uploads/template", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "productix_data_template.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setError("Failed to download template.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0e1a", padding: "28px", color: "#fff", fontFamily: "Inter, sans-serif" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: "linear-gradient(135deg, rgba(6,182,212,0.2), rgba(139,92,246,0.2))",
              border: "1px solid rgba(6,182,212,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <FileSpreadsheet size={22} color="#06b6d4" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, background: "linear-gradient(135deg, #fff, rgba(255,255,255,0.6))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Excel Data Upload
              </h1>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.35)", fontSize: 13 }}>
                Upload a flat Excel file to bulk-import tower data
              </p>
            </div>
          </div>
        </div>

        {/* FORMAT SPEC — Column info table */}
        <div style={{
          background: "rgba(15,21,37,0.8)", border: "1px solid #1e2940",
          borderRadius: 16, padding: "20px 24px", marginBottom: 20,
          backdropFilter: "blur(12px)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <Table2 size={15} color="#06b6d4" />
            <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Required Excel Format — Single Sheet
            </span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  <th style={{ padding: "8px 14px", textAlign: "left", color: "rgba(255,255,255,0.4)", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}>Column</th>
                  <th style={{ padding: "8px 14px", textAlign: "left", color: "rgba(255,255,255,0.4)", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}>Description</th>
                  <th style={{ padding: "8px 14px", textAlign: "center", color: "rgba(255,255,255,0.4)", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}>Required</th>
                </tr>
              </thead>
              <tbody>
                {COLUMN_INFO.map((c, i) => (
                  <tr key={c.col} style={{ background: i % 2 !== 0 ? "rgba(255,255,255,0.02)" : "transparent" }}>
                    <td style={{ padding: "9px 14px" }}>
                      <span style={{
                        background: c.required ? "rgba(6,182,212,0.15)" : "rgba(139,92,246,0.12)",
                        border: `1px solid ${c.required ? "rgba(6,182,212,0.3)" : "rgba(139,92,246,0.25)"}`,
                        borderRadius: 6, padding: "2px 8px",
                        color: c.required ? "#4cd7f6" : "#d0bcff",
                        fontWeight: 700, fontSize: 12, fontFamily: "monospace"
                      }}>
                        {c.col}
                      </span>
                    </td>
                    <td style={{ padding: "9px 14px", color: "rgba(255,255,255,0.6)", fontSize: 13 }}>{c.desc}</td>
                    <td style={{ padding: "9px 14px", textAlign: "center" }}>
                      {c.required
                        ? <span style={{ color: "#06b6d4", fontWeight: 700, fontSize: 12 }}>✓ Yes</span>
                        : <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 12 }}>Optional</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 14, padding: "10px 14px", background: "rgba(6,182,212,0.07)", borderRadius: 8, border: "1px solid rgba(6,182,212,0.15)", display: "flex", gap: 8 }}>
            <Info size={14} color="#06b6d4" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
              You can add any number of custom numeric columns beyond FuelExpense, OperationExpense, etc. — they will be stored automatically.
              If a Tower doesn't exist, it will be created. Existing Date+Tower records will be <strong style={{ color: "rgba(255,255,255,0.7)" }}>updated</strong>.
            </p>
          </div>
        </div>

        {/* Upload Card */}
        <div style={{
          background: "rgba(15,21,37,0.8)", border: "1px solid #1e2940",
          borderRadius: 16, padding: "24px", marginBottom: 16,
          backdropFilter: "blur(12px)"
        }}>
          {/* Drop Zone */}
          <input
            type="file"
            accept=".xlsx,.xls"
            id="file-input"
            onChange={handleFileChange}
            style={{ display: "none" }}
            disabled={loading}
          />
          <label
            htmlFor="file-input"
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              padding: "40px 20px",
              border: `2px dashed ${dragOver ? "#06b6d4" : "rgba(255,255,255,0.1)"}`,
              borderRadius: 14,
              background: dragOver ? "rgba(6,182,212,0.06)" : "rgba(255,255,255,0.02)",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.2s"
            }}
          >
            <div style={{
              width: 52, height: 52, borderRadius: 14, marginBottom: 14,
              background: "linear-gradient(135deg, rgba(6,182,212,0.15), rgba(139,92,246,0.15))",
              border: "1px solid rgba(6,182,212,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <Upload size={22} color="#06b6d4" />
            </div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>
              {file ? file.name : "Choose or drag your Excel file"}
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
              Supported: .xlsx, .xls
            </p>
          </label>

          {file && (
            <div style={{
              marginTop: 12, padding: "10px 14px",
              background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)",
              borderRadius: 10, display: "flex", alignItems: "center", gap: 10
            }}>
              <File size={16} color="#d0bcff" />
              <div>
                <p style={{ margin: 0, color: "#d0bcff", fontWeight: 600, fontSize: 13 }}>{file.name}</p>
                <p style={{ margin: 0, color: "rgba(208,188,255,0.5)", fontSize: 11 }}>{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, display: "flex", alignItems: "flex-start", gap: 10 }}>
              <AlertCircle size={16} color="#f87171" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ color: "#f87171", fontSize: 13 }}>{error}</span>
            </div>
          )}

          {/* Success Result */}
          {result && (
            <div style={{ marginTop: 12, padding: "14px 16px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <CheckCircle size={16} color="#34d399" />
                <span style={{ color: "#34d399", fontWeight: 700, fontSize: 14 }}>Upload Successful</span>
              </div>
              <div style={{ display: "flex", gap: 20 }}>
                <div>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Created</div>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: 20 }}>{result.records_created}</div>
                </div>
                <div>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Updated</div>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: 20 }}>{result.records_updated}</div>
                </div>
              </div>
              {result.errors?.length > 0 && (
                <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(239,68,68,0.08)", borderRadius: 8 }}>
                  <p style={{ margin: "0 0 4px", color: "rgba(248,113,113,0.8)", fontSize: 12, fontWeight: 700 }}>{result.errors.length} row error(s):</p>
                  {result.errors.slice(0, 3).map((e, i) => (
                    <p key={i} style={{ margin: 0, color: "rgba(248,113,113,0.6)", fontSize: 11 }}>{e}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
            <button
              id="upload-btn"
              onClick={handleUpload}
              disabled={loading || !file}
              style={{
                background: "linear-gradient(135deg, #06b6d4, #8b5cf6)",
                border: "none", borderRadius: 10, padding: "12px 20px",
                color: "#fff", fontWeight: 700, fontSize: 14, cursor: (loading || !file) ? "not-allowed" : "pointer",
                opacity: (loading || !file) ? 0.5 : 1,
                boxShadow: (!loading && file) ? "0 0 20px rgba(6,182,212,0.3)" : "none",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "all 0.2s"
              }}
            >
              {loading ? <Loader size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Upload size={16} />}
              {loading ? "Uploading..." : "Upload File"}
            </button>

            <button
              id="download-template-btn"
              onClick={handleDownloadTemplate}
              disabled={loading}
              style={{
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10, padding: "12px 20px",
                color: "rgba(255,255,255,0.8)", fontWeight: 600, fontSize: 14,
                cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.5 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "all 0.2s"
              }}
            >
              {loading ? <Loader size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Download size={16} />}
              Download Template
            </button>
          </div>
        </div>

        {/* Example preview row */}
        <div style={{
          background: "rgba(15,21,37,0.5)", border: "1px solid #1e2940",
          borderRadius: 12, padding: "16px 20px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <Hash size={13} color="rgba(255,255,255,0.3)" />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Example Data Row
            </span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", fontSize: 12, whiteSpace: "nowrap" }}>
              <thead>
                <tr>
                  {["Date", "Tower", "Tenant", "TotalKilowattsProduced", "FuelExpense", "OperationExpense"].map(h => (
                    <th key={h} style={{ padding: "5px 14px", color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase", fontSize: 10, letterSpacing: "0.08em", borderBottom: "1px solid rgba(255,255,255,0.07)", textAlign: "right", ...(h === "Date" || h === "Tower" ? { textAlign: "left" } : {}) }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["2026-04-17", "TLN-KHI-01", "Tenant A", "5,200", "15,000", "12,000"],
                  ["2026-04-17", "TLN-KHI-01", "Tenant B", "4,800", "12,000", "10,000"],
                  ["2026-04-18", "TLN-LHR-02", "Tenant A", "5,500", "16,000", "11,000"],
                ].map((row, i) => (
                  <tr key={i} style={{ background: i % 2 !== 0 ? "rgba(255,255,255,0.02)" : "transparent" }}>
                    {row.map((cell, j) => (
                      <td key={j} style={{ padding: "6px 14px", color: j < 2 ? "#4cd7f6" : "rgba(255,255,255,0.7)", textAlign: j < 2 ? "left" : "right" }}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default ExcelUpload;