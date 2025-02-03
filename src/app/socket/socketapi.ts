/* eslint-disable @typescript-eslint/no-explicit-any */
import { CompatClient, Stomp } from "@stomp/stompjs";

import SockJS from "sockjs-client";
import Constants from "../constants/Constants";

const SOCKET_URL = `${Constants.SERVER_URL_PATH}/socket`;

let stompClient: CompatClient | null = null;

async function connect(
  username: string,
  userId: number
): Promise<[CompatClient | null, any]> {
  await new Promise((resolve) => setTimeout(() => resolve(true), 50));

  if (stompClient === null) {
    stompClient = Stomp.over(
      () => new SockJS(SOCKET_URL + "?userId=" + userId, undefined, {})
    );
    stompClient.onDisconnect = (e) => {
      console.log("client disconnected", e);
    };

    console.log("attempting connection");

    const frame: any = await new Promise<any>((resolve, reject) => {
      if (stompClient) {
        stompClient.connect(
          {
            Username: username + "@" + userId,
          },
          function (frame: any) {
            console.log("client connected: ", frame);

            resolve(frame);
          },
          function (err: any) {
            console.log("socket error:", err);

            reject(err);
          }
        );
      }
    });
    return [stompClient, frame];
  }

  return [null, null];
}

function disconnect() {
  if (stompClient) {
    stompClient.disconnect();
    stompClient = null;
  }
  console.log("client disconnected");
}

export const socketapi = {
  connect,
  disconnect,
};
