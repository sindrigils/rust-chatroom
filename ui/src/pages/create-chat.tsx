import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Card, Title, Input, Button } from "../components/Styled";

export const CreateChat = () => {
  const [port, setPort] = useState("");
  const navigate = useNavigate();

  const handleCreate = () => {
    if (port.trim()) {
      const roomId = port.trim();
      navigate(`/chat/${roomId}`);
    }
  };

  return (
    <Container>
      <Card>
        <Title>Create Server</Title>
        <Input
          placeholder="Room Number"
          value={port}
          onChange={(e) => setPort(e.target.value)}
        />
        <Button onClick={handleCreate}>Create</Button>
        <Button
          onClick={() => navigate("/join")}
          style={{ marginTop: "0.5rem", background: "#6c757d" }}
        >
          Join Existing
        </Button>
      </Card>
    </Container>
  );
};
