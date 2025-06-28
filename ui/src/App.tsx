import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@api/query-client";

import { PublicLayout } from "@components/public-layout";
import { ProtectedLayout } from "@components/protected-layout";
import { CreateChat } from "@pages/create-chat";
import { JoinChat } from "@pages/join-chat";
import { ChatRoom } from "@pages/chat-room";
import { Login } from "@pages/login";
import { AuthProvider } from "@hooks/auth-context";
import { Register } from "@pages/register";

export const App = () => (
  <QueryClientProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<Login />} />
          </Route>

          <Route element={<ProtectedLayout />}>
            <Route path="/create" element={<CreateChat />} />
            <Route path="/join" element={<JoinChat />} />
            <Route path="/chat/:roomId" element={<ChatRoom />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </QueryClientProvider>
);
