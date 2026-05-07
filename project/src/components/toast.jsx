// components/Toast.js
import React, { useEffect } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";

const Toast = ({ type = "success", message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 left-6 z-50 animate-slide-up">
      <div
        className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border
          ${type === "success" 
            ? "bg-green-500/90 border-green-400 text-white"
            : "bg-red-500/90 border-red-400 text-white"}
        `}
      >
        {type === "success" ? (
          <CheckCircle2 className="w-5 h-5" />
        ) : (
          <AlertCircle className="w-5 h-5" />
        )}
        <span className="font-medium">{message}</span>
      </div>
    </div>
  );
};

export default Toast;
