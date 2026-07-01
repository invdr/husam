import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import Icon from "@/components/common/Icon";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { signIn, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/admin";

  if (isAuthenticated) {
    navigate(from, { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await signIn(email, password);
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

  return (
    <section className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-brand/20 bg-[#2A2A28] p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <Icon name="log-in" className="h-8 w-8 text-brand" />
          <h1 className="font-play text-2xl font-bold text-white">
            Вход в админ-панель
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
      </div>
    </section>
  );
}
