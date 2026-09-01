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
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("credentials");
  const [loading, setLoading] = useState(false);
  const [otpPurpose, setOtpPurpose] = useState("signup");
  const isSignup = mode === "signup";

  async function verifyPhone(cleanPhone) {
    if (!/^\d{6}$/.test(otp)) {
      throw new Error("Enter the 6-digit verification code sent to your phone.");
    }

    const { data, error } = await supabase.auth.verifyOtp({
      phone: cleanPhone,
      token: otp,
      type: "sms",
    });

    if (error) throw error;
    if (!data.user || !data.session) {
      throw new Error("Phone verification was not completed. Please try again.");
    }

    onSuccess(data.user, false, data.session);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const cleanPhone = normalizePhone(phone);
      if (!/^\+[1-9]\d{7,14}$/.test(cleanPhone)) {
        throw new Error("Enter a valid phone number, for example 08012345678.");
      }

      if (step === "verify") {
        await verifyPhone(cleanPhone);
        return;
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

        if (!data.session) {
          setOtpPurpose("signup");
          setStep("verify");
          return;
        }

        onSuccess(data.user, false, data.session);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        phone: cleanPhone,
        password,
      });

      if (error) {
        const lower = String(error.message || "").toLowerCase();

        if (lower.includes("phone not confirmed")) {
          const { error: otpError } = await supabase.auth.signInWithOtp({
            phone: cleanPhone,
          });

          if (otpError) throw otpError;
          setOtpPurpose("login");
          setStep("verify");
          return;
        }

        throw error;
      }

      if (!data.user || !data.session) {
        throw new Error("Login was not completed. Please try again.");
      }

      onSuccess(data.user, false, data.session);
    } catch (error) {
      console.error("Phone authentication error:", error);
      let message = error?.message || "Something went wrong. Please try again.";
      const lower = message.toLowerCase();

      if (lower.includes("invalid login credentials")) {
        message = "Incorrect phone number or password.";
      } else if (lower.includes("phone_provider_disabled") || lower.includes("phone and password")) {
        message = "Phone signup/login is disabled in Supabase. Enable the Phone provider for the BayLINK Affiliates project.";
      } else if (lower.includes("sms") && lower.includes("provider")) {
        message = "Phone verification needs an SMS provider configured in Supabase before codes can be sent.";
      }

      onError(message);
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    if (loading) return;
    setLoading(true);

    try {
      const cleanPhone = normalizePhone(phone);
      const { error } = await supabase.auth.signInWithOtp({ phone: cleanPhone });
      if (error) throw error;
      onError("A new verification code has been sent to your phone.");
    } catch (error) {
      onError(error?.message || "Unable to resend the verification code.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <button className="modal-close" onClick={onClose} aria-label="Close" type="button">×</button>

        <span className="label">{step === "verify" ? "VERIFY PHONE" : isSignup ? "JOIN BAYLINK" : "WELCOME BACK"}</span>

        <h2>
          {step === "verify"
            ? "Verify your phone number"
            : isSignup
              ? "Create your BayLINK account"
              : "Log in to BayLINK"}
        </h2>

        <p>
          {step === "verify"
            ? `Enter the 6-digit code sent to ${phone}.`
            : isSignup
              ? "Use your phone number and password to join BayLINK."
              : "Use your phone number and password to access your account."}
        </p>

        {step === "verify" ? (
          <form className="form-card modal-form" onSubmit={handleSubmit}>
            <label>
              Verification code *
              <input
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                autoComplete="one-time-code"
                required
                autoFocus
              />
            </label>

            <button className="primary" type="submit" disabled={loading || otp.length !== 6}>
              {loading ? "Verifying..." : "Verify phone"}
            </button>

            <button className="secondary" type="button" onClick={resendCode} disabled={loading}>
              Resend code
            </button>
          </form>
        ) : (
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
                minLength="6"
                required
                autoComplete={isSignup ? "new-password" : "current-password"}
              />
            </label>

            <button className="primary" type="submit" disabled={loading}>
              {loading ? "Please wait..." : isSignup ? "Create account" : "Log in"}
            </button>
          </form>
        )}

        <div className="modal-switch">
          {step === "verify" ? (
            <button onClick={() => setStep("credentials")} type="button">
              ← Back
            </button>
          ) : (
            <>
              {isSignup ? "Already have an account?" : "Don't have an account?"}
              <button onClick={onSwitch} type="button">
                {isSignup ? " Log in" : " Create one"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
