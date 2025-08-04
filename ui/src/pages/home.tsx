import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import styled from "styled-components";

import {
  useLoadChatList,
  useCreateChat,
  useLoadChatListByName,
} from "@api/chat/hooks";
import { useAuth } from "@hooks/auth-context";
import type { Chat } from "@api/chat/request";
import { useWebSocket } from "@api/use-websocket";
import { Spinner } from "@components/spinner";

type ChatVisibility = "public" | "private";
type SortBy = "recent" | "members" | "name";

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

export const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const getTabFromUrl = (): "create" | "browse" | "join" => {
    const tab = searchParams.get("tab");
    if (tab === "browse" || tab === "join" || tab === "create") {
      return tab;
    }
    return "create";
  };

  const [activeTab, setActiveTab] = useState<"create" | "browse" | "join">(
    getTabFromUrl
  );

  const handleTabChange = (tab: "create" | "browse" | "join") => {
    setActiveTab(tab);
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("tab", tab);
    setSearchParams(newSearchParams);
  };

  useEffect(() => {
    const urlTab = getTabFromUrl();
    if (urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const [chats, setChats] = useState<Chat[]>([]);
  const { data, isLoading } = useLoadChatList();
  const createChat = useCreateChat();

  const [roomId, setRoomId] = useState("");
  const [searchQuery, setSearchQuery] = useState(""); // This triggers the actual search
  const [searchResults, setSearchResults] = useState<Chat[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Only search when searchQuery is set (manually triggered)
  const shouldSearch =
    searchQuery.trim().length > 0 && !/^\d+$/.test(searchQuery.trim());
  const {
    data: searchData,
    isLoading: isLoadingSearch,
    error: searchApiError,
  } = useLoadChatListByName(searchQuery.trim(), shouldSearch);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<ChatVisibility>("public");
  const [tags, setTags] = useState("");
  const [requireApproval, setRequireApproval] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("recent");

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

  // Handle search results
  useEffect(() => {
    if (searchData) {
      setSearchResults(searchData);
      setSearchError(null);

      // If exactly one result, auto-navigate
      if (searchData.length === 1) {
        navigate(`/chat/${searchData[0].id}`);
      } else if (searchData.length === 0) {
        setSearchError(`No rooms found matching "${searchQuery.trim()}"`);
      }
    } else if (searchApiError) {
      setSearchError("Failed to search chats. Please try again.");
      setSearchResults([]);
    }
  }, [searchData, searchApiError, navigate, searchQuery]);

  const handleJoinRoom = () => {
    const trimmedRoomId = roomId.trim();
    if (!trimmedRoomId) return;

    // If it's a number, treat as direct room ID
    if (/^\d+$/.test(trimmedRoomId)) {
      navigate(`/chat/${trimmedRoomId}`);
      return;
    }

    // Otherwise, trigger search
    setSearchQuery(trimmedRoomId);
    setSearchResults([]);
    setSearchError(null);
  };

  const handleRoomIdChange = (value: string) => {
    setRoomId(value);
    // Clear results when user starts typing again
    if (searchResults.length > 0 || searchError) {
      setSearchResults([]);
      setSearchError(null);
      setSearchQuery(""); // Clear search query to stop any ongoing requests
    }
  };

  const handleJoinSpecificChat = (chatId: number) => {
    navigate(`/chat/${chatId}`);
  };

  const handleQuickJoinKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleJoinRoom();
    }
  };

  const canSubmit = name.trim().length >= 3 && description.trim().length >= 10;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!canSubmit) {
      setError("Please provide a longer name and description.");
      return;
    }

    setIsCreating(true);
    try {
      const { id } = await createChat.mutateAsync({
        name: name.trim(),
        ownerId: user.id,
      });
      navigate(`/chat/${id}`);
    } catch (error) {
      console.error("Failed to create chat:", error);
      setError("Failed to create chat. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleCreate(e);
    }
  };

  const filtered = useMemo(() => {
    let list = chats.slice();
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.description && r.description.toLowerCase().includes(q))
      );
    }
    switch (sortBy) {
      case "members":
        list.sort((a, b) => (b.activeUsers || 0) - (a.activeUsers || 0));
        break;
      case "name":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        list.sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
        );
    }
    return list;
  }, [chats, query, sortBy]);

  if (isLoading) {
    return <Spinner />;
  }

  if (!user) {
    return null;
  }

  return (
    <Page>
      <BackgroundTexture />
      <Container>
        <HeaderHero />

        <Tabs active={activeTab} onChange={handleTabChange} />

        <ContentSection>
          {activeTab === "create" && (
            <CreateForm
              name={name}
              setName={setName}
              description={description}
              setDescription={setDescription}
              visibility={visibility}
              setVisibility={setVisibility}
              tags={tags}
              setTags={setTags}
              requireApproval={requireApproval}
              setRequireApproval={setRequireApproval}
              canSubmit={canSubmit}
              isCreating={isCreating}
              error={error}
              setError={setError}
              onSubmit={handleCreate}
              onKeyPress={handleCreateKeyPress}
            />
          )}

          {activeTab === "join" && (
            <QuickJoinSection>
              <SectionTitle>Quick Join</SectionTitle>
              <QuickJoinForm>
                <InputGroup>
                  <Input
                    type="text"
                    placeholder="Enter room ID or room name"
                    value={roomId}
                    onChange={(e) => handleRoomIdChange(e.target.value)}
                    onKeyUp={handleQuickJoinKeyPress}
                  />
                  <JoinButton
                    onClick={handleJoinRoom}
                    disabled={!roomId.trim() || isLoadingSearch}
                  >
                    {isLoadingSearch ? (
                      <>
                        <Spinner />
                        Searching...
                      </>
                    ) : (
                      "Join Room"
                    )}
                  </JoinButton>
                </InputGroup>

                {searchError && (
                  <ErrorAlert role="alert">{searchError}</ErrorAlert>
                )}

                {searchResults.length > 1 && (
                  <SearchResultsSection>
                    <SearchResultsTitle>
                      Found {searchResults.length} rooms matching "
                      {searchQuery.trim()}"
                    </SearchResultsTitle>
                    <SearchResultsGrid>
                      {searchResults.map((chat) => (
                        <SearchResultCard
                          key={chat.id}
                          chat={chat}
                          onJoin={() => handleJoinSpecificChat(chat.id)}
                        />
                      ))}
                    </SearchResultsGrid>
                  </SearchResultsSection>
                )}
              </QuickJoinForm>
            </QuickJoinSection>
          )}

          {activeTab === "browse" && (
            <BrowseRooms
              chats={filtered}
              query={query}
              setQuery={setQuery}
              sortBy={sortBy}
              setSortBy={setSortBy}
              onJoinRoom={(chatId) => navigate(`/chat/${chatId}`)}
            />
          )}
        </ContentSection>
      </Container>
    </Page>
  );
};

