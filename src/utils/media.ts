export const MEDIA_PLACEHOLDER = "/images/placeholder/media-placeholder.svg";

/**
 * Converts an API-stored media path into a browser URL without creating
 * double slashes or prefixing already absolute/local URLs.
 */
export const getMediaUrl = (path?: string | null, fallback = MEDIA_PLACEHOLDER) => {
  if (!path) return fallback;
  const value = String(path).trim().replace(/\\/g, "/");
  if (!value) return fallback;
  if (/^(https?:|data:|blob:)/i.test(value) || value.startsWith("/images/") || value.startsWith("/placeholder")) {
    return value;
  }
  const base = String(import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
  const relative = value.replace(/^\/+/, "");
  return base ? `${base}/${relative}` : `/${relative}`;
};

export const getInitials = (name = "User") => name
  .trim()
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0]?.toUpperCase() || "")
  .join("") || "U";

export const getMediaFallback = (name = "Player") =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="256" height="256" rx="128" fill="#0b1f55"/><text x="128" y="140" text-anchor="middle" font-family="Arial, sans-serif" font-size="88" font-weight="700" fill="#ffffff">${getInitials(name)}</text></svg>`)}`;
