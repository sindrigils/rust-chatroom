import { request } from "@api/request";

export type User = {
  username: string;
};

export const createUser = async (username: string) => {
  const response = await request.post<User>(`v1/user`, { username });
  return response.data;
};
