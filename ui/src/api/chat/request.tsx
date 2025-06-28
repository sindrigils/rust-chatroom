import { request } from "@api/request";

export type CreateChat = {
  ownerId: number;
  name: string;
};

export type Chat = {
  id: number;
  name: string;
  ownerId: number;
  createdAt: Date;
};

export const createChat = async (data: CreateChat) => {
  const response = await request.post<Chat>("chat", data);
  return response.data;
};

export const loadChatList = async () => {
  const response = await request.get<Chat[]>("chat");
  return response.data;
};
