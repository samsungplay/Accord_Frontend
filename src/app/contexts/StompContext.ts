import { CompatClient, IFrame } from "@stomp/stompjs";
import { createContext } from "react";

const StompContext = createContext<{
  stompClient: CompatClient | null;
  stompFrame: IFrame | null;
} | null>(null);

export default StompContext;
