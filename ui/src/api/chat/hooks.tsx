import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createChat,
  loadChat,
  loadChatList,
  loadChatListByName,
  type Chat,
  type CreateChat,
} from "./request";

export const useLoadChat = (id: number) => {
  return useQuery<Chat>({
    queryKey: ["chat", id],
    queryFn: () => loadChat(id),
  });
};

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
    queryFn: loadChatList,
  });
};

export const useLoadChatListByName = (name: string, enabled: boolean) => {
  return useQuery<Chat[]>({
    queryKey: ["chat-lists", name],
    queryFn: () => loadChatListByName(name),
    enabled,
  });
};
