"use client";
import { CompatClient, IFrame, StompSubscription } from "@stomp/stompjs";
import { useIsFetching, useMutation, useQuery } from "@tanstack/react-query";
import { AxiosResponse } from "axios";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { FaCheck, FaPlus, FaUserFriends } from "react-icons/fa";
import { Popover } from "react-tiny-popover";
import { useWindowSize } from "usehooks-ts";
import api from "../api/api";
import DirectMessageBar from "../components/DirectMessageBar";
import FloatingButton from "../components/FloatingButton";
import LoadingScreen from "../components/LoadingScreen";
import LoadingToast from "../components/LoadingToast";
import PrimaryModal from "../components/PrimaryModal";
import PrimaryToast from "../components/PrimaryToast";
import SelectFriendsInterface from "../components/SelectFriendsInterface";
import Sidebar from "../components/Sidebar";
import SubSidebar from "../components/SubSidebar";
import Userbar from "../components/Userbar";
import Constants from "../constants/Constants";
import AuthenticationContext from "../contexts/AuthenticationContext";
import ContentDisplayContext from "../contexts/ContentDisplayContext";
import FriendsPageTabContext from "../contexts/FriendsPageTabContext";
import ModalContext from "../contexts/ModalContext";
import StompContext from "../contexts/StompContext";
import ToastContext from "../contexts/ToastContext";
import queryClient from "../query/QueryClient";
import { socketapi } from "../socket/socketapi";
import { ChatRoom } from "../types/ChatRoom";
import { User } from "../types/User";
import React from "react";
import { ChatRecordType } from "../types/ChatRecordType";
import { createAvatar } from "@dicebear/core";
import { icons } from "@dicebear/collection";

import Cookies from "js-cookie";

import ChatNotificationContext from "../contexts/ChatNotificationContext";
import CallAlertOverlay from "../components/CallAlertOverlay";
import SoundUtil from "../util/SoundUtil";
import CallContext from "../contexts/CallContext";
import { ICECanddiate } from "../types/ICECandidate";
import sdpTransform from "sdp-transform";
import ModalUtils from "../util/ModalUtil";
import PrimaryButton from "../components/PrimaryButton";
import { IoCheckmark } from "react-icons/io5";

import { MdCall, MdVideoCall } from "react-icons/md";
import { FaMessage, FaX } from "react-icons/fa6";
import { IoMdVideocam, IoMdWarning } from "react-icons/io";
import GenericUtil from "../util/GenericUtil";
import data from "@emoji-mart/data";
import { init } from "emoji-mart";
import { Sound } from "../types/Sound";
import AudioPreview from "../components/AudioPreview";
import BackgroundUtil from "../util/BackgroundUtil";
import SettingsPage from "../components/SettingsPage";
import { UserSettings } from "../types/UserSettings";
import { CustomWindow } from "../types/globals";
import VideoCallDisplay from "../components/VideoCallDisplay";
import ConversationSearchUI from "../components/ConversationSearchUI";

