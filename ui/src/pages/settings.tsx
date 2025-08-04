import React, { useRef, useState } from "react";
import styled from "styled-components";
import { useAuth } from "@hooks/auth-context";

async function uploadAvatarMock(file: File): Promise<string> {
  await new Promise((r) => setTimeout(r, 900));
  return URL.createObjectURL(file);
}

export const Settings = () => {
  const { user } = useAuth();
  const [username, setUsername] = useState(user?.username || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(
    user?.avatarUrl
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!user) return null;

  const onDrop = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    const isImage = file.type.startsWith("image/");
    const maxMB = 5;
    if (!isImage) {
      setError("Please upload a valid image file.");
      return;
    }
    if (file.size > maxMB * 1024 * 1024) {
      setError(`File too large. Max ${maxMB}MB.`);
      return;
    }

    try {
      setError(null);
      setUploading(true);
      const url = await uploadAvatarMock(file);
      setAvatarUrl(url);
    } catch {
      setError("Failed to upload avatar. Try again.");
    } finally {
      setUploading(false);
    }
  };

  const onFilePick = () => fileInputRef.current?.click();

  const removeAvatar = () => setAvatarUrl(undefined);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      alert("Saved (mock). Wire your API here.");
      setPassword("");
    } catch {
      setError("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page>
      <Container>
        <Title>Profile Settings</Title>

        <Grid>
          {/* Profile form */}
          <Card as="form" onSubmit={save}>
            <SectionTitle>Account</SectionTitle>

            <Field>
              <Label>Username</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your username"
                autoComplete="username"
              />
            </Field>

            <Field>
              <Label>New Password</Label>
              <PasswordWrap>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <IconGhost
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "🙈" : "👁️"}
                </IconGhost>
              </PasswordWrap>
            </Field>

            {error && <ErrorAlert role="alert">{error}</ErrorAlert>}

            <ActionsRow>
              <PrimaryButton disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </PrimaryButton>
              <GhostButton
                type="button"
                onClick={() => {
                  setUsername(user.username || "");
                  setPassword("");
                  setAvatarUrl(user.avatarUrl);
                  setError(null);
                }}
              >
                Reset
              </GhostButton>
            </ActionsRow>
          </Card>

          {/* Avatar uploader */}
          <Card>
            <SectionTitle>Avatar</SectionTitle>

            <AvatarRow>
              <AvatarPreview>
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar preview"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: "50%",
                    }}
                  />
                ) : (
                  <AvatarPlaceholder>👤</AvatarPlaceholder>
                )}
              </AvatarPreview>

              <UploaderColumn>
                <DropZone
                  onClick={onFilePick}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDrop(e.dataTransfer.files);
                  }}
                >
                  <DropIcon>📁</DropIcon>
                  <DropTitle>Upload a photo</DropTitle>
                  <DropSubtitle>
                    Drag & drop or click to choose a file
                  </DropSubtitle>
                  <DropHint>PNG/JPG up to 5MB</DropHint>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => onDrop(e.target.files)}
                  />
                </DropZone>

                <InlineActions>
                  <SecondaryButton type="button" onClick={onFilePick}>
                    Choose File
                  </SecondaryButton>
                  <GhostButton type="button" onClick={removeAvatar}>
                    Remove
                  </GhostButton>
                </InlineActions>

                {uploading && <ProgressText>Uploading...</ProgressText>}
              </UploaderColumn>
            </AvatarRow>
          </Card>
        </Grid>
      </Container>
    </Page>
  );
};

const Page = styled.div({
  minHeight: "100vh",
  background: "var(--color-background)",
  color: "var(--color-text-primary)",
  fontFamily: "var(--font-family-primary)",
});

const Container = styled.main({
  maxWidth: 1120,
  margin: "0 auto",
  padding: "var(--space-12) var(--space-6)",
});

const Title = styled.h1({
  fontSize: "var(--font-size-3xl)",
  margin: 0,
});

const Grid = styled.div({
  marginTop: "var(--space-8)",
  display: "grid",
  gridTemplateColumns: "1.2fr 1fr",
  gap: "var(--space-6)",
  "@media (max-width: 920px)": {
    gridTemplateColumns: "1fr",
  },
});

const Card = styled.section({
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-2xl)",
  boxShadow: "var(--shadow-md)",
  padding: "var(--space-8)",
  display: "grid",
  gap: "var(--space-6)",
});

