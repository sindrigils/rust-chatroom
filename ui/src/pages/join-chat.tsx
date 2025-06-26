import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Card, Title, Input, Button } from "../components/Styled";

export const JoinChat: React.FC = () => {
  const [roomId, setRoomId] = useState("");
  const navigate = useNavigate();

  const handleJoin = () => {
    if (roomId.trim()) {
      navigate(`/chat/${roomId.trim()}`);
    }
  };

  return (
    <Container>
      <Card>
        <Title>Join Server</Title>;
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
      </Card>
    </Container>
  );
};
