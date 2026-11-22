import { apiClient, toApiError } from "./client";

let csrfPromise: Promise<void> | null = null;
async function ensureCsrf() {
  if (typeof document !== "undefined" && document.cookie.includes("csrf_token=")) return;
  if (!csrfPromise) {
    csrfPromise = apiClient.get("/auth/csrf-token").then(() => undefined).finally(() => { csrfPromise = null; });
  }
  await csrfPromise;
}

apiClient.interceptors.request.use(async (config) => {
  const method = (config.method || "get").toLowerCase();
  if (!["get", "head", "options", "trace"].includes(method)) {
    await ensureCsrf();
    const match = typeof document !== "undefined" ? document.cookie.match(/(?:^|; )csrf_token=([^;]*)/) : null;
    const csrf = match ? decodeURIComponent(match[1]) : null;
    if (csrf) {
      config.headers = config.headers ?? {};
      (config.headers as any)["X-CSRF-Token"] = csrf;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const original = error?.config;
    if (status === 403 && original && !original._csrfRetry) {
      original._csrfRetry = true;
      try {
        await apiClient.get("/auth/csrf-token");
        return apiClient(original);
      } catch {}
    }
    return Promise.reject(toApiError(error));
  }
);

export { apiClient };
