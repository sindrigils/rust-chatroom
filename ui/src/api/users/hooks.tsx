import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createUser } from "./request";

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (username: string) => createUser(username),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["user", data.username],
      });
    },
  });
};
