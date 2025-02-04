"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosResponse } from "axios";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useContext,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AiOutlineUserDelete } from "react-icons/ai";
import { BsThreeDotsVertical } from "react-icons/bs";
import { CgBlock, CgUnblock } from "react-icons/cg";
import { FaCheck, FaSearch, FaUserFriends } from "react-icons/fa";
import { FaFeatherPointed } from "react-icons/fa6";
import { IoIosSend, IoMdVideocam } from "react-icons/io";
import { IoCall, IoChatboxSharp } from "react-icons/io5";
import { MdError } from "react-icons/md";
import { VscRemove } from "react-icons/vsc";
import { useWindowSize } from "usehooks-ts";
import api from "../api/api";
import FloatingButton from "../components/FloatingButton";
import Header from "../components/Header";
import MenuBox from "../components/MenuBox";
import PrimaryButton from "../components/PrimaryButton";
import PrimaryInput from "../components/PrimaryInput";
import ProfileBar from "../components/ProfileBar";
import FriendsPageTabContext from "../contexts/FriendsPageTabContext";
import ModalContext from "../contexts/ModalContext";
import StompContext from "../contexts/StompContext";
import useSocket from "../hooks/useSocket";
import { ChatRoom } from "../types/ChatRoom";
import { User } from "../types/User";
import ModalUtils from "../util/ModalUtil";
import React from "react";

import CallContext from "../contexts/CallContext";

