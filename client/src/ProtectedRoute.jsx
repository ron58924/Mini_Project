import React from "react";
import { Navigate } from "react-router-dom";

function ProtectedRoute({ children, requiredScreenCode }) {
  const user = JSON.parse(localStorage.getItem("user") || "null");

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // หากมีการระบุหน้าจอที่ต้องการสิทธิ์เข้าถึง
  if (requiredScreenCode) {
    // สมมติว่าตอน Login Backend ส่ง Array ของ screen_code มาให้เก็บไว้ใน user.allowedScreens
    const allowedScreens = user.allowedScreens || [];
    const hasPermission = allowedScreens.includes(requiredScreenCode);

    if (!hasPermission) {
      return <Navigate to="/" replace />; // หรือเปลี่ยนเป็นหน้า /unauthorized
    }
  }

  return children;
}

export default ProtectedRoute;