export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

/** Fetches current user. Returns user object or null if not logged in. */
export async function fetchCurrentUser(): Promise<{ id: string; name: string; email: string; role: string } | null> {
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
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "include", // Required for cookies (JWT)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data;
}
