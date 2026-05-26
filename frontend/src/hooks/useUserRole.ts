import { useAuth } from "@/context/AuthContext";

export function useUserRole() {
  const { user } = useAuth();
  return {
    role: user?.role ?? null,
    isAdmin: user?.role === "admin",
    isUser: user?.role === "user",
  };
}
