import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useOnClickOutside, useWindowSize } from "usehooks-ts";
import ProfileAvatar from "./ProfileAvatar";
import { ChatRoom } from "../types/ChatRoom";
import { User } from "../types/User";
import {
  FaFeatherPointed,
  FaMicrophone,
  FaVolumeHigh,
  FaX,
} from "react-icons/fa6";
import FloatingButton from "./FloatingButton";
import {
  MdArrowDropDown,
  MdCall,
  MdCallEnd,
  MdKeyboardArrowDown,
  MdKeyboardArrowUp,
  MdOutlineError,
  MdOutlineWarning,
  MdScreenShare,
  MdStopScreenShare,
  MdVideoCall,
  MdWarning,
} from "react-icons/md";
import {
  BsArrowsAngleContract,
  BsArrowsAngleExpand,
  BsCameraVideoFill,
  BsCameraVideoOffFill,
  BsEmojiExpressionlessFill,
  BsEmojiSmileFill,
  BsFillMicFill,
  BsFillMicMuteFill,
} from "react-icons/bs";
import { Popover } from "react-tiny-popover";
import ModalUtils from "../util/ModalUtil";
import ModalContext from "../contexts/ModalContext";
import PrimaryButton from "./PrimaryButton";
import { IoReturnUpForward } from "react-icons/io5";
import PrimaryRadioGroup from "./PrimaryRadioGroup";
import { useMutation, useQuery } from "@tanstack/react-query";
import api from "../api/api";
import queryClient from "../query/QueryClient";
import { Call } from "../types/Call";
import Constants from "../constants/Constants";
import SoundUtil from "../util/SoundUtil";
import CallContext from "../contexts/CallContext";
import VideoCallDisplay from "./VideoCallDisplay";
import { IoIosMusicalNotes, IoMdVideocam } from "react-icons/io";
import RightClickMenuWrapper from "./RightClickMenuWrapper";
import { FaCheck, FaImage, FaMusic, FaStop } from "react-icons/fa";
import Usercard from "./Usercard";
import ScreenShareConfig from "./ScreenShareConfig";
import { TbHeadphones, TbHeadphonesOff } from "react-icons/tb";
import EmojiPicker from "@emoji-mart/react";
import EmojiBubble from "./EmojiBubble";
import StompContext from "../contexts/StompContext";
import useSocket from "../hooks/useSocket";
import SoundPicker from "./SoundPicker";
import { Sound } from "../types/Sound";
import ContentDisplayContext from "../contexts/ContentDisplayContext";
import { ClipLoader } from "react-spinners";
import GenericUtil from "../util/GenericUtil";
import BackgroundPicker from "./BackgroundPicker";
import useIsLightMode from "../hooks/useIsLightMode";
import { ChatRoomRoleSettings } from "../types/ChatRoomRoleSettings";
import { format } from "date-fns";

