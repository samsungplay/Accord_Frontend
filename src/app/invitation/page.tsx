"use client";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/api";
import { useMutation, useQuery } from "@tanstack/react-query";
import { GiPeaceDove } from "react-icons/gi";
import { User } from "../types/User";
import RoomAvatar from "../components/RoomAvatar";
import { ChatRoom } from "../types/ChatRoom";
import GenericUtil from "../util/GenericUtil";
import PrimaryButton from "../components/PrimaryButton";
import { IoIosLeaf } from "react-icons/io";
import { MdError } from "react-icons/md";

export default function InvitationPage() {
  const searchParams = useSearchParams();

  const currentUser = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const response = await api.get<User>("/users");
      return { data: response.data };
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const invitationData = useQuery({
    queryKey: ["chatroom_invitation", "data"],
    queryFn: async () => {
      const response = await api.get<ChatRoom>(
        `/chatrooms/invitationData/${searchParams.get("code")}`
      );
      if (response.status !== 200) {
        return {
          data: undefined,
        };
      }
      return {
        data: response.data,
      };
    },
    refetchOnMount: true,
  });

  const ownerDisplayName = useMemo(() => {
    if (invitationData.data?.data) {
      const owner = invitationData.data.data.participants.find(
        (p) => p.id === invitationData.data.data?.ownerId
      );
      if (!owner) {
        return "";
      }
      return owner?.nickname.length ? owner.nickname : owner?.username;
    }

    return "";
  }, [invitationData.data?.data]);

  const [error, setError] = useState("");

  const router = useRouter();

  const acceptInvitationMutation = useMutation({
    mutationFn: () => {
      return api.post(`/chatrooms/invitation/${searchParams.get("code")}`);
    },
    onSettled(data) {
      if (data?.status === 200 && invitationData.data?.data) {
        router.replace(`/dashboard/chatroom/${invitationData.data?.data.id}`);
      } else if (data) {
        setError(data.data);
      }
    },
  });

  useEffect(() => {
    if (
      invitationData.data?.data &&
      currentUser.data?.data &&
      invitationData.data.data.participants.find(
        (e) => e.id === currentUser.data?.data.id
      )
    ) {
      setError(
        "You are already a member of this chatroom: " +
          GenericUtil.computeChatRoomName(
            invitationData.data.data,
            currentUser.data?.data
          )
      );
    }
  }, [invitationData.data?.data, currentUser.data?.data]);
  const handleAcceptInvitation = useCallback(() => {
    if (!acceptInvitationMutation.isPending && invitationData.data?.data) {
      acceptInvitationMutation.mutate();
    }
  }, [acceptInvitationMutation, invitationData.data?.data]);

  const [joinClicked, setJoinClicked] = useState(false);

  return (
    <div className="grid place-content-center w-full h-full text-lime-300 animate-fadeIn">
      {error.length ? (
        <div className="items-center flex animate-fadeIn justify-center text-xl md:text-3xl text-red-500 gap-2">
          <MdError />

          {error}
        </div>
      ) : (
        <></>
      )}

      {(invitationData.isLoading || !currentUser.data?.data) &&
      !error.length ? (
        <div className="items-center animate-fadeIn flex justify-center text-xl md:text-3xl">
          Loading data, please wait...
        </div>
      ) : (
        <></>
      )}
      {!invitationData.isLoading &&
        !invitationData.data?.data &&
        currentUser.data?.data &&
        !error.length && (
          <div className="animate-fadeIn">
            <div className="text-center flex justify-center mb-4 z-10 sm:hidden">
              <GiPeaceDove size={64} />
            </div>
            <div className="text-center justify-center mb-4 z-10 hidden sm:flex">
              <GiPeaceDove size={128} />
            </div>
            <p className="text-center text-lg md:text-2xl">
              This invitation is invalid or has expired.
            </p>
          </div>
        )}
      {!invitationData.isLoading &&
        invitationData.data?.data &&
        currentUser.data?.data &&
        !error.length && (
          <div className="p-4 rounded-md bg-lime-600 flex flex-col gap-2 items-center animate-fadeIn">
            <div className="text-center flex justify-center mb-4 z-10 sm:hidden">
              <RoomAvatar
                size={64}
                chatroom={invitationData.data.data}
                currentUser={currentUser.data.data}
              />
            </div>
            <div className="text-center justify-center mb-4 z-10 hidden sm:flex">
              <RoomAvatar
                size={128}
                chatroom={invitationData.data.data}
                currentUser={currentUser.data.data}
              />
            </div>

            <p className="text-lg md:text-2xl">
              {GenericUtil.computeChatRoomName(
                invitationData.data.data,
                currentUser.data.data
              )}
            </p>

            {ownerDisplayName.length && (
              <p className="text-base text-lime-700 md:text-xl">
                Owned by{" "}
                <span className="font-bold text-lime-400">
                  {ownerDisplayName}
                </span>
              </p>
            )}

            <div className="flex items-center gap-2">
              <p className="text-base md:text-xl">
                {invitationData.data.data.participants.length} Participants
              </p>
              <p className="text-base md:text-xl text-lime-200">|</p>
              <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-lime-500"></div>
              <p className="text-base md:text-xl">
                {
                  invitationData.data.data.participants.filter(
                    (p) => p.status.toUpperCase() === "ONLINE"
                  ).length
                }{" "}
                Online
              </p>
            </div>

            <PrimaryButton
              customStyles="bg-lime-500 text-base md:text-xl"
              onclick={() => {
                setJoinClicked(true);
                handleAcceptInvitation();
              }}
              disabled={joinClicked}
            >
              <div className="flex items-center justify-center gap-2">
                <IoIosLeaf />
                Join
              </div>
            </PrimaryButton>
          </div>
        )}
    </div>
  );
}
