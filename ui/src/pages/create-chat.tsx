import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";

import { useCreateChat } from "@api/chat/hooks";
import { useAuth } from "@hooks/auth-context";
import { theme } from "@styles/theme";
import { Spinner } from "@components/spinner";

export const CreateChat = () => {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();
  const createChat = useCreateChat();

  const handleCreate = async () => {
    if (!name.trim()) return;

    setIsCreating(true);
    try {
      const { id } = await createChat.mutateAsync({
        name: name.trim(),
        ownerId: user.id,
      });
      navigate(`/chat/${id}`);
    } catch (error) {
      console.error("Failed to create chat:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleCreate();
    }
  };

  return (
    <Page>
      <Container>
        {/* Hero Section */}
        <HeroSection>
          <HeroContent>
            <HeroIcon>🚀</HeroIcon>
            <HeroTitle>Create Your Chat Room</HeroTitle>
            <HeroSubtitle>
              Start a new conversation space where your community can connect,
              share ideas, and collaborate in real-time.
            </HeroSubtitle>
          </HeroContent>
          <HeroVisual>
            <ChatPreview>
              <PreviewHeader>
                <PreviewDots>
                  <Dot color="#ff5f57" />
                  <Dot color="#ffbd2e" />
                  <Dot color="#28ca42" />
                </PreviewDots>
                <PreviewTitle>Your New Room</PreviewTitle>
              </PreviewHeader>
              <PreviewMessages>
                <PreviewMessage $isOwn={false}>
                  <PreviewAvatar>👋</PreviewAvatar>
                  <PreviewBubble $isOwn={false}>
                    Welcome to the room!
                  </PreviewBubble>
                </PreviewMessage>
                <PreviewMessage $isOwn={true}>
                  <PreviewBubble $isOwn={true}>
                    Thanks for joining!
                  </PreviewBubble>
                </PreviewMessage>
                <PreviewMessage $isOwn={false}>
                  <PreviewAvatar>😊</PreviewAvatar>
                  <PreviewBubble $isOwn={false}>
                    This looks great!
                  </PreviewBubble>
                </PreviewMessage>
              </PreviewMessages>
            </ChatPreview>
          </HeroVisual>
        </HeroSection>

        {/* Creation Form */}
        <CreationSection>
          <FormCard>
            <FormHeader>
              <FormTitle>Room Details</FormTitle>
              <FormSubtitle>
                Give your chat room a name and description
              </FormSubtitle>
            </FormHeader>

            <FormContent>
              <FormGroup>
                <Label htmlFor="room-name">Room Name *</Label>
                <InputWrapper>
                  <Input
                    id="room-name"
                    type="text"
                    placeholder="e.g. Team Discussion, Gaming Squad, Study Group"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyPress={handleKeyPress}
                    maxLength={50}
                  />
                  <CharCount $isNearLimit={name.length > 40}>
                    {name.length}/50
                  </CharCount>
                </InputWrapper>
              </FormGroup>

              <FormGroup>
                <Label htmlFor="room-description">Description (Optional)</Label>
                <TextArea
                  id="room-description"
                  placeholder="What's this room about? Add a brief description to help others understand the purpose..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={200}
                  rows={3}
                />
                <CharCount $isNearLimit={description.length > 160}>
                  {description.length}/200
                </CharCount>
              </FormGroup>

              <FormActions>
                <CreateButton
                  onClick={handleCreate}
                  disabled={!name.trim() || isCreating}
                >
                  {isCreating ? (
                    <>
                      <Spinner />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CreateIcon>✨</CreateIcon>
                      Create Room
                    </>
                  )}
                </CreateButton>
              </FormActions>
            </FormContent>
          </FormCard>

          {/* Quick Actions */}
          <QuickActions>
            <QuickActionCard onClick={() => navigate("/join")}>
              <QuickActionIcon>🔍</QuickActionIcon>
              <QuickActionContent>
                <QuickActionTitle>Browse Existing Rooms</QuickActionTitle>
                <QuickActionDescription>
                  Find and join active conversations
                </QuickActionDescription>
              </QuickActionContent>
              <QuickActionArrow>→</QuickActionArrow>
            </QuickActionCard>
          </QuickActions>
        </CreationSection>

        {/* Features Section */}
        <FeaturesSection>
          <FeaturesTitle>Why Create a Room?</FeaturesTitle>
          <FeaturesGrid>
            <FeatureCard>
              <FeatureIcon>💬</FeatureIcon>
              <FeatureTitle>Real-time Messaging</FeatureTitle>
              <FeatureDescription>
                Instant communication with live message delivery
              </FeatureDescription>
            </FeatureCard>

            <FeatureCard>
              <FeatureIcon>👥</FeatureIcon>
              <FeatureTitle>Multiple Participants</FeatureTitle>
              <FeatureDescription>
                Invite unlimited users to join your conversation
              </FeatureDescription>
            </FeatureCard>

            <FeatureCard>
              <FeatureIcon>🔒</FeatureIcon>
              <FeatureTitle>Secure & Private</FeatureTitle>
              <FeatureDescription>
                Your conversations are protected and private
              </FeatureDescription>
            </FeatureCard>
          </FeaturesGrid>
        </FeaturesSection>
      </Container>
    </Page>
  );
};

const Page = styled.div({
  minHeight: "100vh",
  backgroundColor: theme.colors.background,
  fontFamily: theme.typography.fontFamilyPrimary,
});

const Container = styled.div({
  maxWidth: "1200px",
  margin: "0 auto",
  padding: theme.spacing[6],
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing[10],
});

const HeroSection = styled.section({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: theme.spacing[8],
  alignItems: "center",
  paddingTop: theme.spacing[4],
  paddingBottom: theme.spacing[4],

  "@media (max-width: 768px)": {
    gridTemplateColumns: "1fr",
    textAlign: "center",
    gap: theme.spacing[6],
    paddingTop: theme.spacing[3],
  },
});

const HeroContent = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing[4],
});

