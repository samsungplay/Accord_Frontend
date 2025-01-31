import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
} from "react";
import FloatingButton from "./FloatingButton";
import { MdCall, MdCallEnd } from "react-icons/md";
import { ChatRoom } from "../types/ChatRoom";
import ProfileAvatar from "./ProfileAvatar";
import { User } from "../types/User";
import { useMutation, useQuery } from "@tanstack/react-query";
import api from "../api/api";
import ModalUtils from "../util/ModalUtil";
import ModalContext from "../contexts/ModalContext";
import { usePathname, useRouter } from "next/navigation";
import queryClient from "../query/QueryClient";
import SoundUtil from "../util/SoundUtil";
import Constants from "../constants/Constants";
import CallContext from "../contexts/CallContext";
import { IoReturnUpForward } from "react-icons/io5";
import PrimaryButton from "./PrimaryButton";
import { IoMdVideocam } from "react-icons/io";
import { UserSettings } from "../types/UserSettings";
import GenericUtil from "../util/GenericUtil";
import useIsLightMode from "../hooks/useIsLightMode";

type CallAlertOverlayType = {
  chatRoom?: ChatRoom;
  currentUser: User;
  setIncomingCallChatRoom: Dispatch<SetStateAction<ChatRoom | undefined>>;
  callAlertOverlayRemoteController?: string;
};
export default function CallAlertOverlay({
  chatRoom,
  currentUser,
  setIncomingCallChatRoom,
  callAlertOverlayRemoteController = "",
}: CallAlertOverlayType) {
  const modalContext = useContext(ModalContext);
  const pathname = usePathname();
  const router = useRouter();
  const callContext = useContext(CallContext);
  const userSettings = useQuery({
    queryKey: ["user_settings"],
    queryFn: async () => {
      const response = await api.get<UserSettings>("/users/settings");
      return {
        data: response.data,
      };
    },
  });

  const joinCallMutation = useMutation({
    mutationFn: () => {
      return api.post(`/call/join/${chatRoom?.id ?? -1}`, {
        iceCandidates: callContext!.localIceCandidates.current,
      });
    },
    onSettled(data) {
      if (!data) return;

      if (data.status === 200) {
        queryClient.setQueryData(
          ["chatroom_dm"],
          (prev: { data: ChatRoom[] }) => {
            if (!prev) return undefined;
            return {
              data: prev.data.map((room) => {
                if (room.id === chatRoom?.id) {
                  return {
                    ...room,
                    callInstance: {
                      id: -1,
                      activeParticipants: [],
                      pendingParticipants: [],
                    },
                  };
                }
                return room;
              }),
            };
          }
        );
        //if currently on chatroom page, then add to the active participants in call instance
        if (pathname === `/dashboard/chatroom/${chatRoom?.id ?? -1}`) {
          queryClient.setQueryData(
            ["chatroom_dm", chatRoom?.id.toString()],
            (prev: { data: ChatRoom }) => {
              if (!prev || !prev.data.callInstance) return prev;

              return {
                data: {
                  ...prev.data,
                  callInstance: {
                    ...prev.data.callInstance,
                    activeParticipants: [
                      ...prev.data.callInstance.activeParticipants,
                      currentUser,
                    ],
                    pendingParticipants:
                      prev.data.callInstance.pendingParticipants.filter(
                        (user) => user.id !== currentUser.id
                      ),
                  },
                },
              };
            }
          );
        } else {
          //if not, navigate to the page
          router.replace(`/dashboard/chatroom/${chatRoom?.id ?? -1}`);
          console.log("navigate!");
        }

        setIncomingCallChatRoom(undefined);

        SoundUtil.stopSound(
          Constants.SERVER_STATIC_CONTENT_PATH + "calling_theme.mp3"
        );

        if (userSettings.data?.data) {
          const entranceSound = userSettings.data.data.entranceSound;
          if (entranceSound === "default") {
            SoundUtil.playSoundForce(
              Constants.SERVER_STATIC_CONTENT_PATH + "enter_sound.mp3"
            );
          } else {
            const url =
              Constants.SERVER_STATIC_CONTENT_PATH +
              entranceSound.split("@")[1];

            GenericUtil.isStaticContentAvailable(url).then((available) => {
              if (available) {
                SoundUtil.playSoundForce(
                  Constants.SERVER_STATIC_CONTENT_PATH +
                    entranceSound.split("@")[1]
                );
              } else {
                SoundUtil.playSoundForce(
                  Constants.SERVER_STATIC_CONTENT_PATH + "enter_sound.mp3"
                );
              }
            });
          }
        } else {
          SoundUtil.playSoundForce(
            Constants.SERVER_STATIC_CONTENT_PATH + "enter_sound.mp3"
          );
        }

        //subscribe to other existing streams , if any
        if (callContext?.handleSubscribeStream && chatRoom && currentUser) {
          callContext.handleSubscribeStream(chatRoom, new Date().getTime());
        }

        callContext?.setCurrentCallingChatroom(chatRoom);
      } else {
        ModalUtils.handleGenericError(modalContext, data);
      }
      if (callContext?.callWorkPending)
        callContext.callWorkPending.current = false;
    },
  });

  const handleEndCall = useCallback(async () => {
    if (callContext && callContext.currentCallingChatRoom) {
      try {
        await callContext?.handleEndCall(
          callContext.currentCallingChatRoom,
          currentUser
        );

        return true;
      } catch (err) {
        console.error(err);
        ModalUtils.openGenericModal(
          modalContext,
          "Oof",
          (err as Error).message,
          undefined,
          undefined,
          undefined,
          undefined,
          true
        );
        return false;
      }
    }

    return false;
  }, [chatRoom, currentUser, callContext]);

  const handleJoinCall = useCallback(
    async (withVideo?: boolean) => {
      const currentUser = queryClient.getQueryData<{ data: User }>(["user"]);
      if (
        !currentUser ||
        joinCallMutation.isPending ||
        callContext?.callWorkPending.current ||
        !callContext?.handlePrepareStartOrJoinCall ||
        !chatRoom?.id ||
        !callContext?.handleSubscribeStream
      ) {
        return;
      }

      callContext.callWorkPending.current = true;

      //end call if was already in one

      if (callContext.currentCallingChatRoom !== undefined) {
        //if there is already an ongoing call, leave the call first

        if (!(await handleEndCall())) {
          callContext.callWorkPending.current = false;
          return;
        }
      }

      //first, handle video options

      if (currentUser.data.isScreenShareEnabled !== "no") {
        if (!(await callContext.handleEnableScreenShare("no", chatRoom.id))) {
          callContext.callWorkPending.current = false;
          return;
        }
      }

      let videoEnableResult = false;
      if (withVideo) {
        const alwaysPreviewVideo =
          localStorage.getItem("alwaysPreviewVideo") ?? "no";

        if (alwaysPreviewVideo === "yes") {
          videoEnableResult = await callContext.handlePreviewVideo(
            currentUser.data,
            chatRoom,
            true,
            true
          );
        } else {
          videoEnableResult = await callContext.handleEnableVideo(
            true,
            chatRoom.id,
            true
          );
        }
      } else {
        videoEnableResult = await callContext.handleEnableVideo(
          false,
          chatRoom.id,
          true
        );
      }
      if (!videoEnableResult) {
        callContext.callWorkPending.current = false;

        return;
      }

      try {
        if (
          !(await callContext.handlePrepareStartOrJoinCall(chatRoom.id, false))
        ) {
          callContext.callWorkPending.current = false;
          ModalUtils.openGenericModal(
            modalContext,
            "Uh oh.",
            "Could not join the call; Please try again!",
            () => {},
            undefined,
            [
              <PrimaryButton key={0}>
                <div className="text-center flex items-center gap-2 cursor-pointer w-full justify-center transition text-white">
                  Take me back.
                  <IoReturnUpForward />
                </div>
              </PrimaryButton>,
            ],
            undefined,
            false
          );
          return;
        }
        joinCallMutation.mutate();
      } catch (err) {
        console.error(err);
        ModalUtils.openGenericModal(
          modalContext,
          "Uh oh.",
          (err as Error).message,
          () => {},
          undefined,
          [
            <PrimaryButton key={0}>
              <div className="text-center flex items-center gap-2 cursor-pointer w-full justify-center transition text-white">
                Take me back.
                <IoReturnUpForward />
              </div>
            </PrimaryButton>,
          ],
          undefined,
          false
        );

        callContext.callWorkPending.current = false;
      }
    },
    [joinCallMutation, callContext, chatRoom]
  );

  const handleRejectCall = useCallback(async () => {
    if (callContext && chatRoom) {
      try {
        await callContext.handleRejectIncomingCall(chatRoom, currentUser);
        return true;
      } catch (err) {
        console.error(err);
        ModalUtils.openGenericModal(
          modalContext,
          "ERROR",
          (err as Error).message
        );
        return false;
      }
    }
    return false;
  }, [chatRoom, currentUser]);

  useEffect(() => {
    if (callAlertOverlayRemoteController === "voice") {
      handleJoinCall();
    } else if (callAlertOverlayRemoteController === "video") {
      handleJoinCall(true);
    } else if (callAlertOverlayRemoteController === "reject") {
      handleRejectCall();
    }

    if (callAlertOverlayRemoteController.length > 0)
      callContext?.setCallAlertOverlayRemoteController("resolved");
  }, [callAlertOverlayRemoteController, callContext]);

  const isLightMode = useIsLightMode();
  return chatRoom && callAlertOverlayRemoteController.length === 0 ? (
    <div
      style={{
        boxShadow: `inset 0 0rem 2rem ${
          isLightMode ? "rgb(77,124,15)" : "rgb(217,249,157)"
        }`,
      }}
      className="fixed text-center flex flex-col z-[70] w-[70vw] sm:w-[50vw] h-fit max-h-[50vh] top-[50%] translate-x-[-50%] translate-y-[-50%] left-[50%] p-2 bg-lime-500 text-lime-600 rounded-md shadow-md"
    >
      <div className="self-center relative">
        {chatRoom.participants.length >= 3 && (
          <ProfileAvatar
            user={chatRoom.participants[0]}
            size={64}
            secondaryUser={chatRoom.participants[1]}
          />
        )}
        {chatRoom.participants.length == 2 && (
          <ProfileAvatar
            user={
              chatRoom.participants[0].id === currentUser?.id
                ? chatRoom.participants[1]
                : chatRoom.participants[0]
            }
            size={64}
            showStatus
          />
        )}
        {chatRoom.participants.length == 1 && (
          <ProfileAvatar user={chatRoom.participants[0]} size={64} />
        )}
      </div>

      <div className="mt-2 max-w-[80%] text-ellipsis overflow-hidden text-center ml-auto mr-auto">
        {chatRoom.name}
      </div>

      <p className="text-3xl mt-2">Incoming Call</p>
      <div className="flex items-center gap-2 w-full mt-2 mb-4 justify-around">
        <div className="relative">
          <div className="w-full h-full rounded-full bg-transparent z-[-1] absolute border-[0.25rem] border-lime-400 animate-[ping_1s_ease-in-out_infinite_alternate]"></div>

          <FloatingButton
            description="Join"
            customDescriptionSize="text-xl"
            onClick={() => {
              handleJoinCall();
            }}
          >
            <div className="cursor-pointer">
              <MdCall size={32} />
            </div>
          </FloatingButton>
        </div>

        <div className="relative">
          <div className="w-full h-full rounded-full bg-transparent z-[-1] absolute border-[0.25rem] border-lime-600 animate-[ping_1s_ease-in-out_infinite_alternate]"></div>

          <FloatingButton
            description="Join with video"
            customDescriptionSize="text-xl"
            onClick={() => {
              handleJoinCall(true);
            }}
          >
            <div className="cursor-pointer">
              <IoMdVideocam size={32} />
            </div>
          </FloatingButton>
        </div>

        <div className="">
          <FloatingButton
            description="Reject"
            backgroundColor="bg-red-500"
            customDescriptionSize="text-xl"
            onClick={() => {
              handleRejectCall();
            }}
          >
            <div className="cursor-pointer">
              <MdCallEnd size={32} />
            </div>
          </FloatingButton>
        </div>
      </div>
    </div>
  ) : (
    <></>
  );
}
