import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Container, Card, Title, Input, Button } from "../components/Styled";
import { useAuth } from "@hooks/auth-context";

export const Login = () => {
  const { handleLogin } = useAuth();

  const [rawName, setRawName] = useState("");
  const [rawPassword, setRawPassword] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/create";

  const handleSubmit = async () => {
    const name = rawName.trim();
    const password = rawPassword.trim();
    if (!name || !password) return;

    handleLogin({ username: name, password });
    navigate(from, { replace: true });
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
        <Input
          placeholder="Enter your password"
          value={rawPassword}
          type="password"
          onChange={(e) => setRawPassword(e.target.value)}
        />
        <Button onClick={handleSubmit}>Continue</Button>
      </Card>
    </Container>
  );
};