export default function FriendsPage() {
  const [friendRequestError, setFriendRequestError] = useState("");
  const [friendRequestSuccess, setFriendRequestSuccess] = useState("");
  const [divHeight, setDivHeight] = useState(0);
  const tabContext = useContext(FriendsPageTabContext);
  const tab = tabContext?.tab;
  const setTab = tabContext?.setTab;

  const callContext = useContext(CallContext);
  const [offsetTop, setOffsetTop] = useState(0);

  const [searchValue, setSearchValue] = useState("");
  const deferredSearchValue = useDeferredValue(searchValue);

  const windowSize = useWindowSize();
  const profileListDivRef = useRef<HTMLDivElement>(null);
  const modalContext = useContext(ModalContext);

  const stompContext = useContext(StompContext);

  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    if (profileListDivRef.current !== null)
      setOffsetTop(profileListDivRef.current.offsetTop);
  }, [tab]);

  useEffect(() => {
    if (tab === "Online" && setTab && windowSize.width < 640) {
      setTab("All");
    }
  }, [windowSize, tab, setTab]);

  useLayoutEffect(() => {
    setDivHeight(windowSize.height - offsetTop);
  }, [windowSize, offsetTop]);

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

  const outGoingPendingFriends = useQuery({
    queryKey: ["friends", "pending", "outgoing"],
    queryFn: async () => {
      const response = await api.get<User[]>(
        "/users/friends/pendings/outgoing"
      );
      return {
        data: response.data,
      };
    },
  });

  const incomingPendingFriends = useQuery({
    queryKey: ["friends", "pending", "incoming"],
    queryFn: async () => {
      const response = await api.get<User[]>(
        "/users/friends/pendings/incoming"
      );
      return {
        data: response.data,
      };
    },
  });

  const onlineFriends = useMemo(() => {
    if (allFriends.data?.data["map"])
      return allFriends.data?.data.filter((e) => e.status === "ONLINE");
    return [];
  }, [allFriends]);

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

  const unfriendMutation = useMutation({
    mutationFn: (username: string) => {
      return api.delete(`/users/friends/${username}`, {
        validateStatus: (status) => status === 200,
      });
    },
    onSettled(data, error, variables) {
      if (data?.status === 200) {
        queryClient.setQueryData(["friends"], (prev: { data: User[] }) => {
          return {
            data: prev.data.filter(
              (friend) => friend.username + "@" + friend.id !== variables
            ),
          };
        });
      } else {
        handleError(data);
      }
    },
  });

  const acceptFriendMutation = useMutation({
    mutationFn: (username: string) => {
      return api.post(`/users/friends/accept/${username}`, undefined, {
        validateStatus: (status) => status === 200,
      });
    },
    onSettled(data, error, variables) {
      if (data?.status === 200) {
        queryClient.setQueryData(["friends"], (prev: { data: User[] }) => {
          return {
            data: [...prev.data, data.data],
          };
        });

        queryClient.setQueryData(
          ["friends", "pending", "incoming"],
          (prev: { data: User[] }) => {
            return {
              data: prev.data.filter(
                (friend) => friend.username + "@" + friend.id !== variables
              ),
            };
          }
        );
      } else {
        handleError(data);
      }
    },
  });

  const rejectFriendMutation = useMutation({
    mutationFn: (username: string) => {
      return api.post(`/users/friends/reject/${username}`, undefined, {
        validateStatus: (status) => status === 200,
      });
    },
    onSettled(data, error, variables) {
      if (data?.status === 200) {
        queryClient.setQueryData(
          ["friends", "pending", "incoming"],
          (prev: { data: User[] }) => {
            return {
              data: prev.data.filter(
                (friend) => friend.username + "@" + friend.id !== variables
              ),
            };
          }
        );
      } else {
        handleError(data);
      }
    },
  });

  const cancelOutgoingPendingRequestMutation = useMutation({
    mutationFn: (username: string) => {
      return api.delete(`/users/friends/pendings/outgoing/${username}`);
    },
    onSettled(data, error, variables) {
      if (data?.status === 200) {
        queryClient.setQueryData(
          ["friends", "pending", "outgoing"],
          (prev: { data: User[] }) => {
            return {
              data: prev.data.filter(
                (friend) => friend.username + "@" + friend.id !== variables
              ),
            };
          }
        );
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

    onSettled(data, error, variables) {
      // console.log("settledd", error, data)
      if (data?.status === 200) {
        setFriendRequestError("");
        setFriendRequestSuccess("Friend requested to user " + variables);
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

        setFriendRequestSuccess("");
        if (response === "User not found") {
          setFriendRequestError("User not found");
          ModalUtils.openGenericModal(
            modalContext,
            "FRIEND REQUEST ERROR",
            "User not found"
          );
        } else if (response === "Friend request already pending") {
          setFriendRequestError("Friend request already pending");
          ModalUtils.openGenericModal(
            modalContext,
            "FRIEND REQUEST ERROR",
            "Friend request already pending"
          );
        } else {
          setFriendRequestError(data.data);
          ModalUtils.openGenericModal(
            modalContext,
            "FRIEND REQUEST ERROR",
            data.data
          );
        }
      }
    },
  });

  const handleUnfriend = useCallback(
    (username: string) => {
      if (unfriendMutation.isPending) return;

      unfriendMutation.mutate(username);
    },
    [unfriendMutation]
  );

  const handleAcceptFriendRequest = useCallback(
    (username: string) => {
      if (acceptFriendMutation.isPending || rejectFriendMutation.isPending)
        return;

      acceptFriendMutation.mutate(username);
    },
    [acceptFriendMutation]
  );

  const handleRejectFriendRequest = useCallback(
    (username: string) => {
      if (rejectFriendMutation.isPending || acceptFriendMutation.isPending)
        return;

      rejectFriendMutation.mutate(username);
    },
    [rejectFriendMutation]
  );

  const handleCancelFriendRequest = useCallback(
    (username: string) => {
      if (cancelOutgoingPendingRequestMutation.isPending) return;
      cancelOutgoingPendingRequestMutation.mutate(username);
    },
    [cancelOutgoingPendingRequestMutation]
  );

  const handleSendFriendRequest = useCallback(
    (e: FormData) => {
      if (sendFriendRequestMutation.isPending) return;

      const usernameRegex = new RegExp("^[\\p{L}\\p{N}_.#]+$", "u");

      const username = e.get("requested_username")?.toString();

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
        setFriendRequestError("User not found");
        return;
      }

      sendFriendRequestMutation.mutate(username.replace("#", "@"));
    },
    [sendFriendRequestMutation]
  );

  const create1to1ChatRoomMutation = useMutation({
    mutationFn: ({
      username,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      additionalAction,
    }: {
      username: string;
      additionalAction?: "call" | "videocall";
    }) => {
      return api.post("/chatrooms/directmessaging", {
        chatRoomName: "DMs",
        friendNames: [username],
        dm: true,
      });
    },
    onSettled(data, error, variables) {
      if (data?.status === 201) {
        console.log(data.data);
        queryClient.setQueryData(
          ["chatroom_dm"],
          (prev: { data: ChatRoom[] }) => {
            return {
              data: [...prev.data, data.data],
            };
          }
        );

        if (!variables.additionalAction)
          router.replace(`/dashboard/chatroom/${data?.data.id}`);
        else if (variables.additionalAction === "call")
          router.replace(`/dashboard/chatroom/${data?.data.id}?call=true`);
        else if (variables.additionalAction === "videocall")
          router.replace(`/dashboard/chatroom/${data.data.id}?videocall=true`);
      } else {
        if (
          data?.data.startsWith("Direct chat already exists against this user")
        ) {
          const split = data.data.split(":");
          const id = split[1];

          localStorage.removeItem(`chatroom_hide_${id}`);

          if (!variables.additionalAction)
            router.replace(`/dashboard/chatroom/${id}`);
          else if (variables.additionalAction === "call")
            router.replace(`/dashboard/chatroom/${id}?call=true`);
          else if (variables.additionalAction === "videocall")
            router.replace(`/dashboard/chatroom/${id}?videocall=true`);
          return;
        }
        handleError(data);
      }
    },
  });

  const handleCreate1to1Chatroom = useCallback(
    (username: string, additionalAction?: "call" | "videocall") => {
      setTimeout(() => {
        if (!create1to1ChatRoomMutation.isPending) {
          create1to1ChatRoomMutation.mutate({ username, additionalAction });
        }
      }, 50);
    },
    [create1to1ChatRoomMutation]
  );

  const [requestedUsername, setRequestedUsername] = useState("");
  //socket logic
  useSocket(
    stompContext?.stompClient,
    stompContext?.stompFrame,
    (stompClient, currentSocketUser) => {
      const onCancelFriendRequest = stompClient.subscribe(
        `/user/${currentSocketUser}/general/onCancelFriendRequest`,
        (message) => {
          const payload = message.body;
          queryClient.setQueryData(
            ["friends", "pending", "incoming"],
            (prev: { data: User[] }) => {
              return {
                data: prev.data.filter(
                  (friend) => friend.username + "@" + friend.id !== payload
                ),
              };
            }
          );
        }
      );

      const onSendFriendRequest = stompClient.subscribe(
        `/user/${currentSocketUser}/general/onSendFriendRequest`,
        (message) => {
          const payload: User = JSON.parse(message.body);
          queryClient.setQueryData(
            ["friends", "pending", "incoming"],
            (prev: { data: User[] }) => {
              return {
                data: [...prev.data, { ...payload }],
              };
            }
          );
        }
      );

      const onRejectFriendRequest = stompClient.subscribe(
        `/user/${currentSocketUser}/general/onRejectFriendRequest`,
        (message) => {
          const payload = message.body;
          queryClient.setQueryData(
            ["friends", "pending", "outgoing"],
            (prev: { data: User[] }) => {
              return {
                data: prev.data.filter(
                  (friend) => friend.username + "@" + friend.id !== payload
                ),
              };
            }
          );
        }
      );

      return [
        onCancelFriendRequest,
        onSendFriendRequest,
        onRejectFriendRequest,
      ];
    },
    [stompContext?.stompClient, stompContext?.stompFrame]
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
          )}? You won't be able to view each other's chat nor call 1-to-1,
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

  return (
    <div className="h-full">
      <Header>
        <div className="flex sm:gap-2 text-lime-600 mr-auto ml-2 items-center text-xs sm:text-base">
          {" "}
          <FaUserFriends size={24} />{" "}
          <div className="hidden sm:block">Friends</div>{" "}
          <div className="bg-lime-600 w-[0.1rem] ml-3 sm:ml-1"></div>
          <div
            className={`ml-0 hidden sm:block sm:ml-4 cursor-pointer transition hover:bg-lime-500 ${
              tab === "Online" && "bg-lime-500"
            } rounded-md px-1`}
            onClick={() => setTab!("Online")}
          >
            Online
          </div>
          <div
            className={`ml-0 sm:ml-4 cursor-pointer transition hover:bg-lime-500 ${
              tab === "All" && "bg-lime-500"
            } rounded-md px-1`}
            onClick={() => setTab!("All")}
          >
            All
          </div>
          <div
            className={`ml-0 sm:ml-4 cursor-pointer transition hover:bg-lime-500 ${
              tab === "Pending" && "bg-lime-500"
            } rounded-md px-1 flex items-center`}
            onClick={() => setTab!("Pending")}
          >
            Pending{" "}
            <div
              className={`bg-red-500 ml-2 ${
                (outGoingPendingFriends.data?.data.length ?? 0) +
                  (incomingPendingFriends.data?.data.length ?? 0) ===
                0
                  ? "hidden"
                  : "hidden sm:grid"
              } rounded-full place-content-center text-center w-[1rem] h-[1rem] text-sm text-lime-300 p-[0.7rem]`}
            >
              {(outGoingPendingFriends.data?.data.length ?? 0) +
                (incomingPendingFriends.data?.data.length ?? 0)}
            </div>
          </div>
          <div
            className={`ml-0 sm:ml-4 cursor-pointer transition hover:bg-lime-500 ${
              tab === "Blocked" && "bg-lime-500"
            } rounded-md px-1`}
            onClick={() => setTab!("Blocked")}
          >
            Blocked
          </div>
          <div
            className={`ml-1 sm:ml-4 cursor-pointer ${
              tab === "Add Friend" ? "text-lime-800" : "bg-lime-800"
            } px-1 rounded-sm`}
            onClick={() => {
              setTab!("Add Friend");
            }}
          >
            <div className="hidden lg:block">Add Friend</div>
            <div className="block lg:hidden text-center">+</div>
          </div>
          {/* <div key={reloadButtonKey} className={`animate-spinClockwise ml-2 sm:ml-4 cursor-pointer transition hover:text-lime-700 rounded-md px-1`} onClick={handleRefresh}><IoRefreshCircle size={36} /> </div> */}
        </div>
      </Header>

      {tab === "All" && (
        <div className="flex-col w-full h-fit">
          <div className="p-4 w-full relative">
            <PrimaryInput
              id="online_search_input"
              label=""
              type="text"
              placeholder="Search"
              customStylesInput="w-full"
              value_={deferredSearchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            ></PrimaryInput>
            <div className="absolute right-5 bottom-[1.375rem] text-lime-400">
              <FaSearch size={24} />
            </div>
          </div>
          <p className="text-lime-300 p-4">
            ALL FRIENDS - {allFriends.data?.data?.length ?? 0}{" "}
          </p>
          <div
            ref={profileListDivRef}
            className="p-4 overflow-y-scroll"
            style={{
              height: divHeight,
            }}
          >
            {allFriends.data?.data["map"] &&
              allFriends.data?.data
                .filter(
                  (user) =>
                    user.username.includes(deferredSearchValue) ||
                    user.nickname?.includes(deferredSearchValue)
                )
                .map((user) => {
                  return (
                    <div key={user.id}>
                      <ProfileBar user={user} showStatus>
                        <div className="bg-lime-600 hidden sm:block group-hover:bg-lime-700 rounded-full p-2 cursor-pointer ml-auto">
                          <FloatingButton
                            disabled={unfriendMutation.isPending}
                            description={"More"}
                            menu={
                              <MenuBox
                                menus={[
                                  "Video Call",
                                  "Voice Call",
                                  blockeds.data &&
                                  blockeds.data.data.find(
                                    (e) => e.id === user.id
                                  )
                                    ? "Unblock"
                                    : "Block",
                                  "Unfriend",
                                ]}
                                styles={[
                                  "default",
                                  "default",
                                  blockeds.data &&
                                  blockeds.data.data.find(
                                    (e) => e.id === user.id
                                  )
                                    ? "primary"
                                    : "danger",
                                  "danger",
                                ]}
                                onClicks={[
                                  () => {
                                    handleCreate1to1Chatroom(
                                      user.username + "@" + user.id,
                                      "videocall"
                                    );
                                  },
                                  () => {
                                    handleCreate1to1Chatroom(
                                      user.username + "@" + user.id,
                                      "call"
                                    );
                                  },
                                  () => {
                                    if (
                                      blockeds.data &&
                                      blockeds.data.data.find(
                                        (e) => e.id === user.id
                                      )
                                    )
                                      handleUnblockUser(
                                        user.username + "@" + user.id
                                      );
                                    else
                                      handleBlockUser(
                                        user.username + "@" + user.id
                                      );
                                  },
                                  () =>
                                    handleUnfriend(
                                      user.username + "@" + user.id
                                    ),
                                ]}
                              />
                            }
                          >
                            <BsThreeDotsVertical size={24} />
                          </FloatingButton>
                        </div>
                        <div className="bg-lime-600 sm:hidden group-hover:bg-lime-700 rounded-full p-2 cursor-pointer ml-auto">
                          <FloatingButton
                            disabled={unfriendMutation.isPending}
                            description={"More"}
                            menu={
                              <MenuBox
                                menus={[
                                  <IoMdVideocam key={0} size={16} />,
                                  <IoCall key={1} size={16} />,
                                  <AiOutlineUserDelete key={2} size={16} />,
                                  <IoChatboxSharp key={3} size={16} />,
                                  blockeds.data &&
                                  blockeds.data.data.find(
                                    (e) => e.id === user.id
                                  ) ? (
                                    <CgUnblock key={4} size={16} />
                                  ) : (
                                    <CgBlock key={4} size={16} />
                                  ),
                                ]}
                                styles={[
                                  "primary",
                                  "primary",
                                  "danger",
                                  "primary",
                                  blockeds.data &&
                                  blockeds.data.data.find(
                                    (e) => e.id === user.id
                                  )
                                    ? "primary"
                                    : "danger",
                                ]}
                                onClicks={[
                                  () => {
                                    handleCreate1to1Chatroom(
                                      user.username + "@" + user.id,
                                      "videocall"
                                    );
                                  },
                                  () => {
                                    handleCreate1to1Chatroom(
                                      user.username + "@" + user.id,
                                      "call"
                                    );
                                  },
                                  () =>
                                    handleUnfriend(
                                      user.username + "@" + user.id
                                    ),
                                  () =>
                                    handleCreate1to1Chatroom(
                                      user.username + "@" + user.id
                                    ),
                                  () => {
                                    if (
                                      blockeds.data &&
                                      blockeds.data.data.find(
                                        (e) => e.id === user.id
                                      )
                                    )
                                      handleUnblockUser(
                                        user.username + "@" + user.id
                                      );
                                    else
                                      handleBlockUser(
                                        user.username + "@" + user.id
                                      );
                                  },
                                ]}
                              />
                            }
                          >
                            <BsThreeDotsVertical size={24} />
                          </FloatingButton>
                        </div>
                        <div className="bg-lime-600 hidden sm:block group-hover:bg-lime-700 rounded-full p-2 cursor-pointer ml-2">
                          <FloatingButton
                            description={"Message"}
                            onClick={() =>
                              handleCreate1to1Chatroom(
                                user.username + "@" + user.id
                              )
                            }
                          >
                            <IoChatboxSharp size={24} />
                          </FloatingButton>
                        </div>
                      </ProfileBar>
                    </div>
                  );
                })}
          </div>
        </div>
      )}

      {tab === "Online" && (
        <div className="flex-col w-full h-fit">
          <div className="p-4 w-full relative">
            <PrimaryInput
              id="online_search_input"
              label=""
              type="text"
              placeholder="Search"
              customStylesInput="w-full"
              value_={deferredSearchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            ></PrimaryInput>
            <div className="absolute right-5 bottom-[1.375rem] text-lime-400">
              <FaSearch size={24} />
            </div>
          </div>
          <p className="text-lime-300 p-4">
            ONLINE - {onlineFriends?.length ?? 0}{" "}
          </p>
          <div
            ref={profileListDivRef}
            className="p-4 overflow-y-scroll"
            style={{
              height: divHeight,
            }}
          >
            {onlineFriends &&
              onlineFriends
                ?.filter(
                  (user) =>
                    user.username.includes(deferredSearchValue) ||
                    user.nickname?.includes(deferredSearchValue)
                )
                .map((user) => {
                  return (
                    <div key={user.id}>
                      <ProfileBar user={user} showStatus>
                        <div className="bg-lime-600 hidden sm:block group-hover:bg-lime-700 rounded-full p-2 cursor-pointer ml-auto">
                          <FloatingButton
                            disabled={unfriendMutation.isPending}
                            description={"More"}
                            menu={
                              <MenuBox
                                menus={[
                                  "Video Call",
                                  "Voice Call",
                                  blockeds.data &&
                                  blockeds.data.data.find(
                                    (e) => e.id === user.id
                                  )
                                    ? "Unblock"
                                    : "Block",
                                  "Unfriend",
                                ]}
                                styles={[
                                  "default",
                                  "default",
                                  blockeds.data &&
                                  blockeds.data.data.find(
                                    (e) => e.id === user.id
                                  )
                                    ? "primary"
                                    : "danger",
                                  "danger",
                                ]}
                                onClicks={[
                                  () => {
                                    handleCreate1to1Chatroom(
                                      user.username + "@" + user.id,
                                      "videocall"
                                    );
                                  },
                                  () => {
                                    handleCreate1to1Chatroom(
                                      user.username + "@" + user.id,
                                      "call"
                                    );
                                  },
                                  () => {
                                    if (
                                      blockeds.data &&
                                      blockeds.data.data.find(
                                        (e) => e.id === user.id
                                      )
                                    )
                                      handleUnblockUser(
                                        user.username + "@" + user.id
                                      );
                                    else
                                      handleBlockUser(
                                        user.username + "@" + user.id
                                      );
                                  },
                                  () =>
                                    handleUnfriend(
                                      user.username + "@" + user.id
                                    ),
                                ]}
                              />
                            }
                          >
                            <BsThreeDotsVertical size={24} />
                          </FloatingButton>
                        </div>
                        <div className="bg-lime-600 sm:hidden group-hover:bg-lime-700 rounded-full p-2 cursor-pointer ml-auto">
                          <FloatingButton
                            disabled={unfriendMutation.isPending}
                            description={"More"}
                            menu={
                              <MenuBox
                                menus={[
                                  <IoMdVideocam key={0} size={16} />,
                                  <IoCall key={1} size={16} />,
                                  <AiOutlineUserDelete key={2} size={16} />,
                                  <IoChatboxSharp key={3} size={16} />,
                                  blockeds.data &&
                                  blockeds.data.data.find(
                                    (e) => e.id === user.id
                                  ) ? (
                                    <CgUnblock key={4} size={16} />
                                  ) : (
                                    <CgBlock key={4} size={16} />
                                  ),
                                ]}
                                styles={[
                                  "primary",
                                  "primary",
                                  "danger",
                                  "primary",
                                  blockeds.data &&
                                  blockeds.data.data.find(
                                    (e) => e.id === user.id
                                  )
                                    ? "primary"
                                    : "danger",
                                ]}
                                onClicks={[
                                  () => {
                                    handleCreate1to1Chatroom(
                                      user.username + "@" + user.id,
                                      "videocall"
                                    );
                                  },
                                  () => {
                                    handleCreate1to1Chatroom(
                                      user.username + "@" + user.id,
                                      "call"
                                    );
                                  },
                                  () =>
                                    handleUnfriend(
                                      user.username + "@" + user.id
                                    ),
                                  () =>
                                    handleCreate1to1Chatroom(
                                      user.username + "@" + user.id
                                    ),
                                  () => {
                                    if (
                                      blockeds.data &&
                                      blockeds.data.data.find(
                                        (e) => e.id === user.id
                                      )
                                    )
                                      handleUnblockUser(
                                        user.username + "@" + user.id
                                      );
                                    else
                                      handleBlockUser(
                                        user.username + "@" + user.id
                                      );
                                  },
                                ]}
                              />
                            }
                          >
                            <BsThreeDotsVertical size={24} />
                          </FloatingButton>
                        </div>
                        <div className="bg-lime-600 hidden sm:block group-hover:bg-lime-700 rounded-full p-2 cursor-pointer ml-2">
                          <FloatingButton
                            description={"Message"}
                            onClick={() =>
                              handleCreate1to1Chatroom(
                                user.username + "@" + user.id
                              )
                            }
                          >
                            <IoChatboxSharp size={24} />
                          </FloatingButton>
                        </div>
                      </ProfileBar>
                    </div>
                  );
                })}
          </div>
        </div>
      )}

      {tab === "Pending" && (
        <div className="flex-col w-full h-fit">
          <div className="p-4 w-full relative">
            <PrimaryInput
              id="online_search_input"
              label=""
              type="text"
              placeholder="Search"
              customStylesInput="w-full"
              value_={deferredSearchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            ></PrimaryInput>
            <div className="absolute right-5 bottom-[1.375rem] text-lime-400">
              <FaSearch size={24} />
            </div>
          </div>
          <p className="text-lime-300 p-4">
            OUTGOING FRIEND REQUEST -{" "}
            {outGoingPendingFriends.data?.data.length ?? 0}{" "}
          </p>
          <div
            ref={profileListDivRef}
            className="p-4 overflow-y-scroll"
            style={{
              height: divHeight,
            }}
          >
            {outGoingPendingFriends.data?.data["map"] &&
              outGoingPendingFriends.data?.data
                ?.filter(
                  (user) =>
                    user.username.includes(deferredSearchValue) ||
                    user.nickname?.includes(deferredSearchValue)
                )
                .map((user) => {
                  return (
                    <div key={user.id}>
                      <ProfileBar
                        user={{
                          ...user,
                          statusMessage: "Outgoing Friend Request",
                        }}
                      >
                        <div className="bg-lime-600 group-hover:bg-lime-700 rounded-full p-2 cursor-pointer ml-auto">
                          <FloatingButton
                            disabled={
                              cancelOutgoingPendingRequestMutation.isPending
                            }
                            description={"Cancel"}
                            onClick={() =>
                              handleCancelFriendRequest(
                                user.username + "@" + user.id
                              )
                            }
                            hoverColor="hover:text-red-500"
                          >
                            <VscRemove size={24} />
                          </FloatingButton>
                        </div>
                      </ProfileBar>
                    </div>
                  );
                })}
            <hr className="text-lime-300 bg-lime-300" />
            <p className="text-lime-300 mt-8">
              INCOMING FRIEND REQUEST -{" "}
              {incomingPendingFriends.data?.data.length ?? 0}{" "}
            </p>
            {incomingPendingFriends.data?.data["map"] &&
              incomingPendingFriends.data?.data
                ?.filter(
                  (user) =>
                    user.username.includes(deferredSearchValue) ||
                    user.nickname?.includes(deferredSearchValue)
                )
                .map((user) => {
                  return (
                    <div key={user.id}>
                      <ProfileBar
                        user={{
                          ...user,
                          statusMessage: "Incoming Friend Request",
                        }}
                      >
                        <div className="bg-lime-600 sm:hidden group-hover:bg-lime-700 rounded-full p-2 cursor-pointer ml-auto">
                          <FloatingButton
                            disabled={unfriendMutation.isPending}
                            description={"More"}
                            menu={
                              <MenuBox
                                menus={[
                                  <FaCheck key={0} size={16} />,
                                  <VscRemove key={1} size={16} />,
                                ]}
                                styles={["primary", "danger"]}
                                onClicks={[
                                  () =>
                                    handleAcceptFriendRequest(
                                      user.username + "@" + user.id
                                    ),
                                  () =>
                                    handleRejectFriendRequest(
                                      user.username + "@" + user.id
                                    ),
                                ]}
                              />
                            }
                          >
                            <BsThreeDotsVertical size={24} />
                          </FloatingButton>
                        </div>

                        <div className="bg-lime-600 hidden sm:block group-hover:bg-lime-700 rounded-full p-2 cursor-pointer ml-auto">
                          <FloatingButton
                            disabled={
                              acceptFriendMutation.isPending ||
                              rejectFriendMutation.isPending
                            }
                            description={"Accept"}
                            hoverColor="hover:text-lime-300"
                            onClick={() =>
                              handleAcceptFriendRequest(
                                user.username + "@" + user.id
                              )
                            }
                          >
                            <FaCheck size={24} />
                          </FloatingButton>
                        </div>
                        <div className="bg-lime-600 hidden sm:block group-hover:bg-lime-700 rounded-full p-2 cursor-pointer ml-2">
                          <FloatingButton
                            disabled={
                              rejectFriendMutation.isPending ||
                              acceptFriendMutation.isPending
                            }
                            description={"Reject"}
                            hoverColor="hover:text-red-500"
                            onClick={() =>
                              handleRejectFriendRequest(
                                user.username + "@" + user.id
                              )
                            }
                          >
                            <VscRemove size={24} />
                          </FloatingButton>
                        </div>
                      </ProfileBar>
                    </div>
                  );
                })}
          </div>
        </div>
      )}

      {tab === "Blocked" && (
        <div className="flex-col w-full h-fit">
          <div className="p-4 w-full relative">
            <PrimaryInput
              id="online_search_input"
              label=""
              type="text"
              placeholder="Search"
              customStylesInput="w-full"
              value_={deferredSearchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            ></PrimaryInput>
            <div className="absolute right-5 bottom-[1.375rem] text-lime-400">
              <FaSearch size={24} />
            </div>
          </div>
          <p className="text-lime-300 p-4">
            BLOCKED - {blockeds.data?.data?.length ?? 0}{" "}
          </p>
          <div
            ref={profileListDivRef}
            className="p-4 overflow-y-scroll"
            style={{
              height: divHeight,
            }}
          >
            {blockeds.data?.data["map"] &&
              blockeds.data?.data
                .filter(
                  (user) =>
                    user.username.includes(deferredSearchValue) ||
                    user.nickname?.includes(deferredSearchValue)
                )
                .map((user) => {
                  return (
                    <div key={user.id}>
                      <ProfileBar
                        user={{
                          ...user,
                          statusMessage: "Blocked",
                        }}
                      >
                        <div className="bg-lime-600 group-hover:bg-lime-700 rounded-full p-2 cursor-pointer ml-auto">
                          <FloatingButton
                            description={"Unblock"}
                            disabled={unblockMutation.isPending}
                            hoverColor="hover:text-lime-300"
                            onClick={() =>
                              handleUnblockUser(user.username + "@" + user.id)
                            }
                          >
                            <CgUnblock size={24} />
                          </FloatingButton>
                        </div>
                      </ProfileBar>
                    </div>
                  );
                })}
          </div>
        </div>
      )}

      {tab === "Add Friend" && (
        <div className="p-4">
          <h3 className="text-xl text-lime-700">ADD FRIEND</h3>
          <p className="text-lime-300">
            You can add friends with their Accord username.
          </p>
          <form
            className="flex relative w-full"
            action={handleSendFriendRequest}
          >
            <input
              value={requestedUsername}
              onChange={(e) => setRequestedUsername(e.target.value)}
              id="request_username"
              name="requested_username"
              className={`bg-lime-700 text-lime-300 ${
                friendRequestError.length > 0
                  ? "bg-red-500 focus:outline-lime-700"
                  : "focus:outline-lime-800"
              } placeholder:text-lime-400 rounded-md mt-4 w-full p-3`}
              placeholder="e.g. user#15"
            />

            <div className="absolute right-4 top-[1.375rem]">
              <PrimaryButton
                disabled={
                  requestedUsername.length === 0 ||
                  sendFriendRequestMutation.isPending
                }
                buttonType="submit"
                customStyles="bg-lime-500 px-2"
              >
                <p className="hidden md:inline">Send Friend Request</p>
                <p className="md:hidden">
                  <IoIosSend />
                </p>
              </PrimaryButton>
            </div>
          </form>
          {friendRequestError.length > 0 && (
            <div className="text-red-500 p-1 font-semibold flex items-center gap-1">
              <MdError size={12} /> {friendRequestError}
            </div>
          )}
          {friendRequestSuccess.length > 0 && (
            <div className="text-lime-300 p-1 font-semibold flex items-center gap-1">
              <FaCheck size={12} /> {friendRequestSuccess}
            </div>
          )}

          <div className="grid p-4 text-lime-400 w-full place-content-center mt-8">
            <FaFeatherPointed size={200} />
            <p className="text-lime-300 text-center mt-8">
              Peace need not be lonely..
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
