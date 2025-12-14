import { request } from "@api/request";

export type Message = {
  username: string;
  content: string;
};

export type CreateChat = {
  ownerId: number;
  name: string;
};

export type Chat = CreateChat & {
  id: number;
  createdAt: Date;
  activeUsers: number;
  visibility: "public" | "private";
  description: string;
  tags: string[];
  messages: Message[];
};

export const loadChat = async (id: number) => {
  const response = await request.get<Chat>(`chat/${id}`);
  return response.data;
};

export const createChat = async (data: CreateChat) => {
  const response = await request.post<Chat>("chat", data);
  return response.data;
};

export const loadChatList = async () => {
  const response = await request.get<Chat[]>("chat");
  return response.data;
};

export const loadChatListByName = async (name: string) => {
  const response = await request.get<Chat[]>(`chat/name/${name}`);
  return response.data;
};
