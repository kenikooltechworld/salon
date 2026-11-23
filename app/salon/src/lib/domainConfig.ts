// Single source of truth for hosts/domains that are NOT tenant public subdomains.
// Add new entries here as subdomain infrastructure evolves.

export const NON_PUBLIC_EXACT_HOSTS = [
  "kenikoolsalon.com",
  "www.kenikoolsalon.com",
  "api.kenikoolsalon.com",
] as const;

export const NON_PUBLIC_HOST_SUFFIXES = [
  ".pages.dev",
  ".dev",
] as const;

export const EXCLUDED_SUBDOMAIN_LABELS = [
  "www",
  "api",
  "admin",
  "app",
] as const;

export const HOSTING_PLATFORM_DOMAINS = [
  "fly.dev",
  "workers.dev",
  "vercel.app",
  "netlify.app",
  "herokuapp.com",
  "onrender.com",
] as const;

export const PLATFORM_DOMAIN = (import.meta.env.VITE_PLATFORM_DOMAIN || "kenikoolsalon.com").toLowerCase();

function normalizeHost(host?: string | null): string {
  let h = (host || "").trim().toLowerCase();
  if (!h) return "";
  h = h.split(",")[0].trim();
  if (h.startsWith("[")) {
    const end = h.indexOf("]");
    if (end !== -1) return h.slice(1, end);
  }
  h = h.split(":")[0];
  return h.replace(/\.$/, "");
}

function matchesSuffix(host: string, suffix: string): boolean {
  const s = suffix.toLowerCase().trim();
  if (!s) return false;
  if (s.startsWith(".")) return host === s.slice(1) || host.endsWith(s);
  return host === s || host.endsWith(`.${s}`);
}

export function isIpAddress(host?: string | null): boolean {
  const h = normalizeHost(host);
  if (!h) return false;
  if (h.includes(":")) return true;
  const parts = h.split(".");
  if (parts.length !== 4) return false;
  return parts.every((p) => /^\d+$/.test(p) && Number(p) >= 0 && Number(p) <= 255);
}

export function isLocalHost(host?: string | null): boolean {
  const h = normalizeHost(host);
  return h === "localhost" || h === "127.0.0.1" || h === "::1" || h.endsWith(".localhost");
}

export function isNonPublicHost(host?: string | null): boolean {
  const h = normalizeHost(host);
  if (!h) return true;
  if (isLocalHost(h) || isIpAddress(h)) return true;
  if (NON_PUBLIC_EXACT_HOSTS.includes(h as any)) return true;
  if (NON_PUBLIC_HOST_SUFFIXES.some((s) => matchesSuffix(h, s))) return true;
  if (HOSTING_PLATFORM_DOMAINS.some((s) => matchesSuffix(h, s))) return true;
  return false;
}

export function extractTenantSubdomain(host?: string | null, platformDomain = PLATFORM_DOMAIN): string | null {
  const h = normalizeHost(host);
  if (!h || isNonPublicHost(h)) return null;
  const parts = h.split(".");
  if (parts.length < 2) return null;

  if (parts.length === 2 && parts[1] === "localhost") {
    const label = parts[0];
    return EXCLUDED_SUBDOMAIN_LABELS.includes(label as any) ? null : label;
  }

  const pd = normalizeHost(platformDomain);
  if (pd && (h === pd || h.endsWith(`.${pd}`))) {
    const remainder = h === pd ? "" : h.slice(0, -(pd.length + 1));
    if (!remainder) return null;
    const label = remainder.split(".")[0];
    if (!label || EXCLUDED_SUBDOMAIN_LABELS.includes(label as any)) return null;
    return label;
  }

  if (parts.length >= 3) {
    const label = parts[0];
    if (EXCLUDED_SUBDOMAIN_LABELS.includes(label as any)) return null;
    return label;
  }
  return null;
}

export function getCurrentTenantSubdomain(): string | null {
  if (typeof window === "undefined") return null;
  return extractTenantSubdomain(window.location.hostname);
}

export function isPublicTenantHost(): boolean {
  return getCurrentTenantSubdomain() !== null;
}
