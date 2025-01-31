"use client";
import { Popover } from "react-tiny-popover";
import { User } from "../types/User";
import ProfileAvatar from "./ProfileAvatar";
import React, { useMemo, useState } from "react";
import Usercard from "./Usercard";
type ProfileBarType = {
  user: User;
  children?: React.ReactNode;
  showStatus?: boolean;
};
export default function ProfileBar({
  user,
  children = undefined,
  showStatus = false,
}: ProfileBarType) {
  let nickname = user?.nickname ?? "";
  if (nickname.length == 0) {
    nickname = user?.username ?? "";
  }
  const statusDictionary: {
    [key: string]: string;
  } = useMemo(() => {
    return {
      ONLINE: "Online",
      OFFLINE: "Offline",
      INVISIBLE: "Offline",
      NATURAL_IDLE: "Idle",
      IDLE: "Idle",
      DO_NOT_DISTURB: "Do not disturb",
    };
  }, []);
  let statusMessage = statusDictionary[user.status];
  if (user.statusMessage?.length || 0 > 0) {
    statusMessage = user.statusMessage!;
  }

  const [openUsercard, setOpenUsercard] = useState(false);
  return (
    <div
      key={user.username + "#" + user.id}
      className="group flex px-4 text-lime-300 items-center border-solid border-t-2 border-lime-400 hover:bg-lime-600 transition cursor-pointer h-fit p-4"
    >
      <ProfileAvatar size={36} user={user} showStatus={showStatus} />

      <div className="flex-col ml-3">
        <div className="flex">
          <Popover
            containerStyle={{
              zIndex: "50",
            }}
            isOpen={openUsercard}
            reposition={true}
            positions={["top", "bottom"]}
            content={
              <div className="animate-popOut mb-[1rem] ml-[1rem]">
                <Usercard user={user} />
              </div>
            }
            onClickOutside={() => {
              setOpenUsercard(false);
            }}
          >
            <p
              onClick={() => setOpenUsercard(true)}
              className="max-w-[7.5em] sm:max-w-[20em] overflow-ellipsis break-words hover:underline transition hover:text-lime-200 cursor-pointer"
            >
              {nickname}
            </p>
          </Popover>{" "}
          <div className="hidden sm:block">
            <p className="ml-4 hidden group-hover:inline text-lime-400">
              {user?.username}
              <span className="text-gray-200">{"#" + user?.id}</span>
            </p>
          </div>
        </div>

        <p className="text-lime-400 text-xs sm:text-sm max-w-[7.5em] sm:max-w-[20em] break-words">
          {statusMessage}
        </p>
      </div>

      <div></div>

      {children}
    </div>
  );
}
