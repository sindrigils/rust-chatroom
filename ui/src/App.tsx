import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@api/query-client";
import { AuthProvider, useAuth } from "@hooks/auth-context";
import { CreateChat } from "@pages/create-chat";
import { JoinChat } from "@pages/join-chat";
import { ChatRoom } from "@pages/chat-room";
import { Register } from "@pages/register";
import { Login } from "@pages/login";
import { Spinner } from "@components/spinner";
import { GlobalStyles } from "@styles/global-styles";

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <Spinner />;
  return (
    <Routes>
      {isAuthenticated ? (
        <>
          <Route path="/create" element={<CreateChat />} />
          <Route path="/join" element={<JoinChat />} />
          <Route path="/chat/:roomId" element={<ChatRoom />} />
          <Route path="*" element={<Navigate to="/create" replace />} />
        </>
      ) : (
        <>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </>
      )}
    </Routes>
  );
}

export const App = () => (
  <QueryClientProvider>
    <AuthProvider>
      <GlobalStyles />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  </QueryClientProvider>
);
