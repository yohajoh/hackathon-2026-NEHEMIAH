export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const CURRENT_USER_CACHE_TTL_MS = Math.max(0, Number(process.env.NEXT_PUBLIC_CURRENT_USER_CACHE_TTL_MS));

type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  is_super_admin?: boolean;
  roles?: string[];
  activePersona?: "ADMIN" | "STUDENT";
  studentProfileId?: string | null;
  phone?: string | null;
  year?: string | null;
  department?: string | null;
  student_id?: string | null;
} | null;

let currentUserCache: { value: CurrentUser; expiresAt: number } | null = null;
let currentUserInFlight: Promise<CurrentUser> | null = null;

const parseJsonSafely = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

export function invalidateCurrentUserCache() {
  currentUserCache = null;
}

/** Fetches current user. Returns user object or null if not logged in. */
export async function fetchCurrentUser(): Promise<CurrentUser> {
  const now = Date.now();
  if (currentUserCache && currentUserCache.expiresAt > now) {
    return currentUserCache.value;
  }

  if (currentUserInFlight) {
    return currentUserInFlight;
  }

  currentUserInFlight = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        currentUserCache = { value: null, expiresAt: now + CURRENT_USER_CACHE_TTL_MS };
        return null;
      }
      const json = (await parseJsonSafely(res)) as { data?: { user?: CurrentUser } } | null;
      const user = json?.data?.user ?? null;
      currentUserCache = { value: user, expiresAt: Date.now() + CURRENT_USER_CACHE_TTL_MS };
      return user;
    } catch {
      currentUserCache = { value: null, expiresAt: now + 2000 };
      return null;
    } finally {
      currentUserInFlight = null;
    }
  })();

  return currentUserInFlight;
}

export async function switchPersona(activePersona: "ADMIN" | "STUDENT"): Promise<CurrentUser> {
  const response = await fetchApi<{ data?: { user?: CurrentUser } }>("/auth/persona", {
    method: "PATCH",
    body: JSON.stringify({ activePersona }),
  });
  const user = response?.data?.user ?? null;
  currentUserCache = { value: user, expiresAt: Date.now() + CURRENT_USER_CACHE_TTL_MS };
  return user;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchApi<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  // Build headers conditionally to avoid unnecessary preflight requests
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  // Only set JSON content-type when sending a body or on non-GET methods
  const method = (options.method || "GET").toUpperCase();
  if (method !== "GET" || options.body) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // Required for cookies (JWT)
    cache: "no-store",
  });

  const data = await parseJsonSafely(response);

  if (!response.ok) {
    if (response.status === 401) {
      invalidateCurrentUserCache();
    }
    const message =
      typeof data === "object" && data !== null && "message" in data ? String(data.message) : "Something went wrong";
    throw new Error(message);
  }

  if (endpoint.startsWith("/auth/") && endpoint !== "/auth/me") {
    invalidateCurrentUserCache();
  }
  if (endpoint === "/auth/me") {
    const user =
      typeof data === "object" && data !== null && "data" in data && data.data
        ? ((data.data as { user?: CurrentUser }).user ?? null)
        : null;
    currentUserCache = { value: user, expiresAt: Date.now() + CURRENT_USER_CACHE_TTL_MS };
  }

  return data as T;
}
