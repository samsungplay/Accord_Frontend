import { createContext } from "react";
import { User } from "../types/User";
const AuthenticationContext = createContext<{
  currentUser: User | null | undefined;
} | null>(null);

export default AuthenticationContext;
