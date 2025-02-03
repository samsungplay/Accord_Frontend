"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosResponse } from "axios";
import { useRouter } from "next/navigation";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { BsExclamation } from "react-icons/bs";
import {
  FaCheck,
  FaClipboard,
  FaCrown,
  FaEdit,
  FaLink,
  FaUpload,
} from "react-icons/fa";
import { FcCheckmark } from "react-icons/fc";
import { IoReload, IoSearch, IoShield } from "react-icons/io5";
import { createEditor, Descendant, Editor, Element, Transforms } from "slate";
import { Editable, ReactEditor, Slate, withReact } from "slate-react";
import { useOnClickOutside } from "usehooks-ts";
import api from "../api/api";
import AuthenticationContext from "../contexts/AuthenticationContext";
import ModalContext from "../contexts/ModalContext";
import { ChatRoom } from "../types/ChatRoom";
import { CustomElement, CustomText } from "../types/Editor";
import { User } from "../types/User";
import ModalUtils from "../util/ModalUtil";
import PrimaryButton from "./PrimaryButton";
import PrimaryCheckBox from "./PrimaryCheckBox";
import PrimaryInput from "./PrimaryInput";
import ProfileAvatar from "./ProfileAvatar";
import SelectBlock from "./SelectBlock";
import React from "react";
import { ChatRoomRoleSettings } from "../types/ChatRoomRoleSettings";

import GenericUtil from "../util/GenericUtil";
import Constants from "../constants/Constants";
import {
  differenceInSeconds,
  formatDuration,
  intervalToDuration,
} from "date-fns";
import { MdOutlineDelete } from "react-icons/md";
import FloatingButton from "./FloatingButton";
import RoomAvatar from "./RoomAvatar";
import { IoMdChatboxes, IoMdMail } from "react-icons/io";

