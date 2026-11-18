import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.tsx";
import { Alert, controlClass, messageOf, primaryClass } from "../components/ui.tsx";

export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const { login, register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const isRegister = mode === "register";

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      if (isRegister) await register(name, email, password);
      else await login(email, password);
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      <section className="hidden flex-col justify-between bg-panel px-12 py-10 text-[#f6f1e7] lg:flex">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-[#d7c4a5]">тайм-трекер</div>
          <h1 className="mt-4 max-w-md text-5xl font-semibold leading-tight tracking-tight">
            Срез дня по проектам, без облака.
          </h1>
        </div>
        <p className="max-w-sm text-sm leading-6 text-[#d5ddd8]">
          Старт и стоп остаются в вашей PostgreSQL. Вкладки одного аккаунта видят один и тот же таймер.
        </p>
      </section>
      <section className="flex items-center justify-center px-4 py-12">
        <form onSubmit={onSubmit} className="w-full max-w-md rounded-[28px] border border-line bg-card p-7 shadow-[0_20px_60px_rgba(23,33,30,0.06)]">
          <h2 className="text-2xl font-semibold tracking-tight">{isRegister ? "Регистрация" : "Вход"}</h2>
          <p className="mt-2 text-sm text-muted">
            {isRegister ? "Аккаунт хранится только в локальной базе." : "Сессия живёт в httpOnly-cookie."}
          </p>
          <div className="mt-6 flex flex-col gap-4">
            {isRegister ? (
              <label className="block">
                <span className="mb-1.5 block text-sm text-muted">Имя</span>
                <input className={controlClass} value={name} onChange={(event) => setName(event.target.value)} required />
              </label>
            ) : null}
            <label className="block">
              <span className="mb-1.5 block text-sm text-muted">Email</span>
              <input
                className={controlClass}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm text-muted">Пароль</span>
              <input
                className={controlClass}
                type="password"
                autoComplete={isRegister ? "new-password" : "current-password"}
                minLength={isRegister ? 8 : 1}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            {error ? <Alert>{error}</Alert> : null}
            <button className={primaryClass} type="submit" disabled={pending}>
              {pending ? "Секунду..." : isRegister ? "Создать аккаунт" : "Войти"}
            </button>
          </div>
          <p className="mt-5 text-sm text-muted">
            {isRegister ? (
              <>
                Уже есть аккаунт? <Link className="font-semibold text-ink" to="/login">Войти</Link>
              </>
            ) : (
              <>
                Нет аккаунта? <Link className="font-semibold text-ink" to="/register">Зарегистрироваться</Link>
              </>
            )}
          </p>
        </form>
      </section>
    </div>
  );
}