function HeaderHero() {
  return (
    <HeroSection>
      <HeroContent>
        <HeroTitle>Create a room, spark a conversation</HeroTitle>
        <HeroSubtitle>
          Set up a new chat room for your community or browse trending rooms and
          jump in. Minimal friction, maximum flow.
        </HeroSubtitle>
      </HeroContent>
      <HeroCard />
    </HeroSection>
  );
}

function HeroCard() {
  return (
    <HeroCardContainer>
      <LiveUsersIndicator>
        <OnlinePulse />
        <span>Live users now</span>
        <strong>1,284</strong>
      </LiveUsersIndicator>
      <ProgressBar>
        <ProgressFill />
      </ProgressBar>
      <TagsList>
        {["React", "AI", "Rust", "Product", "Design"].map((t) => (
          <TagChip key={t}>{t}</TagChip>
        ))}
      </TagsList>
    </HeroCardContainer>
  );
}

function Tabs(props: {
  active: "create" | "browse" | "join";
  onChange: (tab: "create" | "browse" | "join") => void;
}) {
  const { active, onChange } = props;
  return (
    <TabsContainer role="tablist" aria-label="Create, Join, or Browse">
      <TabButton
        label="Create Chat"
        active={active === "create"}
        onClick={() => onChange("create")}
      />
      <TabButton
        label="Quick Join"
        active={active === "join"}
        onClick={() => onChange("join")}
      />
      <TabButton
        label="Browse Chats"
        active={active === "browse"}
        onClick={() => onChange("browse")}
      />
    </TabsContainer>
  );
}

