import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Card, Title, Input, Button } from "../components/Styled";
import { useLoadChatList } from "@api/chat/hooks";
import styled from "styled-components";
import type { Chat } from "@api/chat/request";
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

export const JoinChat: React.FC = () => {
  const [roomId, setRoomId] = useState("");
  const [chats, setChats] = useState<Chat[]>([]);

  const navigate = useNavigate();
  const { data, isLoading } = useLoadChatList();

  const handleJoin = () => {
    if (roomId.trim()) {
      navigate(`/chat/${roomId.trim()}`);
    }
  };

  const handleClick = (id: number) => {
    navigate(`/chat/${id}`);
  };

  useEffect(() => {
    if (data) {
      setChats(data);
    }
  }, [data]);

  useEffect(() => {
    const ws = new WebSocket("/ws/chat-list");

    ws.onmessage = ({ data: raw }) => {
      const payload: WSData = JSON.parse(raw);
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

  if (!data || isLoading) {
    return null;
  }

  return (
    <Container>
      <Card>
        <Title>Join Server</Title>
        <Input
          placeholder="Room Number"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        />
        <Button onClick={handleJoin}>Join</Button>
        <Button
          onClick={() => navigate("/create")}
          style={{ marginTop: "0.5rem", background: "#6c757d" }}
        >
          Create New
        </Button>
        <ChatList>
          {chats.map((chat) => {
            return (
              <Chat key={chat.id} onClick={() => handleClick(chat.id)}>
                <span>Name: {chat.name}</span>
                <span>Active users: {chat.activeUsers}</span>
              </Chat>
            );
          })}
        </ChatList>
      </Card>
    </Container>
  );
};

const ChatList = styled.div({
  padding: "0.5rem",
  display: "flex",
  gap: "1rem",
  flexDirection: "column",
});

const Chat = styled.div({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  flexDirection: "column",
  border: "1px solid black",
  gap: "0.5rem",
  padding: "0.5rem",
});
