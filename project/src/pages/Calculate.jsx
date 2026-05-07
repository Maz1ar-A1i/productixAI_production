import React, { useState } from 'react';
import Select from 'react-select';
import { Calculator, Plus, AlertCircle, CheckCircle, Trash2, TrendingUp, ArrowRight, BarChart3, Target, Lightbulb, AlertTriangle } from 'lucide-react';
import { productivityService } from '../services/api';

export const inputOptions = [
  { value: "Electricity Consumption", label: "Electricity Consumption" },
  { value: "Fuel Consumption", label: "Fuel Consumption" },
  { value: "Compressed Air Usage", label: "Compressed Air Usage" },
  { value: "Natural Gas Usage", label: "Natural Gas Usage" },
  { value: "Steam Consumption", label: "Steam Consumption" },
  { value: "Direct Labor Hours", label: "Direct Labor Hours" },
  { value: "Indirect Labor Hours", label: "Indirect Labor Hours" },
  { value: "Shift Hours", label: "Shift Hours" },
  { value: "Overtime Hours", label: "Overtime Hours" },
  { value: "Training Hours", label: "Training Hours" },
  { value: "Raw Material A Quantity", label: "Raw Material A Quantity" },
  { value: "Raw Material B Quantity", label: "Raw Material B Quantity" },
  { value: "Fabric Used", label: "Fabric Used" },
  { value: "Plastic Granules Used", label: "Plastic Granules Used" },
  { value: "Steel Used", label: "Steel Used" },
  { value: "Machine A Operating Time", label: "Machine A Operating Time" },
  { value: "Machine B Downtime", label: "Machine B Downtime" },
  { value: "Total Machine Uptime", label: "Total Machine Uptime" },
  { value: "Maintenance Time", label: "Maintenance Time" },
  { value: "Tool Change Time", label: "Tool Change Time" },
  { value: "Administrative Expenses", label: "Administrative Expenses" },
  { value: "Software Subscriptions", label: "Software Subscriptions" },
  { value: "Telephone/Internet Bills", label: "Telephone/Internet Bills" },
  { value: "Stationery Usage", label: "Stationery Usage" },
  { value: "Cafeteria Cost", label: "Cafeteria Cost" },
  { value: "Total Salaries", label: "Total Salaries" },
  { value: "Manager Salaries", label: "Manager Salaries" },
  { value: "Worker Wages", label: "Worker Wages" },
  { value: "Bonus Payments", label: "Bonus Payments" },
  { value: "Wage Advances", label: "Wage Advances" },
  { value: "Transport Fuel Cost", label: "Transport Fuel Cost" },
  { value: "Truck Usage", label: "Truck Usage" },
  { value: "Freight Charges", label: "Freight Charges" },
  { value: "Inbound Material Weight", label: "Inbound Material Weight" },
  { value: "Outbound Product Weight", label: "Outbound Product Weight" },
  { value: "Cartons Used", label: "Cartons Used" },
  { value: "Labels Used", label: "Labels Used" },
  { value: "Shrink Wrap Used", label: "Shrink Wrap Used" },
  { value: "Packaging Tape Used", label: "Packaging Tape Used" },
  { value: "Pallets Used", label: "Pallets Used" },
  { value: "Test Samples Taken", label: "Test Samples Taken" },
  { value: "Rejected Items", label: "Rejected Items" },
  { value: "QC Labor Hours", label: "QC Labor Hours" },
  { value: "QC Equipment Used", label: "QC Equipment Used" },
  { value: "Lab Chemicals Used", label: "Lab Chemicals Used" },
  { value: "Gloves Used", label: "Gloves Used" },
  { value: "Helmets Issued", label: "Helmets Issued" },
  { value: "Fire Drills Conducted", label: "Fire Drills Conducted" },
  { value: "First Aid Usage", label: "First Aid Usage" },
  { value: "Safety Audits", label: "Safety Audits" },
  { value: "Waste Generated", label: "Waste Generated" },
  { value: "Waste Recycled", label: "Waste Recycled" },
  { value: "Water Used", label: "Water Used" },
  { value: "Waste Water Treated", label: "Waste Water Treated" },
  { value: "Carbon Emissions", label: "Carbon Emissions" },
  { value: "Opening Raw Material Stock", label: "Opening Raw Material Stock" },
  { value: "Closing Raw Material Stock", label: "Closing Raw Material Stock" },
  { value: "Spare Parts Used", label: "Spare Parts Used" },
  { value: "Inventory Turnover Rate", label: "Inventory Turnover Rate" },
  { value: "Damaged Inventory", label: "Damaged Inventory" },
  { value: "Purchase Orders Issued", label: "Purchase Orders Issued" },
  { value: "Suppliers Contacted", label: "Suppliers Contacted" },
  { value: "Material Lead Time", label: "Material Lead Time" },
  { value: "Discounts Received", label: "Discounts Received" },
  { value: "Delayed Deliveries", label: "Delayed Deliveries" },
  { value: "Lighting Electricity Use", label: "Lighting Electricity Use" },
  { value: "Cooling System Electricity Use", label: "Cooling System Electricity Use" },
  { value: "Boiler Fuel Use", label: "Boiler Fuel Use" },
  { value: "Elevator Energy Use", label: "Elevator Energy Use" },
  { value: "CCTV Power Consumption", label: "CCTV Power Consumption" },
  { value: "Forklift Operating Hours", label: "Forklift Operating Hours" },
  { value: "Employee Attendance", label: "Employee Attendance" },
  { value: "Product Returns", label: "Product Returns" },
  { value: "Customer Complaints", label: "Customer Complaints" },
  { value: "IT Downtime", label: "IT Downtime" },
];