function TabButton(props: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const { label, active, onClick } = props;
  return (
    <TabButtonElement
      role="tab"
      aria-selected={active}
      onClick={onClick}
      $active={active}
    >
      {label}
    </TabButtonElement>
  );
}

function CreateForm(props: {
  name: string;
  setName: (name: string) => void;
  description: string;
  setDescription: (desc: string) => void;
  visibility: ChatVisibility;
  setVisibility: (vis: ChatVisibility) => void;
  tags: string;
  setTags: (tags: string) => void;
  requireApproval: boolean;
  setRequireApproval: (req: boolean) => void;
  canSubmit: boolean;
  isCreating: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  onSubmit: (e: React.FormEvent) => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
}) {
  const {
    name,
    setName,
    description,
    setDescription,
    visibility,
    setVisibility,
    tags,
    setTags,
    requireApproval,
    setRequireApproval,
    canSubmit,
    isCreating,
    error,
    setError,
    onSubmit,
    onKeyPress,
  } = props;

  const resetForm = () => {
    setName("");
    setDescription("");
    setTags("");
    setVisibility("public");
    setRequireApproval(false);
    setError(null);
  };

  return (
    <FormContainer onSubmit={onSubmit}>
      <FormGroup>
        <Label htmlFor="room-name">Room name</Label>
        <Input
          id="room-name"
          type="text"
          placeholder="e.g., Frontend Wizards"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyPress={onKeyPress}
        />
        <Hint>At least 3 characters. Make it descriptive.</Hint>
      </FormGroup>

      <FormGroup>
        <Label htmlFor="room-desc">Description</Label>
        <TextArea
          id="room-desc"
          placeholder="What is this room about? Who should join?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
        />
        <Hint>At least 10 characters.</Hint>
      </FormGroup>

      <FormRow>
        <FormGroup>
          <Label>Visibility</Label>
          <ToggleGroup>
            <TogglePill
              $active={visibility === "public"}
              onClick={() => setVisibility("public")}
            >
              Public
            </TogglePill>
            <TogglePill
              $active={visibility === "private"}
              onClick={() => setVisibility("private")}
            >
              Private
            </TogglePill>
          </ToggleGroup>
          <Hint>
            Public rooms are discoverable. Private rooms require invites.
          </Hint>
        </FormGroup>

        <FormGroup>
          <Label htmlFor="room-tags">Tags</Label>
          <Input
            id="room-tags"
            type="text"
            placeholder="react, ui, performance"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
          <Hint>Comma-separated. Helps others find your room.</Hint>
        </FormGroup>
      </FormRow>

      <CheckboxSection>
        <input
          id="approval"
          type="checkbox"
          checked={requireApproval}
          onChange={(e) => setRequireApproval(e.target.checked)}
          style={{
            width: 18,
            height: 18,
            accentColor: "var(--color-accent)",
            cursor: "pointer",
          }}
        />
        <label htmlFor="approval">Require approval to join</label>
        <span style={{ marginLeft: "auto" }}>Reduce noise in busy rooms</span>
      </CheckboxSection>

      {error && <ErrorAlert role="alert">{error}</ErrorAlert>}

      <FormActions>
        <PrimaryButton
          type="submit"
          disabled={!canSubmit || isCreating}
          $disabled={!canSubmit || isCreating}
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
        </PrimaryButton>
        <SecondaryButton type="button" onClick={resetForm}>
          Reset
        </SecondaryButton>
      </FormActions>
    </FormContainer>
  );
}

function BrowseRooms(props: {
  chats: Chat[];
  query: string;
  setQuery: (query: string) => void;
  sortBy: SortBy;
  setSortBy: (sort: SortBy) => void;
  onJoinRoom: (chatId: number) => void;
}) {
  const { chats, query, setQuery, sortBy, setSortBy, onJoinRoom } = props;

  return (
    <BrowseContainer>
      <BrowseControls>
        <SearchWrapper>
          <SearchInput
            type="text"
            placeholder="Search rooms, topics, or tags..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <SearchIcon>🔎</SearchIcon>
        </SearchWrapper>

        <SortSelect
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
        >
          <option value="recent">Sort: Recent</option>
          <option value="members">Sort: Members</option>
          <option value="name">Sort: Name</option>
        </SortSelect>
      </BrowseControls>

      {chats.length === 0 ? (
        <EmptyState>
          <EmptyIcon>💬</EmptyIcon>
          <EmptyTitle>No active rooms</EmptyTitle>
          <EmptyDescription>
            Be the first to create a chat room and start the conversation!
          </EmptyDescription>
        </EmptyState>
      ) : (
        <RoomGrid>
          {chats.map((chat) => (
            <RoomCard
              key={chat.id}
              chat={chat}
              onJoin={() => onJoinRoom(chat.id)}
            />
          ))}
        </RoomGrid>
      )}
    </BrowseContainer>
  );
}

