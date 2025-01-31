import React, { useContext, useState } from "react";
import { IoPersonSharp, IoPeopleSharp } from "react-icons/io5";
import ModalUtils from "../util/ModalUtil";
import ProfileAvatar from "./ProfileAvatar";
import { User } from "../types/User";
import ModalContext from "../contexts/ModalContext";
import { Popover } from "react-tiny-popover";
import Usercard from "./Usercard";

export default function ConversationSearchUIUserEntry({
  handleCreate1to1Chatroom,
  user: p,
  friends,
  allParticipants,
  showYouMayKnowTag,
}: {
  handleCreate1to1Chatroom: (username: string) => void;
  user: User;
  friends?: User[];
  allParticipants?: User[];
  showYouMayKnowTag?: boolean;
}) {
  const modalContext = useContext(ModalContext);
  const [openUsercard, setOpenUsercard] = useState(false);

  return (
    <Popover
      containerStyle={{
        zIndex: 105,
      }}
      isOpen={openUsercard}
      reposition={true}
      positions={["top", "bottom"]}
      content={
        <div className="animate-popOut mb-[1rem] ml-[1rem]">
          <Usercard user={p} />
        </div>
      }
      onClickOutside={() => {
        setOpenUsercard(false);
      }}
    >
      <div
        onClick={() => {
          ModalUtils.closeCurrentModal(modalContext);
          handleCreate1to1Chatroom(p.username + "@" + p.id);
        }}
        className="flex overflow-x-scroll no-scrollbar items-center group gap-4 p-2 justify-start cursor-pointer transition hover:bg-lime-700 text-lime-300 rounded-md"
      >
        <ProfileAvatar user={p} size={24} />
        <p
          className="transition hover:underline cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            setOpenUsercard(true);
          }}
        >
          {p.nickname.length ? p.nickname : p.username}
        </p>
        <p className="text-lime-700 group-hover:text-lime-500 ">
          {p.username + "#" + p.id}
        </p>
        {friends?.find((e) => e.id === p.id) ? (
          <div className="rounded-lg bg-lime-700 group-hover:bg-lime-500 px-2 flex items-center justify-center gap-2">
            <IoPersonSharp />
            Friend
          </div>
        ) : (
          allParticipants?.find((e) => e.id === p.id) && (
            <div className="rounded-lg bg-lime-700 group-hover:bg-lime-500 px-2 flex items-center justify-center gap-2">
              <IoPeopleSharp />
              Group
            </div>
          )
        )}
        {showYouMayKnowTag && (
          <div className="rounded-lg bg-lime-700 whitespace-nowrap group-hover:bg-lime-500 px-2">
            You May Know
          </div>
        )}
      </div>
    </Popover>
  );
}
