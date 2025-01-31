"use client";
import { RenderElementProps } from "slate-react";
import React, { useMemo, useState } from "react";
import { ChatRoom } from "../types/ChatRoom";
import { User } from "../types/User";
import { Popover } from "react-tiny-popover";
import Usercard from "./Usercard";

type MentionBlockType = {
  currentChatRoom: ChatRoom;
  currentUser: User;
};
export default function MentionBlock({
  attributes,
  children,
  element,
  currentChatRoom,
  currentUser,
}: RenderElementProps & MentionBlockType) {
  const [open, setOpen] = useState(false);
  const user = useMemo(() => {
    if (element.content === "-100") {
      return {
        id: -100,
        email: "everyone@accord.com",
        birthDate: new Date(),
        status: "ONLINE",
        statusMessage: "",
        profileImageUrl: null,
        profileColor: "#84CC16",
        nickname: "everyone",
        username: "everyone",
      };
    }
    if (element.content === currentUser.id.toString()) {
      return currentUser;
    }
    const user = currentChatRoom.participants.filter(
      (user) => user.id.toString() === element.content
    )[0];
    if (!user) {
      return undefined;
    }
    return user;
  }, [currentChatRoom, currentUser, element]);

  return (
    <Popover
      isOpen={open}
      reposition={true}
      positions={["top", "bottom"]}
      containerStyle={{
        zIndex: "25",
      }}
      content={
        <div className="animate-popOut mb-[1rem] ml-[1rem]">
          {user && user.id !== -100 ? (
            <Usercard
              user={user as User}
              chatRoomId={currentChatRoom?.id.toString()}
            />
          ) : (
            <></>
          )}
        </div>
      }
      onClickOutside={() => setOpen(false)}
    >
      <span
        {...attributes}
        className={`group font-mono w-[95%] px-2 mx-1 bg-lime-700 text-lime-400 rounded-full relative ${
          user && user.id !== -100 ? "cursor-pointer" : "cursor-default"
        }
      hover:bg-opacity-70 transition`}
        onClick={() => {
          if (user && user.id !== -100) {
            setOpen(true);
          }
        }}
      >
        <span className="hidden">{children}</span>@
        {user
          ? user.nickname.length > 0
            ? user.nickname
            : user.username
          : "..."}
      </span>
    </Popover>
  );
}
