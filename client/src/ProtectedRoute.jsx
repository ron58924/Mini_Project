import React from "react";
import { Navigate } from "react-router-dom";

function ProtectedRoute({ children, requiredPermIndex }) {
  const user = JSON.parse(localStorage.getItem("user") || "null");

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPermIndex !== undefined) {
    const permission = user.permission || "0000";
    const hasPermission = permission[requiredPermIndex] === "1";

    if (!hasPermission) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}

export default ProtectedRoute;