const outputOptions = [
  { value: "Total Units Produced", label: "Total Units Produced" },
  { value: "Good Units Produced", label: "Good Units Produced" },
  { value: "Rejected Units", label: "Rejected Units" },
  { value: "Production Rate", label: "Production Rate" },
  { value: "Yield Rate", label: "Yield Rate" },
  { value: "Scrap Rate", label: "Scrap Rate" },
  { value: "Downtime Hours", label: "Downtime Hours" },
  { value: "Machine Utilization Rate", label: "Machine Utilization Rate" },
  { value: "Labor Productivity", label: "Labor Productivity" },
  { value: "Energy Consumption per Unit", label: "Energy Consumption per Unit" },
  { value: "Cost per Unit", label: "Cost per Unit" },
  { value: "Sales Revenue", label: "Sales Revenue" },
  { value: "On-Time Delivery Rate", label: "On-Time Delivery Rate" },
  { value: "Defect Density", label: "Defect Density" },
  { value: "Customer Returns", label: "Customer Returns" },
  { value: "Carbon Emission per Unit", label: "Carbon Emission per Unit" },
  { value: "Inventory Turnover", label: "Inventory Turnover" },
  { value: "First Pass Yield (FPY)", label: "First Pass Yield (FPY)" },
  { value: "Throughput", label: "Throughput" },
  { value: "Order Fulfillment Rate", label: "Order Fulfillment Rate" },
  { value: "Employee Attendance Rate", label: "Employee Attendance Rate" },
  { value: "Overall Equipment Effectiveness (OEE)", label: "Overall Equipment Effectiveness (OEE)" },
  { value: "Maintenance Response Time", label: "Maintenance Response Time" },
  { value: "Safety Compliance Score", label: "Safety Compliance Score" },
];

