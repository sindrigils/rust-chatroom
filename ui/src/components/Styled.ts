import styled from "styled-components";

export const Page = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: #f5f7fa;
  padding: 1rem;
`;
export const FormCard = styled.div`
  background: #ffffff;
  padding: 2rem;
  width: 100%;
  max-width: 400px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
`;
export const ListCard = styled(FormCard)`
  max-width: 600px;
`;
export const Header = styled.h1`
  font-size: 1.5rem;
  color: #333;
  margin-bottom: 1.5rem;
  text-align: center;
`;
export const FormField = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 1rem;
`;
export const Label = styled.label`
  font-size: 0.875rem;
  color: #555;
  margin-bottom: 0.25rem;
`;
export const TextInput = styled.input`
  padding: 0.75rem 1rem;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  outline: none;
  transition: border-color 0.2s;
  &:focus {
    border-color: #007bff;
  }
`;
export const ActionButton = styled.button`
  padding: 0.75rem;
  font-size: 1rem;
  background: #007bff;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 1rem;
  transition: background 0.2s;
  &:hover {
    background: #0056b3;
  }
`;
export const SecondaryButton = styled(ActionButton)`
  background: #6c757d;
  &:hover {
    background: #5a6268;
  }
`;
export const Alternate = styled.p`
  font-size: 0.875rem;
  color: #666;
  text-align: center;
  margin-top: 1rem;
`;
export const LinkText = styled.span`
  color: #007bff;
  cursor: pointer;
  text-decoration: underline;
  &:hover {
    color: #0056b3;
  }
`;
export const Controls = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;
export const ChatList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;
export const ChatItem = styled.div`
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  justify-content: space-between;
  &:hover {
    background: #f1f3f5;
  }
`;
export const RoomName = styled.span`
  font-weight: 500;
`;
export const UserCount = styled.span`
  font-size: 0.875rem;
  color: #555;
`;
export const ChatCard = styled.div`
  background: #fff;
  width: 600px;
  max-width: 95vw;
  height: 80vh;
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
`;
export const UserList = styled.div`
  padding: 0.5rem 1rem;
  background: #e9ecef;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;
export const User = styled.span`
  background: #dee2e6;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
`;
export const Messages = styled.div`
  flex: 1;
  padding: 1rem;
  background: #f8f9fa;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`;
export const Bubble = styled.div<{ $isOwn?: boolean }>`
  align-self: ${(props) => (props.$isOwn ? "flex-end" : "flex-start")};
  background: ${(props) => (props.$isOwn ? "#007bff" : "#dee2e6")};
  color: ${(props) => (props.$isOwn ? "#fff" : "#000")};
  padding: 0.5rem 0.75rem;
  border-radius: 12px;
  margin-bottom: 0.75rem;
  max-width: 80%;
  word-break: break-word;
`;
export const InputBar = styled.div`
  display: flex;
  padding: 0.75rem;
  border-top: 1px solid #ced4da;
  background: #fff;
`;
export const SendButton = styled.button`
  margin-left: 0.5rem;
  padding: 0 1rem;
  font-size: 1rem;
  background: #007bff;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
  &:hover {
    background: #0056b3;
  }
`;
export const Loading = styled.p`
  font-size: 1rem;
  color: #666;
`;
