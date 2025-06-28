import { useAuth } from "@hooks/auth-context";
import { useEffect, useState, useRef, type KeyboardEvent } from "react";
import { useParams } from "react-router-dom";
import styled from "styled-components";

type WSData = {
  type: "message" | "user_list";
  content: string | string[];
};

export const ChatRoom = () => {
  const { roomId = "" } = useParams<{ roomId: string }>();
  const { user } = useAuth();

  const [messages, setMessages] = useState<string[]>([]);
  const [activeUsers, setActiveUsers] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(`/ws/chat?chat_id=${roomId}`);

    ws.onopen = () => console.log("🟢 WS open", ws.url);
    ws.onmessage = (e) => {
      const raw = e.data as string;
      let data: WSData;
      try {
        data = JSON.parse(raw);
        console.log("just got data: ", data);
      } catch {
        console.warn("Received non-JSON frame:", raw);
        return;
      }

      // 3) now handle the two cases
      switch (data.type) {
        case "message":
          setMessages((prev) => [...prev, data.content as string]);
          break;

        case "user_list":
          setActiveUsers(data.content as string[]);
          break;
      }
    };

    ws.onerror = (e) => console.error("⚠️ WS error", e);
    ws.onclose = (e) => console.log("🔴 WS closed", e.reason, e.code);

    wsRef.current = ws;
    return () => {
      if (wsRef.current === ws) {
        wsRef.current = null;
        ws.close();
      }
    };
  }, [roomId]);

  const sendMessage = () => {
    if (input.trim() && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(input.trim());
      setInput("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") sendMessage();
  };

  return (
    <PageContainer>
      <ChatCard>
        <Header>
          Room: {roomId}
          <UserSelect>
            <option disabled>Online ({activeUsers.length})</option>
            {activeUsers.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </UserSelect>
        </Header>

        <MessagesContainer>
          {messages.map((msg, i) => (
            <MessageBubble key={i} isOwn={msg.startsWith(`${user.id}:`)}>
              {msg}
            </MessageBubble>
          ))}
        </MessagesContainer>

        <InputBar>
          <TextInput
            placeholder="Type your message…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <SendButton onClick={sendMessage}>Send</SendButton>
        </InputBar>
      </ChatCard>
    </PageContainer>
  );
};

/** Styled components **/

const PageContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  height: 100vh;
  background: #f1f3f5;
`;

const ChatCard = styled.div`
  display: flex;
  flex-direction: column;
  width: 600px;
  max-width: 95vw;
  height: 80vh;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  padding: 1rem;
  background: #495057;
  color: #fff;
  font-weight: bold;
  font-size: 1.1rem;
`;

// The new dropdown
const UserSelect = styled.select`
  margin-left: 1rem;
  padding: 0.25rem;
  background: #fff;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

const MessagesContainer = styled.div`
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  background: #e9ecef;
`;

const MessageBubble = styled.div<{ isOwn?: boolean }>`
  max-width: 80%;
  margin-bottom: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: ${({ isOwn }) => (isOwn ? "#74c0fc" : "#dee2e6")};
  color: ${({ isOwn }) => (isOwn ? "#fff" : "#000")};
  align-self: ${({ isOwn }) => (isOwn ? "flex-end" : "flex-start")};
  border-radius: 12px;
  word-break: break-word;
`;

const InputBar = styled.div`
  display: flex;
  padding: 0.75rem;
  border-top: 1px solid #ced4da;
  background: #fff;
`;

const TextInput = styled.input`
  flex: 1;
  padding: 0.5rem 0.75rem;
  font-size: 1rem;
  border: 1px solid #adb5bd;
  border-radius: 4px;
  outline: none;

  &:focus {
    border-color: #74c0fc;
  }
`;

const SendButton = styled.button`
  margin-left: 0.5rem;
  padding: 0 1rem;
  font-size: 1rem;
  background: #74c0fc;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background: #4dabf7;
  }
`;
