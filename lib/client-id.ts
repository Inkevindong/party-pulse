const STORAGE_KEY = "party-pulse-client-id";

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `pp-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function getOrCreateClientId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = randomId();
    window.localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
