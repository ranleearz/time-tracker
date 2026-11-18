import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthProvider.tsx";
import { Shell } from "./components/Shell.tsx";
import { DataProvider } from "./data/DataProvider.tsx";
import { AuthPage } from "./pages/AuthPage.tsx";
import { ProjectsPage } from "./pages/ProjectsPage.tsx";
import { ReportsPage } from "./pages/ReportsPage.tsx";
import { TrackerPage } from "./pages/TrackerPage.tsx";

function Splash() {
  return <div className="grid min-h-screen place-items-center text-muted">Проверяем сессию</div>;
}

function RequireAuth() {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <DataProvider>
      <Shell />
    </DataProvider>
  );
}

function GuestOnly({ mode }: { mode: "login" | "register" }) {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  if (user) return <Navigate to="/" replace />;
  return <AuthPage mode={mode} />;
}

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<GuestOnly mode="login" />} />
        <Route path="/register" element={<GuestOnly mode="register" />} />
        <Route element={<RequireAuth />}>
          <Route index element={<TrackerPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
