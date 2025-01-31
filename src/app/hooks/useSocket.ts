import { CompatClient, IFrame, StompSubscription } from "@stomp/stompjs";
import { DependencyList, useEffect } from "react";

type handlerType = (
  stompClient: CompatClient,
  currentSocketUser: string
) => StompSubscription[];
export default function useSocket(
  stompClient: CompatClient | null | undefined,
  stompFrame: IFrame | null | undefined,
  handler: handlerType,
  dep?: DependencyList
) {
  useEffect(() => {
    let subscription: StompSubscription[];
    if (stompClient && stompFrame) {
      const currentSocketUser = stompFrame["headers"]["user-name"];
      if (stompClient.connected)
        subscription = handler(stompClient, currentSocketUser);
    }

    return () => {
      if (subscription) subscription.forEach((e) => e.unsubscribe());
    };
  }, dep);
}
