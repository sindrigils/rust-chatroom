import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Container, Card, Title, Input, Button } from "../components/Styled";
import { useCreateUser } from "@api/users/hooks";

export const Login = () => {
  const [rawName, setRawName] = useState("");
  const createUser = useCreateUser();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/create";

  const handleSubmit = async () => {
    const name = rawName.trim();
    if (name.trim()) {
      await createUser.mutateAsync(name, {
        onSuccess: () => localStorage.setItem("username", name),
      });
      navigate(from, { replace: true });
    }
  };

  return (
    <Container>
      <Card>
        <Title>Welcome</Title>
        <Input
          placeholder="Enter your name"
          value={rawName}
          onChange={(e) => setRawName(e.target.value)}
        />
        <Button onClick={handleSubmit}>Continue</Button>
      </Card>
    </Container>
  );
};