const HeroIcon = styled.div({
  fontSize: "3.5rem",
  marginBottom: theme.spacing[2],
});

const HeroTitle = styled.h1({
  fontSize: theme.typography.fontSize["4xl"],
  fontWeight: theme.typography.fontWeight.bold,
  color: theme.colors.textPrimary,
  margin: 0,
  lineHeight: theme.typography.lineHeight.tight,
  background: `linear-gradient(135deg, ${theme.colors.textPrimary}, ${theme.colors.accent})`,
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
});

const HeroSubtitle = styled.p({
  fontSize: theme.typography.fontSize.lg,
  color: theme.colors.textSecondary,
  margin: 0,
  lineHeight: theme.typography.lineHeight.relaxed,
  maxWidth: "500px",
});

const HeroVisual = styled.div({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
});

const ChatPreview = styled.div({
  width: "280px", // SLIGHTLY reduced from 300px
  backgroundColor: theme.colors.surface,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: theme.borderRadius.xl,
  overflow: "hidden",
  boxShadow: theme.boxShadow.xl,
});

const PreviewHeader = styled.div({
  padding: theme.spacing[4],
  backgroundColor: theme.colors.surfaceElevated,
  borderBottom: `1px solid ${theme.colors.border}`,
  display: "flex",
  alignItems: "center",
  gap: theme.spacing[3],
});

const PreviewDots = styled.div({
  display: "flex",
  gap: theme.spacing[1],
});

const Dot = styled.div<{ color: string }>(({ color }) => ({
  width: "12px",
  height: "12px",
  borderRadius: "50%",
  backgroundColor: color,
}));

const PreviewTitle = styled.span({
  fontSize: theme.typography.fontSize.sm,
  fontWeight: theme.typography.fontWeight.medium,
  color: theme.colors.textPrimary,
});

const PreviewMessages = styled.div({
  padding: theme.spacing[4],
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing[2],
  height: "180px", // REDUCED from 200px
});

const PreviewMessage = styled.div<{ $isOwn: boolean }>(({ $isOwn }) => ({
  display: "flex",
  alignItems: "flex-end",
  gap: theme.spacing[2],
  justifyContent: $isOwn ? "flex-end" : "flex-start",
}));

const PreviewAvatar = styled.div({
  width: "24px",
  height: "24px",
  borderRadius: "50%",
  backgroundColor: theme.colors.accent,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  flexShrink: 0,
});

const PreviewBubble = styled.div<{ $isOwn: boolean }>(({ $isOwn }) => ({
  padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
  borderRadius: theme.borderRadius.md,
  backgroundColor: $isOwn ? theme.colors.accent : theme.colors.surfaceElevated,
  color: $isOwn ? "white" : theme.colors.textPrimary,
  fontSize: theme.typography.fontSize.sm,
  maxWidth: "70%",
}));

const CreationSection = styled.section({
  display: "grid",
  gridTemplateColumns: "2fr 1fr",
  gap: theme.spacing[8],

  "@media (max-width: 768px)": {
    gridTemplateColumns: "1fr",
    gap: theme.spacing[6],
  },
});

const FormCard = styled.div({
  backgroundColor: theme.colors.surface,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: theme.borderRadius.xl,
  boxShadow: theme.boxShadow.lg,
  overflow: "hidden",
});

const FormHeader = styled.div({
  padding: theme.spacing[6],
  backgroundColor: theme.colors.surfaceElevated,
  borderBottom: `1px solid ${theme.colors.border}`,
  textAlign: "center",
});

