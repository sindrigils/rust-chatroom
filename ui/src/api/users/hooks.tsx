import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  type LoginPayload,
} from "./request";

export const second = 1000;
export const minute = 60 * second;
export const minutes = (count: number) => count * minute;

export const useLoginUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: LoginPayload) => loginUser(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["user", data.username],
      });
    },
  });
};

export const useLogoutUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logoutUser,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["currentUser"],
      });
    },
  });
};

export const useRegisterUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: LoginPayload) => registerUser(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["user", data.username],
      });
    },
  });
};

export const useCurrentUserQuery = () => {
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUser,
    staleTime: Infinity,
    retryOnMount: false,
    refetchInterval: minutes(10),
    refetchOnWindowFocus: "always",
  });
};
