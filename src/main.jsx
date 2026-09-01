import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import AdminDashboard from "./AdminDashboard";
import "./App.css";

function Root() {
  const isAdminRoute = window.location.pathname.replace(/\/$/, "") === "/admin";

  if (isAdminRoute) {
    return <AdminDashboard onClose={() => { window.location.href = "/"; }} />;
  }

  return <App />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
