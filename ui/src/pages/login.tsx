import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "@hooks/auth-context";
import {
  ActionButton,
  Alternate,
  FormCard,
  FormField,
  Header,
  Label,
  LinkText,
  Page,
  TextInput,
} from "@components/Styled";

export const Login = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const from = useLocation().state?.from?.pathname || "/create";

  const onSubmit = () => {
    const user = username.trim();
    const pass = password.trim();
    if (!user || !pass) return;
    login({ username: user, password: pass });
    navigate(from, { replace: true });
  };

  return (
    <Page>
      <FormCard>
        <Header>Welcome Back</Header>
        <FormField>
          <Label htmlFor="username">Username</Label>
          <TextInput
            id="username"
            placeholder="e.g. johndoe"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </FormField>
        <FormField>
          <Label htmlFor="password">Password</Label>
          <TextInput
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </FormField>
        <ActionButton onClick={onSubmit}>Log In</ActionButton>
        <Alternate>
          New here?{" "}
          <LinkText onClick={() => navigate("/register")}>
            Create an account
          </LinkText>
        </Alternate>
      </FormCard>
    </Page>
  );
};
