import React from "react";
import ReactDOM from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import Home from "./Home";
import Employee from "./Employee";
import Customer from "./Customer";
import Login from "./Login";
import Product from "./Product";
import ProtectedRoute from "./ProtectedRoute";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/employee",
    element: (
      // เปลี่ยนจาก requiredPermIndex={0} เป็น requiredScreenCode
      <ProtectedRoute requiredScreenCode="SCR_EMP">
        <Employee />
      </ProtectedRoute>
    ),
  },
  {
    path: "/customer",
    element: (
      <ProtectedRoute requiredScreenCode="SCR_CUS">
        <Customer />
      </ProtectedRoute>
    ),
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "*",
    element: <Navigate to="/login" replace />,
  },
  {
    path: "/product",
    element: (
      <ProtectedRoute requiredScreenCode="SCR_PROD">
        <Product />
      </ProtectedRoute>
    ),
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);