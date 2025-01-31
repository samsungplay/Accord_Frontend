import { createContext, Dispatch, SetStateAction } from "react";

const ChatNotificationContext = createContext<{
  count: { id: number; signal: number };
  setCount: Dispatch<SetStateAction<{ id: number; signal: number }>>;
  msgRequestNotificationCount: number;
  setMsgRequestNotificationCount: Dispatch<SetStateAction<number>>;
  setGlobalNotificationCount: Dispatch<SetStateAction<number>>;
  recentChatNotifications: { [chatRoomId: number]: number };
  setRecentChatNotifications: Dispatch<
    SetStateAction<{ [chatRoomId: number]: number }>
  >;
} | null>(null);

export default ChatNotificationContext;
