import { useEffect, useState, useRef, type KeyboardEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styled from "styled-components";

import { useAuth } from "@hooks/auth-context";
import { theme } from "@styles/theme";
import { useWebSocket } from "@api/use-websocket";

type WSData = {
  type: "message" | "user_list" | "system_message";
  subtype?: "join" | "leave";
  content: string | string[];
  username?: string;
};

export const ChatRoom = () => {
  const { roomId = "" } = useParams<{ roomId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<WSData[]>([]);
  const [activeUsers, setActiveUsers] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [showUserList, setShowUserList] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { isConnected, sendMessage: sendWsMessage } = useWebSocket(
    `/chat?chat_id=${roomId}`,
    {
      onOpen: () => {
        console.log(`Connected to chat room: ${roomId}`);
      },
      onClose: (event) => {
        console.log(
          `Disconnected from chat room: ${roomId}`,
          event.code,
          event.reason
        );
      },
      onError: (event) => {
        console.error("WebSocket error:", event);
      },
      onMessage: (data: WSData) => {
        console.log("Raw WebSocket data:", data); // Add this line

        switch (data.type) {
          case "message":
            console.log("Processing message:", data); // Add this line
            setMessages((prev) => [...prev, data]);
            break;

          case "system_message":
            console.log("Processing system message:", data); // Add this line
            setMessages((prev) => [...prev, data]);
            break;

          case "user_list": {
            console.log("Processing user list:", data); // Add this line
            const newUsers = [...new Set(data.content as string[])];
            setActiveUsers(newUsers);
            break;
          }

          default:
            console.log("Unknown message type:", data);
        }
      },
      debug: import.meta.env.DEV,
    }
  );

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  if (!user) {
    return null;
  }

  const sendMessage = () => {
    if (!input.trim() || !isConnected) return;

    sendWsMessage(input.trim());
    setInput("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const parseMessage = (msg: WSData) => {
    if (msg.type === "system_message") {
      return {
        username: "System",
        content: msg.content as string,
        isOwn: false,
        isSystem: true,
        systemType: msg.subtype || "info",
      };
    }

    const content = msg.content as string;
    const colonIndex = content.indexOf(":");
    if (colonIndex === -1)
      return { username: "System", content, isOwn: false, isSystem: false };

    const username = content.substring(0, colonIndex);
    const messageContent = content.substring(colonIndex + 1).trim();
    const isOwn = username === user.username;

    return { username, content: messageContent, isOwn, isSystem: false };
  };

  const formatTime = () => {
    return new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Page>
      <ChatContainer>
        <ChatHeader>
          <HeaderLeft>
            <BackButton onClick={() => navigate("/join")}>←</BackButton>
            <RoomInfo>
              <RoomName>Room #{roomId}</RoomName>
              <ConnectionStatus $isConnected={isConnected}>
                <StatusDot $isConnected={isConnected} />
                {isConnected ? "Connected" : "Disconnected"}
              </ConnectionStatus>
            </RoomInfo>
          </HeaderLeft>
          <HeaderRight>
            <UserToggle
              onClick={() => setShowUserList(!showUserList)}
              $isActive={showUserList}
            >
              <UsersIcon>👥</UsersIcon>
              <UserCount>{activeUsers.length}</UserCount>
            </UserToggle>
          </HeaderRight>
        </ChatHeader>

        <ChatBody>
          <MessagesContainer>
            <MessagesWrapper>
              {messages.length === 0 ? (
                <EmptyMessages>
                  <EmptyIcon>💬</EmptyIcon>
                  <EmptyText>No messages yet</EmptyText>
                  <EmptySubtext>Start the conversation!</EmptySubtext>
                </EmptyMessages>
              ) : (
                messages.map((msg, i) => {
                  const { username, content, isOwn, isSystem, systemType } =
                    parseMessage(msg);

                  if (isSystem) {
                    return (
                      <SystemMessage key={i} $type={systemType}>
                        <SystemIcon $type={systemType}>
                          {systemType === "join" ? "👋" : "👋"}
                        </SystemIcon>
                        <SystemText>{content}</SystemText>
                      </SystemMessage>
                    );
                  }

                  const showAvatar =
                    i === 0 ||
                    parseMessage(messages[i - 1]).username !== username ||
                    parseMessage(messages[i - 1]).isSystem;

                  return (
                    <MessageGroup key={i} $isOwn={isOwn}>
                      {showAvatar && !isOwn && (
                        <MessageAvatar>
                          {username.charAt(0).toUpperCase()}
                        </MessageAvatar>
                      )}
                      <MessageContent
                        $isOwn={isOwn}
                        $showAvatar={showAvatar && !isOwn}
                      >
                        {showAvatar && (
                          <MessageHeader $isOwn={isOwn}>
                            <Username $isOwn={isOwn}>
                              {isOwn ? "You" : username}
                            </Username>
                            <Timestamp>{formatTime()}</Timestamp>
                          </MessageHeader>
                        )}
                        <MessageBubble $isOwn={isOwn}>{content}</MessageBubble>
                      </MessageContent>
                    </MessageGroup>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </MessagesWrapper>
          </MessagesContainer>

          <UserListSidebar $isVisible={showUserList}>
            <UserListHeader>
              <UserListTitle>Online Users</UserListTitle>
              <UserListCount>({activeUsers.length})</UserListCount>
            </UserListHeader>
            <UserListContent>
              {activeUsers.map((username) => (
                <UserItem
                  key={username}
                  $isCurrentUser={username === user.username}
                >
                  <UserAvatar $isCurrentUser={username === user.username}>
                    {username.charAt(0).toUpperCase()}
                  </UserAvatar>
                  <UserName $isCurrentUser={username === user.username}>
                    {username === user.username
                      ? `${username} (You)`
                      : username}
                  </UserName>
                  <UserStatus />
                </UserItem>
              ))}
            </UserListContent>
          </UserListSidebar>
        </ChatBody>

        <MessageInputContainer>
          <InputWrapper>
            <MessageInput
              ref={inputRef}
              placeholder={
                isConnected ? "Type your message..." : "Disconnected"
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!isConnected}
            />
            <SendButton
              onClick={sendMessage}
              disabled={!input.trim() || !isConnected}
            >
              <SendIcon>↗</SendIcon>
            </SendButton>
          </InputWrapper>
        </MessageInputContainer>
      </ChatContainer>
    </Page>
  );
};

const ConnectionStatus = styled.div<{
  $isConnected: boolean;
}>(({ $isConnected }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing[2],
  fontSize: theme.typography.fontSize.sm,
  color: $isConnected ? theme.colors.success : theme.colors.error,
  fontWeight: theme.typography.fontWeight.medium,

  "@media (max-width: 768px)": {
    fontSize: theme.typography.fontSize.xs,
  },
}));

const StatusDot = styled.div<{
  $isConnected: boolean;
}>(({ $isConnected }) => ({
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  backgroundColor: $isConnected ? theme.colors.success : theme.colors.error,
  flexShrink: 0,

  "@media (max-width: 768px)": {
    width: "6px",
    height: "6px",
  },
}));

const Page = styled.div({
  height: "100vh",
  backgroundColor: theme.colors.background,
  fontFamily: theme.typography.fontFamilyPrimary,
  display: "flex",
  flexDirection: "column",
  padding: "0",

  "@media (max-width: 1440px)": {
    padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
  },

  "@media (max-width: 768px)": {
    padding: theme.spacing[2],
  },
});

const ChatContainer = styled.div({
  height: "100%",
  display: "flex",
  flexDirection: "column",
  maxWidth: "1400px",
  margin: "0 auto",
  width: "100%",
  backgroundColor: theme.colors.surface,
  borderRadius: "0",
  overflow: "hidden",

  "@media (max-width: 1440px)": {
    borderRadius: theme.borderRadius.lg,
    boxShadow: theme.boxShadow.lg,
    border: `1px solid ${theme.colors.border}`,
    height: "calc(100vh - 2rem)",
  },

  "@media (max-width: 768px)": {
    borderRadius: theme.borderRadius.md,
    height: "calc(100vh - 1rem)",
  },
});

const ChatHeader = styled.header({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: theme.spacing[4],
  backgroundColor: theme.colors.surfaceElevated,
  borderBottom: `1px solid ${theme.colors.border}`,
  flexShrink: 0,

  "@media (max-width: 768px)": {
    padding: theme.spacing[3],
  },
});

const HeaderLeft = styled.div({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing[3],
});

const BackButton = styled.button({
  width: "40px",
  height: "40px",
  borderRadius: theme.borderRadius.md,
  border: `1px solid ${theme.colors.border}`,
  backgroundColor: theme.colors.surface,
  color: theme.colors.textPrimary,
  fontSize: theme.typography.fontSize.lg,
  cursor: "pointer",
  transition: `all ${theme.transition.normal}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  "&:hover": {
    backgroundColor: theme.colors.surfaceHover,
    borderColor: theme.colors.accent,
  },

  "@media (max-width: 768px)": {
    width: "36px",
    height: "36px",
    fontSize: theme.typography.fontSize.base,
  },
});

const RoomInfo = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing[1],
});

const RoomName = styled.h1({
  fontSize: theme.typography.fontSize.xl,
  fontWeight: theme.typography.fontWeight.semibold,
  color: theme.colors.textPrimary,
  margin: 0,
  lineHeight: theme.typography.lineHeight.tight,

  "@media (max-width: 768px)": {
    fontSize: theme.typography.fontSize.lg,
  },
});

const HeaderRight = styled.div({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing[3],
});

const UserToggle = styled.button<{ $isActive: boolean }>(({ $isActive }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing[2],
  padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
  backgroundColor: $isActive ? theme.colors.accent : theme.colors.surface,
  color: $isActive ? "white" : theme.colors.textPrimary,
  border: `1px solid ${$isActive ? theme.colors.accent : theme.colors.border}`,
  borderRadius: theme.borderRadius.md,
  fontSize: theme.typography.fontSize.sm,
  fontWeight: theme.typography.fontWeight.medium,
  cursor: "pointer",
  transition: `all ${theme.transition.normal}`,

  "&:hover": {
    backgroundColor: $isActive
      ? theme.colors.accentHover
      : theme.colors.surfaceHover,
    borderColor: theme.colors.accent,
  },

  "@media (max-width: 768px)": {
    padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
    fontSize: theme.typography.fontSize.xs,
  },
}));

const UsersIcon = styled.span({
  fontSize: theme.typography.fontSize.base,

  "@media (max-width: 768px)": {
    fontSize: theme.typography.fontSize.sm,
  },
});

const UserCount = styled.span({
  fontSize: theme.typography.fontSize.sm,
  fontWeight: theme.typography.fontWeight.semibold,

  "@media (max-width: 768px)": {
    fontSize: theme.typography.fontSize.xs,
  },
});

const ChatBody = styled.div({
  flex: 1,
  display: "flex",
  overflow: "hidden",
  minHeight: 0,
});

const MessagesContainer = styled.div({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  minHeight: 0,
});

const MessagesWrapper = styled.div({
  flex: 1,
  overflowY: "auto",
  padding: theme.spacing[4],
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing[3],

  "@media (max-width: 768px)": {
    padding: theme.spacing[3],
    gap: theme.spacing[2],
  },
});

const EmptyMessages = styled.div({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  height: "100%",
  gap: theme.spacing[3],
});

const EmptyIcon = styled.div({
  fontSize: "3rem",
  marginBottom: theme.spacing[2],

  "@media (max-width: 768px)": {
    fontSize: "2.5rem",
  },
});

const EmptyText = styled.h3({
  fontSize: theme.typography.fontSize.lg,
  fontWeight: theme.typography.fontWeight.semibold,
  color: theme.colors.textPrimary,
  margin: 0,

  "@media (max-width: 768px)": {
    fontSize: theme.typography.fontSize.base,
  },
});

const EmptySubtext = styled.p({
  fontSize: theme.typography.fontSize.base,
  color: theme.colors.textSecondary,
  margin: 0,

  "@media (max-width: 768px)": {
    fontSize: theme.typography.fontSize.sm,
  },
});

const SystemMessage = styled.div<{ $type?: string }>(({ $type }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: theme.spacing[2],
  margin: `${theme.spacing[2]} 0`,
  padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
  borderRadius: theme.borderRadius.md,
  backgroundColor:
    $type === "join"
      ? `${theme.colors.success}15`
      : $type === "leave"
      ? `${theme.colors.error}15`
      : `${theme.colors.textMuted}15`,
  border: `1px solid ${
    $type === "join"
      ? `${theme.colors.success}30`
      : $type === "leave"
      ? `${theme.colors.error}30`
      : `${theme.colors.textMuted}30`
  }`,

  "@media (max-width: 768px)": {
    padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
    margin: `${theme.spacing[1]} 0`,
  },
}));

const SystemIcon = styled.span<{ $type?: string }>(({ $type }) => ({
  fontSize: theme.typography.fontSize.base,
  filter: $type === "leave" ? "grayscale(1)" : "none",

  "@media (max-width: 768px)": {
    fontSize: theme.typography.fontSize.sm,
  },
}));

const SystemText = styled.span({
  fontSize: theme.typography.fontSize.sm,
  color: theme.colors.textSecondary,
  fontWeight: theme.typography.fontWeight.medium,
  fontStyle: "italic",

  "@media (max-width: 768px)": {
    fontSize: theme.typography.fontSize.xs,
  },
});

const MessageGroup = styled.div<{ $isOwn: boolean }>(({ $isOwn }) => ({
  display: "flex",
  alignItems: "flex-start",
  gap: theme.spacing[3],
  justifyContent: $isOwn ? "flex-end" : "flex-start",
  marginBottom: theme.spacing[2],

  "@media (max-width: 768px)": {
    gap: theme.spacing[2],
    marginBottom: theme.spacing[1],
  },
}));

const MessageAvatar = styled.div({
  width: "36px",
  height: "36px",
  borderRadius: "50%",
  backgroundColor: theme.colors.accent,
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: theme.typography.fontSize.sm,
  fontWeight: theme.typography.fontWeight.semibold,
  flexShrink: 0,

  "@media (max-width: 768px)": {
    width: "32px",
    height: "32px",
    fontSize: theme.typography.fontSize.xs,
  },
});

const MessageContent = styled.div<{ $isOwn: boolean; $showAvatar: boolean }>(
  ({ $isOwn, $showAvatar }) => ({
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing[1],
    maxWidth: "70%",
    marginLeft: $isOwn ? "auto" : $showAvatar ? "0" : "48px",

    "@media (max-width: 768px)": {
      maxWidth: "80%",
      marginLeft: $isOwn ? "auto" : $showAvatar ? "0" : "40px",
    },
  })
);

const MessageHeader = styled.div<{ $isOwn: boolean }>(({ $isOwn }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing[2],
  justifyContent: $isOwn ? "flex-end" : "flex-start",
}));

const Username = styled.span<{ $isOwn: boolean }>(({ $isOwn }) => ({
  fontSize: theme.typography.fontSize.sm,
  fontWeight: theme.typography.fontWeight.semibold,
  color: $isOwn ? theme.colors.accent : theme.colors.textPrimary,

  "@media (max-width: 768px)": {
    fontSize: theme.typography.fontSize.xs,
  },
}));

const Timestamp = styled.span({
  fontSize: theme.typography.fontSize.xs,
  color: theme.colors.textMuted,

  "@media (max-width: 768px)": {
    display: "none",
  },
});

const MessageBubble = styled.div<{ $isOwn: boolean }>(({ $isOwn }) => ({
  padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
  borderRadius: theme.borderRadius.lg,
  backgroundColor: $isOwn ? theme.colors.accent : theme.colors.surfaceElevated,
  color: $isOwn ? "white" : theme.colors.textPrimary,
  fontSize: theme.typography.fontSize.base,
  lineHeight: theme.typography.lineHeight.relaxed,
  wordWrap: "break-word",
  border: `1px solid ${$isOwn ? theme.colors.accent : theme.colors.border}`,
  position: "relative",

  "&::before": $isOwn
    ? {
        content: '""',
        position: "absolute",
        top: "12px",
        right: "-6px",
        width: "12px",
        height: "12px",
        backgroundColor: theme.colors.accent,
        borderRight: `1px solid ${theme.colors.accent}`,
        borderBottom: `1px solid ${theme.colors.accent}`,
        transform: "rotate(-45deg)",
      }
    : {
        content: '""',
        position: "absolute",
        top: "12px",
        left: "-6px",
        width: "12px",
        height: "12px",
        backgroundColor: theme.colors.surfaceElevated,
        borderLeft: `1px solid ${theme.colors.border}`,
        borderTop: `1px solid ${theme.colors.border}`,
        transform: "rotate(-45deg)",
      },

  "@media (max-width: 768px)": {
    padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
    fontSize: theme.typography.fontSize.sm,
  },
}));

const UserListSidebar = styled.aside<{ $isVisible: boolean }>(
  ({ $isVisible }) => ({
    width: $isVisible ? "280px" : "0",
    backgroundColor: theme.colors.surfaceElevated,
    borderLeft: $isVisible ? `1px solid ${theme.colors.border}` : "none",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    transition: `width ${theme.transition.normal}`,

    "@media (max-width: 768px)": {
      width: $isVisible ? "240px" : "0",
    },
  })
);

const UserListHeader = styled.div({
  padding: theme.spacing[4],
  borderBottom: `1px solid ${theme.colors.border}`,
  display: "flex",
  alignItems: "center",
  gap: theme.spacing[2],

  "@media (max-width: 768px)": {
    padding: theme.spacing[3],
  },
});

const UserListTitle = styled.h3({
  fontSize: theme.typography.fontSize.base,
  fontWeight: theme.typography.fontWeight.semibold,
  color: theme.colors.textPrimary,
  margin: 0,

  "@media (max-width: 768px)": {
    fontSize: theme.typography.fontSize.sm,
  },
});

const UserListCount = styled.span({
  fontSize: theme.typography.fontSize.sm,
  color: theme.colors.textMuted,

  "@media (max-width: 768px)": {
    fontSize: theme.typography.fontSize.xs,
  },
});

const UserListContent = styled.div({
  flex: 1,
  overflowY: "auto",
  padding: theme.spacing[2],
});

const UserItem = styled.div<{ $isCurrentUser: boolean }>(
  ({ $isCurrentUser }) => ({
    display: "flex",
    alignItems: "center",
    gap: theme.spacing[3],
    padding: theme.spacing[3],
    borderRadius: theme.borderRadius.md,
    backgroundColor: $isCurrentUser ? theme.colors.surface : "transparent",
    border: $isCurrentUser
      ? `1px solid ${theme.colors.accent}`
      : "1px solid transparent",
    marginBottom: theme.spacing[1],

    "@media (max-width: 768px)": {
      padding: theme.spacing[2],
      gap: theme.spacing[2],
    },
  })
);

const UserAvatar = styled.div<{ $isCurrentUser: boolean }>(
  ({ $isCurrentUser }) => ({
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    backgroundColor: $isCurrentUser
      ? theme.colors.accent
      : theme.colors.surface,
    color: $isCurrentUser ? "white" : theme.colors.textPrimary,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    flexShrink: 0,

    "@media (max-width: 768px)": {
      width: "28px",
      height: "28px",
      fontSize: theme.typography.fontSize.xs,
    },
  })
);

const UserName = styled.span<{ $isCurrentUser: boolean }>(
  ({ $isCurrentUser }) => ({
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: $isCurrentUser ? theme.colors.accent : theme.colors.textPrimary,
    flex: 1,

    "@media (max-width: 768px)": {
      fontSize: theme.typography.fontSize.xs,
    },
  })
);

const UserStatus = styled.div({
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  backgroundColor: theme.colors.success,
  flexShrink: 0,

  "@media (max-width: 768px)": {
    width: "6px",
    height: "6px",
  },
});

const MessageInputContainer = styled.div({
  padding: theme.spacing[4],
  backgroundColor: theme.colors.surfaceElevated,
  borderTop: `1px solid ${theme.colors.border}`,
  flexShrink: 0,

  "@media (max-width: 768px)": {
    padding: theme.spacing[3],
  },
});

const InputWrapper = styled.div({
  display: "flex",
  gap: theme.spacing[3],
  alignItems: "flex-end",

  "@media (max-width: 768px)": {
    gap: theme.spacing[2],
  },
});

const MessageInput = styled.input({
  flex: 1,
  padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
  backgroundColor: theme.colors.surface,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: theme.borderRadius.lg,
  fontSize: theme.typography.fontSize.base,
  color: theme.colors.textPrimary,
  lineHeight: theme.typography.lineHeight.normal,
  transition: `border-color ${theme.transition.normal}, box-shadow ${theme.transition.normal}`,
  outline: "none",
  resize: "none",

  "&::placeholder": {
    color: theme.colors.textMuted,
  },

  "&:focus": {
    borderColor: theme.colors.borderFocus,
    boxShadow: `0 0 0 3px ${theme.colors.borderFocus}20`,
  },

  "&:disabled": {
    opacity: 0.5,
    cursor: "not-allowed",
  },

  "@media (max-width: 768px)": {
    padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
    fontSize: theme.typography.fontSize.sm,
  },
});

const SendButton = styled.button({
  width: "44px",
  height: "44px",
  borderRadius: theme.borderRadius.lg,
  border: "none",
  backgroundColor: theme.colors.accent,
  color: "white",
  cursor: "pointer",
  transition: `all ${theme.transition.normal}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,

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

  "@media (max-width: 768px)": {
    width: "40px",
    height: "40px",
  },
});

const SendIcon = styled.span({
  fontSize: theme.typography.fontSize.lg,
  fontWeight: theme.typography.fontWeight.bold,

  "@media (max-width: 768px)": {
    fontSize: theme.typography.fontSize.base,
  },
});
