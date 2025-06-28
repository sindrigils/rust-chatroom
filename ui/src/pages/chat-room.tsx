import {
  Bubble,
  ChatCard,
  Header,
  InputBar,
  Messages,
  Page,
  SendButton,
  TextInput,
  User,
  UserList,
} from "@components/Styled";
import { useAuth } from "@hooks/auth-context";
import { useEffect, useState, useRef, type KeyboardEvent } from "react";
import { useParams } from "react-router-dom";

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

      switch (data.type) {
        case "message":
          setMessages((prev) => [...prev, data.content as string]);
          break;

        case "user_list":
          setActiveUsers(data.content as string[]);
          break;
      }
    };
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
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) =>
    e.key === "Enter" && sendMessage();
  return (
    <Page>
      <ChatCard>
        <Header>Room: {roomId}</Header>
        <UserList>
          <strong>Online ({activeUsers.length}):</strong>
          {activeUsers.map((u) => (
            <User key={u}>{u}</User>
          ))}
        </UserList>
        <Messages>
          {messages.map((msg, i) => (
            <Bubble key={i} $isOwn={msg.startsWith(`${user.id}:`)}>
              {msg.replace(`${user.id}:`, "")}
            </Bubble>
          ))}
        </Messages>
        <InputBar>
          <TextInput
            placeholder="Type a message…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <SendButton onClick={sendMessage}>Send</SendButton>
        </InputBar>
      </ChatCard>
    </Page>
  );
};
