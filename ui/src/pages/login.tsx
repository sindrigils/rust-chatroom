import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styled from "styled-components";

import { useAuth } from "@hooks/auth-context";
import { theme } from "@styles/theme";

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onSubmit();
    }
  };

  return (
    <Page>
      <LoginContainer>
        <LoginCard>
          <LoginHeader>
            <WelcomeTitle>Welcome Back</WelcomeTitle>
            <WelcomeSubtitle>Sign in to continue to your chat</WelcomeSubtitle>
          </LoginHeader>

          <LoginForm>
            <FormGroup>
              <Label htmlFor="username">Username</Label>
              <InputWrapper>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoComplete="username"
                />
              </InputWrapper>
            </FormGroup>

            <FormGroup>
              <Label htmlFor="password">Password</Label>
              <InputWrapper>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoComplete="current-password"
                />
              </InputWrapper>
            </FormGroup>

            <LoginButton
              onClick={onSubmit}
              disabled={!username.trim() || !password.trim()}
            >
              Sign In
            </LoginButton>
          </LoginForm>

          <LoginFooter>
            <FooterText>
              New to our platform?{" "}
              <LinkButton onClick={() => navigate("/register")}>
                Create an account
              </LinkButton>
            </FooterText>
          </LoginFooter>
        </LoginCard>
      </LoginContainer>
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

const LoginContainer = styled.div({
  width: "100%",
  maxWidth: "400px",
  display: "flex",
  flexDirection: "column",
});

const LoginCard = styled.div({
  backgroundColor: theme.colors.surface,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: theme.borderRadius.xl,
  boxShadow: theme.boxShadow.lg,
  padding: theme.spacing[8],
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing[6],
});

const LoginHeader = styled.div({
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing[2],
});

const WelcomeTitle = styled.h1({
  fontSize: theme.typography.fontSize["3xl"],
  fontWeight: theme.typography.fontWeight.bold,
  color: theme.colors.textPrimary,
  margin: 0,
  lineHeight: theme.typography.lineHeight.tight,
});

const WelcomeSubtitle = styled.p({
  fontSize: theme.typography.fontSize.base,
  color: theme.colors.textSecondary,
  margin: 0,
  lineHeight: theme.typography.lineHeight.normal,
});

const LoginForm = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing[5],
});

const FormGroup = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing[2],
});

const Label = styled.label({
  fontSize: theme.typography.fontSize.sm,
  fontWeight: theme.typography.fontWeight.medium,
  color: theme.colors.textPrimary,
  lineHeight: theme.typography.lineHeight.normal,
});

const InputWrapper = styled.div({
  position: "relative",
  display: "flex",
});

const Input = styled.input({
  width: "100%",
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

const LoginButton = styled.button({
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

// LinkButton
const LinkButton = styled.button({
  background: "none",
  border: "none",
  padding: 0,
  color: theme.colors.accent,
  fontSize: theme.typography.fontSize.base,
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

const LoginFooter = styled.div({
  textAlign: "center",
});

// FooterText
const FooterText = styled.p({
  fontSize: theme.typography.fontSize.sm,
  color: theme.colors.textSecondary,
  margin: 0,
});
