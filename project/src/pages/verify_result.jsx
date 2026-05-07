import React from "react";
import { useLocation } from "react-router-dom";

export default function VerifyResult() {
  const query = new URLSearchParams(useLocation().search);
  const status = query.get("status");

  return (
    <div style={{ textAlign: "center", marginTop: "100px" }}>
      {status === "success" && <h2 style={{ color: "green" }}>🎉 Your email has been verified!</h2>}
      {status === "already_verified" && <h2 style={{ color: "orange" }}>✅ Your email is already verified.</h2>}
      {!status && <h2 style={{ color: "red" }}>❌ Invalid or expired link.</h2>}
    </div>
  );
}
