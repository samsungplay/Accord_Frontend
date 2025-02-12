"use client";
import { useEffect, useMemo, useRef } from "react";
import { BsFillMoonFill, BsMicMuteFill } from "react-icons/bs";
import { CgBlock } from "react-icons/cg";
import { FaCircle } from "react-icons/fa";
import Constants from "../constants/Constants";
import { User } from "../types/User";
import React from "react";
import { TbHeadphonesOff } from "react-icons/tb";
import { useQuery } from "@tanstack/react-query";
import api from "../api/api";
import DefaultProfileIcon from "./DefaultProfileIcon";

type ProfileAvatarType = {
  user: User;
  showStatus?: boolean;
  profileImagePlaceholder?: string | FileList;
  size?: number;
  secondaryUser?: User;
  showMute?: boolean;
  showDeafen?: boolean;
  customAnimation?: string;
  showStrike?: boolean;
};
export default function ProfileAvatar({
  user,
  showStatus = false,
  profileImagePlaceholder = "default",
  size = 64,
  secondaryUser,
  showMute,
  customAnimation = "animate-none",
  showDeafen,
  showStrike,
}: ProfileAvatarType) {
  const imageRef = useRef<HTMLImageElement>(null);

  const statuses = useMemo((): { [key: string]: React.ReactNode } => {
    return {
      ONLINE: (
        <div className="flex items-center gap-2">
          {" "}
          <div className="text-lime-500">
            <FaCircle size={size / 4} />
          </div>
        </div>
      ),
      IDLE: (
        <div className="flex items-center gap-2">
          {" "}
          <div className="text-yellow-500">
            <BsFillMoonFill size={size / 4} />
          </div>
        </div>
      ),
      DO_NOT_DISTURB: (
        <div className="flex items-center gap-2">
          {" "}
          <div className="text-red-500">
            <CgBlock size={size / 4} />
          </div>
        </div>
      ),
      INVISIBLE: (
        <div className="flex items-center gap-2">
          {" "}
          <div className="text-gray-200">
            <FaCircle size={size / 4} />
          </div>
        </div>
      ),
      OFFLINE: (
        <div className="flex items-center gap-2">
          {" "}
          <div className="text-gray-200">
            <FaCircle size={size / 4} />
          </div>
        </div>
      ),
      NATURAL_IDLE: (
        <div className="flex items-center gap-2">
          {" "}
          <div className="text-yellow-500">
            <BsFillMoonFill size={size / 4} />
          </div>
        </div>
      ),
    };
  }, [size]);

  useEffect(() => {
    if (
      profileImagePlaceholder &&
      profileImagePlaceholder instanceof FileList
    ) {
      const file = profileImagePlaceholder[0];
      const fr = new FileReader();
      fr.onload = () => {
        if (imageRef.current && fr.result)
          imageRef.current.src = fr.result.toString();
      };
      fr.readAsDataURL(file);
    }
  }, [profileImagePlaceholder]);

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

  const blockers = useQuery({
    queryKey: ["blockers"],
    queryFn: async () => {
      const response = await api.get<User[]>("/users/blockers");
      return {
        data: response.data,
      };
    },
    refetchOnMount: false,
  });

  return (
    <div>
      <div
        className={`relative w-fit z-0 ${
          (showStrike ||
            (blockeds.data &&
              blockeds.data.data.find((e) => e.id === user.id)) ||
            (blockers.data &&
              blockers.data.data.find((e) => e.id === user.id))) &&
          "opacity-50"
        }`}
      >
        {(showStrike ||
          (blockeds.data && blockeds.data.data.find((e) => e.id === user.id)) ||
          (blockers.data &&
            blockers.data.data.find((e) => e.id === user.id))) && (
          <div className="absolute w-[120%] h-[0.2rem] translate-x-[-5%] rounded-md bg-gray-500 top-[50%] origin-center rotate-[-45deg]"></div>
        )}

        {profileImagePlaceholder === "default" &&
          (user?.profileImageUrl?.length ?? 0) <= 0 && (
            <div className={customAnimation}>
              <DefaultProfileIcon
                size={size}
                backgroundHexcode={user?.profileColor ?? "#84CC16"}
              />
            </div>
          )}
        {profileImagePlaceholder !== "default" &&
          (user?.profileImageUrl?.length ?? 0) === 0 && (
            <img
              className="rounded-full object-cover max-w-none"
              ref={imageRef}
              src=""
              style={{
                width: size.toString() + "px",
                height: size.toString() + "px",
              }}
            />
          )}
        {(user?.profileImageUrl?.length ?? 0) > 0 && (
          <img
            className="rounded-full w-[4rem] h-[4rem] object-cover max-w-none"
            src={Constants.SERVER_STATIC_CONTENT_PATH + user.profileImageUrl!}
            style={{
              width: size.toString() + "px",
              height: size.toString() + "px",
            }}
          />
        )}
        {showStatus && (
          <div className="absolute shadow-sm rounded-full bottom-[0.1rem] right-[0.1rem]">
            {statuses[user?.status ?? "OFFLINE"]}
          </div>
        )}

        {(showMute || showDeafen) && !showStatus && (
          <div className="absolute flex justify-center items-center shadow-lg text-black rounded-full bg-red-500 bottom-[-0.15rem] right-[-0.15rem]">
            {showMute && (
              <div className="flex items-center gap-2">
                {" "}
                <div className="text-white p-1">
                  <BsMicMuteFill size={size / 4} />
                </div>
              </div>
            )}

            {showDeafen && (
              <div className="flex items-center gap-2">
                {" "}
                <div className="text-white p-1">
                  <TbHeadphonesOff size={size / 4} />
                </div>
              </div>
            )}
          </div>
        )}

        {secondaryUser && (
          <div className="absolute top-[25%] left-[25%]">
            {profileImagePlaceholder === "default" &&
              (secondaryUser?.profileImageUrl?.length ?? 0) <= 0 && (
                <div>
                  <DefaultProfileIcon
                    size={size}
                    backgroundHexcode={secondaryUser?.profileColor ?? "#84CC16"}
                  />
                </div>
              )}
            {profileImagePlaceholder !== "default" &&
              (secondaryUser?.profileImageUrl?.length ?? 0) === 0 && (
                <img
                  className="rounded-full object-cover max-w-none"
                  ref={imageRef}
                  src=""
                  style={{
                    width: size.toString() + "px",
                    height: size.toString() + "px",
                  }}
                />
              )}
            {(secondaryUser?.profileImageUrl?.length ?? 0) > 0 && (
              <img
                className="rounded-full w-[4rem] h-[4rem] object-cover max-w-none"
                src={
                  Constants.SERVER_STATIC_CONTENT_PATH +
                  secondaryUser?.profileImageUrl
                }
                style={{
                  width: size.toString() + "px",
                  height: size.toString() + "px",
                }}
              />
            )}

            {showStatus && (
              <div className="absolute shadow-sm rounded-full bottom-[0.1rem] right-[0.1rem]">
                {statuses[secondaryUser?.status ?? "OFFLINE"]}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
