import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import Icon from "@/components/common/Icon";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaChallenge, setMfaChallenge] = useState(null);
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { signIn, completeMfaSignIn, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/admin";

  if (isAuthenticated) {
    navigate(from, { replace: true });
    return null;
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const result = await signIn(email, password);
      if (result?.requiresMfa) {
        setMfaChallenge(result);
        setPassword("");
        return;
      }
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(
        err?.message === "Invalid login credentials"
          ? "Неверный email или пароль"
          : err?.message || "Ошибка входа"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleMfaSubmit = async (e) => {
    e.preventDefault();
    const code = otp.trim();
    if (!code) {
      toast.error("Введите код из письма.");
      return;
    }

    setSubmitting(true);
    try {
      await completeMfaSignIn(mfaChallenge, code);
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err?.message || "Не удалось подтвердить код.");
    } finally {
      setSubmitting(false);
    }
  };

  const returnToPasswordStep = () => {
    setMfaChallenge(null);
    setOtp("");
  };

  return (
    <section className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-brand/20 bg-[#2A2A28] p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <Icon name="log-in" className="h-8 w-8 text-brand" />
          <h1 className="font-play text-2xl font-bold text-white">
            Вход в админ-панель
          </h1>
        </div>

        {mfaChallenge ? (
          <form onSubmit={handleMfaSubmit} className="space-y-4">
            <p className="text-sm text-gray-400">
              Мы отправили код подтверждения на {email}.
            </p>
            <div>
              <label
                htmlFor="admin-otp"
                className="mb-1 block text-sm text-gray-400"
              >
                Код из письма
              </label>
              <input
                id="admin-otp"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                autoFocus
                autoComplete="one-time-code"
                inputMode="numeric"
                spellCheck={false}
                className="w-full rounded-xl border border-brand/20 bg-ink px-4 py-3 text-white outline-none focus:border-brand"
                placeholder="123456"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 font-medium text-ink transition hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Icon name="loader" className="h-5 w-5 animate-spin" />
                  Проверка...
                </>
              ) : (
                <>
                  <Icon name="log-in" className="h-5 w-5" />
                  Подтвердить вход
                </>
              )}
            </button>

            <button
              type="button"
              onClick={returnToPasswordStep}
              disabled={submitting}
              className="w-full text-sm text-gray-400 transition hover:text-white disabled:opacity-50"
            >
              Вернуться к вводу пароля
            </button>
          </form>
        ) : (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="admin-email"
                className="mb-1 block text-sm text-gray-400"
              >
                Email
              </label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-xl border border-brand/20 bg-ink px-4 py-3 text-white outline-none focus:border-brand"
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="mb-1 block text-sm text-gray-400"
              >
                Пароль
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-xl border border-brand/20 bg-ink px-4 py-3 text-white outline-none focus:border-brand"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 font-medium text-ink transition hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Icon name="loader" className="h-5 w-5 animate-spin" />
                  Вход...
                </>
              ) : (
                <>
                  <Icon name="log-in" className="h-5 w-5" />
                  Войти
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