type SelectFriendsInterfaceType = {
  setShowInterface: Dispatch<SetStateAction<boolean>>;
  currentChatRoom?: ChatRoom;
  roleSettings?: ChatRoomRoleSettings;
  invitationCode?: string;
  invitationCodePermanent?: string;
  shouldShowManageMembers?: boolean;
  shouldShowInvitationLink?: boolean;
};
export default function SelectFriendsInterface({
  setShowInterface,
  currentChatRoom,
  roleSettings,
  invitationCode,
  invitationCodePermanent,
  shouldShowManageMembers,
  shouldShowInvitationLink,
}: SelectFriendsInterfaceType) {
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [chatRoomName, setChatRoomName] = useState("");
  const [chatRoomNameError, setChatRoomNameError] = useState("");
  const [chatRoomHasChange, setChatRoomHasChange] = useState(false);
  const authenticationContext = useContext(AuthenticationContext);
  const currentUser = authenticationContext?.currentUser;
  const ref = useRef<HTMLDivElement>(null);

  const maxFriends = 9; //excluding self

  const deferredSearchValue = useDeferredValue(searchValue);
  const modalContext = useContext(ModalContext);
  const queryClient = useQueryClient();
  const router = useRouter();
  const [roomImageError, setRoomImageError] = useState("");
  const [fileInput, setFileInput] = useState<FileList | string | null>(null);
  const roomImageFileInputRef = useRef<HTMLInputElement>(null);
  const [roomImagePlaceholder, setRoomImagePlaceholder] = useState<
    string | undefined
  >(undefined);

  useOnClickOutside(ref, () => {
    setTimeout(() => {
      setShowInterface(false);
    }, 100);
  });

  useEffect(() => {
    if (
      currentChatRoom &&
      currentChatRoom.participants &&
      currentUser &&
      shouldShowManageMembers
    ) {
      const friends: string[] = [];
      currentChatRoom.participants.forEach((participant) => {
        if (
          participant.username + "@" + participant.id !==
          currentUser.username + "@" + currentUser.id
        ) {
          const e = participant.username + "@" + participant.id;
          const lastSelectedFriend = friends.length;
          Transforms.insertNodes(
            editor,
            {
              type: "select",
              children: [
                {
                  text: e.replaceAll("@", "#"),
                },
              ],
              content: e,
            },
            {
              at: [0, lastSelectedFriend * 2],
            }
          );

          friends.push(e);
        }
      });
      setChatRoomName(currentChatRoom.name);
      setSelectedFriends([...friends]);
    }

    return () => {
      try {
        Transforms.delete(editor, {
          at: {
            anchor: Editor.start(editor, []),
            focus: Editor.end(editor, []),
          },
        });
      } catch (error) {
        console.error(error);
      }

      setSelectedFriends([]);
    };
  }, [currentChatRoom, shouldShowManageMembers]);

  const handleError = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data: AxiosResponse<any, any> | undefined) => {
      if (data) {
        ModalUtils.handleGenericError(modalContext, data);
      }
    },
    []
  );

  const createDMRoomMutation = useMutation({
    mutationFn: ({
      chatRoomName,
      selectedFriends,
      dm,
    }: {
      chatRoomName: string;
      selectedFriends: string[];
      dm: boolean;
    }) => {
      return api.post("/chatrooms/directmessaging", {
        chatRoomName,
        friendNames: selectedFriends,
        dm,
      });
    },
    onSettled(data) {
      if (data?.status === 201) {
        queryClient.setQueryData(
          ["chatroom_dm"],
          (prev: { data: ChatRoom[] }) => {
            return {
              data: [...prev.data, data.data],
            };
          }
        );

        setShowInterface(false);
        router.replace(`/dashboard/chatroom/${data?.data.id}`);
      } else {
        if (
          data?.data.startsWith("Direct chat already exists against this user")
        ) {
          const split = data.data.split(":");
          const id = split[1];

          setShowInterface(false);
          router.replace(`/dashboard/chatroom/${id}`);
          return;
        }
        handleError(data);
      }
    },
  });

  const handleCreateChatroom = useCallback(
    (dm: boolean) => {
      setChatRoomNameError("");

      setTimeout(() => {
        if (chatRoomName.length < 1 && !dm) {
          setChatRoomNameError("!");

          return;
        }
        if (chatRoomName.length > 30) {
          setChatRoomNameError("Name too long");
          return;
        }
        if (chatRoomName.length < 2) {
          setChatRoomNameError("Name too short");
        }
        if (selectedFriends.length < 1 && dm) {
          setChatRoomNameError("No friend selected");
          return;
        }
        if (!createDMRoomMutation.isPending) {
          createDMRoomMutation.mutate({
            chatRoomName: !dm ? chatRoomName : "DM",
            selectedFriends,
            dm,
          });
        }
      }, 50);
    },
    [chatRoomName, selectedFriends, setChatRoomNameError, createDMRoomMutation]
  );

  const allFriends = useQuery({
    queryKey: ["friends"],
    queryFn: () => api.get<User[]>("/users/friends"),
    refetchOnMount: false,
  });
  const withInLines = (editor: ReactEditor) => {
    const {
      isInline,
      isElementReadOnly,
      apply,
      deleteForward,
      deleteBackward,
      deleteFragment,
    } = editor;
    editor.isInline = (element: Element) => {
      return element.type === "select" || isInline(element);
    };

    editor.isElementReadOnly = (element: Element) => {
      return element.type === "select" || isElementReadOnly(element);
    };

    editor.apply = (operation) => {
      if (operation.type === "remove_node") {
        const { node } = operation;
        const element = node as Element;
        if (element.type === "select") {
          handleOnUncheck(element.content!);
        }
      }

      // Other cases
      apply(operation);
    };

    editor.deleteBackward = (options) => {
      deleteBackward(options);
    };

    editor.deleteForward = (options) => {
      deleteForward(options);
    };

    editor.deleteFragment = (options) => {
      deleteFragment(options);
    };
    return editor;
  };
  const editor = useMemo(() => withInLines(withReact(createEditor())), []);

  const handleOnCheck = useCallback(
    (e: string) => {
      if (selectedFriends.length >= maxFriends) {
        return;
      }
      const lastSelectedFriend = selectedFriends.length;

      Transforms.insertNodes(
        editor,
        {
          type: "select",
          children: [
            {
              text: e.replaceAll("@", "#"),
            },
          ],
          content: e,
        },
        {
          at: [0, lastSelectedFriend * 2],
        }
      );

      setSelectedFriends((prev) => [...prev, e]);
    },
    [selectedFriends]
  );

  const handleOnUncheck = useCallback(
    (e: string) => {
      const friendIndex = selectedFriends.indexOf(e);

      if (friendIndex * 2 + 1 !== -1) {
        try {
          Transforms.delete(editor, {
            distance: 1,
            at: [0, friendIndex * 2 + 1],
          });
        } catch (error) {
          console.error(error);
        }
      }

      setSelectedFriends((prev) => prev.filter((e_) => e_ !== e));
    },
    [selectedFriends]
  );

  const friends = allFriends.data?.data;

  const filteredFriends = useMemo(() => {
    if (!friends || !currentUser) {
      return [];
    }

    if (!currentChatRoom) {
      return friends?.filter(
        (friend) =>
          friend.username.includes(deferredSearchValue) ||
          friend.nickname?.includes(deferredSearchValue)
      );
    }
    const friendsAndParticipants: User[] = [];

    const addedId = new Set<number>();

    friends.forEach((friend) => {
      friendsAndParticipants.push(friend);
      addedId.add(friend.id);
    });

    currentChatRoom.participants.forEach((p) => {
      if (!addedId.has(p.id) && p.id !== currentUser.id) {
        friendsAndParticipants.push(p);
        addedId.add(p.id);
      }
    });

    return friendsAndParticipants.filter(
      (friend) =>
        friend.username.includes(deferredSearchValue) ||
        friend.nickname?.includes(deferredSearchValue)
    );
  }, [
    friends,
    deferredSearchValue,
    currentUser?.id,
    currentChatRoom?.participants,
  ]);

  const initialValue: Descendant[] = [
    {
      type: "paragraph",
      children: [
        {
          text: "",
        },
      ],
    },
  ];

  const renderElement = useCallback(
    (props: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      attributes: any;
      children: React.ReactNode;
      element: Element;
    }) => {
      const { attributes, children, element } = props;
      switch (element.type) {
        case "select":
          return (
            <SelectBlock
              {...attributes}
              onClick={() => handleOnUncheck(element.content!)}
            >
              {children}
            </SelectBlock>
          );
        default:
          return <p {...attributes}>{children}</p>;
      }
    },
    [handleOnUncheck]
  );

  const renderPlaceholder = useCallback(
    ({
      attributes,
      children,
    }: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      attributes: any;
      children: React.ReactNode;
    }) => {
      return (
        <span {...attributes} className="flex items-center py-2 text-lime-300">
          {children}
        </span>
      );
    },
    []
  );

  const deleteChatRoomMutation = useMutation({
    mutationFn: (id: string) => {
      return api.delete(`/chatrooms/directmessaging/all/${id}`);
    },
    onSettled(data, error, variables) {
      if (!data) return;
      if (data.status === 200) {
        queryClient.setQueryData(
          ["chatroom_dm"],
          (prev: { data: ChatRoom[] }) => {
            return {
              data: prev.data.filter((e) => e.id.toString() !== variables),
            };
          }
        );
        setTimeout(() => {
          router.replace("/dashboard");
        }, 100);
      } else {
        handleError(data);
      }
    },
  });

  const updateChatRoomMutation = useMutation({
    mutationFn: (id: string) => {
      const formData = new FormData();

      if (currentUser) {
        formData.set(
          "chatRoomDetails",
          new Blob(
            [
              JSON.stringify({
                id: Number.parseInt(id),
                name: chatRoomName,
                participants: [
                  currentUser.username + "@" + currentUser.id,
                  ...selectedFriends,
                ],
                deleteRoomImage: !(fileInput instanceof FileList),
              }),
            ],
            {
              type: "application/json",
            }
          )
        );
      }

      if (fileInput && fileInput instanceof FileList) {
        formData.set("roomImage", fileInput[0]);
      }

      return api.put(`/chatrooms/directmessaging/${id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
    },
    onSettled(data, _error, variables) {
      if (data?.status === 200) {
        queryClient.setQueryData(["chatroom_dm", variables], () => {
          return {
            data: {
              ...data.data,
            },
          };
        });

        queryClient.setQueryData(
          ["chatroom_dm"],
          (prev: { data: ChatRoom[] }) => {
            return {
              data: prev.data.map((chatroom) => {
                if (chatroom.id.toString() === variables) {
                  return {
                    ...data.data,
                  };
                }
                return chatroom;
              }),
            };
          }
        );
      } else {
        handleError(data);
      }
      setFileInput(null);
      setRoomImagePlaceholder(undefined);
      if (roomImageFileInputRef.current) {
        roomImageFileInputRef.current.value = "";
        roomImageFileInputRef.current.files = null;
      }
    },
  });

  const handleDeleteChatRoom = useCallback(() => {
    if (!currentChatRoom) {
      return;
    }
    ModalUtils.openYesorNoModal(
      modalContext,
      "CRITICAL WARNING",
      "Are you sure you want to delete this chat? This cannot be rolled back!",
      () => {
        if (!deleteChatRoomMutation.isPending) {
          deleteChatRoomMutation.mutate(currentChatRoom.id.toString());
        }
      }
    );
  }, [deleteChatRoomMutation]);

  const handleUpdateChatroom = useCallback(() => {
    setChatRoomNameError("");

    setTimeout(() => {
      if (chatRoomName.length < 1) {
        setChatRoomNameError("Required");

        return;
      }
      if (chatRoomName.length > 20) {
        setChatRoomNameError("Name too long");
        return;
      }
      if (updateChatRoomMutation.isPending) return;

      if (!chatRoomHasChange) return;

      if (!currentChatRoom) return;

      updateChatRoomMutation.mutate(currentChatRoom.id.toString());
    }, 50);
  }, [chatRoomHasChange, updateChatRoomMutation]);

  const [noPermission, setNoPermission] = useState("");

  useEffect(() => {
    //has change detector
    setTimeout(() => {
      if (currentChatRoom && currentUser && roleSettings) {
        if (chatRoomName !== currentChatRoom.name) {
          setChatRoomHasChange(true);
        } else {
          const currentChatRoomParticipants = currentChatRoom.participants
            .filter((e) => e.id !== currentUser?.id)
            .map((e) => e.username + "@" + e.id);

          const currentChatRoomParticipantsSet = new Set(
            currentChatRoomParticipants
          );

          const selectedParticipants = new Set(selectedFriends);

          const hasKicked = currentChatRoomParticipants.find(
            (e) => !selectedParticipants.has(e)
          );
          const hasInvited = selectedFriends.find(
            (e) => !currentChatRoomParticipantsSet.has(e)
          );

          if (
            hasInvited &&
            !GenericUtil.checkRoomPermission(
              currentChatRoom,
              currentUser.id,
              undefined,
              roleSettings.roleAllowFriendsInvite
            )
          ) {
            setNoPermission("You lack permission to invite users");
            return;
          }

          if (
            hasKicked &&
            !GenericUtil.checkRoomPermission(
              currentChatRoom,
              currentUser.id,
              currentChatRoomParticipants
                .filter((e) => !selectedParticipants.has(e))
                .map((kicked) => parseInt(kicked.split("@")[1])),
              roleSettings.roleAllowKickUser
            )
          ) {
            setNoPermission("You lack permission to kick one of the users");
            return;
          }

          let setEquals = true;
          if (currentChatRoomParticipants.length !== selectedFriends.length) {
            setEquals = false;
          } else {
            for (const e of currentChatRoomParticipants) {
              if (!selectedParticipants.has(e)) {
                setEquals = false;
                break;
              }
            }
          }
          let roomImageChanged = fileInput !== null;
          if (
            (fileInput === null || fileInput === "default") &&
            !currentChatRoom.roomImage?.length
          ) {
            roomImageChanged = false;
          }

          setChatRoomHasChange(!setEquals || roomImageChanged);

          setNoPermission("");
        }
      }
    }, 50);
  }, [
    chatRoomName,
    selectedFriends,
    roleSettings,
    fileInput,
    currentUser,
    currentChatRoom,
  ]);

  const transferOwnershipMutation = useMutation({
    mutationFn: (userid: number) => {
      return api.post(
        `/chatrooms/directmessaging/${currentChatRoom?.id ?? -1}/ownership`,
        {
          target: userid,
        }
      );
    },
    onSettled(data, error, variables) {
      if (!data || !currentChatRoom) return;
      if (data.status === 200) {
        queryClient.setQueryData(
          ["chatroom_dm", currentChatRoom.id.toString()],
          (prev: { data: ChatRoom }) => {
            return {
              data: {
                ...prev.data,
                ownerId: variables,
              },
            };
          }
        );
      } else {
        ModalUtils.handleGenericError(modalContext, data);
      }
    },
  });

  const handleTransferOwnership = useCallback(
    (username: string, userid: number) => {
      ModalUtils.openGenericModal(
        modalContext,
        "",
        "Are you sure you want to transfer ownership to " + username + "?",
        () => {
          if (!transferOwnershipMutation.isPending) {
            transferOwnershipMutation.mutate(userid);
          }
        },
        undefined,
        [
          <PrimaryButton key={0}>Yes</PrimaryButton>,
          <PrimaryButton key={1} customStyles="mt-5 bg-red-500">
            No
          </PrimaryButton>,
        ],
        <div className="flex items-center justify-center gap-2 text-lime-300">
          <FaCrown size={36} />
          <p>Successor to the throne...</p>
        </div>
      );
    },
    [transferOwnershipMutation]
  );

  const updateModeratorRoleMutation = useMutation({
    mutationFn: ({ userId, grant }: { userId: number; grant: boolean }) => {
      return grant
        ? api.post(
            `/chatrooms/roles/moderator/${currentChatRoom?.id ?? -1}/${userId}`
          )
        : api.delete(
            `/chatrooms/roles/moderator/${currentChatRoom?.id ?? -1}/${userId}`
          );
    },
    onSettled(data) {
      if (!data || !currentChatRoom) return;
      if (data.status === 200) {
        queryClient.setQueryData(
          ["chatroom_dm", currentChatRoom.id.toString()],
          (prev: { data: ChatRoom }) => {
            return {
              data: {
                ...prev.data,
                modIds: data.data ?? undefined,
              },
            };
          }
        );
      } else {
        ModalUtils.handleGenericError(modalContext, data);
      }
    },
  });

  const handleUpdateModeratorRole = useCallback(
    (username: string, userId: number, grant: boolean) => {
      ModalUtils.openGenericModal(
        modalContext,
        "",
        `Are you sure you want to ${
          grant ? "grant moderator role to " : "revoke moderator role from "
        }` +
          username +
          "?",
        () => {
          if (!updateModeratorRoleMutation.isPending) {
            updateModeratorRoleMutation.mutate({
              grant,
              userId,
            });
          }
        },
        undefined,
        [
          <PrimaryButton key={0}>Yes</PrimaryButton>,
          <PrimaryButton key={1} customStyles="mt-5 bg-red-500">
            No
          </PrimaryButton>,
        ],
        <div className="flex items-center justify-center gap-2 text-lime-300">
          <IoShield size={36} />
          <p>{grant ? "Grant Moderator" : "Revoke Moderator"}</p>
        </div>
      );
    },
    [updateModeratorRoleMutation.isPending]
  );

  const renewInvitationMutation = useMutation({
    mutationFn: (permanent: boolean) => {
      return api.post<string>(
        `/chatrooms/invitationGenerate/${currentChatRoom?.id ?? -1}`,
        undefined,
        {
          params: {
            permanent,
          },
        }
      );
    },
    onSettled(data, err, permanent) {
      if (data?.status === 200) {
        queryClient.setQueryData(
          ["chatroom_invitation", permanent ? "permanent" : "temporary"],
          () => {
            return {
              data: data.data,
            };
          }
        );
      } else if (data) {
        ModalUtils.handleGenericError(modalContext, data);
      }
    },
  });

  const invalidateInvitationMutation = useMutation({
    mutationFn: () => {
      return api.delete(`/chatrooms/invitation/${currentChatRoom?.id ?? -1}`);
    },
    onSettled(data) {
      if (data?.status === 200) {
        queryClient.setQueryData(["chatroom_invitation", "permanent"], () => {
          return {
            data: "",
          };
        });
        queryClient.setQueryData(["chatroom_invitation", "temporary"], () => {
          return {
            data: "",
          };
        });
      } else if (data) {
        ModalUtils.handleGenericError(modalContext, data);
      }
    },
  });

  const [temporaryCopied, setTemporaryCopied] = useState(false);

  const [permanentCopied, setPermanentCopied] = useState(false);

  const [timerDisplay, setTimerDisplay] = useState("");

  //timer logic
  useEffect(() => {
    const interval = setInterval(() => {
      if (invitationCode?.length) {
        const now = new Date();
        const expiration = new Date(parseInt(invitationCode.split("@")[1]));

        const secondsDiff = differenceInSeconds(expiration, now);
        if (secondsDiff <= 0) {
          setTimerDisplay("Expired");
          return;
        }

        const duration = intervalToDuration({
          start: now,
          end: expiration,
        });

        setTimerDisplay(formatDuration(duration));
      } else {
        setTimerDisplay("");
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [invitationCode]);

  return (
    <div
      ref={ref}
      className="bg-lime-500 animate-fadeInUpFaster mt-2 p-2 withinsubsidebar text-lime-600 rounded-md w-[14rem] sm:w-[20rem] h-fit
      shadow-lg z-[20] max-h-[100vh] overflow-y-scroll"
    >
      <div className="flex flex-col">
        {currentChatRoom && shouldShowInvitationLink && (
          <div className="flex flex-col p-2">
            <div className="text-lg flex items-center gap-2">
              <FaLink /> Invitation Link
            </div>
            <div className="flex w-full items-center">
              <PrimaryButton
                customStyles="mt-0 bg-lime-400 px-2 rounded-e-none text-sm"
                customHeight="h-[1.5rem]"
                customWidth="w-fit"
                onclick={() => {
                  if (invitationCode?.length) {
                    navigator.clipboard
                      .writeText(
                        `${Constants.CLIENT_URL_PATH}/invitation?code=${
                          invitationCode.split("@")[0]
                        }`
                      )
                      .then(() => {
                        setTemporaryCopied(true);
                      });
                  }
                }}
              >
                {temporaryCopied ? <FaCheck /> : <FaClipboard />}
              </PrimaryButton>
              <div className="bg-lime-600 flex w-full h-[1.5rem] overflow-x-scroll whitespace-nowrap no-scrollbar items-center text-lime-300 text-sm px-2">
                {invitationCode?.length
                  ? `${Constants.CLIENT_URL_PATH}/invitation?code=${
                      invitationCode.split("@")[0]
                    }`
                  : "None"}
              </div>
              <PrimaryButton
                customStyles="mt-0 bg-lime-400 px-2 rounded-s-none text-sm"
                customHeight="h-[1.5rem]"
                customWidth="w-fit"
                onclick={() => {
                  if (!renewInvitationMutation.isPending) {
                    renewInvitationMutation.mutate(false);
                  }
                }}
                disabled={
                  timerDisplay !== "Expired" &&
                  (invitationCode?.length ? true : false) &&
                  currentChatRoom.ownerId !== currentUser?.id
                }
              >
                <div className="hidden md:block">Renew</div>
                <div className="md:hidden">
                  <IoReload size={GenericUtil.remToPx(0.875)} />
                </div>
              </PrimaryButton>
            </div>
            <p className="text-sm">Temporary Link {timerDisplay}</p>

            {currentChatRoom.ownerId === currentUser?.id && (
              <>
                <div className="flex w-full items-center mt-2">
                  <PrimaryButton
                    customStyles="mt-0 bg-lime-600 text-lime-700 px-2 rounded-e-none text-sm"
                    customHeight="h-[1.5rem]"
                    customWidth="w-fit"
                    onclick={() => {
                      if (invitationCodePermanent?.length) {
                        navigator.clipboard
                          .writeText(
                            `${Constants.CLIENT_URL_PATH}/invitation?code=${invitationCodePermanent}`
                          )
                          .then(() => {
                            setPermanentCopied(true);
                          });
                      }
                    }}
                  >
                    {permanentCopied ? <FaCheck /> : <FaClipboard />}
                  </PrimaryButton>
                  <div className="bg-lime-700 flex w-full h-[1.5rem] overflow-x-scroll no-scrollbar whitespace-nowrap items-center text-lime-300 text-sm px-2">
                    {invitationCodePermanent?.length
                      ? `${Constants.CLIENT_URL_PATH}/invitation?code=${invitationCodePermanent}`
                      : "None"}
                  </div>
                  <PrimaryButton
                    customStyles="mt-0 bg-lime-600 text-lime-700 px-2 rounded-s-none text-sm"
                    customHeight="h-[1.5rem]"
                    customWidth="w-fit"
                    onclick={() => {
                      if (!renewInvitationMutation.isPending) {
                        renewInvitationMutation.mutate(true);
                      }
                    }}
                  >
                    <div className="hidden md:block">Renew</div>
                    <div className="md:hidden">
                      <IoReload size={GenericUtil.remToPx(0.875)} />
                    </div>
                  </PrimaryButton>
                </div>
                <p className="text-sm">Permanent Link</p>
              </>
            )}

            {currentChatRoom.ownerId === currentUser?.id && (
              <PrimaryButton
                customStyles="bg-red-500 text-white"
                customHeight="h-fit"
                onclick={() => {
                  if (!invalidateInvitationMutation.isPending) {
                    invalidateInvitationMutation.mutate();
                  }
                }}
              >
                Invalidate all links
              </PrimaryButton>
            )}
          </div>
        )}

        {(!currentChatRoom || shouldShowManageMembers) && (
          <div>
            <div className="flex items-center gap-2">
              {" "}
              {currentChatRoom ? <FaEdit size={24} /> : <></>}{" "}
              <p className="text-xl font-bold">
                {currentChatRoom ? "Manage Chatroom" : "Select Friends"}
              </p>
            </div>

            <p className="text-sm text-lime-700">
              You can add {maxFriends - selectedFriends.length} more users.
            </p>

            {!currentChatRoom && (
              <p className={currentChatRoom && "hidden"}>
                <span className="font-bold text-lime-700 text-sm">PROTIP:</span>{" "}
                You can change the chatroom icon once you create a chatroom.
              </p>
            )}
            <div className="mt-2 relative w-full overflow-x-hidden overflow-y-scroll max-h-[5rem]">
              <Slate editor={editor} initialValue={initialValue}>
                <Editable
                  placeholder="Type your friend's name..."
                  renderPlaceholder={renderPlaceholder}
                  renderElement={renderElement}
                  onKeyDown={() => {
                    setTimeout(() => {
                      const node = editor.children[0] as CustomElement;
                      const lastText = (
                        node.children[node.children.length - 1] as CustomText
                      ).text;
                      setSearchValue(lastText);
                    }, 50);
                  }}
                  className="bg-lime-600 text-lime-400 p-2 rounded-md focus:outline-none"
                />
              </Slate>
            </div>
            <div className="overflow-y-scroll h-[3.5rem] mdh:h-[14rem] mt-2">
              {filteredFriends &&
                filteredFriends["map"] &&
                filteredFriends.map((friend) => (
                  <div
                    key={friend.id}
                    className="cursor-pointer flex group items-center hover:bg-lime-700 bg-lime-500 p-2 rounded-md gap-2 transition"
                  >
                    <div className="flex flex-col w-full gap-2">
                      <div className="flex items-center gap-2">
                        <ProfileAvatar showStatus size={24} user={friend} />
                        <p className="group-hover:text-lime-400">
                          {(friend.nickname?.length ?? 0) > 0
                            ? friend.nickname
                            : friend.username}
                        </p>
                        <p className="text-xs text-lime-400 hidden sm:inline">
                          {friend.username + "#" + friend.id}
                        </p>
                        <div className="flex ml-auto items-center gap-2">
                          <PrimaryCheckBox
                            checked={selectedFriends.includes(
                              friend.username + "@" + friend.id
                            )}
                            onChecked={() =>
                              handleOnCheck(friend.username + "@" + friend.id)
                            }
                            onUnchecked={() =>
                              handleOnUncheck(friend.username + "@" + friend.id)
                            }
                          />
                        </div>
                      </div>

                      {currentChatRoom &&
                        currentChatRoom.ownerId === currentUser?.id &&
                        currentChatRoom.participants.find(
                          (e) => e.id === friend.id
                        ) && (
                          <PrimaryButton
                            onclick={() =>
                              handleTransferOwnership(
                                friend.nickname.length > 0
                                  ? friend.nickname
                                  : friend.username,
                                friend.id
                              )
                            }
                            customHeight="h-fit"
                            customStyles="mt-0 bg-lime-400 p-2"
                          >
                            <div className="flex items-center justify-center gap-2">
                              <FaCrown />
                              <span className="whitespace-nowrap">
                                Transfer Ownership
                              </span>
                            </div>
                          </PrimaryButton>
                        )}

                      {currentChatRoom &&
                        currentChatRoom.ownerId === currentUser?.id &&
                        currentChatRoom.participants.find(
                          (e) => e.id === friend.id
                        ) && (
                          <PrimaryButton
                            onclick={() =>
                              handleUpdateModeratorRole(
                                friend.nickname.length > 0
                                  ? friend.nickname
                                  : friend.username,
                                friend.id,
                                currentChatRoom.modIds?.length &&
                                  currentChatRoom.modIds.includes(friend.id)
                                  ? false
                                  : true
                              )
                            }
                            customHeight="h-fit"
                            customStyles="mt-0 bg-lime-400 p-2"
                          >
                            <div className="flex items-center justify-center gap-2">
                              <IoShield />
                              <span className="whitespace-nowrap">
                                {currentChatRoom.modIds?.length &&
                                currentChatRoom.modIds.includes(friend.id)
                                  ? "Revoke Moderator"
                                  : "Grant Moderator"}
                              </span>
                            </div>
                          </PrimaryButton>
                        )}
                    </div>
                  </div>
                ))}
              {(!filteredFriends ||
                (filteredFriends &&
                  filteredFriends["map"] &&
                  filteredFriends.length == 0)) && (
                <div className="grid place-content-center text-center w-full h-full">
                  <div className="flex flex-col justify-center items-center">
                    <IoSearch size={64} /> <p>Who is that?</p>
                  </div>
                </div>
              )}
            </div>

            <div
              className={`${
                !currentChatRoom ||
                (currentChatRoom && currentChatRoom.ownerId === currentUser?.id)
                  ? "max-h-[3.5rem]"
                  : "max-h-[0]"
              } transition-all duration-500 h-[3.5rem]`}
            >
              {(!currentChatRoom ||
                (currentChatRoom &&
                  currentChatRoom.ownerId === currentUser?.id)) && (
                <div className="animate-fadeInDown">
                  <PrimaryInput
                    errorMessage={chatRoomNameError}
                    value_={chatRoomName}
                    label={"Chatroom Name"}
                    onChange={(e) => setChatRoomName(e.target.value)}
                    id={"chatRoomName"}
                    type={"text"}
                    placeholder="Optional for DM"
                    customStylesInput="w-full my-2"
                  />
                </div>
              )}
            </div>

            {currentChatRoom &&
              currentChatRoom?.ownerId === currentUser?.id && (
                <>
                  <p className="mt-2 text-base">Room Image</p>

                  <p
                    className={`ml-1 mt-2 ${
                      roomImageError ? "text-red-500" : "text-lime-200"
                    }`}
                  >
                    ROOM IMAGE {roomImageError}
                  </p>

                  <div
                    className={`flex gap-2 mr-auto mt-1 items-center rounded-full border-2 ${
                      roomImageError
                        ? "border-red-500 animate-jiggle"
                        : "border-transparent"
                    }`}
                  >
                    <div className="mr-2">
                      <RoomAvatar
                        size={48}
                        chatroom={currentChatRoom}
                        currentUser={currentUser}
                        roomImagePlaceholder={roomImagePlaceholder}
                      />
                    </div>
                    <div>
                      <FloatingButton
                        description={"Upload Image File"}
                        onClick={() => {
                          roomImageFileInputRef.current?.click();
                        }}
                      >
                        <div className="p-2">
                          <FaUpload size={24} />
                        </div>
                      </FloatingButton>
                    </div>

                    <div>
                      <FloatingButton
                        description={"Remove Room Image"}
                        hoverColor="hover:text-red-500"
                        onClick={() => {
                          if (roomImageFileInputRef.current) {
                            roomImageFileInputRef.current.value = "";
                            roomImageFileInputRef.current.files = null;
                          }

                          setFileInput("default");
                          setRoomImagePlaceholder("default");
                        }}
                      >
                        <div className="p-2">
                          <MdOutlineDelete size={24} />
                        </div>
                      </FloatingButton>
                    </div>
                  </div>

                  <input
                    ref={roomImageFileInputRef}
                    accept="image/png, image/jpeg"
                    type="file"
                    id="editRoomImage"
                    name="editRoomImage"
                    className="hidden"
                    onChange={(e) => {
                      setRoomImageError("");
                      setTimeout(() => {
                        if (!e.target.files) return;

                        if (!e.target.files[0]) return;

                        if (e.target.files[0].size > 1048576) {
                          setRoomImageError("Image size exceeds 1MB");
                          return;
                        }

                        const fr = new FileReader();
                        fr.onload = () => {
                          setRoomImagePlaceholder(fr.result?.toString());
                        };

                        fr.readAsDataURL(e.target.files[0]);
                        setFileInput(e.target.files);
                      }, 100);
                    }}
                  />
                </>
              )}

            <div className="flex flex-row md:flex-col">
              <PrimaryButton
                onclick={() => {
                  if (currentChatRoom) {
                    handleUpdateChatroom();
                  } else {
                    handleCreateChatroom(true);
                  }
                }}
                customStyles="mt-3 bg-lime-600 text-lime-700 text-xs md:text-base"
                disabled={
                  (currentChatRoom === undefined &&
                    selectedFriends.length != 1) ||
                  createDMRoomMutation.isPending ||
                  updateChatRoomMutation.isPending ||
                  (!chatRoomHasChange && currentChatRoom !== undefined) ||
                  (currentChatRoom !== undefined && noPermission.length > 0)
                }
              >
                {currentChatRoom && "Edit Chatroom"}
                {!currentChatRoom && (
                  <div className="flex items-center gap-2 justify-center">
                    <div className="hidden md:block">
                      <IoMdMail />
                    </div>
                    Start DM
                  </div>
                )}
              </PrimaryButton>

              {!currentChatRoom && (
                <PrimaryButton
                  onclick={() => {
                    handleCreateChatroom(false);
                  }}
                  customStyles="mt-3 bg-lime-600 text-lime-700 text-xs md:text-base"
                  disabled={createDMRoomMutation.isPending}
                >
                  <div className="flex items-center gap-2 justify-center">
                    <div className="hidden md:block">
                      <IoMdChatboxes />
                    </div>
                    Create Chatroom
                  </div>
                </PrimaryButton>
              )}

              {currentChatRoom &&
                currentChatRoom.ownerId === currentUser?.id && (
                  <PrimaryButton
                    onclick={() => {
                      handleDeleteChatRoom();
                    }}
                    customStyles="text-xs md:text-base mt-3 bg-red-500 text-lime-700"
                    disabled={deleteChatRoomMutation.isPending}
                  >
                    Delete Chatroom
                  </PrimaryButton>
                )}
            </div>

            {chatRoomHasChange && currentChatRoom && !noPermission.length && (
              <div className="flex items-center text-red-500">
                {" "}
                <BsExclamation size={24} />{" "}
                <p className="ml-1">There are unapplied changes</p>
              </div>
            )}
            {noPermission.length ? (
              <div className="flex items-center text-red-500">
                {" "}
                <BsExclamation size={24} />{" "}
                <p className="ml-1">{noPermission}</p>
              </div>
            ) : (
              <></>
            )}
            {!chatRoomHasChange && !noPermission.length && currentChatRoom && (
              <div className="flex items-center text-lime-600">
                {" "}
                <FcCheckmark size={24} />{" "}
                <p className="ml-1">Chatroom is up to date</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
