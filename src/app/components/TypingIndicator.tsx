import React, { useEffect, useMemo, useRef } from "react";
import { BeatLoader } from "react-spinners";
import GenericUtil from "../util/GenericUtil";
import { ChatRoom } from "../types/ChatRoom";
import { User } from "../types/User";
import ProfileAvatar from "./ProfileAvatar";
export default function TypingIndicator({
  isLightMode,
  currentChatRoom,
  typingUserIds,
}: {
  isLightMode: boolean;
  currentChatRoom: ChatRoom;
  typingUserIds: Set<number>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let scrollDirection = 1;
    const scrollContent = () => {
      if (containerRef.current) {
        if (scrollDirection === 1) {
          containerRef.current.scrollLeft += 2;
          if (
            containerRef.current.scrollLeft >=
            containerRef.current.scrollWidth - containerRef.current.clientWidth
          ) {
            scrollDirection = -1;
          }
        } else {
          containerRef.current.scrollLeft -= 2;
          if (containerRef.current.scrollLeft <= 0) {
            scrollDirection = 1;
          }
        }
      }
    };

    const interval = setInterval(scrollContent, 50);

    return () => clearInterval(interval);
  }, []);
  const typingUsers = useMemo(() => {
    const users: User[] = [];
    const participantIdToParticipantMap = new Map<number, User>();
    currentChatRoom.participants.forEach((p) =>
      participantIdToParticipantMap.set(p.id, p)
    );

    for (const userId of typingUserIds) {
      if (participantIdToParticipantMap.has(userId)) {
        users.push(participantIdToParticipantMap.get(userId)!);
      }
    }

    if (users.length === 1) {
      return (
        <div className="flex items-center gap-1 whitespace-nowrap">
          <ProfileAvatar user={users[0]} size={GenericUtil.remToPx(0.75)} />
          {users[0].nickname.length ? users[0].nickname : users[0].username} is
          typing...
        </div>
      );
    } else if (users.length === 2) {
      return (
        <div className="flex items-center gap-1 whitespace-nowrap">
          <ProfileAvatar user={users[0]} size={GenericUtil.remToPx(0.75)} />
          {users[0].nickname.length ? users[0].nickname : users[0].username} and
          <ProfileAvatar user={users[0]} size={GenericUtil.remToPx(0.75)} />
          {users[1].nickname.length ? users[1].nickname : users[1].username} are
          typing...
        </div>
      );
    } else if (users.length >= 3) {
      return (
        <div className="flex items-center gap-1 whitespace-nowrap">
          <ProfileAvatar user={users[0]} size={GenericUtil.remToPx(0.75)} />
          {users[0].nickname.length ? users[0].nickname : users[0].username},
          <ProfileAvatar user={users[0]} size={GenericUtil.remToPx(0.75)} />
          {users[1].nickname.length
            ? users[1].nickname
            : users[1].username} and {users.length - 2} other(s) are typing...
        </div>
      );
    }

    return <></>;
  }, [typingUserIds, currentChatRoom.participants]);
  return (
    <div
      ref={containerRef}
      className="bg-lime-500 animate-fadeInUpHalfOpacity overflow-x-scroll no-scrollbar cursor-default text-sm opacity-50 transition text-white px-2 justify-start flex items-center gap-2 h-fit w-[96%] shadow-md rounded-md z-10"
    >
      <BeatLoader
        color={isLightMode ? "rgb(77,124,15)" : "white"}
        size={GenericUtil.remToPx(0.5)}
      />
      {typingUsers}
    </div>
  );
}