declare let window: CustomWindow;

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  useLayoutEffect(() => {
    init({ data });
  }, []);
  const [contentDisplayMode, setContentDisplayMode] =
    useState<string>("hideSubsidebar");
  const [openModal, setOpenModal] = useState(false);
  const [modalType, setModalType] = useState("");
  const [modalShouldExitAnimation, setModalShouldExitAnimation] =
    useState(false);
  const [openSettingsPage, setOpenSettingsPage] = useState(false);
  const [genericHeader, setGenericHeader] = useState("");
  const [genericContent, setGenericContent] = useState("");
  const [toastMessage, setToastMessage] = useState<string | React.ReactNode>(
    ""
  );

  const router = useRouter();
  const [settingsPageDefaultTab, setSettingsPageDefaultTab] = useState("");
  const [rootMusicPlayerOptions, setRootMusicPlayerOptions] = useState<{
    targetElement: HTMLDivElement | null;
    src: string;
    uuid: string;
    customTextColor: string;
    autoPlay: undefined | "simple" | "withevent";
    loop: boolean;
    allLoop: boolean;
    srcList: string[];
  } | null>(null);

  const [rootMusicPlayerRemoteController, setRootMusicPlayerRemoteController] =
    useState<HTMLAudioElement | null>(null);

  const rootMusicPlayerRef = useRef<HTMLAudioElement | null>(null);
  const rootMusicPlayerOptionsRef = useRef<{
    targetElement: HTMLDivElement | null;
    src: string;
    uuid: string;
    customTextColor: string;
    autoPlay: undefined | "simple" | "withevent";
    loop: boolean;
    allLoop: boolean;
    srcList: string[];
  } | null>(null);

  useEffect(() => {
    rootMusicPlayerRef.current = rootMusicPlayerRemoteController;
  }, [rootMusicPlayerRemoteController]);

  useEffect(() => {
    rootMusicPlayerOptionsRef.current = rootMusicPlayerOptions;
  }, [rootMusicPlayerOptions]);

  useEffect(() => {
    if (rootMusicPlayerOptions?.src.length) {
      setCallErrorText((prev) => ({
        ...prev,
        musicDisplay:
          "Now Playing - " +
          rootMusicPlayerOptions?.src
            .split("/")
            .pop()
            ?.split("_")
            .pop()
            ?.split(".")[0],
      }));
    } else {
      setCallErrorText((prev) => ({
        ...prev,
        musicDisplay: "",
      }));
    }
  }, [rootMusicPlayerOptions?.src]);
  const [videoStreams, setVideoStreams] = useState<{
    [userId: number | string]: MediaStream;
  }>({});
  const [recentChatNotifications, setRecentChatNotifications] = useState<{
    [chatRoomId: number]: number;
  }>({});

  const [callOverlayRemoteController, setCallOverlayRemoteController] =
    useState<string>("");
  const [callDecorator, setCallDecorator] = useState<{
    [userId: number]: string;
  }>({});
  const [toastType, setToastType] = useState("");
  const [toastShowLoader, setToastShowLoader] = useState(false);
  const [shouldBatchResetChatsQuery, setShouldBatchResetChatsQuery] =
    useState(0);

  const [currentCallingChatRoom, setCurrentCallingChatroom] = useState<
    ChatRoom | undefined
  >(undefined);
  const currentCallingChatRoomRef = useRef<ChatRoom | undefined>(undefined);

  const dispatchNotification = useCallback(
    (title: string, body: string, icon: string, url: string) => {
      navigator.serviceWorker.ready.then(function (registration) {
        registration.showNotification(title, {
          body,
          icon,
          data: url,
        });
      });

      // const notification = new Notification(title, {
      //   body,
      //   icon,
      // });
      // notification.onclick = onClick;
    },
    []
  );

  const [toastOpen, setToastOpen] = useState(false);
  const [customContent, setCustomContent] = useState<React.ReactNode>(<></>);
  const [onAccept, setOnAccept] = useState<
    () => void | ((e: FileList) => string)
  >(() => {});
  const [onReject, setOnReject] = useState<() => void>(() => {});
  const [customButtonSet, setCustomButtonSet] = useState<
    React.ReactNode[] | undefined
  >([]);

  const [customHeader, setCustomHeader] = useState<React.ReactNode>(<></>);
  const [clickOutsideToClose, setClickOutsideToClose] = useState(false);
  const [friendsPageTab, setFriendsPageTab] = useState("Online");
  const [showSelectFriendsInterface, setShowSelectFriendsInterface] =
    useState(false);
  const [shouldRerenderDirectMessageBar, setShouldRerenderDirectMessageBar] =
    useState(false);
  const [chatRoomsDivHeight, setChatRoomsDivHeight] = useState(0);
  const [incomingCallChatRoom, setIncomingCallChatRoom] = useState<
    ChatRoom | undefined
  >(undefined);
  const [
    callAlertOverlayRemoteController,
    setCallAlertOverlayRemoteController,
  ] = useState<string>("");
  const incomingCallChatRoomRef = useRef<ChatRoom | null>(null);
  const [isLoadingLong, setIsLoadingLong] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [notificationCount, setNotificationCount] = useState({
    id: 0,
    signal: 0,
  });

  const [contextMenus, setContextMenus] = useState<[string, React.ReactNode][]>(
    []
  );

  const userSettings = useQuery({
    queryKey: ["user_settings"],
    queryFn: async () => {
      const response = await api.get<UserSettings>("/users/settings");
      return {
        data: response.data,
      };
    },
  });

  useQuery({
    queryKey: ["currentuser_aboutme"],
    queryFn: async () => {
      const response = await api.get<string>("/users/aboutme");
      return {
        data: response.data,
      };
    },
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  useQuery({
    queryKey: ["blockeds"],
    queryFn: async () => {
      const response = await api.get<User[]>("/users/blockeds");
      return {
        data: response.data,
      };
    },
  });

  useQuery({
    queryKey: ["blockers"],
    queryFn: async () => {
      const response = await api.get<User[]>("/users/blockers");
      return {
        data: response.data,
      };
    },
  });

  const friends = useQuery({
    queryKey: ["friends"],
    queryFn: async () => {
      const response = await api.get<User[]>("/users/friends");
      return {
        data: response.data,
      };
    },
  });

  const [devices, setDevices] = useState<{
    audioInputDevices: MediaDeviceInfo[];
    audioOutputDevices: MediaDeviceInfo[];
    videoInputDevices: MediaDeviceInfo[];
  }>({ audioInputDevices: [], audioOutputDevices: [], videoInputDevices: [] });
  const userMediaTrackIds = useRef<Set<string>>(new Set());
  const userDisplayTrackIds = useRef<Set<string>>(new Set());
  const updateDeviceList = useCallback(async (): Promise<
    [string, string, boolean]
  > => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();

      if (devices.length === 0) {
        throw new Error("Empty devices list");
      }

      let newDeviceName = "";
      let newDeviceId = "";
      let isVideo = false;

      const audioInputDeviceIds = new Set(
        devicesRef.current.audioInputDevices.map((device) => device.deviceId)
      );

      const videoInputDeviceIds = new Set(
        devicesRef.current.videoInputDevices.map((device) => device.deviceId)
      );

      //detect new audio/video devices
      //if there are multiple at once, just take the last one
      devices.forEach((device) => {
        if (
          !audioInputDeviceIds.has(device.deviceId) &&
          device.deviceId !== "default" &&
          device.kind === "audioinput"
        ) {
          newDeviceName = device.label;
          newDeviceId = device.deviceId;
          isVideo = false;
        }

        if (
          !videoInputDeviceIds.has(device.deviceId) &&
          device.deviceId !== "default" &&
          device.kind === "videoinput"
        ) {
          newDeviceName = device.label;
          newDeviceId = device.deviceId;
          isVideo = true;
        }
      });

      if (
        (selectedDeviceRef.current.audioUserInputDevice.length &&
          !devices.find(
            (e) => e.deviceId === selectedDeviceRef.current.audioUserInputDevice
          )) ||
        selectedDeviceRef.current.audioUserInputDevice === "default"
      ) {
        //audio device lost, fall back to default device
        const firstInputDevice = devices.find((e) => e.kind === "audioinput");
        if (firstInputDevice)
          handleChangeDevice(firstInputDevice.deviceId, false);
      }

      if (
        (selectedDeviceRef.current.videoUserInputDevice.length &&
          !devices.find(
            (e) => e.deviceId === selectedDeviceRef.current.videoUserInputDevice
          )) ||
        selectedDeviceRef.current.videoUserInputDevice === "default"
      ) {
        //video device lost, fall back to default device
        console.log("video device lost, defaulting to first device");
        const firstInputDevice = devices.find((e) => e.kind === "videoinput");
        if (firstInputDevice)
          handleChangeDevice(firstInputDevice.deviceId, true);
      }

      setDevices((prev) => ({
        ...prev,
        audioInputDevices: devices.filter(
          (device) => device.kind === "audioinput"
        ),
        videoInputDevices: devices.filter(
          (device) => device.kind === "videoinput"
        ),
      }));

      return [newDeviceName, newDeviceId, isVideo];
    } catch (err) {
      console.error(err);
      ModalUtils.openGenericModal(
        {
          setGenericContent,
          setGenericHeader,
          setModalType,
          setClickOutsideToClose,
          setCustomButtonSet,
          setCustomContent,
          setCustomHeader,
          setOnAccept,
          setOnReject,
          setOpen: setOpenModal,
          open: openModal,
          setShouldExitAnimation: setModalShouldExitAnimation,
        },
        "Uh oh.",
        "Failed to detect/update device information. Note that this may cause problems during call and selecting media devices may be unavailable."
      );
    }

    return ["", "", false];
  }, []);

  const chatRoomsDivRef = useRef<HTMLDivElement>(null);
  const userBarRef = useRef<HTMLDivElement>(null);
  const windowSize = useWindowSize();

  const selectFriendsInterfaceRef = useRef<HTMLDivElement>(null);

  const selectedCallBackgroundRef = useRef<string>("");

  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fetchingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [stompClient, setStompClient] = useState<CompatClient | null>(null);
  const [stompFrame, setStompFrame] = useState<IFrame | null>(null);

  const idleTimeoutMiliseconds = 600 * 1000; //10 minutes
  const longLoadingTimeout = 3 * 1000; //3 seconds

  const pathname = usePathname();

  const isFetching = useIsFetching(undefined, queryClient);

  useEffect(() => {
    if (isFetching > 0) {
      fetchingTimerRef.current = setTimeout(() => {
        setIsLoadingLong(true);
      }, longLoadingTimeout);
    } else {
      if (fetchingTimerRef.current) {
        clearTimeout(fetchingTimerRef.current);
        setIsLoadingLong(false);
      }
    }

    return () => {
      if (fetchingTimerRef.current) clearTimeout(fetchingTimerRef.current);
    };
  }, [isFetching]);

  const currentUser = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const response = await api.get<User>("/users");
      return { data: response.data };
    },
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  const spamRoom = useQuery({
    queryKey: ["chatroom_dm", "-1"],
    queryFn: async (): Promise<{ data: ChatRoom }> => {
      const [notificationCount, latestMessageId] = (
        await api.get<number[]>(`/chatrooms/directmessaging/notifications/-1`)
      ).data ?? [0, 0];

      //placeholder chatroom data for spam mailbox
      return {
        data: {
          id: -1,
          name: "Spams",
          participants: [
            {
              id: -1,
              email: "spam@spam.com",
              nickname: "",
              username: "Spams",
              birthDate: new Date(),
              status: "OFFLINE",
              statusMessage: undefined,
              profileImageUrl: undefined,
              profileColor: "#000000",
              isCallMuted: false,
              isVideoEnabled: false,
              isScreenShareEnabled: "no",
              isDeafened: false,
              accountType: "ACCORD",
              canPreviewStream: false,
              registeredAt: new Date(),
            },
            {
              id: -1,
              email: "spam@spam.com",
              nickname: "",
              username: "Spams",
              birthDate: new Date(),
              status: "OFFLINE",
              statusMessage: undefined,
              profileImageUrl: undefined,
              profileColor: "#000000",
              isCallMuted: false,
              isVideoEnabled: false,
              isScreenShareEnabled: "no",
              isDeafened: false,
              accountType: "ACCORD",
              canPreviewStream: false,
              registeredAt: new Date(),
            },
          ],
          direct1to1Identifier: "Spam#0@Spam#0",
          ownerId: 0,
          notificationCount: notificationCount,
          latestMessageId: latestMessageId,
          sounds: [],
          backgrounds: [],
        },
      };
    },
    refetchOnWindowFocus: false,
  });

  const chatRooms = useQuery({
    queryKey: ["chatroom_dm"],
    queryFn: async () => {
      const response = await api.get<ChatRoom[]>("/chatrooms/directmessaging");
      return {
        data: response.data,
      };
    },
    refetchOnWindowFocus: false,
  });

  const handleError = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data: AxiosResponse<any, any> | undefined) => {
      if (data) {
        ModalUtils.handleGenericError(
          {
            setGenericContent,
            setGenericHeader,
            setModalType,
            setClickOutsideToClose,
            setCustomButtonSet,
            setCustomContent,
            setCustomHeader,
            setOnAccept,
            setOnReject,
            setOpen: setOpenModal,
            open: openModal,
            setShouldExitAnimation: setModalShouldExitAnimation,
          },
          data
        );
      }
    },
    []
  );

  //call logic

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const subscriptionConnection = useRef<RTCPeerConnection | null>(null);
  const localIceCandidates = useRef<ICECanddiate[]>([]);

  const subscribed = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Initialize the peer connection only on the client side
      peerConnection.current = new RTCPeerConnection(Constants.iceServerConfig);
      subscriptionConnection.current = new RTCPeerConnection(
        Constants.iceServerConfig
      );
    }

    let subscribeHandler: NodeJS.Timeout | null = null;

    let lastProcessed = -1;
    const subscribeProcessor = async () => {
      //every 1 second, process the subscription whose join time is the most recent, as
      //the rest would be redundant

      if (subscribeQueue.current.length > 0 && !callWorkPending.current) {
        const latestJoin = subscribeQueue.current.reduce((max, current) =>
          current.joinTime > max.joinTime ? current : max
        );

        if (latestJoin.joinTime > lastProcessed) {
          try {
            await handleSubscribeStreamInternal(latestJoin.chatRoom);
            setCallErrorText((prev) => ({
              ...prev,
              error: "",
            }));
          } catch (err) {
            console.error(err);
            setCallErrorText((prev) => ({
              ...prev,
              error:
                "Could not establish the call, please try again! Are you perhaps entering and exiting call too fast?",
            }));
          }
          lastProcessed = latestJoin.joinTime;
        }

        //remove obsolete data
        subscribeQueue.current = subscribeQueue.current.filter(
          (item) => item.joinTime > lastProcessed
        );
      }
      subscribeHandler = setTimeout(subscribeProcessor, 1000);
    };

    subscribeHandler = setTimeout(subscribeProcessor, 1000);

    return () => {
      // Cleanup: Close the peer connection on unmount
      if (peerConnection.current) {
        peerConnection.current.close();
      }

      if (subscriptionConnection.current) {
        subscriptionConnection.current.close();
      }

      if (subscribeHandler) {
        clearTimeout(subscribeHandler);
      }
    };
  }, []);

  const [callErrorText, setCallErrorText] = useState<{
    status: string;
    error: string;
    musicStatus: string;
    musicDisplay: string;
    settingsStatus: string;
    micStatus: string;
  }>({
    status: "",
    error: "",
    musicStatus: "",
    musicDisplay: "",
    settingsStatus: "",
    micStatus: "",
  });

  const endCallMutation = useMutation({
    mutationFn: () => {
      return api.delete("/call/leave");
    },
  });

  const rejectCallMutation = useMutation({
    mutationFn: (chatRoom: ChatRoom) => {
      return api.post(`/call/reject/${chatRoom.id ?? -1}`);
    },
  });

  const endCallPending = useRef<boolean>(false);
  const rejectCallPending = useRef<boolean>(false);

  const handleRejectIncomingCall = useCallback(
    async (chatRoom: ChatRoom, currentUser: User) => {
      if (rejectCallPending.current) {
        throw new Error("Could not reject call; Reject call already pending");
      }
      try {
        rejectCallPending.current = true;
        const data = await rejectCallMutation.mutateAsync(chatRoom);
        if (!data) {
          throw new Error("Could not reject call; Unknown error");
        }

        if (data.status === 200) {
          //remove user from the pending participants in the chatroom's call instance
          queryClient.setQueryData(
            ["chatroom_dm", chatRoom?.id.toString()],
            (prev: { data: ChatRoom }) => {
              if (!prev || !prev.data.callInstance) return prev;

              return {
                data: {
                  ...prev.data,
                  callInstance: {
                    ...prev.data.callInstance,
                    pendingParticipants:
                      prev.data.callInstance.pendingParticipants.filter(
                        (user) => user.id !== currentUser.id
                      ),
                  },
                },
              };
            }
          );

          queryClient.setQueryData(
            ["chatroom_dm"],
            (prev: { data: ChatRoom[] }) => {
              if (!prev) return prev;

              return {
                data: prev.data.map((chatroom) => {
                  if (chatroom.id === chatRoom.id && chatroom.callInstance) {
                    return {
                      ...chatroom,
                      callInstance: {
                        ...chatroom.callInstance,
                        pendingParticipants:
                          chatroom.callInstance.pendingParticipants.filter(
                            (user) => user.id !== currentUser.id
                          ),
                      },
                    };
                  }
                  return chatroom;
                }),
              };
            }
          );

          setIncomingCallChatRoom(undefined);
          SoundUtil.stopSound(
            Constants.SERVER_STATIC_CONTENT_PATH + "calling_theme.mp3"
          );

          //
        } else {
          throw new Error(data.data);
        }
      } catch (err) {
        console.error(err);
        throw err;
      } finally {
        rejectCallPending.current = false;
      }
    },
    []
  );

  const handleEndCall = useCallback(
    async (
      chatRoom: ChatRoom,
      currentUser: User,
      onIfCallEnded?: (callEnded: boolean) => void
    ) => {
      if (endCallPending.current) {
        throw new Error("Could not end call; End call already pending");
      }
      try {
        endCallPending.current = true;
        const data = await endCallMutation.mutateAsync();

        if (!data) return;
        if (data.status !== 200) {
          throw new Error("Could not end the call. Please try again!");
        } else {
          let callEnded = false;
          //set the chatroom's call instance
          queryClient.setQueryData(
            ["chatroom_dm", chatRoom.id.toString()],
            (prev: { data: ChatRoom }) => {
              if (!prev || !prev.data.callInstance) {
                return prev;
              }
              const newActiveParticipants =
                prev.data.callInstance.activeParticipants.filter(
                  (user) => user.id !== currentUser.id
                );
              const newPendingParticipants =
                prev.data.callInstance.pendingParticipants.filter(
                  (user) => user.id !== currentUser.id
                );

              callEnded = newActiveParticipants.length === 0;

              if (onIfCallEnded) onIfCallEnded(callEnded);

              if (callEnded) {
                return {
                  data: {
                    ...prev.data,
                    callInstance: undefined,
                  },
                };
              }

              return {
                data: {
                  ...prev.data,
                  callInstance: {
                    ...prev.data.callInstance,
                    activeParticipants: newActiveParticipants,
                    pendingParticipants: newPendingParticipants,
                  },
                },
              };
            }
          );
          SoundUtil.stopSound(
            Constants.SERVER_STATIC_CONTENT_PATH + "calling_theme.mp3"
          );
          SoundUtil.playSoundForce(
            Constants.SERVER_STATIC_CONTENT_PATH + "exit_sound.mp3"
          );
          setCurrentCallingChatroom(undefined);

          if (callEnded) {
            queryClient.setQueryData(
              ["chatroom_dm"],
              (prev: { data: ChatRoom[] }) => {
                if (!prev) return prev;

                return {
                  data: prev.data.map((chatroom_) => {
                    if (chatroom_.id === chatRoom.id) {
                      return {
                        ...chatRoom,
                        callInstance: undefined,
                      };
                    }
                    return chatroom_;
                  }),
                };
              }
            );
          }

          //close peerConnections
          handleCloseStream();
        }
      } catch (err) {
        console.error(err);

        throw err;
      } finally {
        endCallPending.current = false;
      }
    },
    []
  );

  const muteMutation = useMutation({
    mutationFn: (muted: boolean) => {
      return api.post("/users/mute", {
        muted,
      });
    },
    onSettled(data, error, variables) {
      if (!data) return;
      if (data.status === 200) {
        queryClient.setQueryData(["user"], (prev: { data: User }) => {
          return {
            data: {
              ...prev.data,
              isCallMuted: variables,
            },
          };
        });

        if (peerConnection.current) {
          peerConnection.current.getSenders().forEach((sender) => {
            if (sender.track && sender.track.kind === "audio") {
              sender.track.enabled = !variables;
            }
          });
        }

        if (variables)
          SoundUtil.playSoundForce(
            Constants.SERVER_STATIC_CONTENT_PATH + "mute_sound.mp3"
          );
        else
          SoundUtil.playSoundForce(
            Constants.SERVER_STATIC_CONTENT_PATH + "unmute_sound.mp3"
          );
      } else {
        ModalUtils.handleGenericError(
          {
            setGenericContent,
            setGenericHeader,
            setModalType,
            setClickOutsideToClose,
            setCustomButtonSet,
            setCustomContent,
            setCustomHeader,
            setOnAccept,
            setOnReject,
            setOpen: setOpenModal,
            open: openModal,
            setShouldExitAnimation: setModalShouldExitAnimation,
          },
          data.data
        );
      }
    },
  });

  const deafenMutation = useMutation({
    mutationFn: (deafened: boolean) => {
      return api.post("/users/deafen", {
        deafened,
      });
    },
    onSettled(data, error, variables) {
      if (!data) return;
      if (data.status === 200) {
        queryClient.setQueryData(["user"], (prev: { data: User }) => {
          return {
            data: {
              ...prev.data,
              isDeafened: variables,
            },
          };
        });

        const activeAudioChannel =
          document.getElementById("activeAudioChannel");
        if (activeAudioChannel) {
          Array.from(activeAudioChannel.children).forEach((child) => {
            if (child instanceof HTMLAudioElement) {
              if (child.id !== "localAudioStream") {
                child.muted = variables;
              }
            }
          });
        }
        if (variables)
          SoundUtil.playSoundForce(
            Constants.SERVER_STATIC_CONTENT_PATH + "deafen_sound.mp3"
          );
        else
          SoundUtil.playSoundForce(
            Constants.SERVER_STATIC_CONTENT_PATH + "undeafen_sound.mp3"
          );
      } else {
        ModalUtils.handleGenericError(
          {
            setGenericContent,
            setGenericHeader,
            setModalType,
            setClickOutsideToClose,
            setCustomButtonSet,
            setCustomContent,
            setCustomHeader,
            setOnAccept,
            setOnReject,
            setOpen: setOpenModal,
            open: openModal,
            setShouldExitAnimation: setModalShouldExitAnimation,
          },
          data.data
        );
      }
    },
  });

  const handleToggleMute = useCallback(
    (muted: boolean) => {
      if (!muteMutation.isPending) {
        muteMutation.mutate(muted);
      }
    },
    [muteMutation]
  );

  const handleToggleDeafen = useCallback(
    (deafened: boolean) => {
      if (!deafenMutation.isPending) {
        deafenMutation.mutate(deafened);
      }
    },
    [deafenMutation]
  );

  const handleCloseStream = useCallback(() => {
    //close all streams

    //close all connections
    if (peerConnection.current) {
      peerConnection.current.getSenders().forEach((sender) => {
        if (sender.track) {
          sender.track.stop();
        }
      });
      peerConnection.current.close();
    }
    if (subscriptionConnection.current) {
      subscriptionConnection.current.close();
      subscribed.current = false;
    }

    const audioChannel = document.getElementById("activeAudioChannel");
    if (audioChannel) {
      audioChannel.innerHTML = "";
    }

    //clear user media track ids reference
    userMediaTrackIds.current = new Set();
    userDisplayTrackIds.current = new Set();

    setCallDecorator({});
    setVideoStreams({});

    localStreamRef.current = null;

    setRootMusicPlayerOptions(null);

    //close all background applier processors
    BackgroundUtil.closeProcess();

    console.log("cleared all channel.");
  }, []);

  const handleSetAudioStreamVolume = useCallback(
    (userId: number, volume: number, system: boolean) => {
      const audioChannels = document.getElementsByClassName("stream-" + userId);

      if (audioChannels.length === 2) {
        for (const audioChannel of audioChannels) {
          if (audioChannel instanceof HTMLAudioElement) {
            if (
              audioChannel.id.includes(
                system ? "userSystemAudioStream" : "userAudioStream"
              )
            ) {
              audioChannel.volume = volume;
              if (volume === 1.0) {
                if (system)
                  window.localStorage.removeItem(
                    "accord_systemVolume_" + userId
                  );
                else
                  window.localStorage.removeItem(
                    "accord_voiceVolume_" + userId
                  );
              } else {
                if (system)
                  window.localStorage.setItem(
                    "accord_systemVolume_" + userId,
                    volume.toString()
                  );
                else
                  window.localStorage.setItem(
                    "accord_voiceVolume_" + userId,
                    volume.toString()
                  );
              }
              return true;
            }
          }
        }
      }

      return false;
    },
    []
  );

  const [disabledAudioStreams, setDisabledAudioStreams] = useState<Set<string>>(
    new Set()
  );

  const [disabledVideoStreams, setDisabledVideoStreams] = useState<Set<string>>(
    new Set()
  );

  const handleSetEnableAudioStream = useCallback(
    (userId: number, enable: boolean, system: boolean) => {
      if (!subscriptionConnection.current) {
        return false;
      }
      if (enable) {
        window.localStorage.removeItem(
          `accord_${system ? "system" : "voice"}Disabled_` + userId
        );
        setDisabledAudioStreams((prev) => {
          const copy = new Set(prev);
          copy.delete(`${system ? "system" : "voice"}@${userId}`);
          return copy;
        });
      } else {
        window.localStorage.setItem(
          `accord_${system ? "system" : "voice"}Disabled_` + userId,
          "true"
        );
        setDisabledAudioStreams(
          (prev) =>
            new Set([...prev, `${system ? "system" : "voice"}@${userId}`])
        );
      }
      const audioChannels = document.getElementsByClassName("stream-" + userId);
      if (audioChannels.length !== 2) {
        return false;
      }
      try {
        let userTrackId = "-1",
          systemTrackId = "-1";
        for (const audioChannel of audioChannels) {
          if (audioChannel.id.includes("userAudioStream")) {
            userTrackId = audioChannel.id.substring(
              0,
              audioChannel.id.indexOf("_")
            );
          } else if (audioChannel.id.includes("userSystemAudioStream")) {
            systemTrackId = audioChannel.id.substring(
              0,
              audioChannel.id.indexOf("_")
            );
          }
        }

        if (userTrackId === "-1" || systemTrackId === "-1") {
          return false;
        }

        const trackId = system ? systemTrackId : userTrackId;
        const receivers = subscriptionConnection.current.getTransceivers();
        for (const rec of receivers) {
          if (
            rec.receiver &&
            rec.receiver.track &&
            rec.receiver.track.kind === "audio" &&
            rec.receiver.track.id === trackId
          ) {
            rec.receiver.track.enabled = enable;

            return true;
          }
        }
      } catch (err) {
        console.error(err);
        return false;
      }

      return false;
    },
    []
  );

  const handleSetEnableVideoStream = useCallback(
    (userId: number, enable: boolean, screen: boolean) => {
      if (enable) {
        window.localStorage.removeItem(
          `accord_${screen ? "screen" : "camera"}Disabled_` + userId
        );
        setDisabledVideoStreams((prev) => {
          const copy = new Set(prev);
          copy.delete(`${screen ? "screen" : "camera"}@${userId}`);
          return copy;
        });
      } else {
        window.localStorage.setItem(
          `accord_${screen ? "screen" : "camera"}Disabled_` + userId,
          "true"
        );
        setDisabledVideoStreams(
          (prev) =>
            new Set([...prev, `${screen ? "screen" : "camera"}@${userId}`])
        );
      }

      if (!subscriptionConnection.current) {
        return false;
      }

      const videoChannel = videoStreams[userId];
      if (!videoChannel || videoChannel.getVideoTracks().length !== 2) {
        return false;
      }
      try {
        const userTrackId = videoChannel.getVideoTracks()[0].id;
        const screenTrackId = videoChannel.getVideoTracks()[1].id;

        const trackId = screen ? screenTrackId : userTrackId;
        const receivers = subscriptionConnection.current.getTransceivers();
        for (const rec of receivers) {
          if (
            rec.receiver &&
            rec.receiver.track &&
            rec.receiver.track.kind === "video" &&
            rec.receiver.track.id === trackId
          ) {
            rec.receiver.track.enabled = enable;

            return true;
          }
        }
      } catch (err) {
        console.error(err);
        return false;
      }

      return false;
    },
    [videoStreams]
  );

  const handleAddAudioStream = useCallback((stream: MediaStream) => {
    if (stream.getAudioTracks().length === 2) {
      const currentUser = queryClient.getQueryData<{ data: User }>(["user"]);

      const blockeds = queryClient.getQueryData<{ data: User[] }>(["blockeds"]);
      const blockers = queryClient.getQueryData<{ data: User[] }>(["blockers"]);
      if (
        ((blockeds?.data?.length &&
          blockeds.data.find((e) => e.id.toString() === stream.id)) ||
          (blockers?.data?.length &&
            blockers.data.find((e) => e.id.toString() === stream.id))) &&
        !isNaN(Number(stream.id))
      ) {
        // if the user is blocked, then automatically disable audio
        handleSetEnableAudioStream(Number(stream.id), false, false);
        handleSetEnableAudioStream(Number(stream.id), false, true);
      }

      const userStream = new MediaStream();
      const displayStream = new MediaStream();
      userStream.addTrack(stream.getAudioTracks()[0]);
      displayStream.addTrack(stream.getAudioTracks()[1]);

      const audioElement = document.createElement("audio");
      audioElement.id = stream.getAudioTracks()[0].id + "_" + "userAudioStream";
      audioElement.className = "stream-" + stream.id;
      audioElement.srcObject = userStream;
      audioElement.autoplay = true;
      audioElement.controls = false;
      const presetVolume = window.localStorage.getItem(
        "accord_voiceVolume_" + stream.id
      );
      const disabled = window.localStorage.getItem(
        "accord_voiceDisabled_" + stream.id
      );
      if (presetVolume) {
        audioElement.volume = Number.parseFloat(presetVolume);
      }
      if (disabled) {
        stream.getAudioTracks()[0].enabled = false;
      }

      if (currentUser?.data.isDeafened) {
        audioElement.muted = true;
      }

      document.getElementById("activeAudioChannel")?.appendChild(audioElement);

      const audioElement2 = document.createElement("audio");
      audioElement2.id =
        stream.getAudioTracks()[1].id + "_userSystemAudioStream";
      audioElement2.className = "stream-" + stream.id;
      audioElement2.srcObject = displayStream;
      audioElement2.autoplay = true;
      audioElement2.controls = false;
      const presetVolume2 = window.localStorage.getItem(
        "accord_systemVolume_" + stream.id
      );
      const disabled2 = window.localStorage.getItem(
        "accord_systemDisabled_" + stream.id
      );
      if (presetVolume2) {
        audioElement2.volume = Number.parseFloat(presetVolume2);
      }
      if (disabled2) {
        stream.getAudioTracks()[1].enabled = false;
      }

      if (currentUser?.data.isDeafened) {
        audioElement2.muted = true;
      }

      document.getElementById("activeAudioChannel")?.appendChild(audioElement2);

      SoundUtil.monitorSoundActivity(stream, audioElement, (hasSound) => {
        setCallDecorator((prev) => {
          const userId = stream.id;
          return {
            ...prev,
            [userId]: hasSound ? "sound" : "none",
          };
        });
      });
    }
  }, []);

  const syncLocalVideoStream = useCallback((currentUser: User) => {
    //synchronize local video stream with current peerConnnection senders
    if (peerConnection.current) {
      const stream = new MediaStream();
      peerConnection.current.getSenders().forEach((sender) => {
        if (sender.track && sender.track.kind === "video") {
          if (
            userMediaTrackIds.current.has(sender.track.id) ||
            userDisplayTrackIds.current.has(sender.track.id)
          ) {
            stream.addTrack(sender.track);
          }
        }
      });

      setVideoStreams((prev) => ({
        ...prev,
        [currentUser.id]: stream,
      }));
    }
  }, []);

  const handleAddVideoStream = useCallback((stream: MediaStream) => {
    const blockeds = queryClient.getQueryData<{ data: User[] }>(["blockeds"]);
    const blockers = queryClient.getQueryData<{ data: User[] }>(["blockers"]);
    if (
      ((blockeds?.data?.length &&
        blockeds.data.find((e) => e.id.toString() === stream.id)) ||
        (blockers?.data?.length &&
          blockers.data.find((e) => e.id.toString() === stream.id))) &&
      !isNaN(Number(stream.id))
    ) {
      // if the user is blocked, then automatically disable video
      handleSetEnableVideoStream(Number(stream.id), false, false);
      handleSetEnableVideoStream(Number(stream.id), false, true);
    }
    const cameraDisabled = window.localStorage.getItem(
      "accord_cameraDisabled_" + stream.id
    );
    const screenDisabled = window.localStorage.getItem(
      "accord_screenDisabled_" + stream.id
    );

    if (cameraDisabled && stream.getVideoTracks()[0])
      stream.getVideoTracks()[0].enabled = false;
    if (screenDisabled && stream.getVideoTracks()[1])
      stream.getVideoTracks()[1].enabled = false;
    setVideoStreams((prev) => ({
      ...prev,
      [stream.id]: stream,
    }));
  }, []);

  const handleRemoveVideoStream = useCallback((userId: number) => {
    //remove just the video stream
    setVideoStreams((prev) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [userId]: variable, ...withoutUserId } = prev;
      return withoutUserId;
    });
  }, []);

  const handleRemoveStream = useCallback((userId: number) => {
    //remove all streams associated with this user
    const streamElements = Array.from(
      document.getElementsByClassName("stream-" + userId)
    );

    for (const streamElement of streamElements) {
      if (document.body.contains(streamElement)) streamElement.remove();
      setCallDecorator((prev) => {
        if (prev[userId] !== undefined) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [userId]: value, ...withoutUserId } = prev;

          return withoutUserId;
        }
        return prev;
      });
    }

    setVideoStreams((prev) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [userId]: variable, ...withoutUserId } = prev;
      return withoutUserId;
    });
    console.log("removed stream of userid " + userId);
  }, []);

  const subscribeQueue = useRef<{ chatRoom: ChatRoom; joinTime: number }[]>([]);

  const handleSubscribeStream = useCallback(
    (chatRoom: ChatRoom, joinTime: number) => {
      subscribeQueue.current.push({
        chatRoom,
        joinTime,
      });
    },
    []
  );

  const handleSubscribeStreamInternal = useCallback(
    async (chatRoom: ChatRoom) => {
      const currentUser = queryClient.getQueryData<{ data: User }>(["user"]);
      if (subscriptionConnection.current === null || !currentUser) {
        return;
      }
      console.log("subscription process init");
      try {
        let localConnection = subscriptionConnection.current;
        //simply reset subscription connection
        const activeAudioChannel =
          document.getElementById("activeAudioChannel");
        if (activeAudioChannel) {
          Array.from(activeAudioChannel.children).forEach((child) => {
            if (child.id !== "localAudioStream") {
              activeAudioChannel.removeChild(child);
            }
          });
        }
        setVideoStreams({});
        syncLocalVideoStream(currentUser.data);
        videoStreamsRef.current = { [currentUser.data.id]: true };
        audioStreamsRef.current = { [currentUser.data.id]: true };
        subscriptionConnection.current.close();
        subscriptionConnection.current = new RTCPeerConnection(
          Constants.iceServerConfig
        );
        localConnection = subscriptionConnection.current;

        subscriptionConnection.current.ontrack = (event) => {
          //for audio tracks..
          console.log("TRACK RECEIVED >>>", event.track);
          if (event.track.kind === "audio" && subscriptionConnection.current) {
            event.streams.forEach((stream) => {
              //stream.id is the same as user.id
              if (audioStreamsRef.current[stream.id] === undefined) {
                audioStreamsRef.current[stream.id] = true;
                handleAddAudioStream(stream);
                console.log(
                  "added audio stream of id " + stream.id,
                  stream.getAudioTracks().length
                );
              }
            });
          }
          //for video tracks..
          else if (
            event.track.kind === "video" &&
            subscriptionConnection.current
          ) {
            event.streams.forEach((stream) => {
              if (videoStreamsRef.current[stream.id] === undefined) {
                videoStreamsRef.current[stream.id] = true;
                handleAddVideoStream(stream);
                console.log("added video stream of id " + stream.id);
              }
            });
          }
        };

        //subscribe to other participants' stream

        //stage 1: prepare subscription
        let response = await api.post(`/call/prepareSubscribe/${chatRoom.id}`);

        if (response.status !== 200) {
          throw new Error(
            "Could not subscribe to incoming stream; Preparation failed."
          );
        }

        //stage 2: finalize subscription

        const sdpOffer: string = response.data;

        if (sdpOffer === "placeholder") {
          console.log(
            "subscription aborted early since there was no one to subscribe to."
          );
          return;
        }

        //create sdp answer
        await localConnection.setRemoteDescription({
          type: "offer",
          sdp: sdpOffer,
        });

        //dummy test code
        // localConnection.getTransceivers().forEach((transceiver) => {
        //   if (transceiver.receiver.track.kind === "video") {
        //     console.log("codec analysis opportunity");
        //     const codec = RTCRtpReceiver.getCapabilities("video")?.codecs.find(
        //       (e) => e.mimeType === "video/VP8"
        //     );
        //     if (codec) transceiver.setCodecPreferences([codec]);
        //   }
        // });
        const answer = await localConnection.createAnswer();

        await localConnection.setLocalDescription(answer);
        console.log("local description set.");
        response = await api.post(`/call/finalizeSubscribe/${chatRoom.id}`, {
          sdpAnswer: localConnection.localDescription!.sdp,
        });

        if (response.status !== 200) {
          throw new Error(
            "Could not subscribe to incoming stream; Finalization failed."
          );
        }

        const ices: { iceCandidates: ICECanddiate[] } = response.data;

        //stage 3 : add the ice candidates of the publishers
        ices.iceCandidates.forEach((ice) => {
          localConnection.addIceCandidate({
            sdpMid: ice.sdpMid,
            sdpMLineIndex: ice.sdpMLineIndex,
            candidate: ice.candidate,
          });
        });
      } catch (err) {
        console.error(err);
        throw new Error("Could not subscribe to incoming stream.");
      }
    },
    []
  );

  const videoStreamsRef = useRef<{ [userId: number | string]: boolean }>({});

  const audioStreamsRef = useRef<{ [userId: number | string]: boolean }>({});
  const enableVideoMutationPending = useRef<boolean>(false);

  const enableVideoMutation = useMutation({
    mutationFn: ({
      enabled,
      chatRoomId,
    }: {
      enabled: boolean;
      chatRoomId: number;
    }) => {
      return api.post(`/users/enableVideo/${chatRoomId}`, {
        enabled,
      });
    },
  });

  const enableScreenShareMutation = useMutation({
    mutationFn: ({
      enabled,
      chatRoomId,
    }: {
      enabled: "screenonly" | "withaudio" | "no";
      chatRoomId: number;
    }) => {
      return api.post(`/users/enableScreenShare/${chatRoomId}`, {
        enabled,
      });
    },
  });

  const enableScreenShareMutationPending = useRef<boolean>(false);

  const handleEnableScreenShare = useCallback(
    async (
      enabled: "screenonly" | "withaudio" | "no",
      chatRoomId: number,
      config?: {
        width: number;
        height: number;
        fps: number;
        audio: boolean;
      }
    ) => {
      const currentUser = queryClient.getQueryData<{ data: User }>(["user"]);
      if (enabled !== "no" && !config) {
        return false;
      }

      if (!enableScreenShareMutationPending.current && currentUser) {
        let stream: MediaStream | null = null;
        setCallErrorText((prev) => ({
          ...prev,
          status: "",
        }));
        try {
          enableScreenShareMutationPending.current = true;
          const data = await enableScreenShareMutation.mutateAsync({
            enabled,
            chatRoomId,
          });
          if (data.status === 200) {
            queryClient.setQueryData(["user"], (prev: { data: User }) => {
              return {
                data: {
                  ...prev.data,
                  isScreenShareEnabled: enabled,
                },
              };
            });

            if (
              enabled !== "no" &&
              (!peerConnection.current ||
                peerConnection.current.iceConnectionState !== "connected")
            ) {
              ModalUtils.openGenericModal(
                {
                  setGenericContent,
                  setGenericHeader,
                  setModalType,
                  setClickOutsideToClose,
                  setCustomButtonSet,
                  setCustomContent,
                  setCustomHeader,
                  setOnAccept,
                  setOnReject,
                  setOpen: setOpenModal,
                  open: openModal,
                  setShouldExitAnimation: setModalShouldExitAnimation,
                },
                "ERROR",
                "Could not enable screen sharing; No connection active!"
              );
              return false;
            }

            if (enabled === "no") {
              //disable screen sharing - replace it back with placeholder track

              const existingSystemAudioTrack = peerConnection.current
                ? peerConnection.current
                    .getSenders()
                    .find(
                      (sender) =>
                        sender.track &&
                        sender.track.kind === "audio" &&
                        userDisplayTrackIds.current.has(sender.track.id)
                    )
                : undefined;

              if (existingSystemAudioTrack) {
                const prevId = existingSystemAudioTrack.track?.id;
                existingSystemAudioTrack.track?.stop();
                const placeholderAudioTrack =
                  GenericUtil.createPlaceholderAudioTrack();

                await existingSystemAudioTrack.replaceTrack(
                  placeholderAudioTrack
                );
                userDisplayTrackIds.current.add(placeholderAudioTrack.id);
                userDisplayTrackIds.current.delete(prevId ?? "-1");
                console.log("removed system audio!");
              }

              const existingScreenTrack = peerConnection.current
                ? peerConnection.current
                    .getSenders()
                    .find(
                      (sender) =>
                        sender.track &&
                        sender.track.kind === "video" &&
                        userDisplayTrackIds.current.has(sender.track.id)
                    )
                : undefined;
              if (existingScreenTrack) {
                const prevId = existingScreenTrack.track?.id;
                existingScreenTrack.track?.stop();
                const placeholderTrack = GenericUtil.createPlaceholderTrack();
                await existingScreenTrack.replaceTrack(placeholderTrack);
                userDisplayTrackIds.current.delete(prevId ?? "-1");
                userDisplayTrackIds.current.add(placeholderTrack.id);
              }

              syncLocalVideoStream(currentUser.data);
              return true;
            }

            //enabling screen share...
            //acquire the user display media with the provided config

            try {
              stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                  width: {
                    ideal: config!.width,
                  },

                  height: {
                    ideal: config!.height,
                  },

                  frameRate: {
                    ideal: config!.fps,
                  },
                },
                audio: config!.audio,
              });

              stream.getVideoTracks().forEach((video, i) => {
                if (i > 0) {
                  video.stop();
                }
              });

              stream.getAudioTracks().forEach((audio, i) => {
                if (i > 0) audio.stop();
              });

              if (currentCallingChatRoomRef.current)
                GenericUtil.monitorPreview(
                  stream,
                  currentCallingChatRoomRef.current.id,
                  "screen"
                );

              //first, check if it already exists

              const exists = peerConnection
                .current!.getSenders()
                .find(
                  (sender) =>
                    sender.track &&
                    sender.track.kind === "video" &&
                    userDisplayTrackIds.current.has(sender.track.id)
                );

              if (exists) {
                //add audio track, if any
                if (config!.audio && stream.getAudioTracks().length === 1) {
                  const audioExists = peerConnection
                    .current!.getSenders()
                    .find(
                      (sender) =>
                        sender.track &&
                        sender.track.kind === "audio" &&
                        userDisplayTrackIds.current.has(sender.track.id)
                    );

                  if (audioExists) {
                    const prevId = audioExists.track?.id;

                    audioExists.track?.stop();
                    await audioExists.replaceTrack(stream.getAudioTracks()[0]);
                    console.log("added system audio!");
                    userDisplayTrackIds.current.delete(prevId ?? "-1");
                    userDisplayTrackIds.current.add(
                      stream.getAudioTracks()[0].id
                    );
                  }
                }
                //replace track

                const prevId = exists.track?.id;

                exists.track?.stop();
                await exists.replaceTrack(stream.getVideoTracks()[0]);
                userDisplayTrackIds.current.delete(prevId ?? "-1");
                userDisplayTrackIds.current.add(stream.getVideoTracks()[0].id);
                syncLocalVideoStream(currentUser.data);
              } else {
                if (stream) {
                  stream.getAudioTracks().forEach((track) => track.stop());
                  stream.getVideoTracks().forEach((track) => track.stop());
                }

                ModalUtils.openGenericModal(
                  {
                    setGenericContent,
                    setGenericHeader,
                    setModalType,
                    setClickOutsideToClose,
                    setCustomButtonSet,
                    setCustomContent,
                    setCustomHeader,
                    setOnAccept,
                    setOnReject,
                    setOpen: setOpenModal,
                    open: openModal,
                    setShouldExitAnimation: setModalShouldExitAnimation,
                  },
                  "ERROR",
                  "Could not enable screen sharing; No connection active!"
                );

                return false;
              }

              return true;
            } catch (err) {
              console.error(err);
              if (stream) {
                stream.getAudioTracks().forEach((track) => track.stop());
                stream.getVideoTracks().forEach((track) => track.stop());
              }

              ModalUtils.openGenericModal(
                {
                  setGenericContent,
                  setGenericHeader,
                  setModalType,
                  setClickOutsideToClose,
                  setCustomButtonSet,
                  setCustomContent,
                  setCustomHeader,
                  setOnAccept,
                  setOnReject,
                  setOpen: setOpenModal,
                  open: openModal,
                  setShouldExitAnimation: setModalShouldExitAnimation,
                },
                "ERROR",
                "Could not acquire permission; Please check your system or browser settings!"
              );

              setCallErrorText((prev) => ({
                ...prev,
                status: "No screen is being shared due to lack of permission",
              }));

              return false;
            }
          } else {
            ModalUtils.handleGenericError(
              {
                setGenericContent,
                setGenericHeader,
                setModalType,
                setClickOutsideToClose,
                setCustomButtonSet,
                setCustomContent,
                setCustomHeader,
                setOnAccept,
                setOnReject,
                setOpen: setOpenModal,
                open: openModal,
                setShouldExitAnimation: setModalShouldExitAnimation,
              },
              data.data
            );
            return false;
          }
        } catch (err) {
          console.error(err);
          return false;
        } finally {
          enableScreenShareMutationPending.current = false;
        }
      }

      return false;
    },
    []
  );

  const handleEnableVideo = useCallback(
    async (enabled: boolean, chatRoomId: number, noStreamYet?: boolean) => {
      if (!enableVideoMutationPending.current) {
        try {
          enableVideoMutationPending.current = true;
          const data = await enableVideoMutation.mutateAsync({
            enabled,
            chatRoomId,
          });
          if (data.status === 200) {
            queryClient.setQueryData(["user"], (prev: { data: User }) => {
              return {
                data: {
                  ...prev.data,
                  isVideoEnabled: enabled,
                },
              };
            });

            if (noStreamYet) {
              enableVideoMutationPending.current = false;

              return true;
            }
            try {
              await handleEnableVideoLogic(enabled);
              enableVideoMutationPending.current = false;
              return true;
            } catch (err) {
              console.error(err);
              ModalUtils.openGenericModal(
                {
                  setGenericContent,
                  setGenericHeader,
                  setModalType,
                  setClickOutsideToClose,
                  setCustomButtonSet,
                  setCustomContent,
                  setCustomHeader,
                  setOnAccept,
                  setOnReject,
                  setOpen: setOpenModal,
                  open: openModal,
                  setShouldExitAnimation: setModalShouldExitAnimation,
                },
                "Oof.",
                (err as Error).message
              );

              enableVideoMutationPending.current = false;
              return false;
            }
          } else {
            ModalUtils.handleGenericError(
              {
                setGenericContent,
                setGenericHeader,
                setModalType,
                setClickOutsideToClose,
                setCustomButtonSet,
                setCustomContent,
                setCustomHeader,
                setOnAccept,
                setOnReject,
                setOpen: setOpenModal,
                open: openModal,
                setShouldExitAnimation: setModalShouldExitAnimation,
              },
              data.data
            );
          }
          enableVideoMutationPending.current = false;

          return false;
        } catch (err) {
          console.error(err);
          enableVideoMutationPending.current = false;
          return false;
        }
      }
      enableVideoMutationPending.current = false;
      return false;
    },
    []
  );

  const handleEnableVideoLogic = useCallback(async (enable: boolean) => {
    if (
      peerConnection.current === null ||
      peerConnection.current.iceConnectionState !== "connected"
    ) {
      //no active connection
      throw new Error(
        "There is no active conneciton: " +
          peerConnection.current?.iceConnectionState
      );
    }

    const currentUser = queryClient.getQueryData<{ data: User }>(["user"]);

    if (!currentUser) {
      throw new Error("Unknown error; user context missing!");
    }
    //check user has video in ongoing peerConnection
    if (
      !peerConnection.current
        .getSenders()
        .find((e) => e.track && e.track.kind === "video")
    ) {
      throw new Error(
        "Looks like your call has not been properly established, so no video is being sent. To send video, please grant camera permission if you did not and rejoin the call!"
      );
    }

    //now, enable or disable the video

    if (!enable) {
      setCallErrorText((prev) => ({
        ...prev,
        status: "",
      }));

      //replace it back with placeholder track
      const placeholderTrack = GenericUtil.createPlaceholderTrack();

      const sender = peerConnection.current.getSenders().find((sender) => {
        if (
          sender.track &&
          sender.track.kind === "video" &&
          userMediaTrackIds.current.has(sender.track.id)
        ) {
          return true;
        }
      });

      if (!sender) {
        throw new Error(
          "Unexpected error ocurred - no connection active to stop!"
        );
      }

      //be sure to update user media track ids
      const prevId = sender.track?.id;

      sender.track?.stop();
      await sender.replaceTrack(placeholderTrack);
      userMediaTrackIds.current.delete(prevId ?? "-1");
      userMediaTrackIds.current.add(placeholderTrack.id);

      syncLocalVideoStream(currentUser.data);
    } else {
      let permissionModalTimeout: NodeJS.Timeout | null = null;
      let newLocalVideoStream: MediaStream | null = null;
      try {
        permissionModalTimeout = setTimeout(() => {
          ModalUtils.openGenericModal(
            {
              setGenericContent,
              setGenericHeader,
              setModalType,
              setClickOutsideToClose,
              setCustomButtonSet,
              setCustomContent,
              setCustomHeader,
              setOnAccept,
              setOnReject,
              setOpen: setOpenModal,
              open: openModal,
              setShouldExitAnimation: setModalShouldExitAnimation,
            },
            "",
            "",
            undefined,
            <div className="flex flex-col gap-2 text-center justify-center">
              <p>{"Please allow camera permission to call."}</p>
            </div>,
            undefined,
            <div className="flex gap-2 items-center text-lg justify-center text-lime-500">
              <IoMdVideocam size={16} />
              <p>So close..</p>
            </div>
          );
        }, 2000);

        let metadata: MediaStreamConstraints = {
          video: true,
        };
        //respect the currently chosen video device.

        if (
          selectedDeviceRef.current.videoUserInputDevice.length &&
          devicesRef.current.videoInputDevices.length
        ) {
          devicesRef.current.videoInputDevices.forEach((device) => {
            if (
              device.deviceId === selectedDeviceRef.current.videoUserInputDevice
            ) {
              //actually found device id, it must exist
              metadata = {
                ...metadata,
                video: {
                  deviceId: {
                    exact: device.deviceId,
                  },
                },
              };
            }
          });
          //otherwise fall back to default device.
        }

        newLocalVideoStream = await navigator.mediaDevices.getUserMedia(
          metadata
        );

        newLocalVideoStream.getAudioTracks().forEach((track, i) => {
          if (i > 0) {
            track.stop();
          }
        });
        newLocalVideoStream.getVideoTracks().forEach((track, i) => {
          if (i > 0) {
            track.stop();
          }
        });

        clearTimeout(permissionModalTimeout);
        if (document.getElementById("primaryModal"))
          ModalUtils.closeCurrentModal({
            setGenericContent,
            setGenericHeader,
            setModalType,
            setClickOutsideToClose,
            setCustomButtonSet,
            setCustomContent,
            setCustomHeader,
            setOnAccept,
            setOnReject,
            setOpen: setOpenModal,
            open: openModal,
            setShouldExitAnimation: setModalShouldExitAnimation,
          });

        //refetch devices list if needed.
        if (
          (devicesRef.current.audioInputDevices.length > 0 &&
            devicesRef.current.audioInputDevices[0].deviceId.length === 0) ||
          (devicesRef.current.videoInputDevices.length > 0 &&
            devicesRef.current.videoInputDevices[0].deviceId.length === 0)
        ) {
          await updateDeviceList();
        }

        const sender = peerConnection.current
          .getSenders()
          .find(
            (s) =>
              s.track &&
              s.track.kind === "video" &&
              userMediaTrackIds.current.has(s.track.id)
          );
        if (!sender) {
          throw new Error();
        }
        const prevId = sender.track?.id;

        sender.track?.stop();
        //apply background if needed

        let newVideoTrack: MediaStreamTrack | null = null;
        if (selectedCallBackgroundRef.current.length) {
          BackgroundUtil.closeProcess();
          const applyStream = new MediaStream();
          applyStream.addTrack(newLocalVideoStream.getVideoTracks()[0]);
          newVideoTrack = await BackgroundUtil.applyBackground(
            applyStream,
            Constants.SERVER_STATIC_CONTENT_PATH +
              selectedCallBackgroundRef.current
          );
        } else {
          newVideoTrack = newLocalVideoStream.getVideoTracks()[0];
        }
        const videoStream = new MediaStream();
        videoStream.addTrack(newVideoTrack);
        if (currentCallingChatRoomRef.current)
          GenericUtil.monitorPreview(
            videoStream,
            currentCallingChatRoomRef.current.id,
            "video"
          );
        await sender.replaceTrack(newVideoTrack);
        userMediaTrackIds.current.delete(prevId ?? "");
        userMediaTrackIds.current.add(newVideoTrack.id);

        syncLocalVideoStream(currentUser.data);
      } catch (err) {
        console.error(err);
        if (permissionModalTimeout) {
          clearTimeout(permissionModalTimeout);
        }
        if (newLocalVideoStream) {
          newLocalVideoStream.getVideoTracks().forEach((track) => track.stop());
          newLocalVideoStream.getAudioTracks().forEach((track) => track.stop());
        }

        if (document.getElementById("primaryModal"))
          ModalUtils.closeCurrentModal({
            setGenericContent,
            setGenericHeader,
            setModalType,
            setClickOutsideToClose,
            setCustomButtonSet,
            setCustomContent,
            setCustomHeader,
            setOnAccept,
            setOnReject,
            setOpen: setOpenModal,
            open: openModal,
            setShouldExitAnimation: setModalShouldExitAnimation,
          });
        setCallErrorText((prev) => ({
          ...prev,
          status:
            "No camera permission, no video is being sent. Please try re-enabling the video with camera permission.",
        }));
        throw new Error(
          "Could not enable video - insufficient camera permission!"
        );
      }
    }
  }, []);

  const handlePrepareStartOrJoinCall = useCallback(
    async (roomId: number, isStart: boolean) => {
      try {
        setCallErrorText((prev) => ({
          ...prev,
          status: "",
        }));

        const currentUser = queryClient.getQueryData<{ data: User }>(["user"]);
        if (peerConnection.current === null || !currentUser?.data?.id) {
          return false;
        }

        let localConnection = peerConnection.current;
        //close any ongoing connection
        handleCloseStream();

        peerConnection.current = new RTCPeerConnection(
          Constants.iceServerConfig
        );

        localConnection = peerConnection.current;

        localIceCandidates.current = [];

        const iceCandidates = localIceCandidates.current;

        //set onicecandidate handler

        localConnection.oniceconnectionstatechange = () => {
          console.log("ICE EVENT:", localConnection.iceConnectionState);
        };

        localConnection.onicecandidate = (event) => {
          console.log(
            "ICE:(",
            event.candidate,
            event.candidate &&
              event.candidate.sdpMLineIndex !== null &&
              event.candidate.sdpMid !== null
          );
          if (
            event.candidate &&
            event.candidate.sdpMLineIndex !== null &&
            event.candidate.sdpMid !== null
          ) {
            iceCandidates.push({
              sdpMid: event.candidate.sdpMid,
              sdpMLineIndex: event.candidate.sdpMLineIndex,
              candidate: event.candidate.candidate,
            });
          } else if (event.candidate === null) {
            iceCandidates.push({
              sdpMid: "0",
              sdpMLineIndex: 0,
              candidate: "complete",
            });
          }
        };

        //query for user permission for mic,
        //also get the default audio input device

        let localStream = null;
        let permissionModalTimeout: NodeJS.Timeout | null = null;
        try {
          let metadata: MediaStreamConstraints = {
            audio: {
              echoCancellation:
                (localStorage.getItem("echoCancellation") ?? "yes") === "yes",
              noiseSuppression:
                (localStorage.getItem("noiseSuppression") ?? "yes") === "yes",
              autoGainControl:
                (localStorage.getItem("autoGainControl") ?? "yes") === "yes",
            },
            video: currentUser.data.isVideoEnabled,
          };

          if (
            selectedDeviceRef.current.audioUserInputDevice.length &&
            devicesRef.current.audioInputDevices.length
          ) {
            devicesRef.current.audioInputDevices.forEach((device) => {
              if (
                device.deviceId ===
                selectedDeviceRef.current.audioUserInputDevice
              ) {
                //actually found device id, it must exist
                metadata = {
                  ...metadata,
                  audio: {
                    deviceId: {
                      exact: device.deviceId,
                    },
                    echoCancellation:
                      (localStorage.getItem("echoCancellation") ?? "yes") ===
                      "yes",
                    noiseSuppression:
                      (localStorage.getItem("noiseSuppression") ?? "yes") ===
                      "yes",
                    autoGainControl:
                      (localStorage.getItem("autoGainControl") ?? "yes") ===
                      "yes",
                  },
                };
              }
            });
            //otherwise fall back to default device.
          }

          //do the same for video devices, if the video is enabled.
          if (
            currentUser.data.isVideoEnabled &&
            selectedDeviceRef.current.videoUserInputDevice.length &&
            devicesRef.current.videoInputDevices.length
          ) {
            devicesRef.current.videoInputDevices.forEach((device) => {
              if (
                device.deviceId ===
                selectedDeviceRef.current.videoUserInputDevice
              ) {
                //actually found device id, it must exist
                metadata = {
                  ...metadata,
                  video: {
                    deviceId: {
                      exact: device.deviceId,
                    },
                  },
                };
              }
            });
            //otherwise fall back to default device.
          }

          permissionModalTimeout = setTimeout(() => {
            ModalUtils.openGenericModal(
              {
                setGenericContent,
                setGenericHeader,
                setModalType,
                setClickOutsideToClose,
                setCustomButtonSet,
                setCustomContent,
                setCustomHeader,
                setOnAccept,
                setOnReject,
                setOpen: setOpenModal,
                open: openModal,
                setShouldExitAnimation: setModalShouldExitAnimation,
              },
              "",
              "",
              undefined,
              <div className="flex flex-col gap-2 text-center justify-center">
                <p>
                  {currentUser.data.isVideoEnabled
                    ? "Please allow mic and camerea permission to call."
                    : "Please allow mic permission to call."}
                </p>
              </div>,
              undefined,
              <div className="flex gap-2 items-center text-lg justify-center text-lime-500">
                {currentUser.data.isVideoEnabled ? (
                  <IoMdVideocam size={16} />
                ) : (
                  <MdCall size={16} />
                )}
                <p>So close..</p>
              </div>
            );
          }, 2000);

          localStream = await navigator.mediaDevices.getUserMedia(metadata);

          localStream.getAudioTracks().forEach((track, i) => {
            if (i > 0) {
              track.stop();
            }
          });
          localStream.getVideoTracks().forEach((track, i) => {
            if (i > 0) {
              track.stop();
            }
          });

          //skip displaying modal if permission already acquired

          clearTimeout(permissionModalTimeout);
          if (document.getElementById("primaryModal"))
            ModalUtils.closeCurrentModal({
              setGenericContent,
              setGenericHeader,
              setModalType,
              setClickOutsideToClose,
              setCustomButtonSet,
              setCustomContent,
              setCustomHeader,
              setOnAccept,
              setOnReject,
              setOpen: setOpenModal,
              open: openModal,
              setShouldExitAnimation: setModalShouldExitAnimation,
            });

          //refetch devices list if needed

          if (
            (devicesRef.current.audioInputDevices.length > 0 &&
              devicesRef.current.audioInputDevices[0].deviceId.length === 0) ||
            (devicesRef.current.videoInputDevices.length > 0 &&
              devicesRef.current.videoInputDevices[0].deviceId.length === 0)
          ) {
            await updateDeviceList();
          }

          //preprocess the stream first

          localStream = GenericUtil.createPreprocessedAudioStream(localStream);

          localStreamRef.current = localStream;

          //add local audio sound activity receptor
          const activeAudioChannel =
            document.getElementById("activeAudioChannel");
          if (!activeAudioChannel) {
            throw new Error();
          }

          const audio = document.createElement("audio");
          audio.autoplay = false;
          audio.srcObject = localStream;
          audio.controls = false;
          audio.id = "localAudioStream";
          audio.muted = true;
          activeAudioChannel?.appendChild(audio);

          SoundUtil.monitorSoundActivity(
            localStream,
            audio,
            (hasSound) => {
              setCallDecorator((prev) => {
                const userId = currentUser.data.id;
                return {
                  ...prev,
                  [userId]: hasSound ? "sound" : "none",
                };
              });
            },
            (silent) => {
              if (window.showNoMicInputWarning === "yes") {
                if (silent) {
                  setCallErrorText((prev) => ({
                    ...prev,
                    micStatus: "No input being detected from mic",
                  }));
                } else {
                  setCallErrorText((prev) => ({
                    ...prev,
                    micStatus: "",
                  }));
                }
              }
            }
          );
        } catch (err) {
          if (localStream) {
            localStream.getAudioTracks().forEach((track) => track.stop());
            localStream.getVideoTracks().forEach((track) => track.stop());
          }
          console.error(err);
          if (permissionModalTimeout) {
            clearTimeout(permissionModalTimeout);
          }

          if (document.getElementById("primaryModal"))
            ModalUtils.closeCurrentModal({
              setGenericContent,
              setGenericHeader,
              setModalType,
              setClickOutsideToClose,
              setCustomButtonSet,
              setCustomContent,
              setCustomHeader,
              setOnAccept,
              setOnReject,
              setOpen: setOpenModal,
              open: openModal,
              setShouldExitAnimation: setModalShouldExitAnimation,
            });

          throw new Error(
            "Failed to acquire permission; Could not start the call."
          );
        }

        //now must gather local ice candidate and sdp offer

        //manage initial track additions

        //add audio track
        localConnection.addTrack(localStream.getAudioTracks()[0], localStream);

        userMediaTrackIds.current.add(localStream.getAudioTracks()[0].id);

        //a placeholder audio track for display media
        const placeholderAudioTrack = GenericUtil.createPlaceholderAudioTrack();
        localConnection.addTrack(placeholderAudioTrack, localStream);

        userDisplayTrackIds.current.add(placeholderAudioTrack.id);

        if (currentUser.data.isVideoEnabled) {
          console.log(
            "adding video and audio track: ",
            localStream.getAudioTracks()[0],
            localStream.getVideoTracks()[0]
          );

          //if call background is selected, apply the background now
          if (selectedCallBackgroundRef.current.length) {
            const applyStream = new MediaStream();
            applyStream.addTrack(localStream.getVideoTracks()[0]);

            const track = await BackgroundUtil.applyBackground(
              applyStream,
              Constants.SERVER_STATIC_CONTENT_PATH +
                selectedCallBackgroundRef.current
            );

            localConnection.addTrack(track);

            const videoStream = new MediaStream();
            videoStream.addTrack(track);

            GenericUtil.monitorPreview(videoStream, roomId, "video");

            console.log("applying virtual call background: ", track);
            userMediaTrackIds.current.add(track.id);
          } else {
            //otherwise, add plain old video track
            localConnection.addTrack(
              localStream.getVideoTracks()[0],
              localStream
            );
            const videoStream = new MediaStream();
            videoStream.addTrack(localStream.getVideoTracks()[0]);

            GenericUtil.monitorPreview(videoStream, roomId, "video");
            userMediaTrackIds.current.add(localStream.getVideoTracks()[0].id);
          }
        } else {
          console.log("adding audio track only.");
          //add placeholder video track
          const placeholderTrack = GenericUtil.createPlaceholderTrack();
          localConnection.addTrack(placeholderTrack, localStream);
          userMediaTrackIds.current.add(placeholderTrack.id);
        }

        //add (possibly another) placeholder video track for display media
        const placeholderTrack = GenericUtil.createPlaceholderTrack();
        localConnection.addTrack(placeholderTrack, localStream);
        userDisplayTrackIds.current.add(placeholderTrack.id);

        //respect the mute settings
        localStream.getAudioTracks()[0].enabled = !currentUser.data.isCallMuted;
        placeholderAudioTrack.enabled = !currentUser.data.isCallMuted;

        //set local stream reference
        syncLocalVideoStream(currentUser.data);

        let parsedSdpOffer = null;

        const videoCodec = localStorage.getItem("videoCodec") ?? "video/VP8";

        try {
          peerConnection.current.getTransceivers().forEach((transceiver) => {
            try {
              if (transceiver.sender.track?.kind === "video") {
                const supportedCodecs =
                  RTCRtpSender.getCapabilities("video")?.codecs;
                if (supportedCodecs) {
                  const preferredCodec = supportedCodecs.find(
                    (e) => e.mimeType === videoCodec
                  );

                  if (preferredCodec) {
                    transceiver.setCodecPreferences([preferredCodec]);
                    console.log("codec preference set:", videoCodec);
                  }
                }
              }
            } catch (err) {
              console.error(err);
            }
          });
          const sdpOffer = await localConnection.createOffer();

          const sdpOfferString = sdpOffer.sdp ?? "";

          parsedSdpOffer = sdpTransform.parse(sdpOfferString);

          console.log(parsedSdpOffer);

          await localConnection.setLocalDescription({
            type: "offer",
            sdp: sdpOfferString,
          });
        } catch (error) {
          if (localStream) {
            localStream.getAudioTracks().forEach((track) => track.stop());
            localStream.getVideoTracks().forEach((track) => track.stop());
          }
          console.error(error);
          throw new Error(
            "Failed to create sdp offer; Could not start the call."
          );
        }

        //prepare the call
        const response = await api.post(
          `/call/prepare${isStart ? "Start" : "Join"}/${roomId}`,
          {
            sdpOffer: localConnection.localDescription!.sdp,
          }
        );

        if (response.status !== 200) {
          throw new Error(
            "Failed to receive sdp answer; Could not start the call."
          );
        }

        const sdpAnswer: string = response.data;

        //here here here
        if (sdpAnswer === "cannotcall") {
          throw new Error("Failed to call this user.");
        }

        //set remote description
        localConnection.setRemoteDescription({
          type: "answer",
          sdp: sdpAnswer,
        });
        console.log("remote description set.");

        //wait for ice candidates : 15 seconds timeout
        await new Promise((resolve) => {
          const timeout = new Date().getTime() + 15000;
          const interval = setInterval(() => {
            const iceGatheringDone =
              iceCandidates.length > 1 &&
              iceCandidates[iceCandidates.length - 1].candidate === "complete";
            if (iceGatheringDone || Date.now() >= timeout) {
              clearInterval(interval);
              resolve(true);
            }
          }, 100);
        });

        const iceGatheringDone =
          iceCandidates.length > 1 &&
          iceCandidates[localIceCandidates.current.length - 1].candidate ===
            "complete";

        if (!iceGatheringDone) {
          throw new Error(
            "Failed to gather ICE candidates; Could not start the call."
          );
        }

        iceCandidates.pop();

        return true;
      } catch (err) {
        console.error(err);
        if (localStreamRef.current) {
          localStreamRef.current
            .getAudioTracks()
            .forEach((track) => track.stop());
          localStreamRef.current
            .getVideoTracks()
            .forEach((track) => track.stop());
        }
        return false;
      }
    },
    []
  );

  const statusMutation = useMutation({
    mutationFn: (status: string) => {
      return api.post("/users/status", status);
    },
    onSettled(data, error, variables) {
      if (data?.status === 200) {
        queryClient.setQueryData(["user"], (prev: { data: User }) => {
          return {
            data: {
              ...prev.data,
              status: variables,
            },
          };
        });
      } else {
        handleError(data);
      }
    },
  });

  const pingSessionMutationPendingRef = useRef<boolean>(false);

  const pingSessionMutation = useMutation({
    mutationFn: () => {
      return api.post("/call/pingSession");
    },
    onSettled(data) {
      if (!data) {
        return;
      }
      if (data.status !== 200) {
        ModalUtils.openGenericModal(
          {
            setGenericContent,
            setGenericHeader,
            setModalType,
            setClickOutsideToClose,
            setCustomButtonSet,
            setCustomContent,
            setCustomHeader,
            setOnAccept,
            setOnReject,
            setOpen: setOpenModal,
            open: openModal,
            setShouldExitAnimation: setModalShouldExitAnimation,
          },
          "Peace Disturbed",
          "You have lost connection to the server. Would you like to reload the page?",
          () => window.location.reload()
        );
        // setTimeout(() => {
        //   window.location.reload();
        // }, 3000);
      }
      pingSessionMutationPendingRef.current = false;
    },
  });

  useLayoutEffect(() => {
    setChatRoomsDivHeight(
      windowSize.height -
        chatRoomsDivRef.current!.offsetTop -
        userBarRef.current!.getBoundingClientRect().height
    );
  }, [windowSize, currentUser]);

  //idle handler
  useEffect(() => {
    const handleInteraction = () => {
      if (currentUser.data?.data) {
        const user = currentUser.data?.data;
        //reset idle timeout time
        clearTimeout(idleTimerRef.current ?? undefined);

        // console.log("cleared idle timeout")
        if (!statusMutation.isPending && user.status === "NATURAL_IDLE") {
          statusMutation.mutate("ONLINE");
        }

        idleTimerRef.current = setTimeout(() => {
          if (!statusMutation.isPending && user.status === "ONLINE") {
            statusMutation.mutate("NATURAL_IDLE");
          }
        }, idleTimeoutMiliseconds);
      }
    };

    window.addEventListener("mousemove", handleInteraction);
    window.addEventListener("keydown", handleInteraction);

    return () => {
      clearTimeout(idleTimerRef.current ?? undefined);
      window.removeEventListener("mousemove", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
    };
  }, [idleTimerRef, statusMutation, currentUser]);

  const [selectedDevice, setSelectedDevice] = useState<{
    audioUserInputDevice: string;
    videoUserInputDevice: string;
  }>({
    audioUserInputDevice: "",
    videoUserInputDevice: "",
  });

  const [selectedCallBackground, setSelectedCallBackground] = useState("");
  const [globalWarningIndicator, setGlobalWarningIndicator] = useState<{
    message: string;
    onClick: () => void;
  }>({
    message: "",
    onClick: () => {},
  });

  useEffect(() => {
    selectedCallBackgroundRef.current = selectedCallBackground;
  }, [selectedCallBackground]);
  const selectedDeviceRef = useRef<{
    audioUserInputDevice: string;
    videoUserInputDevice: string;
  }>({
    audioUserInputDevice: "",
    videoUserInputDevice: "",
  });
  const devicesRef = useRef<{
    audioInputDevices: MediaDeviceInfo[];
    videoInputDevices: MediaDeviceInfo[];
  }>({ audioInputDevices: [], videoInputDevices: [] });

  useEffect(() => {
    selectedDeviceRef.current = selectedDevice;
  }, [selectedDevice]);

  useEffect(() => {
    devicesRef.current = devices;
  }, [devices]);

  const handlePreviewVideo = useCallback(
    async (
      currentUser: User,
      chatroom: ChatRoom,
      withEnablePrompt?: boolean,
      noStreamYet?: boolean
    ): Promise<boolean> => {
      try {
        let metadata: MediaStreamConstraints = { video: true };
        let selectedDeviceName = "Default Camera";
        if (
          selectedDevice.videoUserInputDevice.length &&
          devices.videoInputDevices.length
        ) {
          devices.videoInputDevices.forEach((device) => {
            if (device.deviceId === selectedDevice.videoUserInputDevice) {
              selectedDeviceName = device.label;
              //actually found device id, it must exist
              metadata = {
                ...metadata,
                video: {
                  deviceId: {
                    exact: device.deviceId,
                  },
                },
              };
            }
          });
          //otherwise fall back to default device.
        }
        let videoStream = await navigator.mediaDevices.getUserMedia(metadata);

        videoStream.getVideoTracks().forEach((e, i) => {
          if (i > 0) {
            e.stop();
          }
        });

        //apply background
        if (selectedCallBackground.length) {
          BackgroundUtil.closeProcess();
          const applyStream = new MediaStream();
          applyStream.addTrack(videoStream.getVideoTracks()[0]);
          const newVideoTrack = await BackgroundUtil.applyBackground(
            applyStream,
            Constants.SERVER_STATIC_CONTENT_PATH + selectedCallBackground
          );
          videoStream = new MediaStream();
          videoStream.addTrack(newVideoTrack);
        }

        videoStream.addTrack(GenericUtil.createPlaceholderTrack());

        return new Promise((resolve) => {
          ModalUtils.openGenericModal(
            {
              setGenericContent,
              setGenericHeader,
              setModalType,
              setClickOutsideToClose,
              setCustomButtonSet,
              setCustomContent,
              setCustomHeader,
              setOnAccept,
              setOnReject,
              setOpen: setOpenModal,
              open: openModal,
              setShouldExitAnimation: setModalShouldExitAnimation,
            },
            "",
            "",
            () => {
              videoStream.getAudioTracks().forEach((track) => track.stop());
              videoStream.getVideoTracks().forEach((track) => track.stop());
              resolve(false);
            },
            <div className="flex flex-col items-center">
              <VideoCallDisplay
                data={videoStream}
                user={currentUser}
                width="50%"
                isVideoPreview
              />
            </div>,

            !withEnablePrompt
              ? [
                  <PrimaryButton key={0}>
                    <div className="flex justify-center items-center gap-2">
                      <FaCheck />
                      Checked.
                    </div>
                  </PrimaryButton>,
                ]
              : [
                  <PrimaryButton key={0} customStyles="mt-5 bg-red-500">
                    <div className="flex justify-center items-center gap-2">
                      <FaX />
                      Cancel
                    </div>
                  </PrimaryButton>,
                  <PrimaryButton key={1}>
                    <div className="flex justify-center items-center gap-2">
                      <FaCheck />
                      Enable
                    </div>
                  </PrimaryButton>,
                ],
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center justify-center mb-2 gap-2">
                <MdVideoCall size={16} />
                <p className="text-xl font-bold">
                  {!withEnablePrompt ? "Camera set?" : "Check camera"}
                </p>
              </div>
              <p className="text-base text-lime-300 text-center mb-2">
                Device: {selectedDeviceName}
              </p>
            </div>,

            true,
            withEnablePrompt
              ? () => {
                  videoStream.getAudioTracks().forEach((track) => track.stop());
                  videoStream.getVideoTracks().forEach((track) => track.stop());

                  handleEnableVideo(true, chatroom.id, noStreamYet)
                    .then((res) => {
                      resolve(res);
                    })
                    .catch((err) => {
                      console.error(err);
                      resolve(false);
                    });
                }
              : undefined
          );
        });
      } catch (err) {
        console.error(err);
        ModalUtils.openGenericModal(
          {
            setGenericContent,
            setGenericHeader,
            setModalType,
            setClickOutsideToClose,
            setCustomButtonSet,
            setCustomContent,
            setCustomHeader,
            setOnAccept,
            setOnReject,
            setOpen: setOpenModal,
            open: openModal,
            setShouldExitAnimation: setModalShouldExitAnimation,
          },
          "Oof.",
          "Looks like your camera permission is missing!"
        );
        return false;
      }
    },
    [devices, selectedDevice, selectedCallBackground]
  );

  const handleChangeDevice = useCallback(
    async (deviceId: string, isVideo: boolean) => {
      const currentUser = queryClient.getQueryData<{ data: User }>(["user"]);
      if (
        callWorkPending.current ||
        !peerConnection.current ||
        !localStreamRef.current ||
        !currentUser?.data
      )
        return false;

      callWorkPending.current = true;

      if (isVideo && !currentUser.data.isVideoEnabled) {
        //if video is disabled, there is no need to change video device (the video track must remain blank)
        setSelectedDevice((prev) => ({
          ...prev,
          videoUserInputDevice: deviceId,
        }));
        window.localStorage.setItem("accord_videoUserInputDevice", deviceId);
        callWorkPending.current = false;
        return true;
      }
      const metadata = !isVideo
        ? {
            audio: {
              deviceId: deviceId.length
                ? {
                    exact: deviceId,
                  }
                : undefined,
              echoCancellation:
                (localStorage.getItem("echoCancellation") ?? "yes") === "yes",
              noiseSuppression:
                (localStorage.getItem("noiseSuppression") ?? "yes") === "yes",
              autoGainControl:
                (localStorage.getItem("autoGainControl") ?? "yes") === "yes",
            },
          }
        : {
            video: {
              deviceId: deviceId.length
                ? {
                    exact: deviceId,
                  }
                : undefined,
            },
          };

      try {
        let stream = await navigator.mediaDevices.getUserMedia(metadata);
        stream.getAudioTracks().forEach((track, i) => {
          if (i > 0) {
            track.stop();
          }
        });
        stream.getVideoTracks().forEach((track, i) => {
          if (i > 0) {
            track.stop();
          }
        });

        //preprocess the stream first
        if (!isVideo)
          stream = GenericUtil.createPreprocessedAudioStream(stream);
        if (!peerConnection.current) throw new Error("peer connection missing");

        if (!isVideo) {
          const newAudioTrack = stream.getAudioTracks()[0];
          //replace user media audio track
          let previousTrackId = "";
          const audioSender = peerConnection.current
            .getSenders()
            .find((sender) => {
              if (sender.track && sender.track.kind === "audio") {
                if (userMediaTrackIds.current.has(sender.track.id)) {
                  previousTrackId = sender.track.id;
                  return true;
                }
              }

              return false;
            });
          if (audioSender) {
            audioSender.track?.stop();
            await audioSender.replaceTrack(newAudioTrack);

            //attach new local stream to sound activity monitor handler
            const activeAudioChannel =
              document.getElementById("activeAudioChannel");
            const audio = document.createElement("audio");
            audio.autoplay = false;
            audio.srcObject = stream;
            audio.controls = false;
            audio.id = "localAudioStream";
            audio.muted = true;

            const currentUser = queryClient.getQueryData<{
              data: User;
            }>(["user"]);
            if (!activeAudioChannel || !currentUser) {
              throw new Error("active audio channel or user context missing");
            }
            activeAudioChannel?.appendChild(audio);

            SoundUtil.monitorSoundActivity(
              stream,
              audio,
              (hasSound) => {
                setCallDecorator((prev) => {
                  const userId = currentUser.data.id;
                  return {
                    ...prev,
                    [userId]: hasSound ? "sound" : "none",
                  };
                });
              },
              (silent) => {
                if (window.showNoMicInputWarning === "yes") {
                  if (silent) {
                    setCallErrorText((prev) => ({
                      ...prev,
                      micStatus: "No input being detected from mic",
                    }));
                  } else {
                    setCallErrorText((prev) => ({
                      ...prev,
                      micStatus: "",
                    }));
                  }
                }
              }
            );

            //relay the mute information
            newAudioTrack.enabled = !currentUser.data.isCallMuted;
            console.log("track replaced to: ", newAudioTrack);

            setSelectedDevice((prev) => ({
              ...prev,
              audioUserInputDevice: deviceId,
            }));
            window.localStorage.setItem(
              "accord_audioUserInputDevice",
              deviceId
            );

            userMediaTrackIds.current.delete(previousTrackId);
            userMediaTrackIds.current.add(newAudioTrack.id);
            callWorkPending.current = false;

            //set local stream reference
            localStreamRef.current = stream;
            //remove local stream
            document.getElementById("localAudioStream")?.remove();
            return true;
          } else {
            callWorkPending.current = false;
            throw new Error("sender missing");
          }
        } else {
          let newVideoTrack: MediaStreamTrack | null =
            stream.getVideoTracks()[0];

          //apply background if needed
          if (selectedCallBackgroundRef.current.length) {
            BackgroundUtil.closeProcess();
            const applyStream = new MediaStream();
            applyStream.addTrack(newVideoTrack);
            newVideoTrack = await BackgroundUtil.applyBackground(
              applyStream,
              Constants.SERVER_STATIC_CONTENT_PATH +
                selectedCallBackgroundRef.current
            );
          }
          const videoStream = new MediaStream();
          videoStream.addTrack(newVideoTrack);
          if (currentCallingChatRoomRef.current)
            GenericUtil.monitorPreview(
              videoStream,
              currentCallingChatRoomRef.current.id,
              "video"
            );
          //replace user media video track
          let previousTrackId = "";
          const videoSender = peerConnection.current
            .getSenders()
            .find((sender) => {
              if (sender.track && sender.track.kind === "video") {
                if (userMediaTrackIds.current.has(sender.track.id)) {
                  previousTrackId = sender.track.id;
                  return true;
                }
              }

              return false;
            });
          if (videoSender) {
            videoSender.track?.stop();
            await videoSender.replaceTrack(newVideoTrack);
            console.log("track replaced to: ", newVideoTrack);

            setSelectedDevice((prev) => ({
              ...prev,
              videoUserInputDevice: deviceId,
            }));
            window.localStorage.setItem(
              "accord_videoUserInputDevice",
              deviceId
            );

            userMediaTrackIds.current.delete(previousTrackId);
            userMediaTrackIds.current.add(newVideoTrack.id);
            callWorkPending.current = false;
            //replace local stream
            syncLocalVideoStream(currentUser.data);
            return true;
          } else {
            callWorkPending.current = false;
            throw new Error("sender missing");
          }
        }
      } catch (err) {
        console.error(err);

        ModalUtils.openGenericModal(
          {
            setGenericContent,
            setGenericHeader,
            setModalType,
            setClickOutsideToClose,
            setCustomButtonSet,
            setCustomContent,
            setCustomHeader,
            setOnAccept,
            setOnReject,
            setOpen: setOpenModal,
            open: openModal,
            setShouldExitAnimation: setModalShouldExitAnimation,
          },
          "Oof.",
          "Could not select the input device, please try again!"
        );
        callWorkPending.current = false;
        return false;
      }
      ModalUtils.openGenericModal(
        {
          setGenericContent,
          setGenericHeader,
          setModalType,
          setClickOutsideToClose,
          setCustomButtonSet,
          setCustomContent,
          setCustomHeader,
          setOnAccept,
          setOnReject,
          setOpen: setOpenModal,
          open: openModal,
          setShouldExitAnimation: setModalShouldExitAnimation,
        },
        "Oof.",
        "Could not select the input device, please try again!"
      );
      callWorkPending.current = false;
      return false;
    },
    []
  );

  //content filter logics
  const getContentFilterFlags = useCallback(
    (chatRoom: ChatRoom | undefined): [string, string] => {
      const user = queryClient.getQueryData<{ data: User }>(["user"])?.data;
      const userSettings = queryClient.getQueryData<{ data: UserSettings }>([
        "user_settings",
      ])?.data;
      const friends = queryClient.getQueryData<{ data: User[] }>([
        "friends",
      ])?.data;

      if (!user || !friends || !chatRoom) {
        return ["ANY", "ANY"];
      }
      const dmFriendsSensitive =
        localStorage.getItem("dm_friends_sensitive") ?? "Show";
      const dmOthersSensitive =
        localStorage.getItem("dm_others_sensitive") ?? "Show";
      const groupSensitive = localStorage.getItem("group_sensitive") ?? "Show";

      const filterSpamMode = userSettings?.spamFilterMode ?? "None";

      if (chatRoom.id > 0) {
        if (chatRoom.direct1to1Identifier?.length) {
          const ids = chatRoom.direct1to1Identifier
            .split("@")
            .map((e) => parseInt(e));

          const otherId = ids.find((e) => e !== user.id);
          if (friends.find((e) => e.id === otherId)) {
            //other user is a friend

            return [
              dmFriendsSensitive === "Block" ? "EXCLUDE" : "ANY",
              filterSpamMode === "All" || filterSpamMode === "Friends"
                ? "EXCLUDE"
                : "ANY",
            ];
          } else {
            //other user is not a friend
            return [
              dmOthersSensitive === "Block" ? "EXCLUDE" : "ANY",
              filterSpamMode === "All" || filterSpamMode === "Others"
                ? "EXCLUDE"
                : "ANY",
            ];
          }
        } else {
          return [
            groupSensitive === "Block" ? "EXCLUDE" : "ANY",
            filterSpamMode === "All" || filterSpamMode === "Groups"
              ? "EXCLUDE"
              : "ANY",
          ];
        }
      } else {
        //spam rooms follow the most restrictive option
        let sensitive = "Show";
        if (
          dmFriendsSensitive === "Block" ||
          dmOthersSensitive === "Block" ||
          groupSensitive === "Block"
        ) {
          sensitive = "Block";
        } else if (
          dmFriendsSensitive === "Blur" ||
          dmOthersSensitive === "Blur" ||
          groupSensitive === "Blur"
        ) {
          sensitive = "Blur";
        }

        return [sensitive === "Block" ? "EXCLUDE" : "ANY", "ANY"];
      }
    },
    []
  );

  //music sharing logics

  const handleStopMusic = useCallback(() => {
    //stops ongoing music in current call
    setRootMusicPlayerOptions(null);
    synchronizeMusicEventQueue.current.push({
      type: "STOP",
      time: -1,
      timestamp: Date.now(),
      src: "",
    });
  }, []);
  const musicSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const synchronizeMusicMutation = useMutation({
    mutationFn: ({
      type,
      src,
      time,
      timestamp,
    }: {
      type: string;
      src: string;
      time: number;
      timestamp: number;
    }) => {
      return api.post(`/call/musicSync`, {
        type,
        src,
        time,
        timestamp,
      });
    },
  });
  const synchronizeMusicEventQueue = useRef<
    { type: string; src: string; time: number; timestamp: number }[]
  >([]);

  useEffect(() => {
    let timeout: NodeJS.Timeout | null = null;
    const handler = async () => {
      const eventQueue = synchronizeMusicEventQueue.current.shift();
      if (eventQueue) {
        const data = await synchronizeMusicMutation.mutateAsync(eventQueue);
        if (data && data.status !== 200) {
          setCallErrorText((prev) => ({
            ...prev,
            musicStatus: "Music Out-of-sync",
          }));
        } else if (data) {
          setCallErrorText((prev) => ({
            ...prev,
            musicStatus: "",
          }));
        }
      }
      timeout = setTimeout(handler, 50);
    };

    timeout = setTimeout(handler, 50);

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, []);

  const synchronizeChecked = useRef<boolean>(false);

  //synchronize user settings with local storage in case there was any tempering, upon reloading page
  useEffect(() => {
    if (userSettings.data?.data && !synchronizeChecked.current) {
      GenericUtil.synchronizeUserSettings(userSettings.data.data);
      console.log("synchronized user settings with local storage.");
      synchronizeChecked.current = true;
    }
  }, [userSettings.data?.data]);
  const isBeforeUnloading = useRef<boolean>(false);

  const hasInitialized = useRef<boolean>(false);

  //client initial setup code (including socket initialization)
  useEffect(() => {
    //key bind handler (for keydown)

    let pushTalkKeyTimeout: NodeJS.Timeout | null = null;

    const keyBindHandler = (e: KeyboardEvent) => {
      const pushTalkKey = localStorage.getItem("pushTalkKey") ?? " ";

      if (e.key === pushTalkKey) {
        if (pushTalkKeyTimeout) {
          clearTimeout(pushTalkKeyTimeout);
        }
        window.shouldMaskAudioStream = false;
      }
    };

    //key bind handler 2 (for keyup)
    const keyBindHandler2 = (e: KeyboardEvent) => {
      const pushTalkKey = localStorage.getItem("pushTalkKey") ?? " ";
      const releaseDelayScale = isNaN(
        parseFloat(localStorage.getItem("releaseDelayScale") ?? "0.0")
      )
        ? 0.0
        : parseFloat(localStorage.getItem("releaseDelayScale") ?? "0.0");

      if (e.key === pushTalkKey) {
        pushTalkKeyTimeout = setTimeout(() => {
          window.shouldMaskAudioStream = true;
        }, (releaseDelayScale / 100.0) * 2000);
      }
    };

    window.showNoMicInputWarning =
      localStorage.getItem("showNoMicInputWarning") ?? "no";
    window.inputSensitivityScale = parseFloat(
      localStorage.getItem("inputSensitivityScale") ?? "4.5"
    );

    window.inputVolumeScale = parseFloat(
      localStorage.getItem("inpxutVolumeScale") ?? "100.0"
    );

    window.sbVolumeScale = parseFloat(
      localStorage.getItem("sbVolumeScale") ?? "100.0"
    );

    window.attenuationStrength = parseFloat(
      localStorage.getItem("attenuationStrength") ?? "50.0"
    );
    if (isNaN(window.inputSensitivityScale)) {
      window.inputSensitivityScale = 4.5;
    }

    if (isNaN(window.inputVolumeScale)) {
      window.inputVolumeScale = 100.0;
    }

    if (isNaN(window.sbVolumeScale)) {
      window.sbVolumeScale = 100.0;
    }

    if (isNaN(window.attenuationStrength)) {
      window.attenuationStrength = 50.0;
    }

    window.inputMode = localStorage.getItem("inputMode") ?? "Voice Activity";

    window.streamAttenuation =
      localStorage.getItem("streamAttenuation") ?? "yes";

    if (window.inputMode === "Push to Talk") {
      window.shouldMaskAudioStream = true;
    }

    window.addEventListener("keydown", keyBindHandler);
    window.addEventListener("keyup", keyBindHandler2);
    //patch localStorage.setItem
    const origSetItem = window.localStorage.setItem;
    const origRemoveItem = window.localStorage.removeItem;
    const handleReloadChat = () => {
      setShouldBatchResetChatsQuery((prev) => prev + 1);
    };
    const handleReloadChatAndSpam = () => {
      spamRoom.refetch();
      setShouldBatchResetChatsQuery((prev) => prev + 1);
    };

    window.localStorage.setItem = function setItem(key, value) {
      const oldValue = window.localStorage.getItem(key);

      const result = origSetItem.apply(this, [key, value]);

      const e = new StorageEvent("storage", {
        storageArea: window.localStorage,
        key,
        oldValue,
        newValue: value,
        url: window.location.href,
      });
      window.dispatchEvent(e);

      return result;
    };

    window.localStorage.removeItem = function removeItem(key) {
      const oldValue = window.localStorage.getItem(key);

      const result = origRemoveItem.apply(this, [key]);

      const e = new StorageEvent("storage", {
        storageArea: window.localStorage,
        key,
        oldValue,
        newValue: "",
        url: window.location.href,
      });
      window.dispatchEvent(e);

      return result;
    };
    const onSettingsModified = (e: StorageEvent) => {
      if (
        [
          "dm_friends_sensitive",
          "dm_others_sensitive",
          "group_sensitive",
        ].includes(e.key ?? "") &&
        (e.newValue === "Block" || e.oldValue === "Block")
      ) {
        setGlobalWarningIndicator((prev) => {
          if (prev.onClick !== handleReloadChatAndSpam) {
            return {
              message:
                "Important setting has been modified. You must reload the chat for it to take effect.",
              onClick: handleReloadChat,
            };
          }
          return prev;
        });
      } else if (e.key === "filterSpamMode") {
        setGlobalWarningIndicator({
          message:
            "Important setting has been modified. You must reload the chat for it to take effect.",
          onClick: handleReloadChatAndSpam,
        });
      } else if (e.key === "messageRequests") {
        setShouldRerenderDirectMessageBar((prev) => !prev);

        setShouldShowMessageRequestMenu(
          (localStorage.getItem("messageRequests") ?? "true") === "true"
            ? true
            : false
        );
      } else if (e.key === "saturationScale") {
        const saturation = localStorage.getItem("saturationScale") ?? "100.0";

        const val = parseFloat(saturation);

        if (!isNaN(val)) {
          document.body.style.filter = `saturate(${val}%)`;
        }
      } else if (e.key === "inputSensitivityScale") {
        window.inputSensitivityScale = parseFloat(e.newValue ?? "4.5");

        if (isNaN(window.inputSensitivityScale)) {
          window.inputSensitivityScale = 4.5;
        }
      } else if (e.key === "inputMode") {
        window.inputMode = e.newValue ?? "Voice Activity";
        if (e.newValue === "Push to Talk") {
          window.shouldMaskAudioStream = true;
        }
      } else if (e.key === "videoCodec" && e.oldValue !== e.newValue) {
        if (currentCallingChatRoomRef.current) {
          setCallErrorText((prev) => ({
            ...prev,
            settingsStatus:
              "Important settings modified, please rejoin call to apply changes",
          }));
        }
      } else if (e.key === "attenuationStrength") {
        window.attenuationStrength = parseFloat(e.newValue ?? "50.0");

        if (isNaN(window.attenuationStrength)) {
          window.attenuationStrength = 50.0;
        }
      } else if (e.key === "streamAttenuation") {
        window.streamAttenuation = e.newValue ?? "yes";
      } else if (e.key === "showNoMicInputWarning") {
        window.showNoMicInputWarning = e.newValue ?? "no";
      } else if (
        e.key === "appTheme" ||
        e.key === "appIcon" ||
        e.key === "unreadBadge"
      ) {
        setRerenderTitleFlag((prev) => prev + 1);
      }
    };

    const messageRequests = localStorage.getItem("messageRequests") ?? "true";

    setShouldShowMessageRequestMenu(messageRequests === "true");

    window.addEventListener("storage", onSettingsModified);
    const callBackground = window.localStorage.getItem("callBackground");
    if (callBackground) {
      setSelectedCallBackground(callBackground);
    }
    //console warning customization
    const consoleWarn = console.error;
    const serviceWorkerMessageHandler = (e: MessageEvent) => {
      if (e.data && e.data["action"] === "navigate") {
        router.replace(new URL(e.data["url"]).pathname);
      }
    };
    //request nofication
    if ("Notification" in window) {
      navigator.serviceWorker.addEventListener(
        "message",
        serviceWorkerMessageHandler
      );

      const handleInitializePushNotifications = async () => {
        if (hasInitialized.current) {
          return;
        }
        hasInitialized.current = true;
        console.log("initializing notifications system...");
        let hasNotificationPermission = false;
        if (Notification.permission !== "granted") {
          hasNotificationPermission = false;
          const permission = await Notification.requestPermission();
          if (permission === "granted") {
            hasNotificationPermission = true;
          }
        } else {
          hasNotificationPermission = true;
        }

        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          const subscription = await registration.pushManager.getSubscription();
          if (subscription) {
            await subscription.unsubscribe();
          }

          await registration.unregister();
        }

        console.log("unregistered push notification service worker.");

        if (!hasNotificationPermission) {
          return;
        }

        await navigator.serviceWorker.register(
          `${Constants.CLIENT_URL_PATH}/sw.js`
        );
        const registration = await navigator.serviceWorker.ready;

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey:
            "BC1vN8qtr0DZxNlpCt3aOOGh1ZrLCrv6ypXbyC1NkiTCYaMOpX3q5LdQ2e7krKzz2mRUvE5zPbKuTP3lE4pyeFg",
        });

        if (
          !Cookies.get("accord_refresh_token") ||
          !subscription.getKey("p256dh") ||
          !subscription.getKey("p256dh")
        ) {
          ModalUtils.openGenericModal(
            {
              setGenericContent,
              setGenericHeader,
              setModalType,
              setClickOutsideToClose,
              setCustomButtonSet,
              setCustomContent,
              setCustomHeader,
              setOnAccept,
              setOnReject,
              setOpen: setOpenModal,
              open: openModal,
              setShouldExitAnimation: setModalShouldExitAnimation,
            },
            "Unexpected Error",
            "Failed to establish subscription to push notifications. You will not be able to receive push notifications onwards. To try again, please reload the page."
          );
        }
        const subscriptionPayload = {
          endpoint: subscription.endpoint,

          p256dh: GenericUtil.arrayBufferToBase64(
            subscription.getKey("p256dh")!
          ),
          auth: GenericUtil.arrayBufferToBase64(subscription.getKey("auth")!),
          loginSessionToken: Cookies.get("accord_refresh_token"),
        };
        console.log("registered new push notification service worker.");
        console.log(subscription);
        console.log("sending subscription payload:", subscriptionPayload);

        const response = await api.post(
          "/pushNotification/subscribe",
          subscriptionPayload
        );
        if (response.status !== 200) {
          ModalUtils.openGenericModal(
            {
              setGenericContent,
              setGenericHeader,
              setModalType,
              setClickOutsideToClose,
              setCustomButtonSet,
              setCustomContent,
              setCustomHeader,
              setOnAccept,
              setOnReject,
              setOpen: setOpenModal,
              open: openModal,
              setShouldExitAnimation: setModalShouldExitAnimation,
            },
            "Oof.",
            "Failed to establish subscription to push notifications. You will not be able to receive push notifications onwards. To try again, please reload the page."
          );
        }
      };

      handleInitializePushNotifications();
    }

    //load per-user call preferences
    const disabledAudios = new Set<string>();
    const disabledVideos = new Set<string>();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) ?? "";
      if (key.startsWith("accord_voiceDisabled")) {
        const userId = key.substring(key.lastIndexOf("_") + 1);
        disabledAudios.add("voice@" + userId);
      } else if (key.startsWith("accord_systemDisabled")) {
        const userId = key.substring(key.lastIndexOf("_") + 1);
        disabledAudios.add("system@" + userId);
      } else if (key.startsWith("accord_cameraDisabled")) {
        const userId = key.substring(key.lastIndexOf("_") + 1);
        disabledVideos.add("camera@" + userId);
      } else if (key.startsWith("accord_screenDisabled")) {
        const userId = key.substring(key.lastIndexOf("_") + 1);
        disabledVideos.add("screen@" + userId);
      }
    }

    console.log("disabled audio stream settings loaded: ", disabledAudios);

    setDisabledAudioStreams(() => disabledAudios);
    setDisabledVideoStreams(() => disabledVideos);

    //get media information, attach device change detector
    updateDeviceList();
    const deviceChangeHandler = async () => {
      try {
        const [deviceName, deviceId, isVideo] = await updateDeviceList();
        if (deviceName.length === 0 || deviceId.length === 0) return;
        ModalUtils.openGenericModal(
          {
            setGenericContent,
            setGenericHeader,
            setModalType,
            setClickOutsideToClose,
            setCustomButtonSet,
            setCustomContent,
            setCustomHeader,
            setOnAccept,
            setOnReject,
            setOpen: setOpenModal,
            open: openModal,
            setShouldExitAnimation: setModalShouldExitAnimation,
          },
          "Wind is howling..",
          "",
          () => {
            handleChangeDevice(deviceId, isVideo);
          },
          <>
            New {isVideo ? "camera" : "microphone"} was detected. Would you like
            to switch input to the new device{" "}
            <span className="font-bold">{deviceName}</span>?
          </>,
          [
            <PrimaryButton key={0}>
              <div className="text-center flex items-center gap-2 cursor-pointer w-full justify-center transition text-white">
                Why not.
                <IoCheckmark />
              </div>
            </PrimaryButton>,
            <PrimaryButton key={1} customStyles="mt-5 bg-red-500">
              <div className="text-center flex items-center gap-2 cursor-pointer w-full justify-center transition text-white">
                Nope.
                <FaX />
              </div>
            </PrimaryButton>,
          ],
          undefined,
          false
        );
      } catch (err) {
        console.error(err);
      }
    };

    if (navigator.mediaDevices)
      navigator.mediaDevices.addEventListener(
        "devicechange",
        deviceChangeHandler
      );
    //also load media device if there was any
    const audioUserInputDevice = window.localStorage.getItem(
      "accord_audioUserInputDevice"
    );

    const videoUserInputDevice = window.localStorage.getItem(
      "accord_videoUserInputDevice"
    );

    setSelectedDevice({
      audioUserInputDevice: audioUserInputDevice ?? "",
      videoUserInputDevice: videoUserInputDevice ?? "",
    });

    const subscription: StompSubscription[] = [];

    const onBeforeUnload = () => {
      isBeforeUnloading.current = true;
    };

    window.addEventListener("beforeunload", onBeforeUnload);

    let currentUser = queryClient.getQueryData<{ data: User }>(["user"])?.data;
    const initializeSocketClient = async () => {
      //wait for currentUser query to complete
      await new Promise((resolve) => {
        if (currentUser) {
          resolve(true);
        }
        const interval = setInterval(() => {
          currentUser = queryClient.getQueryData<{ data: User }>([
            "user",
          ])?.data;
          if (currentUser) {
            resolve(true);
            clearInterval(interval);
          }
        }, 100);
      });
      try {
        const [stompClient_, frame_] = await socketapi.connect(currentUser!.id);

        if (stompClient_ && frame_) {
          setStompClient(stompClient_);
          setStompFrame(frame_);
          const currentSocketUser = frame_["headers"]["user-name"];
          stompClient_.onWebSocketClose = () => {
            console.log("client socket closed");

            if (!isBeforeUnloading.current)
              ModalUtils.openGenericModal(
                {
                  setGenericContent,
                  setGenericHeader,
                  setModalType,
                  setClickOutsideToClose,
                  setCustomButtonSet,
                  setCustomContent,
                  setCustomHeader,
                  setOnAccept,
                  setOnReject,
                  setOpen: setOpenModal,
                  open: openModal,
                  setShouldExitAnimation: setModalShouldExitAnimation,
                },
                "Peace Disturbed",
                "You lost connection to the server (network issue or logged in elsewhere). Would you like to reload the page?",
                () => window.location.reload()
              );
            // setTimeout(() => {
            //   window.location.reload();
            // }, 3000);
          };
          //set user online
          statusMutation.mutate("ONLINE");

          //set up initial (root layout) subscriptions
          const onCreateChatRoom = stompClient_.subscribe(
            `/user/${currentSocketUser}/general/onCreateChatRoom`,
            (message) => {
              const payload: ChatRoom = JSON.parse(message.body);
              queryClient.setQueryData(
                ["chatroom_dm"],
                (prev: { data: ChatRoom[] }) => {
                  return {
                    data: [...prev.data, { ...payload }],
                  };
                }
              );
            }
          );

          const onLeaveChatRoom = stompClient_.subscribe(
            `/user/${currentSocketUser}/general/onLeaveChatRoom`,
            (message) => {
              const payload: { leftUser: string; chatRoomId: string } =
                JSON.parse(message.body);
              queryClient.setQueryData(
                ["chatroom_dm"],
                (prev: { data: ChatRoom[] }) => {
                  return {
                    data: prev.data.map((chatroom) => {
                      if (chatroom.id.toString() !== payload.chatRoomId) {
                        return chatroom;
                      }

                      return {
                        ...chatroom,
                        participants: chatroom.participants.filter(
                          (participant) =>
                            participant.username + "@" + participant.id !==
                            payload.leftUser
                        ),
                      };
                    }),
                  };
                }
              );
            }
          );

          const onInviteChatRoom = stompClient_.subscribe(
            `/user/${currentSocketUser}/general/onInviteChatRoom`,
            (message) => {
              const payload: ChatRoom = JSON.parse(message.body);
              queryClient.setQueryData(
                ["chatroom_dm"],
                (prev: { data: ChatRoom[] }) => {
                  return {
                    data: [...prev.data, { ...payload }],
                  };
                }
              );
            }
          );

          const onEditProfile = stompClient_.subscribe(
            `/user/${currentSocketUser}/general/onEditProfile`,
            (message) => {
              //update all chat participants' profile
              const data: User = JSON.parse(message.body);
              queryClient.setQueryData(
                ["chatroom_dm"],
                (prev: { data: ChatRoom[] }) => {
                  return {
                    data: prev.data.map((room) => ({
                      ...room,
                      participants: room.participants.map((participant) => {
                        if (participant.id === data.id) {
                          return { ...data };
                        }
                        return participant;
                      }),
                    })),
                  };
                }
              );

              queryClient.setQueryData(
                ["friends"],
                (prev: { data: User[] }) => {
                  return {
                    data: prev.data.map((friend) => {
                      if (friend.id === data.id) {
                        return {
                          ...data,
                        };
                      }
                      return friend;
                    }),
                  };
                }
              );
            }
          );

          const onEditChatRoom = stompClient_.subscribe(
            `/user/${currentSocketUser}/general/onEditChatRoom`,
            (message) => {
              const payload: ChatRoom = JSON.parse(message.body);
              queryClient.setQueryData(
                ["chatroom_dm"],
                (prev: { data: ChatRoom[] }) => {
                  return {
                    data: prev.data.map((chatroom) => {
                      if (chatroom.id !== payload.id) {
                        return chatroom;
                      }

                      return {
                        ...payload,
                      };
                    }),
                  };
                }
              );
            }
          );

          const onKickChatRoom = stompClient_.subscribe(
            `/user/${currentSocketUser}/general/onKickChatRoom`,
            (message) => {
              const payload: number = Number.parseInt(message.body);
              queryClient.setQueryData(
                ["chatroom_dm"],
                (prev: { data: ChatRoom[] }) => {
                  return {
                    data: prev.data.filter((chatroom) => {
                      return chatroom.id !== payload;
                    }),
                  };
                }
              );
            }
          );

          const onDeleteChatRoom = stompClient_.subscribe(
            `/user/${currentSocketUser}/general/onDeleteChatRoom`,
            (message) => {
              const payload: number = Number.parseInt(message.body);
              queryClient.setQueryData(
                ["chatroom_dm"],
                (prev: { data: ChatRoom[] }) => {
                  return {
                    data: prev.data.filter((chatroom) => {
                      return chatroom.id !== payload;
                    }),
                  };
                }
              );
            }
          );

          const onChatMessage = stompClient_.subscribe(
            `/user/${currentSocketUser}/general/onChatMessage`,
            async (message) => {
              const payload: {
                chatRoom: ChatRoom;
                chatRecord: ChatRecordType;
              } = JSON.parse(message.body);

              const blockeds = queryClient.getQueryData<{ data: User[] }>([
                "blockeds",
              ]);
              const blockers = queryClient.getQueryData<{ data: User[] }>([
                "blockers",
              ]);

              const [nsfwPreference, spamPreference] = getContentFilterFlags(
                payload.chatRoom
              ) ?? ["ANY", "ANY"];

              if (
                payload.chatRecord.type === "text" &&
                payload.chatRecord.isNsfw &&
                nsfwPreference === "EXCLUDE"
              )
                return;
              else if (
                payload.chatRecord.type === "text" &&
                payload.chatRecord.isSpam &&
                spamPreference === "EXCLUDE"
              )
                return;
              if (
                (blockeds?.data &&
                  payload.chatRecord.sender &&
                  blockeds.data.find(
                    (e) => e.id === payload.chatRecord.sender?.id
                  )) ||
                (blockers?.data &&
                  payload.chatRecord.sender &&
                  blockers.data.find(
                    (e) => e.id === payload.chatRecord.sender?.id
                  ))
              ) {
                return;
              }

              const currentUserData = queryClient.getQueryData<{
                data: User | undefined;
              }>(["user"]);
              const friends = queryClient.getQueryData<{ data: User[] }>([
                "friends",
              ])?.data;

              const currentUserSettings = queryClient.getQueryData<{
                data: UserSettings;
              }>(["user_settings"])?.data;

              const isGroupChat =
                !payload.chatRoom.direct1to1Identifier?.length;

              const otherUserId = payload.chatRoom.direct1to1Identifier?.length
                ? payload.chatRoom.direct1to1Identifier
                    .split("@")
                    .map((e) => parseInt(e))
                    .find((e) => e !== currentUserData?.data?.id)
                : 0;

              const isFriends =
                friends?.find((e) => e.id === otherUserId) !== undefined;

              if (
                !isGroupChat &&
                !isFriends &&
                (localStorage.getItem("messageRequests") ?? "true") === "true"
              ) {
                return;
              }

              const doNotification =
                localStorage.getItem("doNotification") ?? "true";

              if (doNotification !== "true") {
                return;
              }

              const pathname = new URL(window.location.href).pathname;

              if (
                typeof Notification !== "undefined" &&
                (document.visibilityState !== "visible" ||
                  pathname !== `/dashboard/chatroom/${payload.chatRoom.id}`) &&
                Notification.permission === "granted"
              ) {
                //show notification

                let status = "ONLINE";

                if (currentUserData && currentUserData.data) {
                  status = currentUserData.data.status;
                }
                if (status !== "DO_NOT_DISTURB") {
                  const mentionedUserIds = [
                    ...payload.chatRecord.message.matchAll(Constants.mentionRe),
                  ].map((match) => match[0].substring(4, match[0].length - 3));

                  const hasUserMutedChatRoom =
                    currentUserSettings &&
                    currentUserSettings.mutedChatRoomIds.includes(
                      payload.chatRoom.id
                    );
                  const isUserMentioned =
                    mentionedUserIds.includes(
                      currentUserData?.data?.id.toString() ?? "-1"
                    ) || mentionedUserIds.includes("-100");
                  if (isUserMentioned || !hasUserMutedChatRoom) {
                    const record = payload.chatRecord;

                    const participantUsernameLookup = new Map();

                    payload.chatRoom.participants.forEach((participant) => {
                      participantUsernameLookup.set(
                        participant.id.toString(),
                        participant.nickname.length > 0
                          ? participant.nickname
                          : participant.username
                      );
                    });
                    participantUsernameLookup.set("-100", "everyone");

                    //replace the mention tags with @username
                    payload.chatRecord.message =
                      payload.chatRecord.message.replace(
                        Constants.mentionRe,
                        (match) => {
                          const content = match.substring(4, match.length - 3);
                          return "@" + participantUsernameLookup.get(content);
                        }
                      );
                    //replace the spoiler tags with [SPOILER]
                    const displaySpoiler =
                      localStorage.getItem("displaySpoiler") ?? "click";
                    if (
                      displaySpoiler === "click" ||
                      (displaySpoiler === "owned" &&
                        !payload.chatRoom.direct1to1Identifier?.length &&
                        payload.chatRoom.ownerId !== currentUserData?.data?.id)
                    ) {
                      payload.chatRecord.message =
                        payload.chatRecord.message.replace(
                          Constants.spoilerRe,
                          "[SPOILER]"
                        );
                    }

                    //play notification sound, based on the context

                    if (isUserMentioned) {
                      SoundUtil.playSoundIfEnd(
                        Constants.SERVER_STATIC_CONTENT_PATH +
                          "emphasized_notification.ogg"
                      );
                    } else {
                      SoundUtil.playSoundIfEnd(
                        Constants.SERVER_STATIC_CONTENT_PATH +
                          "standard_notification.ogg"
                      );
                    }

                    let title = "";
                    let body = "";
                    let icon = "";
                    //determine the title of the notification

                    const chatRoomName = currentUserData?.data
                      ? GenericUtil.computeChatRoomName(
                          payload.chatRoom,
                          currentUserData.data
                        )
                      : "Loading..";

                    if (
                      (record.type === "text" || record.type === "poll") &&
                      record.sender
                    ) {
                      if (isGroupChat) {
                        title =
                          (record.sender.nickname.length > 0
                            ? record.sender.nickname
                            : record.sender.username) +
                          " @ " +
                          chatRoomName;
                      } else {
                        title = chatRoomName;
                      }
                    } else if (record.type.startsWith("system_")) {
                      title = isGroupChat ? "@" + chatRoomName : chatRoomName;
                    }
                    //determine the body of the notification
                    if (record.type === "text" && record.isNsfw) {
                      const friends = queryClient.getQueryData<{
                        data: User[];
                      }>(["friends"])?.data;
                      if (!friends || !currentUserData?.data) {
                        body = "This message has been marked as sensitive.";
                      } else {
                        if (payload.chatRoom.direct1to1Identifier?.length) {
                          const otherUserId =
                            payload.chatRoom.direct1to1Identifier
                              .split("@")
                              .map((e) => parseInt(e))
                              .find((e) => e !== currentUserData.data?.id);

                          if (friends.find((e) => e.id === otherUserId)) {
                            if (
                              (localStorage.getItem("dm_friends_sensitive") ??
                                "Show") !== "Show"
                            ) {
                              body =
                                "This message has been marked as sensitive.";
                            } else {
                              body = record.message;
                            }
                          } else {
                            if (
                              (localStorage.getItem("dm_others_sensitive") ??
                                "Show") !== "Show"
                            ) {
                              body =
                                "This message has been marked as sensitive.";
                            } else {
                              body = record.message;
                            }
                          }
                        } else {
                          if (
                            (localStorage.getItem("group_sensitive") ??
                              "Show") !== "Show"
                          ) {
                            body = "This message has been marked as sensitive.";
                          } else {
                            body = record.message;
                          }
                        }
                      }
                    } else if (
                      record.type === "text" &&
                      !record.attachments?.length
                    ) {
                      body = record.message;
                    } else if (record.type === "text") {
                      const containsImage =
                        record.attachments?.includes(".jpg") ||
                        record.attachments?.includes(".png") ||
                        record.attachments?.includes(".jpeg") ||
                        record.attachments?.includes(".webp") ||
                        record.attachments?.includes(".gif");
                      const containsAudio =
                        record.attachments?.includes(".mp3") ||
                        record.attachments?.includes(".wav") ||
                        record.attachments?.includes(".ogg");

                      const containsVideo =
                        record.attachments?.includes(".mp4") ||
                        record.attachments?.includes(".webm");

                      const containsText =
                        record.attachments?.includes(".txt") ||
                        record.attachments?.includes(".java") ||
                        record.attachments?.includes(".cpp");
                      if (
                        [
                          containsImage,
                          containsAudio,
                          containsVideo,
                          containsText,
                        ].filter(Boolean).length === 1
                      ) {
                        if (containsImage) {
                          body = "Click to see image.";
                        } else if (containsAudio) {
                          body = "Click to see audio.";
                        } else if (containsVideo) {
                          body = "Click to see video.";
                        } else if (containsText) {
                          body = "Click to see text.";
                        }
                      } else {
                        body = "Click to see attachment.";
                      }
                    } else if (
                      record.type === "poll" &&
                      record.sender &&
                      record.poll
                    ) {
                      body =
                        (record.sender.nickname.length > 0
                          ? record.sender.nickname
                          : record.sender.username) +
                        "'s poll: " +
                        record.poll?.question;
                    } else if (
                      record.type.startsWith("system_poll_expired") &&
                      record.sender
                    ) {
                      body =
                        (record.sender.nickname.length > 0
                          ? record.sender.nickname
                          : record.sender.username) +
                        "'s poll expired: " +
                        record.message.split("@")[0];
                    } else if (
                      record.type.startsWith("system_join") &&
                      record.sender
                    ) {
                      body =
                        (record.sender.nickname.length > 0
                          ? record.sender.nickname
                          : record.sender.username) + " joins the meditation.";
                    } else if (
                      record.type.startsWith("system_grant_moderator") &&
                      record.sender
                    ) {
                      body =
                        (record.sender.nickname.length > 0
                          ? record.sender.nickname
                          : record.sender.username) +
                        " has been granted a moderator status.";
                    } else if (
                      record.type.startsWith("system_revoke_moderator") &&
                      record.sender
                    ) {
                      body =
                        (record.sender.nickname.length > 0
                          ? record.sender.nickname
                          : record.sender.username) +
                        " 's moderator status has been revoked.";
                    } else if (
                      (record.type.startsWith("system_ownerleave") ||
                        record.type.startsWith("system_leave")) &&
                      record.sender
                    ) {
                      body =
                        (record.sender.nickname.length > 0
                          ? record.sender.nickname
                          : record.sender.username) +
                        " left in search for peace.";
                    } else if (
                      record.type.startsWith("system_kick") &&
                      record.sender
                    ) {
                      body =
                        (record.sender.nickname.length > 0
                          ? record.sender.nickname
                          : record.sender.username) +
                        " has been kicked into the wilderness.";
                    } else if (
                      record.type.startsWith("system_private") &&
                      record.type.includes("_missedCall")
                    ) {
                      body = "You missed a call.";
                    } else if (
                      record.type.startsWith("system_private") &&
                      record.type.includes("_react") &&
                      record.sender
                    ) {
                      body =
                        (record.sender.nickname.length > 0
                          ? record.sender.nickname
                          : record.sender.username) +
                        " reacted with " +
                        record.message.split("@")[0] +
                        " on your message.";
                    } else if (record.type.startsWith("system_endCall")) {
                      body = "A call came to an end.";
                    } else if (
                      record.type.startsWith("system_startCall") &&
                      record.sender
                    ) {
                      body =
                        (record.sender.nickname.length > 0
                          ? record.sender.nickname
                          : record.sender.username) + " started a call.";
                    }

                    if (
                      (record.type === "text" || record.type === "poll") &&
                      record.sender
                    ) {
                      if (record.sender.profileImageUrl) {
                        icon =
                          Constants.SERVER_STATIC_CONTENT_PATH +
                          record.sender.profileImageUrl;

                        dispatchNotification(
                          title,
                          body,
                          icon,
                          `${Constants.CLIENT_URL_PATH}/dashboard/chatroom/${payload.chatRoom.id}`
                        );
                      } else {
                        icon = createAvatar(icons, {
                          size: 24,
                          backgroundColor: [
                            record.sender.profileColor.substring(1),
                          ],
                          radius: 50,
                          icon: ["tree"],
                        }).toDataUri();
                        dispatchNotification(
                          title,
                          body,
                          icon,
                          `${Constants.CLIENT_URL_PATH}/dashboard/chatroom/${payload.chatRoom.id}`
                        );
                      }
                    } else {
                      icon =
                        Constants.SERVER_STATIC_CONTENT_PATH +
                        "accord_logo.png";
                      dispatchNotification(
                        title,
                        body,
                        icon,
                        `${Constants.CLIENT_URL_PATH}/dashboard/chatroom/${payload.chatRoom.id}`
                      );
                    }
                  }
                }
              }
              queryClient.setQueryData(
                ["chatroom_dm"],
                (prev: { data: ChatRoom[] }) => {
                  if (prev.data === undefined || !prev.data[0]) {
                    return prev;
                  }

                  if (prev.data[0].id === payload.chatRoom.id) {
                    //chatroom already ordered

                    return prev;
                  }
                  const newList = [payload.chatRoom];
                  prev.data.forEach((chatRoom) => {
                    if (chatRoom.id !== payload.chatRoom.id) {
                      newList.push(chatRoom);
                    }
                  });

                  return {
                    data: newList,
                  };
                }
              );
            }
          );

          const onAcceptFriendRequest = stompClient_.subscribe(
            `/user/${currentSocketUser}/general/onAcceptFriendRequest`,
            (message) => {
              const payload: User = JSON.parse(message.body);

              queryClient.setQueryData(
                ["friends", "pending", "outgoing"],
                (prev: { data: User[] }) => {
                  if (!prev) return;
                  return {
                    data: prev.data.filter(
                      (friend) =>
                        friend.username + "@" + friend.id !==
                        payload.username + "@" + payload.id
                    ),
                  };
                }
              );
              queryClient.setQueryData(
                ["friends"],
                (prev: { data: User[] }) => {
                  if (!prev) return;
                  return {
                    data: [...prev.data, { ...payload }],
                  };
                }
              );

              const urlPath = window.location.pathname;
              const segments = urlPath.split("/");
              const idString = segments[segments.length - 1];

              const currentChatRoom = queryClient.getQueryData<{
                data: ChatRoom;
              }>(["chatroom_dm", idString])?.data;
              if (
                currentChatRoom &&
                currentChatRoom.participants.find((e) => e.id === payload.id)
              ) {
                setShouldBatchResetChatsQuery((prev) => prev + 1);
              }
            }
          );

          const onRemoveFriend = stompClient_.subscribe(
            `/user/${currentSocketUser}/general/onRemoveFriend`,
            (message) => {
              const payload = message.body;
              queryClient.setQueryData(
                ["friends"],
                (prev: { data: User[] }) => {
                  if (!prev) return;
                  return {
                    data: prev.data.filter(
                      (friend) => friend.username + "@" + friend.id !== payload
                    ),
                  };
                }
              );
            }
          );

          const onCall = stompClient_.subscribe(
            `/user/${currentSocketUser}/general/onCall`,
            (message) => {
              //when receiving call, show call alert overlay.
              const payload: { chatRoom: ChatRoom; starterId: number } =
                JSON.parse(message.body);

              queryClient.setQueryData(
                ["chatroom_dm"],
                (prev: { data: ChatRoom[] }) => {
                  if (!prev) return prev;

                  return {
                    data: prev.data.map((chatroom) => {
                      if (chatroom.id === payload.chatRoom.id) {
                        return {
                          ...payload.chatRoom,
                        };
                      }
                      return chatroom;
                    }),
                  };
                }
              );

              if (incomingCallChatRoomRef.current) {
                //if there is already an incoming call, ignore
                return;
              }

              const blockeds = queryClient.getQueryData<{ data: User[] }>([
                "blockeds",
              ]);
              const blockers = queryClient.getQueryData<{ data: User[] }>([
                "blockers",
              ]);

              if (
                (blockeds?.data &&
                  blockeds.data.find((e) => e.id === payload.starterId)) ||
                (blockers?.data &&
                  blockers.data.find((e) => e.id === payload.starterId))
              ) {
                //if the call originates from a blocked user, ignore
                return;
              }

              SoundUtil.playSoundOverwrite(
                Constants.SERVER_STATIC_CONTENT_PATH + "calling_theme.mp3"
              );

              setIncomingCallChatRoom(payload.chatRoom);
              setCallAlertOverlayRemoteController("");
              //play call sound
            }
          );

          const onRejectCallTimeout = stompClient_.subscribe(
            `/user/${currentSocketUser}/general/onRejectCallTimeout`,
            (message) => {
              if (
                incomingCallChatRoomRef.current &&
                incomingCallChatRoomRef.current.id.toString() === message.body
              ) {
                //incoming call alert has timeout
                SoundUtil.stopSound(
                  Constants.SERVER_STATIC_CONTENT_PATH + "calling_theme.mp3"
                );
                setIncomingCallChatRoom(undefined);
              }
            }
          );

          const onCallSound = stompClient_.subscribe(
            `/user/${currentSocketUser}/general/onCallSound`,
            (message) => {
              const payload: { sound: Sound; userId: number } = JSON.parse(
                message.body
              );

              SoundUtil.playSoundOverwrite(
                Constants.SERVER_STATIC_CONTENT_PATH + payload.sound.file,
                "sound"
              );
            }
          );

          const onCallMusicSync = stompClient_.subscribe(
            `/user/${currentSocketUser}/general/onCallMusicSync`,
            (message) => {
              if (!currentCallingChatRoomRef.current) {
                return;
              }
              const payload: {
                type: string;
                clientTimestamp: number;
                src: string;
                time: number;
                serverTimestamp: number;
              } = JSON.parse(message.body);

              setCallErrorText((prev) => ({
                ...prev,
                musicStatus: "",
              }));

              setRootMusicPlayerOptions((prev) => {
                if (prev) {
                  return {
                    ...prev,
                    src: payload.type !== "SRC_LIST" ? payload.src : prev.src,
                    allLoop:
                      payload.type === "ALL_LOOP"
                        ? payload.time > 0
                        : prev.allLoop,
                    loop:
                      payload.type === "LOOP" ? payload.time > 0 : prev.loop,
                    srcList:
                      payload.type === "SRC_LIST"
                        ? payload.src.split("@")
                        : prev.srcList,
                  };
                } else {
                  return {
                    targetElement: null,
                    src: payload.type !== "SRC_LIST" ? payload.src : "",
                    customTextColor: "text-lime-400",
                    autoPlay: undefined,
                    uuid: "shareplaying_" + payload.src,
                    allLoop:
                      payload.type === "ALL_LOOP" ? payload.time > 0 : false,
                    loop: payload.type === "LOOP" ? payload.time > 0 : false,
                    srcList:
                      payload.type === "SRC_LIST" ? payload.src.split("@") : [],
                  };
                }
              });

              //compute accurate current time

              if (musicSyncTimeoutRef.current) {
                clearTimeout(musicSyncTimeoutRef.current);
              }

              console.log(
                "received",
                payload.type,
                payload.type === "SRC_LIST" ? payload.src.split("@") : "!",
                payload.time
              );
              if (payload.type === "STOP" && rootMusicPlayerRef.current) {
                if (!rootMusicPlayerRef.current.paused)
                  rootMusicPlayerRef.current.pause();
                rootMusicPlayerRef.current.currentTime = 0;
              } else if (
                payload.type === "LOOP" &&
                rootMusicPlayerRef.current
              ) {
                rootMusicPlayerRef.current.loop = payload.time > 0;
              } else if (
                payload.type !== "LOOP" &&
                payload.type !== "SRC_LIST" &&
                payload.type !== "ALL_LOOP" &&
                payload.type !== "STOP"
              ) {
                let tries = 0;
                const handler = () => {
                  if (
                    rootMusicPlayerRef.current &&
                    decodeURIComponent(rootMusicPlayerRef.current.src) ===
                      payload.src
                  ) {
                    const now = Date.now();
                    const delay =
                      now -
                      payload.serverTimestamp +
                      (payload.serverTimestamp - payload.clientTimestamp);
                    //assume the music was keep playing
                    const adjustedTime = payload.time + delay;
                    if (payload.type === "PAUSE") {
                      if (!rootMusicPlayerRef.current.paused)
                        rootMusicPlayerRef.current.pause();
                      rootMusicPlayerRef.current.currentTime =
                        adjustedTime / 1000.0;
                    } else if (payload.type === "PLAY") {
                      if (rootMusicPlayerRef.current.paused) {
                        rootMusicPlayerRef.current.play();
                      }
                      rootMusicPlayerRef.current.currentTime =
                        adjustedTime / 1000.0;
                    }
                  } else {
                    tries++;
                    if (tries < 10)
                      musicSyncTimeoutRef.current = setTimeout(handler, 50);
                    else {
                      console.log("daf?");
                      setCallErrorText((prev) => ({
                        ...prev,
                        musicStatus: "Music Out-of-sync",
                      }));
                    }
                  }
                };

                musicSyncTimeoutRef.current = setTimeout(handler, 50);
              }
            }
          );

          const onJoinCall = stompClient_.subscribe(
            `/user/${currentSocketUser}/general/onJoinCall`,
            (message) => {
              const payload: {
                chatRoomId: number;
                joinTime: number;
                headId: number;
                joinSoundFile: string;
              } = JSON.parse(message.body);

              if (
                currentCallingChatRoomRef.current &&
                payload.chatRoomId === currentCallingChatRoomRef.current.id
              ) {
                console.log("join sound file=[", payload.joinSoundFile + "]");
                console.log(
                  Constants.SERVER_STATIC_CONTENT_PATH +
                    (payload.joinSoundFile.trim() === "default"
                      ? "enter_sound.mp3"
                      : payload.joinSoundFile)
                );
                SoundUtil.playSoundForce(
                  Constants.SERVER_STATIC_CONTENT_PATH +
                    (payload.joinSoundFile === "default"
                      ? "enter_sound.mp3"
                      : payload.joinSoundFile)
                );
                SoundUtil.stopSound(
                  Constants.SERVER_STATIC_CONTENT_PATH + "calling_theme.mp3"
                );
                //someone joined the call, resubscribe to other users' stream

                const currentUser = queryClient.getQueryData<{ data: User }>([
                  "user",
                ]);
                if (currentUser) {
                  handleSubscribeStream(
                    currentCallingChatRoomRef.current,
                    payload.joinTime
                  );
                } else {
                  console.error("User context missing");
                }

                //send current music information for the late joiner
                //todo: way to select the "reprensentative" participant

                if (
                  rootMusicPlayerOptionsRef.current &&
                  currentUser &&
                  currentUser.data.id === payload.headId &&
                  rootMusicPlayerRef.current
                ) {
                  //send loop info
                  synchronizeMusicEventQueue.current.push({
                    type: "LOOP",
                    time: rootMusicPlayerOptionsRef.current.loop ? 1 : 0,
                    timestamp: Date.now(),
                    src: rootMusicPlayerOptionsRef.current.src,
                  });

                  //send all loop info
                  synchronizeMusicEventQueue.current.push({
                    type: "ALL_LOOP",
                    time: rootMusicPlayerOptionsRef.current.allLoop ? 1 : 0,
                    timestamp: Date.now(),
                    src: rootMusicPlayerOptionsRef.current.src,
                  });

                  //send src list info

                  synchronizeMusicEventQueue.current.push({
                    type: "SRC_LIST",
                    time: 0,
                    timestamp: Date.now(),
                    src: rootMusicPlayerOptionsRef.current.srcList.join("@"),
                  });

                  //send player state info
                  synchronizeMusicEventQueue.current.push({
                    type: rootMusicPlayerRef.current.paused ? "PAUSE" : "PLAY",
                    time: Math.round(
                      rootMusicPlayerRef.current.currentTime * 1000
                    ),
                    timestamp: Date.now(),
                    src: rootMusicPlayerOptionsRef.current.src,
                  });
                }
              }
            }
          );

          const onLeaveCall = stompClient_.subscribe(
            `/user/${currentSocketUser}/general/onLeaveCall`,
            (message) => {
              const payload: {
                callEnded: boolean;
                chatRoomId: number;
                userId: number;
              } = JSON.parse(message.body);
              if (
                currentCallingChatRoomRef.current &&
                payload.chatRoomId === currentCallingChatRoomRef.current.id
              ) {
                SoundUtil.playSoundForce(
                  Constants.SERVER_STATIC_CONTENT_PATH + "exit_sound.mp3"
                );

                handleRemoveStream(payload.userId);
                handleRemoveVideoStream(payload.userId);
                if (payload.callEnded) {
                  handleCloseStream();
                  SoundUtil.stopSound(
                    Constants.SERVER_STATIC_CONTENT_PATH + "calling_theme.mp3"
                  );
                }
              }

              queryClient.setQueryData(
                ["chatroom_dm"],
                (prev: { data: ChatRoom[] }) => {
                  if (!prev) return prev;

                  return {
                    data: prev.data.map((chatroom) => {
                      if (chatroom.id === payload.chatRoomId) {
                        return {
                          ...chatroom,
                          callInstance: undefined,
                        };
                      }
                      return chatroom;
                    }),
                  };
                }
              );
            }
          );

          const onRejectCall = stompClient_.subscribe(
            `/user/${currentSocketUser}/general/onRejectCall`,
            (message) => {
              const payload: { remainingPendings: number; chatRoomId: number } =
                JSON.parse(message.body);

              if (
                currentCallingChatRoomRef.current &&
                payload.chatRoomId === currentCallingChatRoomRef.current.id &&
                payload.remainingPendings < 1
              ) {
                console.log("OK - stop sound invoked");
                SoundUtil.stopSound(
                  Constants.SERVER_STATIC_CONTENT_PATH + "calling_theme.mp3"
                );
              }
            }
          );

          const onUserMute = stompClient_.subscribe(
            `/user/${currentSocketUser}/general/onUserMute`,
            (message) => {
              const payload: {
                userId: number;
                muted: boolean;
                chatRoomId: number;
              } = JSON.parse(message.body);
              //play the mute sound, if in call
              if (
                currentCallingChatRoomRef.current &&
                currentCallingChatRoomRef.current.id === payload.chatRoomId
              ) {
                if (payload.muted)
                  SoundUtil.playSoundForce(
                    Constants.SERVER_STATIC_CONTENT_PATH + "mute_sound.mp3"
                  );
                else
                  SoundUtil.playSoundForce(
                    Constants.SERVER_STATIC_CONTENT_PATH + "unmute_sound.mp3"
                  );
              }
            }
          );

          const onUserDeafen = stompClient_.subscribe(
            `/user/${currentSocketUser}/general/onUserDeafen`,
            (message) => {
              const payload: {
                userId: number;
                deafened: boolean;
                chatRoomId: number;
              } = JSON.parse(message.body);
              //just play the deafen sound, if in call
              if (
                currentCallingChatRoomRef.current &&
                currentCallingChatRoomRef.current.id === payload.chatRoomId
              ) {
                if (payload.deafened)
                  SoundUtil.playSoundForce(
                    Constants.SERVER_STATIC_CONTENT_PATH + "deafen_sound.mp3"
                  );
                else
                  SoundUtil.playSoundForce(
                    Constants.SERVER_STATIC_CONTENT_PATH + "undeafen_sound.mp3"
                  );
              }
            }
          );

          const onUserScreenShareEnable = stompClient_.subscribe(
            `/user/${currentSocketUser}/general/onUserScreenShareEnable`,
            (message) => {
              const payload: { enabled: string; chatRoomId: number } =
                JSON.parse(message.body);
              console.log(payload);
              //just play the screen share sound, if in call
              if (
                currentCallingChatRoomRef.current &&
                currentCallingChatRoomRef.current.id === payload.chatRoomId
              ) {
                if (payload.enabled !== "no")
                  SoundUtil.playSoundForce(
                    Constants.SERVER_STATIC_CONTENT_PATH + "streaming_sound.mp3"
                  );
                else
                  SoundUtil.playSoundForce(
                    Constants.SERVER_STATIC_CONTENT_PATH +
                      "unstreaming_sound.mp3"
                  );
              }
            }
          );

          const onUserBlocked = stompClient_.subscribe(
            `/user/${currentSocketUser}/general/onUserBlocked`,
            (message) => {
              const payload: User = JSON.parse(message.body);
              //someone blocked you
              queryClient.setQueryData(
                ["blockers"],
                (prev: { data: User[] }) => {
                  if (!prev) return prev;

                  return {
                    data: [...prev.data, payload],
                  };
                }
              );
            }
          );

          const onUserUnblocked = stompClient_.subscribe(
            `/user/${currentSocketUser}/general/onUserUnblocked`,
            (message) => {
              const payload: number = JSON.parse(message.body);
              //someone unblocked you
              queryClient.setQueryData(
                ["blockers"],
                (prev: { data: User[] }) => {
                  if (!prev) return prev;

                  return {
                    data: prev.data.filter((e) => e.id !== payload),
                  };
                }
              );
            }
          );

          const onCallKicked = stompClient_.subscribe(
            `/user/${currentSocketUser}/general/onCallKicked`,
            (message) => {
              const payload: {
                chatRoomId: number;
                userId: number;
                callEnded: boolean;
                callAborted: boolean;
              } = JSON.parse(message.body);

              if (
                currentCallingChatRoomRef.current &&
                payload.chatRoomId === currentCallingChatRoomRef.current.id
              ) {
                ModalUtils.openGenericModal(
                  {
                    setGenericContent,
                    setGenericHeader,
                    setModalType,
                    setClickOutsideToClose,
                    setCustomButtonSet,
                    setCustomContent,
                    setCustomHeader,
                    setOnAccept,
                    setOnReject,
                    setOpen: setOpenModal,
                    open: openModal,
                    setShouldExitAnimation: setModalShouldExitAnimation,
                  },
                  "Oof.",
                  payload.callAborted
                    ? "The owner of the chatroom deemed this call come to an end."
                    : "The owner of the chatroom kicked you out of this call!",
                  undefined,
                  undefined,
                  undefined,
                  undefined,
                  true
                );

                if (payload.callAborted) {
                  queryClient.setQueryData(
                    ["chatroom_dm", payload.chatRoomId.toString()],
                    (prev: { data: ChatRoom }) => {
                      if (!prev || !prev.data.callInstance) {
                        return prev;
                      }

                      //call aborted, close call overlay
                      console.log("close call overlay remote");
                      setCallOverlayRemoteController(
                        "closeOverlay" + new Date().getTime()
                      );

                      return {
                        data: {
                          ...prev.data,
                          callInstance: undefined,
                        },
                      };
                    }
                  );
                } else {
                  queryClient.setQueryData(
                    ["chatroom_dm", payload.chatRoomId.toString()],
                    (prev: { data: ChatRoom }) => {
                      if (!prev || !prev.data.callInstance) {
                        return prev;
                      }
                      const newActiveParticipants =
                        prev.data.callInstance.activeParticipants.filter(
                          (user) => user.id !== payload.userId
                        );
                      const newPendingParticipants =
                        prev.data.callInstance.pendingParticipants.filter(
                          (user) => user.id !== payload.userId
                        );

                      if (newActiveParticipants.length === 0) {
                        //looks like call ended, close the call overlay
                        setCallOverlayRemoteController(
                          "closeOverlay" + new Date().getTime()
                        );
                      } else {
                        //otherwise, set it to preview mode
                        setCallOverlayRemoteController(
                          "setPreview" + new Date().getTime()
                        );
                      }

                      return {
                        data: {
                          ...prev.data,
                          callInstance: {
                            ...prev.data.callInstance,
                            activeParticipants: newActiveParticipants,
                            pendingParticipants: newPendingParticipants,
                          },
                        },
                      };
                    }
                  );
                }

                if (payload.callEnded) {
                  queryClient.setQueryData(
                    ["chatroom_dm"],
                    (prev: { data: ChatRoom[] }) => {
                      if (!prev) return prev;

                      return {
                        data: prev.data.map((chatroom) => {
                          if (chatroom.id === payload.chatRoomId) {
                            return {
                              ...chatroom,
                              callInstance: undefined,
                            };
                          }
                          return chatroom;
                        }),
                      };
                    }
                  );
                }
                SoundUtil.stopSound(
                  Constants.SERVER_STATIC_CONTENT_PATH + "calling_theme.mp3"
                );
                SoundUtil.playSoundForce(
                  Constants.SERVER_STATIC_CONTENT_PATH + "exit_sound.mp3"
                );

                setCurrentCallingChatroom(undefined);
                handleCloseStream();
              }
            }
          );

          subscription.concat([
            onCreateChatRoom,
            onLeaveChatRoom,
            onInviteChatRoom,
            onEditChatRoom,
            onKickChatRoom,
            onChatMessage,
            onDeleteChatRoom,
            onAcceptFriendRequest,
            onRemoveFriend,
            onCall,
            onRejectCallTimeout,
            onLeaveCall,
            onJoinCall,
            onRejectCall,
            onUserMute,
            onCallKicked,
            onUserDeafen,
            onUserScreenShareEnable,
            onUserBlocked,
            onUserUnblocked,
            onCallSound,
            onCallMusicSync,
            onEditProfile,
          ]);

          //websocket connected, ping janus session
          setInterval(async () => {
            if (!pingSessionMutationPendingRef.current) {
              pingSessionMutation.mutate();
            }
          }, 50000);
        }
      } catch (e) {
        console.error(e);

        ModalUtils.openGenericModal(
          {
            setGenericContent,
            setGenericHeader,
            setModalType,
            setClickOutsideToClose,
            setCustomButtonSet,
            setCustomContent,
            setCustomHeader,
            setOnAccept,
            setOnReject,
            setOpen: setOpenModal,
            open: openModal,
            setShouldExitAnimation: setModalShouldExitAnimation,
          },
          "Peace Disturbed",
          "There was problem connecting to the server. Would you like to reload the page?",
          () => window.location.reload()
        );

        // setTimeout(() => {
        //   window.location.reload();
        // }, 3000);
      }

      setIsConnected(true);
    };

    initializeSocketClient();

    return () => {
      if (subscription) subscription.forEach((e) => e.unsubscribe());
      socketapi.disconnect();
      console.warn = consoleWarn;
      setIsConnected(false);
      if (navigator.mediaDevices)
        navigator.mediaDevices.removeEventListener(
          "devicechange",
          deviceChangeHandler
        );

      navigator.serviceWorker.removeEventListener(
        "message",
        serviceWorkerMessageHandler
      );
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("storage", onSettingsModified);
      window.removeEventListener("keydown", keyBindHandler);
      window.removeEventListener("keyup", keyBindHandler2);
    };
  }, []);

  useEffect(() => {
    incomingCallChatRoomRef.current = incomingCallChatRoom ?? null;
  }, [incomingCallChatRoom]);
  useEffect(() => {
    currentCallingChatRoomRef.current = currentCallingChatRoom;
    if (!currentCallingChatRoom)
      setCallErrorText((prev) => ({
        ...prev,
        settingsStatus: "",
      }));
  }, [currentCallingChatRoom]);

  const callWorkPending = useRef<boolean>(false);

  const [showMessageRequests, setShowMessageRequests] = useState(false);
  const [msgRequestNotificationCount, setMsgRequestNotificationCount] =
    useState(0);

  const [globalNotificationCount, setGlobalNotificationCount] = useState(0);
  const [rerenderTitleFlag, setRerenderTitleFlag] = useState(0);

  useEffect(() => {
    if (
      chatRooms.data?.data &&
      currentUser.data?.data.id &&
      friends.data?.data
    ) {
      if (
        Object.keys(recentChatNotifications).length !==
        chatRooms.data.data.length
      ) {
        return;
      }

      const cnt = chatRooms.data.data
        .filter((c) => {
          if (c.direct1to1Identifier?.length) {
            const otherUserId = c.direct1to1Identifier
              .split("@")
              .map((e) => parseInt(e))
              .find((e) => e !== currentUser.data.data.id);

            return (
              otherUserId &&
              !friends.data.data.find((e) => e.id === otherUserId)
            );
          } else {
            return false;
          }
        })
        .map((c) => recentChatNotifications[c.id])
        .reduce((prev, curr) => prev + curr, 0);

      setMsgRequestNotificationCount(cnt);

      const globalCnt = chatRooms.data.data
        .map((c) => recentChatNotifications[c.id])
        .reduce((prev, curr) => prev + curr, 0);

      setGlobalNotificationCount(globalCnt);
    }
  }, [
    chatRooms.data?.data,
    currentUser.data?.data.id,
    friends.data?.data,
    recentChatNotifications,
  ]);

  const [shouldShowMessageRequestMenu, setShouldShowMessageRequestMenu] =
    useState(true);

  //title setter
  useEffect(() => {
    let currentChatRoom = undefined;

    const id = pathname.substring(pathname.lastIndexOf("/") + 1);

    if (id !== "-1" && pathname.startsWith("/dashboard/chatroom")) {
      currentChatRoom = chatRooms.data?.data.find(
        (e) => e.id.toString() === id
      );
    }

    //global notification count only accounts for non-spam messages

    const notificationPrefix =
      globalNotificationCount > 0 ? "(" + globalNotificationCount + ") " : "";

    if (currentChatRoom && currentUser.data?.data.id) {
      document.title =
        notificationPrefix +
        "Accord | " +
        GenericUtil.computeChatRoomName(currentChatRoom, currentUser.data.data);
    } else if (pathname === "/dashboard/chatroom/-1") {
      document.title = notificationPrefix + "Accord | Spams";
    } else {
      document.title = notificationPrefix + "Accord | Dashboard";
    }

    const renderBadge = localStorage.getItem("unreadBadge") ?? "yes";

    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const appIcon = localStorage.getItem("appIcon") ?? "Default";
    const appTheme = localStorage.getItem("appTheme") ?? "Dark";

    if (!favicon || !context) return;

    if (renderBadge === "no") {
      favicon.href =
        Constants.SERVER_STATIC_CONTENT_PATH +
        "accord_logo_" +
        appIcon +
        (appTheme === "Light" ? "_Light" : "") +
        ".png";
    } else {
      canvas.width = 64;
      canvas.height = 64;

      const img = new Image();
      img.crossOrigin = "anonymous";

      img.src =
        Constants.SERVER_STATIC_CONTENT_PATH +
        "accord_logo_" +
        appIcon +
        (appTheme === "Light" ? "_Light" : "") +
        ".png";

      img.onload = () => {
        if (renderBadge === "no") {
          return;
        }
        // draw original favicon
        context.drawImage(img, 0, 0, 64, 64);

        if (globalNotificationCount > 0) {
          // draw badge (red circle)
          context.fillStyle = "#FF0000";
          context.beginPath();
          context.arc(48, 16, 16, 0, 2 * Math.PI);
          context.fill();

          // draw unread count
          context.fillStyle = "#FFFFFF";
          context.font = "bold 20px sans-serif";
          context.textAlign = "center";
          context.fillText(
            globalNotificationCount > 99
              ? "99+"
              : globalNotificationCount.toString(),
            48,
            22
          );
        }

        // Set new favicon
        favicon.href = canvas.toDataURL("image/png");
      };
    }
  }, [
    globalNotificationCount,
    currentUser.data?.data.id,
    chatRooms.data?.data,
    pathname,
    rerenderTitleFlag,
  ]);

  return (
    <CallContext.Provider
      value={{
        currentCallingChatRoom,
        setCurrentCallingChatroom,
        peerConnection,
        callWorkPending,
        subscriptionConnection,
        handlePrepareStartOrJoinCall,
        localIceCandidates,
        handleCloseStream,
        handleSubscribeStream,
        callErrorText,
        setCallErrorText,
        callDecorator,
        setCallDecorator,
        localStream: localStreamRef,
        devices,
        selectedDevice,
        setSelectedDevice,
        handleChangeDevice,
        videoStreams,
        handleEnableVideo,
        handleEndCall,
        incomingCallChatRoom,
        setIncomingCallChatRoom,
        handleRejectIncomingCall,
        callOverlayRemoteController,
        setCallOverlayRemoteController,
        callAlertOverlayRemoteController,
        setCallAlertOverlayRemoteController,
        handleEnableScreenShare,
        handleSetAudioStreamVolume,
        handleSetEnableAudioStream,
        disabledAudioStreams,
        handleSetEnableVideoStream,
        disabledVideoStreams,
        handleToggleMute,
        handleToggleDeafen,
        handleStopMusic,
        synchronizeMusicEventQueue,
        setSelectedCallBackground,
        selectedCallBackground,
        handlePreviewVideo,
      }}
    >
      <ChatNotificationContext.Provider
        value={{
          count: notificationCount,
          setCount: setNotificationCount,
          msgRequestNotificationCount,
          setMsgRequestNotificationCount,
          setGlobalNotificationCount,
          recentChatNotifications,
          setRecentChatNotifications,
        }}
      >
        <ToastContext.Provider
          value={{
            open: toastOpen,
            setOpen: setToastOpen,
            message: toastMessage,
            setMessage: setToastMessage,
            type: toastType,
            setType: setToastType,
            showLoader: toastShowLoader,
            setShowLoader: setToastShowLoader,
          }}
        >
          <ContentDisplayContext.Provider
            value={{
              contentMode: contentDisplayMode,
              contentModeSetter: setContentDisplayMode,
              shouldBatchResetChatsQuery,
              setShouldBatchResetChatsQuery,
              contextMenus,
              setContextMenus,
              rootMusicPlayerOptions,
              setRootMusicPlayerOptions,
              rootMusicPlayerRef,
              getContentFilterFlags,
            }}
          >
            <ModalContext.Provider
              value={{
                open: openModal,
                setOpen: setOpenModal,
                modalType: modalType,
                setModalType: setModalType,
                genericHeader: genericHeader,
                genericContent: genericContent,
                customContent: customContent,
                setCustomContent: setCustomContent,
                setGenericHeader: setGenericHeader,
                setGenericContent: setGenericContent,
                setOnAccept: setOnAccept,
                setOnReject: setOnReject,
                onAccept: onAccept,
                onReject: onReject,
                customHeader: customHeader,
                customButtonSet: customButtonSet,
                setCustomHeader: setCustomHeader,
                setCustomButtonSet: setCustomButtonSet,
                clickOutsideToClose: clickOutsideToClose,
                setClickOutsideToClose: setClickOutsideToClose,
                setShouldExitAnimation: setModalShouldExitAnimation,
                shouldExitAnimation: modalShouldExitAnimation,
                openSettingsPage,
                setOpenSettingsPage,
                settingsPageDefaultTab,
                setSettingsPageDefaultTab,
              }}
            >
              <AuthenticationContext.Provider
                value={{
                  currentUser: currentUser.data?.data,
                }}
              >
                <FriendsPageTabContext.Provider
                  value={{
                    tab: friendsPageTab,
                    setTab: setFriendsPageTab,
                  }}
                >
                  <StompContext.Provider
                    value={{
                      stompClient: stompClient,
                      stompFrame: stompFrame,
                    }}
                  >
                    {toastOpen ? (
                      <PrimaryToast type={toastType} message={toastMessage} />
                    ) : (
                      <></>
                    )}

                    {globalWarningIndicator.message.length ? (
                      <div className="flex w-full md:w-fit justify-center items-center gap-2 fixed left-1/2 -translate-x-[50%] z-[70] bg-opacity-50 text-white p-2 rounded-s-md rounded-e-md rounded-b-md bg-orange-500">
                        <IoMdWarning />
                        {globalWarningIndicator.message}
                        <PrimaryButton
                          customWidth="w-fit px-2"
                          customStyles="mt-0 bg-orange-600 opacity-70"
                          onclick={() => {
                            globalWarningIndicator.onClick();
                            setGlobalWarningIndicator({
                              message: "",
                              onClick: () => {},
                            });
                          }}
                        >
                          Reload
                        </PrimaryButton>
                      </div>
                    ) : (
                      <></>
                    )}

                    {isLoadingLong ? <LoadingToast /> : <></>}

                    {isConnected ? <></> : <LoadingScreen />}

                    {openSettingsPage && (
                      <SettingsPage
                        setOpen={setOpenSettingsPage}
                        defaultTab={settingsPageDefaultTab}
                      />
                    )}
                    <PrimaryModal />

                    {contextMenus.map((contextMenu) => {
                      return contextMenu[1];
                    })}

                    {currentUser.data ? (
                      <CallAlertOverlay
                        setIncomingCallChatRoom={setIncomingCallChatRoom}
                        chatRoom={incomingCallChatRoom}
                        currentUser={currentUser.data.data}
                        callAlertOverlayRemoteController={
                          callAlertOverlayRemoteController
                        }
                      />
                    ) : (
                      <></>
                    )}

                    {/* this is where the audio streams from other users are contained */}
                    <div id="activeAudioChannel" className="hidden"></div>

                    {rootMusicPlayerOptions && (
                      <AudioPreview
                        src={rootMusicPlayerOptions.src}
                        autoPlay={rootMusicPlayerOptions.autoPlay}
                        uuid={"rootMusicPlayer"}
                        customTextColor={rootMusicPlayerOptions.customTextColor}
                        allLoop={rootMusicPlayerOptions.allLoop}
                        loop={rootMusicPlayerOptions.loop}
                        srcList={rootMusicPlayerOptions.srcList}
                        targetRenderElement={
                          rootMusicPlayerOptions.targetElement ?? undefined
                        }
                        customOnPlayPauseHandler={async (
                          paused,
                          currentTime
                        ) => {
                          if (paused) {
                            synchronizeMusicEventQueue.current.push({
                              type: "PAUSE",
                              time: Math.round(currentTime * 1000),
                              timestamp: Date.now(),
                              src: rootMusicPlayerOptions.src,
                            });
                          } else {
                            synchronizeMusicEventQueue.current.push({
                              type: "PLAY",
                              time: Math.round(currentTime * 1000),
                              timestamp: Date.now(),
                              src: rootMusicPlayerOptions.src,
                            });
                          }
                        }}
                        customOnSeekHandler={async (currentTime) => {
                          if (rootMusicPlayerRef.current)
                            synchronizeMusicEventQueue.current.push({
                              type: rootMusicPlayerRef.current.paused
                                ? "PAUSE"
                                : "PLAY",
                              time: Math.round(currentTime * 1000),
                              timestamp: Date.now(),
                              src: rootMusicPlayerOptions.src,
                            });
                        }}
                        setAudioRemoteController={
                          setRootMusicPlayerRemoteController
                        }
                        hideWhenNoTargetElement
                      />
                    )}

                    <div className="w-full h-full">
                      <div
                        className={`grid grid-cols-[1fr,200fr] lg:grid-cols-[1fr,8fr,200fr] grid-rows-1 h-full w-full`}
                      >
                        <Sidebar />

                        <SubSidebar>
                          <div className="flex justify-center mt-2">
                            <input
                              onClick={() => {
                                ModalUtils.openCustomModal(
                                  {
                                    setGenericContent,
                                    setGenericHeader,
                                    setModalType,
                                    setClickOutsideToClose,
                                    setCustomButtonSet,
                                    setCustomContent,
                                    setCustomHeader,
                                    setOnAccept,
                                    setOnReject,
                                    setOpen: setOpenModal,
                                    open: openModal,
                                    setShouldExitAnimation:
                                      setModalShouldExitAnimation,
                                  },
                                  <ConversationSearchUI />,
                                  true
                                );
                              }}
                              className="bg-lime-500 p-3 focus:outline-none rounded-md h-[2rem] cursor-pointer placeholder:text-lime-400"
                              placeholder={"Find or start conversation"}
                              readOnly
                            />
                          </div>

                          <div className="flex flex-col h-[5rem] overflow-y-scroll mdh:h-auto mdh:overflow-y-hidden">
                            <Link
                              href="/dashboard"
                              className={`${
                                pathname === "/dashboard"
                                  ? "bg-lime-700 text-lime-300"
                                  : "text-lime-500"
                              } hover:bg-lime-700 flex items-center hover:text-lime-300 p-2 md:p-4 m-2 rounded-md cursor-pointer gap-3 justify-start transition`}
                            >
                              <FaUserFriends size={36} />
                              <p className="ml-1">Friends</p>
                            </Link>

                            <div
                              key={
                                "messageRequests_" +
                                shouldRerenderDirectMessageBar
                              }
                              onClick={() => {
                                setShowMessageRequests((prev) => !prev);
                              }}
                              className={`
                              ${!shouldShowMessageRequestMenu && "hidden"}
                              ${
                                showMessageRequests
                                  ? "bg-lime-700 text-lime-300"
                                  : "text-lime-500"
                              } hover:bg-lime-700 flex items-center hover:text-lime-300 p-2 md:p-4 m-2 rounded-md cursor-pointer gap-3 justify-start transition`}
                            >
                              <FaMessage size={24} />
                              <p className="ml-1">Message Requests</p>

                              <div
                                className={` ${
                                  msgRequestNotificationCount <= 0 && "hidden"
                                } text-white bg-red-500 ml-2 shadow-md text-sm rounded-full w-2 h-2 flex items-center justify-center p-3`}
                              >
                                <p>{msgRequestNotificationCount}</p>
                              </div>
                            </div>

                            {spamRoom.data?.data ? (
                              <div className="md:m-2">
                                <DirectMessageBar
                                  key={"" + shouldRerenderDirectMessageBar}
                                  chatroom={spamRoom.data?.data}
                                  isSpamRoom
                                />
                              </div>
                            ) : (
                              <></>
                            )}
                          </div>

                          <div className="flex flex-col">
                            <div
                              className="px-3 mt-2 flex z-[30] items-center text-lime-400 hover:text-lime-200 cursor-default transition"
                              ref={selectFriendsInterfaceRef}
                            >
                              {showMessageRequests
                                ? "MESSAGE REQUESTS"
                                : "ACTIVE MESSAGES"}

                              <Popover
                                containerStyle={{
                                  zIndex: "75",
                                }}
                                isOpen={showSelectFriendsInterface}
                                positions={["bottom", "left", "top", "right"]}
                                content={
                                  <SelectFriendsInterface
                                    setShowInterface={
                                      setShowSelectFriendsInterface
                                    }
                                  />
                                }
                              >
                                <div className="ml-auto relative">
                                  <FloatingButton
                                    description="New Chat"
                                    customPosition="bottom-[2rem] left-[-1.6rem]"
                                    onClick={() => {
                                      if (!showSelectFriendsInterface)
                                        setShowSelectFriendsInterface(true);
                                    }}
                                  >
                                    <FaPlus size={12} />
                                  </FloatingButton>
                                </div>
                              </Popover>
                            </div>
                            <div className="text-lime-400 border-lime-400 bg-lime-400 h-[0.1rem] w-full" />

                            <div
                              ref={chatRoomsDivRef}
                              className={`flex ${
                                showMessageRequests
                                  ? "animate-fadeInDown"
                                  : "animate-fadeInUp"
                              } flex-col gap-2 overflow-y-scroll h-full`}
                              style={{
                                height: chatRoomsDivHeight,
                              }}
                              key={"messages_" + shouldRerenderDirectMessageBar}
                            >
                              <div
                                className={
                                  showMessageRequests ? "block" : "hidden"
                                }
                              >
                                {chatRooms.data?.data &&
                                  chatRooms.data.data["map"] &&
                                  chatRooms.data.data
                                    .filter((chatroom) => {
                                      const msgRequestPreference =
                                        localStorage.getItem(
                                          "messageRequests"
                                        ) ?? "true";
                                      if (msgRequestPreference === "true") {
                                        //only show dms from non-friends
                                        if (
                                          !chatroom.direct1to1Identifier?.length
                                        ) {
                                          return false;
                                        } else {
                                          const otherUserId =
                                            chatroom.direct1to1Identifier
                                              .split("@")
                                              .map((e) => parseInt(e))
                                              .find(
                                                (e) =>
                                                  e !==
                                                  currentUser.data?.data.id
                                              );
                                          if (
                                            friends.data?.data &&
                                            friends.data.data.find(
                                              (e) => e.id === otherUserId
                                            )
                                          ) {
                                            //other user is a friend
                                            return false;
                                          } else {
                                            //other user is not a friend
                                            return true;
                                          }
                                        }
                                      } else {
                                        return false;
                                      }
                                    })
                                    .map((chatroom) => {
                                      return (
                                        <div key={chatroom.id} className="">
                                          <DirectMessageBar
                                            chatroom={chatroom}
                                            isMessageRequest
                                          />
                                        </div>
                                      );
                                    })}
                              </div>

                              <div
                                className={
                                  !showMessageRequests ? "block" : "hidden"
                                }
                              >
                                {chatRooms.data?.data &&
                                  chatRooms.data.data["map"] &&
                                  chatRooms.data.data
                                    .filter((chatroom) => {
                                      const msgRequestPreference =
                                        localStorage.getItem(
                                          "messageRequests"
                                        ) ?? "true";
                                      if (msgRequestPreference === "true") {
                                        //only show dms from non-friends
                                        if (
                                          !chatroom.direct1to1Identifier?.length
                                        ) {
                                          return true;
                                        } else {
                                          const otherUserId =
                                            chatroom.direct1to1Identifier
                                              .split("@")
                                              .map((e) => parseInt(e))
                                              .find(
                                                (e) =>
                                                  e !==
                                                  currentUser.data?.data.id
                                              );
                                          if (
                                            friends.data?.data &&
                                            friends.data.data.find(
                                              (e) => e.id === otherUserId
                                            )
                                          ) {
                                            //other user is a friend
                                            return true;
                                          } else {
                                            //other user is not a friend
                                            return false;
                                          }
                                        }
                                      } else {
                                        return true;
                                      }
                                    })
                                    .map((chatroom) => {
                                      return (
                                        <div key={chatroom.id} className="">
                                          <DirectMessageBar
                                            chatroom={chatroom}
                                          />
                                        </div>
                                      );
                                    })}
                              </div>
                            </div>
                          </div>

                          <div
                            ref={userBarRef}
                            className="fixed bottom-0 bg-gradient-to-bl from-lime-600 to-lime-700 dark:from-lime-300 dark:to-lime-200"
                          >
                            {currentUser.data?.data && (
                              <Userbar user={currentUser.data.data} />
                            )}
                          </div>
                        </SubSidebar>
                        <div className="flex flex-col">{children}</div>
                      </div>
                    </div>
                  </StompContext.Provider>
                </FriendsPageTabContext.Provider>
              </AuthenticationContext.Provider>
            </ModalContext.Provider>
          </ContentDisplayContext.Provider>
        </ToastContext.Provider>
      </ChatNotificationContext.Provider>
    </CallContext.Provider>
  );
}
