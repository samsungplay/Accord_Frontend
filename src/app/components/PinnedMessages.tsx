import { useQuery } from "@tanstack/react-query";
import { RiPushpinFill } from "react-icons/ri";
import { ClipLoader } from "react-spinners";
import api from "../api/api";
import { ChatRecordType } from "../types/ChatRecordType";
import { ChatRoom } from "../types/ChatRoom";
import { User } from "../types/User";
import ChatRecord from "./ChatRecord";
import React from "react";
import { Editor } from "slate";
import useIsLightMode from "../hooks/useIsLightMode";
type PinnedMessagesType = {
  currentChatRoom: ChatRoom;
  currentUser: User;
  handleNavigateToChatRecord: (chatRecordId: number) => void;
  getText: (editor: Editor) => string;
};
export default function PinnedMessages({
  currentChatRoom,
  currentUser,
  handleNavigateToChatRecord,
}: PinnedMessagesType) {
  const pinnedMessages = useQuery({
    queryKey: ["pinned_chats", currentChatRoom.id],
    queryFn: async () => {
      const nsfw = localStorage.getItem("nsfw") ?? "ANY";
      const spam = localStorage.getItem("spam") ?? "ANY";
      const response = await api.get<ChatRecordType[]>(
        `/chat/message/${currentChatRoom.id}/pinned?nsfw=${nsfw}&spam=${spam}`
      );
      return {
        data: response.data,
      };
    },
    refetchOnMount: true,
  });

  const isLightMode = useIsLightMode();

  return (
    <div
      className="flex flex-col bg-lime-600 rounded-md p-0 w-[15rem] sm:w-[20rem] md:w-[25rem] max-h-[20rem]
                                        shadow-md mr-4"
    >
      <div className="flex items-center gap-2 p-2 text-white text-lg md:text-2xl">
        <div className="md:hidden">
          <RiPushpinFill size={24} />
        </div>
        <div className="hidden md:block">
          <RiPushpinFill size={36} />
        </div>
        Pinned Messages
      </div>

      <hr className="w-full bg-lime-400 border-lime-400 text-lime-400" />
      <div className="flex flex-col w-full p-2 gap-2 min-h-[10rem] max-h-[30rem] overflow-y-scroll overflow-x-hidden">
        {!pinnedMessages.isPending ? (
          pinnedMessages.data?.data.length ? (
            <>
              {pinnedMessages.data.data.map((message) => {
                return (
                  <div key={message.id}>
                    <ChatRecord
                      record={message}
                      currentChatRoom={currentChatRoom}
                      currentUser={currentUser}
                      isSimplePreview={true}
                      showPinControllers={true}
                      handleNavigateToChatRecord={handleNavigateToChatRecord}
                    />
                  </div>
                );
              })}
            </>
          ) : (
            <div className="grid place-content-center w-full h-[10rem]">
              <div className="flex flex-col justify-center items-center">
                <RiPushpinFill
                  color={isLightMode ? "rgb(132,204,22)" : "rgb(163,230,53)"}
                  size={48}
                />
                <p className="text-lime-400">Forgot something?</p>
              </div>
            </div>
          )
        ) : (
          <>
            <div className="grid place-content-center w-full h-[10rem]">
              <ClipLoader
                color={isLightMode ? "rgb(132,204,22)" : "rgb(163,230,53)"}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
