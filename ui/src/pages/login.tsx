import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styled, { keyframes, css } from "styled-components";

import { useAuth } from "@hooks/auth-context";
import { theme } from "@styles/theme";

export const Login = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const navigate = useNavigate();
  const from = useLocation().state?.from?.pathname || "/";

  const onSubmit = async () => {
    const user = username.trim();
    const pass = password.trim();
    if (!user || !pass || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await login({ username: user, password: pass });
      navigate(from, { replace: true });
    } catch {
      setErrorMsg("Invalid username or password");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isSubmitting) {
      onSubmit();
    }
  };

  return (
    <Page>
      <BgDecor />
      <LoginContainer>
        <LoginCard $isLoading={isSubmitting}>
          <LoginHeader>
            <BrandBadge>
              <BadgeGlow />
              <BadgeDot />
            </BrandBadge>
            <WelcomeTitle>Welcome back</WelcomeTitle>
            <WelcomeSubtitle>Sign in to continue to your chats</WelcomeSubtitle>
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
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  onKeyDown={handleKeyDown}
                  autoComplete="username"
                  disabled={isSubmitting}
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
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  onKeyDown={handleKeyDown}
                  autoComplete="current-password"
                  disabled={isSubmitting}
                />
              </InputWrapper>
            </FormGroup>

            {errorMsg && <ErrorBanner role="alert">{errorMsg}</ErrorBanner>}

            <LoginButton
              onClick={onSubmit}
              disabled={!username.trim() || !password.trim() || isSubmitting}
            >
              {isSubmitting ? "Signing in..." : "Sign In"}
            </LoginButton>

            {isSubmitting && (
              <SubmittingHint>Verifying credentials…</SubmittingHint>
            )}
          </LoginForm>

          <LoginFooter>
            <FooterText>
              New here?{" "}
              <LinkButton
                onClick={() => navigate("/register")}
                disabled={isSubmitting}
              >
                Create an account
              </LinkButton>
            </FooterText>
          </LoginFooter>
        </LoginCard>
      </LoginContainer>
    </Page>
  );
};

const shimmer = keyframes`
  0% { 
    transform: translateX(-100%);
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% { 
    transform: translateX(100%);
    opacity: 0;
  }
`;

const ErrorBanner = styled.div({
  background: "rgba(239, 68, 68, 0.12)",
  border: `1px solid ${theme.colors.error}`,
  color: "#ffd7d7",
  borderRadius: theme.borderRadius.md,
  padding: "12px 14px",
  fontSize: theme.typography.fontSize.sm,
});

const SubmittingHint = styled.div({
  marginTop: theme.spacing[2],
  textAlign: "center" as const,
  color: theme.colors.textMuted,
  fontSize: theme.typography.fontSize.sm,
});

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
    width: 380,
    height: 380,
    right: "-80px",
    top: "-80px",
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

const LoginContainer = styled.div({
  width: "100%",
  maxWidth: 440,
  display: "flex",
  flexDirection: "column",
});

const LoginCard = styled.div<{ $isLoading?: boolean }>`
  position: relative;
  background-color: ${theme.colors.surface};
  border: 1px solid ${theme.effects.glassStroke};
  border-radius: ${theme.borderRadius["2xl"]};
  box-shadow: ${theme.boxShadow.lg}, 0 0 0 1px rgba(255, 255, 255, 0.02) inset;
  padding: ${theme.spacing[8]};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing[6]};
  backdrop-filter: saturate(120%) blur(6px);
  overflow: hidden;

  ${({ $isLoading }) =>
    $isLoading &&
    css`
      &::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: linear-gradient(
          90deg,
          transparent 0%,
          rgba(74, 158, 255, 0.3) 20%,
          rgba(58, 142, 239, 0.8) 50%,
          rgba(74, 158, 255, 0.3) 80%,
          transparent 100%
        );
        animation: ${shimmer} 1.5s ease-in-out infinite;
        z-index: 10;
      }

      &::after {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 1px;
        background: rgba(74, 158, 255, 0.1);
        z-index: 5;
      }
    `}
`;

const LoginHeader = styled.div({
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

const WelcomeTitle = styled.h1({
  fontSize: theme.typography.fontSize["3xl"],
  fontWeight: theme.typography.fontWeight.bold,
  color: theme.colors.textPrimary,
  margin: 0,
  lineHeight: theme.typography.lineHeight.tight,
  letterSpacing: "-0.01em",
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

const Input = styled.input<{ disabled?: boolean }>(({ disabled }) => ({
  width: "100%",
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
  opacity: disabled ? 0.6 : 1,
  cursor: disabled ? "not-allowed" : "text",

  "::placeholder": {
    color: theme.colors.textMuted,
  },

  ":focus": {
    borderColor: disabled ? theme.colors.border : theme.colors.borderFocus,
    boxShadow: disabled
      ? "inset 0 1px 0 rgba(255,255,255,0.03)"
      : `0 0 0 4px ${theme.colors.focusRing}, inset 0 1px 0 rgba(255,255,255,0.04)`,
  },

  ":hover:not(:focus)": {
    borderColor: disabled ? theme.colors.border : theme.colors.textMuted,
  },
}));

const LoginButton = styled.button<{ disabled?: boolean }>(({ disabled }) => ({
  padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
  backgroundImage: disabled ? "none" : theme.gradients.accent,
  backgroundColor: disabled ? theme.colors.surfaceHover : "transparent",
  color: disabled ? theme.colors.textMuted : theme.colors.textPrimary,
  border: "none",
  borderRadius: theme.borderRadius.lg,
  fontSize: theme.typography.fontSize.base,
  fontWeight: theme.typography.fontWeight.semibold,
  cursor: disabled ? "not-allowed" : "pointer",
  transition: `transform ${theme.transition.fast}, filter ${theme.transition.fast}, box-shadow ${theme.transition.normal}`,
  boxShadow: disabled ? "none" : "0 10px 24px rgba(74, 158, 255, 0.35)",

  ":hover:not(:disabled)": {
    filter: "brightness(1.05)",
  },

  ":active:not(:disabled)": {
    transform: "translateY(1px)",
    filter: "brightness(0.98)",
    boxShadow: "0 6px 16px rgba(74, 158, 255, 0.28)",
  },
}));

const LinkButton = styled.button<{ disabled?: boolean }>(({ disabled }) => ({
  background: "none",
  border: "none",
  padding: 0,
  color: disabled ? theme.colors.textMuted : theme.colors.accent,
  fontSize: theme.typography.fontSize.base,
  fontWeight: theme.typography.fontWeight.medium,
  cursor: disabled ? "not-allowed" : "pointer",
  textDecoration: "none",
  position: "relative",
  transition: `color ${theme.transition.fast}`,
  opacity: disabled ? 0.6 : 1,

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

  ":hover:not(:disabled)": {
    color: theme.colors.accentHover,
  },

  ":hover:not(:disabled)::after": {
    transform: "scaleX(1)",
  },

  ":active:not(:disabled)": {
    color: theme.colors.accentPressed,
  },
}));

const LoginFooter = styled.div({
  textAlign: "center",
});

const FooterText = styled.p({
  fontSize: theme.typography.fontSize.sm,
  color: theme.colors.textSecondary,
  margin: 0,
});