function RoomCard({ chat, onJoin }: { chat: Chat; onJoin: () => void }) {
  const online = chat.activeUsers || 0;

  return (
    <RoomCardContainer role="article" aria-label={`${chat.name} room`}>
      <RoomHeader>
        <RoomAvatar aria-hidden />
        <RoomHeadText>
          <RoomName title={chat.name}>{chat.name}</RoomName>
          <RoomMetaRow>
            <MetaItem title={`${online} online`}>
              <Dot aria-hidden />
              <span>{online} online</span>
            </MetaItem>
          </RoomMetaRow>
        </RoomHeadText>

        <OnlinePill title={`${online} online`}>
          <PillDot aria-hidden />
          <span>{online}</span>
        </OnlinePill>
      </RoomHeader>

      {chat.description && (
        <RoomDescriptionClamp title={chat.description}>
          {chat.description}
        </RoomDescriptionClamp>
      )}

      <RoomFooter>
        <SecondaryButton type="button">View</SecondaryButton>
        <PrimaryButton type="button" onClick={onJoin}>
          Join
        </PrimaryButton>
      </RoomFooter>
    </RoomCardContainer>
  );
}

function SearchResultCard({
  chat,
  onJoin,
}: {
  chat: Chat;
  onJoin: () => void;
}) {
  const online = chat.activeUsers || 0;

  return (
    <SearchResultCardContainer role="article" aria-label={`${chat.name} room`}>
      <SearchResultHeader>
        <SearchResultAvatar aria-hidden />
        <SearchResultText>
          <SearchResultName title={chat.name}>{chat.name}</SearchResultName>
          <SearchResultMeta>
            <MetaItem title={`${online} online`}>
              <Dot aria-hidden />
              <span>{online} online</span>
            </MetaItem>
          </SearchResultMeta>
        </SearchResultText>
        <PrimaryButton type="button" onClick={onJoin}>
          Join
        </PrimaryButton>
      </SearchResultHeader>

      {chat.description && (
        <SearchResultDescription title={chat.description}>
          {chat.description}
        </SearchResultDescription>
      )}
    </SearchResultCardContainer>
  );
}

function BackgroundTexture() {
  return <BackgroundDiv aria-hidden />;
}

// Styled Components
const Page = styled.div({
  minHeight: "100vh",
  background: "var(--color-background)",
  color: "var(--color-text-primary)",
  fontFamily: "var(--font-family-primary)",
});

const BackgroundDiv = styled.div({
  position: "fixed",
  inset: 0,
  zIndex: -1,
  background: `
    radial-gradient(1000px 600px at 80% -10%, rgba(58,142,239,0.08), transparent 60%), 
    radial-gradient(700px 400px at 10% 110%, rgba(122,92,255,0.08), transparent 60%)
  `,
});

const Container = styled.main({
  maxWidth: 1120,
  margin: "0 auto",
  padding: "var(--space-12) var(--space-6)",
});

const HeroSection = styled.div({
  background: "var(--gradients-surface, var(--gradient-surface))",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-2xl)",
  boxShadow: "var(--shadow-lg)",
  overflow: "hidden",
  position: "relative",
  padding: "var(--space-10)",
  display: "grid",
  gridTemplateColumns: "1.2fr 1fr",
  gap: "var(--space-8)",

  "&::before": {
    content: '""',
    position: "absolute",
    inset: 0,
    background: "var(--glass-overlay)",
    pointerEvents: "none",
  },
});

const HeroContent = styled.div({
  zIndex: 1,
});

const HeroTitle = styled.h1({
  fontSize: "var(--font-size-4xl)",
  lineHeight: "var(--line-height-tight)",
  margin: 0,
});

const HeroSubtitle = styled.p({
  color: "var(--color-text-secondary)",
  marginTop: "var(--space-4)",
  fontSize: "var(--font-size-lg)",
  margin: 0,
});

