import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { QueryClientProvider } from "@api/query-client";
import { AuthProvider, useAuth } from "@hooks/auth-context";

import { ChatRoom } from "@pages/chat-room";
import { Register } from "@pages/register";
import { Login } from "@pages/login";
import { Spinner } from "@components/spinner";
import { GlobalStyles } from "@styles/global-styles";
import { HomePage } from "@pages/home";
import { Settings } from "@pages/settings";
import { Navbar } from "@components/navbar";

const AppLayout = () => {
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
};

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <Spinner />;

  return (
    <Routes>
      {isAuthenticated ? (
        <>
          {/* Routes with Navbar */}
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          {/* Routes without Navbar */}
          <Route path="/chat/:roomId" element={<ChatRoom />} />

          <Route path="*" element={<Navigate to="/" replace />} />
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
