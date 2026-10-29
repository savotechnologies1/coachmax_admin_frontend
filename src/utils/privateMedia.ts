import apiClient from "../api/apiClient";
import { getMediaUrl } from "./media";

const privatePath = /^uploads\/(documents|payment-screenshots|training|chat)\/[a-zA-Z0-9._-]+$/;
const pageOrigin = () => window.location.origin;
const apiBase = () => String(apiClient.defaults.baseURL || pageOrigin());

/** Extract only this API's canonical file identity; signed query parameters
 * and other origins never become an authenticated request destination. */
export function getPrivateMediaPath(value: string, base = apiBase(), origin = pageOrigin()): string | null {
  try {
    const api = new URL(base, origin);
    const url = new URL(value, `${api.href.replace(/\/+$/, "")}/`);
    if (url.origin !== api.origin || url.username || url.password) return null;
    let path = url.pathname.replace(/^\/+/, "");
    const prefix = api.pathname.replace(/^\/+|\/+$/g, "");
    if (prefix && path.startsWith(`${prefix}/`)) path = path.slice(prefix.length + 1);
    return privatePath.test(path) && !path.includes("..") ? path : null;
  } catch { return null; }
}

function safeMediaUrl(value: string): string {
  if (!value?.trim()) throw new Error("This file is unavailable.");
  const raw = value.trim();
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) && !/^(https?:|blob:|data:)/i.test(raw)) throw new Error("This file URL is not supported.");
  const url = new URL(raw.startsWith("//") ? raw : getMediaUrl(raw), pageOrigin());
  const safeDataImage = /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(url.href);
  if ((!/^(https?:|blob:)$/.test(url.protocol) && !safeDataImage) || url.username || url.password) throw new Error("This file URL is not supported.");
  return url.href;
}

export async function renewMediaUrl(value: string): Promise<string> {
  const original = safeMediaUrl(value);
  const path = getPrivateMediaPath(original);
  if (!path) return original;
  // Always call a fixed, authenticated API endpoint. Never fetch an attachment
  // URL with the API client's bearer-token interceptor.
  const response = await apiClient.get("/api/auth/media-link", { params: { path } });
  const granted = response.data?.url;
  if (response.data?.success !== true || typeof granted !== "string") throw new Error("A new file link could not be created.");
  const renewed = safeMediaUrl(granted);
  if (getPrivateMediaPath(renewed) !== path || !new URL(renewed).searchParams.get("access")) throw new Error("The server returned an invalid file link.");
  return renewed;
}

/** Reserve the tab during the click gesture, then navigate after renewal.
 * Clearing opener immediately protects the original application window. */
export async function openMediaInNewTab(value: string): Promise<void> {
  const popup = window.open("about:blank", "_blank");
  if (!popup) throw new Error("Allow popups to open this file.");
  try {
    popup.opener = null;
    const policy = popup.document.createElement("meta");
    policy.name = "referrer";
    policy.content = "no-referrer";
    popup.document.head.appendChild(policy);
    popup.document.title = "Opening file…";
    popup.document.body.textContent = "Opening file…";
    const url = await renewMediaUrl(value);
    if (!popup.closed) popup.location.replace(url);
  } catch (error) {
    popup.close();
    throw error;
  }
}

interface InlineMediaTarget {
  src: string;
  isConnected?: boolean;
  load?: () => void;
  setAttribute: (name: string, value: string) => void;
  removeAttribute: (name: string) => void;
}
const inlineAttempts = new WeakMap<InlineMediaTarget, { path: string; at: number }>();
const isAttached = (target: InlineMediaTarget) => target.isConnected !== false;

/** A failed inline preview gets one renewal per element/file in 30 seconds.
 * Corrupt media or denied access cannot trigger an automatic reload loop. */
export async function renewInlineMediaElement(target: InlineMediaTarget, value: string): Promise<boolean> {
  const path = getPrivateMediaPath(value);
  if (!path || !isAttached(target)) return false;
  const previous = inlineAttempts.get(target);
  if (previous?.path === path && Date.now() - previous.at < 30000) return false;
  inlineAttempts.set(target, { path, at: Date.now() });
  target.setAttribute("aria-busy", "true");
  try {
    const url = await renewMediaUrl(value);
    if (!isAttached(target)) return false;
    target.src = url;
    target.load?.();
    return true;
  } finally { target.removeAttribute("aria-busy"); }
}
