import { useState, useEffect } from "react";
import { apiGet, apiPost } from "../lib/api";
import { ThemeProvider, type ThemeMode } from "./ThemeProvider";
import { Toaster } from "./ui/Toaster";
import { useToastStore } from "../lib/stores";
import { useTranslation } from "react-i18next";

interface LoginPageProps {
  onAuth: (token: string, user: Record<string, unknown>) => void;
  theme?: ThemeMode;
}

type AuthMode = "login" | "register";

export function LoginPage({ onAuth, theme = "light" }: LoginPageProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFirstUser, setIsFirstUser] = useState(false);
  const addToast = useToastStore((state) => state.addToast);

  useEffect(() => {
    checkIfFirstUser();
  }, []);

  const checkIfFirstUser = async () => {
    try {
      const res = await apiGet<any>("/api/users");
      if (res && Array.isArray(res.docs) && res.docs.length === 0) {
        setIsFirstUser(true);
        setMode("register");
      }
    } catch {
      // Default to login mode for unauthenticated users
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint =
        mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body: Record<string, string> = { email, password };
      if (mode === "register") {
        body.confirmPassword = confirmPassword;
      }

      const data = await apiPost<any>(endpoint, body);

      if (data.isFirstUser) {
        setIsFirstUser(true);
      }

      localStorage.setItem("kyro_user", JSON.stringify(data.user));
      addToast(
        "success",
        mode === "login" ? t("toast.welcomeBack", { defaultValue: "Welcome back!" }) : t("toast.accountCreated", { defaultValue: "Account created!" }),
      );
      onAuth(data.token, data.user);
    } catch {
      addToast("error", t("toast.connectionFailed", { defaultValue: "Connection failed" }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider defaultMode={theme}>
        <div className="kyro-login-page">
          <div className="kyro-login-container">
            <div className="kyro-login-header">
              <h1 className="kyro-login-title">
                {isFirstUser
                  ? t("login.createAdminAccount", { defaultValue: "Create Admin Account" })
                  : mode === "login"
                    ? t("login.signIn", { defaultValue: "Sign In" })
                    : t("login.createAccount", { defaultValue: "Create Account" })}
              </h1>
              <p className="kyro-login-subtitle">
                {isFirstUser
                  ? t("login.setupAdmin", { defaultValue: "Set up your admin account to get started" })
                  : mode === "login"
                    ? t("login.enterCredentials", { defaultValue: "Enter your credentials to access the admin" })
                    : t("login.createAccountDesc", { defaultValue: "Create an account to access the admin" })}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="kyro-login-form">
              <div className="kyro-form-group">
                <label htmlFor="email">{t("login.email", { defaultValue: "Email" })}</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="kyro-form-group">
                <label htmlFor="password">{t("login.password", { defaultValue: "Password" })}</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                />
              </div>

              {mode === "register" && (
                <div className="kyro-form-group">
                  <label htmlFor="confirmPassword">{t("login.confirmPassword", { defaultValue: "Confirm Password" })}</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
              )}

              <button
                type="submit"
                className="kyro-btn kyro-btn-primary kyro-btn-lg"
                disabled={loading}
              >
                {loading
                  ? mode === "login"
                    ? t("login.signingIn", { defaultValue: "Signing in..." })
                    : t("login.creatingAccount", { defaultValue: "Creating account..." })
                  : mode === "login"
                    ? t("login.signIn", { defaultValue: "Sign In" })
                    : t("login.createAccount", { defaultValue: "Create Account" })}
              </button>
            </form>

            {!isFirstUser && (
              <div className="kyro-login-footer">
                <p>
                  {mode === "login" ? (
                    <>
                      {t("login.noAccount", { defaultValue: "Don't have an account?" })}{" "}
                      <button
                        type="button"
                        className="kyro-login-link"
                        onClick={() => setMode("register")}
                      >
                        {t("login.signUp", { defaultValue: "Sign up" })}
                      </button>
                    </>
                  ) : (
                    <>
                      {t("login.hasAccount", { defaultValue: "Already have an account?" })}{" "}
                      <button
                        type="button"
                        className="kyro-login-link"
                        onClick={() => setMode("login")}
                      >
                        {t("login.signInAction", { defaultValue: "Sign in" })}
                      </button>
                    </>
                  )}
                </p>
              </div>
            )}
          </div>
          <Toaster />
        </div>
      </ThemeProvider>
  );
}
