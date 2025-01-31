import React, { useContext, useRef, useState } from "react";
import useIsLightMode from "../hooks/useIsLightMode";
import { User } from "../types/User";
import ProfileAvatar from "./ProfileAvatar";
import GenericUtil from "../util/GenericUtil";
import PrimaryButton from "./PrimaryButton";
import { IoChatbox } from "react-icons/io5";
import FloatingButton from "./FloatingButton";
import { FaEdit, FaUserCheck } from "react-icons/fa";
import RightClickMenuWrapper from "./RightClickMenuWrapper";
import { IoIosMore } from "react-icons/io";
import { Popover } from "react-tiny-popover";
import { useMutation, useQuery } from "@tanstack/react-query";
import api from "../api/api";
import { ChatRoom } from "../types/ChatRoom";
import { FaUserXmark } from "react-icons/fa6";
import ModalUtils from "../util/ModalUtil";
import ModalContext from "../contexts/ModalContext";
import queryClient from "../query/QueryClient";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import RoomAvatar from "./RoomAvatar";

import SimpleMarkdownTextView from "./SimpleMarkdownTextView";

export default function UserDetailsCard({
  user,
  handleSendFriendRequest,
  handleUnfriend,
  handleBlockUser,
  handleUnblockUser,
  handleCreate1to1Chatroom,
}: {
  user: User;
  handleSendFriendRequest: (username: string) => void;
  handleUnfriend: (username: string) => void;
  handleBlockUser: (username: string) => void;
  handleUnblockUser: (username: string) => void;
  handleCreate1to1Chatroom: (username: string) => void;
}) {
  const modalContext = useContext(ModalContext);
  const currentUser = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const response = await api.get<User>("/users");
      return { data: response.data };
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
  const friends = useQuery({
    queryKey: ["friends"],
    queryFn: async () => {
      const response = await api.get<User[]>("/users/friends");
      return {
        data: response.data,
      };
    },
    refetchOnMount: false,
  });

  const mutualFriends = useQuery({
    queryKey: ["mutualFriends", user.id],
    queryFn: async () => {
      if (user.id === currentUser.data?.data.id) {
        return {
          data: [],
        };
      }

      const response = await api.get<User[]>(
        "/users/mutual/friends/" + user.id
      );
      return {
        data: response.data,
      };
    },
    refetchOnMount: true,
  });

  const mutualChatrooms = useQuery({
    queryKey: ["mutualCharooms", user.id],
    queryFn: async () => {
      if (user.id === currentUser.data?.data.id) {
        return {
          data: [],
        };
      }

      const response = await api.get<ChatRoom[]>(
        "/users/mutual/chatrooms/" + user.id
      );
      return {
        data: response.data,
      };
    },
    refetchOnMount: true,
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
  const isLightMode = useIsLightMode();
  const [hoveringInviteToServer, setHoveringInviteToServer] = useState(false);
  const hoveringTimeout = useRef<NodeJS.Timeout | null>(null);
  const chatRooms = useQuery({
    queryKey: ["chatroom_dm"],
    queryFn: async () => {
      const response = await api.get<ChatRoom[]>("/chatrooms/directmessaging");
      return {
        data: response.data,
      };
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const router = useRouter();
  const inviteToRoomMutation = useMutation({
    mutationFn: (room: ChatRoom) => {
      const formData = new FormData();

      if (currentUser.data?.data) {
        formData.set(
          "chatRoomDetails",
          new Blob(
            [
              JSON.stringify({
                id: room.id,
                name: room.name,
                participants: [
                  ...room.participants.map((e) => e.username + "@" + e.id),
                  user.username + "@" + user.id,
                ],
                deleteRoomImage: false,
              }),
            ],
            {
              type: "application/json",
            }
          )
        );
      }

      return api.put(`/chatrooms/directmessaging/${room.id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
    },
    onSettled(data, _error, variables) {
      if (data?.status === 200) {
        queryClient.setQueryData(
          ["chatroom_dm", variables.id.toString()],
          () => {
            return {
              data: {
                ...data.data,
              },
            };
          }
        );

        queryClient.setQueryData(
          ["chatroom_dm"],
          (prev: { data: ChatRoom[] }) => {
            return {
              data: prev.data.map((chatroom) => {
                if (chatroom.id.toString() === variables.id.toString()) {
                  return {
                    ...data.data,
                  };
                }
                return chatroom;
              }),
            };
          }
        );

        router.replace(`/dashboard/chatroom/${variables.id}`);
      } else if (data) {
        ModalUtils.handleGenericError(modalContext, data);
      }
    },
  });

  const [tab, setTab] = useState("About Me");

  const userAboutMe = useQuery({
    queryKey: ["user_aboutme", user.id],
    queryFn: async () => {
      if (user.id === currentUser.data?.data.id) {
        return {
          data: undefined,
        };
      }
      const response = await api.get<string>("/users/aboutme/" + user.id);
      return {
        data: response.data,
      };
    },
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  const currentUserAboutMe = useQuery({
    queryKey: ["currentuser_aboutme"],
    queryFn: async () => {
      const response = await api.get<string>("/users/aboutme");
      return {
        data: response.data,
      };
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  return (
    <div
      className="rounded-md relative flex flex-col text-white bg-lime-700 w-[90vw] md:w-[50vw] h-[70vh]"
      style={{
        background: `linear-gradient(to bottom, ${user.profileColor} 30%, ${
          !isLightMode ? "rgb(77,124,15)" : "rgb(190,242,100)"
        } 30%)`,
      }}
    >
      {currentUser.data?.data.id !== user.id && (
        <div className="flex p-2 justify-start">
          <div className="rounded-full md:ml-auto bg-black bg-opacity-50">
            {friends.data?.data.find((e) => e.id === user.id) !== undefined ? (
              <FloatingButton
                customTextColor="text-white"
                backgroundColor="bg-transparent"
                description="Friends"
              >
                <RightClickMenuWrapper
                  menu={
                    <div className="p-1 bg-lime-700 rounded-md flex flex-col">
                      <div
                        className="text-red-500 transition rounded-md p-1 hover:bg-lime-600 cursor-pointer"
                        onClick={() => {
                          handleUnfriend(user.username + "@" + user.id);
                        }}
                      >
                        Unfriend
                      </div>
                    </div>
                  }
                  supportLeftClick
                >
                  <FaUserCheck />
                </RightClickMenuWrapper>
              </FloatingButton>
            ) : (
              <FloatingButton
                customTextColor="text-white"
                backgroundColor="bg-transparent"
                description="Add Friend"
                onClick={() => {
                  handleSendFriendRequest(user.username + "#" + user.id);
                }}
              >
                <FaUserXmark />
              </FloatingButton>
            )}
          </div>

          <div className="rounded-full ml-2 bg-black bg-opacity-50">
            <FloatingButton
              customTextColor="text-white"
              backgroundColor="bg-transparent"
              description="More.."
            >
              <RightClickMenuWrapper
                additionalOnClick={() => {
                  setHoveringInviteToServer(false);
                }}
                menu={
                  <div className="p-1 bg-lime-700 rounded-md w-fit flex flex-col">
                    {friends.data?.data.find((e) => e.id === user.id) && (
                      <Popover
                        containerStyle={{
                          zIndex: "105",
                        }}
                        positions={["right", "bottom", "left", "top"]}
                        isOpen={hoveringInviteToServer}
                        content={
                          <div
                            onMouseEnter={() => {
                              if (hoveringTimeout.current) {
                                clearTimeout(hoveringTimeout.current);
                              }
                              setHoveringInviteToServer(true);
                            }}
                            onMouseLeave={() => {
                              hoveringTimeout.current = setTimeout(() => {
                                setHoveringInviteToServer(false);
                              }, 100);
                            }}
                            className="flex flex-col m-2 p-2 bg-lime-700 rounded-md text-white"
                          >
                            {chatRooms.data?.data &&
                            chatRooms.data?.data.filter(
                              (e) =>
                                !e.direct1to1Identifier?.length &&
                                !e.participants.find((p) => p.id === user.id)
                            ).length > 0 ? (
                              chatRooms.data.data
                                .filter(
                                  (e) =>
                                    !e.direct1to1Identifier?.length &&
                                    !e.participants.find(
                                      (p) => p.id === user.id
                                    )
                                )
                                .map((room) => {
                                  return (
                                    <div
                                      onClick={() => {
                                        if (!inviteToRoomMutation.isPending) {
                                          inviteToRoomMutation.mutate(room);
                                        }
                                      }}
                                      key={room.id}
                                      className="transition whitespace-nowrap rounded-md p-1 hover:bg-lime-600 cursor-pointer"
                                    >
                                      {room.name}
                                    </div>
                                  );
                                })
                            ) : (
                              <div className="text-white cursor-not-allowed p-2 rounded-md">
                                None
                              </div>
                            )}
                          </div>
                        }
                      >
                        <div
                          className="rightClickMenuWrapperExclude transition whitespace-nowrap rounded-md p-1 hover:bg-lime-600 cursor-pointer"
                          onMouseEnter={() => {
                            if (hoveringTimeout.current) {
                              clearTimeout(hoveringTimeout.current);
                            }
                            setHoveringInviteToServer(true);
                          }}
                          onMouseLeave={() => {
                            hoveringTimeout.current = setTimeout(() => {
                              setHoveringInviteToServer(false);
                            }, 100);
                          }}
                        >
                          Invite to chatroom {">"}
                        </div>
                      </Popover>
                    )}

                    <div
                      className="transition text-red-500 whitespace-nowrap rounded-md p-1 hover:bg-lime-600 cursor-pointer"
                      onClick={() => {
                        if (blockeds.data?.data.find((e) => e.id === user.id)) {
                          handleUnblockUser(user.username + "@" + user.id);
                        } else {
                          handleBlockUser(user.username + "@" + user.id);
                        }
                      }}
                    >
                      {blockeds.data?.data.find((e) => e.id === user.id)
                        ? "Unblock"
                        : "Block"}
                    </div>
                  </div>
                }
                supportLeftClick
              >
                <IoIosMore />
              </RightClickMenuWrapper>
            </FloatingButton>
          </div>
        </div>
      )}

      <div className="absolute top-[30%] items-center -translate-y-[50%] flex flex-col ml-4 bg-lime-700 w-fit h-fit rounded-full">
        <ProfileAvatar user={user} size={GenericUtil.remToPx(4)} showStatus />
      </div>

      <div className="absolute top-[30%] p-2 flex flex-col w-full h-[70%]">
        <div className="flex w-full">
          {currentUser.data?.data.id === user.id ? (
            <PrimaryButton
              customStyles="ml-auto mt-0 bg-lime-500 px-2"
              customWidth="w-fit"
            >
              <div
                className="flex justify-center items-center gap-2"
                onClick={() => {
                  ModalUtils.closeCurrentModal(modalContext);
                  ModalUtils.openSettingsPage(modalContext, "Profiles");
                }}
              >
                <FaEdit />
                Edit Profile
              </div>
            </PrimaryButton>
          ) : (
            <PrimaryButton
              customStyles="ml-auto mt-0 bg-lime-500 px-2"
              customWidth="w-fit"
            >
              <div
                className="flex justify-center items-center gap-2"
                onClick={() => {
                  handleCreate1to1Chatroom(user.username + "@" + user.id);
                  ModalUtils.closeCurrentModal(modalContext);
                }}
              >
                <IoChatbox />
                Message
              </div>
            </PrimaryButton>
          )}
        </div>
        <p className="text-xl font-bold mt-2">
          {user.nickname.length ? user.nickname : user.username}
        </p>
        <p className="text-sm">{user.username + "#" + user.id}</p>
        <div className="rounded-md mt-2 flex flex-col bg-transparent h-full min-h-0">
          <div className="flex flex-col">
            <div className="flex w-full justify-evenly">
              <div
                onClick={() => setTab("About Me")}
                className="transition text-xs md:text-base whitespace-nowrap text-center hover:bg-lime-600 cursor-pointer w-[33.33333%] rounded-ss-md"
              >
                About Me
              </div>
              <div
                onClick={() => setTab("Mutual Friends")}
                className="transition text-xs md:text-base whitespace-nowrap text-center hover:bg-lime-600 cursor-pointer w-[33.33333%]"
              >
                Mutual Friends
              </div>
              <div
                onClick={() => setTab("Mutual Rooms")}
                className="transition text-xs md:text-base whitespace-nowrap text-center hover:bg-lime-600 cursor-pointer w-[33.33333%] rounded-se-md"
              >
                Mutual Group
              </div>
            </div>
            <div
              style={{
                marginLeft:
                  tab === "About Me"
                    ? "0%"
                    : tab === "Mutual Friends"
                    ? "33.3333%"
                    : "66.6666%",
              }}
              className="bg-lime-400 h-[0.1rem] transition-all w-[33.3333%]"
            ></div>
          </div>

          <div className="p-4 flex flex-col overflow-y-scroll">
            {tab === "About Me" && (
              <div className="animate-fadeIn">
                {userAboutMe.data?.data && userAboutMe.data.data.length > 0 && (
                  <SimpleMarkdownTextView text={userAboutMe.data.data} />
                )}

                {currentUserAboutMe.data?.data &&
                  currentUserAboutMe.data.data.length > 0 && (
                    <SimpleMarkdownTextView
                      text={currentUserAboutMe.data.data}
                    />
                  )}

                <p className="text-lime-400">Member Since</p>
                <p>{format(user.registeredAt, "MMM d, yyyy")}</p>
              </div>
            )}
            {tab === "Mutual Friends" && (
              <div className="animate-fadeIn">
                {mutualFriends.data?.data &&
                  mutualFriends.data.data["map"] &&
                  mutualFriends.data.data.map((mutualFriend) => {
                    return (
                      <div
                        className="flex gap-2 items-center p-2 rounded-md transition cursor-pointer hover:bg-lime-600"
                        key={mutualFriend.id}
                        onClick={() => {
                          ModalUtils.closeCurrentModal(modalContext);
                          handleCreate1to1Chatroom(
                            mutualFriend.username + "@" + mutualFriend.id
                          );
                        }}
                      >
                        <ProfileAvatar
                          user={user}
                          size={GenericUtil.remToPx(2)}
                        />
                        {mutualFriend.nickname.length
                          ? mutualFriend.nickname
                          : mutualFriend.username}
                      </div>
                    );
                  })}
              </div>
            )}

            {tab === "Mutual Rooms" && (
              <div className="animate-fadeIn">
                {mutualChatrooms.data?.data &&
                  mutualChatrooms.data.data["map"] &&
                  mutualChatrooms.data.data.map((mutualRoom) => {
                    return (
                      <div
                        className="flex gap-2 items-center p-2 rounded-md transition cursor-pointer hover:bg-lime-600"
                        key={mutualRoom.id}
                        onClick={() => {
                          ModalUtils.closeCurrentModal(modalContext);
                          router.replace(
                            `/dashboard/chatroom/${mutualRoom.id}`
                          );
                        }}
                      >
                        <RoomAvatar
                          currentUser={currentUser.data?.data}
                          chatroom={mutualRoom}
                          size={GenericUtil.remToPx(2)}
                          showStatus={false}
                        />
                        {mutualRoom.name}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
