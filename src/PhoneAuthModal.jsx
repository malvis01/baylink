import { useState } from "react";
import { supabase } from "./lib/supabase";

function normalizePhone(value) {
  const raw = String(value || "").trim().replace(/[\s()-]/g, "");
  if (raw.startsWith("+")) return raw;
  if (raw.startsWith("234")) return `+${raw}`;
  if (raw.startsWith("0")) return `+234${raw.slice(1)}`;
  return `+${raw}`;
}

export default function PhoneAuthModal({ mode, onClose, onSuccess, onSwitch, onError }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const isSignup = mode === "signup";

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const cleanPhone = normalizePhone(phone);

      if (!/^\+[1-9]\d{7,14}$/.test(cleanPhone)) {
        throw new Error("Enter a valid phone number, for example 08012345678.");
      }

      if (password.length < 6) {
        throw new Error("Password must contain at least 6 characters.");
      }

      if (isSignup) {
        if (!fullName.trim()) {
          throw new Error("Please enter your full name.");
        }

        const { data, error } = await supabase.auth.signUp({
          phone: cleanPhone,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              phone: cleanPhone,
            },
          },
        });

        if (error) throw error;
        if (!data.user) throw new Error("The account could not be created.");

        // No OTP/phone-verification step. If Supabase returns a session,
        // the user can enter BayLINK immediately.
        if (data.session) {
          onSuccess(data.user, false, data.session);
          return;
        }

        // This normally means Supabase still requires confirmation.
        // We deliberately do not start an OTP flow here.
        throw new Error(
          "BayLINK account was created, but Supabase did not return a login session. Phone confirmation must be disabled for the no-OTP BayLINK login flow."
        );
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        phone: cleanPhone,
        password,
      });

      if (error) throw error;
      if (!data.user || !data.session) {
        throw new Error("Login was not completed. Please try again.");
      }

      onSuccess(data.user, false, data.session);
    } catch (error) {
      console.error("Phone authentication error:", error);
      const raw = String(error?.message || "Something went wrong. Please try again.");
      const lower = raw.toLowerCase();
      let message = raw;

      if (
        lower.includes("phone_provider_disabled") ||
        lower.includes("phone signups are disabled") ||
        lower.includes("phone provider is disabled")
      ) {
        message = "Phone sign-up is disabled in Supabase. Enable the Phone provider for BayLINK.";
      } else if (lower.includes("invalid login credentials")) {
        message = "Incorrect phone number or password.";
      } else if (lower.includes("phone not confirmed") || lower.includes("confirmation")) {
        message = "Phone confirmation is still enabled in Supabase. BayLINK uses phone number + password without OTP, so phone confirmation must be turned off.";
      }

      onError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <button className="modal-close" onClick={onClose} aria-label="Close" type="button">×</button>
        <span className="label">{isSignup ? "JOIN BAYLINK" : "WELCOME BACK"}</span>
        <h2>{isSignup ? "Create your BayLINK account" : "Log in to BayLINK"}</h2>
        <p>
          {isSignup
            ? "Create your account with your phone number and password. No OTP required."
            : "Use your phone number and password to access your account."}
        </p>

        <form className="form-card modal-form" onSubmit={handleSubmit}>
          {isSignup && (
            <label>
              Full name *
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                required
                autoComplete="name"
              />
            </label>
          )}

          <label>
            Phone number *
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08012345678"
              required
              autoComplete="tel"
            />
          </label>

          <label>
            Password *
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              minLength={6}
              required
              autoComplete={isSignup ? "new-password" : "current-password"}
            />
          </label>

          <button className="primary" type="submit" disabled={loading}>
            {loading ? "Please wait..." : isSignup ? "Create account" : "Log in"}
          </button>
        </form>

        <div className="modal-switch">
          <span>{isSignup ? "Already have an account?" : "Don't have an account?"}</span>
          <button onClick={onSwitch} type="button">
            {isSignup ? " Log in" : " Create one"}
          </button>
        </div>
      </div>
    </div>
  );
}
