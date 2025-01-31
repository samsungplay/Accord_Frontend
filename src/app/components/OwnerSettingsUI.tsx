"use client";
import React, { useCallback, useContext, useMemo } from "react";

import Spinner from "./Spinner";
import { IoPerson } from "react-icons/io5";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChatRoomRoleSettings } from "../types/ChatRoomRoleSettings";
import api from "../api/api";
import ModalContext from "../contexts/ModalContext";
import queryClient from "../query/QueryClient";
import ModalUtils from "../util/ModalUtil";
import { ChatRoom } from "../types/ChatRoom";
import { IoIosUnlock } from "react-icons/io";
import PrimarySwitch from "./PrimarySwitch";

export default function OwnerSettingsUI({
  currentChatRoomId,
  isCurrentChatRoomPublic,
}: {
  currentChatRoomId: number;
  isCurrentChatRoomPublic?: boolean;
}) {
  const modalContext = useContext(ModalContext);

  const roomOpenPublicMutation = useMutation({
    mutationFn: (open: boolean) => {
      return api.post("/chatrooms/openPublic/" + currentChatRoomId, undefined, {
        params: {
          open,
        },
      });
    },
    onSettled(data, error, open) {
      if (data?.status === 200) {
        queryClient.setQueryData(
          ["chatroom_dm", currentChatRoomId.toString()],
          (prev: { data: ChatRoom }) => {
            if (!prev) return undefined;
            return {
              data: {
                ...prev.data,
                isPublic: open,
              },
            };
          }
        );
      } else if (data) {
        ModalUtils.handleGenericError(modalContext, data);
      }
    },
  });
  const roleSettings = useQuery({
    queryKey: ["role_settings", currentChatRoomId.toString()],
    queryFn: async () => {
      const response = await api.get<ChatRoomRoleSettings>(
        `/chatrooms/roleSettings/${currentChatRoomId}`
      );
      return {
        data: response.data,
      };
    },
  });

  const updateRoleSettingsMutation = useMutation({
    mutationFn: (settings: ChatRoomRoleSettings) => {
      return api.post("/chatrooms/roleSettings", settings);
    },
    onSettled(data, err, variables) {
      if (data?.status === 200) {
        queryClient.setQueryData(
          ["role_settings", currentChatRoomId.toString()],
          () => {
            return {
              data: {
                ...variables,
              },
            };
          }
        );
      } else if (data) {
        ModalUtils.handleGenericError(modalContext, data);
      }
    },
  });

  const handleUpdateRoleSettings = useCallback(
    (settings: ChatRoomRoleSettings) => {
      if (!updateRoleSettingsMutation.isPending) {
        updateRoleSettingsMutation.mutate(settings);
      }
    },
    [updateRoleSettingsMutation.isPending]
  );

  const roleNameMapping = useMemo(() => {
    return {
      owner: "Owner",
      mod: "Moderator",
      all: "All",
    };
  }, []);

  return (
    <div className="rounded-md flex flex-col bg-lime-600 shadow-md p-2 animate-fadeInUpFaster text-lime-300 overflow-y-scroll max-w-[90vw] max-h-[70vh]">
      <p className="font-bold text-lg">Owner Settings</p>
      <hr className="border-lime-300 text-lime-300 bg-lime-300 mx-[-0.5rem]" />

      <div className="flex items-center gap-2 mt-2">
        <IoPerson />
        <p className="text-base">Role Permissions</p>
      </div>

      <div className="flex mt-2 gap-2 md:items-center flex-col md:flex-row">
        <div className="flex flex-col gap-1">
          <p>Friends Invite</p>
          <p className="text-sm text-lime-700">
            Allow users to invite their friends.
          </p>
        </div>

        <div className="md:ml-auto">
          <Spinner
            placeholder="Select.."
            data={["Owner", "Moderator", "All"]}
            onSelected={(i) => {
              if (roleSettings.data?.data)
                handleUpdateRoleSettings({
                  ...roleSettings.data.data,
                  roleAllowFriendsInvite: ["owner", "mod", "all"][i] as
                    | "owner"
                    | "mod"
                    | "all",
                });
            }}
            width="9rem"
            id="friendsInviteSpinner"
            defaultValue={
              roleSettings.data?.data.roleAllowFriendsInvite
                ? roleNameMapping[roleSettings.data.data.roleAllowFriendsInvite]
                : "All"
            }
            selectedIndex_={["owner", "mod", "all"].indexOf(
              roleSettings.data?.data.roleAllowFriendsInvite ?? ""
            )}
            customInputStyles="bg-lime-700"
            customMenuButtonStyles="bg-lime-700"
            showSelected
            direction="down"
            rounded
          />
        </div>
      </div>

      <div className="flex mt-2 gap-2 md:items-center flex-col md:flex-row">
        <div className="flex flex-col gap-1">
          <p>Public Invite</p>
          <p className="text-sm text-lime-700">
            Allow users to generate/access public invitation links
          </p>
        </div>

        <div className="md:ml-auto">
          <Spinner
            placeholder="Select.."
            onSelected={(i) => {
              if (roleSettings.data?.data)
                handleUpdateRoleSettings({
                  ...roleSettings.data.data,
                  roleAllowPublicInvite: ["owner", "mod", "all"][i] as
                    | "owner"
                    | "mod"
                    | "all",
                });
            }}
            data={["Owner", "Moderator", "All"]}
            width="9rem"
            id="publicInviteSpinner"
            defaultValue={
              roleSettings.data?.data.roleAllowPublicInvite
                ? roleNameMapping[roleSettings.data.data.roleAllowPublicInvite]
                : "Moderator"
            }
            selectedIndex_={["owner", "mod", "all"].indexOf(
              roleSettings.data?.data.roleAllowPublicInvite ?? ""
            )}
            customInputStyles="bg-lime-700"
            customMenuButtonStyles="bg-lime-700"
            showSelected
            direction="up"
            rounded
          />
        </div>
      </div>

      <div className="flex mt-2 gap-2 md:items-center flex-col md:flex-row">
        <div className="flex flex-col gap-1">
          <p>Delete Message</p>
          <p className="text-sm text-lime-700">
            Allow users to delete other&apos;s messages (of lower or equal role)
          </p>
        </div>

        <div className="md:ml-auto">
          <Spinner
            placeholder="Select.."
            onSelected={(i) => {
              if (roleSettings.data?.data)
                handleUpdateRoleSettings({
                  ...roleSettings.data.data,
                  roleAllowDeleteMessage: ["owner", "mod", "all"][i] as
                    | "owner"
                    | "mod"
                    | "all",
                });
            }}
            data={["Owner", "Moderator", "All"]}
            width="9rem"
            id="deleteMessageSpinner"
            defaultValue={
              roleSettings.data?.data.roleAllowDeleteMessage
                ? roleNameMapping[roleSettings.data.data.roleAllowDeleteMessage]
                : "Moderator"
            }
            selectedIndex_={["owner", "mod", "all"].indexOf(
              roleSettings.data?.data.roleAllowDeleteMessage ?? ""
            )}
            customInputStyles="bg-lime-700"
            customMenuButtonStyles="bg-lime-700"
            showSelected
            direction="up"
            rounded
          />
        </div>
      </div>

      <div className="flex mt-2 gap-2 md:items-center flex-col md:flex-row">
        <div className="flex flex-col gap-1">
          <p>Kick User</p>
          <p className="text-sm text-lime-700">
            Allow users to kick others out of call or chatroom (of lower or
            equal role)
          </p>
        </div>

        <div className="md:ml-auto">
          <Spinner
            placeholder="Select.."
            onSelected={(i) => {
              if (roleSettings.data?.data)
                handleUpdateRoleSettings({
                  ...roleSettings.data.data,
                  roleAllowKickUser: ["owner", "mod", "all"][i] as
                    | "owner"
                    | "mod"
                    | "all",
                });
            }}
            data={["Owner", "Moderator", "All"]}
            width="9rem"
            id="kickUserSpinner"
            defaultValue={
              roleSettings.data?.data.roleAllowKickUser
                ? roleNameMapping[roleSettings.data.data.roleAllowKickUser]
                : "Moderator"
            }
            selectedIndex_={["owner", "mod", "all"].indexOf(
              roleSettings.data?.data.roleAllowKickUser ?? ""
            )}
            customInputStyles="bg-lime-700"
            customMenuButtonStyles="bg-lime-700"
            showSelected
            direction="up"
            rounded
          />
        </div>
      </div>

      <div className="flex mt-2 gap-2 md:items-center flex-col md:flex-row">
        <div className="flex flex-col gap-1">
          <p>Abort Call</p>
          <p className="text-sm text-lime-700">
            Allow users to forcefully end an ongoing call
          </p>
        </div>

        <div className="md:ml-auto">
          <Spinner
            placeholder="Select.."
            onSelected={(i) => {
              if (roleSettings.data?.data)
                handleUpdateRoleSettings({
                  ...roleSettings.data.data,
                  roleAllowAbortCall: ["owner", "mod", "all"][i] as
                    | "owner"
                    | "mod"
                    | "all",
                });
            }}
            data={["Owner", "Moderator", "All"]}
            width="9rem"
            id="abortCallSpinner"
            defaultValue={
              roleSettings.data?.data.roleAllowAbortCall
                ? roleNameMapping[roleSettings.data.data.roleAllowAbortCall]
                : "Owner"
            }
            selectedIndex_={["owner", "mod", "all"].indexOf(
              roleSettings.data?.data.roleAllowAbortCall ?? ""
            )}
            customInputStyles="bg-lime-700"
            customMenuButtonStyles="bg-lime-700"
            showSelected
            direction="up"
            rounded
          />
        </div>
      </div>

      <div className="flex mt-2 gap-2 md:items-center flex-col md:flex-row">
        <div className="flex flex-col gap-1">
          <p>Add Content</p>
          <p className="text-sm text-lime-700">
            Allow users to upload custom sounds, musics, or video background
          </p>
        </div>

        <div className="md:ml-auto">
          <Spinner
            placeholder="Select.."
            onSelected={(i) => {
              if (roleSettings.data?.data)
                handleUpdateRoleSettings({
                  ...roleSettings.data.data,
                  roleAllowAddContent: ["owner", "mod", "all"][i] as
                    | "owner"
                    | "mod"
                    | "all",
                });
            }}
            data={["Owner", "Moderator", "All"]}
            width="9rem"
            id="addContentSpinner"
            defaultValue={
              roleSettings.data?.data.roleAllowAddContent
                ? roleNameMapping[roleSettings.data.data.roleAllowAddContent]
                : "All"
            }
            selectedIndex_={["owner", "mod", "all"].indexOf(
              roleSettings.data?.data.roleAllowAddContent ?? ""
            )}
            customInputStyles="bg-lime-700"
            customMenuButtonStyles="bg-lime-700"
            showSelected
            direction="up"
            rounded
          />
        </div>
      </div>

      <div className="flex mt-2 gap-2 md:items-center flex-col md:flex-row">
        <div className="flex flex-col gap-1">
          <p>Delete Content</p>
          <p className="text-sm text-lime-700">
            Allow users to delete custom sounds, musics, or video background
          </p>
        </div>

        <div className="md:ml-auto">
          <Spinner
            placeholder="Select.."
            onSelected={(i) => {
              if (roleSettings.data?.data)
                handleUpdateRoleSettings({
                  ...roleSettings.data.data,
                  roleAllowDeleteContent: ["owner", "mod", "all"][i] as
                    | "owner"
                    | "mod"
                    | "all",
                });
            }}
            data={["Owner", "Moderator", "All"]}
            width="9rem"
            id="deleteContentSpinner"
            defaultValue={
              roleSettings.data?.data.roleAllowDeleteContent
                ? roleNameMapping[roleSettings.data.data.roleAllowDeleteContent]
                : "Moderator"
            }
            selectedIndex_={["owner", "mod", "all"].indexOf(
              roleSettings.data?.data.roleAllowDeleteContent ?? ""
            )}
            customInputStyles="bg-lime-700"
            customMenuButtonStyles="bg-lime-700"
            showSelected
            direction="up"
            rounded
          />
        </div>
      </div>
      <div className="flex mt-2 gap-2 md:items-center flex-col md:flex-row">
        <div className="flex flex-col gap-1">
          <p>Pin Messages</p>
          <p className="text-sm text-lime-700">
            Allow users to pin and unpin messages
          </p>
        </div>

        <div className="md:ml-auto">
          <Spinner
            placeholder="Select.."
            onSelected={(i) => {
              if (roleSettings.data?.data)
                handleUpdateRoleSettings({
                  ...roleSettings.data.data,
                  roleAllowPinMessage: ["owner", "mod", "all"][i] as
                    | "owner"
                    | "mod"
                    | "all",
                });
            }}
            data={["Owner", "Moderator", "All"]}
            width="9rem"
            id="pinMessageSpinner"
            defaultValue={
              roleSettings.data?.data.roleAllowPinMessage
                ? roleNameMapping[roleSettings.data.data.roleAllowPinMessage]
                : "Moderator"
            }
            selectedIndex_={["owner", "mod", "all"].indexOf(
              roleSettings.data?.data.roleAllowPinMessage ?? ""
            )}
            customInputStyles="bg-lime-700"
            customMenuButtonStyles="bg-lime-700"
            showSelected
            direction="up"
            rounded
          />
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2">
        <IoIosUnlock />
        <p className="text-base">ChatRoom Visibility</p>
      </div>

      <div className="flex mt-2 gap-2 md:items-center flex-col md:flex-row">
        <div className="flex flex-col gap-1">
          <p>Open to Public</p>
          <p className="text-sm text-lime-700">
            Allows other users to search and freely join this chatroom without
            invitation.
          </p>
          <p className="text-lime-300 text-sm">
            <span className="text-sm font-bold text-lime-700 mr-1">
              PROTIP:
            </span>
            For public chatrooms, naming your chatroom to align with the topic
            or interest of your chatroom will better attract relevant users.
          </p>
        </div>

        <div className="md:ml-auto">
          <PrimarySwitch
            customBackground="bg-lime-700"
            isActive={isCurrentChatRoomPublic ?? false}
            onClick={() => {
              if (!roomOpenPublicMutation.isPending) {
                roomOpenPublicMutation.mutate(!isCurrentChatRoomPublic);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
