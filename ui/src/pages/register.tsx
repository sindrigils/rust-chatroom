import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";

import { useAuth } from "@hooks/auth-context";
import { theme } from "@styles/theme";

export const Register = () => {
  const { register } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const onSubmit = () => {
    const user = username.trim();
    const pass = password.trim();
    if (!user || !pass) return;
    register({ username: user, password: pass });
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
            type="text"
            placeholder="Choose a username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSubmit()}
            autoComplete="username"
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
            onKeyDown={(e) => e.key === "Enter" && onSubmit()}
            autoComplete="new-password"
          />
        </FormField>

        <ActionButton
          onClick={onSubmit}
          disabled={!username.trim() || !password.trim()}
        >
          Register
        </ActionButton>

        <Alternate>
          Already have an account?{" "}
          <LinkText onClick={() => navigate("/")}>Log In</LinkText>
        </Alternate>
      </FormCard>
    </Page>
  );
};

// Styled Components

const Page = styled.div({
  minHeight: "100vh",
  backgroundColor: theme.colors.background,
  fontFamily: theme.typography.fontFamilyPrimary,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: theme.spacing[4],
});

const FormCard = styled.div({
  backgroundColor: theme.colors.surface,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: theme.borderRadius.xl,
  boxShadow: theme.boxShadow.lg,
  padding: theme.spacing[8],
  maxWidth: "400px",
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing[6],
});

const Header = styled.h1({
  fontSize: theme.typography.fontSize["3xl"],
  fontWeight: theme.typography.fontWeight.bold,
  color: theme.colors.textPrimary,
  margin: 0,
  textAlign: "center",
  lineHeight: theme.typography.lineHeight.tight,
});

const FormField = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing[2],
});

const Label = styled.label({
  fontSize: theme.typography.fontSize.sm,
  fontWeight: theme.typography.fontWeight.medium,
  color: theme.colors.textPrimary,
});

const TextInput = styled.input({
  padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
  backgroundColor: theme.colors.surfaceElevated,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: theme.borderRadius.md,
  fontSize: theme.typography.fontSize.base,
  color: theme.colors.textPrimary,
  lineHeight: theme.typography.lineHeight.normal,
  transition: `border-color ${theme.transition.normal}, box-shadow ${theme.transition.normal}`,
  outline: "none",

  "&::placeholder": {
    color: theme.colors.textMuted,
  },
  "&:focus": {
    borderColor: theme.colors.borderFocus,
    boxShadow: `0 0 0 3px ${theme.colors.borderFocus}20`,
  },
  "&:hover:not(:focus)": {
    borderColor: theme.colors.textMuted,
  },
});

const ActionButton = styled.button({
  padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
  backgroundColor: theme.colors.accent,
  color: theme.colors.textPrimary,
  border: "none",
  borderRadius: theme.borderRadius.md,
  fontSize: theme.typography.fontSize.base,
  fontWeight: theme.typography.fontWeight.medium,
  cursor: "pointer",
  transition: `background-color ${theme.transition.normal}`,

  "&:disabled": {
    backgroundColor: theme.colors.surfaceHover,
    cursor: "not-allowed",
  },
  "&:hover:not(:disabled)": {
    backgroundColor: theme.colors.accentHover,
  },
  "&:active:not(:disabled)": {
    backgroundColor: theme.colors.accentPressed,
  },
});

const Alternate = styled.div({
  fontSize: theme.typography.fontSize.sm,
  color: theme.colors.textSecondary,
  textAlign: "center",
});

const LinkText = styled.button({
  background: "none",
  border: "none",
  padding: 0,
  color: theme.colors.accent,
  fontSize: theme.typography.fontSize.sm,
  fontWeight: theme.typography.fontWeight.medium,
  cursor: "pointer",
  textDecoration: "underline",
  transition: `color ${theme.transition.fast}`,

  "&:hover": {
    color: theme.colors.accentHover,
  },
  "&:active": {
    color: theme.colors.accentPressed,
  },
});
