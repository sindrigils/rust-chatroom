import { useState } from "react";

export function useAuth() {
  const [username] = useState<string | null>(() => {
    return localStorage.getItem("username");
  });

  return { username, isAuthenticated: Boolean(username) };
}
