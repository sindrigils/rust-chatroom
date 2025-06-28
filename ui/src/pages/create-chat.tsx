import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Card, Title, Input, Button } from "../components/Styled";
import { useCreateChat } from "@api/chat/hooks";
import { useAuth } from "@hooks/auth-context";

export const CreateChat = () => {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const navigate = useNavigate();
  const createChat = useCreateChat();

  const handleCreate = async () => {
    const { id } = await createChat.mutateAsync({
      name,
      ownerId: user.id,
    });
    navigate(`/chat/${id}`);
  };

  return (
    <Container>
      <Card>
        <Title>Create Server</Title>
        <Input
          placeholder="Chat Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
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
