export class ApiError extends Error {
  constructor(message: string) {
    super(message);
  }
}

let refreshTask: Promise<boolean> | null = null;

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? "Ошибка запроса";
  } catch {
    return "Ошибка запроса";
  }
}

function refreshSession(): Promise<boolean> {
  refreshTask ??= fetch("/api/auth/refresh", { method: "POST", credentials: "include" })
    .then((response) => response.ok)
    .finally(() => {
      refreshTask = null;
    });
  return refreshTask;
}

function skipRefresh(path: string): boolean {
  return ["/api/auth/login", "/api/auth/register", "/api/auth/refresh", "/api/auth/logout"].some((item) =>
    path.startsWith(item),
  );
}

export async function api<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  const response = await fetch(path, { ...init, headers, credentials: "include" });
  if (response.status === 401 && retry && !skipRefresh(path)) {
    const refreshed = await refreshSession();
    if (refreshed) return api<T>(path, init, false);
  }
  if (!response.ok) throw new ApiError(await readError(response));
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export async function downloadReport(from: string, to: string, projectId: string, offset: number) {
  const params = new URLSearchParams({
    from,
    to,
    tzOffsetMinutes: String(offset),
  });
  if (projectId) params.set("projectId", projectId);
  const path = `/api/reports/export.csv?${params}`;
  let response = await fetch(path, { credentials: "include" });
  if (response.status === 401) {
    const refreshed = await refreshSession();
    if (!refreshed) throw new ApiError("Сессия истекла");
    response = await fetch(path, { credentials: "include" });
  }
  if (!response.ok) throw new ApiError(await readError(response));
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `srez-${from}-${to}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
