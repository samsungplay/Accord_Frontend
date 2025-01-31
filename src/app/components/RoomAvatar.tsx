import React, { useMemo } from "react";
import { ChatRoom } from "../types/ChatRoom";
import ProfileAvatar from "./ProfileAvatar";
import Constants from "../constants/Constants";
import { User } from "../types/User";

import { RiSpamFill } from "react-icons/ri";

export default function RoomAvatar({
  chatroom,
  isSpamRoom,
  size,
  currentUser,
  roomImagePlaceholder,
  showStatus = true,
}: {
  chatroom: ChatRoom;
  isSpamRoom?: boolean;
  size: number;
  currentUser?: User;
  roomImagePlaceholder?: string;
  showStatus?: boolean;
}) {
  const defaultAvatar = useMemo(() => {
    return (
      <>
        {chatroom.participants.length >= 3 && (
          <ProfileAvatar
            user={chatroom.participants[0]}
            size={size}
            secondaryUser={chatroom.participants[1]}
          />
        )}
        {chatroom.participants.length === 2 && (
          <ProfileAvatar
            user={
              chatroom.participants[0].id === currentUser?.id
                ? chatroom.participants[1]
                : chatroom.participants[0]
            }
            size={size}
            showStatus={showStatus}
          />
        )}
        {chatroom.participants.length == 1 && (
          <ProfileAvatar user={chatroom.participants[0]} size={size} />
        )}
      </>
    );
  }, [chatroom.participants, size]);

  const avatar = useMemo(() => {
    if (isSpamRoom) {
      return <RiSpamFill size={size} />;
    }
    if (roomImagePlaceholder) {
      if (roomImagePlaceholder === "default") {
        return defaultAvatar;
      } else {
        return (
          <img
            className="rounded-full w-[4rem] h-[4rem] object-cover"
            src={roomImagePlaceholder}
            style={{
              width: size.toString() + "px",
              height: size.toString() + "px",
            }}
          />
        );
      }
    } else {
      if (chatroom.roomImage) {
        return (
          <img
            className="rounded-full w-[4rem] h-[4rem] object-cover"
            src={Constants.SERVER_STATIC_CONTENT_PATH + chatroom.roomImage}
            style={{
              width: size.toString() + "px",
              height: size.toString() + "px",
            }}
          />
        );
      } else {
        return defaultAvatar;
      }
    }
  }, [chatroom, roomImagePlaceholder, size, isSpamRoom, defaultAvatar]);
  return avatar;
}
