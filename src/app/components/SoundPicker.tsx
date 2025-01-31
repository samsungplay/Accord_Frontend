"use client";
import React, {
  ChangeEvent,
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AiFillSound } from "react-icons/ai";
import {
  FaArrowLeft,
  FaArrowRight,
  FaCheck,
  FaMusic,
  FaPlay,
  FaPlus,
  FaSearch,
  FaStop,
} from "react-icons/fa";
import PrimaryInput from "./PrimaryInput";
import PrimaryButton from "./PrimaryButton";
import { BiSolidImageAdd } from "react-icons/bi";
import { Popover } from "react-tiny-popover";
import EmojiPicker from "@emoji-mart/react";
import GenericUtil from "../util/GenericUtil";
import {
  FaFileCircleCheck,
  FaFileCircleExclamation,
  FaFileCirclePlus,
  FaFileCircleXmark,
  FaShuffle,
  FaVolumeLow,
} from "react-icons/fa6";
import { useMutation, useQuery } from "@tanstack/react-query";
import api from "../api/api";
import ModalUtils from "../util/ModalUtil";
import ModalContext from "../contexts/ModalContext";
import { MdDelete, MdError, MdHearing, MdLoop } from "react-icons/md";
import { ChatRoom } from "../types/ChatRoom";
import FloatingButton from "./FloatingButton";
import queryClient from "../query/QueryClient";
import { Sound } from "../types/Sound";
import SoundUtil from "../util/SoundUtil";
import Constants from "../constants/Constants";
import { User } from "../types/User";
import { format } from "date-fns";
import AudioPreview from "./AudioPreview";
import ContentDisplayContext from "../contexts/ContentDisplayContext";
import CallContext from "../contexts/CallContext";
import { TfiLoop } from "react-icons/tfi";
import { ScaleLoader } from "react-spinners";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DroppableProvided,
} from "@hello-pangea/dnd";
import ToastUtils from "../util/ToastUtil";
import ToastContext from "../contexts/ToastContext";
import useIsLightMode from "../hooks/useIsLightMode";
import { ChatRoomRoleSettings } from "../types/ChatRoomRoleSettings";

