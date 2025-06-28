import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLoadChatList } from "@api/chat/hooks";
import type { Chat } from "@api/chat/request";
import {
  ActionButton,
  ChatItem,
  ChatList,
  Controls,
  Header,
  ListCard,
  Loading,
  Page,
  RoomName,
  SecondaryButton,
  TextInput,
  UserCount,
} from "@components/Styled";

export interface NewChat {
  type: "new_chat";
  content: Chat;
}
export interface DeleteChat {
  type: "delete_chat";
  chatId: number;
}
export interface UserCount {
  type: "user_count";
  chatId: number;
  content: number;
}
export type WSData = NewChat | DeleteChat | UserCount;

export const JoinChat = () => {
  const [roomId, setRoomId] = useState("");
  const [chats, setChats] = useState<Chat[]>([]);
  const navigate = useNavigate();
  const { data, isLoading } = useLoadChatList();

  useEffect(() => {
    if (data) setChats(data);
  }, [data]);
  useEffect(() => {
    const ws = new WebSocket("/ws/chat-list");
    ws.onmessage = ({ data }) => {
      const payload: WSData = JSON.parse(data as string);
      setChats((curr) => {
        switch (payload.type) {
          case "new_chat":
            return [...curr, payload.content];
          case "delete_chat":
            return curr.filter((c) => c.id !== payload.chatId);
          case "user_count":
            return curr.map((c) =>
              c.id === payload.chatId
                ? { ...c, activeUsers: payload.content }
                : c
            );
          default:
            return curr;
        }
      });
    };
    return () => ws.close();
  }, []);

  if (isLoading) return <Loading>Loading…</Loading>;

  return (
    <Page>
      <ListCard>
        <Header>Join Server</Header>
        <Controls>
          <TextInput
            placeholder="Room Number"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <ActionButton
            onClick={() => roomId.trim() && navigate(`/chat/${roomId.trim()}`)}
          >
            Join
          </ActionButton>
          <SecondaryButton onClick={() => navigate("/create")}>
            Create New
          </SecondaryButton>
        </Controls>
        <ChatList>
          {chats.map((chat) => (
            <ChatItem
              key={chat.id}
              onClick={() => navigate(`/chat/${chat.id}`)}
            >
              <RoomName>{chat.name}</RoomName>
              <UserCount>{chat.activeUsers} online</UserCount>
            </ChatItem>
          ))}
        </ChatList>
      </ListCard>
    </Page>
  );
};
