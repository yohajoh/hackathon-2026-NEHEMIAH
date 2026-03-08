export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

/** Fetches current user. Returns user object or null if not logged in. */
export async function fetchCurrentUser(): Promise<{
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string | null;
  year?: string | null;
  department?: string | null;
  student_id?: string | null;
} | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/me`, { credentials: "include" });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data?.user ?? null;
  } catch {
    return null;
  }
}

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
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
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data;
}