export default function SoundPicker({
  currentChatRoom: currentChatRoomInstance,
  setEmojiBubbleShortCode,
  currentUser,
  soundPickerPending,
  setSoundPickerPending,
  excludeMusicTab = false,
  customOnSelectedSound,
  queryChatRoomId = -5,
  customOnDeletedSound,
}: {
  currentChatRoom: ChatRoom;
  setEmojiBubbleShortCode?: Dispatch<
    SetStateAction<{ [userId: number]: string }>
  >;
  currentUser: User;
  soundPickerPending?: boolean;
  setSoundPickerPending?: Dispatch<SetStateAction<boolean>>;
  excludeMusicTab?: boolean;
  customOnSelectedSound?: (sound: Sound) => void;
  queryChatRoomId?: number;
  customOnDeletedSound?: () => void;
}) {
  useLayoutEffect(() => {
    setInitialized(true);
  }, []);

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
      return currentChatRoomInstance;
    }
  }, [currentChatRoomInstance, chatRoom.data?.data]);

  const [initialized, setInitialized] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [soundIcon, setSoundIcon] = useState("");
  const [nameError, setNameError] = useState("");
  const [iconError, setIconError] = useState("");
  const [fileError, setFileError] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [hearing, setHearing] = useState<Sound | null>(null);
  const [sharePlaying, setSharePlaying] = useState<Sound | null>(null);
  const [audioPlayerPortal, setAudioPlayerPortalRef] =
    useState<HTMLDivElement | null>(null);

  const [shouldStartNewSong, setShouldStartNewSong] = useState(false);

  useEffect(() => {
    if (contentDisplayContext?.rootMusicPlayerRef.current) {
      contentDisplayContext.rootMusicPlayerRef.current.muted = hearing !== null;
    }
  }, [hearing]);
  useEffect(() => {
    if (
      audioPlayerPortal &&
      sharePlaying &&
      selectedTab === 4 &&
      callContext?.synchronizeMusicEventQueue.current
    ) {
      contentDisplayContext?.setRootMusicPlayerOptions((prev) => {
        if (!prev)
          return {
            autoPlay: shouldStartNewSong ? "withevent" : undefined,
            customTextColor: "text-lime-400",
            uuid: sharePlaying.type + "_" + sharePlaying.name,
            src: Constants.SERVER_STATIC_CONTENT_PATH + sharePlaying.file,
            targetElement: audioPlayerPortal,
            allLoop: false,
            loop: false,
            srcList: soundData
              .filter((e) => e.type === "music")
              .map((e) => Constants.SERVER_STATIC_CONTENT_PATH + e.file),
          };
        else {
          return {
            ...prev,
            autoPlay: shouldStartNewSong ? "withevent" : undefined,
            uuid: sharePlaying.type + "_" + sharePlaying.name,
            src: Constants.SERVER_STATIC_CONTENT_PATH + sharePlaying.file,
            targetElement: audioPlayerPortal,
          };
        }
      });

      if (shouldStartNewSong)
        callContext.synchronizeMusicEventQueue.current.push({
          type: "SRC_LIST",
          time: 0,
          timestamp: Date.now(),
          src: soundData
            .filter((e) => e.type === "music")
            .map((e) => Constants.SERVER_STATIC_CONTENT_PATH + e.file)
            .join("@"),
        });

      setShouldStartNewSong(false);
    } else {
      contentDisplayContext?.setRootMusicPlayerOptions((prev) => {
        if (prev) {
          return {
            ...prev,
            targetElement: null,
          };
        }
        return prev;
      });
    }
  }, [audioPlayerPortal, sharePlaying, selectedTab, shouldStartNewSong]);

  const searchValueDeferred = useDeferredValue(searchValue);
  const [name, setName] = useState("");

  const [audioDuration, setAudioDuration] = useState(1000000);
  const [activeSoundName, setActiveSoundName] = useState("");
  const pendingTimeout = useRef<NodeJS.Timeout | null>(null);

  const modalContext = useContext(ModalContext);
  const contentDisplayContext = useContext(ContentDisplayContext);
  const callContext = useContext(CallContext);
  const [file, setFile] = useState<File | string>("");
  const defaultSoundData = useMemo(() => {
    return [
      {
        id: 0,
        name: "Chirp",
        icon: ":bird:",
        file: "sound_chirp.wav",
        type: "sound",
        duration: 3210,
      },
      {
        id: 0,
        name: "Explosion",
        icon: ":boom:",
        file: "sound_explosion.wav",
        type: "sound",
        duration: 4865,
      },
      {
        id: 0,
        name: "Wind",
        icon: ":dash:",
        file: "sound_wind.mp3",
        type: "sound",
        duration: 2090,
      },
      {
        id: 0,
        name: "Bell",
        icon: ":bell:",
        file: "sound_bell.wav",
        type: "sound",
        duration: 889,
      },
      {
        id: 0,
        name: "Splash",
        icon: ":droplet:",
        file: "sound_splash.mp3",
        type: "sound",
        duration: 2417,
      },
      {
        id: 0,
        name: "Car",
        icon: ":car:",
        file: "sound_car.wav",
        type: "sound",
        duration: 5000,
      },
      {
        id: 0,
        name: "Rain",
        icon: ":rain_cloud:",
        file: "sound_rain.wav",
        type: "sound",
        duration: 2415,
      },
    ];
  }, []);
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

  const soundData = useMemo((): Sound[] => {
    return shouldShowAddButton
      ? [
          ...defaultSoundData,
          ...currentChatRoom.sounds,
          {
            id: 0,
            name: "Add New",
            icon: "",
            file: "",
            type: "sound",
            duration: 0,
          },
        ]
      : [...defaultSoundData, ...currentChatRoom.sounds];
  }, [currentChatRoom.sounds, shouldShowAddButton]);

  useEffect(() => {
    if (contentDisplayContext?.rootMusicPlayerOptions?.src.length) {
      //skip to the current playing content, if there is any
      const soundName = contentDisplayContext.rootMusicPlayerOptions.src
        .split("/")
        .pop()
        ?.split("_")
        .pop()
        ?.split(".")[0];

      const item = soundData.find((sound) => sound.name === soundName);

      if (item) {
        setSharePlaying(item);
        setSelectedTab(4);
      }
    }

    return () => {
      if (contentDisplayContext?.rootMusicPlayerRef.current) {
        contentDisplayContext.rootMusicPlayerRef.current.muted = false;
      }
    };
  }, []);

  useEffect(() => {
    if (contentDisplayContext?.rootMusicPlayerOptions?.src.length) {
      //reactively set sharePlaying based on root music player's src
      const soundName = contentDisplayContext.rootMusicPlayerOptions.src
        .split("/")
        .pop()
        ?.split("_")
        .pop()
        ?.split(".")[0];

      const item = soundData.find((sound) => sound.name === soundName);

      if (item) {
        setSharePlaying(item);
      }
    } else {
      setSharePlaying(null);
      setSelectedTab((prev) => {
        if (prev === 4) {
          return 1;
        }
        return prev;
      });
    }
  }, [contentDisplayContext?.rootMusicPlayerOptions?.src]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSoundIconSelect = useCallback((e: any) => {
    setSoundIcon(e["shortcodes"]);
    setEmojiOpen(false);
  }, []);

  const handleSoundFileSelect = useCallback(() => {
    if (fileInputRef.current && file !== "Loading...") {
      fileInputRef.current.click();
    }
  }, [file]);

  const handleOnSoundFileUpload = useCallback(
    async (e: ChangeEvent, isMusic: boolean) => {
      if (file !== "Loading..." && e.target instanceof HTMLInputElement) {
        if (e.target.files) {
          const files = e.target.files;
          const file = files.item(0);
          const target = e.target as HTMLInputElement;
          if (file) {
            if (!isMusic && file.size > 1000000) {
              //sound files cannot exceed 1MB
              setFile("File >1MB");
              e.target.value = "";
              return;
            } else if (isMusic && file.size > 8000000) {
              //music files cannot exceed 8MB
              setFile("File >8MB");
              e.target.value = "";
              return;
            }

            if (!new RegExp("^[\\w\\-. ]+$").test(file.name)) {
              setFile("Name invalid");
              e.target.value = "";
              return;
            }

            if (
              !file.name.includes(".") ||
              !["mp3", "ogg", "wav"].includes(
                file.name.substring(file.name.lastIndexOf(".") + 1)
              )
            ) {
              setFile("File Invalid");
              e.target.value = "";
              return;
            }

            setFile("Loading...");
            const reader = new FileReader();
            reader.onload = (e) => {
              const audio = new Audio();
              if (e.target?.result) {
                audio.src = e.target.result as string;
              } else {
                target.value = "";
                setFile("File Invalid");
              }

              audio.onloadedmetadata = () => {
                if (!isMusic) {
                  if (audio.duration <= 5) {
                    setFile(file);
                    setAudioDuration(Math.round(audio.duration * 1000));

                    target.value = "";
                  } else {
                    target.value = "";
                    setFile(">5 seconds");
                  }
                } else {
                  if (audio.duration <= 5) {
                    setFile("<5 seconds");
                  } else if (audio.duration <= 600 && audio.duration > 5) {
                    setFile(file);
                    setAudioDuration(Math.round(audio.duration * 1000));

                    target.value = "";
                  } else {
                    target.value = "";
                    setFile(">10 minutes");
                  }
                }
              };

              audio.onerror = () => {
                target.value = "";
                setFile("File Invalid");
              };
            };

            reader.onerror = () => {
              target.value = "";
              setFile("File Invalid");
            };

            reader.readAsDataURL(file);
          }
        }
      }
    },
    [file]
  );

  useEffect(() => {
    if (selectedTab === 2) {
      setSoundIcon("");
      setFile("");
      setFileError("");
      setIconError("");
      setNameError("");
      setName("");
    }

    if (selectedTab !== 4) {
      setHearing(null);
    }
  }, [selectedTab]);

  useEffect(() => {
    return () => {
      contentDisplayContext?.setRootMusicPlayerOptions((prev) => {
        if (prev) {
          return {
            ...prev,
            targetElement: null,
          };
        }
        return prev;
      });
    };
  }, []);

  const removeSoundMutation = useMutation({
    mutationFn: ({ name, type }: { name: string; type: string }) => {
      return api.delete(
        "/chatrooms/directmessaging/" +
          currentChatRoom.id +
          "/" +
          type +
          "/" +
          name
      );
    },
    onSettled: (data, error, variables) => {
      if (data?.status === 200) {
        queryClient.setQueryData(
          ["chatroom_dm", currentChatRoom.id.toString()],
          (prev: { data: ChatRoom }) => {
            if (!prev) return prev;
            return {
              data: {
                ...prev.data,
                sounds: prev.data.sounds.filter(
                  (e) => e.name !== variables.name || e.type !== variables.type
                ),
              },
            };
          }
        );
        if (variables.type === "sound") setSelectedTab(0);
        else setSelectedTab(1);

        if (customOnDeletedSound) {
          customOnDeletedSound();
        }
      } else if (data) {
        ModalUtils.handleGenericError(modalContext, data);
      }
    },
  });

  const handleRemoveSound = useCallback(
    (name: string, type: string) => {
      if (!removeSoundMutation.isPending) {
        ModalUtils.openYesorNoModal(
          modalContext,
          type === "sound" ? "DELETE SOUND" : "DELETE MUSIC",
          "",
          () => {
            if (!removeSoundMutation.isPending) {
              removeSoundMutation.mutate({
                name,
                type,
              });
            }
          },
          undefined,
          <div className="text-whiter">
            Are you sure you want to delete{" "}
            {type === "sound" ? "sound" : "music"}{" "}
            <span className="whitespace-nowrap text-lime-400 font-bold">
              {name}
            </span>{" "}
            from this chatroom?
          </div>
        );
      }
    },
    [removeSoundMutation]
  );

  const dispatchSoundMutation = useMutation({
    mutationFn: (sound: Sound) => {
      return api.post("/call/sound", {
        name: sound.name,
      });
    },
    onSettled(data, error, variables) {
      if (data && data.status !== 200) {
        ModalUtils.handleGenericError(modalContext, data);
      }
      pendingTimeout.current = setTimeout(() => {
        if (setSoundPickerPending) setSoundPickerPending(false);
        setActiveSoundName("");
      }, variables.duration);
    },
  });

  const handleDispatchSound = useCallback(
    (sound: Sound) => {
      if (
        !dispatchSoundMutation.isPending &&
        setEmojiBubbleShortCode &&
        !soundPickerPending
      ) {
        if (pendingTimeout.current) {
          clearTimeout(pendingTimeout.current);
        }
        setEmojiBubbleShortCode((prev) => ({
          ...prev,
          [currentUser.id]:
            sound.duration.toString() +
            "::" +
            "sound_" +
            sound.icon +
            "@@" +
            Date.now(),
        }));
        SoundUtil.playSoundOverwrite(
          Constants.SERVER_STATIC_CONTENT_PATH + sound.file,
          "sound"
        );

        setActiveSoundName(sound.name);
        if (setSoundPickerPending) setSoundPickerPending(true);
        dispatchSoundMutation.mutate(sound);
      }
    },
    [dispatchSoundMutation, currentUser.id, soundPickerPending]
  );

  const addSoundMutation = useMutation({
    mutationFn: ({
      name,
      icon,
      file,
      duration,
      type,
    }: {
      type: string;
      name: string;
      icon: string;
      file: File;
      duration: number;
    }) => {
      const formData = new FormData();
      formData.set("type", type);
      formData.set("name", name);
      formData.set("icon", icon);
      formData.set("file", file);
      formData.set("duration", Math.max(500, duration).toString());
      return api.post(
        "/chatrooms/directmessaging/" + currentChatRoom.id + "/sound",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
    },
    onSettled(data, error, variables) {
      if (data?.status === 200) {
        queryClient.setQueryData(
          ["chatroom_dm", currentChatRoom.id.toString()],
          (prev: { data: ChatRoom }) => {
            if (!prev) return prev;
            return {
              data: {
                ...prev.data,
                sounds: [
                  ...prev.data.sounds,
                  {
                    id: 0,
                    type: variables.type,
                    name: variables.name,
                    icon: variables.icon,
                    file:
                      variables.type +
                      "_" +
                      currentChatRoom.id +
                      "_" +
                      variables.name +
                      "." +
                      variables.file.name.split(".").pop(),
                    duration: variables.duration,
                  },
                ],
              },
            };
          }
        );
        if (variables.type === "sound") setSelectedTab(0);
        else setSelectedTab(1);
      } else if (data?.status === 400) {
        const errorMessage: string = data.data;

        if (errorMessage.includes("File")) {
          setFileError(
            errorMessage.substring(errorMessage.indexOf(":") + 1) +
              "@" +
              Date.now()
          );
          setIconError("");
          setNameError("");
        } else if (errorMessage.includes("Icon")) {
          setIconError(
            errorMessage.substring(errorMessage.indexOf(":") + 1) +
              "@" +
              Date.now()
          );
          setFileError("");
          setNameError("");
        } else if (errorMessage.includes("Name")) {
          setNameError(
            errorMessage.substring(errorMessage.indexOf(":") + 1) +
              "@" +
              Date.now()
          );
          setFileError("");
          setIconError("");
        } else {
          ModalUtils.handleGenericError(modalContext, data);
        }
      } else if (data) {
        ModalUtils.handleGenericError(modalContext, data);
      }
    },
  });

  const handleAddSound = useCallback(
    (
      name: string,
      icon: string,
      file: File | string,
      duration: number,
      type: string
    ) => {
      if (!addSoundMutation.isPending) {
        if (name.trim().length <= 0) {
          setNameError("Required@" + Date.now());
          return;
        } else if (name.includes("@") || name.includes("_")) {
          setNameError("Cannot contain '@ or _'@" + Date.now());
          return;
        } else {
          setNameError("");
        }

        if (icon.length === 0) {
          setIconError("Please choose icon@" + Date.now());
          return;
        } else {
          setIconError("");
        }

        if (!(file instanceof File)) {
          setFileError("Invalid file@" + Date.now());
          return;
        } else {
          setFileError("");
        }

        addSoundMutation.mutate({
          name,
          icon,
          file,
          duration,
          type,
        });
      }
    },
    [addSoundMutation]
  );

  const currentMusicSrcIndex = useMemo(() => {
    const rootMusicPlayerOptions =
      contentDisplayContext?.rootMusicPlayerOptions;
    if (!rootMusicPlayerOptions) return -1;
    return rootMusicPlayerOptions.srcList.indexOf(rootMusicPlayerOptions.src);
  }, [contentDisplayContext?.rootMusicPlayerOptions]);

  const handlePlayNextOrPrevMusic = useCallback(
    (next: boolean) => {
      const rootMusicPlayerOptions =
        contentDisplayContext?.rootMusicPlayerOptions;
      if (!rootMusicPlayerOptions) return;
      if (rootMusicPlayerOptions.srcList.length === 0) {
        return;
      }
      //always wrap around the next/prev song
      const i = rootMusicPlayerOptions.srcList.indexOf(
        rootMusicPlayerOptions.src
      );

      if (next) {
        let nextI = i + 1;

        if (i !== -1) {
          if (nextI > rootMusicPlayerOptions.srcList.length - 1) nextI = 0;
          let moved = false;
          contentDisplayContext?.setRootMusicPlayerOptions((prev) => {
            if (prev) {
              moved = true;
              return {
                ...prev,
                autoPlay: "withevent",
                src: rootMusicPlayerOptions.srcList[nextI],
              };
            }
            return prev;
          });

          if (!moved) {
            callContext?.setCallErrorText((prev) => ({
              ...prev,
              musicStatus: "Music Out-of-sync",
            }));
          }
        } else {
          callContext?.setCallErrorText((prev) => ({
            ...prev,
            musicStatus: "Music Out-of-sync",
          }));
        }
      } else {
        let prevI = i - 1;
        if (i !== -1) {
          if (prevI < 0) prevI = rootMusicPlayerOptions.srcList.length - 1;
          let moved = false;
          contentDisplayContext?.setRootMusicPlayerOptions((prev) => {
            if (prev) {
              moved = true;
              return {
                ...prev,
                autoPlay: "withevent",
                src: rootMusicPlayerOptions.srcList[prevI],
              };
            }
            return prev;
          });

          if (!moved) {
            callContext?.setCallErrorText((prev) => ({
              ...prev,
              musicStatus: "Music Out-of-sync",
            }));
          }
        } else {
          callContext?.setCallErrorText((prev) => ({
            ...prev,
            musicStatus: "Music Out-of-sync",
          }));
        }
      }
    },
    [contentDisplayContext?.rootMusicPlayerOptions]
  );

  const handleToggleLoop = useCallback(() => {
    if (
      contentDisplayContext?.rootMusicPlayerOptions &&
      contentDisplayContext?.rootMusicPlayerRef.current &&
      callContext?.synchronizeMusicEventQueue.current
    ) {
      if (contentDisplayContext.rootMusicPlayerOptions.loop) {
        contentDisplayContext.setRootMusicPlayerOptions((prev) => {
          if (prev) {
            return {
              ...prev,
              loop: false,
            };
          }
          return prev;
        });
        contentDisplayContext.rootMusicPlayerRef.current.loop = false;
        callContext.synchronizeMusicEventQueue.current.push({
          type: "LOOP",
          time: 0,
          timestamp: Date.now(),
          src: contentDisplayContext.rootMusicPlayerOptions.src,
        });
      } else {
        contentDisplayContext.setRootMusicPlayerOptions((prev) => {
          if (prev) {
            return {
              ...prev,
              loop: true,
            };
          }
          return prev;
        });
        contentDisplayContext.rootMusicPlayerRef.current.loop = true;
        callContext.synchronizeMusicEventQueue.current.push({
          type: "LOOP",
          time: 1,
          timestamp: Date.now(),
          src: contentDisplayContext.rootMusicPlayerOptions.src,
        });
      }
    }
  }, [contentDisplayContext?.rootMusicPlayerOptions]);

  const handleToggleAllLoop = useCallback(() => {
    if (
      contentDisplayContext?.rootMusicPlayerOptions &&
      contentDisplayContext?.rootMusicPlayerRef.current &&
      callContext?.synchronizeMusicEventQueue.current
    ) {
      if (contentDisplayContext.rootMusicPlayerOptions.allLoop) {
        contentDisplayContext.setRootMusicPlayerOptions((prev) => {
          if (prev) {
            return {
              ...prev,
              allLoop: false,
            };
          }
          return prev;
        });
        callContext.synchronizeMusicEventQueue.current.push({
          type: "ALL_LOOP",
          time: 0,
          timestamp: Date.now(),
          src: contentDisplayContext.rootMusicPlayerOptions.src,
        });
      } else {
        contentDisplayContext.setRootMusicPlayerOptions((prev) => {
          if (prev) {
            return {
              ...prev,
              allLoop: true,
            };
          }
          return prev;
        });
        callContext.synchronizeMusicEventQueue.current.push({
          type: "ALL_LOOP",
          time: 1,
          timestamp: Date.now(),
          src: contentDisplayContext.rootMusicPlayerOptions.src,
        });
      }
    }
  }, [contentDisplayContext?.rootMusicPlayerOptions]);

  const toastContext = useContext(ToastContext);

  const reorderMusicMutation = useMutation({
    onMutate({
      orderIndicesInverse,
    }: {
      orderIndices: { [key: string]: number };
      orderIndicesInverse: { [key: number]: string };
      shuffle?: boolean;
    }) {
      //optimistically reorder music
      const previous = queryClient.getQueryData<{ data: ChatRoom }>([
        "chatroom_dm",
        currentChatRoom.id.toString(),
      ]);
      queryClient.setQueryData(
        ["chatroom_dm", currentChatRoom.id.toString()],
        (prev: { data: ChatRoom }) => {
          if (!prev) return prev;

          const existingSounds = prev.data.sounds.filter(
            (s) => s.type === "sound"
          );
          const existingMusics = prev.data.sounds.filter(
            (s) => s.type === "music"
          );

          let newSounds = [...existingSounds];

          Object.keys(orderIndicesInverse)
            .map((e) => parseInt(e))
            .sort()
            .forEach((key) => {
              const musicName = orderIndicesInverse[key];
              const music = existingMusics.find((e) => e.name === musicName);
              if (music) newSounds.push(music);
            });

          if (
            newSounds.length !==
            existingMusics.length + existingSounds.length
          ) {
            newSounds = prev.data.sounds;
          }

          return {
            data: {
              ...prev.data,
              sounds: newSounds,
            },
          };
        }
      );

      return {
        previous,
      };
    },
    mutationFn({
      orderIndices,
    }: {
      orderIndices: { [key: string]: number };
      orderIndicesInverse: { [key: number]: string };
      shuffle?: boolean;
    }) {
      return api.post(
        `/chatrooms/directmessaging/${currentChatRoom.id}/music/reorder
        `,
        orderIndices
      );
    },
    onSettled(data, error, variables, context) {
      if (!data) return;
      if (data.status !== 200) {
        queryClient.setQueryData(
          ["chatroom_dm", currentChatRoom.id.toString()],
          context?.previous
        );
        ModalUtils.handleGenericError(modalContext, data);
      } else {
        if (contentDisplayContext?.rootMusicPlayerOptions) {
          contentDisplayContext?.setRootMusicPlayerOptions((prev) => {
            if (prev) {
              return {
                ...prev,
                srcList: soundData
                  .filter((e) => e.type === "music")
                  .map((e) => Constants.SERVER_STATIC_CONTENT_PATH + e.file),
              };
            }
            return prev;
          });

          callContext?.synchronizeMusicEventQueue.current.push({
            type: "SRC_LIST",
            time: 0,
            timestamp: Date.now(),
            src: soundData
              .filter((e) => e.type === "music")
              .map((e) => Constants.SERVER_STATIC_CONTENT_PATH + e.file)
              .join("@"),
          });
        }

        if (variables.shuffle) {
          ToastUtils.openSplashToast(
            toastContext,
            <div className="flex items-center font-bold justify-center gap-2">
              Music Shuffled <FaCheck />
            </div>
          );
        }
      }
    },
  });

  const handleOnReorderMusic = useCallback(
    (start: number, end: number) => {
      const musicData = soundData
        .filter((e) => e.type === "music")
        .map((e) => e.name);

      if (musicData.length >= 2 && !reorderMusicMutation.isPending) {
        const orderIndices: { [key: string]: number } = {};
        const orderIndicesInverse: { [key: number]: string } = {};

        const [spliced] = musicData.splice(start, 1);
        musicData.splice(end, 0, spliced);

        for (let i = 0; i < soundData.length; i++) {
          if (soundData[i].type === "music") {
            const index = musicData.indexOf(soundData[i].name);
            orderIndices[soundData[i].name] = index;
            orderIndicesInverse[index] = soundData[i].name;
          }
        }

        reorderMusicMutation.mutate({
          orderIndices,
          orderIndicesInverse,
        });
      }
    },
    [soundData, reorderMusicMutation]
  );

  const handleShuffleMusic = useCallback(() => {
    if (!reorderMusicMutation.isPending) {
      const musicData = soundData.filter((e) => e.type === "music");
      const orderIndices: { [key: string]: number } = {};
      const orderIndicesInverse: { [key: number]: string } = {};
      for (let i = musicData.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        const temp = musicData[i];
        musicData[i] = musicData[j];
        musicData[j] = temp;
      }
      for (let i = 0; i < musicData.length; i++) {
        orderIndices[musicData[i].name] = i;
        orderIndicesInverse[i] = musicData[i].name;
      }

      reorderMusicMutation.mutate({
        orderIndices,
        orderIndicesInverse,
        shuffle: true,
      });
    }
  }, [soundData, reorderMusicMutation]);

  const isLightMode = useIsLightMode();

  return (
    <div
      key={initialized ? "init" : "no"}
      id="soundPickerRoot"
      className={`w-[60vw] md:w-[30vw] h-[50vh] md:h-[40vh] flex flex-col rounded-md bg-lime-700 shadow-md text-lime-400 soundPicker animate-fadeInUpFaster`}
      style={{
        boxShadow:
          selectedTab === 1 || selectedTab === 3 || selectedTab === 4
            ? "inset 0 0.25rem 50rem rgba(249,115,22,0.5)"
            : "",
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          handleOnSoundFileUpload(e, selectedTab === 3);
        }}
        accept=".ogg, .mp3, .wav"
      />
      <div className="flex items-center justify-evenly">
        <Popover
          parentElement={
            document.getElementById("soundPickerRoot") ?? document.body
          }
          isOpen={emojiOpen}
          containerStyle={{
            zIndex: 50,
          }}
          positions={["bottom", "top", "right", "left"]}
          onClickOutside={() => setEmojiOpen(false)}
          content={
            <div className="mb-2 ml-[2.5rem] overflow-scroll">
              <div className="w-full h-full sm:hidden">
                <EmojiPicker
                  perLine={7}
                  onEmojiSelect={handleSoundIconSelect}
                  className="max-h-[50vh]"
                />
              </div>
              <div className="w-full h-full hidden sm:block">
                <EmojiPicker
                  className="max-h-[50vh]"
                  onEmojiSelect={handleSoundIconSelect}
                />
              </div>
            </div>
          }
        >
          <div
            className={`${
              (selectedTab === 0 || selectedTab === 2) && "bg-lime-600"
            } p-2 cursor-pointer hover:bg-lime-600 transition w-full text-center flex gap-1 items-center justify-center`}
            onClick={() => {
              setSelectedTab(0);
            }}
          >
            <AiFillSound />
            Sounds
          </div>
        </Popover>
        <div
          className={`${
            (selectedTab === 1 || selectedTab === 3 || selectedTab === 4) &&
            "bg-lime-600"
          } p-2 cursor-pointer hover:bg-lime-600 transition w-full text-center flex gap-1 items-center justify-center
           ${excludeMusicTab && "hidden"}`}
          style={{
            boxShadow: isLightMode
              ? "inset 0 0.25rem 5rem rgb(251,146,60)"
              : "inset 0 0.25rem 5rem rgb(249,115,22)",
          }}
          onClick={() => {
            setSelectedTab(1);
          }}
        >
          <FaMusic />
          Music
        </div>
      </div>

      <div
        className={`h-[0.1rem] bg-lime-500 w-[50%] transition-transform ${
          selectedTab === 0 || selectedTab === 2
            ? "translate-x-[0%]"
            : "translate-x-[100%]"
        } `}
      />

      {selectedTab === 0 ? (
        <>
          <div className="animate-fadeIn flex w-full items-center justify-end gap-1 mb-2 mt-1 px-2">
            <FaSearch />
            <PrimaryInput
              customStylesInput="w-full"
              id={"soundSearchInput"}
              type={"text"}
              placeholder="Search..."
              onChange={(e) => setSearchValue(e.target.value)}
              value_={searchValue}
            />
          </div>

          <div className="flex animate-fadeIn flex-wrap overflow-scroll">
            {soundData
              .filter(
                (sound) =>
                  sound.name
                    .toLowerCase()
                    .includes(searchValueDeferred.toLowerCase()) &&
                  sound.type === "sound"
              )
              .map((soundItem) => {
                return (
                  <div
                    key={"sound_" + soundItem.name}
                    onClick={() => {
                      if (soundItem.name === "Add New") {
                        setTimeout(() => {
                          setSelectedTab(2);
                        }, 110);
                      } else {
                        if (customOnSelectedSound) {
                          customOnSelectedSound(soundItem);
                        } else handleDispatchSound(soundItem);
                      }
                    }}
                    className={`${
                      soundItem.name === "Add New"
                        ? "bg-lime-700 hover:bg-lime-500"
                        : "bg-lime-600 hover:bg-lime-500"
                    } border-4 border-transparent ${
                      activeSoundName === soundItem.name && "border-orange-500"
                    } grid place-content-center w-[100%] md:w-[50%] lg:w-[33.33333333%] aspect-[2/1] md:aspect-square transition-all
                cursor-pointer relative group`}
                    style={{
                      boxShadow:
                        activeSoundName === soundItem.name
                          ? isLightMode
                            ? "inset 0 0.25rem 5rem rgb(251,146,60)"
                            : "inset 0 0.25rem 5rem rgb(249,115,22)"
                          : "",
                    }}
                  >
                    {soundItem.name !== "Add New" &&
                      !defaultSoundData.find(
                        (e) => e.name === soundItem.name
                      ) &&
                      shouldShowDeleteButton && (
                        <div className="hidden group-hover:block absolute top-0 right-0">
                          <FloatingButton
                            backgroundColor="bg-transparent"
                            hoverColor="hover:text-red-500"
                            description="Delete"
                            backgroundGroupHoverColor="group-hover:bg-transparent"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveSound(soundItem.name, soundItem.type);
                            }}
                          >
                            <MdDelete />
                          </FloatingButton>
                        </div>
                      )}

                    {soundItem.name !== "Add New" && (
                      <div className="hidden group-hover:block absolute top-0 left-0">
                        <FloatingButton
                          backgroundColor="bg-transparent"
                          hoverColor="hover:text-lime-400"
                          description="Preview"
                          backgroundGroupHoverColor="group-hover:bg-transparent"
                          onClick={(e) => {
                            e.stopPropagation();
                            SoundUtil.playSoundOverwrite(
                              Constants.SERVER_STATIC_CONTENT_PATH +
                                soundItem.file
                            );
                          }}
                        >
                          <FaVolumeLow />
                        </FloatingButton>
                      </div>
                    )}
                    <div
                      className={`flex flex-col items-center justify-center transition-transform relative ${
                        activeSoundName === soundItem.name && "scale-150"
                      }`}
                    >
                      {soundItem.name === "Add New" ? (
                        <FaPlus />
                      ) : (
                        /*@ts-expect-error jsx does not recognize em-emoji html tag */
                        <em-emoji shortcodes={soundItem.icon}></em-emoji>
                      )}
                    </div>
                    <p className="">{soundItem.name}</p>
                  </div>
                );
              })}
          </div>
        </>
      ) : (
        <></>
      )}

      {selectedTab === 1 ? (
        <>
          <div className="animate-fadeIn flex w-full items-center justify-end gap-1 mb-2 mt-1 px-2 text-orange-500">
            <FaSearch />
            <PrimaryInput
              customStylesInput="w-full bg-orange-500"
              id={"soundSearchInput"}
              type={"text"}
              placeholder="Search..."
              onChange={(e) => setSearchValue(e.target.value)}
              value_={searchValue}
            />

            <FloatingButton
              description="Shuffle List"
              backgroundColor="bg-transparent"
              backgroundGroupHoverColor="group-hover:bg-transparent"
              customTextColor={"text-orange-500"}
              hoverColor="hover:text-lime-600"
              //from here
              onClick={handleShuffleMusic}
            >
              <FaShuffle />
            </FloatingButton>
          </div>

          <DragDropContext
            onDragEnd={(result) => {
              if (!result.destination) {
                return;
              }
              handleOnReorderMusic(
                result.source.index,
                result.destination.index
              );
            }}
          >
            <Droppable droppableId="droppable-musiclist">
              {(provided: DroppableProvided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className={`flex flex-col overflow-auto`}
                >
                  {soundData
                    .filter(
                      (sound) =>
                        sound.name
                          .toLowerCase()
                          .includes(searchValueDeferred.toLowerCase()) &&
                        sound.type === "music"
                    )
                    .map((soundItem, i) => {
                      return (
                        <Draggable
                          key={"music_" + soundItem.name}
                          draggableId={"music_" + soundItem.name}
                          index={i}
                        >
                          {(provided, snapshot) => (
                            <div
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              ref={provided.innerRef}
                              className={`flex items-center cursor-pointer p-4 transition text-lg  bg-lime-600
                                ${snapshot.isDragging && "bg-lime-700"}
                              `}
                              style={{
                                ...provided.draggableProps.style,
                                boxShadow:
                                  sharePlaying?.name === soundItem.name
                                    ? "inset 0 0.25rem 3rem rgb(255,255,255)"
                                    : isLightMode
                                    ? "inset 0 0.25rem 5rem rgb(251,146,60)"
                                    : "inset 0 0.25rem 5rem rgb(249,115,22)",
                              }}
                            >
                              <div className="mr-2 hidden md:block">
                                <FaMusic />
                              </div>
                              {/*@ts-expect-error jsx does not recognize em-emoji html tag */}
                              <em-emoji shortcodes={soundItem.icon}></em-emoji>

                              <p className="ml-2 overflow-x-scroll no-scrollbar mr-2">
                                {soundItem.name}
                              </p>

                              <p className="ml-auto">
                                {format(new Date(soundItem.duration), "m:ss")}
                              </p>

                              <FloatingButton
                                description={
                                  sharePlaying?.name === soundItem.name
                                    ? "Now Playing"
                                    : "Play for all"
                                }
                                backgroundColor="bg-transparent"
                                backgroundGroupHoverColor="hover:bg-transparent"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTab(4);
                                  setHearing(null);
                                  setShouldStartNewSong(true);
                                  setSharePlaying(soundItem);
                                }}
                              >
                                {sharePlaying?.name === soundItem.name ? (
                                  <ScaleLoader
                                    height={"1rem"}
                                    color={
                                      isLightMode
                                        ? "rgb(132,204,22)"
                                        : "rgb(163,230,53)"
                                    }
                                  />
                                ) : (
                                  <FaPlay />
                                )}
                              </FloatingButton>

                              <FloatingButton
                                description="Preview"
                                backgroundColor="bg-transparent"
                                backgroundGroupHoverColor="hover:bg-transparent"
                                customTextColor="text-yellow-500"
                                onClick={() => {
                                  setTimeout(() => {
                                    setSelectedTab(4);
                                  }, 110);
                                  setHearing(soundItem);
                                }}
                              >
                                <MdHearing />
                              </FloatingButton>

                              {shouldShowDeleteButton && (
                                <FloatingButton
                                  backgroundColor="bg-transparent"
                                  hoverColor="hover:text-red-500"
                                  description="Delete"
                                  backgroundGroupHoverColor="group-hover:bg-transparent"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveSound(
                                      soundItem.name,
                                      soundItem.type
                                    );
                                  }}
                                >
                                  <MdDelete />
                                </FloatingButton>
                              )}
                            </div>
                          )}
                        </Draggable>
                      );
                    })}

                  {shouldShowAddButton && (
                    <div
                      onClick={() => {
                        setTimeout(() => setSelectedTab(3), 110);
                      }}
                      className="flex justify-center gap-2 items-center cursor-pointer transition hover:bg-lime-500 p-2"
                    >
                      <FaPlus /> Add New...
                    </div>
                  )}

                  <p className="text-lime-300">
                    <b>PROTIP</b>: You can drag the music items to reorder them
                  </p>
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </>
      ) : (
        <></>
      )}

      {(selectedTab === 2 || selectedTab === 3) && (
        <div
          className="animate-fadeIn flex flex-col p-2 overflow-y-scroll h-full justify-center
        "
        >
          {selectedTab === 2 ? (
            <div className="flex justify-center mt-2 items-center gap-2 text-lg">
              <AiFillSound />
              Add Sound
            </div>
          ) : (
            <div className="flex justify-center mt-2 items-center gap-2 text-lg text-orange-500">
              <FaMusic />
              Add Music
            </div>
          )}
          <div className="flex justify-center gap-2">
            <PrimaryButton
              key={"icon_" + iconError}
              customWidth="w-[5rem] h-[5rem] md:w-[7rem] md:h-[7rem]
              lg:w-[9rem] lg:h-[9rem]"
              customStyles={`mt-5 ${
                selectedTab === 2 ? "bg-lime-500" : "bg-orange-500"
              } p-3 md:p-5 lg:p-6 border-2 ${
                iconError.length
                  ? "animate-jiggle border-red-500"
                  : "border-transparent"
              }`}
              onclick={() => {
                setTimeout(() => {
                  setEmojiOpen((prev) => !prev);
                }, 100);
              }}
            >
              <div className={`hidden lg:grid place-content-center`}>
                {soundIcon.length ? (
                  /*@ts-expect-error jsx does not recognize em-emoji html tag */
                  <em-emoji shortcodes={soundIcon} size="5rem"></em-emoji>
                ) : (
                  <BiSolidImageAdd size={GenericUtil.remToPx(5)} />
                )}
              </div>

              <div className={`hidden md:grid place-content-center lg:hidden`}>
                {soundIcon.length ? (
                  /*@ts-expect-error jsx does not recognize em-emoji html tag */
                  <em-emoji shortcodes={soundIcon} size="4rem"></em-emoji>
                ) : (
                  <BiSolidImageAdd size={GenericUtil.remToPx(4)} />
                )}
              </div>
              <div className={`md:hidden grid place-content-center`}>
                {soundIcon.length ? (
                  /*@ts-expect-error jsx does not recognize em-emoji html tag */
                  <em-emoji shortcodes={soundIcon} size="3rem"></em-emoji>
                ) : (
                  <BiSolidImageAdd size={GenericUtil.remToPx(3)} />
                )}
              </div>
            </PrimaryButton>

            <PrimaryButton
              key={"file_" + fileError}
              customWidth="w-[5rem] h-[5rem] md:w-[7rem] md:h-[7rem]
              lg:w-[9rem] lg:h-[9rem]"
              customStyles={`mt-5 ${
                selectedTab === 2 ? "bg-lime-500" : "bg-orange-500"
              } p-3 md:p-5 lg:p-6 border-2 ${
                fileError.length
                  ? "animate-jiggle border-red-500"
                  : "border-transparent"
              }`}
              onclick={handleSoundFileSelect}
              disabled={file === "Loading..."}
            >
              {file === "" ? (
                <>
                  <div className={`hidden lg:grid place-content-center`}>
                    <FaFileCirclePlus size={GenericUtil.remToPx(5)} />
                  </div>
                  <div
                    className={`hidden md:grid place-content-center lg:hidden`}
                  >
                    <FaFileCirclePlus size={GenericUtil.remToPx(4)} />
                  </div>
                  <div className={`md:hidden grid place-content-center`}>
                    <FaFileCirclePlus size={GenericUtil.remToPx(3)} />
                  </div>{" "}
                </>
              ) : file === "Loading..." ? (
                <>
                  <div
                    className={`hidden lg:grid place-content-center text-yellow-500`}
                  >
                    <div className="mx-auto">
                      <FaFileCircleExclamation size={GenericUtil.remToPx(4)} />
                    </div>
                    <p className="text-ellipsis overflow-hidden max-w-[15ch] whitespace-nowrap">
                      {file}
                    </p>
                  </div>
                  <div
                    className={`hidden md:grid place-content-center lg:hidden text-yellow-500`}
                  >
                    <div className="mx-auto">
                      <FaFileCircleExclamation size={GenericUtil.remToPx(3)} />
                    </div>
                    <p className="text-ellipsis text-sm overflow-hidden max-w-[15ch] whitespace-nowrap">
                      {file}
                    </p>
                  </div>
                  <div
                    className={`md:hidden grid place-content-center text-yellow-500`}
                  >
                    <div className="mx-auto">
                      <FaFileCircleExclamation size={GenericUtil.remToPx(2)} />
                    </div>
                    <p className="text-ellipsis text-xs overflow-hidden max-w-[15ch] whitespace-nowrap">
                      {file}
                    </p>
                  </div>
                </>
              ) : typeof file === "string" ? (
                <>
                  <div
                    className={`hidden lg:grid place-content-center text-red-500`}
                  >
                    <div className="mx-auto">
                      <FaFileCircleXmark size={GenericUtil.remToPx(4)} />
                    </div>
                    <p className="text-ellipsis overflow-hidden max-w-[15ch] whitespace-nowrap">
                      {file}
                    </p>
                  </div>
                  <div
                    className={`hidden md:grid place-content-center lg:hidden text-red-500`}
                  >
                    <div className="mx-auto">
                      <FaFileCircleXmark size={GenericUtil.remToPx(3)} />
                    </div>
                    <p className="text-ellipsis text-sm overflow-hidden max-w-[15ch] whitespace-nowrap">
                      {file}
                    </p>
                  </div>
                  <div
                    className={`md:hidden grid place-content-center text-red-500`}
                  >
                    <div className="mx-auto">
                      <FaFileCircleXmark size={GenericUtil.remToPx(2)} />
                    </div>
                    <p className="text-ellipsis text-xs overflow-hidden max-w-[15ch] whitespace-nowrap">
                      {file}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className={`hidden lg:grid place-content-center`}>
                    <div className="mx-auto">
                      <FaFileCircleCheck size={GenericUtil.remToPx(4)} />
                    </div>
                    <p className="text-ellipsis overflow-hidden max-w-[15ch] whitespace-nowrap">
                      {file.name}
                    </p>
                  </div>
                  <div
                    className={`hidden md:grid place-content-center lg:hidden`}
                  >
                    <div className="mx-auto">
                      <FaFileCircleCheck size={GenericUtil.remToPx(3)} />
                    </div>
                    <p className="text-ellipsis text-sm overflow-hidden max-w-[15ch] whitespace-nowrap">
                      {file.name}
                    </p>
                  </div>
                  <div className={`md:hidden grid place-content-center`}>
                    <div className="mx-auto">
                      <FaFileCircleCheck size={GenericUtil.remToPx(2)} />
                    </div>
                    <p className="text-ellipsis text-xs overflow-hidden max-w-[15ch] whitespace-nowrap">
                      {file.name}
                    </p>
                  </div>
                </>
              )}
            </PrimaryButton>
          </div>

          <div className="flex justify-center items-center">
            <PrimaryInput
              key={"name_" + nameError}
              customStylesInput={`w-[50%] ml-1 mt-4 ${
                selectedTab === 3 && "bg-orange-500"
              }`}
              id={"newSoundNameInput"}
              label={"Name"}
              maxLength={12}
              type="text"
              errorMessage={nameError.substring(0, nameError.indexOf("@"))}
              value_={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {iconError.length ? (
            <div className="text-red-500 gap-1 mt-1 flex items-center justify-center">
              <MdError />
              {iconError.substring(0, iconError.indexOf("@"))}
            </div>
          ) : (
            <></>
          )}

          {fileError.length ? (
            <div className="text-red-500 flex mt-1 items-center gap-1 justify-center">
              <MdError />
              {fileError.substring(0, fileError.indexOf("@"))}
            </div>
          ) : (
            <></>
          )}

          <div className="">
            <PrimaryButton
              customStyles={
                selectedTab === 2 ? "mt-5 bg-lime-500" : "mt-5 bg-orange-500"
              }
              disabled={addSoundMutation.isPending}
              onclick={() => {
                const inputElement =
                  document.getElementById("newSoundNameInput");
                if (inputElement instanceof HTMLInputElement) {
                  handleAddSound(
                    inputElement.value,
                    soundIcon,
                    file,
                    audioDuration,
                    selectedTab === 2 ? "sound" : "music"
                  );
                }
              }}
            >
              {selectedTab === 2 ? (
                <div className="flex justify-center min-h-[2rem] items-center gap-1 text-lime-300">
                  <AiFillSound />
                  Add Sound
                </div>
              ) : (
                <div className="flex justify-center min-h-[2rem] items-center gap-1 text-lime-300">
                  <FaMusic />
                  Add Music
                </div>
              )}
            </PrimaryButton>
          </div>
        </div>
      )}

      {selectedTab === 4 ? (
        <div className="flex flex-col w-full h-full justify-center p-2 animate-fadeIn">
          {hearing && (
            <>
              <div className="flex justify-center">
                <div className="md:hidden">
                  {/*@ts-expect-error jsx does not recognize em-emoji html tag */}
                  <em-emoji shortcodes={hearing.icon} size={"3rem"}></em-emoji>
                </div>
                <div className="hidden md:block">
                  {/*@ts-expect-error jsx does not recognize em-emoji html tag */}
                  <em-emoji shortcodes={hearing.icon} size={"5rem"}></em-emoji>
                </div>
              </div>
              <p className="text-lg md:text-xl text-center text-lime-500">
                Now Previewing
              </p>
              <p className="text-lg md:text-xl text-center overflow-x-scroll font-bold">
                {hearing.name}
              </p>
              <AudioPreview
                autoPlay="simple"
                customTextColor="text-lime-400"
                uuid={"preview_" + hearing.type + "_" + hearing.name}
                src={Constants.SERVER_STATIC_CONTENT_PATH + hearing.file}
              />
            </>
          )}

          {sharePlaying && !hearing && (
            <>
              <div className="flex justify-center">
                <div className="md:hidden">
                  {/*@ts-expect-error jsx does not recognize em-emoji html tag */}
                  <em-emoji shortcodes={sharePlaying.icon} size={"3rem"}>
                    {/*@ts-expect-error jsx does not recognize em-emoji html tag */}
                  </em-emoji>
                </div>
                <div className="hidden md:block">
                  {/*@ts-expect-error jsx does not recognize em-emoji html tag */}
                  <em-emoji shortcodes={sharePlaying.icon} size={"5rem"}>
                    {/*@ts-expect-error jsx does not recognize em-emoji html tag */}
                  </em-emoji>
                </div>
              </div>
              <p className="text-lg md:text-xl text-center text-lime-500">
                Now Playing
              </p>
              <p className="text-lg md:text-xl text-center overflow-x-scroll font-bold">
                {sharePlaying.name}
              </p>

              <div className="flex items-center justify-center w-fit mx-auto">
                <FloatingButton
                  description="Loop"
                  backgroundColor="bg-transparent"
                  backgroundGroupHoverColor="group-hover:bg-transparent"
                  customTextColor={
                    contentDisplayContext?.rootMusicPlayerOptions?.loop
                      ? "text-lime-600"
                      : "text-white"
                  }
                  hoverColor="hover:text-lime-600"
                  onClick={handleToggleLoop}
                >
                  <MdLoop />
                </FloatingButton>

                <FloatingButton
                  description="Loop all"
                  backgroundColor="bg-transparent"
                  backgroundGroupHoverColor="group-hover:bg-transparent"
                  customTextColor={
                    contentDisplayContext?.rootMusicPlayerOptions?.allLoop
                      ? "text-lime-600"
                      : "text-white"
                  }
                  hoverColor="hover:text-lime-600"
                  onClick={handleToggleAllLoop}
                >
                  <TfiLoop />
                </FloatingButton>

                <FloatingButton
                  description="Shuffle"
                  backgroundColor="bg-transparent"
                  backgroundGroupHoverColor="group-hover:bg-transparent"
                  customTextColor={"text-white"}
                  hoverColor="hover:text-lime-600"
                  //from here
                  onClick={handleShuffleMusic}
                >
                  <FaShuffle />
                </FloatingButton>
              </div>
              {/*portal for the root audio player to be rendered here*/}
              <div ref={setAudioPlayerPortalRef}></div>

              <div className="flex items-center justify-center gap-2 w-full">
                <PrimaryButton
                  customStyles="mt-2 bg-lime-500"
                  onclick={() => {
                    handlePlayNextOrPrevMusic(true);
                  }}
                >
                  <div className="flex items-center justify-center gap-2 text-white">
                    <FaArrowLeft />

                    <p className="hidden md:inline">
                      {" "}
                      {currentMusicSrcIndex - 1 >= 0 ||
                      currentMusicSrcIndex === -1
                        ? "Previous"
                        : "To end"}
                    </p>
                  </div>
                </PrimaryButton>
                <PrimaryButton
                  customStyles="mt-2 bg-red-500"
                  onclick={() => {
                    setSelectedTab(1);
                    setSharePlaying(null);
                    callContext?.handleStopMusic();
                  }}
                >
                  <div className="flex items-center justify-center gap-2 text-white">
                    <FaStop />
                    <p className="hidden md:inline">Stop</p>
                  </div>
                </PrimaryButton>

                <PrimaryButton
                  customStyles="mt-2 bg-lime-500"
                  onclick={() => {
                    handlePlayNextOrPrevMusic(true);
                  }}
                >
                  <div className="flex items-center justify-center gap-2 text-white">
                    <FaArrowRight />
                    <p className="hidden md:inline">
                      {currentMusicSrcIndex + 1 <
                      (contentDisplayContext?.rootMusicPlayerOptions?.srcList
                        .length ?? 1000)
                        ? "Next"
                        : "To start"}
                    </p>
                  </div>
                </PrimaryButton>
              </div>
            </>
          )}
        </div>
      ) : (
        <></>
      )}
    </div>
  );
}
