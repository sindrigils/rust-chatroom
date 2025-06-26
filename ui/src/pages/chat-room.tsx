import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { Container, Card, Title, Input, Button } from "../components/Styled";

export const ChatRoom = () => {
  const { roomId } = useParams();
  const username = sessionStorage.getItem("username") || "Unknown";
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(
      `ws://localhost:8080/ws?room=${roomId}&user=${username}`
    );
    ws.onmessage = (evt) => setMessages((prev) => [...prev, evt.data]);
    ws.onopen = () => console.log("Connected to", roomId);
    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [roomId, username]);

  const sendMessage = () => {
    if (input.trim() && wsRef.current) {
      wsRef.current.send(input.trim());
      setInput("");
    }
  };

  return (
    <Container>
      <Card
        style={{ height: "80vh", display: "flex", flexDirection: "column" }}
      >
        <Title>Room: {roomId}</Title>
        <div style={{ flex: 1, overflowY: "auto", marginBottom: "1rem" }}>
          {messages.map((msg, idx) => (
            <div key={idx}>{msg}</div>
          ))}
        </div>
        <div style={{ display: "flex" }}>
          <Input
            style={{ flex: 1, marginRight: "0.5rem" }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <Button onClick={sendMessage}>Send</Button>
        </div>
      </Card>
    </Container>
  );
};
