import { useState } from "react";
import { useNavigate } from "react-router-dom";

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

export const Register = () => {
  const { handleRegister } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const onSubmit = async () => {
    handleRegister({ username, password });
    navigate("/");
  };

  return (
    <Page>
      <FormCard>
        <Header>Create Account</Header>
        <FormField>
          <Label htmlFor="username">Username</Label>
          <TextInput
            id="username"
            placeholder="Choose a username"
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
        <ActionButton onClick={onSubmit}>Register</ActionButton>
        <Alternate>
          Already have an account?
          <LinkText onClick={() => navigate("/")}>Log In</LinkText>
        </Alternate>
      </FormCard>
    </Page>
  );
};
