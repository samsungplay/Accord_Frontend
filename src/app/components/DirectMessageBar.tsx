"use client";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import AuthenticationContext from "../contexts/AuthenticationContext";
import { IoClose } from "react-icons/io5";

import { ChatRoom } from "../types/ChatRoom";
import ModalContext from "../contexts/ModalContext";
import FloatingButton from "./FloatingButton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/api";
import ModalUtils from "../util/ModalUtil";
import StompContext from "../contexts/StompContext";
import useSocket from "../hooks/useSocket";
import React from "react";
import {
  IoIosCall,
  IoIosNotifications,
  IoIosNotificationsOff,
  IoMdVideocam,
} from "react-icons/io";
import ChatNotificationContext from "../contexts/ChatNotificationContext";
import CallContext from "../contexts/CallContext";
import { MdCall, MdCallEnd } from "react-icons/md";
import { ChatRecordType } from "../types/ChatRecordType";
import { User } from "../types/User";
import { UserSettings } from "../types/UserSettings";
import useIsLightMode from "../hooks/useIsLightMode";
import GenericUtil from "../util/GenericUtil";
import RoomAvatar from "./RoomAvatar";

type DirectMessageBarType = {
  chatroom: ChatRoom;
  isSpamRoom?: boolean;
  isMessageRequest?: boolean;
};
export default function DirectMessageBar({
  chatroom,
  isSpamRoom,
  isMessageRequest,
}: DirectMessageBarType) {
  const pathname = usePathname();
  const authenticationContext = useContext(AuthenticationContext);
  const notificationContext = useContext(ChatNotificationContext);
  const currentUser = authenticationContext?.currentUser;
  const modalContext = useContext(ModalContext);
  const queryClient = useQueryClient();
  const router = useRouter();
  const callContext = useContext(CallContext);
  const hasCall = useMemo(() => {
    return (
      chatroom.callInstance !== undefined && chatroom.callInstance !== null
    );
  }, [chatroom.callInstance]);

  const isUserParticipatingInCall = useMemo(() => {
    if (!callContext || !callContext.currentCallingChatRoom) return false;
    return callContext.currentCallingChatRoom.id === chatroom.id;
  }, [callContext?.currentCallingChatRoom?.id, chatroom.id]);

  const is1to1DM = useMemo(() => {
    return (
      chatroom.direct1to1Identifier && chatroom.direct1to1Identifier.length > 1
    );
  }, [chatroom]);

  const [recentChatNotificationCount, setRecentChatNotificationCount] =
    useState(0);

  const recentChatNotificationCountRef = useRef<number>(0);

  useEffect(() => {
    recentChatNotificationCountRef.current = recentChatNotificationCount;

    if (notificationContext && chatroom.id > 0) {
      notificationContext.setRecentChatNotifications((prev) => ({
        ...prev,
        [chatroom.id]: recentChatNotificationCount,
      }));
    }
  }, [recentChatNotificationCount]);

  const stompContext = useContext(StompContext);

  useEffect(() => {
    if (notificationContext?.count) {
      if (
        notificationContext.count.id === chatroom.id &&
        notificationContext.count.signal >= 0
      ) {
        setRecentChatNotificationCount((prev) => prev + 1);

        if (isMessageRequest && chatroom.id > 0) {
          notificationContext.setMsgRequestNotificationCount(
            (prev) => prev + 1
          );
        }

        if (chatroom.id > 0)
          notificationContext.setGlobalNotificationCount((prev) => prev + 1);
      } else if (notificationContext.count.id === chatroom.id) {
        setRecentChatNotificationCount(0);
        if (isMessageRequest && chatroom.id > 0) {
          notificationContext?.setMsgRequestNotificationCount(
            (prev) => prev - recentChatNotificationCountRef.current
          );
        }
        if (chatroom.id > 0)
          notificationContext.setGlobalNotificationCount(
            (prev) => prev - recentChatNotificationCountRef.current
          );
      }
    }
  }, [
    notificationContext?.count
      ? JSON.stringify(notificationContext.count)
      : undefined,
  ]);

  useEffect(() => {
    if (chatroom.notificationCount !== undefined) {
      setRecentChatNotificationCount(chatroom.notificationCount);
      recentChatNotificationCountRef.current = chatroom.notificationCount;
    }

    return () => {
      if (notificationContext && chatroom.id > 0) {
        notificationContext.setRecentChatNotifications((prev) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [chatroom.id]: variable, ...withoutChatRoomId } = prev;
          return withoutChatRoomId;
        });
      }
    };
  }, []);

  useEffect(() => {
    if (pathname === `/dashboard/chatroom/${chatroom.id}`) {
      if (isMessageRequest && chatroom.id > 0) {
        notificationContext?.setMsgRequestNotificationCount(
          (prev) => prev - recentChatNotificationCountRef.current
        );
      }
      if (chatroom.id > 0)
        notificationContext?.setGlobalNotificationCount(
          (prev) => prev - recentChatNotificationCountRef.current
        );

      setRecentChatNotificationCount(0);
    }
    const handleTabRefocus = () => {
      if (
        document.visibilityState === "visible" &&
        pathname === `/dashboard/chatroom/${chatroom.id}`
      ) {
        if (isMessageRequest && chatroom.id > 0) {
          notificationContext?.setMsgRequestNotificationCount(
            (prev) => prev - recentChatNotificationCountRef.current
          );
        }
        if (chatroom.id > 0)
          notificationContext?.setGlobalNotificationCount(
            (prev) => prev - recentChatNotificationCountRef.current
          );

        setRecentChatNotificationCount(0);
      }
    };

    document.addEventListener("visibilitychange", handleTabRefocus);
    return () => {
      document.removeEventListener("visibilitychange", handleTabRefocus);
    };
  }, [pathname]);

  const userSettings = useQuery({
    queryKey: ["user_settings"],
    queryFn: async () => {
      const response = await api.get<UserSettings>("/users/settings");
      return {
        data: response.data,
      };
    },
  });

  useSocket(
    stompContext?.stompClient,
    stompContext?.stompFrame,
    (stompClient, currentSocketUser) => {
      const onChatMessage = stompClient.subscribe(
        `/user/${currentSocketUser}/general/onChatMessage/${chatroom.id}`,
        (message) => {
          // console.log(chatroom.id, " nice");
          if (
            pathname !== `/dashboard/chatroom/${chatroom.id}` ||
            document.visibilityState !== "visible"
          ) {
            const payload: {
              chatRoom: ChatRoom | undefined;
              chatRecord: ChatRecordType;
            } = JSON.parse(message.body);

            const friends = queryClient.getQueryData<{ data: User[] }>([
              "friends",
            ])?.data;

            const userSettings = queryClient.getQueryData<{
              data: UserSettings;
            }>(["user_settings"])?.data;

            const isGroupChat = !(payload.chatRoom ?? chatroom)
              .direct1to1Identifier?.length;

            const isFriends =
              friends?.find((e) => e.id === payload.chatRecord.sender?.id) !==
              undefined;

            let shouldUpdateNotification = true;

            if (chatroom.id > 0 && payload.chatRecord.isSpam) {
              if (isGroupChat && userSettings?.spamFilterMode === "Groups") {
                shouldUpdateNotification = false;
              } else if (
                isFriends &&
                userSettings?.spamFilterMode === "Friends" &&
                !isGroupChat
              ) {
                shouldUpdateNotification = false;
              } else if (
                !isFriends &&
                !isGroupChat &&
                userSettings?.spamFilterMode === "Others"
              ) {
                shouldUpdateNotification = false;
              } else if (userSettings?.spamFilterMode === "All") {
                shouldUpdateNotification = false;
              }
            } else if (chatroom.id === -1 && payload.chatRecord.isSpam) {
              if (!isGroupChat && userSettings?.spamFilterMode === "Groups") {
                shouldUpdateNotification = false;
              } else if (
                userSettings?.spamFilterMode === "Friends" &&
                (!isFriends || isGroupChat)
              ) {
                shouldUpdateNotification = false;
              } else if (
                userSettings?.spamFilterMode === "Others" &&
                (isFriends || isGroupChat)
              ) {
                shouldUpdateNotification = false;
              } else if (userSettings?.spamFilterMode === "None") {
                shouldUpdateNotification = false;
              }
            }

            if (payload.chatRecord.isNsfw) {
              if (isGroupChat && userSettings?.nsfwGroups === "Block") {
                shouldUpdateNotification = false;
              }
              if (
                !isGroupChat &&
                isFriends &&
                userSettings?.nsfwDmFriends === "Block"
              ) {
                shouldUpdateNotification = false;
              }
              if (
                !isGroupChat &&
                !isFriends &&
                userSettings?.nsfwDmOthers === "Block"
              ) {
                shouldUpdateNotification = false;
              }
            }

            if (shouldUpdateNotification) {
              setRecentChatNotificationCount((prev) => prev + 1);

              if (chatroom.id > 0)
                notificationContext?.setGlobalNotificationCount(
                  (prev) => prev + 1
                );

              if (!isGroupChat && !isFriends && chatroom.id > 0) {
                notificationContext?.setMsgRequestNotificationCount(
                  (prev) => prev + 1
                );
              }
            }
          }
        }
      );

      return [onChatMessage];
    },
    [stompContext?.stompClient, stompContext?.stompFrame, pathname]
  );

  const leaveChatRoomMutation = useMutation({
    mutationFn: (id: string) => {
      return api.delete(`/chatrooms/directmessaging/${id}`);
    },
    onSettled(data, _error, variables) {
      if (data?.status === 200) {
        queryClient.setQueryData(
          ["chatroom_dm"],
          (prev: { data: ChatRoom[] }) => {
            return {
              data: prev.data.filter((chatroom) => {
                return chatroom.id !== Number.parseInt(variables);
              }),
            };
          }
        );

        router.replace("/dashboard");
      } else if (data) {
        ModalUtils.handleGenericError(modalContext, data);
      }
    },
  });
  const handleLeaveChatRoom = useCallback(() => {
    if (!leaveChatRoomMutation.isPending) {
      leaveChatRoomMutation.mutate(chatroom.id.toString());
    }

    // console.log("fired")
  }, [leaveChatRoomMutation]);

  const handleAskLeaveChatRoom = useCallback(() => {
    ModalUtils.openYesorNoModal(
      modalContext,
      "LEAVING CHATROOM",
      is1to1DM && chatroom.participants.length >= 2
        ? `Leave this DM? You can rejoin this DM by starting a DM with this user. However, be warned that if 
        the other user also leaves the DM, this DM may be permanently reset!`
        : is1to1DM
        ? "Leave this DM? Since you are the last remaining user in this DM, leaving it now will permanently reset this DM!"
        : chatroom.participants.length >= 2
        ? `Leave "${chatRoomName}"?\n${
            chatroom.isPublic
              ? "Since this chatroom is public, you will be able to rejoin from the conversation finder. "
              : "You cannot rejoin this chatroom unless reinvited!"
          }`
        : `Leave "${chatRoomName}"? Since you are the last remaining user in this chatroom, leaving it now will permanently delete this chatroom! `,
      handleLeaveChatRoom
    );
  }, [modalContext, is1to1DM, chatroom]);

  const chatRoomName = useMemo(() => {
    if (chatroom && currentUser) {
      return GenericUtil.computeChatRoomName(chatroom, currentUser);
    } else {
      return "";
    }
  }, [chatroom]);

  const [isMuted, setIsMuted] = useState(false);

  const isLightMode = useIsLightMode();

  useEffect(() => {
    if (userSettings.data?.data)
      setIsMuted(userSettings.data.data.mutedChatRoomIds.includes(chatroom.id));
  }, [chatroom.id, userSettings.data?.data]);

  const muteChatRoomMutation = useMutation({
    mutationFn: (mute: boolean) => {
      return mute
        ? api.post("/users/muteChatroom/" + chatroom.id)
        : api.post("/users/unmuteChatroom/" + chatroom.id);
    },
    onSettled(data) {
      if (data?.status === 200) {
        queryClient.setQueryData(
          ["user_settings"],
          (prev: { data: UserSettings }) => {
            if (!prev) return prev;
            return {
              data: {
                ...prev.data,
                mutedChatRoomIds: data.data,
              },
            };
          }
        );
      } else if (data) {
        ModalUtils.handleGenericError(modalContext, data);
      }
    },
  });

  const handleToggleMuteChatRoom = useCallback(() => {
    if (!muteChatRoomMutation.isPending && userSettings.data?.data) {
      muteChatRoomMutation.mutate(!isMuted);
    }
  }, [muteChatRoomMutation.isPending, isMuted]);

  const hasIncomingCall = useMemo(() => {
    if (callContext?.incomingCallChatRoom?.id === chatroom.id) {
      return true;
    }
    if (chatroom.callInstance) {
      if (
        chatroom.callInstance.pendingParticipants.find(
          (e) => e.id === currentUser?.id
        )
      ) {
        return true;
      }
    }

    return false;
  }, [
    chatroom.callInstance,
    currentUser?.id,
    callContext?.incomingCallChatRoom,
  ]);

  return (
    <div
      onClick={() => {
        router.replace(`/dashboard/chatroom/${chatroom.id}`);
      }}
      className={`p-2 group 
        ${
          isMessageRequest &&
          recentChatNotificationCount === 0 &&
          pathname !== "/dashboard/chatroom/" + chatroom.id &&
          "hidden"
        }
          ${isMuted && "opacity-50"}
         
        ${
          hasIncomingCall
            ? "animate-[jiggle_0.3s_ease-in-out_infinite] bg-orange-500"
            : pathname.startsWith(`/dashboard/chatroom/${chatroom.id}`)
            ? "bg-lime-700 text-lime-300"
            : "text-lime-500"
        }  relative flex items-center rounded-md hover:text-lime-300 m-1 hover:bg-lime-700 transition cursor-pointer
            
              `}
      style={{
        boxShadow: isUserParticipatingInCall
          ? "inset 0 0.5rem 1.5rem rgb(255,255,255)"
          : "",
      }}
    >
      {hasIncomingCall && (
        <div className="group-hover:flex hidden cursor-pointer animate-fadeIn items-center justify-center absolute w-full h-full top-0 left-0 z-[10] rounded-md bg-white">
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (callContext) {
                callContext.setIncomingCallChatRoom(chatroom);
                callContext.setCallAlertOverlayRemoteController("voice");
              }
            }}
            className="text-white rounded-s-md hover:bg-lime-700 transition bg-lime-500 grid w-full h-full place-content-center"
          >
            <MdCall size={24} />
          </div>
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (callContext) {
                callContext.setIncomingCallChatRoom(chatroom);
                callContext.setCallAlertOverlayRemoteController("video");
              }
            }}
            className="text-white hover:bg-lime-800 transition bg-lime-600 grid w-full h-full place-content-center"
          >
            <IoMdVideocam size={24} />
          </div>
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (callContext) {
                callContext.setIncomingCallChatRoom(chatroom);
                callContext.setCallAlertOverlayRemoteController("reject");
              }
            }}
            className="text-white rounded-e-md hover:bg-red-700 transition bg-red-500 grid w-full h-full place-content-center"
          >
            <MdCallEnd size={24} />
          </div>
        </div>
      )}

      {hasCall && (
        <div
          className="absolute animate-pulse bottom-[0.25rem] rounded-full text-lime-600 shadow-lg bg-lime-500 right-[0.25rem] p-1"
          style={{
            boxShadow: `inset 0 0.5rem 0.5rem ${
              isLightMode ? "rgb(77,124,15)" : "rgb(217,249,157)"
            }`,
          }}
        >
          <IoIosCall />
        </div>
      )}

      <RoomAvatar
        size={36}
        isSpamRoom={isSpamRoom}
        chatroom={chatroom}
        currentUser={currentUser ?? undefined}
      />

      <div className="ml-4 flex flex-col">
        <p
          className={`text-ellipsis overflow-hidden ${
            recentChatNotificationCount > 0 ? "max-w-[5em]" : "max-w-[10em]"
          }`}
        >
          {chatRoomName}
        </p>
        {!is1to1DM && (
          <p
            className={`text-lime-300 text-sm text-ellipsis overflow-hidden ${
              recentChatNotificationCount > 0 ? "max-w-[5em]" : "max-w-[10em]"
            }`}
          >
            {chatroom.participants.length} Participants
          </p>
        )}
      </div>

      <div
        className={` ${
          recentChatNotificationCount <= 0 && "hidden"
        } text-white bg-red-500 ml-2 shadow-md text-sm rounded-full w-2 h-2 flex items-center justify-center p-3`}
      >
        <p>{recentChatNotificationCount}</p>
      </div>

      {!isSpamRoom && (
        <div className="hidden group-hover:block absolute top-0 right-0 text-lime-500 ml-auto hover:text-lime-300 opacity-50">
          <FloatingButton
            onClick={handleToggleMuteChatRoom}
            description={isMuted ? "Unmute Chatroom" : "Mute Chatroom"}
            backgroundColor="bg-transparent"
            customPosition="bottom-[2.5rem]"
            backgroundGroupHoverColor="group-hover:bg-transparent"
          >
            {isMuted ? (
              <IoIosNotificationsOff size={16} />
            ) : (
              <IoIosNotifications size={16} />
            )}
          </FloatingButton>
        </div>
      )}

      {!isSpamRoom && (
        <div className="text-lime-500 ml-auto mr-4 hover:text-lime-300">
          <FloatingButton
            onClick={(e) => {
              e.stopPropagation();
              handleAskLeaveChatRoom();
            }}
            description={"Leave Chatroom"}
            backgroundColor="bg-transparent"
            customPosition="bottom-[2.5rem]"
            backgroundGroupHoverColor="group-hover:bg-transparent"
          >
            <IoClose size={20} />
          </FloatingButton>
        </div>
      )}
    </div>
  );
}
