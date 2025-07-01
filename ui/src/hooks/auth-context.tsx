import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  useLoginUser,
  useCurrentUserQuery,
  useRegisterUser,
} from "@api/users/hooks";
import type { LoginPayload, User } from "@api/users/request";

type AuthContextType = {
  user: User;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginPayload) => Promise<void>;
  register: (data: LoginPayload) => Promise<void>;
};

const AuthContext = createContext<AuthContextType>(undefined!);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setLoading] = useState(true);
  const { refetch } = useCurrentUserQuery();
  const loginMutation = useLoginUser();
  const registerMutation = useRegisterUser();

  useEffect(() => {
    refetch()
      .then(({ data }) => setUser(data ?? null))
      .finally(() => setLoading(false));
  }, [refetch]);

  const login = async (data: LoginPayload, onSuccess?: () => void) => {
    await loginMutation.mutateAsync(data, {
      onSuccess: async () => {
        const { data } = await refetch();
        setUser(data ?? null);
        onSuccess?.();
      },
    });
  };

  const register = async (data: LoginPayload, onSuccess?: () => void) => {
    await registerMutation.mutateAsync(data, {
      onSuccess: () => {
        onSuccess?.();
      },
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be within AuthProvider");
  return ctx;
};
