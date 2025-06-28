import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Card, Title, Input, Button } from "../components/Styled";
import { useLoadChatList } from "@api/chat/hooks";
import styled from "styled-components";

export const JoinChat: React.FC = () => {
  const [roomId, setRoomId] = useState("");
  const navigate = useNavigate();
  const { data, isLoading } = useLoadChatList();

  if (!data || isLoading) {
    return null;
  }

  const handleJoin = () => {
    if (roomId.trim()) {
      navigate(`/chat/${roomId.trim()}`);
    }
  };

  const handleClick = (id: number) => {
    navigate(`/chat/${id}`);
  };

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
          {data.map((chat) => {
            return (
              <Chat key={chat.id} onClick={() => handleClick(chat.id)}>
                Name: {chat.name}
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
  padding: "0.5rem",
  border: "1px solid black",
});