type SearchResultsOverlayType = {
  chatViewWidth: number;
  callOverlayOpenMode: string;
  setCallOverlayOpenMode: Dispatch<SetStateAction<string>>;
  setCallOverlayPlayExitAnimation: Dispatch<SetStateAction<boolean>>;
  setPlayExitAnimation: Dispatch<SetStateAction<boolean>>;
  playExitAnimation: boolean;
  chatroom: ChatRoom;
  currentUser: User;
  handleStartCall: (withVideo?: boolean) => void;
};
export default function CallOverlay({
  chatViewWidth,
  setCallOverlayOpenMode,
  chatroom,
  currentUser,
  callOverlayOpenMode,
  setPlayExitAnimation,
  playExitAnimation,
  handleStartCall,
  setCallOverlayPlayExitAnimation,
}: SearchResultsOverlayType) {
  const [headerHeight, setHeaderHeight] = useState(0);
  const windowSize = useWindowSize();

  const [callButtonHover, setCallButtonHover] = useState(false);
  const callButtonHoverTimeout = useRef<NodeJS.Timeout | null>(null);
  const [videoButtonHover, setVideoButtonHover] = useState(false);
  const videoButtonHoverTimeout = useRef<NodeJS.Timeout | null>(null);
  const [muteButtonHover, setMuteButtonHover] = useState(false);
  const muteButtonHoverTimeout = useRef<NodeJS.Timeout | null>(null);
  const [screenButtonHover, setScreenButtonHover] = useState(false);
  const screenButtonHoverTimeout = useRef<NodeJS.Timeout | null>(null);
  const [voiceMenuOpen, setVoiceMenuOpen] = useState(false);
  const [videoMenuOpen, setVideoMenuOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [soundOpen, setSoundOpen] = useState(false);
  const [soundPickerPending, setSoundPickerPending] = useState(false);
  const [soundPickerOverlayCoords, setSoundPickerOverlayCoords] = useState<{
    top: number;
    left: number;
  }>({
    top: 0,
    left: 0,
  });

  const [soundPickerParentRef, setSoundPickerParentRef] =
    useState<HTMLDivElement | null>(null);

  const [soundOverlayRef, setSoundOverlayRef] = useState<HTMLDivElement | null>(
    null
  );
  const soundOverlayRef2 = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    soundOverlayRef2.current = soundOverlayRef;
  }, [soundOverlayRef]);

  //manually adjust sound picker overlay coords
  useEffect(() => {
    if (soundPickerParentRef && soundOverlayRef && soundOpen) {
      const overlayRect = soundOverlayRef.getBoundingClientRect();

      const parentRect = soundPickerParentRef.getBoundingClientRect();
      const coords = {
        top: parentRect.top + window.scrollY + GenericUtil.remToPx(4),
        left: parentRect.left + window.scrollX - overlayRect.width / 2,
      };

      if (coords.left + overlayRect.width > window.innerWidth) {
        coords.left = parentRect.left + window.scrollX - overlayRect.width;
        coords.top = parentRect.top + window.scrollY - overlayRect.height / 2;
      } else if (coords.top + overlayRect.height > window.innerHeight) {
        coords.top = parentRect.top + window.scrollY - overlayRect.height / 2;
        coords.left =
          parentRect.left +
          window.scrollX -
          overlayRect.width / 2 +
          GenericUtil.remToPx(2);
      }

      setSoundPickerOverlayCoords(coords);
    }
  }, [windowSize, soundPickerParentRef, soundOverlayRef, soundOpen]);

  useOnClickOutside(soundOverlayRef2, (e) => {
    if (soundPickerPending) return;
    const current = e.target as HTMLElement;
    let currentNode = current;
    let i = 0;

    while (currentNode !== undefined && i < 30) {
      if (
        currentNode &&
        currentNode.className &&
        currentNode.className["includes"] &&
        currentNode.className.includes("soundPicker")
      ) {
        return;
      }

      if (!currentNode) break;

      currentNode = currentNode.parentNode as HTMLElement;

      i++;
    }
    setSoundOpen(false);
  });

  const modalContext = useContext(ModalContext);
  const contentDisplayContext = useContext(ContentDisplayContext);

  const startCallMutationPending = useRef<boolean>(false);

  const [fullScreen, setFullScreen] = useState(false);
  const [minimized, setMinimized] = useState(false);

  const stompContext = useContext(StompContext);

  useSocket(
    stompContext?.stompClient,
    stompContext?.stompFrame,
    (stompClient, currentSocketUser) => {
      const onCallEmoji = stompClient.subscribe(
        `/user/${currentSocketUser}/general/onCallEmoji`,
        (message) => {
          const payload: { userId: number; shortCodes: string } = JSON.parse(
            message.body
          );

          setEmojiBubbles((prev) => ({
            ...prev,
            [payload.userId]: "1500::" + payload.shortCodes + "@@" + Date.now(),
          }));
        }
      );

      const onCallSound = stompClient.subscribe(
        `/user/${currentSocketUser}/general/onCallSound`,
        (message) => {
          const payload: { userId: number; sound: Sound } = JSON.parse(
            message.body
          );

          setEmojiBubbles((prev) => ({
            ...prev,
            [payload.userId]:
              payload.sound.duration.toString() +
              "::" +
              "sound_" +
              payload.sound.icon +
              "@@" +
              Date.now(),
          }));
        }
      );

      return [onCallEmoji, onCallSound];
    },

    [stompContext?.stompClient, stompContext?.stompFrame, chatroom.id]
  );

  useEffect(() => {
    if (chatroom.callInstance === null) {
      setCallOverlayOpenMode("");
    }
  }, []);

  const callContext = useContext(CallContext);
  useEffect(() => {
    if (callContext && callContext.callOverlayRemoteController.length > 0) {
      if (callContext.callOverlayRemoteController.startsWith("setPreview")) {
        setCallOverlayOpenMode("previewCall");
      } else if (
        callContext.callOverlayRemoteController.startsWith("closeOverlay")
      ) {
        setPlayExitAnimation(true);
        setTimeout(() => {
          setPlayExitAnimation(false);
          setCallOverlayOpenMode("");
          callWorkPending.current = false;
        }, 300);
      }

      callContext.setCallOverlayRemoteController("");
    }
  }, [callContext?.callOverlayRemoteController]);
  const callWorkPendingFallback = useRef<boolean>(true);
  const callWorkPending =
    callContext?.callWorkPending ?? callWorkPendingFallback;

  const startCallMutation = useMutation({
    mutationFn: () => {
      startCallMutationPending.current = true;
      return api.post<Call>(`/call/start/${chatroom.id}`, {
        iceCandidates: callContext!.localIceCandidates.current,
      });
    },
    onSettled(data) {
      if (!data) return;

      if (data.status === 200) {
        //set the chatroom's call instance
        queryClient.setQueryData(
          ["chatroom_dm", chatroom.id.toString()],
          (prev: { data: ChatRoom }) => {
            if (!prev) {
              return undefined;
            }

            return {
              data: {
                ...prev.data,
                callInstance: data.data,
              },
            };
          }
        );

        //start the call sound
        SoundUtil.playSoundOverwrite(
          Constants.SERVER_STATIC_CONTENT_PATH + "calling_theme.mp3"
        );

        if (callContext) {
          callContext.setCurrentCallingChatroom(chatroom);
        }

        queryClient.setQueryData(
          ["chatroom_dm"],
          (prev: { data: ChatRoom[] }) => {
            if (!prev) {
              return prev;
            }

            return {
              data: prev.data.map((chatroom_) => {
                if (chatroom_.id === chatroom.id) {
                  return {
                    ...chatroom,
                    callInstance: {
                      id: -1,
                      activeParticipants: [],
                      pendingParticipants: [],
                    },
                  };
                }
                return chatroom_;
              }),
            };
          }
        );
      } else {
        handleStreamError(
          "Failed to start call due to busy network. Please try again!"
        );
      }

      startCallMutationPending.current = false;
      callWorkPending.current = false;
    },
  });

  const abortCallMutation = useMutation({
    mutationFn: () => {
      return api.delete(`/call/abort/${chatroom.id}`);
    },
    onSettled(data) {
      if (!data) return;
      if (data.status === 200) {
        queryClient.setQueryData(
          ["chatroom_dm", chatroom.id.toString()],
          (prev: { data: ChatRoom }) => {
            if (!prev) return prev;
            return {
              data: {
                ...prev.data,
                callInstance: undefined,
              },
            };
          }
        );
        queryClient.setQueryData(
          ["chatroom_dm"],
          (prev: { data: ChatRoom[] }) => {
            if (!prev) return prev;
            return {
              data: prev.data.map((room) => {
                if (room.id === chatroom.id) {
                  return {
                    ...room,
                    callInstance: undefined,
                  };
                }
                return room;
              }),
            };
          }
        );

        //close call overlay
        setPlayExitAnimation(true);
        setTimeout(() => {
          setPlayExitAnimation(false);
          setCallOverlayOpenMode("");
          callWorkPending.current = false;
        }, 300);

        SoundUtil.stopSound(
          Constants.SERVER_STATIC_CONTENT_PATH + "calling_theme.mp3"
        );
        SoundUtil.playSoundForce(
          Constants.SERVER_STATIC_CONTENT_PATH + "exit_sound.mp3"
        );
        if (callContext) {
          callContext.setCurrentCallingChatroom(undefined);
          callContext.handleCloseStream();
        }
      } else {
        ModalUtils.handleGenericError(modalContext, data);
      }
    },
  });

  const handleShareScreen = useCallback(() => {
    if (currentUser.isScreenShareEnabled !== "no") {
      callContext?.handleEnableScreenShare("no", chatroom.id);
      return;
    }
    ModalUtils.openGenericModal(
      modalContext,
      "",
      "",
      undefined,
      <ScreenShareConfig chatRoom={chatroom} />,
      [
        <PrimaryButton key={0} customStyles="mt-5 bg-red-500">
          <div className="flex justify-center gap-2 items-center">
            <FaX /> Cancel
          </div>
        </PrimaryButton>,
      ],
      <div className="flex items-center justify-center gap-2 text-2xl text-lime-300">
        <MdScreenShare />
        <p>Share Screen</p>
      </div>
    );
  }, [currentUser.isScreenShareEnabled, chatroom.id]);

  const handleAbortCall = useCallback(() => {
    if (!abortCallMutation.isPending) {
      abortCallMutation.mutate();
    }
  }, [abortCallMutation.isPending]);

  const kickCallMutation = useMutation({
    mutationFn: (targetUser: User) => {
      return api.delete(
        `/call/kick/${chatroom.id}/${targetUser.username + "@" + targetUser.id}`
      );
    },
    onSettled(data, error, variables) {
      if (!data) return;
      if (data.status === 200) {
        let callEnded = false;

        queryClient.setQueryData(
          ["chatroom_dm", chatroom.id.toString()],
          (prev: { data: ChatRoom }) => {
            if (!prev) return undefined;

            const callInstance = prev.data.callInstance;
            if (!callInstance) return prev;

            const filtered = callInstance.activeParticipants.filter(
              (user) => user.id !== variables.id
            );
            const filtered2 = callInstance.pendingParticipants.filter(
              (user) => user.id !== variables.id
            );

            if (filtered.length === 0) {
              callEnded = true;
              setCallOverlayPlayExitAnimation(true);
              setTimeout(() => {
                setCallOverlayPlayExitAnimation(false);
                setCallOverlayOpenMode("");
              }, 300);
            }
            return {
              data: {
                ...prev.data,
                callInstance:
                  filtered.length > 0
                    ? {
                        ...prev.data.callInstance,
                        activeParticipants: filtered,
                        pendingParticipants: filtered2,
                      }
                    : undefined,
              },
            };
          }
        );

        if (callEnded) {
          queryClient.setQueryData(
            ["chatroom_dm"],
            (prev: { data: ChatRoom[] }) => {
              if (!prev) return prev;
              return {
                data: prev.data.map((room) => {
                  if (room.id === chatroom.id) {
                    return {
                      ...room,
                      callInstance: undefined,
                    };
                  }
                  return room;
                }),
              };
            }
          );
        }

        SoundUtil.playSoundForce(
          Constants.SERVER_STATIC_CONTENT_PATH + "exit_sound.mp3"
        );
      } else {
        ModalUtils.handleGenericError(modalContext, data);
      }
    },
  });

  const handleKickFromCall = useCallback(
    (targetUser: User) => {
      if (!kickCallMutation.isPending) {
        kickCallMutation.mutate(targetUser);
      }
    },

    [kickCallMutation.isPending]
  );

  const handleStreamError = useCallback(
    (message: string) => {
      if (callContext) {
        console.log("closing stream.");
        callContext.handleCloseStream();
      }
      if (!chatroom.callInstance || !callContext?.currentCallingChatRoom) {
        setPlayExitAnimation(true);
        setTimeout(() => {
          setPlayExitAnimation(false);
          setCallOverlayOpenMode("");
          callWorkPending.current = false;
        }, 300);
      } else {
        setCallOverlayOpenMode("previewCall");
      }
      if (message.length > 0) {
        ModalUtils.openGenericModal(
          modalContext,
          "Uh oh.",
          message,
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
      }
    },
    [chatroom.callInstance, callContext?.currentCallingChatRoom]
  );

  useEffect(() => {
    const currentUser = queryClient.getQueryData<{ data: User }>(["user"]);
    //start call logic is only run when the call overlay open mode starts with "startCall"
    if (
      callWorkPending.current ||
      callContext?.currentCallingChatRoom?.id === chatroom.id ||
      !callContext?.handlePrepareStartOrJoinCall ||
      !callContext.localIceCandidates ||
      startCallMutationPending.current ||
      !currentUser ||
      !callOverlayOpenMode.startsWith("startCall")
    ) {
      if (
        !callWorkPending.current &&
        startCallMutationPending.current &&
        callOverlayOpenMode.startsWith("startCall")
      )
        handleStreamError(
          "Could not start the voice call due to busy network. Please try again!"
        );

      return;
    }

    const initializeCall = async () => {
      if (callWorkPending.current) {
        return;
      }

      callContext.setCallErrorText((prev) => ({
        ...prev,
        error: "",
      }));
      callWorkPending.current = true;

      try {
        if (callOverlayOpenMode === "previewCall") {
          callWorkPending.current = false;
          return;
        }
        if (!callContext?.peerConnection.current) {
          callWorkPending.current = false;
          handleStreamError("The call context is missing. Please try again!");
          return;
        }

        if (callContext.currentCallingChatRoom !== undefined) {
          //if there is already an ongoing call, leave the call first

          if (!(await handleEndCall())) {
            callWorkPending.current = false;
            return;
          }
        }

        //first, handle video options

        if (currentUser.data.isScreenShareEnabled !== "no") {
          if (!(await callContext.handleEnableScreenShare("no", chatroom.id))) {
            callWorkPending.current = false;
            handleStreamError("");
            return;
          }
        }

        let videoEnableResult = false;
        if (callOverlayOpenMode.includes("withVideo")) {
          const alwaysPreviewVideo =
            localStorage.getItem("alwaysPreviewVideo") ?? "no";

          if (alwaysPreviewVideo === "yes") {
            videoEnableResult = await callContext.handlePreviewVideo(
              currentUser.data,
              chatroom,
              true,
              true
            );
          } else {
            videoEnableResult = await callContext.handleEnableVideo(
              true,
              chatroom.id,
              true
            );
          }
        } else {
          videoEnableResult = await callContext.handleEnableVideo(
            false,
            chatroom.id,
            true
          );
        }
        if (!videoEnableResult) {
          callWorkPending.current = false;
          handleStreamError("");
          return;
        }

        if (
          !(await callContext.handlePrepareStartOrJoinCall(chatroom.id, true))
        ) {
          callWorkPending.current = false;
          handleStreamError("Could not start call; Try again!");
          return;
        }

        startCallMutation.mutate();
      } catch (err) {
        console.error(err);
        callWorkPending.current = false;
        handleStreamError((err as Error).message);
      }
    };

    initializeCall();
  }, []);

  const handleOpenSelectBackgroundModal = useCallback(() => {
    ModalUtils.openGenericModal(
      modalContext,
      "",
      "",
      () => {
        callContext?.handleChangeDevice(
          callContext.selectedDevice.videoUserInputDevice,
          true
        );
      },
      <BackgroundPicker currentUser={currentUser} currentChatRoom={chatroom} />,
      [
        <PrimaryButton key={0} customStyles="mt-5 bg-lime-500">
          <div className="flex items-center justify-center gap-2">
            <FaCheck /> Apply Now
          </div>
        </PrimaryButton>,
        <PrimaryButton key={0} customStyles="mt-5 bg-red-500">
          <div className="flex items-center justify-center gap-2">
            <FaX /> Close
          </div>
        </PrimaryButton>,
      ],
      <div className="flex justify-center items-center font-bold gap-2">
        <FaImage />
        <p className="text-xl">Select Background</p>
      </div>,
      true
    );
  }, [chatroom, callContext?.selectedDevice.videoUserInputDevice]);

  const handleEndCall = useCallback(async () => {
    if (callContext && callContext.currentCallingChatRoom) {
      try {
        await callContext?.handleEndCall(
          callContext.currentCallingChatRoom,
          currentUser,
          (callEnded) => {
            if (callEnded) {
              setPlayExitAnimation(true);
              setTimeout(() => {
                setPlayExitAnimation(false);
                setCallOverlayOpenMode("");
              }, 300);
            } else {
              setCallOverlayOpenMode("previewCall");
            }
          }
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
  }, [chatroom, currentUser, callContext]);

  useLayoutEffect(() => {
    const header = document.getElementById("header");
    if (header) {
      setHeaderHeight(header.getBoundingClientRect().height);
    }
  }, [windowSize]);

  const pendingParticipantsIds = useMemo(() => {
    if (!chatroom.callInstance) {
      return new Set();
    }

    return new Set(
      chatroom.callInstance.pendingParticipants.map((user) => user.id)
    );
  }, [chatroom]);

  const activeParticipantsIds = useMemo(() => {
    if (!chatroom.callInstance) {
      return new Set();
    }

    return new Set(
      chatroom.callInstance.activeParticipants.map((user) => user.id)
    );
  }, [chatroom.callInstance]);

  const [animate, setAnimate] = useState(false);
  const [emojiBubbles, setEmojiBubbles] = useState<{
    [userId: number]: string;
  }>({});

  const lastActiveParticipants = useRef<User[] | undefined>(undefined);

  const roleSettings = useQuery({
    queryKey: ["role_settings", chatroom.id.toString()],
    queryFn: async () => {
      const response = await api.get<ChatRoomRoleSettings>(
        `/chatrooms/roleSettings/${chatroom.id}`
      );

      return {
        data: response.data,
      };
    },
    refetchOnMount: false,
  });

  const participantAvatars = useMemo(() => {
    return chatroom.participants.map((participant, i) => {
      if (participant.id === currentUser.id) {
        participant = currentUser;
      }
      let showKickUserFromCallButton = currentUser.id !== participant.id;
      if (!roleSettings.data?.data) {
        showKickUserFromCallButton = false;
      } else if (
        showKickUserFromCallButton &&
        !GenericUtil.checkRoomPermission(
          chatroom,
          currentUser.id,
          [participant.id],
          roleSettings.data.data.roleAllowKickUser
        )
      ) {
        showKickUserFromCallButton = false;
      }

      if (chatroom.direct1to1Identifier?.length) {
        showKickUserFromCallButton = false;
      }

      if (activeParticipantsIds.has(participant.id)) {
        return participant.isVideoEnabled ||
          participant.isScreenShareEnabled !== "no" ? (
          <VideoCallDisplay
            zIndex={40 - i}
            showKickUserFromCallButton={showKickUserFromCallButton}
            currentChatRoom={chatroom}
            currentUser={currentUser}
            handleKickFromCall={handleKickFromCall}
            hiddenModeParam={
              callOverlayOpenMode === "previewCall" ||
              callContext?.videoStreams[participant.id] === undefined
            }
            customClassName="animate-popOut"
            key={participant.id}
            data={callContext?.videoStreams[participant.id]}
            user={participant}
            width={`${
              100 / Math.min(5, Math.max(2, activeParticipantsIds.size)) - 5
            }%`}
            emojiBubbleShortCode={emojiBubbles[participant.id]}
            setEmojiBubbleShortCode={setEmojiBubbles}
          />
        ) : (
          <div
            style={{
              zIndex: 40 - i,
            }}
            key={participant.id}
            className={`
              transition-all rounded-full border-4 ${
                callContext?.callDecorator[participant.id] === "sound"
                  ? "bg-lime-600"
                  : "bg-transparent"
              } animate-[popOutWithWidth_0.75s_ease-in-out_forwards]
               dark:animate-[popOutWithWithLightTheme_0.75s_ease-in-out_forwards]
                
              `}
          >
            <RightClickMenuWrapper
              menu={
                <Usercard
                  user={participant}
                  customBackgroundStyle="bg-lime-500"
                  showKickUserFromCallButton={showKickUserFromCallButton}
                  showCallControls
                  handleKickFromCall={handleKickFromCall}
                />
              }
            >
              <div className="absolute bottom-[50%] left-[50%]">
                <EmojiBubble
                  shortCodes={
                    emojiBubbles[participant.id]
                      ? emojiBubbles[participant.id].substring(
                          emojiBubbles[participant.id].indexOf("::") + 2
                        )
                      : undefined
                  }
                  setShortCodes={setEmojiBubbles}
                  userIdKey={currentUser.id}
                  duration={Number(
                    (emojiBubbles[participant.id] ?? "1000::").split("::")[0]
                  )}
                />
              </div>
              <ProfileAvatar
                showMute={participant.isCallMuted}
                showDeafen={participant.isDeafened}
                user={participant}
                size={64}
                showStrike={callContext?.disabledAudioStreams.has(
                  "voice@" + participant.id
                )}
              />
            </RightClickMenuWrapper>
          </div>
        );
      } else if (
        callOverlayOpenMode !== "previewCall" &&
        pendingParticipantsIds.has(participant.id)
      ) {
        return (
          <div
            key={participant.id}
            className="animate-[pulseStronger_1.5s_ease-in-out_infinite] dark:animate-[pulseStrongerLightTheme_1.5s_ease-in-out_infinite] rounded-full
            "
          >
            <div
              className="transition-all rounded-full border-4 animate-[popOutWithWidth_0.75s_ease-in-out_forwards]
            dark:animate-[popOutWithWidthLightTheme_0.75s_ease-in-out_forwards]"
            >
              <ProfileAvatar user={participant} size={64} />
            </div>
          </div>
        );
      } else {
        return (
          <div
            key={participant.id}
            className={
              animate
                ? "transition-all rounded-full border-4 animate-[popInWithWidth_0.75s_ease-in-out_forwards] dark:animate-[popInWithWidthLightTheme_0.75s_ease-in-out_forwards]"
                : "hidden"
            }
          >
            <ProfileAvatar user={participant} size={64} />
          </div>
        );
      }
    });
  }, [
    chatroom.participants,
    chatroom.ownerId,
    chatroom.modIds,
    callContext?.callDecorator,
    activeParticipantsIds,
    pendingParticipantsIds,
    callOverlayOpenMode,
    currentUser,
    callContext?.videoStreams,
    callContext?.disabledAudioStreams,
    roleSettings.data?.data,
    emojiBubbles,
  ]);

  const shouldShowAbortCallButton = useMemo(() => {
    if (!roleSettings.data?.data) {
      return false;
    }

    if (chatroom.direct1to1Identifier?.length) {
      return false;
    }

    return GenericUtil.checkRoomPermission(
      chatroom,
      currentUser.id,
      undefined,
      roleSettings.data.data.roleAllowAbortCall
    );
  }, [roleSettings.data?.data, currentUser.id, chatroom]);
  useEffect(() => {
    if (chatroom.callInstance?.activeParticipants && !animate) {
      if (!lastActiveParticipants.current) {
        lastActiveParticipants.current = [
          ...chatroom.callInstance.activeParticipants,
        ];
      }

      //compare previous active participants and current active participants
      if (
        lastActiveParticipants.current.length !==
        chatroom.callInstance.activeParticipants.length
      ) {
        setAnimate(true);
        return;
      }
      for (let i = 0; i < lastActiveParticipants.current.length; i++) {
        if (
          lastActiveParticipants.current[i].id !==
          chatroom.callInstance.activeParticipants[i].id
        ) {
          setAnimate(true);
          return;
        }
      }

      lastActiveParticipants.current = [
        ...chatroom.callInstance.activeParticipants,
      ];
    }
  }, [chatroom.callInstance?.activeParticipants, animate]);

  const handleToggleFullScreen = useCallback(() => {
    if (fullScreen) {
      document.exitFullscreen();
      setFullScreen(false);
    } else {
      const overlay = document.getElementById("overlayContainer");
      if (overlay) {
        overlay.requestFullscreen();
        setFullScreen(true);
      }
    }
  }, [fullScreen]);

  useEffect(() => {
    const interval = setInterval(() => {
      setFullScreen(document.fullscreenElement !== null);
    }, 100);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const videoListMenu = useMemo(() => {
    let defaultSelectedId = 0;
    let devicesListNeedsPermission = false;

    const { videoInputDevices } = callContext?.devices ?? {
      videoInputDevices: [],
    };

    if (callContext) {
      callContext.devices.videoInputDevices.forEach((device, i) => {
        if (
          callContext.selectedDevice.videoUserInputDevice.length &&
          device.deviceId === callContext.selectedDevice.videoUserInputDevice
        ) {
          defaultSelectedId = i;
        } else if (device.deviceId.length === 0) {
          devicesListNeedsPermission = true;
        }
      });
    }

    return (
      <div className="callOverlay relative bg-white shadow-md rounded-md p-2 mt-2 max-w-[60vw] max-h-[50vh] overflow-y-scroll text-lime-500 cursor-default">
        <div className="flex items-center gap-2 text-lime-500">
          <IoMdVideocam size={16} />
          <p className="text-lime-500 font-bold">CAMERA DEVICE</p>
        </div>

        <hr className="text-lime-500 border-lime-500 mx-[-0.5rem]" />

        {callContext?.devices &&
        videoInputDevices.length > 0 &&
        !devicesListNeedsPermission ? (
          <PrimaryRadioGroup
            defaultSelectedId={defaultSelectedId}
            onClick={async (i) => {
              const ok = await callContext.handleChangeDevice(
                videoInputDevices[i].deviceId,
                true
              );
              return ok;
            }}
            items={videoInputDevices.map((device) => {
              return (
                <div key={device.deviceId} className="flex gap-2 items-center">
                  {device.label}
                </div>
              );
            })}
          />
        ) : devicesListNeedsPermission ? (
          <p>Devices Unavailable, Needs Permission.</p>
        ) : (
          <p>Devices Unavailable.</p>
        )}

        <div
          onClick={() => {
            if (!currentUser.isVideoEnabled)
              callContext?.handlePreviewVideo(currentUser, chatroom);
          }}
          className={`flex items-center gap-2 transition hover:bg-lime-200 ${
            currentUser.isVideoEnabled
              ? "cursor-not-allowed text-gray-500"
              : "cursor-pointer text-lime-500"
          }`}
        >
          <MdVideoCall size={16} />
          <p
            className={`${
              currentUser.isVideoEnabled ? "text-gray-500" : "text-lime-500"
            } font-bold rounded-md px-2`}
          >
            PREVIEW VIDEO
          </p>
        </div>

        <div
          className="flex items-center gap-2 text-lime-500 transition hover:bg-lime-200 cursor-pointer"
          onClick={handleOpenSelectBackgroundModal}
        >
          <FaImage size={16} />
          <p className="text-lime-500 font-bold rounded-md px-2">
            Select Background
          </p>
        </div>
      </div>
    );
  }, [currentUser, callContext?.devices, callContext?.selectedDevice]);

  const devicesListMenu = useMemo(() => {
    const { audioInputDevices } = callContext?.devices ?? {
      audioInputDevices: [],
    };

    if (!callContext?.devices || audioInputDevices.length === 0) {
      return (
        <div className="callOverlay grid place-content-center bg-white shadow-md rounded-md p-2 mt-2 max-w-[60vw] max-h-[50vh] overflow-y-scroll text-lime-500 cursor-default">
          <p>Devices Unavailable.</p>
        </div>
      );
    }

    let defaultSelectedId = 0;
    const devicesListNeedsPermission =
      callContext.devices.audioInputDevices.find(
        (device) => device.deviceId.length === 0
      ) !== undefined;

    if (devicesListNeedsPermission) {
      return (
        <div className="callOverlay grid place-content-center bg-white shadow-md rounded-md p-2 mt-2 max-w-[60vw] max-h-[50vh] overflow-y-scroll text-lime-500 cursor-default">
          <p>Devices Unavailable, Needs Permission.</p>
        </div>
      );
    }
    if (callContext.peerConnection.current?.getSenders()) {
      callContext.peerConnection.current.getSenders().forEach((sender) => {
        if (sender.track) {
          let label = sender.track.label;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((sender.track as any).customLabel !== undefined) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            label = (sender.track as any).customLabel;
          }

          const i = audioInputDevices.findIndex((e) => e.label === label);

          if (i >= 0) {
            defaultSelectedId = i;
          }
        }
      });
    }

    return (
      <div className="callOverlay relative bg-white shadow-md rounded-md p-2 mt-2 max-w-[60vw] max-h-[50vh] overflow-y-scroll text-lime-500 cursor-default">
        <div className="flex items-center gap-2 text-lime-500">
          <FaMicrophone size={16} />
          <p className="text-lime-500 font-bold">INPUT DEVICE</p>
        </div>

        <hr className="text-lime-500 border-lime-500 mx-[-0.5rem]" />
        <PrimaryRadioGroup
          defaultSelectedId={defaultSelectedId}
          onClick={async (i) => {
            const ok = await callContext.handleChangeDevice(
              audioInputDevices[i].deviceId,
              false
            );
            return ok;
          }}
          items={audioInputDevices.map((device) => {
            return (
              <div key={device.deviceId} className="flex gap-2 items-center">
                {device.label}
              </div>
            );
          })}
        />

        <div className="flex items-center gap-2 text-lime-500">
          <FaVolumeHigh size={16} />
          <p className="text-lime-500 font-bold">OUTPUT DEVICE</p>
        </div>
        <hr className="text-lime-500 border-lime-500 mx-[-0.5rem]" />
        <p>Limited Support - Please control using your OS settings!</p>
      </div>
    );
  }, [
    callContext?.devices,
    callContext?.selectedDevice,
    callOverlayOpenMode,
    callContext?.currentCallingChatRoom,
  ]);

  const expressEmojiMutation = useMutation({
    mutationFn: (shortCode: string) => {
      return api.post(`/call/expressEmoji`, {
        shortCodes: shortCode,
      });
    },
    onSettled(data) {
      if (data && data.status !== 200) {
        ModalUtils.handleGenericError(modalContext, data);
      }
    },
  });

  const handleEmojiSelect = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (e: any) => {
      if (!expressEmojiMutation.isPending) {
        setEmojiOpen(false);
        setEmojiBubbles((prev) => ({
          ...prev,
          [currentUser.id]: "1500::" + e["shortcodes"] + "@@" + Date.now(),
        }));

        expressEmojiMutation.mutate(e["shortcodes"]);
      }
    },
    [currentUser.id, expressEmojiMutation]
  );

  const [callElapsedTime, setCallElapsedTime] = useState("00:00");

  useEffect(() => {
    const interval = setInterval(() => {
      if (chatroom.callInstance) {
        const callStartTime = chatroom.callInstance.createdAt;

        const diff = Date.now() - callStartTime;

        const displayDate = new Date(diff);
        setCallElapsedTime(
          diff >= 3600 * 1000
            ? format(displayDate, "H:mm:ss")
            : format(displayDate, "mm:ss")
        );
      }
    }, 1000);

    if (chatroom.callInstance) {
      const callStartTime = chatroom.callInstance.createdAt;

      const diff = Date.now() - callStartTime;

      const displayDate = new Date(diff);
      setCallElapsedTime(
        diff >= 3600 * 1000
          ? format(displayDate, "H:mm:ss")
          : format(displayDate, "mm:ss")
      );
    }

    return () => clearInterval(interval);
  }, [chatroom.callInstance]);

  const isLightMode = useIsLightMode();
  return (
    <Popover
      isOpen={true}
      containerStyle={{
        zIndex: "30",
      }}
      align="end"
      content={
        <div
          onClick={() => setMinimized((prev) => !prev)}
          className="absolute bg-white
          hover:text-lime-700 transition rounded-b-md p-1 shadow-lg text-lime-500 items-center cursor-pointer justify-center bottom-0 right-0 translate-y-[100%]"
        >
          <div className="hover:rotate-180 transition">
            {!minimized ? (
              <MdKeyboardArrowDown size={24} />
            ) : (
              <MdKeyboardArrowUp size={24} />
            )}
          </div>
        </div>
      }
      positions={["bottom"]}
    >
      <div
        id="overlayContainer"
        className={`h-[45vh] w-full self-center bg-lime-400 shadow-lg text-white
        overflow-y-scroll flex flex-col gap-1 p-0 absolute z-[9] transition-all top-0
        ${minimized ? "max-h-0" : "max-h-[45vh]"}
        ${playExitAnimation ? "animate-fadeOutDown" : "animate-fadeInUp"}
       `}
        style={{
          width: chatViewWidth,
          top: headerHeight,
          boxShadow: `inset 0 1rem 5rem ${
            isLightMode ? "rgb(77,124,15)" : "rgb(217,249,157)"
          }`,
        }}
      >
        <div className="absolute flex items-center cursor-pointer justify-center bottom-0 right-0 m-[1rem] z-10">
          <div
            onClick={() => {
              handleToggleFullScreen();
            }}
            className="text-lime-700 transition hover:text-lime-500"
          >
            {fullScreen ? (
              <BsArrowsAngleContract size={24} />
            ) : (
              <BsArrowsAngleExpand size={24} />
            )}
          </div>
        </div>

        <div
          id="callAvatarsContainer"
          className="p-2 flex w-full items-center justify-center mt-auto relative gap-2 flex-wrap"
        >
          {participantAvatars}
        </div>

        <div className="flex flex-col">
          <div className="flex items-center text-center justify-center mt-4 text-lime-600 text-lg gap-2">
            <div className="overflow-hidden max-w-[80%] h-fit overflow-ellipsis">
              {callOverlayOpenMode === "previewCall" &&
                `Harmony ongoing in ${chatroom.name}..`}
              {callOverlayOpenMode !== "previewCall" && `Calling In Harmony..`}
            </div>
            <div
              style={{
                animationDelay: "0.5s",
              }}
            >
              <FaFeatherPointed size={24} />
            </div>

            <p
              className={`w-[5ch] ${
                callElapsedTime !== "00:00" ? "max-w-[5ch]" : "max-w-0"
              } transition-all overflow-hidden text-lime-600`}
            >
              {callElapsedTime}
            </p>
          </div>

          {callContext?.callErrorText.status.length ? (
            <div className="animate-fadeInDown flex items-center gap-2 justify-center text-center text-orange-500 font-bold">
              <MdOutlineWarning size={16} />
              {callContext?.callErrorText.status}
            </div>
          ) : (
            <></>
          )}

          {callContext?.callErrorText.error.length ? (
            <div className="animate-fadeInDown flex items-center gap-2 justify-center text-center text-red-500 font-bold">
              <MdOutlineError size={16} />
              {callContext?.callErrorText.error}
            </div>
          ) : (
            <></>
          )}

          {callContext?.callErrorText.settingsStatus.length ? (
            <div className="animate-fadeInDown flex items-center gap-2 justify-center text-center text-orange-500 font-bold">
              <MdWarning size={16} />
              {callContext?.callErrorText.settingsStatus}
            </div>
          ) : (
            <></>
          )}

          {callContext?.callErrorText.micStatus.length ? (
            <div className="animate-fadeInDown flex items-center gap-2 justify-center text-center text-orange-500 font-bold">
              <MdWarning size={16} />
              {callContext?.callErrorText.micStatus}
            </div>
          ) : (
            <></>
          )}

          {callContext?.callErrorText.musicStatus.length ? (
            <div className="animate-fadeInDown flex items-center gap-2 justify-center text-center text-red-500 font-bold">
              <FaMusic size={16} />

              <MdOutlineError size={16} />
              {callContext?.callErrorText.musicStatus}
            </div>
          ) : (
            <></>
          )}

          {callContext?.callErrorText.musicDisplay.length ? (
            <div className="animate-fadeInDown flex items-center gap-2 justify-center text-center text-lime-600 font-bold">
              <FaMusic size={16} />

              {callContext?.callErrorText.musicDisplay}
            </div>
          ) : (
            <></>
          )}

          {callOverlayOpenMode === "previewCall" &&
          chatroom.callInstance?.hasMusic ? (
            <div className="animate-fadeInDown flex items-center gap-2 justify-center text-center text-lime-600 font-bold">
              <FaMusic size={16} />

              {"Listening to Music"}
            </div>
          ) : (
            <></>
          )}
        </div>

        <div className="flex items-center flex-wrap justify-center text-center w-full mt-4 gap-4 mb-auto">
          {callOverlayOpenMode !== "previewCall" ? (
            <>
              <Popover
                parentElement={
                  document.getElementById("overlayContainer") ?? document.body
                }
                isOpen={videoMenuOpen}
                containerStyle={{
                  zIndex: "10",
                }}
                onClickOutside={() => {
                  setVideoMenuOpen(false);
                }}
                positions={["bottom", "right", "left"]}
                content={videoListMenu}
              >
                <div className="self-center">
                  <div className="cursor-pointer rounded-full relative">
                    <FloatingButton
                      description={
                        currentUser.isVideoEnabled
                          ? "Disable Video"
                          : "Enable Video"
                      }
                      customDescriptionSize="text-xl"
                      backgroundColor="bg-white"
                      customTextColor="text-lime-500"
                      hoverColor="hover:text-lime-600"
                      onClick={() => {
                        const alwaysPreviewVideo =
                          localStorage.getItem("alwaysPreviewVideo") ?? "no";
                        if (
                          alwaysPreviewVideo === "yes" &&
                          !currentUser.isVideoEnabled
                        ) {
                          callContext?.handlePreviewVideo(
                            currentUser,
                            chatroom,
                            true
                          );
                        } else {
                          callContext?.handleEnableVideo(
                            !currentUser.isVideoEnabled,
                            chatroom.id
                          );
                        }
                      }}
                    >
                      <div className="w-full h-full p-2">
                        {!currentUser.isVideoEnabled ? (
                          <BsCameraVideoOffFill size={32} />
                        ) : (
                          <BsCameraVideoFill size={32} />
                        )}
                      </div>
                    </FloatingButton>

                    <div
                      className={`${
                        videoMenuOpen ? "rotate-180" : "rotate-0"
                      } absolute bottom-0 translate-y-[25%] translate-x-[25%] bg-white border-2 border-lime-400 grid
              place-content-center w-[1.5rem] h-[1.5rem] right-0 z-[1] rounded-full text-lime-500 hover:bg-gray-200 transition
              `}
                      onClick={() => {
                        setVideoMenuOpen((prev) => !prev);
                      }}
                    >
                      <MdArrowDropDown />
                    </div>
                  </div>
                </div>
              </Popover>

              <div className="self-center">
                <FloatingButton
                  disabled={
                    chatroom.callInstance === null ||
                    chatroom.callInstance === undefined ||
                    navigator.mediaDevices.getDisplayMedia === undefined
                  }
                  onClick={() => {
                    handleShareScreen();
                  }}
                  description={
                    currentUser.isScreenShareEnabled !== "no"
                      ? "Stop Sharing"
                      : "Share Screen"
                  }
                  customDescriptionSize="text-xl"
                  backgroundColor="bg-lime-700"
                  customTextColor="text-white"
                >
                  <div
                    onMouseEnter={() => {
                      if (screenButtonHoverTimeout.current) {
                        clearTimeout(screenButtonHoverTimeout.current);
                      }
                      setScreenButtonHover(true);
                      screenButtonHoverTimeout.current = setTimeout(() => {
                        setScreenButtonHover(false);
                      }, 600);
                    }}
                    className={`p-2 cursor-pointer ${
                      screenButtonHover
                        ? "animate-tiltBackAndForth"
                        : "animate-none"
                    }`}
                  >
                    {currentUser.isScreenShareEnabled !== "no" ? (
                      <MdScreenShare size={32} />
                    ) : (
                      <MdStopScreenShare size={32} />
                    )}
                  </div>
                </FloatingButton>
              </div>

              <Popover
                parentElement={
                  document.getElementById("overlayContainer") ?? document.body
                }
                isOpen={voiceMenuOpen}
                containerStyle={{
                  zIndex: "10",
                }}
                onClickOutside={() => {
                  setVoiceMenuOpen(false);
                }}
                positions={["bottom", "right", "left"]}
                content={devicesListMenu}
              >
                <div className="self-center">
                  <div className="cursor-pointer rounded-full relative">
                    <FloatingButton
                      description={currentUser.isCallMuted ? "Unmute" : "Mute"}
                      customDescriptionSize="text-xl"
                      backgroundColor="bg-white"
                      customTextColor="text-lime-500"
                      hoverColor="hover:text-lime-600"
                      onClick={() => {
                        callContext?.handleToggleMute(!currentUser.isCallMuted);
                      }}
                    >
                      <div
                        onMouseEnter={() => {
                          if (muteButtonHoverTimeout.current) {
                            clearTimeout(muteButtonHoverTimeout.current);
                          }
                          setMuteButtonHover(true);
                          muteButtonHoverTimeout.current = setTimeout(() => {
                            setMuteButtonHover(false);
                          }, 750);
                        }}
                        className={`w-full h-full p-2 origin-bottom cursor-pointer ${
                          muteButtonHover
                            ? "animate-tiltBackAndForth"
                            : "animate-none"
                        }`}
                      >
                        {currentUser.isCallMuted ? (
                          <BsFillMicMuteFill size={32} />
                        ) : (
                          <BsFillMicFill size={32} />
                        )}
                      </div>
                    </FloatingButton>
                    <div
                      className={`${
                        voiceMenuOpen ? "rotate-180" : "rotate-0"
                      } absolute bottom-0 translate-y-[25%] translate-x-[25%] bg-white border-2 border-lime-400 grid
              place-content-center w-[1.5rem] h-[1.5rem] right-0 z-[1] rounded-full text-lime-500 hover:bg-gray-200 transition
              `}
                      onClick={() => {
                        setVoiceMenuOpen((prev) => !prev);
                      }}
                    >
                      <MdArrowDropDown />
                    </div>
                  </div>
                </div>
              </Popover>
              <div className="self-center">
                <FloatingButton
                  disabled={
                    chatroom.callInstance === null ||
                    chatroom.callInstance === undefined
                  }
                  onClick={async () => {
                    handleEndCall();
                  }}
                  description="Hang up"
                  customDescriptionSize="text-xl"
                  backgroundColor="bg-red-500"
                  customTextColor="text-white"
                >
                  <div
                    onMouseEnter={() => {
                      if (callButtonHoverTimeout.current) {
                        clearTimeout(callButtonHoverTimeout.current);
                      }
                      setCallButtonHover(true);
                      callButtonHoverTimeout.current = setTimeout(() => {
                        setCallButtonHover(false);
                      }, 600);
                    }}
                    className={`p-2 cursor-pointer ${
                      callButtonHover ? "animate-jumpAndWave" : "animate-none"
                    }`}
                  >
                    <MdCallEnd size={32} />
                  </div>
                </FloatingButton>
              </div>

              <div className="self-center">
                <FloatingButton
                  disabled={
                    chatroom.callInstance === null ||
                    chatroom.callInstance === undefined
                  }
                  onClick={async () => {
                    callContext?.handleToggleDeafen(!currentUser.isDeafened);
                  }}
                  description={currentUser.isDeafened ? "Undeafen" : "Deafen"}
                  customDescriptionSize="text-xl"
                  backgroundColor="bg-red-500"
                  customTextColor="text-white"
                >
                  <div className={`p-2 cursor-pointer`}>
                    {currentUser.isDeafened ? (
                      <TbHeadphonesOff size={32} />
                    ) : (
                      <TbHeadphones size={32} />
                    )}
                  </div>
                </FloatingButton>
              </div>

              <Popover
                parentElement={
                  document.getElementById("overlayContainer") ?? document.body
                }
                isOpen={emojiOpen}
                containerStyle={{
                  zIndex: "40",
                }}
                onClickOutside={() => {
                  setEmojiOpen(false);
                }}
                positions={["bottom", "right", "left", "top"]}
                content={
                  <div className="mb-2 overflow-y-scroll">
                    <div className="w-full h-full sm:hidden">
                      <EmojiPicker
                        perLine={7}
                        onEmojiSelect={handleEmojiSelect}
                      />
                    </div>
                    <div className="w-full h-full hidden sm:block">
                      <EmojiPicker onEmojiSelect={handleEmojiSelect} />
                    </div>
                  </div>
                }
              >
                <div className="self-center">
                  <FloatingButton
                    disabled={
                      chatroom.callInstance === null ||
                      chatroom.callInstance === undefined ||
                      soundPickerPending
                    }
                    onClick={() => {
                      setEmojiOpen(true);
                    }}
                    description={"Express Emoji"}
                    customDescriptionSize="text-xl"
                    backgroundColor="bg-lime-600"
                    customTextColor="text-white"
                  >
                    <div className="p-2 group cursor-pointer transition hover:scale-125">
                      <div className={`group-hover:hidden`}>
                        <BsEmojiExpressionlessFill size={32} />
                      </div>

                      <div className="hidden group-hover:block">
                        <BsEmojiSmileFill size={32} />
                      </div>
                    </div>
                  </FloatingButton>
                </div>
              </Popover>

              <div
                className="self-center relative"
                ref={setSoundPickerParentRef}
              >
                {soundOpen && (
                  <div
                    ref={setSoundOverlayRef}
                    className="fixed z-40"
                    style={{
                      top: soundPickerOverlayCoords.top,
                      left: soundPickerOverlayCoords.left,
                    }}
                  >
                    <SoundPicker
                      currentChatRoom={chatroom}
                      currentUser={currentUser}
                      setEmojiBubbleShortCode={setEmojiBubbles}
                      soundPickerPending={soundPickerPending}
                      setSoundPickerPending={setSoundPickerPending}
                    />
                  </div>
                )}

                <FloatingButton
                  disabled={
                    chatroom.callInstance === null ||
                    chatroom.callInstance === undefined
                  }
                  onClick={() => {
                    if (!soundPickerPending) setSoundOpen((prev) => !prev);
                  }}
                  description={"Share Sound"}
                  customDescriptionSize="text-xl"
                  backgroundColor={`
                    ${
                      contentDisplayContext?.rootMusicPlayerOptions?.src.length
                        ? "bg-white"
                        : "bg-lime-600"
                    }
                    }`}
                  customTextColor={
                    contentDisplayContext?.rootMusicPlayerOptions?.src.length
                      ? "text-lime-600"
                      : "text-white"
                  }
                >
                  {contentDisplayContext?.rootMusicPlayerOptions?.src.length ? (
                    <div className="absolute w-full h-full rounded-full -top-2 -left-2 pointer-events-none">
                      <ClipLoader
                        speedMultiplier={0.5}
                        color={
                          isLightMode ? "rgb(132,204,22)" : "rgb(163,230,53)"
                        }
                        size={"4rem"}
                      />
                    </div>
                  ) : (
                    <></>
                  )}
                  <div
                    className={
                      "p-2 group cursor-pointer transition hover:animate-[music_1s_infinite_alternate] dark:hover:animate-[musicLightTheme_1s_infinite_alternate]"
                    }
                  >
                    <IoIosMusicalNotes size={32} />
                  </div>
                </FloatingButton>
              </div>
            </>
          ) : (
            <>
              <div className="self-center">
                <FloatingButton
                  disabled={
                    chatroom.callInstance === null ||
                    chatroom.callInstance === undefined
                  }
                  onClick={() => {
                    handleStartCall();
                  }}
                  description="Tune in"
                  customDescriptionSize="text-xl"
                  backgroundColor="bg-lime-600"
                  customTextColor="text-white"
                >
                  <div
                    onMouseEnter={() => {
                      if (callButtonHoverTimeout.current) {
                        clearTimeout(callButtonHoverTimeout.current);
                      }
                      setCallButtonHover(true);
                      callButtonHoverTimeout.current = setTimeout(() => {
                        setCallButtonHover(false);
                      }, 600);
                    }}
                    className={`p-2 cursor-pointer ${
                      callButtonHover ? "animate-jumpAndWave" : "animate-none"
                    }`}
                  >
                    <MdCall size={32} />
                  </div>
                </FloatingButton>
              </div>

              <div className="self-center">
                <FloatingButton
                  disabled={
                    chatroom.callInstance === null ||
                    chatroom.callInstance === undefined
                  }
                  onClick={() => {
                    handleStartCall(true);
                  }}
                  description="Tune in with video"
                  customDescriptionSize="text-xl"
                  backgroundColor="bg-lime-600"
                  customTextColor="text-white"
                >
                  <div
                    onMouseEnter={() => {
                      if (videoButtonHoverTimeout.current) {
                        clearTimeout(videoButtonHoverTimeout.current);
                      }
                      setVideoButtonHover(true);
                      videoButtonHoverTimeout.current = setTimeout(() => {
                        setVideoButtonHover(false);
                      }, 600);
                    }}
                    className={`p-2 cursor-pointer ${
                      videoButtonHover ? "animate-jumpAndWave" : "animate-none"
                    }`}
                  >
                    <IoMdVideocam size={32} />
                  </div>
                </FloatingButton>
              </div>
            </>
          )}
          {shouldShowAbortCallButton ? (
            <div className="self-center">
              <FloatingButton
                disabled={
                  chatroom.callInstance === null ||
                  chatroom.callInstance === undefined
                }
                onClick={() => {
                  handleAbortCall();
                }}
                description="Abort call"
                customDescriptionSize="text-xl"
                backgroundColor="bg-orange-500"
                customTextColor="text-white"
              >
                <div className={`p-2 cursor-pointer`}>
                  <FaStop size={32} />
                </div>
              </FloatingButton>
            </div>
          ) : (
            <></>
          )}
        </div>
      </div>
    </Popover>
  );
}
