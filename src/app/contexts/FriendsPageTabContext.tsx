import { createContext, Dispatch, SetStateAction } from "react";

const FriendsPageTabContext = createContext<{
  tab: string;
  setTab: Dispatch<SetStateAction<string>>;
} | null>(null);

export default FriendsPageTabContext;