const customSelectStyles = {
  control: (provided, state) => ({
    ...provided,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: state.isFocused ? 'rgba(168, 85, 247, 0.5)' : 'rgba(255, 255, 255, 0.1)',
    borderRadius: '0.5rem',
    minHeight: '42px',
    boxShadow: state.isFocused ? '0 0 0 1px rgba(168, 85, 247, 0.5)' : 'none',
    '&:hover': {
      borderColor: 'rgba(168, 85, 247, 0.5)',
    },
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  }),
  singleValue: (provided) => ({
    ...provided,
    color: 'white',
    fontSize: '0.875rem',
  }),
  placeholder: (provided) => ({
    ...provided,
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: '0.875rem',
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: 'rgb(15, 23, 42)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '0.75rem',
    overflow: 'hidden',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
    zIndex: 9999,
  }),
  menuPortal: (provided) => ({
    ...provided,
    zIndex: 9999,
  }),
  menuList: (provided) => ({
    ...provided,
    padding: '0.5rem',
    maxHeight: '250px',
    '::-webkit-scrollbar': {
      width: '6px',
    },
    '::-webkit-scrollbar-track': {
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '10px',
    },
    '::-webkit-scrollbar-thumb': {
      background: 'rgba(168, 85, 247, 0.4)',
      borderRadius: '10px',
    },
    '::-webkit-scrollbar-thumb:hover': {
      background: 'rgba(168, 85, 247, 0.6)',
    },
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isFocused 
      ? 'rgba(168, 85, 247, 0.2)' 
      : 'transparent',
    color: state.isFocused ? 'white' : 'rgba(255, 255, 255, 0.7)',
    cursor: 'pointer',
    borderRadius: '0.5rem',
    padding: '0.625rem 0.75rem',
    fontSize: '0.875rem',
    transition: 'all 0.2s ease',
    '&:active': {
      backgroundColor: 'rgba(168, 85, 247, 0.3)',
    },
  }),
  input: (provided) => ({
    ...provided,
    color: 'white',
  }),
};

