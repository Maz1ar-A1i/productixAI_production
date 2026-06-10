import React, { useContext, useState } from "react";
import { LicenseContext } from "../App";
import api from "../services/api";
import { WifiOff, RefreshCw, AlertTriangle } from "lucide-react";

const OfflineBanner = () => {
  const { licenseStatus, refreshLicense } = useContext(LicenseContext);
  const [verifying, setVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!licenseStatus || licenseStatus.reason !== "OFFLINE_GRACE") {
    return null;
  }

  const handleReconnect = async () => {
    setVerifying(true);
    setErrorMsg("");
    try {
      // Pinging local endpoint which will attempt to validate online and update cache
      const response = await api.post("/api/license/register-local", {
        licenseKey: licenseStatus.licenseKey
      });
      
      if (response.data.valid && response.data.reason === "ACTIVE") {
        // Success, back online!
        refreshLicense();
      } else {
        // Still offline or returned another status
        if (response.data.reason === "OFFLINE_GRACE" || response.data.reason === "OFFLINE_TIMEOUT") {
          setErrorMsg("Central registry remains unreachable. Checking local grace...");
        } else {
          // If revoked/expired/suspended, refreshLicense will show LockScreen
          refreshLicense();
        }
      }
    } catch (err) {
      setErrorMsg("Central license server is still unreachable. Please verify internet connection.");
    } finally {
      setVerifying(false);
      // Automatically clear error message after 4 seconds
      setTimeout(() => setErrorMsg(""), 4000);
    }
  };

  // Format hours left beautifully
  const hoursLeft = licenseStatus.hoursLeft !== undefined ? Number(licenseStatus.hoursLeft) : 24.0;
  const displayHours = hoursLeft.toFixed(1);

  return (
    <div className="w-full px-6 pt-4 pb-2 animate-fade-in">
      <div 
        className="w-full p-4 backdrop-blur-md bg-amber-500/10 border border-amber-500/20 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-amber-500/5 relative overflow-hidden"
      >
        {/* Glow Accent */}
        <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
        
        <div className="flex items-center gap-3.5 text-left">
          <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
            <WifiOff size={18} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              Offline Workspace Active
              <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-400 rounded-full uppercase tracking-wider">
                Grace Mode
              </span>
            </h4>
            <p className="text-xs text-zinc-400 mt-0.5 font-medium">
              Productix is running in offline fallback. You have <strong className="text-amber-400 font-semibold">{displayHours} hours</strong> of offline access remaining before central verification is required.
            </p>
            {errorMsg && (
              <p className="text-[10px] text-red-400 font-semibold mt-1 flex items-center gap-1">
                <AlertTriangle size={10} />
                {errorMsg}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={handleReconnect}
          disabled={verifying}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-black text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md hover:shadow-amber-500/20 disabled:opacity-50"
        >
          {verifying ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              <span>Verifying Connection...</span>
            </>
          ) : (
            <>
              <RefreshCw size={14} />
              <span>Verify Central Registry</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default OfflineBanner;
