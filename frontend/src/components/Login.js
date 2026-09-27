import React, { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useUI } from "../context/UIContext";
import { BrandMark } from "./BrandMark";
import LangToggle from "./LangToggle";
import ThemeToggle from "./ThemeToggle";

export default function Login() {
  const { user, login, loading } = useAuth();
  const { lang } = useUI();
  const en = lang === "en";
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Wave 1 pilot: Anclora Identity SSO, fail-closed behind a build-time flag.
  // When unset, this renders nothing and the existing whitelist/password
  // login is the only path — same as before this pilot.
  const anclora_identity_enabled =
    String(process.env.REACT_APP_ANCLORA_IDENTITY_ENABLED || "").toLowerCase() === "true";
  const backend_url = process.env.REACT_APP_BACKEND_URL || "";

  // If already authenticated, redirect to workspace
  if (!loading && user) {
    return <Navigate to="/app" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(email.trim().toLowerCase(), password);
      navigate("/app");
    } catch (err) {
      // Keep credential failures generic, but distinguish them from an
      // unreachable API so local/deployed configuration errors are actionable.
      if (!err.response) {
        setError(
          en
            ? "Unable to connect to the CleanSheet API. Check that the backend is running."
            : "No se puede conectar con la API de CleanSheet. Comprueba que el backend esté activo."
        );
      } else {
        setError(
          en
            ? "Invalid email or password. Please verify your credentials."
            : "Credenciales incorrectas. Comprueba tu correo y contraseña."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-shell">
      {/* Top Controls */}
      <div className="auth-top">
        <Link to="/" className="auth-back">
          <ArrowLeft size={15} />
          <span>{en ? "Back to site" : "Volver al sitio"}</span>
        </Link>
        <div className="flex items-center gap-2">
          <LangToggle />
          <ThemeToggle />
        </div>
      </div>

      <div className="auth-glow auth-glow-one" />
      <div className="auth-glow auth-glow-two" />

      {/* Login Card */}
      <section className="auth-card">
        <div className="auth-card-header">
          <BrandMark className="auth-logo rounded-full" />
          <div className="auth-divider" />
          <p className="tracking-tight text-base font-bold">
            Anclora <span className="text-[#38BDF8]">CleanSheet</span>
          </p>
          <span className="text-xs text-slate-400 mt-1 block">
            {en ? "Workspace Access" : "Acceso al Workspace"}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {/* Email */}
          <label htmlFor="login-email">{en ? "Work Email" : "Correo electrónico"}</label>
          <input
            id="login-email"
            data-testid="login-email-input"
            type="email"
            autoComplete="email"
            required
            aria-required="true"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            disabled={submitting}
          />

          {/* Password */}
          <label htmlFor="login-password">{en ? "Password" : "Contraseña"}</label>
          <div className="auth-password">
            <input
              id="login-password"
              data-testid="login-password-input"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              aria-required="true"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
            />
            <button
              type="button"
              data-testid="login-password-toggle"
              aria-label={showPassword ? (en ? "Hide password" : "Ocultar contraseña") : (en ? "Show password" : "Mostrar contraseña")}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div role="alert" data-testid="login-error" className="auth-error">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            data-testid="login-submit-button"
            className="auth-submit cursor-pointer"
            disabled={submitting || !email || !password}
          >
            {submitting ? (en ? "Signing in..." : "Iniciando sesión...") : (en ? "Sign in" : "Iniciar sesión")}
          </button>

          {anclora_identity_enabled && (
            <div className="mt-3 flex flex-col gap-2">
              <div className="relative my-1 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-700/40" />
                </div>
                <span className="relative bg-[#0F172A] dark:bg-[#0F172A] light:bg-white px-2 text-[11px] text-slate-500 uppercase tracking-wider font-mono">
                  {en ? "Or continue with" : "O continuar con"}
                </span>
              </div>
              <a
                href={`${backend_url}/api/auth/anclora-identity/login`}
                data-testid="anclora-identity-login-link"
                className="flex items-center justify-center gap-2 h-[42px] rounded-[10px] border border-[#38BDF8]/60 bg-[#38BDF8]/10 text-[#38BDF8] text-xs font-medium hover:bg-[#38BDF8]/20"
              >
                <ShieldCheck size={15} />
                <span>{en ? "Continue with Anclora Identity" : "Continuar con Anclora Identity"}</span>
              </a>
            </div>
          )}

          {/* Whitelist / Invitation Link */}
          <div className="auth-invite mt-3 flex items-center justify-between">
            <span className="text-slate-400">
              {en ? "Access is by invitation only." : "Acceso exclusivo por invitación."}
            </span>
            <Link
              to="/activate"
              className="font-bold text-[#38BDF8] hover:underline"
            >
              <span>{en ? "Activate access" : "Activar acceso"}</span>
            </Link>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck size={13} className="text-[#38BDF8]" />
            <span>{en ? "Secure Argon2 & JWT authentication" : "Autenticación segura con Argon2 y JWT"}</span>
          </div>
        </form>
      </section>
    </main>
  );
}
