import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { useAuth } from "@hooks/auth-context";
import { useWebSocket } from "@api/use-websocket";
import { useLoadChat } from "@api/chat/hooks";
import { Spinner } from "@components/spinner";

type User = {
  id: string;
  name: string;
  avatar?: string;
  role?: "owner" | "moderator" | "member";
  online?: boolean;
};

type Message = {
  id: string;
  userId: string;
  username: string;
  content: string;
  createdAt: string;
  isSystem?: boolean;
  systemType?: "join" | "leave" | "info";
};

type WSData = {
  type:
    | "message"
    | "user_list"
    | "system_message"
    | "suggestion"
    | "suggestion_error";
  subtype?: "join" | "leave";
  content: string | string[];
  username?: string;
  text?: string; // For suggestions
  error?: string; // For suggestion errors
};

export const ChatRoom = ({ onBack }: { onBack?: () => void }) => {
  const { roomId = "" } = useParams<{ roomId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: room, isLoading } = useLoadChat(Number(roomId));

  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  // Suggestion state
  const [suggestion, setSuggestion] = useState<string>("");
  const [suggestionVisible, setSuggestionVisible] = useState(false);
  const suggestionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const mirrorRef = useRef<HTMLDivElement | null>(null);

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
        console.log("Raw WebSocket data:", data);

        switch (data.type) {
          case "message": {
            const content = data.content as string;
            const colonIndex = content.indexOf(":");
            if (colonIndex !== -1) {
              const username = content.substring(0, colonIndex);
              const messageContent = content.substring(colonIndex + 1).trim();

              const newMessage: Message = {
                id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                userId: username === user?.username ? user.username : username,
                username,
                content: messageContent,
                createdAt: new Date().toISOString(),
                isSystem: false,
              };
              setMessages((prev) => [...prev, newMessage]);
            }
            break;
          }

          case "system_message": {
            const systemMessage: Message = {
              id: `sys-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              userId: "system",
              username: "System",
              content: data.content as string,
              createdAt: new Date().toISOString(),
              isSystem: true,
              systemType: data.subtype || "info",
            };
            setMessages((prev) => [...prev, systemMessage]);
            break;
          }

          case "user_list": {
            const userList = [...new Set(data.content as string[])];
            const newUsers: User[] = userList.map((username) => ({
              id: username,
              name: username,
              avatar: undefined,
              role: "member",
              online: true,
            }));
            setUsers(newUsers);
            break;
          }

          case "suggestion": {
            setSuggestion(data.text || "");
            setSuggestionVisible(true);
            break;
          }

          case "suggestion_error": {
            console.log("Suggestion failed:", data.error);
            setSuggestionVisible(false);
            break;
          }

          default:
            console.log("Unknown message type:", data);
        }
      },
      debug: import.meta.env.DEV,
    }
  );

  // Request suggestion function
  const requestSuggestion = useCallback(() => {
    if (input.trim().length > 0 && messages.length > 0) {
      const suggestionMessage = {
        type: "request_suggestion",
        current_input: input,
      };
      sendWsMessage(JSON.stringify(suggestionMessage));
    }
  }, [input, messages.length, sendWsMessage]);

  const acceptSuggestion = () => {
    setInput(input + suggestion);
    setSuggestionVisible(false);
    setSuggestion("");
  };

  // Handle input changes with suggestion logic
  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    setSuggestionVisible(false);
    setSuggestion("");

    // Clear existing timeout
    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current);
    }

    // Trigger suggestion when user has typed something and pauses
    if (e.target.value.trim().length > 0) {
      suggestionTimeoutRef.current = setTimeout(requestSuggestion, 2000);
    }
  };

  // Update mirror element content to match textarea for positioning
  useEffect(() => {
    if (mirrorRef.current) {
      // Copy the text content and add a zero-width space to measure position
      mirrorRef.current.textContent = input + "\u200B";
    }
  }, [input]);

  const grouped = useMemo(() => {
    const byDay: Record<string, Message[]> = {};
    for (const m of messages) {
      const k = new Date(m.createdAt).toDateString();
      (byDay[k] ||= []).push(m);
    }
    return Object.entries(byDay)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([day, msgs]) => {
        msgs.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        const runs: { userId: string; items: Message[] }[] = [];
        for (const m of msgs) {
          const last = runs[runs.length - 1];
          if (last && last.userId === m.userId && !m.isSystem) {
            last.items.push(m);
          } else {
            runs.push({ userId: m.userId, items: [m] });
          }
        }
        return { day, runs };
      });
  }, [messages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending || !isConnected) return;

    try {
      setSending(true);

      const message = {
        type: "chat_message",
        content: text,
      };

      sendWsMessage(JSON.stringify(message));
      setInput("");
      setSuggestionVisible(false);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab" && suggestionVisible) {
      e.preventDefault();
      acceptSuggestion();
    } else if (e.key === "Escape" && suggestionVisible) {
      setSuggestionVisible(false);
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isLoading) {
    return <Spinner />;
  }

  if (!room) {
    return <div>No room exists with this id</div>;
  }

  return (
    <Page>
      <TopBar>
        <TopBarInner>
          <IconButton
            aria-label="Back to Browse"
            onClick={() => (onBack ? onBack() : navigate("/join"))}
          >
            ←
          </IconButton>
          <RoomInfo>
            <RoomName>{room.name}</RoomName>
            <ConnectionStatus $isConnected={isConnected}>
              <StatusDot $isConnected={isConnected} />
              {isConnected ? "Connected" : "Disconnected"}
            </ConnectionStatus>
          </RoomInfo>
          <TopActions>
            <GhostButton
              onClick={() => setSidebarOpen((s) => !s)}
              aria-pressed={sidebarOpen}
              aria-label="Toggle members"
            >
              {sidebarOpen ? "Hide Members" : `Show Members (${users.length})`}
            </GhostButton>
          </TopActions>
        </TopBarInner>
      </TopBar>

      <MainArea>
        <ChatAndSidebar $open={sidebarOpen}>
          <ChatShell>
            <ChatScroll ref={scrollRef}>
              {messages.length === 0 ? (
                <EmptyMessages>
                  <EmptyIcon>💬</EmptyIcon>
                  <EmptyText>No messages yet</EmptyText>
                  <EmptySubtext>Start the conversation!</EmptySubtext>
                </EmptyMessages>
              ) : (
                grouped.map(({ day, runs }) => (
                  <section key={day} style={{ marginBottom: "var(--space-6)" }}>
                    <DateDivider>
                      <Hairline />
                      <DateChip>{formatDateLabel(day)}</DateChip>
                      <HairlineRight />
                    </DateDivider>

                    <RunStack>
                      {runs.map((run) => {
                        const firstMessage = run.items[0];
                        const u = users.find((x) => x.id === run.userId);

                        if (firstMessage.isSystem) {
                          return (
                            <SystemMessage
                              key={firstMessage.id}
                              $type={firstMessage.systemType}
                            >
                              <SystemIcon $type={firstMessage.systemType}>
                                {firstMessage.systemType === "join"
                                  ? "👋"
                                  : firstMessage.systemType === "leave"
                                  ? "👋"
                                  : "ℹ️"}
                              </SystemIcon>
                              <SystemText>{firstMessage.content}</SystemText>
                            </SystemMessage>
                          );
                        }

                        const isOwn = run.userId === user.username;

                        return (
                          <MessageRun key={firstMessage.id}>
                            <AvatarWrapper>
                              <Avatar
                                user={u || { id: run.userId, name: run.userId }}
                                size={36}
                              />
                            </AvatarWrapper>
                            <MessageCol>
                              <RunHeader>
                                <strong>
                                  {isOwn ? "You" : u?.name || run.userId}
                                </strong>
                                <RunTime>
                                  {new Date(
                                    firstMessage.createdAt
                                  ).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </RunTime>
                              </RunHeader>
                              <BubbleStack>
                                {run.items.map((m) => (
                                  <MessageBubble key={m.id}>
                                    {m.content}
                                  </MessageBubble>
                                ))}
                              </BubbleStack>
                            </MessageCol>
                          </MessageRun>
                        );
                      })}
                    </RunStack>
                  </section>
                ))
              )}
              <div ref={bottomRef} />
            </ChatScroll>
          </ChatShell>

          <SidebarContainer $open={sidebarOpen}>
            <SidebarHeader>
              <strong>Members</strong>
            </SidebarHeader>
            <SidebarSearch>
              <SearchIcon aria-hidden>🔎</SearchIcon>
              <SearchInput placeholder="Search members..." />
            </SidebarSearch>
            <MemberList>
              <MemberMeta>
                {users.filter((u) => u.online).length} online • {users.length}{" "}
                total
              </MemberMeta>
              {users.map((u) => (
                <MemberRow key={u.id}>
                  <Avatar user={u} size={24} />
                  <MemberText>
                    <MemberTop>
                      <MemberName title={u.name}>
                        {u.name === user.username ? `${u.name} (You)` : u.name}
                      </MemberName>
                      {u.role && <RolePill>{roleLabel(u.role)}</RolePill>}
                    </MemberTop>
                    <MemberSub>
                      <StatusDot $isConnected={Boolean(u.online)} />
                      {u.online ? "Online" : "Offline"}
                    </MemberSub>
                  </MemberText>
                </MemberRow>
              ))}
            </MemberList>
          </SidebarContainer>
        </ChatAndSidebar>
      </MainArea>

      <ComposerBar>
        <ComposerInner>
          <IconGhost title="Attach">📎</IconGhost>
          <ComposerInputContainer>
            {/* Hidden mirror element for accurate text measurement */}
            <MirrorElement ref={mirrorRef} />

            <ComposerInput
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={
                isConnected
                  ? "Message #room — Enter to send, Shift+Enter newline"
                  : "Disconnected - Cannot send messages"
              }
              disabled={!isConnected}
            />

            {suggestionVisible && suggestion && (
              <GhostTextOverlay>
                {/* Invisible text to position the suggestion correctly */}
                <InvisibleText>{input}</InvisibleText>
                <SuggestionText>{suggestion}</SuggestionText>
              </GhostTextOverlay>
            )}
          </ComposerInputContainer>
          <IconGhost title="Emoji">😊</IconGhost>
          <PrimaryButton
            disabled={!input.trim() || sending || !isConnected}
            onClick={handleSend}
          >
            {sending ? "Sending..." : "Send"}
          </PrimaryButton>
        </ComposerInner>
        <ComposerHints>
          <span>Enter to send</span>
          <span>•</span>
          <span>Shift+Enter for newline</span>
          {suggestionVisible && (
            <>
              <span>•</span>
              <span>Tab to accept suggestion</span>
            </>
          )}
        </ComposerHints>
      </ComposerBar>
    </Page>
  );
};

const ComposerInputContainer = styled.div({
  position: "relative",
  width: "100%",
});

// Hidden mirror element that matches textarea styling exactly
const MirrorElement = styled.div({
  position: "absolute",
  top: 0,
  left: 0,
  visibility: "hidden",
  pointerEvents: "none",
  whiteSpace: "pre-wrap",
  wordWrap: "break-word",
  // Match textarea styles exactly
  background: "var(--color-surface-elevated)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  width: "100%",
  height: "44px",
  padding: "10px 12px",
  fontSize: "var(--font-size-base)",
  fontFamily: "var(--font-family-primary)",
  lineHeight: "1.4",
  resize: "none",
});

// Overlay that contains both invisible text and suggestion
const GhostTextOverlay = styled.div({
  position: "absolute",
  top: "1px", // Account for border
  left: "1px", // Account for border
  width: "calc(100% - 2px)", // Account for left/right borders
  height: "calc(100% - 2px)", // Account for top/bottom borders
  pointerEvents: "none",
  padding: "10px 12px", // Match textarea padding exactly
  fontSize: "var(--font-size-base)",
  fontFamily: "var(--font-family-primary)",
  lineHeight: "1.4",
  whiteSpace: "pre-wrap",
  wordWrap: "break-word",
  overflow: "hidden",
  display: "flex",
  alignItems: "flex-start",
  boxSizing: "border-box", // Ensure padding is handled the same way
});

// Invisible text that takes up space to position suggestion
const InvisibleText = styled.span({
  color: "transparent",
  whiteSpace: "pre-wrap",
});

// The actual suggestion text
const SuggestionText = styled.span({
  color: "var(--color-text-muted)",
  opacity: 0.6,
  whiteSpace: "pre-wrap",
});

const Page = styled.div({
  height: "100vh",
  background: "var(--color-background)",
  color: "var(--color-text-primary)",
  fontFamily: "var(--font-family-primary)",
  display: "grid",
  gridTemplateRows: "auto 1fr auto",
  overflow: "hidden",
});

const TopBar = styled.header({
  position: "sticky",
  top: 0,
  zIndex: 1030,
  backdropFilter: "blur(8px)",
  borderBottom: "1px solid var(--color-border)",
  background:
    "linear-gradient(to bottom, rgba(11,11,24,0.85), rgba(11,11,24,0.6))",
});

const TopBarInner = styled.div({
  display: "grid",
  gridTemplateColumns: "auto 1fr auto",
  alignItems: "center",
  gap: "var(--space-4)",
  padding: "var(--space-4) var(--space-6)",
  maxWidth: 1280,
  margin: "0 auto",
});

const IconButton = styled.button({
  background: "var(--color-surface)",
  color: "var(--color-text-primary)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  padding: "8px 10px",
  cursor: "pointer",
  fontWeight: 700,
  boxShadow: "var(--shadow-sm)",
});

const RoomInfo = styled.div({
  display: "flex",
  flexDirection: "column",
});

const RoomName = styled.strong({
  fontSize: "var(--font-size-xl)",
  lineHeight: "var(--line-height-tight)",
});

const ConnectionStatus = styled.div<{ $isConnected: boolean }>(
  ({ $isConnected }) => ({
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    color: $isConnected ? "var(--color-success)" : "var(--color-error)",
    fontWeight: 600,
  })
);

const StatusDot = styled.div<{ $isConnected: boolean }>(({ $isConnected }) => ({
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  backgroundColor: $isConnected ? "var(--color-success)" : "var(--color-error)",
  flexShrink: 0,
}));

const TopActions = styled.div({
  display: "flex",
  gap: 8,
});

const GhostButton = styled.button({
  background: "transparent",
  color: "var(--color-text-secondary)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: 600,
});

const MainArea = styled.div({
  position: "relative",
  padding: "var(--space-6)",
  overflow: "hidden",
});

const ChatAndSidebar = styled.div<{ $open: boolean }>((p) => ({
  display: "grid",
  gridTemplateColumns: p.$open ? "1fr 280px" : "1fr 0px",
  gap: "var(--space-6)",
  height: "100%",
  transition: "grid-template-columns var(--transition-normal)",
}));

const ChatShell = styled.div({
  background: "var(--gradients-surface, var(--gradient-surface))",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-2xl)",
  boxShadow: "var(--shadow-md)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  height: "100%",
});

const ChatScroll = styled.div({
  padding: "var(--space-6)",
  overflowY: "auto",
  flex: 1,
  scrollBehavior: "smooth",
});

const EmptyMessages = styled.div({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  height: "100%",
  gap: "var(--space-3)",
});

const EmptyIcon = styled.div({
  fontSize: "3rem",
  marginBottom: "var(--space-2)",
});

const EmptyText = styled.h3({
  fontSize: "var(--font-size-lg)",
  fontWeight: 600,
  color: "var(--color-text-primary)",
  margin: 0,
});

const EmptySubtext = styled.p({
  fontSize: "var(--font-size-base)",
  color: "var(--color-text-secondary)",
  margin: 0,
});

const DateDivider = styled.div({
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  alignItems: "center",
  gap: 12,
  margin: "var(--space-4) 0 var(--space-3)",
});

const Hairline = styled.div({
  height: 1,
  background: "linear-gradient(to left, transparent, var(--color-border))",
});

const HairlineRight = styled.div({
  height: 1,
  background: "linear-gradient(to right, transparent, var(--color-border))",
});

const DateChip = styled.span({
  background: "var(--color-surface)",
  border: "1px solid var(--glass-stroke)",
  color: "var(--color-text-muted)",
  borderRadius: 999,
  padding: "2px 8px",
  fontSize: 11,
});

const RunStack = styled.div({
  display: "grid",
  gap: "var(--space-4)",
});

const SystemMessage = styled.div<{ $type?: string }>(({ $type }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "var(--space-2)",
  margin: "var(--space-2) 0",
  padding: "var(--space-2) var(--space-4)",
  borderRadius: "var(--radius-md)",
  backgroundColor:
    $type === "join"
      ? "rgba(34, 197, 94, 0.1)"
      : $type === "leave"
      ? "rgba(239, 68, 68, 0.1)"
      : "rgba(156, 163, 175, 0.1)",
  border: `1px solid ${
    $type === "join"
      ? "rgba(34, 197, 94, 0.3)"
      : $type === "leave"
      ? "rgba(239, 68, 68, 0.3)"
      : "rgba(156, 163, 175, 0.3)"
  }`,
}));

const SystemIcon = styled.span<{ $type?: string }>(({ $type }) => ({
  fontSize: "var(--font-size-base)",
  filter: $type === "leave" ? "grayscale(1)" : "none",
}));

const SystemText = styled.span({
  fontSize: "var(--font-size-sm)",
  color: "var(--color-text-secondary)",
  fontWeight: 500,
  fontStyle: "italic",
});

const MessageRun = styled.article({
  display: "grid",
  gridTemplateColumns: "40px 1fr",
  gap: 12,
});

const AvatarWrapper = styled.div({});

const MessageCol = styled.div({
  display: "grid",
  gap: 6,
});

const RunHeader = styled.div({
  display: "flex",
  alignItems: "baseline",
  gap: 8,
});

const RunTime = styled.span({
  color: "var(--color-text-muted)",
  fontSize: 12,
});

const BubbleStack = styled.div({
  display: "grid",
  gap: 6,
});

const MessageBubble = styled.div({
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  padding: "10px 12px",
  color: "var(--color-text-primary)",
  lineHeight: 1.6,
  boxShadow: "var(--shadow-sm)",
});

const SidebarContainer = styled.aside<{ $open: boolean }>((p) => ({
  width: p.$open ? 280 : 0,
  border: p.$open ? "1px solid var(--color-border)" : "none",
  background: "var(--color-surface)",
  borderRadius: "var(--radius-2xl)",
  boxShadow: p.$open ? "var(--shadow-md)" : "none",
  overflow: "hidden",
  display: "grid",
  gridTemplateRows: "auto auto 1fr",
  minHeight: "100%",
  pointerEvents: p.$open ? "auto" : "none",
  transition:
    "width var(--transition-normal), box-shadow var(--transition-normal), border var(--transition-normal)",
}));

const SidebarHeader = styled.div({
  padding: "10px 12px",
  borderBottom: "1px solid var(--color-border)",
  display: "flex",
  alignItems: "center",
  gap: 10,
});

const SidebarSearch = styled.div({
  position: "relative",
  padding: "8px 12px",
  borderBottom: "1px solid var(--color-border)",
});

const SearchIcon = styled.span({
  position: "absolute",
  left: 18,
  top: 14,
  color: "var(--color-text-muted)",
  fontSize: 14,
});

const SearchInput = styled.input({
  width: "100%",
  height: 36,
  background: "var(--color-surface-elevated)",
  border: "1px solid var(--color-border)",
  color: "var(--color-text-primary)",
  borderRadius: "var(--radius-md)",
  padding: "8px 10px 8px 32px",
  outline: "none",
});

const MemberList = styled.div({
  overflowY: "auto",
  padding: "6px 8px 10px",
});

const MemberMeta = styled.div({
  color: "var(--color-text-muted)",
  fontSize: 12,
  padding: "4px 6px",
  marginBottom: 4,
});

const MemberRow = styled.div({
  display: "grid",
  gridTemplateColumns: "28px 1fr",
  gap: 8,
  alignItems: "center",
  padding: 8,
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--color-border)",
  background: "var(--color-surface-elevated)",
  marginBottom: 6,
  minHeight: 44,
});

const MemberText = styled.div({
  minWidth: 0,
});

const MemberTop = styled.div({
  display: "flex",
  alignItems: "center",
  gap: 6,
  minWidth: 0,
});

const MemberName = styled.span({
  fontWeight: 600,
  fontSize: 13,
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
  overflow: "hidden",
});

const RolePill = styled.span({
  background: "var(--color-surface-hover)",
  border: "1px solid var(--color-border)",
  color: "var(--color-text-secondary)",
  borderRadius: 999,
  padding: "1px 6px",
  fontSize: 10,
});

const MemberSub = styled.span({
  color: "var(--color-text-muted)",
  fontSize: 11,
  display: "inline-flex",
  gap: 6,
  alignItems: "center",
});

const ComposerBar = styled.div({
  position: "sticky",
  bottom: 0,
  zIndex: 1020,
  borderTop: "1px solid var(--color-border)",
  background:
    "linear-gradient(to top, rgba(11,11,24,0.9), rgba(11,11,24,0.75))",
  backdropFilter: "blur(8px)",
});

const ComposerInner = styled.div({
  maxWidth: 1280,
  margin: "0 auto",
  padding: "var(--space-4) var(--space-6)",
  display: "grid",
  gridTemplateColumns: "auto 1fr auto auto",
  gap: 8,
  alignItems: "center",
});

const IconGhost = styled.button({
  background: "transparent",
  color: "var(--color-text-secondary)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  padding: "8px 10px",
  cursor: "pointer",
  fontWeight: 600,
  lineHeight: 1,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
});

const ComposerInput = styled.textarea({
  background: "var(--color-surface-elevated)",
  border: "1px solid var(--color-border)",
  color: "var(--color-text-primary)",
  borderRadius: "var(--radius-md)",
  resize: "none",
  width: "100%",
  height: 44,
  padding: "10px 12px",
  outline: "none",
  fontSize: "var(--font-size-base)",
  fontFamily: "var(--font-family-primary)",
  lineHeight: "1.4",

  "&:disabled": {
    opacity: 0.5,
    cursor: "not-allowed",
  },
});

const PrimaryButton = styled.button<{ disabled?: boolean }>((p) => ({
  background: "var(--gradient-accent)",
  color: "#0b1020",
  border: "none",
  borderRadius: "var(--radius-md)",
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: 700,
  boxShadow: "var(--shadow-sm)",
  opacity: p.disabled ? 0.7 : 1,
  pointerEvents: p.disabled ? "none" : "auto",
}));

const ComposerHints = styled.div({
  maxWidth: 1280,
  margin: "4px auto 0",
  padding: "0 var(--space-6) var(--space-4)",
  display: "flex",
  gap: 12,
  color: "var(--color-text-muted)",
  fontSize: "var(--font-size-sm)",
});

/* Avatar component */
function Avatar({ user, size = 28 }: { user?: User; size?: number }) {
  const initials =
    user?.name
      ?.split(" ")
      .map((s) => s[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "?";
  const hasImg = !!user?.avatar?.startsWith("http");

  return (
    <AvatarBox
      style={{ width: size, height: size, fontSize: size * 0.35 }}
      title={user?.name}
    >
      {hasImg ? (
        <img
          src={user!.avatar}
          alt={user?.name}
          width={size}
          height={size}
          style={{ objectFit: "cover", width: "100%", height: "100%" }}
        />
      ) : (
        <DefaultAvatarIcon style={{ fontSize: size * 0.5 }}>
          {initials}
        </DefaultAvatarIcon>
      )}
      {user?.online && <OnlineDot />}
    </AvatarBox>
  );
}

const AvatarBox = styled.div({
  borderRadius: "50%",
  overflow: "hidden",
  border: "1px solid var(--glass-stroke)",
  background:
    "linear-gradient(135deg, var(--color-accent), var(--color-accent-hover))",
  display: "grid",
  placeItems: "center",
  color: "white",
  fontWeight: 700,
  position: "relative",
});

const DefaultAvatarIcon = styled.div({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  height: "100%",
  fontWeight: 700,
  color: "white",
});

const OnlineDot = styled.span({
  position: "absolute",
  right: -1,
  bottom: -1,
  width: 10,
  height: 10,
  borderRadius: "50%",
  background: "var(--color-success)",
  border: "2px solid var(--color-surface)",
});

/* Helper functions */
function roleLabel(role: User["role"]) {
  if (role === "owner") return "Owner";
  if (role === "moderator") return "Mod";
  return "Member";
}

function formatDateLabel(dayStr: string) {
  const d = new Date(dayStr);
  const today = new Date();
  const todayKey = today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (dayStr === todayKey) return "Today";
  if (dayStr === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