const FormTitle = styled.h2({
  fontSize: theme.typography.fontSize["2xl"],
  fontWeight: theme.typography.fontWeight.semibold,
  color: theme.colors.textPrimary,
  margin: 0,
  marginBottom: theme.spacing[2],
});

const FormSubtitle = styled.p({
  fontSize: theme.typography.fontSize.base,
  color: theme.colors.textSecondary,
  margin: 0,
});

const FormContent = styled.div({
  padding: theme.spacing[6],
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
});

const Input = styled.input({
  width: "100%",
  padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
  paddingRight: theme.spacing[12],
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

const TextArea = styled.textarea({
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
  resize: "vertical",
  fontFamily: "inherit",

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

const CharCount = styled.span<{ $isNearLimit: boolean }>(
  ({ $isNearLimit }) => ({
    position: "absolute",
    top: theme.spacing[3],
    right: theme.spacing[3],
    fontSize: theme.typography.fontSize.xs,
    color: $isNearLimit ? theme.colors.warning : theme.colors.textMuted,
    fontWeight: theme.typography.fontWeight.medium,
    pointerEvents: "none",
  })
);

const FormActions = styled.div({
  display: "flex",
  justifyContent: "center",
  marginTop: theme.spacing[2],
});

const CreateButton = styled.button({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing[2],
  padding: `${theme.spacing[4]} ${theme.spacing[8]}`,
  backgroundColor: theme.colors.accent,
  color: "white",
  border: "none",
  borderRadius: theme.borderRadius.lg,
  fontSize: theme.typography.fontSize.lg,
  fontWeight: theme.typography.fontWeight.semibold,
  cursor: "pointer",
  transition: `all ${theme.transition.normal}`,
  boxShadow: theme.boxShadow.md,

  "&:hover:not(:disabled)": {
    backgroundColor: theme.colors.accentHover,
    transform: "translateY(-2px)",
    boxShadow: theme.boxShadow.lg,
  },

  "&:active:not(:disabled)": {
    backgroundColor: theme.colors.accentPressed,
    transform: "translateY(-1px)",
  },

  "&:disabled": {
    opacity: 0.7,
    cursor: "not-allowed",
    transform: "none",
  },
});

const CreateIcon = styled.span({
  fontSize: theme.typography.fontSize.lg,
});

const QuickActions = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing[4],
});

const QuickActionCard = styled.div({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing[4],
  padding: theme.spacing[5],
  backgroundColor: theme.colors.surface,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: theme.borderRadius.lg,
  cursor: "pointer",
  transition: `all ${theme.transition.normal}`,

  "&:hover": {
    backgroundColor: theme.colors.surfaceHover,
    borderColor: theme.colors.accent,
    transform: "translateY(-2px)",
    boxShadow: theme.boxShadow.md,
  },
});

const QuickActionIcon = styled.div({
  fontSize: "2rem",
  flexShrink: 0,
});

const QuickActionContent = styled.div({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing[1],
});

const QuickActionTitle = styled.h3({
  fontSize: theme.typography.fontSize.base,
  fontWeight: theme.typography.fontWeight.semibold,
  color: theme.colors.textPrimary,
  margin: 0,
});

const QuickActionDescription = styled.p({
  fontSize: theme.typography.fontSize.sm,
  color: theme.colors.textSecondary,
  margin: 0,
});

const QuickActionArrow = styled.span({
  fontSize: theme.typography.fontSize.lg,
  color: theme.colors.accent,
  fontWeight: theme.typography.fontWeight.bold,
});

const FeaturesSection = styled.section({
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing[6],
  marginTop: theme.spacing[2],
});

const FeaturesTitle = styled.h2({
  fontSize: theme.typography.fontSize["3xl"],
  fontWeight: theme.typography.fontWeight.bold,
  color: theme.colors.textPrimary,
  margin: 0,
});

const FeaturesGrid = styled.div({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
  gap: theme.spacing[6],
});

const FeatureCard = styled.div({
  padding: theme.spacing[6],
  backgroundColor: theme.colors.surface,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: theme.borderRadius.lg,
  textAlign: "center",
  transition: `all ${theme.transition.normal}`,

  "&:hover": {
    backgroundColor: theme.colors.surfaceHover,
    transform: "translateY(-4px)",
    boxShadow: theme.boxShadow.lg,
  },
});

const FeatureIcon = styled.div({
  fontSize: "2.5rem",
  marginBottom: theme.spacing[3],
});

const FeatureTitle = styled.h3({
  fontSize: theme.typography.fontSize.lg,
  fontWeight: theme.typography.fontWeight.semibold,
  color: theme.colors.textPrimary,
  margin: 0,
  marginBottom: theme.spacing[2],
});

const FeatureDescription = styled.p({
  fontSize: theme.typography.fontSize.base,
  color: theme.colors.textSecondary,
  margin: 0,
  lineHeight: theme.typography.lineHeight.relaxed,
});