const SectionTitle = styled.h2({
  fontSize: "var(--font-size-xl)",
  margin: 0,
});

const Field = styled.div({
  display: "grid",
  gap: 8,
});

const Label = styled.label({
  color: "var(--color-text-secondary)",
  fontWeight: 600,
});

const Input = styled.input({
  background: "var(--color-surface-elevated)",
  border: "1px solid var(--color-border)",
  color: "var(--color-text-primary)",
  borderRadius: "var(--radius-md)",
  padding: "12px 12px",
  outline: "none",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
  transition:
    "border-color var(--transition-normal), box-shadow var(--transition-normal)",
  "&::placeholder": {
    color: "var(--color-text-muted)",
  },
  "&:focus": {
    borderColor: "var(--color-border-focus)",
    boxShadow: "0 0 0 3px var(--color-focus-ring)",
  },
  "&:hover:not(:focus)": {
    borderColor: "var(--color-text-muted)",
  },
});

const PasswordWrap = styled.div({
  display: "grid",
  gridTemplateColumns: "1fr auto",
  alignItems: "center",
  gap: 8,
});

const IconGhost = styled.button({
  background: "transparent",
  color: "var(--color-text-secondary)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  padding: "8px 10px",
  cursor: "pointer",
  fontWeight: 600,
});

const ErrorAlert = styled.div({
  background: "rgba(239, 68, 68, 0.12)",
  border: "1px solid var(--color-error)",
  color: "#ffd7d7",
  borderRadius: "var(--radius-md)",
  padding: "12px 14px",
});

const ActionsRow = styled.div({
  display: "flex",
  gap: 12,
});

const PrimaryButton = styled.button<{ disabled?: boolean }>((p) => ({
  background: "var(--gradient-accent)",
  color: "#0b1020",
  border: "none",
  borderRadius: "var(--radius-md)",
  padding: "12px 16px",
  cursor: p.disabled ? "not-allowed" : "pointer",
  fontWeight: 700,
  boxShadow: "var(--shadow-sm)",
  opacity: p.disabled ? 0.7 : 1,
}));

const SecondaryButton = styled.button({
  background: "var(--color-surface-elevated)",
  color: "var(--color-text-primary)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  padding: "12px 16px",
  cursor: "pointer",
  fontWeight: 600,
});

const GhostButton = styled.button({
  background: "transparent",
  color: "var(--color-text-secondary)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: 600,
});

const AvatarRow = styled.div({
  display: "grid",
  gridTemplateColumns: "120px 1fr",
  gap: "var(--space-6)",
  alignItems: "start",
  "@media (max-width: 560px)": {
    gridTemplateColumns: "1fr",
  },
});

const AvatarPreview = styled.div({
  width: 120,
  height: 120,
  borderRadius: "50%",
  overflow: "hidden",
  border: "1px solid var(--glass-stroke)",
  background: "var(--color-surface-hover)",
  display: "grid",
  placeItems: "center",
  boxShadow: "var(--shadow-sm)",
});

const AvatarPlaceholder = styled.span({
  fontSize: 48,
  color: "var(--color-text-muted)",
});

const UploaderColumn = styled.div({
  display: "grid",
  gap: "var(--space-4)",
});

const DropZone = styled.div({
  background: "var(--color-surface-elevated)",
  border: "1px dashed var(--color-border)",
  borderRadius: "var(--radius-xl)",
  padding: "var(--space-6)",
  textAlign: "center",
  cursor: "pointer",
  transition:
    "border-color var(--transition-normal), box-shadow var(--transition-normal), transform var(--transition-fast)",
  ":hover": {
    borderColor: "var(--color-border-focus)",
    boxShadow: "0 0 0 3px var(--color-focus-ring)",
    transform: "translateY(-1px)",
  },
  ":active": {
    transform: "translateY(0)",
  },
  " *": {
    pointerEvents: "none",
  },
});

const DropIcon = styled.div({
  fontSize: 24,
});

const DropTitle = styled.div({
  marginTop: 8,
  fontWeight: 600,
});

const DropSubtitle = styled.div({
  color: "var(--color-text-secondary)",
  fontSize: "var(--font-size-sm)",
});

const DropHint = styled.div({
  marginTop: 4,
  color: "var(--color-text-muted)",
  fontSize: "var(--font-size-xs)",
});

const InlineActions = styled.div({
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
});

const ProgressText = styled.div({
  color: "var(--color-text-secondary)",
  fontSize: "var(--font-size-sm)",
});
