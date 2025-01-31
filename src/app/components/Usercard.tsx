import {
  InfiniteData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { AxiosResponse } from "axios";
import { useRouter } from "next/navigation";
import {
  MouseEventHandler,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  BsCameraVideoFill,
  BsCameraVideoOffFill,
  BsDisplay,
  BsDisplayFill,
  BsFillMicFill,
  BsFillMicMuteFill,
  BsFillMoonFill,
  BsVolumeMuteFill,
  BsVolumeUpFill,
} from "react-icons/bs";
import { CgBlock, CgUnblock } from "react-icons/cg";
import { FaCircle, FaEdit } from "react-icons/fa";
import {
  IoChatbox,
  IoExit,
  IoInformationCircle,
  IoPersonAdd,
  IoPersonRemove,
} from "react-icons/io5";
import { MdBlock, MdOutlineKeyboardArrowRight } from "react-icons/md";
import { Popover } from "react-tiny-popover";
import api from "../api/api";
import ModalContext from "../contexts/ModalContext";
import { ChatRoom } from "../types/ChatRoom";
import { User } from "../types/User";
import ModalUtils from "../util/ModalUtil";
import MenuBox from "./MenuBox";
import ProfileAvatar from "./ProfileAvatar";
import React from "react";
import AuthenticationContext from "../contexts/AuthenticationContext";
import { ChatRecordType } from "../types/ChatRecordType";
import Constants from "../constants/Constants";
import ContentDisplayContext from "../contexts/ContentDisplayContext";
import CallContext from "../contexts/CallContext";
import DraggableProgressbar from "./DraggableProgressbar";
import { FaDisplay } from "react-icons/fa6";
import UserDetailsCard from "./UserDetailsCard";

type UsercardType = {
  user: User;
  showEditProfileButton?: boolean;
  showStatusController?: boolean;
  customMenuPosition?: string;
  profileImagePlaceholder?: FileList | string;
  showDirectMessagingButton?: boolean;
  showAddFriendButton?: boolean;
  showRemoveFriendButton?: boolean;
  showBlockUserButton?: boolean;
  showUnblockUserButton?: boolean;
  showKickUserFromCallButton?: boolean;
  handleKickFromCall?: (user: User) => void;
  chatRoomId?: string;
  customBackgroundStyle?: string;
  showCallControls?: boolean;
};
export default function Usercard({
  user,
  chatRoomId,
  showUnblockUserButton,
  showBlockUserButton,
  showStatusController,
  showDirectMessagingButton,
  showRemoveFriendButton,
  showAddFriendButton,
  showKickUserFromCallButton,
  handleKickFromCall,
  profileImagePlaceholder = "default",
  showEditProfileButton,
  customBackgroundStyle = "bg-lime-400",
  showCallControls,
}: UsercardType) {
  const callContext = useContext(CallContext);
  const allFriends = useQuery({
    queryKey: ["friends"],
    queryFn: async () => {
      const response = await api.get<User[]>("/users/friends");
      return {
        data: response.data,
      };
    },
    refetchOnMount: false,
  });

  const blockeds = useQuery({
    queryKey: ["blockeds"],
    queryFn: async () => {
      const response = await api.get<User[]>("/users/blockeds");
      return {
        data: response.data,
      };
    },
    refetchOnMount: false,
  });

  const authenticationContext = useContext(AuthenticationContext);
  const contentDisplayContext = useContext(ContentDisplayContext);
  const currentUser = authenticationContext?.currentUser;

  const isFriend = useMemo(() => {
    return allFriends.data?.data.find(
      (friend) => friend.id === (user.id ?? -1)
    );
  }, [allFriends, user]);

  const isBlocked = useMemo(() => {
    return blockeds.data?.data.find((blocked) => blocked.id === user.id);
  }, [blockeds, user]);

  const shouldShowKickUserFromCallButton = useMemo(() => {
    if (showKickUserFromCallButton !== undefined) {
      return showKickUserFromCallButton;
    }
  }, [showKickUserFromCallButton]);

  const shouldShowEditProfileButton = useMemo(() => {
    if (showEditProfileButton !== undefined) {
      return showEditProfileButton;
    }
    return currentUser?.id === user.id;
  }, [showEditProfileButton, currentUser, user]);

  const shouldShowStatusController = useMemo(() => {
    if (showStatusController !== undefined) {
      return showStatusController;
    }
    return currentUser?.id === user.id;
  }, [currentUser, showStatusController, user]);

  const shouldShowAddFriendButton = useMemo(() => {
    if (showAddFriendButton !== undefined) {
      return showAddFriendButton;
    }
    return currentUser?.id !== user.id && isFriend === undefined;
  }, [currentUser, user, showAddFriendButton, isFriend]);

  const shouldShowRemoveFriendButton = useMemo(() => {
    if (showRemoveFriendButton !== undefined) {
      return showRemoveFriendButton;
    }
    return currentUser?.id !== user.id && isFriend !== undefined;
  }, [currentUser, user, showRemoveFriendButton, isFriend]);

  const shouldShowDirectMessagingButton = useMemo(() => {
    if (showDirectMessagingButton !== undefined) {
      return showDirectMessagingButton;
    }
    return currentUser?.id !== user.id;
  }, [currentUser, showDirectMessagingButton, user, isFriend]);

  const shouldShowBlockUserButton = useMemo(() => {
    if (showBlockUserButton !== undefined) {
      return showBlockUserButton;
    }
    return currentUser?.id !== user.id && isBlocked === undefined;
  }, [currentUser, user, showBlockUserButton, isBlocked]);

  const shouldShowUnblockUserButton = useMemo(() => {
    if (showUnblockUserButton !== undefined) {
      return showUnblockUserButton;
    }
    return currentUser?.id !== user.id && isBlocked !== undefined;
  }, [currentUser, user, showUnblockUserButton, isBlocked]);

  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [statusBarHovering, setStatusBarHovering] = useState(false);

  const statusHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const modalContext = useContext(ModalContext);
  const queryClient = useQueryClient();
  const router = useRouter();

  const handleEditProfile = useCallback(() => {
    ModalUtils.openSettingsPage(modalContext, "Profiles");
  }, [modalContext]);

  const statuses = useMemo((): { [key: string]: React.ReactNode } => {
    return {
      ONLINE: (
        <div className="flex items-center gap-2">
          {" "}
          <div className="text-lime-500">
            <FaCircle />
          </div>{" "}
          Online
        </div>
      ),
      IDLE: (
        <div className="flex items-center gap-2">
          {" "}
          <div className="text-yellow-500">
            <BsFillMoonFill />
          </div>{" "}
          Idle
        </div>
      ),
      DO_NOT_DISTURB: (
        <div className="flex items-center gap-2">
          {" "}
          <div className="text-red-500">
            <CgBlock />
          </div>{" "}
          Do Not Disturb
        </div>
      ),
      INVISIBLE: (
        <div className="flex items-center gap-2">
          {" "}
          <div className="text-gray-200">
            <FaCircle />
          </div>{" "}
          Invisible
        </div>
      ),
      NATURAL_IDLE: (
        <div className="flex items-center gap-2">
          {" "}
          <div className="text-yellow-500">
            <BsFillMoonFill />
          </div>{" "}
          Idle
        </div>
      ),
    };
  }, []);

  const menus = useMemo(() => {
    return [
      <div key={0} className="flex items-center gap-2">
        {" "}
        <div className="text-lime-500">
          <FaCircle />
        </div>{" "}
        Online{" "}
      </div>,
      <div key={1} className="flex items-center gap-2">
        {" "}
        <div className="text-yellow-500">
          <BsFillMoonFill />
        </div>{" "}
        Idle{" "}
      </div>,
      <div key={2} className="flex flex-col">
        <div className="flex items-center gap-2">
          <div className="text-red-500">
            <CgBlock />
          </div>{" "}
          Do Not Disturb
        </div>
        <div className="hidden md:flex items-center gap-2">
          <p className="text-xs ml-[1.375rem] text-lime-300">
            You will not receive any desktop notifications.
          </p>
        </div>
      </div>,

      <div key={3} className="flex flex-col">
        <div className="flex items-center gap-2">
          <div className="text-gray-200">
            <FaCircle />
          </div>{" "}
          Invisible
        </div>
        <div className="items-center gap-2 hidden md:flex">
          <p className="text-xs ml-[1.375rem] text-lime-300">
            You will not appear online to others.
          </p>
        </div>
      </div>,
    ];
  }, []);

  useEffect(() => {
    setTimeout(() => {
      setShowStatusMenu(statusBarHovering);
    }, 100);
  }, [statusBarHovering]);

  const handleError = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data: AxiosResponse<any, any> | undefined) => {
      if (data?.status === 400) {
        const response = data.data;
        ModalUtils.openGenericModal(
          modalContext,
          "Following error occurred:",
          response
        );
      } else if (data) {
        ModalUtils.handleGenericError(modalContext, data);
      }
    },
    []
  );

  const statusMutation = useMutation({
    mutationFn: (
      status: "ONLINE" | "IDLE" | "DO_NOT_DISTURB" | "INVISIBLE"
    ) => {
      return api.post("/users/status", status);
    },
    onSettled(data, _error, variables) {
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

  const handleEditStatus = useCallback(
    (status: "ONLINE" | "IDLE" | "DO_NOT_DISTURB" | "INVISIBLE") => {
      if (statusMutation.isPending) {
        return;
      }

      statusMutation.mutate(status);
    },
    [statusMutation]
  );

  const unfriendMutation = useMutation({
    mutationFn: (username: string) => {
      return api.delete(`/users/friends/${username}`, {
        validateStatus: (status) => status === 200,
      });
    },
    onSettled(data, _error, variables) {
      if (data?.status === 200) {
        queryClient.setQueryData(["friends"], (prev: { data: User[] }) => {
          return {
            data: prev.data.filter(
              (friend) => friend.username + "@" + friend.id !== variables
            ),
          };
        });

        if (chatRoomId) {
          contentDisplayContext?.setShouldBatchResetChatsQuery(
            (prev) => prev + 1
          );
        }
      } else {
        handleError(data);
      }
    },
  });

  const sendFriendRequestMutation = useMutation({
    mutationFn: (username: string) => {
      return api.post(`/users/friends/${username}`, undefined, {
        validateStatus: (status) => status === 200,
      });
    },

    onSettled(data, _error, variables) {
      // console.log("settledd", error, data)
      if (data?.status === 200) {
        ModalUtils.openGenericModal(
          modalContext,
          "FRIEND REQUEST SUCCESS",
          "Friend request sent to user " + variables
        );

        queryClient.setQueryData(
          ["friends", "pending", "outgoing"],
          (prev: { data: User[] }) => {
            return {
              data: [...prev.data, data.data],
            };
          }
        );
      } else if (data?.status === 400) {
        const response = data.data;

        if (response === "User not found") {
          ModalUtils.openGenericModal(
            modalContext,
            "FRIEND REQUEST ERROR",
            "User not found"
          );
        } else if (response === "Friend request already pending") {
          ModalUtils.openGenericModal(
            modalContext,
            "FRIEND REQUEST ERROR",
            "Friend request already pending"
          );
        } else {
          ModalUtils.openGenericModal(
            modalContext,
            "FRIEND REQUEST ERROR",
            data.data
          );
        }
      }
    },
  });

  const handleSendFriendRequest = useCallback(
    (username: string) => {
      if (sendFriendRequestMutation.isPending) return;

      const usernameRegex = new RegExp("^[\\p{L}\\p{N}_.#]+$", "u");

      if (!username) return;

      if (
        username.length > 100 ||
        !(username.includes("#") && usernameRegex.test(username))
      ) {
        ModalUtils.openGenericModal(
          modalContext,
          "FRIEND REQUEST ERROR",
          "Please enter a valid username - e.g. user#135"
        );
        return;
      }

      sendFriendRequestMutation.mutate(username.replace("#", "@"));
    },
    [sendFriendRequestMutation]
  );

  const handleUnfriend = useCallback(
    (username: string) => {
      if (unfriendMutation.isPending) return;

      unfriendMutation.mutate(username);
    },
    [unfriendMutation]
  );

  const create1to1ChatRoomMutation = useMutation({
    mutationFn: (username: string) => {
      return api.post("/chatrooms/directmessaging", {
        chatRoomName: "DMs",
        friendNames: [username],
        dm: true,
      });
    },
    onSettled(data) {
      if (data?.status === 201) {
        localStorage.removeItem(`chatroom_hide_${data?.data.id}`);
        queryClient.setQueryData(
          ["chatroom_dm"],
          (prev: { data: ChatRoom[] }) => {
            return {
              data: [...prev.data, data.data],
            };
          }
        );

        router.replace(`/dashboard/chatroom/${data?.data.id}`);
      } else {
        if (
          data?.data.startsWith("Direct chat already exists against this user")
        ) {
          const split = data.data.split(":");
          const id = split[1];

          localStorage.removeItem(`chatroom_hide_${id}`);

          router.replace(`/dashboard/chatroom/${id}`);
          return;
        }
        handleError(data);
      }
    },
  });

  const handleCreate1to1Chatroom = useCallback(
    (username: string) => {
      setTimeout(() => {
        if (!create1to1ChatRoomMutation.isPending) {
          create1to1ChatRoomMutation.mutate(username);
        }
      }, 50);
    },
    [create1to1ChatRoomMutation]
  );

  const blockMutation = useMutation({
    mutationFn: (username: string) => {
      return api.post(`/users/block/${username}`);
    },
    onSettled(data, _error, variables) {
      if (!data) return;

      if (data.status === 200) {
        const userId = variables.substring(variables.indexOf("@") + 1);
        if (!isNaN(Number(userId))) {
          callContext?.handleSetEnableAudioStream(Number(userId), false, false);
          callContext?.handleSetEnableAudioStream(Number(userId), false, true);
          callContext?.handleSetEnableVideoStream(Number(userId), false, false);
          callContext?.handleSetEnableVideoStream(Number(userId), false, true);
        }
        ModalUtils.openGenericModal(
          modalContext,
          "BLOCK USER",
          `User ${variables.replace("@", "#")} has been blocked.`
        );

        queryClient.setQueryData(["blockeds"], (prev: { data: User[] }) => {
          if (!prev) return undefined;
          return {
            data: [...prev.data, data.data],
          };
        });

        if (chatRoomId) {
          queryClient.setQueryData(
            ["chats", chatRoomId],
            (prev: InfiniteData<{ data: ChatRecordType[] }>) => {
              if (!prev) return undefined;

              const all: ChatRecordType[] = [];
              let deletionOcurred = false;
              for (const page of prev.pages) {
                for (const record_ of page.data) {
                  if (record_.sender) {
                    if (record_.sender.id !== data.data.id) {
                      all.push(record_);
                    } else {
                      deletionOcurred = true;
                    }
                  } else {
                    all.push(record_);
                  }
                }
              }

              if (!deletionOcurred) return prev;

              const newPages = [];
              //dummy empty page if it was start of the page
              if (prev.pages[0].data.length === 0 || prev.pageParams[0] === 0) {
                newPages.push({
                  data: [],
                });
              }
              let singlePage = [];
              for (let i = 0; i < all.length; i++) {
                singlePage.push(all[i]);
                if (singlePage.length >= Constants.CLIENT_PER_PAGE_COUNT) {
                  newPages.push({
                    data: singlePage,
                  });
                  singlePage = [];
                }
              }

              if (singlePage.length > 0) {
                newPages.push({
                  data: singlePage,
                });
              }

              return {
                pages: newPages,
                pageParams: prev.pageParams,
              };
            }
          );
        }
      } else {
        handleError(data);
      }
    },
  });

  const handleBlockUser = useCallback(
    (username: string) => {
      if (!blockMutation.isPending) {
        ModalUtils.openYesorNoModal(
          modalContext,
          "BLOCK USER",
          `Are you sure to block user ${username.replace(
            "@",
            "#"
          )}? You won't be able to chat nor call with each other,
          and during group calls you and the user will be mutually muted for both audio and video.`,
          () => {
            if (!blockMutation.isPending) blockMutation.mutate(username);
          }
        );
      }
    },
    [blockMutation]
  );

  const unblockMutation = useMutation({
    mutationFn: (username: string) => {
      return api.delete(`/users/block/${username}`, {
        validateStatus: (status) => status === 200,
      });
    },
    onSettled(data, _error, variables) {
      if (data?.status === 200) {
        ModalUtils.openGenericModal(
          modalContext,
          "UNBLOCK USER",
          `User ${variables.replace(
            "@",
            "#"
          )} has been unblocked. If you were in a call with this user, consider rejoining the call
          to hear the user again.`
        );
        queryClient.setQueryData(["blockeds"], (prev: { data: User[] }) => {
          if (!prev) return undefined;
          return {
            data: prev.data.filter(
              (blocked) => blocked.username + "@" + blocked.id !== variables
            ),
          };
        });
        if (chatRoomId) {
          contentDisplayContext?.setShouldBatchResetChatsQuery(
            (prev) => prev + 1
          );
        }

        const userId = variables.substring(variables.indexOf("@") + 1);
        if (!isNaN(Number(userId))) {
          callContext?.handleSetEnableAudioStream(Number(userId), true, false);
          callContext?.handleSetEnableAudioStream(Number(userId), true, true);
          callContext?.handleSetEnableVideoStream(Number(userId), true, false);
          callContext?.handleSetEnableVideoStream(Number(userId), true, true);
        }
      } else {
        handleError(data);
      }
    },
  });

  const handleUnblockUser = useCallback(
    (username: string) => {
      if (!unblockMutation.isPending) {
        ModalUtils.openYesorNoModal(
          modalContext,
          "UNBLOCK USER",
          `Are you sure to unblock user ${username.replace("@", "#")}?`,
          () => {
            if (!unblockMutation.isPending) unblockMutation.mutate(username);
          }
        );
      }
    },
    [unblockMutation]
  );

  const [voiceVolumeProgress, setVoiceVolumeProgress] = useState(100);
  const [systemVolumeProgress, setSystemVolumeProgress] = useState(100);

  useEffect(() => {
    if (showCallControls) {
      let presetVolume = window.localStorage.getItem(
        "accord_voiceVolume_" + user.id
      );
      if (presetVolume) {
        setVoiceVolumeProgress(Number.parseFloat(presetVolume) * 100);
      }
      presetVolume = window.localStorage.getItem(
        "accord_systemVolume_" + user.id
      );
      if (presetVolume) {
        setSystemVolumeProgress(Number.parseFloat(presetVolume) * 100);
      }
    }
  }, [showCallControls]);

  const handleVoiceVolumeDrag: MouseEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      if (e.pageX === 0) return;
      const volumeBar = document.getElementById("userCardVolumeBar_" + user.id);
      if (callContext && volumeBar) {
        const position =
          (e.pageX - volumeBar.getBoundingClientRect().x) /
          volumeBar.getBoundingClientRect().width;

        const progress = Math.max(0, Math.min(position, 1));

        if (callContext.handleSetAudioStreamVolume(user.id, progress, false)) {
          setVoiceVolumeProgress(progress * 100);
        }
      }
    },
    [callContext]
  );

  const handleSystemVolumeDrag: MouseEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      if (e.pageX === 0) return;
      const volumeBar = document.getElementById(
        "userCardSystemVolumeBar_" + user.id
      );
      if (callContext && volumeBar) {
        const position =
          (e.pageX - volumeBar.getBoundingClientRect().x) /
          volumeBar.getBoundingClientRect().width;

        const progress = Math.max(0, Math.min(position, 1));

        if (callContext.handleSetAudioStreamVolume(user.id, progress, true)) {
          setSystemVolumeProgress(progress * 100);
        }
      }
    },
    [callContext]
  );

  const handleShowUserDetailsModal = useCallback(() => {
    ModalUtils.openCustomModal(
      modalContext,
      <UserDetailsCard
        user={user}
        handleSendFriendRequest={handleSendFriendRequest}
        handleUnfriend={handleUnfriend}
        handleBlockUser={handleBlockUser}
        handleUnblockUser={handleUnblockUser}
        handleCreate1to1Chatroom={handleCreate1to1Chatroom}
      />,

      true
    );
  }, [
    user,
    handleSendFriendRequest,
    handleUnfriend,
    handleBlockUser,
    handleUnblockUser,
    handleCreate1to1Chatroom,
  ]);

  return (
    <div
      className={`flex flex-col bottom-[4rem] w-[15rem] ${customBackgroundStyle} p-2 rounded-md text-white withinsubsidebar`}
    >
      <ProfileAvatar
        profileImagePlaceholder={profileImagePlaceholder}
        user={user}
        showStatus={true}
      />

      <p
        style={{
          overflowWrap: "anywhere",
        }}
      >
        {user.nickname.length > 0 ? user.nickname : user.username}
      </p>
      <p className="text-xs text-lime-700">{user.username + "#" + user.id}</p>
      <p className="text-xs text-lime-600 break-words">{user.statusMessage}</p>

      <div className="bg-lime-600 flex flex-col rounded-md m-2 p-2 max-h-[8rem] overflow-y-scroll scrollbar-always-visible">
        <div
          className="flex items-center gap-2 transition cursor-pointer hover:bg-lime-500 p-1 rounded-md"
          onClick={() => {
            handleShowUserDetailsModal();
          }}
        >
          <IoInformationCircle size={24} /> View Details
        </div>

        {shouldShowKickUserFromCallButton && handleKickFromCall && (
          <div
            className="flex items-center gap-2 transition cursor-pointer text-red-500 hover:bg-lime-500 p-1 rounded-md"
            onClick={() => {
              handleKickFromCall(user);
            }}
          >
            <IoExit size={24} /> Kick From Call
          </div>
        )}

        {showCallControls && (
          <>
            <div
              className="flex flex-col items-start justify-center gap-2 transition cursor-pointer text-white p-1 rounded-md"
              onClick={() => {}}
            >
              <div className="flex gap-1 justify-center items-center">
                <BsFillMicFill />
                <p>User Volume</p>
              </div>
              <DraggableProgressbar
                id={"userCardVolumeBar_" + user.id}
                progress={voiceVolumeProgress}
                height={"0.45rem"}
                dragPointSize={"0.75rem"}
                dragPointHalfSize={"0.375rem"}
                onMouseDown={handleVoiceVolumeDrag}
                onDrag={handleVoiceVolumeDrag}
                onDragEnd={handleVoiceVolumeDrag}
              />
            </div>

            <div
              className={`
                ${
                  callContext?.disabledAudioStreams.has("voice@" + user.id)
                    ? "text-lime-400"
                    : "text-red-500"
                }
                flex items-center gap-2 transition cursor-pointer hover:bg-lime-500 p-1 rounded-md`}
              onClick={() => {
                if (callContext) {
                  callContext.handleSetEnableAudioStream(
                    user.id,
                    callContext.disabledAudioStreams.has("voice@" + user.id),
                    false
                  );
                }
              }}
            >
              {callContext?.disabledAudioStreams.has("voice@" + user.id) ??
              false ? (
                <BsFillMicFill size={24} />
              ) : (
                <BsFillMicMuteFill size={24} />
              )}
              {callContext?.disabledAudioStreams.has("voice@" + user.id) ??
              false
                ? "Unmute User"
                : "Mute User"}
            </div>
          </>
        )}

        {showCallControls && (
          <>
            <div
              className="flex flex-col items-start justify-center gap-2 transition cursor-pointer text-white p-1 rounded-md"
              onClick={() => {}}
            >
              <div className="flex gap-1 justify-center items-center">
                <FaDisplay />
                <p>Stream Volume</p>
              </div>
              <DraggableProgressbar
                id={"userCardSystemVolumeBar_" + user.id}
                progress={systemVolumeProgress}
                height={"0.45rem"}
                dragPointSize={"0.75rem"}
                dragPointHalfSize={"0.375rem"}
                onMouseDown={handleSystemVolumeDrag}
                onDrag={handleSystemVolumeDrag}
                onDragEnd={handleSystemVolumeDrag}
              />
            </div>

            <div
              className={`
                 ${
                   callContext?.disabledAudioStreams.has("system@" + user.id)
                     ? "text-lime-400"
                     : "text-red-500"
                 }
                flex items-center gap-2 transition cursor-pointer hover:bg-lime-500 p-1 rounded-md`}
              onClick={() => {
                if (callContext) {
                  callContext.handleSetEnableAudioStream(
                    user.id,
                    callContext.disabledAudioStreams.has("system@" + user.id),
                    true
                  );
                }
              }}
            >
              {callContext?.disabledAudioStreams.has("system@" + user.id) ??
              false ? (
                <BsVolumeUpFill size={24} />
              ) : (
                <BsVolumeMuteFill size={24} />
              )}
              {callContext?.disabledAudioStreams.has("system@" + user.id) ??
              false
                ? "Unmute Stream"
                : "Mute Stream"}
            </div>

            <div
              className={`
                 ${
                   callContext?.disabledVideoStreams.has("screen@" + user.id)
                     ? "text-lime-400"
                     : "text-red-500"
                 }
                flex items-center gap-2 transition cursor-pointer hover:bg-lime-500 p-1 rounded-md`}
              onClick={() => {
                if (callContext) {
                  callContext.handleSetEnableVideoStream(
                    user.id,
                    callContext.disabledVideoStreams.has("screen@" + user.id),
                    true
                  );
                }
              }}
            >
              {callContext?.disabledVideoStreams.has("screen@" + user.id) ??
              false ? (
                <BsDisplayFill size={24} />
              ) : (
                <BsDisplay size={24} />
              )}
              {callContext?.disabledVideoStreams.has("screen@" + user.id) ??
              false
                ? "Enable Stream"
                : "Disable Stream"}
            </div>
          </>
        )}

        {showCallControls && (
          <div
            className={`
                 ${
                   callContext?.disabledVideoStreams.has("camera@" + user.id)
                     ? "text-lime-400"
                     : "text-red-500"
                 }
                flex items-center gap-2 transition cursor-pointer hover:bg-lime-500 p-1 rounded-md`}
            onClick={() => {
              if (callContext) {
                callContext.handleSetEnableVideoStream(
                  user.id,
                  callContext.disabledVideoStreams.has("camera@" + user.id),
                  false
                );
              }
            }}
          >
            {callContext?.disabledVideoStreams.has("camera@" + user.id) ??
            false ? (
              <BsCameraVideoFill size={24} />
            ) : (
              <BsCameraVideoOffFill size={24} />
            )}
            {callContext?.disabledVideoStreams.has("camera@" + user.id) ?? false
              ? "Enable Video"
              : "Disable Video"}
          </div>
        )}
        {shouldShowEditProfileButton && (
          <div
            className="flex items-center gap-2 transition cursor-pointer hover:bg-lime-500 p-1 rounded-md"
            onClick={handleEditProfile}
          >
            <FaEdit size={24} /> Edit Profile
          </div>
        )}

        {shouldShowStatusController && (
          <Popover
            containerStyle={{
              zIndex: "90",
            }}
            isOpen={statusBarHovering}
            content={
              <div
                onMouseEnter={() => {
                  if (statusHoverTimeoutRef.current)
                    clearTimeout(statusHoverTimeoutRef.current);
                  setStatusBarHovering(true);
                }}
                onMouseLeave={() =>
                  (statusHoverTimeoutRef.current = setTimeout(
                    () => setStatusBarHovering(false),
                    100
                  ))
                }
                className="withinsubsidebar"
              >
                <MenuBox
                  menus={menus}
                  onClicks={[
                    () => handleEditStatus("ONLINE"),
                    () => handleEditStatus("IDLE"),
                    () => handleEditStatus("DO_NOT_DISTURB"),
                    () => handleEditStatus("INVISIBLE"),
                  ]}
                />
              </div>
            }
            positions={["right", "bottom"]}
          >
            <div
              className={`relative flex items-center gap-3 mt-2 transition cursor-pointer p-1 rounded-md ${
                showStatusMenu && "bg-lime-500"
              }`}
              onMouseEnter={() => {
                if (statusHoverTimeoutRef.current)
                  clearTimeout(statusHoverTimeoutRef.current);
                setStatusBarHovering(true);
              }}
              onMouseLeave={() =>
                (statusHoverTimeoutRef.current = setTimeout(
                  () => setStatusBarHovering(false),
                  100
                ))
              }
            >
              {statuses[user.status] || statuses["Online"]}
              <div className="text-lime-400">
                <MdOutlineKeyboardArrowRight size={24} />
              </div>{" "}
            </div>
          </Popover>
        )}

        {shouldShowDirectMessagingButton && (
          <div
            onClick={() =>
              handleCreate1to1Chatroom(user.username + "@" + user.id)
            }
            className="flex items-center gap-2 p-2 cursor-pointer transition hover:bg-lime-700 rounded-md
                    hover:text-lime-400"
          >
            <IoChatbox />
            <p>Chat</p>
          </div>
        )}

        {shouldShowAddFriendButton && (
          <div
            onClick={() => {
              handleSendFriendRequest(user.username + "#" + user.id);
            }}
            className="flex items-center gap-2 p-2 cursor-pointer transition hover:bg-lime-700 rounded-md
                    hover:text-lime-400"
          >
            <IoPersonAdd />
            <p>Add Friend</p>
          </div>
        )}

        {shouldShowRemoveFriendButton && (
          <div
            onClick={() => handleUnfriend(user.username + "@" + user.id)}
            className="flex items-center gap-2 p-2 cursor-pointer transition hover:bg-lime-700 rounded-md
                    hover:text-lime-400"
          >
            <IoPersonRemove />
            <p>Remove Friend</p>
          </div>
        )}

        {shouldShowBlockUserButton && (
          <div
            onClick={() => handleBlockUser(user.username + "@" + user.id)}
            className="flex items-center gap-2 p-2 cursor-pointer transition hover:bg-lime-700 rounded-md
                    hover:text-lime-400"
          >
            <MdBlock />
            <p>Block User</p>
          </div>
        )}

        {shouldShowUnblockUserButton && (
          <div
            onClick={() => handleUnblockUser(user.username + "@" + user.id)}
            className="flex items-center gap-2 p-2 cursor-pointer transition hover:bg-lime-700 rounded-md
                    hover:text-lime-400"
          >
            <CgUnblock />
            <p>Unblock User</p>
          </div>
        )}
      </div>
    </div>
  );
}