const HeroCardContainer = styled.div({
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-xl)",
  padding: "var(--space-6)",
  display: "grid",
  gap: "var(--space-4)",
  alignContent: "start",
  zIndex: 1,
});

const LiveUsersIndicator = styled.div({
  display: "flex",
  alignItems: "center",
  gap: 12,
});

const OnlinePulse = styled.span({
  width: 10,
  height: 10,
  borderRadius: "50%",
  background: "var(--color-success)",
  boxShadow: "0 0 0 6px rgba(16,185,129,0.15)",
});

const ProgressBar = styled.div({
  height: 8,
  background: "var(--color-surface-elevated)",
  borderRadius: 999,
  overflow: "hidden",
});

const ProgressFill = styled.div({
  width: "68%",
  height: "100%",
  background: "var(--gradient-accent)",
});

const TagsList = styled.div({
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
});

const TagChip = styled.span({
  background: "var(--glass-overlay)",
  border: "1px solid var(--glass-stroke)",
  color: "var(--color-text-secondary)",
  borderRadius: 999,
  padding: "4px 10px",
  fontSize: 12,
});

const TabsContainer = styled.div({
  display: "inline-flex",
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  padding: 4,
  boxShadow: "var(--shadow-sm)",
});

const TabButtonElement = styled.button<{ $active?: boolean }>(
  ({ $active }) => ({
    padding: "10px 14px",
    borderRadius: "var(--radius-md)",
    border: "none",
    cursor: "pointer",
    background: $active ? "var(--gradient-accent)" : "transparent",
    color: $active ? "#0b1020" : "var(--color-text-secondary)",
    fontWeight: 600,
    transition: "var(--transition-normal)",
  })
);

const ContentSection = styled.section({
  marginTop: "var(--space-8)",
});

const QuickJoinSection = styled.section({
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-2xl)",
  boxShadow: "var(--shadow-md)",
  padding: "var(--space-8)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-6)",
});

const SectionTitle = styled.h2({
  fontSize: "var(--font-size-xl)",
  fontWeight: 600,
  color: "var(--color-text-primary)",
  margin: 0,
  lineHeight: "var(--line-height-tight)",
});

const QuickJoinForm = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-4)",
});

const InputGroup = styled.div({
  display: "flex",
  gap: "var(--space-3)",
  flexWrap: "wrap",

  "@media (max-width: 640px)": {
    flexDirection: "column",
  },
});

const Input = styled.input({
  background: "var(--color-surface-elevated)",
  border: "1px solid var(--color-border)",
  color: "var(--color-text-primary)",
  borderRadius: "var(--radius-md)",
  padding: "12px 12px",
  outline: "none",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
  flex: 1,
  minWidth: "200px",
  fontSize: "var(--font-size-base)",
  lineHeight: "var(--line-height-normal)",
  transition:
    "border-color var(--transition-normal), box-shadow var(--transition-normal)",

  "&::placeholder": {
    color: "var(--color-text-muted)",
  },

  "&:focus": {
    borderColor: "var(--color-border-focus)",
    boxShadow: "0 0 0 3px rgba(58,142,239,0.2)",
  },

  "&:hover:not(:focus)": {
    borderColor: "var(--color-text-muted)",
  },
});

const JoinButton = styled.button<{ disabled?: boolean }>(({ disabled }) => ({
  background: "var(--gradient-accent)",
  color: "#0b1020",
  border: "none",
  borderRadius: "var(--radius-md)",
  padding: "12px 16px",
  cursor: "pointer",
  fontWeight: 700,
  boxShadow: "var(--shadow-sm)",
  whiteSpace: "nowrap",
  fontSize: "var(--font-size-base)",
  lineHeight: "var(--line-height-normal)",
  transition:
    "background-color var(--transition-normal), transform var(--transition-fast)",
  opacity: disabled ? 0.5 : 1,
  pointerEvents: disabled ? "none" : "auto",
  display: "flex",
  alignItems: "center",
  gap: "var(--space-2)",

  "&:hover:not(:disabled)": {
    transform: "translateY(-1px)",
  },

  "&:active:not(:disabled)": {
    transform: "translateY(0)",
  },
}));

