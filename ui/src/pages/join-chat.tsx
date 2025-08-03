import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";

import { useLoadChatList } from "@api/chat/hooks";
import type { Chat } from "@api/chat/request";
import { theme } from "@styles/theme";
import { useWebSocket } from "@api/use-websocket";

export interface NewChat {
  type: "new_chat";
  content: Chat;
}
export interface DeleteChat {
  type: "delete_chat";
  chatId: number;
}
export interface UserCount {
  type: "user_count";
  chatId: number;
  content: number;
}
export type WSData = NewChat | DeleteChat | UserCount;

export const JoinChat = () => {
  const [roomId, setRoomId] = useState("");
  const [chats, setChats] = useState<Chat[]>([]);
  const navigate = useNavigate();
  const { data, isLoading } = useLoadChatList();

  useWebSocket("/chat-list", {
    onMessage: (data: WSData) => {
      setChats((curr) => {
        switch (data.type) {
          case "new_chat":
            return [...curr, data.content];
          case "delete_chat":
            return curr.filter((c) => c.id !== data.chatId);
          case "user_count":
            return curr.map((c) =>
              c.id === data.chatId ? { ...c, activeUsers: data.content } : c
            );
          default:
            return curr;
        }
      });
    },
    onOpen: () => {
      console.log("Connected to chat list");
    },
    onClose: (event) => {
      console.log("Disconnected from chat list", event.code, event.reason);
    },
    onError: (event) => {
      console.error("Chat list WebSocket error:", event);
    },
    debug: import.meta.env.DEV,
  });

  useEffect(() => {
    if (data) setChats(data);
  }, [data]);

  const handleJoinRoom = () => {
    const trimmedRoomId = roomId.trim();
    if (trimmedRoomId) {
      navigate(`/chat/${trimmedRoomId}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleJoinRoom();
    }
  };

  if (isLoading) {
    return (
      <Page>
        <LoadingContainer>
          <LoadingSpinner />
          <LoadingText>Loading chat rooms...</LoadingText>
        </LoadingContainer>
      </Page>
    );
  }

  return (
    <Page>
      <Container>
        <Header>
          <HeaderContent>
            <Title>Chat Rooms</Title>
            <Subtitle>Join an existing room or create a new one</Subtitle>
          </HeaderContent>
        </Header>

        <QuickJoinSection>
          <SectionTitle>Quick Join</SectionTitle>
          <QuickJoinForm>
            <InputGroup>
              <Input
                type="text"
                placeholder="Enter room ID or number"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <JoinButton onClick={handleJoinRoom} disabled={!roomId.trim()}>
                Join Room
              </JoinButton>
            </InputGroup>
          </QuickJoinForm>
        </QuickJoinSection>

        <RoomsSection>
          <SectionHeader>
            <SectionTitle>Available Rooms</SectionTitle>
            <CreateButton onClick={() => navigate("/create")}>
              <PlusIcon>+</PlusIcon>
              Create New Room
            </CreateButton>
          </SectionHeader>

          {chats.length === 0 ? (
            <EmptyState>
              <EmptyIcon>💬</EmptyIcon>
              <EmptyTitle>No active rooms</EmptyTitle>
              <EmptyDescription>
                Be the first to create a chat room and start the conversation!
              </EmptyDescription>
              <CreateButton onClick={() => navigate("/create")}>
                Create First Room
              </CreateButton>
            </EmptyState>
          ) : (
            <RoomGrid>
              {chats.map((chat) => (
                <RoomCard
                  key={chat.id}
                  onClick={() => navigate(`/chat/${chat.id}`)}
                >
                  <RoomHeader>
                    <RoomName>{chat.name}</RoomName>
                    <RoomId>#{chat.id}</RoomId>
                  </RoomHeader>
                  <RoomFooter>
                    <UserCountBadge>
                      <OnlineIndicator />
                      <UserCountText>
                        {chat.activeUsers}{" "}
                        {chat.activeUsers === 1 ? "user" : "users"} online
                      </UserCountText>
                    </UserCountBadge>
                  </RoomFooter>
                </RoomCard>
              ))}
            </RoomGrid>
          )}
        </RoomsSection>
      </Container>
    </Page>
  );
};

// Styled Components
const Page = styled.div({
  minHeight: "100vh",
  backgroundColor: theme.colors.background,
  fontFamily: theme.typography.fontFamilyPrimary,
  padding: theme.spacing[6],
});

const Container = styled.div({
  maxWidth: "1200px",
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing[8],
});

const Header = styled.header({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  paddingBottom: theme.spacing[6],
  borderBottom: `1px solid ${theme.colors.border}`,
});

const HeaderContent = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing[2],
});

const Title = styled.h1({
  fontSize: theme.typography.fontSize["4xl"],
  fontWeight: theme.typography.fontWeight.bold,
  color: theme.colors.textPrimary,
  margin: 0,
  lineHeight: theme.typography.lineHeight.tight,
});

const Subtitle = styled.p({
  fontSize: theme.typography.fontSize.lg,
  color: theme.colors.textSecondary,
  margin: 0,
  lineHeight: theme.typography.lineHeight.normal,
});

const QuickJoinSection = styled.section({
  backgroundColor: theme.colors.surface,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: theme.borderRadius.xl,
  padding: theme.spacing[6],
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing[4],
});

const SectionTitle = styled.h2({
  fontSize: theme.typography.fontSize.xl,
  fontWeight: theme.typography.fontWeight.semibold,
  color: theme.colors.textPrimary,
  margin: 0,
  lineHeight: theme.typography.lineHeight.tight,
});

const QuickJoinForm = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing[4],
});

const InputGroup = styled.div({
  display: "flex",
  gap: theme.spacing[3],
  flexWrap: "wrap",

  "@media (max-width: 640px)": {
    flexDirection: "column",
  },
});

const Input = styled.input({
  flex: 1,
  minWidth: "200px",
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

const JoinButton = styled.button({
  padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
  backgroundColor: theme.colors.accent,
  color: "white",
  border: "none",
  borderRadius: theme.borderRadius.md,
  fontSize: theme.typography.fontSize.base,
  fontWeight: theme.typography.fontWeight.medium,
  lineHeight: theme.typography.lineHeight.normal,
  cursor: "pointer",
  transition: `background-color ${theme.transition.normal}, transform ${theme.transition.fast}`,
  whiteSpace: "nowrap",

  "&:hover:not(:disabled)": {
    backgroundColor: theme.colors.accentHover,
    transform: "translateY(-1px)",
  },

  "&:active:not(:disabled)": {
    backgroundColor: theme.colors.accentPressed,
    transform: "translateY(0)",
  },

  "&:disabled": {
    opacity: 0.5,
    cursor: "not-allowed",
    transform: "none",
  },
});

const RoomsSection = styled.section({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing[6],
});

const SectionHeader = styled.div({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: theme.spacing[4],
});

const CreateButton = styled.button({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing[2],
  padding: `${theme.spacing[3]} ${theme.spacing[5]}`,
  backgroundColor: theme.colors.surfaceElevated,
  color: theme.colors.textPrimary,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: theme.borderRadius.md,
  fontSize: theme.typography.fontSize.base,
  fontWeight: theme.typography.fontWeight.medium,
  lineHeight: theme.typography.lineHeight.normal,
  cursor: "pointer",
  transition: `all ${theme.transition.normal}`,

  "&:hover": {
    backgroundColor: theme.colors.surfaceHover,
    borderColor: theme.colors.accent,
    transform: "translateY(-1px)",
  },

  "&:active": {
    transform: "translateY(0)",
  },
});

const PlusIcon = styled.span({
  fontSize: theme.typography.fontSize.lg,
  fontWeight: theme.typography.fontWeight.bold,
});

const RoomGrid = styled.div({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
  gap: theme.spacing[4],
});

const RoomCard = styled.div({
  backgroundColor: theme.colors.surface,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: theme.borderRadius.lg,
  padding: theme.spacing[5],
  cursor: "pointer",
  transition: `all ${theme.transition.normal}`,
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing[4],

  "&:hover": {
    backgroundColor: theme.colors.surfaceHover,
    borderColor: theme.colors.accent,
    transform: "translateY(-2px)",
    boxShadow: theme.boxShadow.lg,
  },

  "&:active": {
    transform: "translateY(-1px)",
  },
});

const RoomHeader = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing[1],
});

const RoomName = styled.h3({
  fontSize: theme.typography.fontSize.lg,
  fontWeight: theme.typography.fontWeight.semibold,
  color: theme.colors.textPrimary,
  margin: 0,
  lineHeight: theme.typography.lineHeight.tight,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

const RoomId = styled.span({
  fontSize: theme.typography.fontSize.sm,
  color: theme.colors.textMuted,
  fontFamily: theme.typography.fontFamilyMono,
});

const RoomFooter = styled.div({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginTop: "auto",
});

const UserCountBadge = styled.div({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing[2],
  padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
  backgroundColor: theme.colors.surfaceElevated,
  borderRadius: theme.borderRadius.md,
  border: `1px solid ${theme.colors.border}`,
});

const OnlineIndicator = styled.div({
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  backgroundColor: theme.colors.success,
  flexShrink: 0,
});

const UserCountText = styled.span({
  fontSize: theme.typography.fontSize.sm,
  color: theme.colors.textSecondary,
  fontWeight: theme.typography.fontWeight.medium,
});

const EmptyState = styled.div({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  padding: theme.spacing[12],
  gap: theme.spacing[4],
});

const EmptyIcon = styled.div({
  fontSize: "4rem",
  marginBottom: theme.spacing[2],
});

const EmptyTitle = styled.h3({
  fontSize: theme.typography.fontSize["2xl"],
  fontWeight: theme.typography.fontWeight.semibold,
  color: theme.colors.textPrimary,
  margin: 0,
});

const EmptyDescription = styled.p({
  fontSize: theme.typography.fontSize.base,
  color: theme.colors.textSecondary,
  margin: 0,
  maxWidth: "400px",
  lineHeight: theme.typography.lineHeight.relaxed,
});

const LoadingContainer = styled.div({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "60vh",
  gap: theme.spacing[4],
});

const LoadingSpinner = styled.div({
  width: "40px",
  height: "40px",
  border: `3px solid ${theme.colors.border}`,
  borderTop: `3px solid ${theme.colors.accent}`,
  borderRadius: "50%",
  animation: "spin 1s linear infinite",

  "@keyframes spin": {
    "0%": { transform: "rotate(0deg)" },
    "100%": { transform: "rotate(360deg)" },
  },
});

const LoadingText = styled.p({
  fontSize: theme.typography.fontSize.lg,
  color: theme.colors.textSecondary,
  margin: 0,
});
