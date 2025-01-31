import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import PrimaryInput from "./PrimaryInput";
import { ChatRoom } from "../types/ChatRoom";
import { User } from "../types/User";
import ProfileAvatar from "./ProfileAvatar";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/api";
import { useDebounceValue } from "usehooks-ts";
import useIsLightMode from "../hooks/useIsLightMode";
import { ClipLoader } from "react-spinners";

import { FaFeatherPointed } from "react-icons/fa6";
import { useRouter } from "next/navigation";
import ModalContext from "../contexts/ModalContext";
import ModalUtils from "../util/ModalUtil";
import { IoLockOpen, IoPeopleSharp, IoPersonSharp } from "react-icons/io5";
import { MdWarning } from "react-icons/md";
import RoomAvatar from "./RoomAvatar";
import ConversationSearchUIUserEntry from "./ConversationUIUserEntry";
import ChatNotificationContext from "../contexts/ChatNotificationContext";

export default function ConversationSearchUI() {
  const modalContext = useContext(ModalContext);
  const queryClient = useQueryClient();

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
        if (data) ModalUtils.handleGenericError(modalContext, data);
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
  const router = useRouter();
  const currentUserQuery = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const response = await api.get<User>("/users");
      return { data: response.data };
    },
    refetchOnWindowFocus: false,
  });
  const chatRoomsQuery = useQuery({
    queryKey: ["chatroom_dm"],
    queryFn: async () => {
      const response = await api.get<ChatRoom[]>("/chatrooms/directmessaging");
      return {
        data: response.data,
      };
    },
    refetchOnWindowFocus: false,
  });
  const friendsQuery = useQuery({
    queryKey: ["friends"],
    queryFn: async () => {
      const response = await api.get<User[]>("/users/friends");
      return {
        data: response.data,
      };
    },
    refetchOnMount: false,
  });

  const friends = useMemo(() => {
    return friendsQuery.data?.data ?? [];
  }, [friendsQuery]);

  const currentUser = useMemo(() => {
    return currentUserQuery.data?.data;
  }, [currentUserQuery]);

  const chatRooms = useMemo(() => {
    return chatRoomsQuery.data?.data ?? [];
  }, [chatRoomsQuery]);

  const youMayKnow = useQuery({
    queryKey: ["users_youmayknow"],
    queryFn: async () => {
      const response = await api.get<User[]>("/users/youmayknow");
      return {
        data: response.data,
      };
    },
    refetchInterval: 60000 * 5, // 5 minutes
    refetchOnMount: false,
  });

  const [searchedUsers, setSearchedUsers] = useState<User[]>([]);
  const searchMutation = useMutation({
    mutationFn: (query: string) => {
      return api.post<User[]>("/users/search", {
        query,
      });
    },
  });
  const [searchedRooms, setSearchedRooms] = useState<ChatRoom[]>([]);
  const searchRoomMutation = useMutation({
    mutationFn: (query: string) => {
      return api.post<ChatRoom[]>("/chatrooms/search", {
        query,
      });
    },
  });

  const searchQueue = useRef<string[]>([]);

  useEffect(() => {
    let timeout: NodeJS.Timeout | null = null;
    const handler = async () => {
      if (searchQueue.current.length) {
        const nextSearch = searchQueue.current.shift();
        if (nextSearch) {
          const data = await searchMutation.mutateAsync(nextSearch);
          if (data.status === 200) {
            setSearchedUsers(data.data);
          }
          const roomData = await searchRoomMutation.mutateAsync(nextSearch);
          if (roomData.status === 200) {
            setSearchedRooms(roomData.data);
          }
        }
      }

      timeout = setTimeout(handler, 100);
    };

    timeout = setTimeout(handler, 100);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  const [queryDebounced, setQueryDebounced] = useDebounceValue("", 500);

  useEffect(() => {
    if (queryDebounced.length >= 2) searchQueue.current.push(queryDebounced);
    else {
      setSearchedUsers([]);

      setSearchedRooms([]);
    }
  }, [queryDebounced]);

  const allParticipants = useMemo(() => {
    return chatRooms.flatMap((room) =>
      !room.direct1to1Identifier?.length ? room.participants : []
    );
  }, [chatRooms]);

  const notificationContext = useContext(ChatNotificationContext);

  const joinPublicRoomMutation = useMutation({
    mutationFn: (id: number) => {
      return api.post(`/chatrooms/publicAccess/${id}`);
    },
    onSettled(data, error, id) {
      if (data?.status === 200) {
        router.replace(`/dashboard/chatroom/${id}`);
      } else if (
        data?.status === 400 &&
        data.data === "User already in this chatroom"
      ) {
        router.replace(`/dashboard/chatroom/${id}`);
      } else if (data) {
        ModalUtils.handleGenericError(modalContext, data);
      }
    },
  });
  const searchedRoomEntries = useMemo(() => {
    return searchedRooms.map((room) => {
      return (
        <div
          onClick={() => {
            ModalUtils.closeCurrentModal(modalContext);
            //auto-invite here...
            if (!joinPublicRoomMutation.isPending) {
              joinPublicRoomMutation.mutate(room.id);
            }
          }}
          key={"searchedroom_" + room.id}
          className="flex overflow-x-scroll no-scrollbar items-center group gap-4 p-2 justify-start cursor-pointer transition hover:bg-lime-700 text-lime-300 rounded-md"
        >
          <RoomAvatar chatroom={room} size={24} currentUser={currentUser} />
          {room.name}
          <p className="text-lime-700 group-hover:text-lime-500 ">
            {room.name + "#" + room.id}
          </p>

          <div className="rounded-lg bg-lime-700 group-hover:bg-lime-500 px-2 flex items-center justify-center gap-2">
            <IoLockOpen />
            Public
          </div>
        </div>
      );
    });
  }, [searchedRooms, friends, allParticipants]);

  const searchedUserEntries = useMemo(() => {
    return searchedUsers.map((p) => {
      return (
        <div key={"searched_" + p.id}>
          <ConversationSearchUIUserEntry
            user={p}
            handleCreate1to1Chatroom={handleCreate1to1Chatroom}
            friends={friends}
            allParticipants={allParticipants}
          />
        </div>
      );
    });
  }, [searchedUsers, friends, allParticipants]);
  const youMayKnowEntries = useMemo(() => {
    return (
      youMayKnow.data?.data.map((p) => {
        return (
          <div key={"youmayknow_" + p.id}>
            <ConversationSearchUIUserEntry
              user={p}
              handleCreate1to1Chatroom={handleCreate1to1Chatroom}
              showYouMayKnowTag
            />
          </div>
        );
      }) ?? []
    );
  }, [youMayKnow]);

  const friendsEntries = useMemo(() => {
    return friends.map((p) => {
      return (
        <div key={"friend_" + p.id}>
          <ConversationSearchUIUserEntry
            user={p}
            handleCreate1to1Chatroom={handleCreate1to1Chatroom}
          />
        </div>
      );
    });
  }, [friends]);

  const directMessageEntries = useMemo(() => {
    return chatRooms
      .filter((room) => room.direct1to1Identifier?.length)
      .map((room) => {
        const participants = room.participants.map((p) =>
          p.id === currentUser?.id ? currentUser : p
        );

        const otherUser = participants.find((e) => e.id !== currentUser?.id);

        return (
          <div
            onClick={() => {
              ModalUtils.closeCurrentModal(modalContext);
              router.replace(`/dashboard/chatroom/${room.id}`);
            }}
            key={"room_" + room.id}
            className="flex overflow-x-scroll no-scrollbar items-center group gap-4 p-2 justify-start cursor-pointer transition hover:bg-lime-700 text-lime-300 rounded-md"
          >
            {otherUser ? (
              <ProfileAvatar user={otherUser} size={24} />
            ) : currentUser ? (
              <ProfileAvatar user={currentUser} size={24} />
            ) : (
              ""
            )}
            @
            {otherUser
              ? otherUser?.nickname.length
                ? otherUser?.nickname
                : otherUser?.username
              : "Inactive DM"}
            <p className="text-lime-700 group-hover:text-lime-500 ">
              {otherUser ? otherUser?.username + "#" + otherUser?.id : ""}
            </p>
            {!friends.find((e) => e.id === otherUser?.id) ? (
              allParticipants.find((e) => e.id === otherUser?.id) ? (
                <div className="rounded-lg bg-lime-700 group-hover:bg-lime-500 px-2 flex items-center justify-center gap-2">
                  <IoPeopleSharp />
                  Group
                </div>
              ) : (
                <div className="rounded-lg bg-orange-500 group-hover:bg-lime-500 px-2 flex items-center justify-center gap-2">
                  <MdWarning />
                  Unknown
                </div>
              )
            ) : (
              <div className="rounded-lg bg-lime-700 group-hover:bg-lime-500 px-2 flex items-center justify-center gap-2">
                <IoPersonSharp />
                Friend
              </div>
            )}
            {notificationContext?.recentChatNotifications[room.id] !==
              undefined &&
              notificationContext.recentChatNotifications[room.id] > 0 && (
                <div className="ml-auto grid place-content-center flex-shrink-0 rounded-full w-6 h-6 bg-red-500 text-white p-1">
                  <p>{notificationContext?.recentChatNotifications[room.id]}</p>
                </div>
              )}
          </div>
        );
      });
  }, [
    chatRooms,
    currentUser,
    friends,
    allParticipants,
    notificationContext?.recentChatNotifications,
  ]);

  const chatRoomEntries = useMemo(() => {
    return chatRooms
      .filter((room) => !room.direct1to1Identifier?.length)
      .map((room) => {
        return (
          <div
            onClick={() => {
              ModalUtils.closeCurrentModal(modalContext);
              router.replace(`/dashboard/chatroom/${room.id}`);
            }}
            key={"room_" + room.id}
            className="flex overflow-x-scroll no-scrollbar items-center gap-4 p-2 justify-start cursor-pointer transition hover:bg-lime-700 text-lime-300 rounded-md"
          >
            <RoomAvatar size={24} chatroom={room} currentUser={currentUser} />

            {room.name}

            {notificationContext?.recentChatNotifications[room.id] !==
              undefined &&
              notificationContext.recentChatNotifications[room.id] > 0 && (
                <div className="ml-auto grid place-content-center flex-shrink-0 rounded-full w-6 h-6 bg-red-500 text-white p-1">
                  <p>{notificationContext?.recentChatNotifications[room.id]}</p>
                </div>
              )}
          </div>
        );
      });
  }, [chatRooms, currentUser, notificationContext]);

  const isLightMode = useIsLightMode();

  return (
    <div className="bg-lime-600 p-4 h-[90vh] md:h-[80vh] min-w-[70vw] max-w-[90vw] overflow-y-scroll relative rounded-md flex flex-col gap-2">
      <PrimaryInput
        placeholder="Search User or Chatroom..."
        customStylesInput="w-full h-[4rem] bg-lime-700 text-xl"
        type="text"
        id="conversationSearchInput"
        onChange={(e) => setQueryDebounced(e.target.value)}
      />

      {queryDebounced.length >= 1 &&
        !searchMutation.isPending &&
        !searchRoomMutation.isPending &&
        searchedUserEntries.length === 0 &&
        searchedRoomEntries.length === 0 && (
          <div className="grid place-content-center w-full h-full">
            <div className="flex justify-center text-lime-400">
              <FaFeatherPointed size={128} />
            </div>

            <div className="text-center text-lime-400 text-2xl">
              ..Where to?
            </div>
            <div className="text-sm text-lime-400">
              <span className="font-bold text-lime-700 mr-2">PROTIP:</span>
              Search at least 2 characters for meaningful results, or include
              #id {"(ex). #100)"} to search exactly by id
            </div>
          </div>
        )}

      {queryDebounced.length >= 2 &&
        (searchMutation.isPending || searchRoomMutation.isPending) && (
          <div className="absolute top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] animate-fadeIn">
            <ClipLoader color={!isLightMode ? "white" : "rgb(77,124,15)"} />
          </div>
        )}
      {currentUser ? (
        queryDebounced.length >= 1 ? (
          <div
            key={"searchedUserEntries"}
            className="animate-fadeIn flex flex-col mt-2"
          >
            {searchedUserEntries}
            {searchedRoomEntries}
          </div>
        ) : (
          <div
            key={"mainEntries"}
            className="animate-fadeIn w-full h-full flex flex-col"
          >
            <p className="font-bold text-lg text-lime-400">Direct Messages</p>
            <hr className="text-lime-400 bg-lime-400 border-lime-400 mx-[-1rem]" />
            <div className="h-full overflow-y-scroll overflow-x-hidden mt-2">
              {directMessageEntries}
            </div>
            <p className="font-bold text-lg text-lime-400">Chatrooms</p>

            <hr className="text-lime-400 bg-lime-400 border-lime-400 mx-[-1rem]" />
            <div className="h-full overflow-y-scroll overflow-x-hidden mt-2">
              {chatRoomEntries}
            </div>

            <p className="font-bold text-lg text-lime-400">Friends</p>
            <hr className="text-lime-400 bg-lime-400 border-lime-400 mx-[-1rem]" />
            <div className="h-full overflow-y-scroll overflow-x-hidden mt-2">
              {friendsEntries}
            </div>

            <p className="font-bold text-lg text-lime-400">Explore</p>

            <hr className="text-lime-400 bg-lime-400 border-lime-400 mx-[-1rem]" />
            <div className="h-full overflow-y-scroll overflow-x-hidden mt-2">
              {youMayKnowEntries}
            </div>
          </div>
        )
      ) : (
        <>
          <div className="grid place-content-center text-lime-400 animate-fadeIn">
            Data has not been loaded yet. Please wait or re-open the dialog!
          </div>
        </>
      )}
    </div>
  );
}
