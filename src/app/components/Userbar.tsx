"use client";
import { useContext, useMemo, useRef, useState } from "react";
import { BsFillMoonFill, BsMicFill, BsMicMuteFill } from "react-icons/bs";
import { CgBlock } from "react-icons/cg";
import { FaCircle } from "react-icons/fa";
import { Popover } from "react-tiny-popover";
import { User } from "../types/User";
import ProfileAvatar from "./ProfileAvatar";
import Usercard from "./Usercard";
import React from "react";
import { TbHeadphonesFilled, TbHeadphonesOff } from "react-icons/tb";
import CallContext from "../contexts/CallContext";

type UserbarType = {
  user: User;
};

export default function Userbar({ user }: UserbarType) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const callContext = useContext(CallContext);

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
  return (
    <div
      ref={ref}
      className="relative p-2 gap-2 text-white items-center flex cursor-pointer hover:bg-lime-700 rounded-md transition w-[15rem]"
    >
      <Popover
        containerStyle={{
          zIndex: 40,
        }}
        onClickOutside={(e: MouseEvent) => {
          const candidate1 = (e.target as HTMLElement).parentNode?.parentNode
            ?.parentNode;
          const candidate2 = candidate1?.parentNode;

          if (!candidate1 || !candidate2) {
            setShowUserMenu(false);
          }

          if (
            !(
              (candidate1 as HTMLElement).className.startsWith("menu") ||
              (candidate2 as HTMLElement).className.startsWith("menu")
            )
          ) {
            setShowUserMenu(false);
          }
        }}
        content={
          <div className="flex flex-col mb-2 text-white">
            <Usercard user={user} showEditProfileButton={true} />
          </div>
        }
        isOpen={showUserMenu}
        positions={["top"]}
      >
        <div
          className="flex flex-row gap-2 w-full items-center"
          onClick={() => setShowUserMenu((prev) => !prev)}
        >
          <ProfileAvatar
            user={user}
            size={36}
            showMute={user.isCallMuted}
            showDeafen={user.isDeafened}
          />

          <div className="flex flex-col w-full">
            <p
              className="text-white max-w-[12ch]"
              style={{
                overflowWrap: "anywhere",
              }}
            >
              {user.username + "#" + user.id}
            </p>
            <div className="text-sm text-lime-500">{statuses[user.status]}</div>
          </div>
          <div
            onClick={(e) => {
              e.stopPropagation();
              callContext?.handleToggleMute(!user.isCallMuted);
            }}
            className="text-white transition cursor-pointer hover:text-lime-400"
          >
            {!user.isCallMuted ? (
              <BsMicFill size={18} />
            ) : (
              <BsMicMuteFill size={18} />
            )}
          </div>
          <div
            onClick={(e) => {
              e.stopPropagation();
              callContext?.handleToggleDeafen(!user.isDeafened);
            }}
            className="text-white cursor-pointer hover:text-red-500"
          >
            {user.isDeafened ? (
              <TbHeadphonesOff size={18} />
            ) : (
              <TbHeadphonesFilled size={18} />
            )}
          </div>
        </div>
      </Popover>
    </div>
  );
}
