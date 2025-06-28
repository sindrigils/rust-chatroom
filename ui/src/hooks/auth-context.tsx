/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from "react";
import {
  useLoginUser,
  useCurrentUserQuery,
  useRegisterUser,
} from "@api/users/hooks";
import type { LoginPayload, User } from "@api/users/request";

type AuthContextType = {
  user: User | null;
  handleLogin: (data: LoginPayload) => Promise<void>;
  handleRegister: (data: LoginPayload) => void;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);

  const { refetch: fetchUser } = useCurrentUserQuery();

  const login = useLoginUser();
  const register = useRegisterUser();

  useEffect(() => {
    fetchUser().then(({ data }) => {
      setUser(data ?? null);
    });
  }, [fetchUser]);

  const handleLogin = async (data: LoginPayload, onSuccess?: () => void) => {
    await login.mutateAsync(data, {
      onSuccess: async () => {
        const { data: me } = await fetchUser();
        setUser(me ?? null);
        onSuccess?.();
      },
    });
  };

  const handleRegister = async (data: LoginPayload, onSuccess?: () => void) => {
    await register.mutateAsync(data, {
      onSuccess: () => {
        onSuccess?.();
      },
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        handleLogin,
        handleRegister,
        isAuthenticated: Boolean(user),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be within AuthProvider");
  return ctx;
};
