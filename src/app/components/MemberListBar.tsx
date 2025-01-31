import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { FaCrown } from "react-icons/fa";
import { Popover } from "react-tiny-popover";
import api from "../api/api";
import { ChatRoom } from "../types/ChatRoom";
import { User } from "../types/User";
import ProfileAvatar from "./ProfileAvatar";
import Usercard from "./Usercard";
import React from "react";
import { IoShield } from "react-icons/io5";
type MemberListBarType = {
  user: User;
  currentUser: User;
  currentChatRoom: ChatRoom;
};
export default function MemberListBar({
  user,
  currentUser,
  currentChatRoom,
}: MemberListBarType) {
  const [openUserCard, setOpenUserCard] = useState(false);

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

  const isBlockedsMember = useMemo(() => {
    return blockeds.data?.data.find((user_) => user_.id === user.id);
  }, [blockeds, user]);

  return (
    <div className="flex flex-nowrap gap-4 hover:bg-lime-700 transition p-2 rounded-md items-center cursor-default">
      <ProfileAvatar
        user={user.id === currentUser.id ? currentUser : user}
        size={36}
        showStatus
      />
      <div className="flex flex-nowrap flex-col">
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              {" "}
              {!currentChatRoom.direct1to1Identifier &&
              currentChatRoom.ownerId === user.id ? (
                <FaCrown size={12} />
              ) : (
                <></>
              )}
              {!currentChatRoom.direct1to1Identifier &&
              currentChatRoom.modIds?.length &&
              currentChatRoom.modIds.includes(user.id) ? (
                <IoShield size={12} />
              ) : (
                <></>
              )}
              <Popover
                isOpen={openUserCard}
                positions={["left", "bottom"]}
                reposition={true}
                containerStyle={{
                  zIndex: 50,
                }}
                content={
                  <div className="animate-popOut mb-[1rem] ml-[1rem]">
                    <Usercard
                      user={user}
                      chatRoomId={currentChatRoom?.id.toString()}
                    />
                  </div>
                }
                onClickOutside={() => setOpenUserCard(false)}
              >
                <p
                  onClick={() => {
                    setOpenUserCard(!openUserCard);
                  }}
                  className={`cursor-pointer hover:underline transition hover:text-opacity-70 ${
                    isBlockedsMember && "text-lime-800 line-through"
                  }`}
                >
                  {user.nickname && user.nickname.length > 0
                    ? user.nickname
                    : user.username}
                </p>
              </Popover>
            </div>

            <p className="text-xs text-white break-words max-w-[10rem]">
              {user.statusMessage}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
