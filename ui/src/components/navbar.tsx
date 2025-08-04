import { useLocation, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { useAuth } from "@hooks/auth-context";
import { theme } from "@styles/theme";

export const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isChat = location.pathname.startsWith("/chat/");
  if (!user || isChat) return null;

  return (
    <Bar>
      <Inner>
        <Brand onClick={() => navigate("/")} aria-label="NovaChat Home">
          <BrandOrb />
          <BrandText>
            <BrandName>NovaChat</BrandName>
            <BrandSub>Create and discover rooms</BrandSub>
          </BrandText>
        </Brand>

        <Right>
          <NavButton onClick={() => navigate("/")}>Home</NavButton>

          <UserChip onClick={() => navigate("/settings")} title="Settings">
            <Avatar>
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.username}
                  width={28}
                  height={28}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              ) : (
                initials(user.username)
              )}
            </Avatar>
            <UserName title={user.username}>{user.username}</UserName>
          </UserChip>

          <NavButton onClick={logout}>Log out</NavButton>
        </Right>
      </Inner>
    </Bar>
  );
};

function initials(name?: string) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const CONTROL_HEIGHT = 36;
const H_PAD = 12;

const Bar = styled.header({
  position: "sticky",
  top: 0,
  zIndex: 1030,
  backdropFilter: "blur(10px)",
  background:
    "linear-gradient(to bottom, rgba(17,18,36,0.85), rgba(17,18,36,0.55))",
  borderBottom: "1px solid var(--color-border)",
});

const Inner = styled.div({
  maxWidth: 1120,
  margin: "0 auto",
  padding: "var(--space-4) var(--space-6)",
  display: "flex",
  alignItems: "center",
  gap: "var(--space-4)",
});

const Brand = styled.button({
  display: "flex",
  alignItems: "center",
  gap: "var(--space-4)",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  padding: 0,
  height: CONTROL_HEIGHT,
});

const BrandOrb = styled.div({
  width: 36,
  height: 36,
  borderRadius: "50%",
  background: "var(--gradient-accent)",
  boxShadow: "var(--shadow-sm)",
  flexShrink: 0,
});

const BrandText = styled.div({
  display: "flex",
  flexDirection: "column",
  textAlign: "left",
  lineHeight: 1.1,
});

const BrandName = styled.span({
  fontWeight: 700,
  letterSpacing: 0.3,
  color: theme.colors.textPrimary,
});

const BrandSub = styled.span({
  color: "var(--color-text-muted)",
  fontSize: "var(--font-size-xs)",
});

const Right = styled.div({
  marginLeft: "auto",
  display: "flex",
  alignItems: "center",
  gap: 10,
});

const baseControl = {
  height: CONTROL_HEIGHT,
  padding: `0 ${H_PAD}px`,
  borderRadius: "var(--radius-md)",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  cursor: "pointer",
  fontWeight: 600,
  transition:
    "border-color var(--transition-normal), box-shadow var(--transition-normal), transform var(--transition-fast)",
};

const NavButton = styled.button({
  ...baseControl,
  background: "transparent",
  color: "var(--color-text-secondary)",
  border: "1px solid var(--color-border)",
  ":hover": {
    borderColor: "var(--color-border-focus)",
    transform: "translateY(-1px)",
    boxShadow: "var(--shadow-sm)",
  },
  ":active": { transform: "translateY(0)" },
});

const UserChip = styled.button({
  ...baseControl,
  background: "var(--color-surface)",
  color: "var(--color-text-primary)",
  border: "1px solid var(--color-border)",
  boxShadow: "var(--shadow-sm)",
  ":hover": {
    borderColor: "var(--color-border-focus)",
    transform: "translateY(-1px)",
    boxShadow: "var(--shadow-md)",
  },
  ":active": { transform: "translateY(0)" },
});

const Avatar = styled.div({
  width: 28,
  height: 28,
  borderRadius: "50%",
  overflow: "hidden",
  border: "1px solid var(--glass-stroke)",
  background: "var(--color-surface-hover)",
  display: "grid",
  placeItems: "center",
  color: "var(--color-text-secondary)",
  fontWeight: 700,
  fontSize: 12,
  flexShrink: 0,
});

const UserName = styled.span({
  maxWidth: 160,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});
