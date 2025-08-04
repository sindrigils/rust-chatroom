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
      <BgDecor />
      <FormCard>
        <HeaderWrap>
          <BrandBadge>
            <BadgeGlow />
            <BadgeDot />
          </BrandBadge>
          <Header>Create your account</Header>
          <Subheader>Start chatting in seconds</Subheader>
        </HeaderWrap>

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

/* Styled Components */

const Page = styled.div({
  minHeight: "100vh",
  backgroundColor: theme.colors.background,
  backgroundImage: theme.gradients.surface,
  fontFamily: theme.typography.fontFamilyPrimary,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: theme.spacing[6],
  position: "relative",
  overflow: "hidden",
});

const BgDecor = styled.div({
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  "&::before": {
    content: '""',
    position: "absolute",
    width: 360,
    height: 360,
    right: "-90px",
    top: "-90px",
    background:
      "radial-gradient(closest-side, rgba(74,158,255,0.18), transparent)",
    filter: "blur(10px)",
  },
  "&::after": {
    content: '""',
    position: "absolute",
    width: 420,
    height: 420,
    left: "-120px",
    bottom: "-120px",
    background:
      "radial-gradient(closest-side, rgba(122,92,255,0.16), transparent)",
    filter: "blur(12px)",
  },
});

const FormCard = styled.div({
  position: "relative",
  backgroundColor: theme.colors.surface,
  border: `1px solid ${theme.effects.glassStroke}`,
  borderRadius: theme.borderRadius["2xl"],
  boxShadow: `${theme.boxShadow.lg}, 0 0 0 1px rgba(255,255,255,0.02) inset`,
  padding: theme.spacing[8],
  maxWidth: 440,
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing[6],
  backdropFilter: "saturate(120%) blur(6px)",
});

const HeaderWrap = styled.div({
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing[3],
  alignItems: "center",
});

const BrandBadge = styled.div({
  position: "relative",
  width: 56,
  height: 56,
  borderRadius: "50%",
  backgroundImage: theme.gradients.accent,
  boxShadow: "0 8px 24px rgba(74, 158, 255, 0.35)",
});

const BadgeGlow = styled.div({
  position: "absolute",
  inset: -6,
  borderRadius: "50%",
  background:
    "radial-gradient(closest-side, rgba(58,142,239,0.25), transparent)",
  filter: "blur(10px)",
});

const BadgeDot = styled.div({
  position: "absolute",
  inset: 6,
  borderRadius: "50%",
  backgroundColor: theme.colors.surface,
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
});

const Header = styled.h1({
  fontSize: theme.typography.fontSize["3xl"],
  fontWeight: theme.typography.fontWeight.bold,
  color: theme.colors.textPrimary,
  margin: 0,
  textAlign: "center",
  lineHeight: theme.typography.lineHeight.tight,
  letterSpacing: "-0.01em",
});

const Subheader = styled.p({
  fontSize: theme.typography.fontSize.base,
  color: theme.colors.textSecondary,
  margin: 0,
  lineHeight: theme.typography.lineHeight.normal,
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
  borderRadius: theme.borderRadius.lg,
  fontSize: theme.typography.fontSize.base,
  color: theme.colors.textPrimary,
  lineHeight: theme.typography.lineHeight.normal,
  transition: `border-color ${theme.transition.normal}, box-shadow ${theme.transition.normal}, transform ${theme.transition.fast}`,
  outline: "none",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",

  "::placeholder": {
    color: theme.colors.textMuted,
  },
  ":focus": {
    borderColor: theme.colors.borderFocus,
    boxShadow: `0 0 0 4px ${theme.colors.focusRing}, inset 0 1px 0 rgba(255,255,255,0.04)`,
  },
  ":hover:not(:focus)": {
    borderColor: theme.colors.textMuted,
  },
});

const ActionButton = styled.button({
  padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
  backgroundImage: theme.gradients.accent,
  color: theme.colors.textPrimary,
  border: "none",
  borderRadius: theme.borderRadius.lg,
  fontSize: theme.typography.fontSize.base,
  fontWeight: theme.typography.fontWeight.semibold,
  cursor: "pointer",
  transition: `transform ${theme.transition.fast}, filter ${theme.transition.fast}, box-shadow ${theme.transition.normal}`,
  boxShadow: "0 10px 24px rgba(74, 158, 255, 0.35)",

  ":disabled": {
    backgroundImage: "none",
    backgroundColor: theme.colors.surfaceHover,
    color: theme.colors.textMuted,
    cursor: "not-allowed",
    boxShadow: "none",
  },

  ":hover:not(:disabled)": {
    filter: "brightness(1.05)",
  },

  ":active:not(:disabled)": {
    transform: "translateY(1px)",
    filter: "brightness(0.98)",
    boxShadow: "0 6px 16px rgba(74, 158, 255, 0.28)",
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
  textDecoration: "none",
  position: "relative",
  transition: `color ${theme.transition.fast}`,

  "::after": {
    content: '""',
    position: "absolute",
    left: 0,
    bottom: -2,
    width: "100%",
    height: 2,
    backgroundImage: theme.gradients.accent,
    borderRadius: 999,
    transform: "scaleX(0)",
    transformOrigin: "left",
    transition: `transform ${theme.transition.normal}`,
  },

  ":hover": {
    color: theme.colors.accentHover,
  },

  ":hover::after": {
    transform: "scaleX(1)",
  },

  ":active": {
    color: theme.colors.accentPressed,
  },
});