const FormContainer = styled.form({
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "var(--space-6)",
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-2xl)",
  boxShadow: "var(--shadow-md)",
  padding: "var(--space-8)",
});

const FormGroup = styled.div({
  display: "grid",
  gap: 8,
});

const FormRow = styled.div({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "var(--space-6)",
});

const Label = styled.label({
  color: "var(--color-text-secondary)",
  fontWeight: 600,
});

const TextArea = styled.textarea({
  background: "var(--color-surface-elevated)",
  border: "1px solid var(--color-border)",
  color: "var(--color-text-primary)",
  borderRadius: "var(--radius-md)",
  padding: "12px 12px",
  outline: "none",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
  resize: "vertical",
  lineHeight: 1.6,
  fontFamily: "inherit",

  "&::placeholder": {
    color: "var(--color-text-muted)",
  },

  "&:focus": {
    borderColor: "var(--color-border-focus)",
    boxShadow: "0 0 0 3px rgba(58,142,239,0.2)",
  },

  "&:hover:not(:focus)": {
    borderColor: "var(--color-text-muted)",
  },
});

const Hint = styled.small({
  color: "var(--color-text-muted)",
  fontSize: "var(--font-size-sm)",
});

const ToggleGroup = styled.div({
  display: "flex",
  gap: 8,
});

const TogglePill = styled.button<{ $active?: boolean }>(({ $active }) => ({
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid var(--color-border)",
  background: $active ? "var(--color-surface-hover)" : "transparent",
  color: $active ? "var(--color-text-primary)" : "var(--color-text-muted)",
  cursor: "pointer",
  transition: "var(--transition-fast)",
}));

const CheckboxSection = styled.div({
  background: "var(--color-surface-elevated)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-xl)",
  padding: "var(--space-5)",
  display: "flex",
  alignItems: "center",
  gap: 12,
  color: "var(--color-text-primary)",

  "& span": {
    color: "var(--color-text-muted)",
  },
});

const ErrorAlert = styled.div({
  background: "rgba(239, 68, 68, 0.12)",
  border: "1px solid var(--color-error)",
  color: "#ffd7d7",
  borderRadius: "var(--radius-md)",
  padding: "12px 14px",
});

const FormActions = styled.div({
  display: "flex",
  gap: 12,
});

const PrimaryButton = styled.button<{ $disabled?: boolean }>(
  ({ $disabled }) => ({
    background: "var(--gradient-accent)",
    color: "#0b1020",
    border: "none",
    borderRadius: "var(--radius-md)",
    padding: "12px 16px",
    cursor: "pointer",
    fontWeight: 700,
    boxShadow: "var(--shadow-sm)",
    display: "flex",
    alignItems: "center",
    gap: "var(--space-2)",
    opacity: $disabled ? 0.7 : 1,
    pointerEvents: $disabled ? "none" : "auto",
  })
);

const SecondaryButton = styled.button({
  background: "var(--color-surface-elevated)",
  color: "var(--color-text-primary)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  padding: "12px 16px",
  cursor: "pointer",
  fontWeight: 600,
});

const CreateIcon = styled.span({
  fontSize: "var(--font-size-lg)",
});

const BrowseContainer = styled.div({
  display: "grid",
  gap: "var(--space-6)",
});

const BrowseControls = styled.div({
  display: "grid",
  gridTemplateColumns: "1fr auto auto",
  gap: "var(--space-4)",
  alignItems: "center",
});

const SearchWrapper = styled.div({
  position: "relative",
});

const SearchInput = styled.input({
  background: "var(--color-surface-elevated)",
  border: "1px solid var(--color-border)",
  color: "var(--color-text-primary)",
  borderRadius: "var(--radius-md)",
  padding: "12px 12px 12px 40px",
  outline: "none",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
  width: "100%",
});

const SearchIcon = styled.span({
  position: "absolute",
  left: 12,
  top: 10,
  color: "var(--color-text-muted)",
  fontSize: 18,
});

const SortSelect = styled.select({
  background: "var(--color-surface-elevated)",
  border: "1px solid var(--color-border)",
  color: "var(--color-text-primary)",
  borderRadius: "var(--radius-md)",
  padding: "12px 32px 12px 12px",
  outline: "none",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
  cursor: "pointer",
  width: 180,
});

