import { request } from "@api/request";

export type User = {
  id: number;
  username: string;
};

export type LoginPayload = {
  username: string;
  password: string;
};

export const loginUser = async (data: LoginPayload) => {
  const response = await request.post<User>(`login`, data);
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await request.get<User>("whoami");
  return response.data;
};
