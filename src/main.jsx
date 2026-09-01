import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import AdminDashboard from "./AdminDashboard";
import PhoneAuthModal from "./PhoneAuthModal";
import "./App.css";

function PhoneAuthController() {
  const [mode, setMode] = useState(null);

  useEffect(() => {
    const onClick = (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      const text = (button.textContent || "").trim().toLowerCase();
      const isLogin = text === "log in" || text.includes("log in to post");
      const isSignup = text === "join baylink" || text.includes("create your profile") || text === "create one";
      if (!isLogin && !isSignup) return;
      event.preventDefault();
      event.stopPropagation();
      setMode(isLogin ? "login" : "signup");
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  if (!mode) return null;
  return (
    <PhoneAuthModal
      mode={mode}
      onClose={() => setMode(null)}
      onSwitch={() => setMode((current) => current === "login" ? "signup" : "login")}
      onError={(text) => window.alert(text)}
      onSuccess={() => {
        setMode(null);
        window.location.reload();
      }}
    />
  );
}

function Root() {
  const isAdminRoute = window.location.pathname.replace(/\/$/, "") === "/admin";
  if (isAdminRoute) return <AdminDashboard onClose={() => { window.location.href = "/"; }} />;
  return <><App /><PhoneAuthController /></>;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode><Root /></React.StrictMode>
);
