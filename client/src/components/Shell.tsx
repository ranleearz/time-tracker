import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.tsx";
import { useData } from "../data/DataProvider.tsx";

const links = [
  { to: "/", label: "Трекер", end: true },
  { to: "/projects", label: "Проекты", end: false },
  { to: "/reports", label: "Отчёты", end: false },
];

export function Shell() {
  const { user, logout } = useAuth();
  const { error, reload } = useData();

  return (
    <div className="min-h-screen md:flex">
      <aside className="flex flex-col bg-panel px-5 py-5 text-[#f6f1e7] md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0">
        <div className="flex items-end justify-between gap-4 md:block">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-[#d7c4a5]">локально</div>
            <div className="mt-1 text-3xl font-semibold tracking-tight">Срез</div>
          </div>
          <nav className="flex gap-1 md:mt-8 md:flex-col">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `rounded-full px-3 py-2 text-sm transition md:rounded-2xl ${
                    isActive ? "bg-white/10 text-white" : "text-[#d5ddd8] hover:bg-white/5"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="mt-6 border-t border-white/10 pt-4 md:mt-auto">
          <div className="truncate text-sm">{user?.name}</div>
          <div className="truncate text-xs text-[#b7c0bb]">{user?.email}</div>
          <button
            type="button"
            className="mt-3 text-sm text-[#f0d2c4]"
            onClick={() => {
              void logout();
            }}
          >
            Выйти
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          {error ? (
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#fff1ea] px-4 py-3 text-sm text-accent-deep">
              <span>{error}</span>
              <button type="button" className="font-semibold" onClick={() => void reload()}>
                Повторить
              </button>
            </div>
          ) : null}
          <Outlet />
        </div>
      </main>
    </div>
  );
}
