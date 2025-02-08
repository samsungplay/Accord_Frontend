import React, {
  ChangeEvent,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Constants from "../constants/Constants";
import { FaCheck, FaFeatherAlt, FaPlus } from "react-icons/fa";
import {
  MdArrowLeft,
  MdArrowRight,
  MdDelete,
  MdImage,
  MdImageNotSupported,
  MdWarning,
} from "react-icons/md";
import GenericUtil from "../util/GenericUtil";
import PrimaryInput from "./PrimaryInput";
import PrimaryButton from "./PrimaryButton";
import { RiImageAddFill } from "react-icons/ri";
import { IoPeople, IoPerson } from "react-icons/io5";
import { useMutation, useQuery } from "@tanstack/react-query";
import api from "../api/api";
import { ChatRoom } from "../types/ChatRoom";
import queryClient from "../query/QueryClient";
import ModalUtils from "../util/ModalUtil";
import ModalContext from "../contexts/ModalContext";
import FloatingButton from "./FloatingButton";
import { User } from "../types/User";
import { Background } from "../types/Background";
import StompContext from "../contexts/StompContext";
import useSocket from "../hooks/useSocket";
import CallContext from "../contexts/CallContext";
import { ChatRoomRoleSettings } from "../types/ChatRoomRoleSettings";

export default function BackgroundPicker({
  currentUser,
  currentChatRoom: currentChatRoomInstance,
  queryChatRoomId = -5,
  customStyles = "",
  excludeSharedFunction = false,
}: {
  currentUser: User;
  currentChatRoom?: ChatRoom;
  queryChatRoomId?: number;
  customStyles?: string;
  excludeSharedFunction?: boolean;
}) {
  const stompContext = useContext(StompContext);
  const callContext = useContext(CallContext);

  const chatRoom = useQuery({
    queryKey: ["chatroom_dm", queryChatRoomId.toString()],
    queryFn: async (): Promise<{ data: ChatRoom }> => {
      if (queryChatRoomId !== -5) {
        const response = await api.get<ChatRoom>(
          `/chatrooms/directmessaging/${queryChatRoomId}`
        );
        return {
          data: response.data,
        };
      }

      return {
        data: GenericUtil.createPlaceholderChatRoom(),
      };
    },
  });

  const currentChatRoom = useMemo(() => {
    if (chatRoom.data?.data && chatRoom.data.data.id !== 0) {
      return chatRoom.data.data;
    } else {
      return currentChatRoomInstance
        ? currentChatRoomInstance
        : GenericUtil.createPlaceholderChatRoom();
    }
  }, [currentChatRoomInstance, chatRoom.data?.data]);

  const roleSettings = useQuery({
    queryKey: ["role_settings", currentChatRoom.id.toString()],
    queryFn: async () => {
      const response = await api.get<ChatRoomRoleSettings>(
        `/chatrooms/roleSettings/${currentChatRoom.id}`
      );

      return {
        data: response.data,
      };
    },
    refetchOnMount: false,
  });

  const shouldShowAddButton = useMemo(() => {
    if (currentChatRoom.direct1to1Identifier?.length) {
      return true;
    }
    if (!roleSettings.data?.data) {
      return false;
    }

    return GenericUtil.checkRoomPermission(
      currentChatRoom,
      currentUser.id,
      undefined,
      roleSettings.data.data.roleAllowAddContent
    );
  }, [roleSettings.data?.data, currentChatRoom, currentUser]);

  const shouldShowDeleteButton = useMemo(() => {
    if (currentChatRoom.direct1to1Identifier?.length) {
      return true;
    }
    if (!roleSettings.data?.data) {
      return false;
    }

    return GenericUtil.checkRoomPermission(
      currentChatRoom,
      currentUser.id,
      undefined,
      roleSettings.data.data.roleAllowDeleteContent
    );
  }, [roleSettings.data?.data, currentUser, currentChatRoom]);

  useSocket(
    stompContext?.stompClient,
    stompContext?.stompFrame,
    (stompClient, currentSocketUser) => {
      const onAddBackground = stompClient.subscribe(
        `/user/${currentSocketUser}/general/onAddBackground/${currentChatRoom.id.toString()}`,
        (message) => {
          const payload: Background = JSON.parse(message.body);

          setImages((prev) => [...prev, payload]);
        }
      );

      const onDeleteBackground = stompClient.subscribe(
        `/user/${currentSocketUser}/general/onDeleteBackground/${currentChatRoom.id.toString()}`,
        (message) => {
          const payload: { name: string } = JSON.parse(message.body);
          setImages((prev) => prev.filter((e) => e.name !== payload.name));
        }
      );

      return [onAddBackground, onDeleteBackground];
    },

    [stompContext?.stompClient, stompContext?.stompFrame, currentChatRoom.id]
  );
  const defaultBackgrounds = useMemo(() => {
    return [
      { id: 0, name: "None", file: "" },
      { id: 0, name: "Cafe", file: "background_cafe.jpg" },
      { id: 0, name: "City", file: "background_city.jpg" },
      { id: 0, name: "Forest", file: "background_forest.jpg" },
      { id: 0, name: "Future", file: "background_future.jpg" },
      { id: 0, name: "Galaxy", file: "background_galaxy.jpg" },
      { id: 0, name: "Gradient", file: "background_gradient.jpg" },
      { id: 0, name: "Living Room", file: "background_livingroom.jpg" },
      { id: 0, name: "Mountain", file: "background_mountain.jpg" },
      { id: 0, name: "Tropical", file: "background_tropical.jpg" },
      { id: 0, name: "Woodland", file: "background_woodland.jpg" },
      { id: 0, name: "Workspace", file: "background_workspace.jpg" },
    ];
  }, []);

  const [images, setImages] = useState<Background[]>([
    ...defaultBackgrounds,
    ...currentChatRoom.backgrounds,
  ]);

  const backgrounds = useQuery({
    queryKey: ["backgrounds"],
    queryFn: async () => {
      const response = await api.get<Background[]>(`/users/backgrounds`);
      return {
        data: response.data,
      };
    },
    refetchOnMount: true,
  });

  const [personalImages, setPersonalImages] = useState<Background[]>([
    { id: 0, name: "None", file: "" },
    ...(backgrounds.data?.data ?? []),
  ]);

  const [page, setPage] = useState<number>(0);

  const [tab, setTab] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | string>("");

  const [nameError, setNameError] = useState("");

  const modalContext = useContext(ModalContext);
  const handleOnImageFileUpload = useCallback(
    async (e: ChangeEvent) => {
      if (file !== "Loading..." && e.target instanceof HTMLInputElement) {
        if (e.target.files) {
          const files = e.target.files;
          const file = files.item(0);
          const target = e.target as HTMLInputElement;
          if (file) {
            if (file.size > 2000000) {
              //image files cannot exceed 2MB
              setFile("Image >2MB@" + Date.now());
              e.target.value = "";
              return;
            }

            if (!new RegExp("^[\\w\\-. ]+$").test(file.name)) {
              setFile("Name invalid@" + Date.now());
              e.target.value = "";
              return;
            }

            if (
              !file.name.includes(".") ||
              !["jpg", "jpeg", "png"].includes(
                file.name.substring(file.name.lastIndexOf(".") + 1)
              )
            ) {
              setFile("File Invalid@" + Date.now());
              e.target.value = "";
              return;
            }

            setFile("Loading...");
            const img = new Image();
            const url = URL.createObjectURL(file);

            img.onload = () => {
              if (img.width < 640 || img.height < 360) {
                setFile("Image too small@" + Date.now());
              } else if (img.width > 1920 || img.height > 1080) {
                setFile("Image too big@" + Date.now());
              } else {
                setFile(file);
              }

              target.value = "";
            };

            img.onerror = () => {
              target.value = "";
              setFile("File Invalid@" + Date.now);
            };

            img.src = url;
          }
        }
      }
    },
    [file]
  );
  const selectedImageSrc = useMemo(() => {
    if (typeof file === "string") return "";
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    if (tab === 3) {
      setFile("");
      setNameError("");
    }
  }, [tab]);

  useEffect(() => {
    if (
      !images.find((e) => callContext?.selectedCallBackground === e.file) &&
      !personalImages.find(
        (e) => callContext?.selectedCallBackground === e.file
      )
    ) {
      callContext?.setSelectedCallBackground("");
      window.localStorage.removeItem("callBackground");
    }
  }, []);
  const addBackgroundMutation = useMutation({
    mutationFn: ({
      name,
      file,
      personal = false,
    }: {
      name: string;
      file: File;
      personal?: boolean;
    }) => {
      const formData = new FormData();
      formData.set("name", name);
      formData.set("file", file);

      return !personal
        ? api.post(
            "/chatrooms/directmessaging/" + currentChatRoom.id + "/background",
            formData,
            {
              headers: {
                "Content-Type": "multipart/form-data",
              },
            }
          )
        : api.post("/users/backgrounds", formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });
    },
    onSettled(data, error, variables) {
      if (data?.status === 200) {
        if (!variables.personal) {
          queryClient.setQueryData(
            ["chatroom_dm", currentChatRoom.id.toString()],
            (prev: { data: ChatRoom }) => {
              if (!prev) return prev;

              return {
                data: {
                  ...prev.data,
                  backgrounds: [
                    ...prev.data.backgrounds,
                    {
                      id: 0,
                      name: variables.name,
                      file:
                        "bg_" +
                        currentChatRoom.id +
                        "_" +
                        variables.name +
                        "." +
                        variables.file.name.split(".").pop(),
                    },
                  ],
                },
              };
            }
          );

          setImages((prev) => [
            ...prev,
            {
              id: 0,
              name: variables.name,
              file:
                "bg_" +
                currentChatRoom.id +
                "_" +
                variables.name +
                "." +
                variables.file.name.split(".").pop(),
            },
          ]);
        } else {
          queryClient.setQueryData(
            ["backgrounds"],
            (prev: { data: Background[] }) => {
              return {
                data: [
                  ...prev.data,
                  {
                    id: 0,
                    name: variables.name,
                    file:
                      "bgpersonal_" +
                      currentUser.id +
                      "_" +
                      variables.name +
                      "." +
                      variables.file.name.split(".").pop(),
                  },
                ],
              };
            }
          );
          setPersonalImages((prev) => [
            ...prev,
            {
              id: 0,
              name: variables.name,
              file:
                "bgpersonal_" +
                currentUser.id +
                "_" +
                variables.name +
                "." +
                variables.file.name.split(".").pop(),
            },
          ]);
        }

        setTab(variables.personal ? 1 : 0);
      } else if (data?.status === 400) {
        const errorMessage: string = data.data;

        if (errorMessage.includes("File")) {
          setFile(
            errorMessage.substring(errorMessage.indexOf(":") + 1) +
              "@" +
              Date.now()
          );
          setNameError("");
        } else if (errorMessage.includes("Name")) {
          setNameError(
            errorMessage.substring(errorMessage.indexOf(":") + 1) +
              "@" +
              Date.now()
          );
          setFile("");
        } else {
          ModalUtils.handleGenericError(modalContext, data);
        }
      } else if (data) {
        ModalUtils.handleGenericError(modalContext, data);
      }
    },
  });

  const handleAddBackground = useCallback(
    (personal: boolean) => {
      if (!addBackgroundMutation.isPending) {
        const input = document.getElementById("imageNameInput");
        let name = "";
        if (input instanceof HTMLInputElement) {
          name = input.value;
        }
        if (name.trim().length <= 0) {
          setNameError("Required@" + Date.now());
          return;
        } else if (name.includes("@")) {
          setNameError("Cannot contain '@'@" + Date.now());
          return;
        } else {
          setNameError("");
        }

        if (!(file instanceof File)) {
          setFile("Invalid file@" + Date.now());
          return;
        } else {
          setFile("");
        }

        addBackgroundMutation.mutate({
          name,
          file,
          personal,
        });
      }
    },
    [addBackgroundMutation, file]
  );

  const removeBackgroundMutation = useMutation({
    mutationFn: ({ name, personal }: { name: string; personal: boolean }) => {
      return !personal
        ? api.delete(
            "/chatrooms/directmessaging/" +
              currentChatRoom.id +
              "/" +
              "background" +
              "/" +
              name
          )
        : api.delete("/users/backgrounds/" + name);
    },
    onSettled: (data, error, variables) => {
      if (data?.status === 200) {
        if (!variables.personal) {
          queryClient.setQueryData(
            ["chatroom_dm", currentChatRoom.id.toString()],
            (prev: { data: ChatRoom }) => {
              if (!prev) return prev;
              return {
                data: {
                  ...prev.data,
                  backgrounds: prev.data.backgrounds.filter(
                    (e) => e.name !== variables.name
                  ),
                },
              };
            }
          );

          setImages((prev) => prev.filter((e) => e.name !== variables.name));
        } else {
          queryClient.setQueryData(
            ["backgrounds"],
            (prev: { data: Background[] }) => {
              return {
                data: prev.data.filter((e) => e.name !== variables.name),
              };
            }
          );
          setPersonalImages((prev) =>
            prev.filter((e) => e.name !== variables.name)
          );
        }
        setTab(variables.personal ? 1 : 0);
      } else if (data) {
        ModalUtils.handleGenericError(modalContext, data);
      }
    },
  });

  const handleRemoveBackground = useCallback(
    (name: string, personal: boolean) => {
      if (!removeBackgroundMutation.isPending) {
        if (!removeBackgroundMutation.isPending) {
          removeBackgroundMutation.mutate({ name, personal });
        }
      }
    },
    [removeBackgroundMutation]
  );

  return (
    <div className={`flex flex-col mx-[-1rem] ${customStyles}`}>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          handleOnImageFileUpload(e);
        }}
        accept=".jpg, .jpeg, .png"
      />
      <div className="flex items-center justify-evenly mt-2">
        <div
          className={`${
            tab === 0 && "bg-lime-600"
          } p-2 cursor-pointer hover:bg-lime-600 transition w-full text-center flex gap-1 items-center justify-center`}
          onClick={() => {
            setTab(0);
          }}
        >
          <div className="hidden md:block">
            <IoPeople />
          </div>
          Shared
        </div>

        <div
          className={`${
            tab === 1 && "bg-lime-600"
          } p-2 cursor-pointer hover:bg-lime-600 transition w-full text-center flex gap-1 items-center justify-center`}
          onClick={() => {
            setTab(1);
          }}
        >
          <div className="hidden md:block">
            <IoPerson />
          </div>
          Personal
        </div>

        <div
          className={`${
            tab === 3 && "bg-lime-600"
          } p-2 cursor-pointer hover:bg-lime-600 transition w-full text-center flex gap-1 items-center justify-center`}
          onClick={() => {
            setTab(3);
          }}
        >
          <div className="hidden md:block">
            <FaPlus />
          </div>
          Custom
        </div>
      </div>

      <div
        className={`h-[0.1rem] bg-lime-500 w-[33.333333%] transition-transform mb-2 ${
          tab === 0
            ? "translate-x-[0%]"
            : tab === 1
            ? "translate-x-[100%]"
            : "translate-x-[200%]"
        } `}
      />

      {tab <= 1 && (
        <div className="flex items-center justify-center w-[80vw]">
          <div
            className={
              page === 0
                ? "cursor-not-allowed text-gray-500"
                : "cursor-pointer transition hover:text-lime-400"
            }
            onClick={() => {
              if (page > 0) setPage((prev) => prev - 1);
            }}
          >
            <div className="hidden md:block">
              <MdArrowLeft size={GenericUtil.remToPx(5)} />
            </div>
            <div className="md:hidden">
              <MdArrowLeft size={GenericUtil.remToPx(2.5)} />
            </div>
          </div>

          <div
            className={`grid ${
              tab === 1 && personalImages.length === 0
                ? "grid-cols-1"
                : "grid-cols-1 md:grid-cols-3"
            }  w-full justify-center h-[50vh] overflow-y-scroll`}
          >
            {(tab === 0 ? images : personalImages)
              .slice(
                9 * page,
                9 * page + 9 > images.length - 1 ? undefined : 9 * page + 9
              )
              .map((image) => {
                return (
                  <div
                    key={image.name}
                    className={`relative group rounded-md animate-fadeIn cursor-pointer w-full aspect-video border-[0.25rem] hover:border-lime-400 
                        ${
                          callContext?.selectedCallBackground === image.file
                            ? "border-lime-400"
                            : "border-transparent"
                        }
                        transition`}
                    onClick={() => {
                      window.localStorage.setItem("callBackground", image.file);
                      callContext?.setSelectedCallBackground(image.file);
                    }}
                  >
                    {image.file.length ? (
                      <img
                        src={Constants.SERVER_STATIC_CONTENT_PATH + image.file}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <></>
                    )}

                    <div className="absolute bottom-2 left-[50%] translate-x-[-50%] rounded-md bg-black bg-opacity-50 px-2">
                      <p className="text-center">{image.name}</p>
                    </div>

                    {callContext?.selectedCallBackground === image.file ? (
                      <div className="absolute top-1/2 left-1/2 translate-x-[-50%] translate-y-[-50%] rounded-full text-white bg-lime-600 p-2">
                        <FaCheck />
                      </div>
                    ) : (
                      <></>
                    )}

                    {shouldShowDeleteButton &&
                    !defaultBackgrounds.find((e) => e.name === image.name) ? (
                      <div className="absolute right-2 top-2 hidden group-hover:block">
                        <FloatingButton
                          backgroundColor="bg-transparent"
                          hoverColor="hover:text-red-500"
                          description="Delete"
                          backgroundGroupHoverColor="group-hover:bg-transparent"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveBackground(image.name, tab === 1);
                          }}
                        >
                          <MdDelete />
                        </FloatingButton>
                      </div>
                    ) : (
                      <></>
                    )}
                  </div>
                );
              })}

            {tab === 1 && personalImages.length === 0 && (
              <div className="grid place-content-center text-lime-400 w-full h-full">
                <div className="flex justify-center">
                  <FaFeatherAlt size={GenericUtil.remToPx(8)} />
                </div>
                <p className="mt-1">There is only peace...</p>
              </div>
            )}
          </div>
          <div
            className={
              page + 1 >= Math.ceil(images.length / 9)
                ? "cursor-not-allowed text-gray-500"
                : "cursor-pointer transition hover:text-lime-400"
            }
            onClick={() => {
              if (page + 1 < Math.ceil(images.length / 9))
                setPage((prev) => prev + 1);
            }}
          >
            <div className="hidden md:block">
              <MdArrowRight size={GenericUtil.remToPx(5)} />
            </div>
            <div className="md:hidden">
              <MdArrowRight size={GenericUtil.remToPx(2.5)} />
            </div>
          </div>
        </div>
      )}

      {tab >= 3 && (
        <div className="animate-fadeIn flex flex-col w-[80vw] h-[50vh] justify-center">
          <div
            key={typeof file === "string" ? file : "none"}
            className={`group hover:text-lime-400 cursor-pointer transition mx-auto w-fit
                ${
                  typeof file === "string" &&
                  file.length > 0 &&
                  file !== "Loading..." &&
                  "animate-jiggle"
                }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <div
              className={`flex items-center justify-center ${
                typeof file === "string" &&
                file.length > 0 &&
                file !== "Loading..."
                  ? "text-red-500"
                  : file === "Loading..."
                  ? "text-orange-500"
                  : ""
              }`}
            >
              {typeof file === "string" && file.length > 0 ? (
                <>
                  <div className="hidden md:block">
                    <MdImageNotSupported size={GenericUtil.remToPx(12)} />
                  </div>
                  <div className="md:hidden">
                    <MdImageNotSupported size={GenericUtil.remToPx(6)} />
                  </div>
                </>
              ) : typeof file === "string" ? (
                <>
                  <div className="hidden md:block">
                    <MdImage size={GenericUtil.remToPx(12)} />
                  </div>
                  <div className="md:hidden">
                    <MdImage size={GenericUtil.remToPx(6)} />
                  </div>
                </>
              ) : (
                <>
                  <img
                    src={selectedImageSrc}
                    className="w-[6rem] md:w-[12rem] object-cover aspect-video"
                  />
                </>
              )}
            </div>

            {typeof file === "string" && file.length > 0 ? (
              <div className="flex items-center justify-center text-red-500 gap-2">
                <MdWarning />
                {file.split("@")[0]}
              </div>
            ) : (
              <></>
            )}
            <div
              className={`flex items-center justify-center gap-2 text-sm md:text-lg
                ${
                  typeof file === "string" &&
                  file.length > 0 &&
                  file !== "Loading..."
                    ? "text-red-500"
                    : file === "Loading..."
                    ? "text-orange-500"
                    : ""
                }`}
            >
              <FaPlus />
              Click to add new image
            </div>
          </div>

          <PrimaryInput
            errorMessage={
              nameError.includes("@") ? nameError.split("@")[0] : ""
            }
            id="imageNameInput"
            type="text"
            label="Background Name"
            customStylesInput="w-[80%] md:w-[50%] mx-auto text-center"
            customStyles="ml-auto mr-auto mt-2"
            maxLength={25}
          ></PrimaryInput>

          <div className="flex flex-col md:flex-row">
            {!excludeSharedFunction && shouldShowAddButton && (
              <PrimaryButton
                customStyles="mt-2 ml-1 mr-1 bg-lime-500 mx-auto"
                customWidth="w-full"
                onclick={() => handleAddBackground(false)}
              >
                <div className="flex items-center justify-center gap-2">
                  <RiImageAddFill /> Add to Shared Gallery
                </div>
              </PrimaryButton>
            )}

            <PrimaryButton
              customStyles="mt-2 mr-1 bg-orange-500 mx-auto"
              customWidth="w-full"
              onclick={() => handleAddBackground(true)}
            >
              <div className="flex items-center justify-center gap-2">
                <RiImageAddFill /> Add to Personal Gallery
              </div>
            </PrimaryButton>
          </div>
        </div>
      )}
    </div>
  );
}
