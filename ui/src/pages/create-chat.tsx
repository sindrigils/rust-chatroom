import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useCreateChat } from "@api/chat/hooks";
import { useAuth } from "@hooks/auth-context";
import {
  ActionButton,
  Alternate,
  FormCard,
  FormField,
  Header,
  LinkText,
  Page,
  TextInput,
} from "@components/Styled";

export const CreateChat = () => {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const navigate = useNavigate();
  const createChat = useCreateChat();

  const handleCreate = async () => {
    const { id } = await createChat.mutateAsync({
      name,
      ownerId: user.id,
    });
    navigate(`/chat/${id}`);
  };

  return (
    <Page>
      <FormCard>
        <Header>New Chat Room</Header>
        <FormField>
          <TextInput
            placeholder="Room name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </FormField>
        <ActionButton onClick={handleCreate}>Create Room</ActionButton>
        <Alternate>
          Want to join instead?
          <LinkText onClick={() => navigate("/join")}>Join Room</LinkText>
        </Alternate>
      </FormCard>
    </Page>
  );
};