const EmptyState = styled.div({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  padding: "var(--space-12)",
  gap: "var(--space-4)",
});

const EmptyIcon = styled.div({
  fontSize: "4rem",
  marginBottom: "var(--space-2)",
});

const EmptyTitle = styled.h3({
  fontSize: "var(--font-size-2xl)",
  fontWeight: 600,
  color: "var(--color-text-primary)",
  margin: 0,
});

const EmptyDescription = styled.p({
  fontSize: "var(--font-size-base)",
  color: "var(--color-text-secondary)",
  margin: 0,
  maxWidth: "400px",
  lineHeight: "var(--line-height-relaxed)",
});

const RoomCardContainer = styled.article({
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-xl)",
  padding: "var(--space-5)",
  display: "grid",
  gap: "var(--space-4)",
  transition:
    "transform var(--transition-normal), box-shadow var(--transition-normal), border-color var(--transition-normal)",
  cursor: "default",
});

const RoomHeader = styled.div({
  display: "grid",
  gridTemplateColumns: "36px 1fr auto",
  gap: 10,
  alignItems: "center",
});

const RoomAvatar = styled.div({
  width: 36,
  height: 36,
  borderRadius: 10,
  background: "var(--gradient-accent)",
  boxShadow: "var(--shadow-sm)",
});

const RoomHeadText = styled.div({
  minWidth: 0,
  display: "grid",
  gap: 4,
});

const RoomName = styled.strong({
  fontSize: "var(--font-size-lg)",
  color: "var(--color-text-primary)",
  display: "block",
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

const RoomMetaRow = styled.div({
  display: "flex",
  alignItems: "center",
  gap: 12,
  minWidth: 0,
});

const MetaItem = styled.span({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  color: "var(--color-text-muted)",
  fontSize: "var(--font-size-sm)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

const Dot = styled.span({
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: "var(--color-success)",
  flexShrink: 0,
});

const OnlinePill = styled.div({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "4px 8px",
  background: "var(--color-surface-elevated)",
  border: "1px solid var(--color-border)",
  borderRadius: "999px",
  color: "var(--color-text-secondary)",
  fontSize: "var(--font-size-sm)",
  lineHeight: 1,
});

const PillDot = styled.span({
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: "var(--color-success)",
});

const RoomDescriptionClamp = styled.p({
  color: "var(--color-text-secondary)",
  margin: 0,
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  minHeight: 0,
});

const RoomFooter = styled.div({
  display: "flex",
  gap: 10,
  justifyContent: "flex-end",
});

const RoomGrid = styled.div({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: "var(--space-6)",
});

// Search Results Styled Components
const SearchResultsSection = styled.div({
  marginTop: "var(--space-6)",
  display: "grid",
  gap: "var(--space-4)",
});

const SearchResultsTitle = styled.h3({
  fontSize: "var(--font-size-lg)",
  fontWeight: 600,
  color: "var(--color-text-primary)",
  margin: 0,
});

const SearchResultsGrid = styled.div({
  display: "grid",
  gap: "var(--space-4)",
});

const SearchResultCardContainer = styled.article({
  background: "var(--color-surface-elevated)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  padding: "var(--space-4)",
  display: "grid",
  gap: "var(--space-3)",
  transition:
    "border-color var(--transition-normal), box-shadow var(--transition-normal)",

  "&:hover": {
    borderColor: "var(--color-border-focus)",
    boxShadow: "var(--shadow-sm)",
  },
});

const SearchResultHeader = styled.div({
  display: "grid",
  gridTemplateColumns: "32px 1fr auto",
  gap: 12,
  alignItems: "center",
});

const SearchResultAvatar = styled.div({
  width: 32,
  height: 32,
  borderRadius: 8,
  background: "var(--gradient-accent)",
  boxShadow: "var(--shadow-sm)",
});

const SearchResultText = styled.div({
  minWidth: 0,
  display: "grid",
  gap: 2,
});

const SearchResultName = styled.strong({
  fontSize: "var(--font-size-base)",
  color: "var(--color-text-primary)",
  display: "block",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

const SearchResultMeta = styled.div({
  display: "flex",
  alignItems: "center",
  gap: 8,
});

const SearchResultDescription = styled.p({
  color: "var(--color-text-secondary)",
  margin: 0,
  fontSize: "var(--font-size-sm)",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
});