const Calculate = () => {
  const [inputs, setInputs] = useState([{ key: "", value: "" }]);
  const [outputs, setOutputs] = useState([{ key: "", value: "" }]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState('calculator');

  const addInput = () => setInputs([...inputs, { key: "", value: "" }]);
  const removeInput = (index) => setInputs(inputs.filter((_, i) => i !== index));
  const updateInput = (index, field, value) => {
    const newInputs = [...inputs];
    newInputs[index][field] = value;
    setInputs(newInputs);
  };

  const addOutput = () => setOutputs([...outputs, { key: "", value: "" }]);
  const removeOutput = (index) => setOutputs(outputs.filter((_, i) => i !== index));
  const updateOutput = (index, field, value) => {
    const newOutputs = [...outputs];
    newOutputs[index][field] = value;
    setOutputs(newOutputs);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Convert to dictionary format
      const formattedInputs = {};
      inputs.forEach(item => {
        if (item.key && item.value !== "") {
          formattedInputs[item.key] = Number(item.value);
        }
      });

      const formattedOutputs = {};
      outputs.forEach(item => {
        if (item.key && item.value !== "") {
          formattedOutputs[item.key] = Number(item.value);
        }
      });

      if (Object.keys(formattedInputs).length === 0 || Object.keys(formattedOutputs).length === 0) {
        setError("Please provide at least one valid input and one valid output.");
        setLoading(false);
        return;
      }

      const data = { inputs: formattedInputs, outputs: formattedOutputs };
      console.log("Sending payload:", data);

      const result = await productivityService.calculate(data);
      setResults(result);
      setActiveTab('results');
    } catch (err) {
      console.error("Calculation error:", err);
      if (err.code === "ERR_NETWORK") {
        setError("Unable to connect to the server. Please ensure the backend is running on http://127.0.0.1:8000");
      } else {
        setError(err.response?.data?.message || "Calculation failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 rounded-lg">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent flex items-center gap-3">
            <Calculator className="w-10 h-10 text-purple-400" />
            Productivity Calculator & Analyzer
          </h1>
          <p className="text-white/40 text-sm">Enter your inputs and outputs to calculate productivity metrics with AI analysis</p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6 bg-white/5 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('calculator')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-300 ${
              activeTab === 'calculator'
                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                : 'text-white/60 hover:text-white/80 hover:bg-white/5'
            }`}
          >
            <Calculator className="w-4 h-4 inline mr-2" />
            Calculator
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-300 ${
              activeTab === 'results'
                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                : 'text-white/60 hover:text-white/80 hover:bg-white/5'
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            Results & Analysis
          </button>
        </div>

        {activeTab === 'calculator' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Section */}
            <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/10 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <ArrowRight className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">Inputs</h3>
                </div>
                <button
                  type="button"
                  onClick={addInput}
                  className="group p-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 hover:border-purple-500/40 rounded-lg transition-all duration-300 hover:scale-110"
                  title="Add input field"
                >
                  <Plus className="w-5 h-5 text-purple-400" />
                </button>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {inputs.map((input, index) => (
                  <div key={index} className="group relative bg-white/5 rounded-xl p-3 border border-white/10 hover:border-purple-500/30 transition-all duration-300">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Select
                          options={inputOptions}
                          value={inputOptions.find(opt => opt.value === input.key) || null}
                          onChange={(selected) => updateInput(index, "key", selected?.value || "")}
                          styles={customSelectStyles}
                          placeholder="Select input type..."
                          isClearable
                          menuPortalTarget={document.body}
                          menuPosition="fixed"
                        />
                      </div>
                      
                      <input
                        type="number"
                        value={input.value}
                        onChange={(e) => updateInput(index, "value", e.target.value)}
                        className="w-32 bg-white/10 border border-white/10 rounded-lg py-2.5 px-3 text-white text-sm focus:outline-none focus:border-purple-500/50 focus:bg-white/15 transition-all duration-300"
                        placeholder="Value"
                      />

                      {inputs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeInput(index)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Output Section */}
            <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/10 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">Outputs</h3>
                </div>
                <button
                  type="button"
                  onClick={addOutput}
                  className="group p-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 hover:border-purple-500/40 rounded-lg transition-all duration-300 hover:scale-110"
                  title="Add output field"
                >
                  <Plus className="w-5 h-5 text-purple-400" />
                </button>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {outputs.map((output, index) => (
                  <div key={index} className="group relative bg-white/5 rounded-xl p-3 border border-white/10 hover:border-emerald-500/30 transition-all duration-300">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Select
                          options={outputOptions}
                          value={outputOptions.find(opt => opt.value === output.key) || null}
                          onChange={(selected) => updateOutput(index, "key", selected?.value || "")}
                          styles={customSelectStyles}
                          placeholder="Select output type..."
                          isClearable
                          menuPortalTarget={document.body}
                          menuPosition="fixed"
                        />
                      </div>
                      
                      <input
                        type="number"
                        value={output.value}
                        onChange={(e) => updateOutput(index, "value", e.target.value)}
                        className="w-32 bg-white/10 border border-white/10 rounded-lg py-2.5 px-3 text-white text-sm focus:outline-none focus:border-emerald-500/50 focus:bg-white/15 transition-all duration-300"
                        placeholder="Value"
                      />

                      {outputs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeOutput(index)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 animate-in fade-in duration-300">
            <AlertCircle className="text-red-400 flex-shrink-0" size={20} />
            <span className="text-red-400 text-sm">{error}</span>
          </div>
        )}

        {/* Calculate Button */}
        {activeTab === 'calculator' && (
          <div className="mt-6">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full group relative px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Calculating & Analyzing...
                </>
              ) : (
                <>
                  <Calculator className="w-5 h-5" />
                  Calculate & Analyze
                </>
              )}
            </button>
          </div>
        )}

        {/* Results Section */}
        {activeTab === 'results' && results && (
          <div className="space-y-6">
            {/* Productivity Results */}
            <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/10 p-6">
              <h3 className="text-2xl font-semibold text-white mb-6 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <TrendingUp className="w-6 h-6 text-purple-400" />
                </div>
                Productivity Results
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Combined Productivity */}
                <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-6 hover:border-purple-500/40 transition-all duration-300">
                  <h4 className="text-white/60 text-sm font-medium mb-2">Combined Productivity</h4>
                  <p className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    {results.combined_productivity || "N/A"}
                  </p>
                </div>

                {/* Single Productivity */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-white/20 transition-all duration-300">
                  <h4 className="text-white/60 text-sm font-medium mb-3">Single Productivity</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                    {results.single_productivity && Object.keys(results.single_productivity).length > 0
                      ? Object.entries(results.single_productivity).map(([k, v], i) => (
                        <div key={i} className="flex justify-between items-center text-sm">
                          <span className="text-white/70">{k}</span>
                          <span className="text-white font-semibold">{v}</span>
                        </div>
                      ))
                      : <p className="text-white/40 text-sm italic">No data available</p>}
                  </div>
                </div>

                {/* Processed Inputs */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-white/20 transition-all duration-300">
                  <h4 className="text-white/60 text-sm font-medium mb-3">Processed Inputs</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                    {results.processed_inputs && Object.keys(results.processed_inputs).length > 0
                      ? Object.entries(results.processed_inputs).map(([k, v], i) => (
                        <div key={i} className="flex justify-between items-center text-sm">
                          <span className="text-white/70 text-xs">{k}</span>
                          <span className="text-blue-400 font-semibold">{v}</span>
                        </div>
                      ))
                      : <p className="text-white/40 text-sm italic">No data available</p>}
                  </div>
                </div>

                {/* Processed Outputs */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-white/20 transition-all duration-300">
                  <h4 className="text-white/60 text-sm font-medium mb-3">Processed Outputs</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                    {results.processed_outputs && Object.keys(results.processed_outputs).length > 0
                      ? Object.entries(results.processed_outputs).map(([k, v], i) => (
                        <div key={i} className="flex justify-between items-center text-sm">
                          <span className="text-white/70 text-xs">{k}</span>
                          <span className="text-emerald-400 font-semibold">{v}</span>
                        </div>
                      ))
                      : <p className="text-white/40 text-sm italic">No data available</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* AI Analysis Results */}
            <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/10 p-6">
              <h3 className="text-2xl font-semibold text-white mb-6 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Target className="w-6 h-6 text-purple-400" />
                </div>
                AI Analysis Results
              </h3>

              <div className="space-y-4">
                {/* Efficiency Score */}
                <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-6 hover:border-green-500/40 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-3">
                    <TrendingUp className="text-green-400" size={24} />
                    <h4 className="text-white font-semibold text-lg">Efficiency Score</h4>
                  </div>
                  <p className="text-5xl font-bold text-green-400 mb-2">
                    {results.efficiency_score || "N/A"}
                  </p>
                  <p className="text-green-400/70 text-sm">AI-powered efficiency assessment</p>
                </div>

                {/* Secondary Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* AI Prediction */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all duration-300">
                    <div className="flex items-center gap-2 mb-3">
                      <BarChart3 className="text-blue-400" size={20} />
                      <h4 className="text-white font-medium">AI Prediction</h4>
                    </div>
                    <p className="text-white/70 text-sm leading-relaxed">{results.ai_prediction || "No prediction available"}</p>
                  </div>

                  {/* Top Inefficiencies */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all duration-300">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="text-yellow-400" size={20} />
                      <h4 className="text-white font-medium">Top Inefficiencies</h4>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                      {results.top_inefficiencies ? (
                        results.top_inefficiencies.split("\n").map((ineff, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="text-yellow-400 text-sm mt-0.5">•</span>
                            <p className="text-white/70 text-sm">{ineff}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-white/40 text-sm italic">No inefficiencies detected</p>
                      )}
                    </div>
                  </div>

                  {/* AI Prescriptions */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all duration-300">
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="text-blue-400" size={20} />
                      <h4 className="text-white font-medium">AI Prescriptions</h4>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                      {results.ai_prescriptions ? (
                        results.ai_prescriptions.split("\n").map((presc, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="text-blue-400 text-sm mt-0.5">•</span>
                            <p className="text-white/70 text-sm">{presc}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-white/40 text-sm italic">No prescriptions available</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'results' && !results && (
          <div className="text-center py-16 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/10">
            <Calculator className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/40">Enter your inputs and outputs, then click calculate to see results</p>
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(168, 85, 247, 0.4);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(168, 85, 247, 0.6);
        }
      `}</style>
    </div>
  );
};

export default Calculate;