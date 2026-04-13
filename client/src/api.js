const API_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:4000/api"
    : "/api";

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("maternite_token");
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Erreur reseau." }));
    throw new Error(error.message || "Erreur reseau.");
  }

  return response.json();
}
