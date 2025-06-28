import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createChat,
  loadChatList,
  type Chat,
  type CreateChat,
} from "./request";

export const useCreateChat = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateChat) => createChat(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["chat", data.id],
      });
    },
  });
};

export const useLoadChatList = () => {
  return useQuery<Chat[]>({
    queryKey: ["chat-lists"],
    queryFn: () => loadChatList(),
  });
};
