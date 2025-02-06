import React, {
  Dispatch,
  MouseEventHandler,
  SetStateAction,
  useCallback,
  useContext,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { HexColorPicker } from "react-colorful";
import { BsExclamation } from "react-icons/bs";
import {
  FaArrowRight,
  FaCheck,
  FaEdit,
  FaGithub,
  FaKeyboard,
  FaUpload,
  FaVolumeMute,
} from "react-icons/fa";
import { FcCheckmark } from "react-icons/fc";
import { IoIosCloseCircleOutline } from "react-icons/io";
import { MdDelete, MdEdit, MdOutlineDelete, MdWarning } from "react-icons/md";
import FloatingButton from "./FloatingButton";
import PrimaryButton from "./PrimaryButton";
import PrimaryInput from "./PrimaryInput";
import Usercard from "./Usercard";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/api";
import AuthenticationContext from "../contexts/AuthenticationContext";
import ProfileAvatar from "./ProfileAvatar";
import { format } from "date-fns";
import { useOnClickOutside, useWindowSize } from "usehooks-ts";
import { User } from "../types/User";
import ModalUtils from "../util/ModalUtil";
import ModalContext from "../contexts/ModalContext";

import { useRouter } from "next/navigation";
import { GiPeaceDove } from "react-icons/gi";
import ChangePasswordForm from "./ChangePasswordForm";
import { FaVolumeHigh, FaX } from "react-icons/fa6";
import Spinner from "./Spinner";
import PrimarySwitch from "./PrimarySwitch";
import { UserSettings } from "../types/UserSettings";
import ChatRecord from "./ChatRecord";
import GenericUtil, { PreprocessedMediaStreamTrack } from "../util/GenericUtil";

import nightwind from "nightwind/helper";
import DraggableProgressbar from "./DraggableProgressbar";
import CallContext from "../contexts/CallContext";
import { ChatRoom } from "../types/ChatRoom";
import SoundPicker from "./SoundPicker";
import { Popover } from "react-tiny-popover";
import { CustomWindow } from "../types/globals";
import { Sound } from "../types/Sound";
import Constants from "../constants/Constants";
import { IoCamera, IoExitOutline } from "react-icons/io5";
import BackgroundUtil from "../util/BackgroundUtil";
import BackgroundPicker from "./BackgroundPicker";
import SoundUtil from "../util/SoundUtil";
import { LiaFlagUsaSolid } from "react-icons/lia";
import ChatInput from "./ChatInput";

declare let window: CustomWindow;
export default function SettingsPage({
  setOpen,
  defaultTab,
}: {
  setOpen: Dispatch<SetStateAction<boolean>>;
  defaultTab: string;
}) {
  const authenticationContext = useContext(AuthenticationContext);
  const user = authenticationContext?.currentUser;
  const queryClient = useQueryClient();
  const userSettings = useQuery({
    queryKey: ["user_settings"],
    queryFn: async () => {
      const response = await api.get<UserSettings>("/users/settings");
      return {
        data: response.data,
      };
    },
    refetchOnMount: false,
  });
  const currentUser = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const response = await api.get<User>("/users");
      return { data: response.data };
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
  const callContext = useContext(CallContext);
  const router = useRouter();
  const statusMessageCharacterLimit = 50;
  const profileImageFileInputRef = useRef<HTMLInputElement>(null);
  const [usernameError, setUsernameError] = useState("");
  const [nicknameError, setNicknameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [aboutMeError, setAboutMeError] = useState("");
  const [statusMessageError, setStatusMessageError] = useState("");
  const [profileImageError, setProfileImageError] = useState("");
  const [profileHasChange, setProfileHasChange] = useState(false);
  const [statusMessageInput, setStatusMessageInput] = useState(
    user?.statusMessage ?? ""
  );
  const [shouldExitAnimation, setShouldExitAnimation] = useState(false);

  const [usernameInput, setUsernameInput] = useState(user?.username ?? "");
  const [nicknameInput, setNicknameInput] = useState(user?.nickname ?? "");
  const [fileInput, setFileInput] = useState<FileList | string | null>(null);
  const [emailInput, setEmailInput] = useState(user?.email ?? "");
  const [profileColorInput, setProfileColorInput] = useState<string>(
    user?.profileColor ?? "#84CC16"
  );
  const [aboutMe, setAboutMe] = useState("");

  const currentUserAboutMe = useQuery({
    queryKey: ["currentuser_aboutme"],
    queryFn: async () => {
      const response = await api.get<string>("/users/aboutme");
      return {
        data: response.data,
      };
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const modalContext = useContext(ModalContext);

  const editProfileMutation = useMutation({
    mutationFn: (data: FormData) => {
      if (fileInput !== "default" && fileInput !== null) {
        return api.post("/users/profile", data, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      } else {
        data.set("editProfileColor", profileColorInput);

        return api.post("/users/profileNoImage", data, {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        });
      }
    },
    onSettled(data, err, variables) {
      if (data?.status === 200) {
        const newUserData = data.data as User;
        if (newUserData.username !== user?.username) {
          ModalUtils.openGenericModal(
            modalContext,
            "NOTE",
            "Because your username has changed, you will have to login again. Automatically logging out in 5 seconds..."
          );
          setTimeout(() => {
            logout();
          }, 5000);
        }
        queryClient.setQueryData(["user"], () => {
          return {
            data: {
              ...data.data,
            },
          };
        });

        queryClient.setQueryData(["currentuser_aboutme"], () => {
          return {
            data: variables.get("editProfileAboutMe"),
          };
        });

        setProfileHasChange(false);
        if (profileImageFileInputRef.current) {
          profileImageFileInputRef.current.value = "";
          profileImageFileInputRef.current.files = null;
        }
        setFileInput(null);
      } else if (data?.status === 413) {
        setProfileImageError("Image size exceeds 1MB!");
      } else if (data?.status === 400) {
        const errorMessage = data?.data;
        if (typeof errorMessage === "string") {
          if (errorMessage.toLowerCase().includes("nickname")) {
            setNicknameError(errorMessage);
          } else if (errorMessage.toLowerCase().includes("email")) {
            setEmailError(errorMessage);
          } else if (errorMessage.toLowerCase().includes("status message")) {
            setStatusMessageError(errorMessage);
          } else if (errorMessage.toLowerCase().includes("image")) {
            setProfileImageError(errorMessage);
          } else if (errorMessage.toLowerCase().includes("about me")) {
            setAboutMeError(errorMessage);
          }
        }
      }
    },
  });

  const aboutMeRef = useRef<string>("");
  useEffect(() => {
    aboutMeRef.current = aboutMe;
  }, [aboutMe]);

  const handleEditProfile = useCallback(
    (e: FormData) => {
      if (!profileHasChange || editProfileMutation.isPending) {
        return;
      }

      setUsernameError("");
      setNicknameError("");
      setEmailError("");
      setAboutMeError("");
      setProfileImageError("");
      setStatusMessageError("");

      setTimeout(() => {
        let hasError = false;
        const username = e.get("editProfileUsername")?.toString() || "";
        if (
          username.length > 30 ||
          username.length < 2 ||
          !new RegExp("^[\\p{N}\\p{L}_.]*$", "u").test(username)
        ) {
          setUsernameError("Invalid username");
          hasError = true;
        }
        const nickname = e.get("editProfileNickname")?.toString() || "";
        if (nickname.length > 30) {
          setNicknameError("Invalid nickname length!");
          hasError = true;
        }
        const email = e.get("editProfileEmail")?.toString() || "";

        if (email.length < 3 || email.length > 50) {
          setEmailError("Invalid email length!");
          hasError = true;
        }

        if (aboutMeRef.current.length > 255) {
          setAboutMeError("Invalid about me length!");
          hasError = true;
        }
        const statusMessage =
          e.get("editProfileStatusMessage")?.toString() || "";
        if (statusMessage.length > 50) {
          setStatusMessageError("Invalid status message length!");
          hasError = true;
        }

        e.set("editProfileAboutMe", aboutMeRef.current);

        if (!hasError) editProfileMutation.mutate(e);
      }, 100);
    },
    [profileHasChange, editProfileMutation]
  );

  useEffect(() => {
    const usernameChanged = usernameInput !== (user?.username ?? "");
    const nicknameChanged = nicknameInput !== (user?.nickname ?? "");
    const emailChanged = emailInput !== (user?.email ?? "");
    const statusMessageChanged =
      statusMessageInput !== (user?.statusMessage ?? "");
    const profileColorChanged =
      profileColorInput !== (user?.profileColor ?? "#84CC16") &&
      (fileInput === null || fileInput === "default");

    const aboutMeChanged = aboutMe !== currentUserAboutMe.data?.data;

    let profileImageChanged = fileInput !== null;
    if (
      (fileInput === null || fileInput === "default") &&
      (user?.profileImageUrl === null || user?.profileImageUrl?.length == 0)
    ) {
      profileImageChanged = false;
    }
    setProfileHasChange(
      nicknameChanged ||
        emailChanged ||
        statusMessageChanged ||
        profileImageChanged ||
        profileColorChanged ||
        usernameChanged ||
        aboutMeChanged
    );
  }, [
    nicknameInput,
    emailInput,
    statusMessageInput,
    fileInput,
    profileColorInput,
    usernameInput,
    user,
    currentUserAboutMe.data?.data,
    aboutMe,
  ]);

  const updateUserSettingsMutation = useMutation({
    onMutate(variables) {
      const previous = queryClient.getQueryData<{ data: UserSettings }>([
        "user_settings",
      ]);
      const previousUser = queryClient.getQueryData<{ data: User }>(["user"]);

      queryClient.setQueryData(["user_settings"], () => {
        return {
          data: variables.userSettings,
        };
      });

      if (variables.key === "previewStream") {
        queryClient.setQueryData(["user"], (prev: { data: User }) => {
          return {
            data: {
              ...prev.data,
              canPreviewStream: variables.userSettings.canPreviewStream,
            },
          };
        });
      }
      return {
        previous,
        previousUser,
      };
    },
    mutationFn: ({
      userSettings,
    }: {
      userSettings: UserSettings;
      key: string;
      value: string;
    }) => {
      return api.post(`/users/settings`, userSettings);
    },
    onSettled(data, error, variables, context) {
      if (data && data.status !== 200) {
        queryClient.setQueryData(["user_settings"], context?.previous);
        if (context?.previousUser && variables.key === "previewStream")
          queryClient.setQueryData(["user"], context?.previousUser);
        ModalUtils.handleGenericError(modalContext, data);
      }

      if (data?.status === 200) {
        if (variables.key.length && variables.value.length)
          localStorage.setItem(variables.key, variables.value);

        if (variables.key === "previewStream") {
          //need to refresh preview stream monitorer thread
          if (callContext?.currentCallingChatRoom) {
            const videoInputDevice =
              callContext.selectedDevice.videoUserInputDevice;
            callContext.handleChangeDevice(videoInputDevice, true);
          }
        }
      }
    },
  });
  const [tab, setTab] = useState(
    defaultTab.length
      ? defaultTab
      : sessionStorage.getItem("settingsRecentTab") ?? "My Account"
  );
  const [expanded, setExpanded] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const windowSize = useWindowSize();
  useEffect(() => {
    if (windowSize.width >= 768) {
      setExpanded(false);
    }
  }, [windowSize.width]);

  useEffect(() => {
    sessionStorage.setItem("settingsRecentTab", tab);
  }, [tab]);
  useOnClickOutside(menuRef, (e) => {
    const target = e.target as HTMLElement;
    if (
      target.id === "menuExpander" ||
      target.parentElement?.id === "menuExpander" ||
      target.parentElement?.parentElement?.id === "menuExpander"
    )
      return;
    setExpanded(false);
  });

  const handleOpenChangePasswordModal = useCallback(() => {
    ModalUtils.openGenericModal(
      modalContext,
      "Update Your Password",
      "",
      undefined,
      <ChangePasswordForm />,
      [
        <PrimaryButton key="0" customStyles="mt-5 ml-auto self-end bg-red-500">
          <div className="flex items-center justify-center gap-2">
            <FaX />
            Close
          </div>
        </PrimaryButton>,
      ]
    );
  }, []);

  const handleSetSpamFilterMode = useCallback(
    (mode: "All" | "Friends" | "Others" | "Groups" | "None") => {
      if (!updateUserSettingsMutation.isPending && userSettings.data?.data) {
        updateUserSettingsMutation.mutate({
          userSettings: {
            ...userSettings.data.data,
            spamFilterMode: mode,
          },

          key: "filterSpamMode",
          value: mode,
        });
      }
    },
    [updateUserSettingsMutation, userSettings]
  );

  const handleUpdateAllowNonFriendsDM = useCallback(
    (allow: boolean) => {
      if (!updateUserSettingsMutation.isPending && userSettings.data?.data) {
        updateUserSettingsMutation.mutate({
          key: "",
          value: "",
          userSettings: {
            ...userSettings.data?.data,
            allowNonFriendsDM: allow,
          },
        });
      }
    },
    [userSettings, updateUserSettingsMutation]
  );

  const handleUpdateMessageRequests = useCallback(
    (allow: boolean) => {
      if (!updateUserSettingsMutation.isPending && userSettings.data?.data) {
        updateUserSettingsMutation.mutate({
          key: "messageRequests",
          value: allow ? "true" : "false",
          userSettings: {
            ...userSettings.data?.data,
            messageRequests: allow,
          },
        });
      }
    },
    [userSettings, updateUserSettingsMutation]
  );

  const handleUpdateDoNotification = useCallback(
    (allow: boolean) => {
      if (!updateUserSettingsMutation.isPending && userSettings.data?.data) {
        updateUserSettingsMutation.mutate({
          key: "doNotification",
          value: allow ? "true" : "false",
          userSettings: {
            ...userSettings.data?.data,
            doNotification: allow,
          },
        });
      }
    },
    [userSettings, updateUserSettingsMutation]
  );

  const handleUpdateNotifyReaction = useCallback(
    (option: "all" | "dm" | "never") => {
      if (!updateUserSettingsMutation.isPending && userSettings.data?.data) {
        updateUserSettingsMutation.mutate({
          key: "",
          value: "",
          userSettings: {
            ...userSettings.data?.data,
            notifyReaction: option,
          },
        });
      }
    },
    [userSettings, updateUserSettingsMutation]
  );

  const handleUpdateFriendRequestEveryone = useCallback(
    (allow: boolean) => {
      if (!updateUserSettingsMutation.isPending && userSettings.data?.data) {
        updateUserSettingsMutation.mutate({
          key: "",
          value: "",
          userSettings: {
            ...userSettings.data?.data,
            allowFriendRequestEveryone: allow,
            allowFriendRequestGroup: allow
              ? true
              : userSettings.data.data.allowFriendRequestGroup,
            allowFriendRequestFof: allow
              ? true
              : userSettings.data.data.allowFriendRequestFof,
          },
        });
      }
    },
    [userSettings, updateUserSettingsMutation]
  );

  const handleUpdateFriendRequestFof = useCallback(
    (allow: boolean) => {
      if (!updateUserSettingsMutation.isPending && userSettings.data?.data) {
        updateUserSettingsMutation.mutate({
          key: "",
          value: "",
          userSettings: {
            ...userSettings.data?.data,
            allowFriendRequestFof: allow,
            allowFriendRequestEveryone: false,
          },
        });
      }
    },
    [userSettings, updateUserSettingsMutation]
  );

  const handleUpdateFriendRequestGroup = useCallback(
    (allow: boolean) => {
      if (!updateUserSettingsMutation.isPending && userSettings.data?.data) {
        updateUserSettingsMutation.mutate({
          key: "",
          value: "",
          userSettings: {
            ...userSettings.data?.data,
            allowFriendRequestGroup: allow,
            allowFriendRequestEveryone: false,
          },
        });
      }
    },
    [userSettings, updateUserSettingsMutation]
  );

  const handleUpdateCanPreviewStream = useCallback(
    (can: boolean) => {
      if (!updateUserSettingsMutation.isPending && userSettings.data?.data) {
        updateUserSettingsMutation.mutate({
          key: "previewStream",
          value: can ? "true" : "false",
          userSettings: {
            ...userSettings.data?.data,
            canPreviewStream: can,
          },
        });
      }
    },
    [userSettings, updateUserSettingsMutation]
  );

  const handleUpdateDisplaySpoiler = useCallback(
    (mode: "click" | "owned" | "always") => {
      if (!updateUserSettingsMutation.isPending && userSettings.data?.data) {
        updateUserSettingsMutation.mutate({
          key: "displaySpoiler",
          value: mode,
          userSettings: {
            ...userSettings.data?.data,
            displaySpoiler: mode,
          },
        });
      }
    },
    [userSettings, updateUserSettingsMutation]
  );

  const handleUpdateEntranceSound = useCallback(
    (sound: Sound | "default") => {
      if (!updateUserSettingsMutation.isPending && userSettings.data?.data) {
        updateUserSettingsMutation.mutate({
          key: "entranceSound",
          value:
            sound === "default"
              ? sound
              : sound.name + "@" + sound.file + "@" + sound.icon,
          userSettings: {
            ...userSettings.data?.data,
            entranceSound:
              sound === "default"
                ? sound
                : sound.name + "@" + sound.file + "@" + sound.icon,
          },
        });
      }
    },
    [userSettings, updateUserSettingsMutation]
  );

  const handleUpdateNsfwSettings = useCallback(
    (key: string, value: "Show" | "Blur" | "Block") => {
      if (!updateUserSettingsMutation.isPending && userSettings.data?.data) {
        updateUserSettingsMutation.mutate({
          key,
          value,
          userSettings: {
            ...userSettings.data.data,
            nsfwDmFriends:
              key === "dm_friends_sensitive"
                ? value
                : userSettings.data?.data.nsfwDmFriends,
            nsfwDmOthers:
              key === "dm_others_sensitive"
                ? value
                : userSettings.data?.data.nsfwDmOthers,
            nsfwGroups:
              key === "group_sensitive"
                ? value
                : userSettings.data?.data.nsfwGroups,
          },
        });
      }
    },
    [updateUserSettingsMutation, userSettings]
  );

  const [selectedTheme, setSelectedTheme] = useState(
    localStorage.getItem("appTheme") ?? "Dark"
  );

  const [selectedInAppIcon, setSelectedInAppIcon] = useState(
    localStorage.getItem("appIcon") ?? "Default"
  );

  const [selectedMsgDisplayMode, setSelectedMsgDisplayMode] = useState(
    localStorage.getItem("msgDisplay") ?? "Cozy"
  );

  const [showAvatarsOnCompactMode, setShowAvatarsOnCompactMode] =
    useState<boolean>(
      (localStorage.getItem("avatarsCompact") ?? "false") === "true"
    );

  const [chatFontScale, setChatFontScale] = useState(
    isNaN(parseFloat(localStorage.getItem("chatFontScale") ?? "33.33333333"))
      ? 33.333333333
      : parseFloat(localStorage.getItem("chatFontScale") ?? "33.333333333")
  );

  const [msgSpaceScale, setMsgSpaceScale] = useState(
    isNaN(parseFloat(localStorage.getItem("msgSpaceScale") ?? "66.67"))
      ? 66.67
      : parseFloat(localStorage.getItem("msgSpaceScale") ?? "66.67")
  );

  const [saturationScale, setSaturationScale] = useState(
    isNaN(parseFloat(localStorage.getItem("saturationScale") ?? "100.0"))
      ? 100.0
      : parseFloat(localStorage.getItem("saturationScale") ?? "100.0")
  );

  const [timeFormat, setTimeFormat] = useState(
    localStorage.getItem("timeFormat") ?? "12-hour"
  );

  const [inputMode, setInputMode] = useState(
    localStorage.getItem("inputMode") ?? "Voice Activity"
  );

  const [inputSensitivity, setInputSensitivity] = useState(
    isNaN(parseFloat(localStorage.getItem("inputSensitivityScale") ?? "4.5"))
      ? 8.0
      : parseFloat(localStorage.getItem("inputSensitivityScale") ?? "4.5")
  );
  const [underlineLinks, setUnderlineLinks] = useState(
    localStorage.getItem("underlineLinks") ?? "yes"
  );

  const [alwaysPreviewVideo, setAlwaysPreviewVideo] = useState(
    localStorage.getItem("alwaysPreviewVideo") ?? "no"
  );

  const [echoCancellation, setEchoCancellation] = useState(
    localStorage.getItem("echoCancellation") ?? "yes"
  );

  const [noiseSuppression, setNoiseSuppression] = useState(
    localStorage.getItem("noiseSuppression") ?? "yes"
  );
  const [showNoMicInputWarning, setShowNoMicInputWarning] = useState(
    localStorage.getItem("showNoMicInputWarning") ?? "no"
  );

  const [autoGainControl, setAutoGainControl] = useState(
    localStorage.getItem("autoGainControl") ?? "yes"
  );

  const [reducedMotion, setReducedMotion] = useState(
    localStorage.getItem("reducedMotion") ?? "no"
  );

  const [showSendButton, setShowSendButton] = useState(
    localStorage.getItem("showSendButton") ?? "yes"
  );

  const [inputVolumeScale, setInputVolumeScale] = useState(
    isNaN(parseFloat(localStorage.getItem("inputVolumeScale") ?? "100.0"))
      ? 100.0
      : parseFloat(localStorage.getItem("inputVolumeScale") ?? "100.0")
  );

  const [attenuationStrength, setAttenuationStrength] = useState(
    isNaN(parseFloat(localStorage.getItem("attenuationStrength") ?? "50.0"))
      ? 50.0
      : parseFloat(localStorage.getItem("attenuationStrength") ?? "50.0")
  );

  const [releaseDelayScale, setReleaseDelayScale] = useState(
    isNaN(parseFloat(localStorage.getItem("releaseDelayScale") ?? "0.0"))
      ? 0.0
      : parseFloat(localStorage.getItem("releaseDelayScale") ?? "0.0")
  );

  const [sbVolumeScale, setSbVolumeScale] = useState(
    isNaN(parseFloat(localStorage.getItem("sbVolumeScale") ?? "100.0"))
      ? 100.0
      : parseFloat(localStorage.getItem("sbVolumeScale") ?? "100.0")
  );

  useEffect(() => {
    localStorage.setItem("reducedMotion", reducedMotion);
    if (reducedMotion === "yes") {
      const style = document.createElement("style");
      style.innerHTML = `
          *, *::before, *::after {
            animation: none !important;
            transition: none !important;
          }
        `;
      style.id = "disable-animations";
      document.head.appendChild(style);
    } else {
      const style = document.getElementById("disable-animations");
      if (style) {
        console.log("removed styles");
        style.remove();
      }
    }
  }, [reducedMotion]);

  useEffect(() => {
    localStorage.setItem("alwaysPreviewVideo", alwaysPreviewVideo);
  }, [alwaysPreviewVideo]);
  useEffect(() => {
    localStorage.setItem("showSendButton", showSendButton);
  }, [showSendButton]);

  useEffect(() => {
    localStorage.setItem("attenuationStrength", attenuationStrength.toString());
  }, [attenuationStrength]);

  useEffect(() => {
    localStorage.setItem("showNoMicInputWarning", showNoMicInputWarning);
    setTimeout(() => {
      callContext?.setCallErrorText((prev) => ({
        ...prev,
        micStatus: "",
      }));
    }, 100);
  }, [showNoMicInputWarning]);

  useEffect(() => {
    localStorage.setItem("msgDisplay", selectedMsgDisplayMode);
  }, [selectedMsgDisplayMode]);

  useEffect(() => {
    localStorage.setItem(
      "avatarsCompact",
      showAvatarsOnCompactMode ? "true" : "false"
    );
  }, [showAvatarsOnCompactMode]);

  useEffect(() => {
    localStorage.setItem("chatFontScale", chatFontScale.toString());
  }, [chatFontScale]);

  useEffect(() => {
    localStorage.setItem("msgSpaceScale", msgSpaceScale.toString());
  }, [msgSpaceScale]);

  useEffect(() => {
    localStorage.setItem("saturationScale", saturationScale.toString());
  }, [saturationScale]);

  useEffect(() => {
    localStorage.setItem("inputSensitivityScale", inputSensitivity.toString());
  }, [inputSensitivity]);

  useEffect(() => {
    localStorage.setItem("releaseDelayScale", releaseDelayScale.toString());
  }, [releaseDelayScale]);

  useEffect(() => {
    localStorage.setItem("sbVolumeScale", sbVolumeScale.toString());
    window.sbVolumeScale = sbVolumeScale;
  }, [sbVolumeScale]);

  useEffect(() => {
    localStorage.setItem("inputVolumeScale", inputVolumeScale.toString());
    window.inputVolumeScale = inputVolumeScale;
  }, [inputVolumeScale]);

  useEffect(() => {
    localStorage.setItem("timeFormat", timeFormat);
  }, [timeFormat]);

  useEffect(() => {
    localStorage.setItem("underlineLinks", underlineLinks);
  }, [underlineLinks]);

  useEffect(() => {
    localStorage.setItem("inputMode", inputMode);
  }, [inputMode]);

  const [videoCodec, setVideoCodec] = useState(
    localStorage.getItem("videoCodec") ?? "video/VP8"
  );

  const supportedVideoCodecs = useMemo(() => {
    const videoCodecs = (RTCRtpSender.getCapabilities("video")?.codecs ?? [])
      .reduce((unique: RTCRtpCodec[], codec) => {
        if (!unique.some((item) => item.mimeType === codec.mimeType)) {
          unique.push(codec);
        }
        return unique;
      }, [])
      .filter(
        (e) =>
          e.mimeType.includes("VP9") ||
          e.mimeType.includes("VP8") ||
          e.mimeType.includes("AV1") ||
          e.mimeType.includes("H264")
      );

    return videoCodecs;
  }, []);

  const [streamAttenuation, setStreamAttenuation] = useState(
    localStorage.getItem("streamAttenuation") ?? "yes"
  );

  useEffect(() => {
    localStorage.setItem("streamAttenuation", streamAttenuation);
  }, [streamAttenuation]);

  const handleDragAttenuationStrength: MouseEventHandler<HTMLDivElement> =
    useCallback((e) => {
      if (e.pageX === 0) return;
      const scale = document.getElementById("attenuationStrengthScaler");

      if (scale) {
        let progress =
          100 *
          ((e.pageX - scale.getBoundingClientRect().x) /
            scale.getBoundingClientRect().width);

        if (progress > 100) progress = 100;
        else if (progress < 0) progress = 0;

        setAttenuationStrength(progress);
      }
    }, []);

  const handleDragSbVolumeScale: MouseEventHandler<HTMLDivElement> =
    useCallback((e) => {
      if (e.pageX === 0) return;
      const scale = document.getElementById("sbVolumeScaler");

      if (scale) {
        let progress =
          100 *
          ((e.pageX - scale.getBoundingClientRect().x) /
            scale.getBoundingClientRect().width);

        if (progress > 100) progress = 100;
        else if (progress < 0) progress = 0;

        setSbVolumeScale(progress);
      }
    }, []);

  const handleDragReleaseDelayScale: MouseEventHandler<HTMLDivElement> =
    useCallback((e) => {
      if (e.pageX === 0) return;
      const scale = document.getElementById("releaseDelayScaler");

      if (scale) {
        let progress =
          100 *
          ((e.pageX - scale.getBoundingClientRect().x) /
            scale.getBoundingClientRect().width);

        if (progress > 100) progress = 100;
        else if (progress < 0) progress = 0;

        setReleaseDelayScale(progress);
      }
    }, []);

  const handleDragInputSensitivityScale: MouseEventHandler<HTMLDivElement> =
    useCallback((e) => {
      if (e.pageX === 0) return;
      const scale = document.getElementById("inputSensitivityScaler");

      if (scale) {
        let progress =
          100 *
          ((e.pageX - scale.getBoundingClientRect().x) /
            scale.getBoundingClientRect().width);

        if (progress > 100) progress = 100;
        else if (progress < 0) progress = 0;

        setInputSensitivity(progress);
      }
    }, []);

  const handleDragInputVolumeScale: MouseEventHandler<HTMLDivElement> =
    useCallback((e) => {
      if (e.pageX === 0) return;
      const scale = document.getElementById("inputVolumeScaler");

      if (scale) {
        let progress =
          100 *
          ((e.pageX - scale.getBoundingClientRect().x) /
            scale.getBoundingClientRect().width);

        if (progress > 100) progress = 100;
        else if (progress < 0) progress = 0;

        setInputVolumeScale(progress);
      }
    }, []);

  const handleDragChatFontScale: MouseEventHandler<HTMLDivElement> =
    useCallback((e) => {
      if (e.pageX === 0) return;
      const scale = document.getElementById("chatFontScaler");

      if (scale) {
        let progress =
          100 *
          ((e.pageX - scale.getBoundingClientRect().x) /
            scale.getBoundingClientRect().width);

        if (progress > 100) progress = 100;
        else if (progress < 0) progress = 0;

        setChatFontScale(progress);
      }
    }, []);

  const handleDragMsgSpaceScale: MouseEventHandler<HTMLDivElement> =
    useCallback((e) => {
      if (e.pageX === 0) return;
      const scale = document.getElementById("msgSpaceScaler");

      if (scale) {
        let progress =
          100 *
          ((e.pageX - scale.getBoundingClientRect().x) /
            scale.getBoundingClientRect().width);

        if (progress > 100) progress = 100;
        else if (progress < 0) progress = 0;

        setMsgSpaceScale(progress);
      }
    }, []);

  const handleDragSaturationScale: MouseEventHandler<HTMLDivElement> =
    useCallback((e) => {
      if (e.pageX === 0) return;
      const scale = document.getElementById("saturationScaler");

      if (scale) {
        let progress =
          100 *
          ((e.pageX - scale.getBoundingClientRect().x) /
            scale.getBoundingClientRect().width);

        if (progress > 100) progress = 100;
        else if (progress < 0) progress = 0;

        setSaturationScale(progress);
      }
    }, []);

  useEffect(() => {
    if (tab === "Voice & Video") {
      //must acquire permission
      const handler = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true,
          });

          stream.getAudioTracks().forEach((audio) => audio.stop());
          stream.getVideoTracks().forEach((video) => video.stop());
        } catch (err) {
          console.error(err);
          ModalUtils.openGenericModal(
            modalContext,
            "Oof",
            "App lacks voice or/and video permission, many of the settings feature is unavailable!"
          );
        }
      };

      handler();
    }

    return () => {
      handleStopCheckVoice();
      handleStopCheckVideo();
    };
  }, [tab]);

  useEffect(() => {
    setNicknameInput(user?.nickname ?? "");
    setFileInput(null);
    setEmailInput(user?.email ?? "");
    setStatusMessageInput(user?.statusMessage ?? "");
    setProfileColorInput(user?.profileColor ?? "#84CC16");
    setProfileHasChange(false);
    setNicknameError("");
    setEmailError("");
    setAboutMeError("");
    setProfileImageError("");
    setStatusMessageError("");
    setUsernameError("");
  }, []);
  const [rerenderVideoSpinnerFlag, setRerenderVideoSpinnerFlag] =
    useState(false);
  const [rerenderAudioSpinnerFlag, setRerenderAudioSpinnerFlag] =
    useState(false);

  const videoDeviceListSpinner = useMemo(() => {
    const { videoInputDevices } = callContext?.devices ?? {
      videoInputDevices: [],
    };
    if (!callContext?.devices || videoInputDevices.length === 0) {
      return <p className="text-white">Crap - Devices Unavailable.</p>;
    }

    const devicesListNeedsPermission =
      callContext.devices.videoInputDevices.find(
        (device) => device.deviceId.length === 0
      ) !== undefined;

    if (devicesListNeedsPermission) {
      return (
        <p className="text-white">Devices Unavailable, Needs Permission</p>
      );
    }

    const defaultSelectedVideo = videoInputDevices.find(
      (e) => e.deviceId === callContext.selectedDevice.videoUserInputDevice
    )?.label;

    const data = videoInputDevices.map((e) => e.label);
    return (
      <Spinner
        key={"videoSpinner_" + rerenderVideoSpinnerFlag}
        defaultValue={defaultSelectedVideo}
        showSelected
        data={data}
        placeholder="Default Device"
        width="15rem"
        id="videoInputDeviceSpinner"
        direction="down"
        rounded
        onSelected={(i) => {
          if (callContext.currentCallingChatRoom) {
            callContext
              .handleChangeDevice(videoInputDevices[i].deviceId, true)
              .then((res) => {
                if (!res) {
                  console.log("rerendering video spinner");
                  setRerenderVideoSpinnerFlag((prev) => !prev);
                }
              });
          } else {
            callContext.setSelectedDevice((prev) => ({
              ...prev,
              videoUserInputDevice: videoInputDevices[i].deviceId,
            }));
            localStorage.setItem(
              "accord_videoUserInputDevice",
              videoInputDevices[i].deviceId
            );
          }
        }}
      />
    );
  }, [
    callContext?.devices,
    callContext?.selectedDevice.videoUserInputDevice,
    callContext?.currentCallingChatRoom,
    rerenderVideoSpinnerFlag,
  ]);

  const audioDeviceListSpinner = useMemo(() => {
    const { audioInputDevices } = callContext?.devices ?? {
      audioInputDevices: [],
    };
    if (!callContext?.devices || audioInputDevices.length === 0) {
      return <p className="text-white">Crap - Devices Unavailable.</p>;
    }

    const devicesListNeedsPermission =
      callContext.devices.audioInputDevices.find(
        (device) => device.deviceId.length === 0
      ) !== undefined;

    if (devicesListNeedsPermission) {
      return (
        <p className="text-white">Devices Unavailable, Needs Permission</p>
      );
    }

    const defaultSelectedAudio = audioInputDevices.find(
      (e) => e.deviceId === callContext.selectedDevice.audioUserInputDevice
    )?.label;

    const data = audioInputDevices.map((e) => e.label);
    return (
      <Spinner
        key={"audioSpinner_" + rerenderAudioSpinnerFlag}
        defaultValue={defaultSelectedAudio}
        showSelected
        data={data}
        placeholder="Default Device"
        width="15rem"
        id="audioInputDeviceSpinner"
        direction="down"
        rounded
        onSelected={(i) => {
          if (callContext.currentCallingChatRoom) {
            callContext
              .handleChangeDevice(audioInputDevices[i].deviceId, false)
              .then((res) => {
                if (!res) {
                  setRerenderAudioSpinnerFlag((prev) => !prev);
                }
              });
          } else {
            callContext.setSelectedDevice((prev) => ({
              ...prev,
              audioUserInputDevice: audioInputDevices[i].deviceId,
            }));
            localStorage.setItem(
              "accord_audioUserInputDevice",
              audioInputDevices[i].deviceId
            );
          }
        }}
      />
    );
  }, [
    callContext?.devices,
    callContext?.selectedDevice.audioUserInputDevice,
    callContext?.currentCallingChatRoom,
    rerenderAudioSpinnerFlag,
  ]);

  const [voiceActivity, setVoiceActivity] = useState(0);
  const voiceActivityMonitorer = useRef<NodeJS.Timeout | null>(null);
  const sampleAudioTrackRef = useRef<PreprocessedMediaStreamTrack | null>(null);
  const [sampleAudioTrack, setSampleAudioTrack] =
    useState<MediaStreamTrack | null>(null);
  const sampleAudioElementRef = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    sampleAudioTrackRef.current = sampleAudioTrack;
  }, [sampleAudioTrack]);
  const voiceAcitivityDeferred = useDeferredValue(voiceActivity);

  const handleStopCheckVoice = useCallback(() => {
    if (sampleAudioElementRef.current) {
      sampleAudioElementRef.current.pause();
      sampleAudioElementRef.current.src = "";
      sampleAudioElementRef.current.load();
    }
    if (sampleAudioTrackRef.current) {
      sampleAudioTrackRef.current.stop();
    }
    if (voiceActivityMonitorer.current) {
      clearInterval(voiceActivityMonitorer.current);
    }

    setVoiceActivity(0);

    setSampleAudioTrack(null);
  }, []);

  const [sampleVideoTrack, setSampleVideoTrack] =
    useState<MediaStreamTrack | null>(null);

  const sampleVideoTrackRef = useRef<MediaStreamTrack | null>(null);

  useEffect(() => {
    sampleVideoTrackRef.current = sampleVideoTrack;
  }, [sampleVideoTrack]);
  const testVideoElementRef = useRef<HTMLVideoElement>(null);

  const handleStopCheckVideo = useCallback(() => {
    if (testVideoElementRef.current) {
      testVideoElementRef.current.pause();
      testVideoElementRef.current.src = "";
      testVideoElementRef.current.load();
      if (sampleVideoTrackRef.current) {
        BackgroundUtil.closeProcess();
        sampleVideoTrackRef.current.stop();
      }

      setSampleVideoTrack(null);
    }
  }, []);
  const handleCheckVideo = useCallback(async () => {
    if (currentUser.data?.data.isVideoEnabled) {
      return;
    }
    try {
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: callContext?.selectedDevice.videoUserInputDevice.length
              ? {
                  exact: callContext.selectedDevice.videoUserInputDevice,
                }
              : undefined,
          },
        });
      } catch (err) {
        console.error(err);
        console.log(
          "falling back to default video input device,",
          callContext?.selectedDevice.videoUserInputDevice
        );
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
      }

      if (!stream) throw new Error("video device unavailable");

      stream.getVideoTracks().forEach((video, i) => {
        if (i > 0) {
          video.stop();
        }
      });

      //apply background
      if (callContext?.selectedCallBackground.length) {
        BackgroundUtil.closeProcess();
        const applyStream = new MediaStream();
        applyStream.addTrack(stream.getVideoTracks()[0]);
        const track = await BackgroundUtil.applyBackground(
          applyStream,
          Constants.SERVER_STATIC_CONTENT_PATH +
            callContext.selectedCallBackground
        );
        stream = new MediaStream();
        stream.addTrack(track);
      }

      if (testVideoElementRef.current) {
        testVideoElementRef.current.srcObject = stream;
        testVideoElementRef.current.play();
        setSampleVideoTrack(stream.getVideoTracks()[0]);
      }
    } catch (err) {
      console.error(err);

      ModalUtils.openGenericModal(
        modalContext,
        "ERROR",
        "Cannot test camera- no permission or device not found!"
      );
    }
  }, [
    callContext?.selectedDevice.videoUserInputDevice,
    callContext?.selectedCallBackground,
    currentUser.data?.data,
  ]);

  const handleCheckVoice = useCallback(async () => {
    try {
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: callContext?.selectedDevice.audioUserInputDevice.length
              ? {
                  exact: callContext.selectedDevice.audioUserInputDevice,
                }
              : undefined,
            echoCancellation:
              (localStorage.getItem("echoCancellation") ?? "yes") === "yes",
            noiseSuppression:
              (localStorage.getItem("noiseSuppression") ?? "yes") === "yes",
            autoGainControl:
              (localStorage.getItem("autoGainControl") ?? "yes") === "yes",
          },
        });
      } catch (err) {
        console.error(err);
        console.log(
          "device not found; trying falling back to default device,",
          callContext?.selectedDevice.audioUserInputDevice
        );
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
      }

      if (!stream) throw new Error("audio device unavailable");

      stream.getAudioTracks().forEach((audio, i) => {
        if (i > 0) audio.stop();
      });

      const processedStream = GenericUtil.createPreprocessedAudioStream(stream);

      const processedAudioTrack =
        processedStream.getAudioTracks()[0] as PreprocessedMediaStreamTrack;

      voiceActivityMonitorer.current = setInterval(() => {
        setVoiceActivity(
          ((processedAudioTrack.voiceActivity ?? 0.0) / 255.0) * 100.0
        );
      }, 50);

      setSampleAudioTrack(processedAudioTrack);

      if (sampleAudioElementRef.current) {
        sampleAudioElementRef.current.srcObject = processedStream;
        sampleAudioElementRef.current.play();
      }
    } catch (err) {
      console.error(err);
      ModalUtils.openGenericModal(
        modalContext,
        "ERROR",
        "Cannot check voice activity- no permission or device not found!"
      );
    }
  }, [callContext?.selectedDevice.audioUserInputDevice]);

  const [entranceSoundExists, setEntranceSoundExists] = useState(true);
  const [revalidateSoundFlag, setRevalidateSoundFlag] = useState(false);

  useEffect(() => {
    const handler = async () => {
      if (userSettings.data?.data.entranceSound) {
        const entranceSound = userSettings.data.data.entranceSound;

        if (entranceSound === "default") {
          setEntranceSoundExists(true);
          return;
        }

        if (!entranceSound.includes("@")) {
          setEntranceSoundExists(false);
          return;
        }

        const filename = entranceSound.split("@")[1];

        const url = Constants.SERVER_STATIC_CONTENT_PATH + filename;

        const available = await GenericUtil.isStaticContentAvailable(url);

        setEntranceSoundExists(available);
      }
    };

    handler();
  }, [userSettings.data?.data.entranceSound, revalidateSoundFlag]);

  const [recordingKeybind, setRecordingKeybind] = useState(false);
  const [pushTalkKey, setPushTalkKey] = useState(
    localStorage.getItem("pushTalkKey") ?? " "
  );
  const handleRecordKeyBind = useCallback(() => {
    const handler = (e: KeyboardEvent) => {
      setPushTalkKey(e.key);
      window.removeEventListener("keydown", handler);
      setRecordingKeybind(false);
    };

    window.addEventListener("keydown", handler);

    setRecordingKeybind(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("pushTalkKey", pushTalkKey);
  }, [pushTalkKey]);

  const [selectedChatroom, setSelectedChatroom] = useState<ChatRoom | null>(
    null
  );

  const [selectedBgChatRoom, setSelectedBgChatRoom] = useState<ChatRoom | null>(
    null
  );
  const chatRooms = useQuery({
    queryKey: ["chatroom_dm"],
    queryFn: async () => {
      const response = await api.get<ChatRoom[]>("/chatrooms/directmessaging");
      return {
        data: response.data,
      };
    },
    refetchOnWindowFocus: false,
  });

  const selectedChatRoomName = useMemo(() => {
    if (selectedChatroom === null || !currentUser.data?.data) return undefined;
    return GenericUtil.computeChatRoomName(
      selectedChatroom,
      currentUser.data?.data
    );
  }, [selectedChatroom, currentUser.data?.data.id]);

  const selectedBgChatRoomName = useMemo(() => {
    if (selectedBgChatRoom === null || !currentUser.data?.data)
      return undefined;

    return GenericUtil.computeChatRoomName(
      selectedBgChatRoom,
      currentUser.data.data
    );
  }, [selectedBgChatRoom, currentUser.data?.data.id]);

  const enterSoundChatRoomName = useMemo(() => {
    if (userSettings.data?.data && chatRooms.data?.data) {
      const split = userSettings.data.data.entranceSound.split("_");
      if (split.length !== 3) {
        return "Global";
      }

      if (isNaN(parseInt(split[1]))) {
        return "Global";
      }

      const room = chatRooms.data.data.find(
        (room) => room.id === parseInt(split[1])
      );

      if (!room || !currentUser.data?.data) {
        return "Global";
      }

      return GenericUtil.computeChatRoomName(room, currentUser.data.data);
    }
  }, [userSettings.data?.data, chatRooms.data?.data, currentUser.data?.data]);

  const [soundPickerOpen, setSoundPickerOpen] = useState(false);

  const [displayLinkPreview, setDisplayLinkPreview] = useState(
    localStorage.getItem("displayLinkPreview") ?? "yes"
  );
  const [displayDirectPreview, setDisplayDirectPreview] = useState(
    localStorage.getItem("displayDirectPreview") ?? "yes"
  );

  const [displayEmbed, setDisplayEmbed] = useState(
    localStorage.getItem("displayEmbed") ?? "yes"
  );

  const [displayChatReaction, setDisplayChatReaction] = useState(
    localStorage.getItem("displayChatReaction") ?? "yes"
  );

  const [convertEmoticon, setConvertEmoticon] = useState(
    localStorage.getItem("convertEmoticon") ?? "yes"
  );

  const [previewSyntax, setPreviewSyntax] = useState(
    localStorage.getItem("previewSyntax") ?? "yes"
  );

  const [unreadBadge, setUnreadBadge] = useState(
    localStorage.getItem("unreadBadge") ?? "yes"
  );

  const [disableNs, setDisableNs] = useState(
    localStorage.getItem("disableNs") ?? "no"
  );

  const [messageNs, setMessageNs] = useState(
    localStorage.getItem("messageNs") ?? "yes"
  );

  const [deafenNs, setDeafenNs] = useState(
    localStorage.getItem("deafenNs") ?? "yes"
  );

  const [undeafenNs, setUndeafenNs] = useState(
    localStorage.getItem("undeafenNs") ?? "yes"
  );

  const [muteNs, setMuteNs] = useState(localStorage.getItem("muteNs") ?? "yes");

  const [unmuteNs, setUnmuteNs] = useState(
    localStorage.getItem("unmuteNs") ?? "yes"
  );

  const [leaveCallNs, setLeaveCallNs] = useState(
    localStorage.getItem("leaveCallNs") ?? "yes"
  );

  const [joinCallNs, setJoinCallNs] = useState(
    localStorage.getItem("joinCallNs") ?? "yes"
  );

  const [callMelodyNs, setCallMelodyNs] = useState(
    localStorage.getItem("callMelodyNs") ?? "yes"
  );

  const [streamStartNs, setStreamStartNs] = useState(
    localStorage.getItem("streamStartNs") ?? "yes"
  );

  const [streamEndNs, setStreamEndNs] = useState(
    localStorage.getItem("streamEndNs") ?? "yes"
  );

  const [language, setLanguage] = useState(
    localStorage.getItem("language") ?? "en-US"
  );

  const [playingCallTheme, setPlayingCallTheme] = useState(false);

  const logoutMutation = useMutation({
    mutationFn: () => {
      return api.post(`/users/logout`);
    },
    onSettled(data) {
      if (data?.status === 200) {
        setTimeout(() => {
          router.replace("/authentication");
        }, 50);
      } else if (data) {
        ModalUtils.handleGenericError(modalContext, data);
      }
    },
  });
  const logout = useCallback(() => {
    if (!logoutMutation.isPending) {
      logoutMutation.mutate();
    }
  }, [logoutMutation.isPending]);

  return user ? (
    <div
      id="primaryModal"
      className="w-[100vw] h-[100vh] fixed grid place-content-center bg-transparent z-[65]"
    >
      <audio ref={sampleAudioElementRef}></audio>
      <div
        className="text-lime-300 fixed top-2 z-[80] right-2 ml-auto cursor-pointer transition hover:text-lime-400"
        onClick={() => {
          setShouldExitAnimation(true);
          setTimeout(() => {
            setShouldExitAnimation(false);
            setOpen(false);
          }, 400);
        }}
      >
        {" "}
        <IoIosCloseCircleOutline size={36} />{" "}
      </div>
      <div className="flex flex-col w-[100vw] h-[100vh]">
        <div
          className={`w-full h-full text-white rounded-md bg-lime-500 ${
            shouldExitAnimation
              ? "animate-fadeOutDown"
              : "animate-fadeInUpFaster"
          }`}
        >
          <div className="flex items-start">
            <div
              id="menuExpander"
              onClick={() => setExpanded((prev) => !prev)}
              className={`w-fit fixed bg-white top-[10%] z-[86] opacity-50 cursor-pointer hover:opacity-100 md:hidden p-2 rounded-md text-lime-500
                ${
                  !expanded
                    ? "translate-x-0 rotate-0"
                    : "translate-x-[12.5rem] rotate-180"
                }
                transition-transform
                
                `}
            >
              <FaArrowRight />
            </div>
            <div
              ref={menuRef}
              className={`
            ${expanded ? "translate-x-0" : "-translate-x-[12.5rem]"}
              w-[12.5rem] fixed md:static md:translate-x-0 h-[100vh] z-[86] transition-transform bg-lime-700 flex flex-col gap-2 overflow-y-scroll px-2 py-6`}
            >
              <div className="text-lime-600 font-bold">USER SETTINGS</div>

              <div
                className={`text-lime-500 text-lg px-2 cursor-pointer transition hover:text-white hover:bg-lime-600 rounded-md
                ${tab === "My Account" && "bg-lime-600 text-white"}`}
                onClick={() => setTab("My Account")}
              >
                My Account
              </div>

              <div
                className={`text-lime-500 text-lg px-2 cursor-pointer transition hover:text-white hover:bg-lime-600 rounded-md
                ${tab === "Profiles" && "bg-lime-600 text-white"}`}
                onClick={() => setTab("Profiles")}
              >
                Profiles
              </div>

              <div
                className={`text-lime-500 text-lg px-2 cursor-pointer transition hover:text-white hover:bg-lime-600 rounded-md
                ${tab === "Content & Social" && "bg-lime-600 text-white"}`}
                onClick={() => setTab("Content & Social")}
              >
                Content & Social
              </div>

              <div
                className={`text-lime-500 text-lg px-2 cursor-pointer transition hover:text-white hover:bg-lime-600 rounded-md
                ${tab === "Appearance" && "bg-lime-600 text-white"}`}
                onClick={() => setTab("Appearance")}
              >
                Appearance
              </div>

              <div
                className={`text-lime-500 text-lg px-2 cursor-pointer transition hover:text-white hover:bg-lime-600 rounded-md
                ${tab === "Voice & Video" && "bg-lime-600 text-white"}`}
                onClick={() => setTab("Voice & Video")}
              >
                Voice & Video
              </div>

              <div
                className={`text-lime-500 text-lg px-2 cursor-pointer transition hover:text-white hover:bg-lime-600 rounded-md
                ${tab === "Chat" && "bg-lime-600 text-white"}`}
                onClick={() => setTab("Chat")}
              >
                Chat
              </div>

              <div
                className={`text-lime-500 text-lg px-2 cursor-pointer transition hover:text-white hover:bg-lime-600 rounded-md
                ${tab === "Notifications" && "bg-lime-600 text-white"}`}
                onClick={() => setTab("Notifications")}
              >
                Notifications
              </div>

              <div
                className={`text-lime-500 text-lg px-2 cursor-pointer transition hover:text-white hover:bg-lime-600 rounded-md
                ${tab === "Language" && "bg-lime-600 text-white"}`}
                onClick={() => setTab("Language")}
              >
                Language
              </div>

              <div
                className={`flex items-center gap-2 text-lime-500 text-lg px-2 cursor-pointer transition hover:text-white hover:bg-lime-600 rounded-md
                ${tab === "Logout" && "bg-lime-600 text-white"}`}
                onClick={() => {
                  logout();
                }}
              >
                <IoExitOutline />
                Logout
              </div>
            </div>

            <div className="flex flex-col h-[100vh] overflow-y-scroll w-full p-2 md:p-8 overflow-x-hidden">
              {tab === "Language" && (
                <div className="animate-fadeIn">
                  <p className="text-2xl font-bold mb-4">Language</p>

                  <p className="mt-2 text-sm text-lime-700">
                    Select A Language
                  </p>

                  <div
                    onClick={() => {
                      setLanguage("en-US");
                      localStorage.setItem("language", "en-US");
                    }}
                    className={`flex w-full ${
                      language === "en-US" ? "bg-lime-700" : "bg-lime-600"
                    } md:h-[3.5rem] h-[4.5rem] rounded-md items-center p-2 transition hover:bg-lime-700 cursor-pointer group`}
                  >
                    <LiaFlagUsaSolid />
                    <div className="flex flex-col ml-2">
                      <p className="text-lg">English, US</p>
                    </div>
                    <div
                      className={`ml-auto my-auto mr-2 rounded-full cursor-pointer w-[1.5rem] h-[1.5rem] border-[0.35rem] bg-lime-500 border-lime-400 transition group-hover:bg-lime-600
                      ${language === "en-US" && "bg-lime-600"}`}
                    ></div>
                  </div>
                </div>
              )}
              {tab === "Notifications" && (
                <div className="animate-fadeIn">
                  <p className="text-2xl font-bold mb-4">Notifications</p>

                  <div className="flex mt-2">
                    <div className="flex flex-col gap-1">
                      <p>Enabled Push Notifications</p>
                      <p className="text-sm text-lime-700">
                        If you are looking for per-chatroom notifications,
                        right-click the desired chatroom icon and select
                        Notification Settings.
                      </p>
                    </div>

                    <div className="ml-auto">
                      <PrimarySwitch
                        isActive={
                          userSettings.data?.data.doNotification ?? true
                        }
                        onClick={(active) => {
                          handleUpdateDoNotification(active);
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex mt-2">
                    <div className="flex flex-col gap-1">
                      <p>Enable Unread Message Badge</p>
                      <p className="text-sm text-lime-700">
                        Shows a red badge on the app tab when you have unread
                        messages
                      </p>
                    </div>

                    <div className="ml-auto">
                      <PrimarySwitch
                        isActive={unreadBadge === "yes"}
                        onClick={(active) => {
                          setUnreadBadge(active ? "yes" : "no");
                          localStorage.setItem(
                            "unreadBadge",
                            active ? "yes" : "no"
                          );
                        }}
                      />
                    </div>
                  </div>

                  <p className="text-lg mt-2">Reaction Notifications</p>
                  <p className="text-sm text-lime-700">
                    Receive notifications when your messages are reacted to.
                  </p>

                  <div
                    onClick={() => {
                      handleUpdateNotifyReaction("all");
                    }}
                    className={`flex w-full ${
                      userSettings.data?.data.notifyReaction === "all"
                        ? "bg-lime-700"
                        : "bg-lime-600"
                    } md:h-[3.5rem] h-[4.5rem] rounded-md items-center p-2 transition hover:bg-lime-700 cursor-pointer group`}
                  >
                    <div className="flex flex-col">
                      <p className="text-lg">All Messages</p>
                    </div>
                    <div
                      className={`ml-auto my-auto mr-2 rounded-full cursor-pointer w-[1.5rem] h-[1.5rem] border-[0.35rem] bg-lime-500 border-lime-400 transition group-hover:bg-lime-600
    ${userSettings.data?.data.notifyReaction === "all" && "bg-lime-600"}`}
                    ></div>
                  </div>

                  <div
                    onClick={() => {
                      handleUpdateNotifyReaction("dm");
                    }}
                    className={`flex w-full mt-2 ${
                      userSettings.data?.data.notifyReaction === "dm"
                        ? "bg-lime-700"
                        : "bg-lime-600"
                    } md:h-[3.5rem] h-[4.5rem] rounded-md items-center p-2 transition hover:bg-lime-700 cursor-pointer group`}
                  >
                    <div className="flex flex-col">
                      <p className="text-lg">Only Direct Messages</p>
                    </div>
                    <div
                      className={`ml-auto my-auto mr-2 rounded-full cursor-pointer w-[1.5rem] h-[1.5rem] border-[0.35rem] bg-lime-500 border-lime-400 transition group-hover:bg-lime-600
    ${userSettings.data?.data.notifyReaction === "dm" && "bg-lime-600"}`}
                    ></div>
                  </div>

                  <div
                    onClick={() => {
                      handleUpdateNotifyReaction("never");
                    }}
                    className={`flex w-full mt-2 ${
                      userSettings.data?.data.notifyReaction === "never"
                        ? "bg-lime-700"
                        : "bg-lime-600"
                    } md:h-[3.5rem] h-[4.5rem] rounded-md items-center p-2 transition hover:bg-lime-700 cursor-pointer group`}
                  >
                    <div className="flex flex-col">
                      <p className="text-lg">Never</p>
                    </div>
                    <div
                      className={`ml-auto my-auto mr-2 rounded-full cursor-pointer w-[1.5rem] h-[1.5rem] border-[0.35rem] bg-lime-500 border-lime-400 transition group-hover:bg-lime-600
    ${userSettings.data?.data.notifyReaction === "never" && "bg-lime-600"}`}
                    ></div>
                  </div>

                  <p className="text-lg mt-2">Sounds</p>

                  <div className="flex mt-2">
                    <div className="flex flex-col gap-1">
                      <p>Disable All Notification Sounds</p>
                      <p className="text-xs text-lime-700">
                        Your existing notification sound settings will be
                        preserved.
                      </p>
                    </div>

                    <div className="ml-auto">
                      <PrimarySwitch
                        isActive={disableNs === "yes"}
                        onClick={(active) => {
                          setDisableNs(active ? "yes" : "no");
                          localStorage.setItem(
                            "disableNs",
                            active ? "yes" : "no"
                          );
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex mt-2 items-center gap-2">
                    <div className="flex flex-col gap-1">
                      <p>Message (Standard/Mention)</p>
                    </div>
                    <div
                      className="text-white hover:text-opacity-70 cursor-pointer"
                      onClick={() =>
                        SoundUtil.playSoundOverwrite(
                          Constants.SERVER_STATIC_CONTENT_PATH +
                            "standard_notification.ogg",
                          "preview"
                        )
                      }
                    >
                      <FaVolumeHigh />
                    </div>

                    <div
                      className="text-white hover:text-opacity-70 cursor-pointer"
                      onClick={() =>
                        SoundUtil.playSoundOverwrite(
                          Constants.SERVER_STATIC_CONTENT_PATH +
                            "emphasized_notification.ogg",
                          "preview"
                        )
                      }
                    >
                      <FaVolumeHigh />
                    </div>

                    <div className="ml-auto">
                      <PrimarySwitch
                        isActive={messageNs === "yes"}
                        onClick={(active) => {
                          setMessageNs(active ? "yes" : "no");
                          localStorage.setItem(
                            "messageNs",
                            active ? "yes" : "no"
                          );
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex mt-2 items-center gap-2">
                    <div className="flex flex-col gap-1">
                      <p>Deafen</p>
                    </div>
                    <div
                      className="text-white hover:text-opacity-70 cursor-pointer"
                      onClick={() =>
                        SoundUtil.playSoundOverwrite(
                          Constants.SERVER_STATIC_CONTENT_PATH +
                            "deafen_sound.mp3",
                          "preview"
                        )
                      }
                    >
                      <FaVolumeHigh />
                    </div>

                    <div className="ml-auto">
                      <PrimarySwitch
                        isActive={deafenNs === "yes"}
                        onClick={(active) => {
                          setDeafenNs(active ? "yes" : "no");
                          localStorage.setItem(
                            "deafenNs",
                            active ? "yes" : "no"
                          );
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex mt-2 items-center gap-2">
                    <div className="flex flex-col gap-1">
                      <p>Undeafen</p>
                    </div>
                    <div
                      className="text-white hover:text-opacity-70 cursor-pointer"
                      onClick={() =>
                        SoundUtil.playSoundOverwrite(
                          Constants.SERVER_STATIC_CONTENT_PATH +
                            "undeafen_sound.mp3",
                          "preview"
                        )
                      }
                    >
                      <FaVolumeHigh />
                    </div>

                    <div className="ml-auto">
                      <PrimarySwitch
                        isActive={undeafenNs === "yes"}
                        onClick={(active) => {
                          setUndeafenNs(active ? "yes" : "no");
                          localStorage.setItem(
                            "undeafenNs",
                            active ? "yes" : "no"
                          );
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex mt-2 items-center gap-2">
                    <div className="flex flex-col gap-1">
                      <p>Mute</p>
                    </div>
                    <div
                      className="text-white hover:text-opacity-70 cursor-pointer"
                      onClick={() =>
                        SoundUtil.playSoundOverwrite(
                          Constants.SERVER_STATIC_CONTENT_PATH +
                            "mute_sound.mp3",
                          "preview"
                        )
                      }
                    >
                      <FaVolumeHigh />
                    </div>

                    <div className="ml-auto">
                      <PrimarySwitch
                        isActive={muteNs === "yes"}
                        onClick={(active) => {
                          setMuteNs(active ? "yes" : "no");
                          localStorage.setItem("muteNs", active ? "yes" : "no");
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex mt-2 items-center gap-2">
                    <div className="flex flex-col gap-1">
                      <p>Unmute</p>
                    </div>

                    <div
                      className="text-white hover:text-opacity-70 cursor-pointer"
                      onClick={() =>
                        SoundUtil.playSoundOverwrite(
                          Constants.SERVER_STATIC_CONTENT_PATH +
                            "unmute_sound.mp3",
                          "preview"
                        )
                      }
                    >
                      <FaVolumeHigh />
                    </div>

                    <div className="ml-auto">
                      <PrimarySwitch
                        isActive={unmuteNs === "yes"}
                        onClick={(active) => {
                          setUnmuteNs(active ? "yes" : "no");
                          localStorage.setItem(
                            "unmuteNs",
                            active ? "yes" : "no"
                          );
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex mt-2 items-center gap-2">
                    <div className="flex flex-col gap-1">
                      <p>Leave Call</p>
                    </div>
                    <div
                      className="text-white hover:text-opacity-70 cursor-pointer"
                      onClick={() =>
                        SoundUtil.playSoundOverwrite(
                          Constants.SERVER_STATIC_CONTENT_PATH +
                            "exit_sound.mp3",
                          "preview"
                        )
                      }
                    >
                      <FaVolumeHigh />
                    </div>

                    <div className="ml-auto">
                      <PrimarySwitch
                        isActive={leaveCallNs === "yes"}
                        onClick={(active) => {
                          setLeaveCallNs(active ? "yes" : "no");
                          localStorage.setItem(
                            "leaveCallNs",
                            active ? "yes" : "no"
                          );
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex mt-2 items-center gap-2">
                    <div className="flex flex-col gap-1">
                      <p>Join Call</p>
                    </div>
                    <div
                      className="text-white hover:text-opacity-70 cursor-pointer"
                      onClick={() =>
                        SoundUtil.playSoundOverwrite(
                          Constants.SERVER_STATIC_CONTENT_PATH +
                            "enter_sound.mp3",
                          "preview"
                        )
                      }
                    >
                      <FaVolumeHigh />
                    </div>

                    <div className="ml-auto">
                      <PrimarySwitch
                        isActive={joinCallNs === "yes"}
                        onClick={(active) => {
                          setJoinCallNs(active ? "yes" : "no");
                          localStorage.setItem(
                            "joinCallNs",
                            active ? "yes" : "no"
                          );
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex mt-2 items-center gap-2">
                    <div className="flex flex-col gap-1">
                      <p>Call Melody</p>
                    </div>

                    <div
                      className="text-white hover:text-opacity-70 cursor-pointer"
                      onClick={() => {
                        if (playingCallTheme) {
                          SoundUtil.stopSound(
                            Constants.SERVER_STATIC_CONTENT_PATH +
                              "calling_theme.mp3"
                          );
                        } else {
                          SoundUtil.playSoundOverwrite(
                            Constants.SERVER_STATIC_CONTENT_PATH +
                              "calling_theme.mp3",
                            "preview"
                          );
                        }

                        setPlayingCallTheme((prev) => !prev);
                      }}
                    >
                      {playingCallTheme ? <FaVolumeMute /> : <FaVolumeHigh />}
                    </div>

                    <div className="ml-auto">
                      <PrimarySwitch
                        isActive={callMelodyNs === "yes"}
                        onClick={(active) => {
                          setCallMelodyNs(active ? "yes" : "no");
                          localStorage.setItem(
                            "callMelodyNs",
                            active ? "yes" : "no"
                          );
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex mt-2 items-center gap-2">
                    <div className="flex flex-col gap-1">
                      <p>Stream Start</p>
                    </div>
                    <div
                      className="text-white hover:text-opacity-70 cursor-pointer"
                      onClick={() =>
                        SoundUtil.playSoundOverwrite(
                          Constants.SERVER_STATIC_CONTENT_PATH +
                            "streaming_sound.mp3",
                          "preview"
                        )
                      }
                    >
                      <FaVolumeHigh />
                    </div>

                    <div className="ml-auto">
                      <PrimarySwitch
                        isActive={streamStartNs === "yes"}
                        onClick={(active) => {
                          setStreamStartNs(active ? "yes" : "no");
                          localStorage.setItem(
                            "streamStartNs",
                            active ? "yes" : "no"
                          );
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex mt-2 items-center gap-2">
                    <div className="flex flex-col gap-1">
                      <p>Stream End</p>
                    </div>

                    <div
                      className="text-white hover:text-opacity-70 cursor-pointer"
                      onClick={() =>
                        SoundUtil.playSoundOverwrite(
                          Constants.SERVER_STATIC_CONTENT_PATH +
                            "unstreaming_sound.mp3",
                          "preview"
                        )
                      }
                    >
                      <FaVolumeHigh />
                    </div>
                    <div className="ml-auto">
                      <PrimarySwitch
                        isActive={streamEndNs === "yes"}
                        onClick={(active) => {
                          setStreamEndNs(active ? "yes" : "no");
                          localStorage.setItem(
                            "streamEndNs",
                            active ? "yes" : "no"
                          );
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
              {tab === "Chat" && (
                <div className="animate-fadeIn">
                  <p className="text-2xl font-bold mb-4">Chat</p>
                  <p className="text-lg mt-2">
                    Display Images, Videos & Audios
                  </p>

                  <div className="flex mt-2">
                    <div className="flex flex-col gap-1">
                      <p>When posted as links to chat</p>
                    </div>

                    <div className="ml-auto">
                      <PrimarySwitch
                        isActive={displayLinkPreview === "yes"}
                        onClick={(active) => {
                          setDisplayLinkPreview(active ? "yes" : "no");
                          localStorage.setItem(
                            "displayLinkPreview",
                            active ? "yes" : "no"
                          );
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex mt-2">
                    <div className="flex flex-col gap-1">
                      <p>When uploaded directly to Accord</p>
                    </div>

                    <div className="ml-auto">
                      <PrimarySwitch
                        isActive={displayDirectPreview === "yes"}
                        onClick={(active) => {
                          setDisplayDirectPreview(active ? "yes" : "no");
                          localStorage.setItem(
                            "displayDirectPreview",
                            active ? "yes" : "no"
                          );
                        }}
                      />
                    </div>
                  </div>

                  <p className="text-lg mt-2">Embeds & Link Previews</p>

                  <div className="flex mt-2">
                    <div className="flex flex-col gap-1">
                      <p>
                        Show embeds and preview website links pasted into chat
                      </p>
                    </div>

                    <div className="ml-auto">
                      <PrimarySwitch
                        isActive={displayEmbed === "yes"}
                        onClick={(active) => {
                          setDisplayEmbed(active ? "yes" : "no");
                          localStorage.setItem(
                            "displayEmbed",
                            active ? "yes" : "no"
                          );
                        }}
                      />
                    </div>
                  </div>

                  <p className="text-lg mt-2">Emoji</p>

                  <div className="flex mt-2">
                    <div className="flex flex-col gap-1">
                      <p>Show emoji reactions on messages</p>
                    </div>

                    <div className="ml-auto">
                      <PrimarySwitch
                        isActive={displayChatReaction === "yes"}
                        onClick={(active) => {
                          setDisplayChatReaction(active ? "yes" : "no");
                          localStorage.setItem(
                            "displayChatReaction",
                            active ? "yes" : "no"
                          );
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex mt-2">
                    <div className="flex flex-col gap-1">
                      <p>
                        Automatically convert emoticons in your messages to
                        emoji
                      </p>
                      <p className="text-sm text-lime-700">
                        For example, when you type :) Accord will convert it to{" "}
                        {/*@ts-expect-error JSX does not recognize em-emoji element */}
                        <em-emoji shortcodes={":smile:"}></em-emoji>
                      </p>
                    </div>

                    <div className="ml-auto">
                      <PrimarySwitch
                        isActive={convertEmoticon === "yes"}
                        onClick={(active) => {
                          setConvertEmoticon(active ? "yes" : "no");
                          localStorage.setItem(
                            "convertEmoticon",
                            active ? "yes" : "no"
                          );
                        }}
                      />
                    </div>
                  </div>

                  <p className="mt-2 text-lg">Text Box</p>

                  <div className="flex mt-2">
                    <div className="flex flex-col gap-1">
                      <p>
                        Preview emoji, mentions, and markdown syntax as you type
                      </p>
                    </div>

                    <div className="ml-auto">
                      <PrimarySwitch
                        isActive={previewSyntax === "yes"}
                        onClick={(active) => {
                          setPreviewSyntax(active ? "yes" : "no");
                          localStorage.setItem(
                            "previewSyntax",
                            active ? "yes" : "no"
                          );
                        }}
                      />
                    </div>
                  </div>

                  <p className="text-lg mt-2">Show Spoiler Content</p>
                  <p className="text-sm text-lime-700">
                    This controls when spoiler content is displayed.
                  </p>

                  <div
                    onClick={() => {
                      handleUpdateDisplaySpoiler("click");
                    }}
                    className={`flex w-full ${
                      (userSettings.data?.data.displaySpoiler ?? "click") ===
                      "click"
                        ? "bg-lime-700"
                        : "bg-lime-600"
                    } md:h-[3.5rem] h-[4.5rem] rounded-md items-center p-2 transition hover:bg-lime-700 cursor-pointer group`}
                  >
                    <div className="flex flex-col">
                      <p className="text-lg">On click</p>
                    </div>
                    <div
                      className={`ml-auto my-auto mr-2 rounded-full cursor-pointer w-[1.5rem] h-[1.5rem] border-[0.35rem] bg-lime-500 border-lime-400 transition group-hover:bg-lime-600
    ${
      (userSettings.data?.data.displaySpoiler ?? "click") === "click" &&
      "bg-lime-600"
    }`}
                    ></div>
                  </div>

                  <div
                    onClick={() => {
                      handleUpdateDisplaySpoiler("owned");
                    }}
                    className={`flex w-full mt-2 ${
                      (userSettings.data?.data.displaySpoiler ?? "click") ===
                      "owned"
                        ? "bg-lime-700"
                        : "bg-lime-600"
                    } md:h-[3.5rem] h-[4.5rem] rounded-md items-center p-2 transition hover:bg-lime-700 cursor-pointer group`}
                  >
                    <div className="flex flex-col">
                      <p className="text-lg">On DMs & chatrooms I own</p>
                    </div>
                    <div
                      className={`ml-auto my-auto mr-2 rounded-full cursor-pointer w-[1.5rem] h-[1.5rem] border-[0.35rem] bg-lime-500 border-lime-400 transition group-hover:bg-lime-600
    ${
      (userSettings.data?.data.displaySpoiler ?? "click") === "owned" &&
      "bg-lime-600"
    }`}
                    ></div>
                  </div>

                  <div
                    onClick={() => {
                      handleUpdateDisplaySpoiler("always");
                    }}
                    className={`flex w-full mt-2 ${
                      (userSettings.data?.data.displaySpoiler ?? "click") ===
                      "always"
                        ? "bg-lime-700"
                        : "bg-lime-600"
                    } md:h-[3.5rem] h-[4.5rem] rounded-md items-center p-2 transition hover:bg-lime-700 cursor-pointer group`}
                  >
                    <div className="flex flex-col">
                      <p className="text-lg">Always</p>
                    </div>
                    <div
                      className={`ml-auto my-auto mr-2 rounded-full cursor-pointer w-[1.5rem] h-[1.5rem] border-[0.35rem] bg-lime-500 border-lime-400 transition group-hover:bg-lime-600
    ${
      (userSettings.data?.data.displaySpoiler ?? "click") === "always" &&
      "bg-lime-600"
    }`}
                    ></div>
                  </div>
                </div>
              )}
              {tab === "Voice & Video" && (
                <div className="animate-fadeIn">
                  <p className="text-2xl font-bold mb-4">Voice Settings</p>
                  <div className="mt-2 flex gap-2 items-center flex-wrap">
                    <p>Input Device</p>

                    <div className={`z-[70]`}>{audioDeviceListSpinner}</div>
                  </div>
                  <div className="mt-2 flex gap-2 items-center flex-wrap">
                    <p>Output Device</p>
                    <p className="text-sm text-lime-700">
                      Currently unsupported - Please use device&apos;s native
                      settings!
                    </p>
                  </div>
                  <div className="mt-2 flex gap-2 items-center">
                    <p>Input Volume</p>
                    <DraggableProgressbar
                      progress={inputVolumeScale}
                      showDragPointProgress
                      foregroundColor="bg-gradient-to-r from-lime-600 to-lime-800 dark:from-lime-300 dark:to-lime-100"
                      backgroundColor="bg-lime-400"
                      dragPointColor="bg-lime-600"
                      id="inputVolumeScaler"
                      onDrag={handleDragInputVolumeScale}
                      onDragEnd={handleDragInputVolumeScale}
                      onMouseDown={handleDragInputVolumeScale}
                    ></DraggableProgressbar>
                  </div>

                  <div className="mt-2 flex gap-2 items-center">
                    <p>Output Volume</p>
                    <p className="text-sm text-lime-700">
                      Currently unsupported - Please use device&apos;s native
                      settings!
                    </p>
                  </div>

                  <div className="mt-2 flex gap-2 items-center">
                    <p>Mic Test</p>
                    <p className="text-sm text-lime-700">
                      Having mic issues? Start a test and say something fun - we
                      will play your voice back to you.
                    </p>
                  </div>

                  <div className="mt-2 flex gap-2 items-center">
                    <PrimaryButton
                      customWidth="w-fit"
                      customStyles="bg-lime-700 px-2"
                      onclick={() => {
                        if (sampleAudioTrack) {
                          handleStopCheckVoice();
                        } else {
                          handleCheckVoice();
                        }
                      }}
                    >
                      {sampleAudioTrack ? "Stop" : "Check"}
                    </PrimaryButton>

                    <div className="w-full h-[2.5rem] transition-all duration-300 relative rounded-md bg-lime-400">
                      <div
                        style={{
                          width: voiceAcitivityDeferred + "%",
                        }}
                        className="absolute h-full bg-gradient-to-r rounded-md from-lime-400 to-lime-700 dark:from-lime-500 dark:to-lime-200"
                      ></div>
                    </div>
                  </div>

                  <p className="mt-2 text-lg">Input Mode</p>

                  <div
                    onClick={() => {
                      setInputMode("Voice Activity");
                    }}
                    className={`flex w-full ${
                      inputMode === "Voice Activity"
                        ? "bg-lime-700"
                        : "bg-lime-600"
                    } md:h-[3.5rem] h-[4.5rem] rounded-md items-center p-2 transition hover:bg-lime-700 cursor-pointer group`}
                  >
                    <div className="flex flex-col">
                      <p className="text-lg">Voice Activity</p>
                    </div>
                    <div
                      className={`ml-auto my-auto mr-2 rounded-full cursor-pointer w-[1.5rem] h-[1.5rem] border-[0.35rem] bg-lime-500 border-lime-400 transition group-hover:bg-lime-600
                      ${inputMode === "Voice Activity" && "bg-lime-600"}`}
                    ></div>
                  </div>

                  <div
                    onClick={() => {
                      setInputMode("Push to Talk");
                    }}
                    className={`flex w-full mt-2 ${
                      inputMode === "Push to Talk"
                        ? "bg-lime-700"
                        : "bg-lime-600"
                    } md:h-[3.5rem] h-[4.5rem] rounded-md items-center p-2 transition hover:bg-lime-700 cursor-pointer group`}
                  >
                    <div className="flex flex-col">
                      <p className="text-lg">Push to Talk</p>
                    </div>
                    <div
                      className={`ml-auto my-auto mr-2 rounded-full cursor-pointer w-[1.5rem] h-[1.5rem] border-[0.35rem] bg-lime-500 border-lime-400 transition group-hover:bg-lime-600
                      ${inputMode === "Push to Talk" && "bg-lime-600"}`}
                    ></div>
                  </div>

                  {inputMode === "Voice Activity" && (
                    <div className="mt-2 animate-fadeIn">
                      <p className="text-lg">Input Sensitivity</p>

                      <div className="mt-2 flex gap-2 items-center relative">
                        <DraggableProgressbar
                          progress={inputSensitivity}
                          showDragPointProgress
                          foregroundColor="bg-gradient-to-r from-yellow-600 to-lime-600 dark:from-yellow-300 dark:to-lime-300"
                          backgroundColor="bg-lime-400"
                          dragPointColor="bg-white"
                          id="inputSensitivityScaler"
                          onDrag={handleDragInputSensitivityScale}
                          onDragEnd={handleDragInputSensitivityScale}
                          onMouseDown={handleDragInputSensitivityScale}
                        ></DraggableProgressbar>

                        <div
                          className="absolute h-[0.5rem] bg-white z-[30] bg-opacity-50 pointer-events-none"
                          style={{
                            width: voiceAcitivityDeferred + "%",
                          }}
                        ></div>
                      </div>
                      <p className="mt-2 text-sm text-lime-700">
                        Cannot understand what percentages mean? Click the{" "}
                        <span className="rounded-md text-white bg-lime-700 px-2 cursor-default">
                          Check
                        </span>{" "}
                        button above to monitor input sensitivity in real time!
                      </p>
                    </div>
                  )}

                  {inputMode === "Push to Talk" && (
                    <div className="mt-2 flex animate-fadeIn w-full gap-2">
                      <div className="flex flex-col gap-1 w-full">
                        <p>Shortcut Keybind</p>
                        <div
                          className={`w-full h-fit ${
                            recordingKeybind
                              ? "border-red-500 shadow-xl shadow-red-500"
                              : "border-transparent"
                          } border-4 bg-lime-600 p-2 rounded-md relative text-lime-400 text-opacity-70`}
                        >
                          {recordingKeybind
                            ? "PRESS A KEY"
                            : pushTalkKey === " "
                            ? "SpaceBar"
                            : pushTalkKey}
                          <div className="absolute right-0 top-0 h-full group">
                            <PrimaryButton
                              customWidth="w-fit"
                              customStyles="bg-lime-700 px-2"
                              onclick={() => handleRecordKeyBind()}
                            >
                              <div className="flex transition-all items-center w-fit md:w-[2rem] md:group-hover:w-[8rem] justify-center gap-2">
                                <FaKeyboard />
                                <div className="hidden md:group-hover:block whitespace-nowrap">
                                  Set keybind
                                </div>
                              </div>
                            </PrimaryButton>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1 w-full">
                        <p>Push to Talk Release Delay</p>

                        <div className="mt-4">
                          <DraggableProgressbar
                            progress={releaseDelayScale}
                            showDragPointProgress
                            foregroundColor="bg-gradient-to-r from-lime-600 to-lime-800 dark:from-lime-300 dark:to-lime-100"
                            backgroundColor="bg-lime-400"
                            dragPointColor="bg-lime-600"
                            id="releaseDelayScaler"
                            onDrag={handleDragReleaseDelayScale}
                            onDragEnd={handleDragReleaseDelayScale}
                            onMouseDown={handleDragReleaseDelayScale}
                            getProgressText={(progress) => {
                              const ms = (2000 * progress) / 100.0;
                              return ms >= 1000
                                ? parseFloat((ms / 1000.0).toFixed(1)) + "s"
                                : Math.round(ms) + "ms";
                            }}
                          ></DraggableProgressbar>
                        </div>
                      </div>
                    </div>
                  )}

                  <p className="mt-2 text-lg">Soundboard</p>
                  <p>Soundboard Volume</p>
                  <p className="text-sm text-lime-700">
                    Control how loud sounds are for you personally.
                  </p>

                  <div className="mt-2">
                    <DraggableProgressbar
                      progress={sbVolumeScale}
                      showDragPointProgress
                      foregroundColor="bg-gradient-to-r from-lime-600 to-lime-800 dark:from-lime-300 dark:to-lime-100"
                      backgroundColor="bg-lime-400"
                      dragPointColor="bg-lime-600"
                      id="sbVolumeScaler"
                      onDrag={handleDragSbVolumeScale}
                      onDragEnd={handleDragSbVolumeScale}
                      onMouseDown={handleDragSbVolumeScale}
                    ></DraggableProgressbar>
                  </div>

                  <p className="mt-2">Entrance Sounds</p>
                  <p className="text-sm text-lime-700">
                    Choose a sound to automatically play whenever you join a
                    voice channel.
                  </p>

                  <p className="mt-2">Choose a chatroom to get sounds from..</p>

                  <Spinner
                    showSelected
                    id="sbChatRoomSpinner"
                    placeholder="Select Chatroom"
                    defaultValue={selectedChatRoomName}
                    data={
                      chatRooms.data?.data.map((e) => {
                        if (!currentUser.data?.data) {
                          return "Loading...";
                        }
                        return GenericUtil.computeChatRoomName(
                          e,
                          currentUser.data.data
                        );
                      }) ?? []
                    }
                    width="12rem"
                    onSelected={(i) => {
                      const rooms = chatRooms.data?.data;
                      if (rooms) {
                        setSelectedChatroom(rooms[i]);
                      }
                    }}
                    rounded
                    direction="down"
                  ></Spinner>

                  {selectedChatroom !== null && currentUser.data?.data ? (
                    <div className="flex flex-col gap-2">
                      <p className="mt-2 animate-fadeIn">Choose a sound</p>
                      <Popover
                        containerStyle={{
                          zIndex: "70",
                        }}
                        isOpen={soundPickerOpen}
                        positions={["bottom", "top", "left", "right"]}
                        content={
                          <SoundPicker
                            currentChatRoom={selectedChatroom}
                            queryChatRoomId={selectedChatroom.id}
                            currentUser={currentUser.data?.data}
                            customOnSelectedSound={(sound) => {
                              setSoundPickerOpen(false);
                              handleUpdateEntranceSound(sound);
                            }}
                            excludeMusicTab
                            customOnDeletedSound={() => {
                              setRevalidateSoundFlag((prev) => !prev);
                            }}
                          />
                        }
                      >
                        <div className="w-[12rem] animate-fadeIn flex rounded-md h-[3rem] bg-lime-600 items-center p-2 gap-2">
                          {userSettings.data?.data &&
                          chatRooms.data?.data &&
                          userSettings.data?.data.entranceSound.includes(
                            "@"
                          ) ? (
                            <>
                              {/*@ts-expect-error typescript does not recognize em-emoji */}
                              <em-emoji
                                shortcodes={
                                  userSettings.data.data.entranceSound.split(
                                    "@"
                                  )[2]
                                }
                              />
                              <p className="overflow-x-scroll whitespace-nowrap no-scrollbar">
                                {
                                  userSettings.data.data.entranceSound.split(
                                    "@"
                                  )[0]
                                }{" "}
                                -{enterSoundChatRoomName}
                              </p>
                            </>
                          ) : (
                            "Default"
                          )}
                          <div className="ml-auto">
                            <FloatingButton
                              description="Revert to default"
                              backgroundColor="bg-transparent"
                              onClick={() => {
                                handleUpdateEntranceSound("default");
                              }}
                              hoverColor="hover:text-red-500"
                            >
                              <MdDelete />
                            </FloatingButton>
                          </div>

                          <div className="ml-0">
                            <FloatingButton
                              description="Change sound"
                              backgroundColor="bg-transparent"
                              onClick={() =>
                                setSoundPickerOpen((prev) => !prev)
                              }
                            >
                              <MdEdit />
                            </FloatingButton>
                          </div>
                        </div>
                      </Popover>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <p className="mt-2">Current Sound</p>
                      <div className="w-[12rem] animate-fadeIn flex rounded-md h-[3rem] bg-lime-600 items-center p-2 gap-2">
                        {userSettings.data?.data &&
                        chatRooms.data?.data &&
                        userSettings.data?.data.entranceSound.includes("@") ? (
                          <>
                            {/*@ts-expect-error typescript does not recognize em-emoji */}
                            <em-emoji
                              shortcodes={
                                userSettings.data.data.entranceSound.split(
                                  "@"
                                )[2]
                              }
                            />
                            <p className="overflow-x-scroll whitespace-nowrap no-scrollbar">
                              {
                                userSettings.data.data.entranceSound.split(
                                  "@"
                                )[0]
                              }
                              -{enterSoundChatRoomName}
                            </p>
                          </>
                        ) : (
                          "Default"
                        )}

                        <div className="ml-auto">
                          <FloatingButton
                            description="Revert to default"
                            backgroundColor="bg-transparent"
                            onClick={() => handleUpdateEntranceSound("default")}
                            hoverColor="hover:text-red-500"
                          >
                            <MdDelete />
                          </FloatingButton>
                        </div>
                      </div>
                    </div>
                  )}

                  {!entranceSoundExists ? (
                    <div className="text-red-500 flex items-center mt-1 gap-2">
                      <MdWarning />
                      This sound has been deleted, default sound will be used
                    </div>
                  ) : (
                    <></>
                  )}

                  <p className="mt-4 text-2xl font-bold">Video Settings</p>

                  <div
                    className={`w-full mt-2 ${
                      sampleVideoTrack ? "p-0" : "p-8"
                    } h-fit rounded-md bg-lime-700 text-lime-400 grid place-content-center relative`}
                  >
                    {!sampleVideoTrack ? (
                      <>
                        <div
                          className={`flex justify-center
                          ${
                            currentUser.data?.data.isVideoEnabled &&
                            callContext?.currentCallingChatRoom !== undefined &&
                            "text-gray-500"
                          }`}
                        >
                          <IoCamera size={GenericUtil.remToPx(8)} />
                        </div>

                        <div className="flex justify-center">
                          <PrimaryButton
                            customStyles="bg-lime-500 px-2 text-white"
                            onclick={() => {
                              if (sampleVideoTrack) {
                                handleStopCheckVideo();
                              } else {
                                handleCheckVideo();
                              }
                            }}
                            disabled={
                              currentUser.data?.data.isVideoEnabled &&
                              callContext?.currentCallingChatRoom !== undefined
                            }
                          >
                            {currentUser.data?.data.isVideoEnabled &&
                            callContext?.currentCallingChatRoom !== undefined
                              ? "Video Already Enabled"
                              : "Test Video"}
                          </PrimaryButton>
                        </div>
                      </>
                    ) : (
                      <></>
                    )}
                    <video
                      className={`${
                        sampleVideoTrack === null && "hidden"
                      } w-full h-auto object-cover`}
                      ref={testVideoElementRef}
                    ></video>
                  </div>

                  {sampleVideoTrack && (
                    <PrimaryButton
                      customStyles="bg-red-500 mb-2 mt-2 px-2 text-white"
                      onclick={() => {
                        handleStopCheckVideo();
                      }}
                    >
                      Stop Video
                    </PrimaryButton>
                  )}

                  <div className="flex mt-2">
                    <div className="flex flex-col gap-1">
                      <p>Always preview video</p>

                      <p className="text-sm text-lime-700">
                        Pops up preview modal every time you turn on video
                      </p>
                    </div>

                    <div className="ml-auto">
                      <PrimarySwitch
                        isActive={alwaysPreviewVideo === "yes"}
                        onClick={(active) => {
                          setAlwaysPreviewVideo(active ? "yes" : "no");
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-2 flex gap-2 items-center flex-wrap">
                    <p>Camera Device</p>

                    <div className={`z-[70]`}>{videoDeviceListSpinner}</div>
                  </div>

                  <p className="mt-2 text-lg">Video Background</p>

                  <Spinner
                    showSelected
                    id="bgChatRoomSpinner"
                    placeholder="Select Chatroom"
                    defaultValue={selectedBgChatRoomName}
                    data={
                      chatRooms.data?.data.map((e) => {
                        if (!currentUser.data?.data) {
                          return "Loading...";
                        }

                        return GenericUtil.computeChatRoomName(
                          e,
                          currentUser.data.data
                        );
                      }) ?? []
                    }
                    width="12rem"
                    onSelected={(i) => {
                      const rooms = chatRooms.data?.data;
                      if (rooms) {
                        setSelectedBgChatRoom(rooms[i]);
                      }
                    }}
                    rounded
                    direction="down"
                  ></Spinner>

                  {currentUser.data?.data && (
                    <div className="mt-2 w-fit mx-auto animate-fadeIn">
                      <BackgroundPicker
                        customStyles="bg-lime-700 rounded-md"
                        currentUser={currentUser.data?.data}
                        currentChatRoom={selectedBgChatRoom ?? undefined}
                        queryChatRoomId={selectedBgChatRoom?.id ?? undefined}
                        excludeSharedFunction={selectedBgChatRoom === null}
                      />
                    </div>
                  )}

                  <PrimaryButton
                    customStyles="mt-5 bg-lime-600"
                    onclick={() => {
                      if (callContext?.currentCallingChatRoom) {
                        callContext?.handleChangeDevice(
                          callContext.selectedDevice.videoUserInputDevice,
                          true
                        );
                      }

                      if (sampleVideoTrack) {
                        handleStopCheckVideo();
                        handleCheckVideo();
                      }
                    }}
                  >
                    <div className="flex justify-center items-center gap-2">
                      <FaCheck />
                      Apply Background Now (If in call)
                    </div>
                  </PrimaryButton>

                  <p className="mt-4 text-2xl font-bold">Advanced Settings</p>

                  <p className="mt-2 text-lg">Audio Codec</p>
                  <div
                    className="mt-2 w-full rounded-md h-fit p-4 flex items-center justify-center bg-lime-600
                  border-lime-700 border-2 text-white gap-4"
                  >
                    <img
                      src={
                        Constants.SERVER_STATIC_CONTENT_PATH + "opus_logo.png"
                      }
                      className="w-[10vw] h-auto"
                    />
                    Accord uses only the best organic, locally-sourced Opus
                    Voice Codec.
                  </div>

                  <p className="mt-2 text-lg">Preferred Video Codec</p>

                  {/* <p className="mt-2">Outgoing Video (Encoding)</p> */}
                  <Spinner
                    data={[
                      ...supportedVideoCodecs.map((e) =>
                        e.mimeType === "video/VP8"
                          ? "VP8(Default)"
                          : e.mimeType.split("/")[1]
                      ),
                    ]}
                    defaultValue={
                      videoCodec === "video/VP8"
                        ? "VP8(Default)"
                        : videoCodec.split("/")[1]
                    }
                    onSelected={(i) => {
                      const codec = [
                        ...supportedVideoCodecs.map((e) => e.mimeType),
                      ][i];
                      setVideoCodec(codec);
                      localStorage.setItem("videoCodec", codec);
                    }}
                    placeholder="Select.."
                    id="videoCodecSpinner"
                    width="10rem"
                    rounded
                    showSelected
                  ></Spinner>

                  <div className="mt-2 flex items-center text-sm text-lime-700 gap-2">
                    <FaCheck />
                    {videoCodec === "video/VP8" &&
                      "A widely supported codec ideal for compatibility and real-time video applications, but less efficient than newer codecs."}
                    {videoCodec === "video/VP9" &&
                      "A modern codec offering better video quality at lower bitrates, perfect for HD streaming, but requires more processing power."}
                    {videoCodec === "video/H264" &&
                      "A highly compatible codec with broad hardware support, ensuring smooth playback, though it uses slightly more bandwidth."}
                    {videoCodec === "video/AV1" &&
                      "The most efficient codec for high-quality video at minimal bandwidth, designed for modern devices but resource-intensive."}
                  </div>

                  {videoCodec !== "video/VP8" &&
                    videoCodec !== "video/H264" && (
                      <div className="flex items-center text-sm text-orange-500 gap-2">
                        <MdWarning />
                        This codec is not widely supported. Others in a call may
                        not be able to see your video and be given the feedback
                        &quot;Unsupported Codec&quot;
                      </div>
                    )}

                  <p className="mt-2 text-lg">Voice Processing</p>

                  <div className="flex mt-2">
                    <div className="flex flex-col gap-1">
                      <p>Echo Cancellation</p>
                    </div>

                    <div className="ml-auto">
                      <PrimarySwitch
                        isActive={echoCancellation === "yes"}
                        onClick={(active) => {
                          setEchoCancellation(active ? "yes" : "no");
                          localStorage.setItem(
                            "echoCancellation",
                            active ? "yes" : "no"
                          );
                          if (callContext?.currentCallingChatRoom) {
                            const audioInputDevice =
                              callContext.selectedDevice.audioUserInputDevice;
                            callContext.handleChangeDevice(
                              audioInputDevice,
                              false
                            );
                          }

                          if (sampleAudioTrack) {
                            handleStopCheckVoice();
                            handleCheckVoice();
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex mt-2">
                    <div className="flex flex-col gap-1">
                      <p>Noise Suppression</p>
                      <p className="text-sm mt-1 text-lime-700">
                        Suppress background noise from your mic.
                      </p>
                    </div>

                    <div className="ml-auto">
                      <PrimarySwitch
                        isActive={noiseSuppression === "yes"}
                        onClick={(active) => {
                          setNoiseSuppression(active ? "yes" : "no");
                          localStorage.setItem(
                            "noiseSuppression",
                            active ? "yes" : "no"
                          );
                          if (callContext?.currentCallingChatRoom) {
                            const audioInputDevice =
                              callContext.selectedDevice.audioUserInputDevice;
                            callContext.handleChangeDevice(
                              audioInputDevice,
                              false
                            );
                          }
                          if (sampleAudioTrack) {
                            handleStopCheckVoice();
                            handleCheckVoice();
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex mt-2">
                    <div className="flex flex-col gap-1">
                      <p>Automatic Gain Control</p>
                      <p className="text-sm mt-1 text-lime-700">
                        Automatically adjust microphone volume to remain clear
                        and consistent.
                      </p>
                    </div>

                    <div className="ml-auto">
                      <PrimarySwitch
                        isActive={autoGainControl === "yes"}
                        onClick={(active) => {
                          setAutoGainControl(active ? "yes" : "no");
                          localStorage.setItem(
                            "autoGainControl",
                            active ? "yes" : "no"
                          );
                          if (callContext?.currentCallingChatRoom) {
                            const audioInputDevice =
                              callContext.selectedDevice.audioUserInputDevice;
                            callContext.handleChangeDevice(
                              audioInputDevice,
                              false
                            );
                          }
                          if (sampleAudioTrack) {
                            handleStopCheckVoice();
                            handleCheckVoice();
                          }
                        }}
                      />
                    </div>
                  </div>

                  <p className="mt-2 text-lg">Stream Previews</p>

                  <div className="flex mt-2">
                    <div className="flex flex-col gap-1">
                      <p>Show Stream Previews</p>
                      <p className="text-sm mt-1 text-lime-700">
                        Users will be able to see a preview of your stream
                        before joining.
                      </p>
                    </div>

                    <div className="ml-auto">
                      <PrimarySwitch
                        isActive={
                          userSettings.data?.data.canPreviewStream ?? true
                        }
                        onClick={(active) => {
                          handleUpdateCanPreviewStream(active);
                        }}
                      />
                    </div>
                  </div>

                  <p className="mt-2 text-lg">Quality of Service</p>

                  <div className="flex mt-2">
                    <div className="flex flex-col gap-1">
                      <p>Stream Attenuation</p>
                      <p className="text-sm text-lime-700">
                        Automatically lower the volume of user screen streams
                        when others speak.
                      </p>
                    </div>

                    <div className="ml-auto">
                      <PrimarySwitch
                        isActive={streamAttenuation === "yes"}
                        onClick={(active) => {
                          setStreamAttenuation(active ? "yes" : "no");
                        }}
                      />
                    </div>
                  </div>

                  <p>Stream Attenuation Strength</p>

                  <div className="mt-2">
                    <DraggableProgressbar
                      progress={attenuationStrength}
                      showDragPointProgress
                      foregroundColor="bg-gradient-to-r from-lime-600 to-lime-800 dark:from-lime-300 dark:to-lime-100"
                      backgroundColor="bg-lime-400"
                      dragPointColor="bg-lime-600"
                      id="attenuationStrengthScaler"
                      onDrag={handleDragAttenuationStrength}
                      onDragEnd={handleDragAttenuationStrength}
                      onMouseDown={handleDragAttenuationStrength}
                    ></DraggableProgressbar>
                  </div>

                  <p className="mt-2 text-lg">Voice Diagnostics</p>
                  <div className="flex mt-2">
                    <div className="flex flex-col gap-1">
                      <p>
                        Show a warning when Accord is not detecting audio from
                        your mic
                      </p>
                    </div>

                    <div className="ml-auto">
                      <PrimarySwitch
                        isActive={showNoMicInputWarning === "yes"}
                        onClick={(active) => {
                          setShowNoMicInputWarning(active ? "yes" : "no");
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
              {tab == "Appearance" && (
                <div className="animate-fadeIn">
                  <p className="text-2xl font-bold mb-4">Appearance</p>

                  <div className="mt-2 rounded-md w-full flex flex-col border-4 border-lime-700">
                    <ChatRecord
                      record={GenericUtil.createPlaceholderRecord(
                        "Let us meditate :+1:",
                        user
                      )}
                      currentChatRoom={GenericUtil.createPlaceholderChatRoom()}
                      currentUser={user}
                      isSimplePreview
                      simplePreviewCustomStyles=""
                    />
                    <ChatRecord
                      record={GenericUtil.createPlaceholderRecord(
                        "Why Hello there",
                        user
                      )}
                      currentChatRoom={GenericUtil.createPlaceholderChatRoom()}
                      currentUser={user}
                      isSimplePreview
                      simplePreviewCustomStyles=""
                    />
                    <ChatRecord
                      record={GenericUtil.createPlaceholderRecord(
                        "Check out this url: http://www.google.com",
                        user
                      )}
                      currentChatRoom={GenericUtil.createPlaceholderChatRoom()}
                      currentUser={user}
                      showDetails={false}
                      isSimplePreview
                      simplePreviewCustomStyles=""
                    />

                    <ChatRecord
                      record={GenericUtil.createPlaceholderRecord(
                        "Peace need not be lonely...",
                        user
                      )}
                      currentChatRoom={GenericUtil.createPlaceholderChatRoom()}
                      currentUser={user}
                      isSimplePreview
                      simplePreviewCustomStyles=""
                    />
                  </div>
                  <p className="mt-2 text-lg mb-2">Theme</p>
                  <div className="flex justify-start items-center gap-4">
                    <div className="flex flex-col relative">
                      <div
                        className="
                      hover:bg-opacity-70 transition
                      bg-lime-600 rounded-full border-2 border-lime-700 w-[4rem] h-[4rem] cursor-pointer nightwind-prevent"
                        onClick={() => {
                          setSelectedTheme("Dark");
                          localStorage.setItem("appTheme", "Dark");

                          nightwind.enable(false);
                        }}
                      ></div>

                      {selectedTheme === "Dark" && (
                        <div className="absolute rounded-full top-[-5%] right-[-5%] bg-white text-lime-400 p-1">
                          <FaCheck />
                        </div>
                      )}

                      <p className="text-center">Dark</p>
                    </div>

                    <div className="flex flex-col relative">
                      <div
                        className="hover:bg-opacity-70 transition bg-lime-300 nightwind-prevent rounded-full border-2 border-lime-400 w-[4rem] h-[4rem] cursor-pointer"
                        onClick={() => {
                          setSelectedTheme("Light");
                          localStorage.setItem("appTheme", "Light");

                          nightwind.enable(true);
                        }}
                      ></div>

                      {selectedTheme === "Light" && (
                        <div className="absolute rounded-full top-[-5%] right-[-5%] bg-white text-lime-400 p-1">
                          <FaCheck />
                        </div>
                      )}
                      <p className="text-center">Light</p>
                    </div>
                  </div>
                  <p className="mt-2 text-lg mb-2">In-App Icon</p>
                  <div className="flex flex-wrap gap-2">
                    <div
                      className={`rounded-md shadow-xl bg-lime-600 p-2 relative cursor-pointer ${
                        selectedInAppIcon === "Default"
                          ? "border-2 border-lime-400"
                          : "border-2 border-transparent"
                      }`}
                      onClick={() => {
                        setSelectedInAppIcon("Default");
                        localStorage.setItem("appIcon", "Default");
                      }}
                    >
                      {selectedInAppIcon === "Default" && (
                        <div className="absolute rounded-full top-[-5%] right-[-5%] bg-white text-lime-400 p-1">
                          <FaCheck />
                        </div>
                      )}
                      <div className="text-white">
                        <GiPeaceDove size={48} />
                      </div>
                    </div>

                    <div
                      className={`rounded-md shadow-xl bg-lime-300 p-2 relative cursor-pointer ${
                        selectedInAppIcon === "SimpleLight"
                          ? "border-2 border-lime-400"
                          : "border-2 border-transparent"
                      }`}
                      onClick={() => {
                        setSelectedInAppIcon("SimpleLight");
                        localStorage.setItem("appIcon", "SimpleLight");
                      }}
                    >
                      {selectedInAppIcon === "SimpleLight" && (
                        <div className="absolute rounded-full top-[-5%] right-[-5%] bg-white text-lime-400 p-1">
                          <FaCheck />
                        </div>
                      )}
                      <div className="text-lime-500">
                        <GiPeaceDove size={48} />
                      </div>
                    </div>

                    <div
                      className={`rounded-md shadow-xl bg-gradient-to-br from-lime-500 to-lime-700 dark:from-lime-400 dark:to-lime-200 p-2 relative cursor-pointer ${
                        selectedInAppIcon === "ShadeDark"
                          ? "border-2 border-lime-400"
                          : "border-2 border-transparent"
                      }`}
                      onClick={() => {
                        setSelectedInAppIcon("ShadeDark");
                        localStorage.setItem("appIcon", "ShadeDark");
                      }}
                    >
                      {selectedInAppIcon === "ShadeDark" && (
                        <div className="absolute rounded-full top-[-5%] right-[-5%] bg-white text-lime-400 p-1">
                          <FaCheck />
                        </div>
                      )}
                      <div className="text-white">
                        <GiPeaceDove size={48} />
                      </div>
                    </div>

                    <div
                      className={`rounded-md shadow-xl bg-gradient-to-br from-orange-400 to-orange-600 dark:from-orange-500 dark:to-orange-300 p-2 relative cursor-pointer ${
                        selectedInAppIcon === "FieryOrange"
                          ? "border-2 border-lime-400"
                          : "border-2 border-transparent"
                      }`}
                      onClick={() => {
                        setSelectedInAppIcon("FieryOrange");
                        localStorage.setItem("appIcon", "FieryOrange");
                      }}
                    >
                      {selectedInAppIcon === "FieryOrange" && (
                        <div className="absolute rounded-full top-[-5%] right-[-5%] bg-white text-lime-400 p-1">
                          <FaCheck />
                        </div>
                      )}
                      <div className="text-orange-700">
                        <GiPeaceDove size={48} />
                      </div>
                    </div>

                    <div
                      className={`rounded-md shadow-xl bg-gradient-to-br from-yellow-500 to-lime-500 dark:from-yellow-400 dark:to-lime-400 p-2 relative cursor-pointer ${
                        selectedInAppIcon === "GreenYellow"
                          ? "border-2 border-lime-400"
                          : "border-2 border-transparent"
                      }`}
                      onClick={() => {
                        setSelectedInAppIcon("GreenYellow");
                        localStorage.setItem("appIcon", "GreenYellow");
                      }}
                    >
                      {selectedInAppIcon === "GreenYellow" && (
                        <div className="absolute rounded-full top-[-5%] right-[-5%] bg-white text-lime-400 p-1">
                          <FaCheck />
                        </div>
                      )}
                      <div className="text-lime-200">
                        <GiPeaceDove size={48} />
                      </div>
                    </div>

                    <div
                      className={`rounded-md shadow-xl bg-gradient-to-br from-blue-500 to-lime-500 dark:from-blue-400 dark:to-lime-400 p-2 relative cursor-pointer ${
                        selectedInAppIcon === "RainBlue"
                          ? "border-2 border-lime-400"
                          : "border-2 border-transparent"
                      }`}
                      onClick={() => {
                        setSelectedInAppIcon("RainBlue");
                        localStorage.setItem("appIcon", "RainBlue");
                      }}
                    >
                      {selectedInAppIcon === "RainBlue" && (
                        <div className="absolute rounded-full top-[-5%] right-[-5%] bg-white text-lime-400 p-1">
                          <FaCheck />
                        </div>
                      )}
                      <div className="text-blue-300">
                        <GiPeaceDove size={48} />
                      </div>
                    </div>

                    <div
                      className={`rounded-md shadow-xl bg-gradient-to-br from-gray-200 to-gray-400 dark:from-gray-700 dark:to-gray-500 p-2 relative cursor-pointer ${
                        selectedInAppIcon === "WindGray"
                          ? "border-2 border-lime-400"
                          : "border-2 border-transparent"
                      }`}
                      onClick={() => {
                        setSelectedInAppIcon("WindGray");
                        localStorage.setItem("appIcon", "WindGray");
                      }}
                    >
                      {selectedInAppIcon === "WindGray" && (
                        <div className="absolute rounded-full top-[-5%] right-[-5%] bg-white text-lime-400 p-1">
                          <FaCheck />
                        </div>
                      )}
                      <div className="text-lime-600">
                        <GiPeaceDove size={48} />
                      </div>
                    </div>
                  </div>

                  <p className="mt-2 text-lg">MESSAGE DISPLAY</p>
                  <div
                    onClick={() => {
                      setMsgSpaceScale(66.67);
                      setSelectedMsgDisplayMode("Cozy");
                    }}
                    className={`flex w-full ${
                      selectedMsgDisplayMode === "Cozy"
                        ? "bg-lime-700"
                        : "bg-lime-600"
                    } md:h-[3.5rem] h-[4.5rem] rounded-md items-center p-2 transition hover:bg-lime-700 cursor-pointer group`}
                  >
                    <div className="flex flex-col">
                      <p className="text-lg">Cozy</p>
                      <p className="text-sm text-lime-400">
                        Modern, beautiful, and easy on your eyes.
                      </p>
                    </div>
                    <div
                      className={`ml-auto my-auto mr-2 rounded-full cursor-pointer w-[1.5rem] h-[1.5rem] border-[0.35rem] bg-lime-500 border-lime-400 transition group-hover:bg-lime-600
                      ${selectedMsgDisplayMode === "Cozy" && "bg-lime-600"}`}
                    ></div>
                  </div>

                  <div
                    onClick={() => {
                      setMsgSpaceScale(0);
                      setSelectedMsgDisplayMode("Compact");
                    }}
                    className={`flex w-full ${
                      selectedMsgDisplayMode === "Compact"
                        ? "bg-lime-700"
                        : "bg-lime-600"
                    } md:h-[3.5rem] h-[4.5rem] mt-2 rounded-md items-center p-2 transition hover:bg-lime-700 cursor-pointer group`}
                  >
                    <div className="flex flex-col">
                      <p className="text-lg">Compact</p>
                      <p className="text-sm text-lime-400">
                        Fit more messages on screen at one time.
                      </p>
                    </div>
                    <div
                      className={`ml-auto my-auto mr-2 rounded-full cursor-pointer w-[1.5rem] h-[1.5rem] border-[0.35rem] bg-lime-500 border-lime-400 transition group-hover:bg-lime-600
                      ${selectedMsgDisplayMode === "Compact" && "bg-lime-600"}`}
                    ></div>
                  </div>

                  <div className="flex mt-2">
                    <p>Show avatars in Compact Mode</p>

                    <div className="ml-auto">
                      <PrimarySwitch
                        isActive={showAvatarsOnCompactMode}
                        onClick={(active) => {
                          setShowAvatarsOnCompactMode(active);
                        }}
                      />
                    </div>
                  </div>

                  <p className="text-lg mt-2">Chat Font Scaling</p>

                  <div className="flex mt-2 relative">
                    <DraggableProgressbar
                      id="chatFontScaler"
                      progress={chatFontScale}
                      onDrag={handleDragChatFontScale}
                      onMouseDown={handleDragChatFontScale}
                      onDragEnd={handleDragChatFontScale}
                      foregroundColor="bg-gradient-to-r from-lime-600 to-lime-800 dark:from-lime-300 dark:to-lime-100"
                      backgroundColor="bg-lime-400"
                      dragPointColor="bg-lime-600"
                    />

                    <div className="flex flex-col absolute left-0">
                      <div className="w-[0.1rem] h-[1rem] bg-lime-300 text-white translate-y-[-25%]"></div>
                      <p className="translate-x-[0%] text-xs md:text-base">
                        12px
                      </p>
                    </div>

                    <div className="flex flex-col absolute left-[16.67%]">
                      <div className="w-[0.1rem] h-[1rem] bg-lime-300 text-white translate-y-[-25%]"></div>

                      <p className="translate-x-[-50%] text-xs md:text-base">
                        14px
                      </p>
                    </div>

                    <div className="flex flex-col absolute left-[25%]">
                      <div className="w-[0.1rem] h-[1rem] bg-lime-300 text-white translate-y-[-25%]"></div>

                      <p className="translate-x-[-50%] text-xs md:text-base">
                        15px
                      </p>
                    </div>

                    <div className="flex flex-col absolute left-[33.3333333%]">
                      <div className="w-[0.1rem] h-[1rem] bg-lime-300 text-white translate-y-[-25%]"></div>

                      <p className="translate-x-[-50%] text-xs md:text-base">
                        16px
                      </p>
                    </div>

                    <div className="flex flex-col absolute left-[50%]">
                      <div className="w-[0.1rem] h-[1rem] bg-lime-300 text-white translate-y-[-25%]"></div>

                      <p className="translate-x-[-50%] text-xs md:text-base">
                        18px
                      </p>
                    </div>

                    <div className="flex flex-col absolute left-[66.67%]">
                      <div className="w-[0.1rem] h-[1rem] bg-lime-300 text-white translate-y-[-25%]"></div>

                      <p className="translate-x-[-50%] text-xs md:text-base">
                        20px
                      </p>
                    </div>

                    <div className="flex flex-col absolute left-[100%]">
                      <div className="w-[0.1rem] h-[1rem] bg-lime-300 text-white translate-y-[-25%]"></div>
                      <p className="translate-x-[-100%] text-xs md:text-base">
                        24px
                      </p>
                    </div>
                  </div>

                  <p className="text-lg mt-10">Space between message groups</p>

                  <div className="flex mt-2 relative">
                    <DraggableProgressbar
                      id="msgSpaceScaler"
                      progress={msgSpaceScale}
                      onDrag={handleDragMsgSpaceScale}
                      onMouseDown={handleDragMsgSpaceScale}
                      onDragEnd={handleDragMsgSpaceScale}
                      foregroundColor="bg-gradient-to-r from-lime-600 to-lime-800 dark:from-lime-300 dark:to-lime-100"
                      backgroundColor="bg-lime-400"
                      dragPointColor="bg-lime-600"
                    />

                    <div className="flex flex-col absolute left-0">
                      <div className="w-[0.1rem] h-[1rem] bg-lime-300 text-white translate-y-[-25%]"></div>
                      <p className="translate-x-[0%] text-xs md:text-base">
                        0px
                      </p>
                    </div>

                    <div className="flex flex-col absolute left-[16.67%]">
                      <div className="w-[0.1rem] h-[1rem] bg-lime-300 text-white translate-y-[-25%]"></div>

                      <p className="translate-x-[-50%] text-xs md:text-base">
                        4px
                      </p>
                    </div>

                    <div className="flex flex-col absolute left-[33.33333333%]">
                      <div className="w-[0.1rem] h-[1rem] bg-lime-300 text-white translate-y-[-25%]"></div>

                      <p className="translate-x-[-50%] text-xs md:text-base">
                        8px
                      </p>
                    </div>

                    <div className="flex flex-col absolute left-[66.67%]">
                      <div className="w-[0.1rem] h-[1rem] bg-lime-300 text-white translate-y-[-25%]"></div>

                      <p className="translate-x-[-50%] text-xs md:text-base">
                        16px
                      </p>
                    </div>

                    <div className="flex flex-col absolute left-[100%]">
                      <div className="w-[0.1rem] h-[1rem] bg-lime-300 text-white translate-y-[-25%]"></div>

                      <p className="translate-x-[-100%] text-xs md:text-base">
                        24px
                      </p>
                    </div>
                  </div>

                  <p className="text-lg mt-10">Zoom Level</p>

                  <p className="text-lime-700">
                    Currently unsupported, please use the browser&apos;s native
                    zoom feature!
                  </p>

                  <p className="text-lg mt-2">Saturation</p>

                  <p className="text-lime-700">
                    Reduce the saturation of colors within the application, for
                    those with color sensitivities. This does not affect the
                    saturation of user-provided content by default.
                  </p>

                  <div className="flex mt-2 relative">
                    <DraggableProgressbar
                      id="saturationScaler"
                      progress={saturationScale}
                      onDrag={handleDragSaturationScale}
                      onMouseDown={handleDragSaturationScale}
                      onDragEnd={handleDragSaturationScale}
                      foregroundColor="bg-gradient-to-r from-lime-600 to-lime-800 dark:from-lime-300 dark:to-lime-100"
                      backgroundColor="bg-lime-400"
                      dragPointColor="bg-lime-600"
                    />

                    <div className="flex flex-col absolute left-0">
                      <div className="w-[0.1rem] h-[1rem] bg-lime-300 text-white translate-y-[-25%]"></div>
                      <p className="translate-x-[0%] text-xs md:text-base">
                        0%
                      </p>
                    </div>

                    <div className="flex flex-col absolute left-[10%]">
                      <div className="w-[0.1rem] h-[1rem] bg-lime-300 text-white translate-y-[-25%]"></div>
                      <p className="translate-x-[-50%] text-xs md:text-base hidden md:inline">
                        10%
                      </p>
                    </div>
                    <div className="flex flex-col absolute left-[20%]">
                      <div className="w-[0.1rem] h-[1rem] bg-lime-300 text-white translate-y-[-25%]"></div>
                      <p className="translate-x-[-50%] text-xs md:text-base">
                        20%
                      </p>
                    </div>
                    <div className="flex flex-col absolute left-[30%]">
                      <div className="w-[0.1rem] h-[1rem] bg-lime-300 text-white translate-y-[-25%]"></div>
                      <p className="translate-x-[-50%] text-xs md:text-base hidden md:inline">
                        30%
                      </p>
                    </div>
                    <div className="flex flex-col absolute left-[40%]">
                      <div className="w-[0.1rem] h-[1rem] bg-lime-300 text-white translate-y-[-25%]"></div>
                      <p className="translate-x-[-50%] text-xs md:text-base">
                        40%
                      </p>
                    </div>
                    <div className="flex flex-col absolute left-[50%]">
                      <div className="w-[0.1rem] h-[1rem] bg-lime-300 text-white translate-y-[-25%]"></div>
                      <p className="translate-x-[-50%] text-xs md:text-base hidden md:inline">
                        50%
                      </p>
                    </div>
                    <div className="flex flex-col absolute left-[60%]">
                      <div className="w-[0.1rem] h-[1rem] bg-lime-300 text-white translate-y-[-25%]"></div>
                      <p className="translate-x-[-50%] text-xs md:text-base">
                        60%
                      </p>
                    </div>

                    <div className="flex flex-col absolute left-[70%]">
                      <div className="w-[0.1rem] h-[1rem] bg-lime-300 text-white translate-y-[-25%]"></div>
                      <p className="translate-x-[-50%] text-xs md:text-base hidden md:inline">
                        70%
                      </p>
                    </div>

                    <div className="flex flex-col absolute left-[80%]">
                      <div className="w-[0.1rem] h-[1rem] bg-lime-300 text-white translate-y-[-25%]"></div>
                      <p className="translate-x-[-50%] text-xs md:text-base">
                        80%
                      </p>
                    </div>

                    <div className="flex flex-col absolute left-[90%]">
                      <div className="w-[0.1rem] h-[1rem] bg-lime-300 text-white translate-y-[-25%]"></div>
                      <p className="translate-x-[-50%] text-xs md:text-base hidden md:inline">
                        90%
                      </p>
                    </div>

                    <div className="flex flex-col absolute left-[100%]">
                      <div className="w-[0.1rem] h-[1rem] bg-lime-300 text-white translate-y-[-25%]"></div>
                      <p className="translate-x-[-100%] text-xs md:text-base">
                        100%
                      </p>
                    </div>
                  </div>

                  <PrimaryButton
                    customStyles="mt-12 bg-lime-600"
                    onclick={() => {
                      setSaturationScale(100.0);
                      setSelectedMsgDisplayMode("Cozy");
                      setChatFontScale(33.3333333333);
                      setMsgSpaceScale(66.67);
                    }}
                  >
                    Reset to defaults
                  </PrimaryButton>

                  <p className="text-lg mt-2">Time Format</p>

                  <div
                    onClick={() => {
                      setTimeFormat("12-hour");
                    }}
                    className={`flex w-full ${
                      timeFormat === "12-hour" ? "bg-lime-700" : "bg-lime-600"
                    } md:h-[3.5rem] h-[4.5rem] rounded-md items-center p-2 transition hover:bg-lime-700 cursor-pointer group`}
                  >
                    <div className="flex flex-col">
                      <p className="text-lg">12-hour</p>
                    </div>
                    <div
                      className={`ml-auto my-auto mr-2 rounded-full cursor-pointer w-[1.5rem] h-[1.5rem] border-[0.35rem] bg-lime-500 border-lime-400 transition group-hover:bg-lime-600
                      ${timeFormat === "12-hour" && "bg-lime-600"}`}
                    ></div>
                  </div>

                  <div
                    onClick={() => {
                      setTimeFormat("24-hour");
                    }}
                    className={`flex w-full mt-2 ${
                      timeFormat === "24-hour" ? "bg-lime-700" : "bg-lime-600"
                    } md:h-[3.5rem] h-[4.5rem] rounded-md items-center p-2 transition hover:bg-lime-700 cursor-pointer group`}
                  >
                    <div className="flex flex-col">
                      <p className="text-lg">24-hour</p>
                    </div>
                    <div
                      className={`ml-auto my-auto mr-2 rounded-full cursor-pointer w-[1.5rem] h-[1.5rem] border-[0.35rem] bg-lime-500 border-lime-400 transition group-hover:bg-lime-600
                      ${timeFormat === "24-hour" && "bg-lime-600"}`}
                    ></div>
                  </div>

                  <div className="flex mt-2">
                    <div className="flex flex-col gap-1">
                      <p>Always underline links</p>

                      <p className="text-sm text-lime-700">
                        Make links to websites stand out more by underlining
                        them.
                      </p>
                    </div>

                    <div className="ml-auto">
                      <PrimarySwitch
                        isActive={underlineLinks === "yes"}
                        onClick={(active) => {
                          setUnderlineLinks(active ? "yes" : "no");
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex mt-2">
                    <div className="flex flex-col gap-1">
                      <p>Enable reduced motion</p>
                      <p className="text-sm text-lime-700">
                        Minimize the animation of the app. May cause slight UI
                        disintegrity!
                      </p>
                    </div>

                    <div className="ml-auto">
                      <PrimarySwitch
                        isActive={reducedMotion === "yes"}
                        onClick={(active) => {
                          setReducedMotion(active ? "yes" : "no");
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex mt-2">
                    <p>Show send message button</p>

                    <div className="ml-auto">
                      <PrimarySwitch
                        isActive={showSendButton === "yes"}
                        onClick={(active) => {
                          setShowSendButton(active ? "yes" : "no");
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
              {tab === "Content & Social" && (
                <div className="animate-fadeIn">
                  <p className="text-2xl font-bold mb-4">Content & Social</p>

                  <p>Sensitive Media</p>
                  <p
                    className="text-sm text-lime-700"
                    style={{
                      overflowWrap: "anywhere",
                    }}
                  >
                    Choose what you see when chat may contain sensitive content.
                    Currently only image & text filters are supported.
                  </p>

                  <p className="mt-2">Direct Message from friends</p>
                  <Spinner
                    key={"dm_friends_" + updateUserSettingsMutation.isPending}
                    data={["Show", "Blur", "Block"]}
                    width={`7rem`}
                    id="contentFilterSpinner1"
                    placeholder="Show"
                    rounded
                    showSelected
                    onSelected={(i) => {
                      handleUpdateNsfwSettings(
                        "dm_friends_sensitive",
                        ["Show", "Blur", "Block"][i] as
                          | "Show"
                          | "Blur"
                          | "Block"
                      );
                    }}
                    selectedIndex_={
                      userSettings.data?.data.nsfwDmFriends
                        ? ["Show", "Blur", "Block"].indexOf(
                            userSettings.data.data.nsfwDmFriends
                          )
                        : 0
                    }
                    defaultValue={
                      userSettings.data?.data.nsfwDmFriends ?? "Show"
                    }
                  />

                  <p className="mt-2">Direct Message from others</p>
                  <Spinner
                    key={"dm_others_" + updateUserSettingsMutation.isPending}
                    data={["Show", "Blur", "Block"]}
                    width={`7rem`}
                    id="contentFilterSpinner2"
                    placeholder="Show"
                    rounded
                    showSelected
                    onSelected={(i) => {
                      handleUpdateNsfwSettings(
                        "dm_others_sensitive",
                        ["Show", "Blur", "Block"][i] as
                          | "Show"
                          | "Blur"
                          | "Block"
                      );
                    }}
                    selectedIndex_={
                      userSettings.data?.data.nsfwDmOthers
                        ? ["Show", "Blur", "Block"].indexOf(
                            userSettings.data.data.nsfwDmOthers
                          )
                        : 0
                    }
                    defaultValue={
                      userSettings.data?.data.nsfwDmOthers ?? "Show"
                    }
                  />

                  <p className="mt-2">Messages in group chats</p>
                  <Spinner
                    key={"groups_" + updateUserSettingsMutation.isPending}
                    data={["Show", "Blur", "Block"]}
                    width={`7rem`}
                    id="contentFilterSpinner3"
                    placeholder="Show"
                    rounded
                    showSelected
                    onSelected={(i) => {
                      handleUpdateNsfwSettings(
                        "group_sensitive",
                        ["Show", "Blur", "Block"][i] as
                          | "Show"
                          | "Blur"
                          | "Block"
                      );
                    }}
                    selectedIndex_={
                      userSettings.data?.data.nsfwGroups
                        ? ["Show", "Blur", "Block"].indexOf(
                            userSettings.data.data.nsfwGroups
                          )
                        : 0
                    }
                    defaultValue={userSettings.data?.data.nsfwGroups ?? "Show"}
                  />

                  <p className="mt-2">Filter Spam</p>
                  <p
                    className="text-sm text-lime-700"
                    style={{
                      overflowWrap: "anywhere",
                    }}
                  >
                    Choose how you would like to filter potential spam messages
                    to a <b>separate inbox. </b>
                    Currently only text filter is supported.
                  </p>

                  <div
                    onClick={() => handleSetSpamFilterMode("All")}
                    className={`flex w-full ${
                      userSettings.data?.data.spamFilterMode === "All"
                        ? "bg-lime-700"
                        : "bg-lime-600"
                    } md:h-[3.5rem] h-[4.5rem] rounded-md items-center transition hover:bg-lime-700 cursor-pointer group`}
                  >
                    <div className="rounded-s-md bg-red-500 w-[0.5rem] h-[4.5rem] md:h-[3.5rem] mr-2"></div>
                    <div className="flex flex-col">
                      <p className="text-lg">Filter all</p>
                      <p className="text-sm text-lime-400">
                        Filter all spam messages.
                      </p>
                    </div>
                    <div
                      className={`ml-auto my-auto mr-2 rounded-full cursor-pointer w-[1.5rem] h-[1.5rem] border-[0.35rem] bg-lime-500 border-lime-400 transition group-hover:bg-lime-600
                      ${
                        userSettings.data?.data.spamFilterMode === "All" &&
                        "bg-lime-600"
                      }`}
                    ></div>
                  </div>

                  <div
                    onClick={() => handleSetSpamFilterMode("Friends")}
                    className={`mt-2 flex w-full ${
                      userSettings.data?.data.spamFilterMode === "Friends"
                        ? "bg-lime-700"
                        : "bg-lime-600"
                    } h-[4.5rem] md:h-[3.5rem] rounded-md items-center transition hover:bg-lime-700 cursor-pointer group`}
                  >
                    <div className="rounded-s-md bg-lime-400 w-[0.5rem] h-[4.5rem] md:h-[3.5rem] mr-2"></div>
                    <div className="flex flex-col">
                      <p className="text-lg">Filter DM from friends</p>
                      <p className="text-sm text-lime-400">
                        Filter spam messages from DM, but only those from
                        friends.
                      </p>
                    </div>
                    <div
                      className={`ml-auto my-auto mr-2 rounded-full cursor-pointer w-[1.5rem] h-[1.5rem] border-[0.35rem] bg-lime-500 border-lime-400 transition group-hover:bg-lime-600
                      ${
                        userSettings.data?.data.spamFilterMode === "Friends" &&
                        "bg-lime-600"
                      }`}
                    ></div>
                  </div>

                  <div
                    onClick={() => handleSetSpamFilterMode("Others")}
                    className={`mt-2 flex w-full ${
                      userSettings.data?.data.spamFilterMode === "Others"
                        ? "bg-lime-700"
                        : "bg-lime-600"
                    } h-[4.5rem] md:h-[3.5rem] rounded-md items-center transition hover:bg-lime-700 cursor-pointer group`}
                  >
                    <div className="rounded-s-md bg-orange-500 w-[0.5rem] h-[4.5rem] md:h-[3.5rem] mr-2"></div>
                    <div className="flex flex-col">
                      <p className="text-lg">Filter DM from others</p>
                      <p className="text-sm text-lime-400">
                        Filter spam messages from DM, bt only those from others.
                      </p>
                    </div>
                    <div
                      className={`ml-auto my-auto mr-2 rounded-full cursor-pointer w-[1.5rem] h-[1.5rem] border-[0.35rem] bg-lime-500 border-lime-400 transition group-hover:bg-lime-600
                      ${
                        userSettings.data?.data.spamFilterMode === "Others" &&
                        "bg-lime-600"
                      }`}
                    ></div>
                  </div>

                  <div
                    onClick={() => handleSetSpamFilterMode("Groups")}
                    className={`mt-2 flex w-full ${
                      userSettings.data?.data.spamFilterMode === "Groups"
                        ? "bg-lime-700"
                        : "bg-lime-600"
                    } h-[4.5rem] md:h-[3.5rem] rounded-md items-center transition hover:bg-lime-700 cursor-pointer group`}
                  >
                    <div className="rounded-s-md bg-white w-[0.5rem] h-[4.5rem] md:h-[3.5rem] mr-2"></div>
                    <div className="flex flex-col">
                      <p className="text-lg">Filter group</p>
                      <p className="text-sm text-lime-400">
                        Filter spam messages from group chats.
                      </p>
                    </div>
                    <div
                      className={`ml-auto my-auto mr-2 rounded-full cursor-pointer w-[1.5rem] h-[1.5rem] border-[0.35rem] bg-lime-500 border-lime-400 transition group-hover:bg-lime-600
                      ${
                        userSettings.data?.data.spamFilterMode === "Groups" &&
                        "bg-lime-600"
                      }`}
                    ></div>
                  </div>

                  <div
                    onClick={() => handleSetSpamFilterMode("None")}
                    className={`mt-2 flex w-full ${
                      userSettings.data?.data.spamFilterMode === "None"
                        ? "bg-lime-700"
                        : "bg-lime-600"
                    } h-[4.5rem] md:h-[3.5rem] rounded-md items-center transition hover:bg-lime-700 cursor-pointer group`}
                  >
                    <div className="rounded-s-md bg-gray-500 w-[0.5rem] h-[4.5rem] md:h-[3.5rem] mr-2"></div>
                    <div className="flex flex-col">
                      <p className="text-lg">Filter none</p>
                      <p className="text-sm text-lime-400">
                        Do not filter spam messages.
                      </p>
                    </div>
                    <div
                      className={`ml-auto my-auto mr-2 rounded-full cursor-pointer w-[1.5rem] h-[1.5rem] border-[0.35rem] bg-lime-500 border-lime-400 transition group-hover:bg-lime-600
                      ${
                        userSettings.data?.data.spamFilterMode === "None" &&
                        "bg-lime-600"
                      }`}
                    ></div>
                  </div>

                  <p className="mt-2 text-lg">Social permissions</p>

                  <div className="flex mt-2">
                    <div className="flex flex-col">
                      <p>Discoverability & Direct Messages</p>
                      <p className="text-sm text-lime-700">
                        Allow DMs from non-friends. This will also toggle your
                        visibility in the conversation finder.
                      </p>
                    </div>
                    <div className="ml-auto">
                      <PrimarySwitch
                        isActive={
                          userSettings.data?.data.allowNonFriendsDM ?? true
                        }
                        onClick={(active) => {
                          handleUpdateAllowNonFriendsDM(active);
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex mt-2">
                    <div className="flex flex-col">
                      <p>Message Requests</p>
                      <p className="text-sm text-lime-700">
                        Filter DMs from those who you are not friends with into
                        separate category, which become visible only when there
                        is an unread message.{" "}
                      </p>
                    </div>
                    <div className="ml-auto">
                      <PrimarySwitch
                        isActive={
                          userSettings.data?.data.messageRequests ?? false
                        }
                        onClick={(active) => {
                          handleUpdateMessageRequests(active);
                        }}
                      />
                    </div>
                  </div>

                  <p className="mt-2 text-lg">Friend Requests</p>

                  <div className="flex mt-2">
                    {/*from here */}
                    <p>Everyone</p>

                    <div className="ml-auto">
                      <PrimarySwitch
                        isActive={
                          userSettings.data?.data.allowFriendRequestEveryone ??
                          true
                        }
                        onClick={(active) => {
                          handleUpdateFriendRequestEveryone(active);
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex mt-2">
                    <p>Friend of Friends</p>

                    <div className="ml-auto">
                      <PrimarySwitch
                        isActive={
                          userSettings.data?.data.allowFriendRequestFof ?? true
                        }
                        onClick={(active) => {
                          handleUpdateFriendRequestFof(active);
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex mt-2">
                    <p>Group Members</p>

                    <div className="ml-auto">
                      <PrimarySwitch
                        isActive={
                          userSettings.data?.data.allowFriendRequestGroup ??
                          true
                        }
                        onClick={(active) => {
                          handleUpdateFriendRequestGroup(active);
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
              {tab === "My Account" && (
                <div className="animate-fadeIn">
                  <p className="text-2xl font-bold mb-4">My Account</p>
                  <div className="w-full md:w-[50vw] h-fit rounded-md p-4 bg-lime-600">
                    <div className="flex gap-2 text-lg items-center">
                      <ProfileAvatar user={user} />{" "}
                      {user.nickname.length ? user.nickname : user.username}
                      {user.accountType === "ACCORD" ? (
                        <div className="ml-auto rounded-md px-2 text-sm bg-lime-700 gap-2 flex items-center">
                          <GiPeaceDove />
                          Accord
                        </div>
                      ) : (
                        <div className="ml-auto rounded-md px-2 text-sm bg-white text-black gap-2 flex items-center">
                          <FaGithub />
                          Github
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col bg-lime-700 rounded-md mt-2">
                      <div className="p-2 mt-2 flex items-center">
                        <div className="flex flex-col">
                          <p className="font-bold text-lime-500">
                            DISPLAY NAME
                          </p>
                          <p>{user.nickname.length ? user.nickname : "None"}</p>
                        </div>

                        <PrimaryButton
                          onclick={() => setTab("Profiles")}
                          customStyles="mt-0 bg-lime-500 ml-auto px-2"
                          customWidth="w-fit"
                        >
                          Edit
                        </PrimaryButton>
                      </div>

                      <div className="p-2 rounded-md bg-lime-700 flex items-center">
                        <div className="flex flex-col">
                          <p className="font-bold text-lime-500">USERNAME</p>
                          <p>{user.username}</p>
                        </div>

                        <PrimaryButton
                          onclick={() => setTab("Profiles")}
                          customStyles="mt-0 bg-lime-500 ml-auto px-2"
                          customWidth="w-fit"
                        >
                          Edit
                        </PrimaryButton>
                      </div>

                      <div className="p-2 rounded-md bg-lime-700 flex items-center">
                        <div className="flex flex-col">
                          <p className="font-bold text-lime-500">EMAIL</p>
                          <p>{user.email}</p>
                        </div>

                        <PrimaryButton
                          onclick={() => setTab("Profiles")}
                          customStyles="mt-0 bg-lime-500 ml-auto px-2"
                          customWidth="w-fit"
                        >
                          Edit
                        </PrimaryButton>
                      </div>

                      <div className="p-2 rounded-md bg-lime-700 flex items-center">
                        <div className="flex flex-col">
                          <p className="font-bold text-lime-500">BIRTHDAY</p>
                          <p>{format(user.birthDate, "yyyy, MMM do")}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {user.accountType === "ACCORD" && (
                    <div className="mt-4">
                      <p className="text-xl">Password and Authentication</p>
                      <PrimaryButton
                        customStyles="mt-2 bg-lime-600 px-2"
                        customWidth="w-fit"
                        onclick={handleOpenChangePasswordModal}
                      >
                        Change Password
                      </PrimaryButton>
                    </div>
                  )}
                </div>
              )}

              {tab === "Profiles" && (
                <form
                  className="flex flex-col animate-fadeIn"
                  action={handleEditProfile}
                >
                  <div className="flex items-center w-full">
                    {" "}
                    <FaEdit size={24} />{" "}
                    <p className="text-left font-bold text-2xl ml-4">
                      Edit Profile
                    </p>{" "}
                  </div>

                  <PrimaryInput
                    errorMessage={usernameError}
                    value_={usernameInput}
                    maxLength={30}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    description={
                      "Your username. Special characters CANNOT be used."
                    }
                    required={true}
                    customStyles="mt-2"
                    id="editProfileUsername"
                    type="text"
                    label="USERNAME"
                  />

                  <PrimaryInput
                    errorMessage={nicknameError}
                    value_={nicknameInput}
                    maxLength={30}
                    onChange={(e) => setNicknameInput(e.target.value)}
                    description={
                      "Your nickname displayed to other users. Special characters can be used."
                    }
                    required={false}
                    customStyles="mt-2"
                    id="editProfileNickname"
                    type="text"
                    label="NICKNAME"
                  />

                  <PrimaryInput
                    errorMessage={emailError}
                    value_={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    description={""}
                    required={true}
                    customStyles="mt-2"
                    id="editProfileEmail"
                    type="text"
                    label="EMAIL"
                  />

                  <PrimaryInput
                    errorMessage={statusMessageError}
                    maxLength={statusMessageCharacterLimit}
                    description={`Character Limit: ${statusMessageInput.length}/${statusMessageCharacterLimit} `}
                    value_={statusMessageInput}
                    onChange={(e) => setStatusMessageInput(e.target.value)}
                    required={false}
                    customStyles="mt-2"
                    id="editProfileStatusMessage"
                    type="text"
                    label="STATUS MESSAGE"
                  />

                  <p
                    className={`opacity-70 mt-2 ${
                      aboutMeError.length > 0 && "text-red-500"
                    }`}
                  >
                    ABOUT ME{" "}
                    {aboutMeError.length > 0 && (
                      <span className="text-red-500">- {aboutMeError}</span>
                    )}
                  </p>
                  <p className="text-sm text-lime-700">
                    You can use markdowns and links if you&apos;d like.
                  </p>

                  <div
                    className={`rounded-md border-2 ${
                      aboutMeError.length > 0
                        ? "animate-jiggle border-red-500"
                        : "animate-none border-transparent"
                    }`}
                  >
                    {currentUser.data?.data && (
                      <ChatInput
                        emojiSearchViewWidth={windowSize.width * 0.5}
                        emojiZIndex={105}
                        currentChatRoom={undefined}
                        currentUser={currentUser.data?.data}
                        showMoreButton={false}
                        absolutePosition={false}
                        showGifMenu={false}
                        setBoundText={setAboutMe}
                        focusOnMount={false}
                        underlineLinks={underlineLinks === "yes"}
                        previewSyntax={previewSyntax === "yes"}
                        customInitialText={
                          currentUserAboutMe.data?.data.length
                            ? currentUserAboutMe.data.data
                            : undefined
                        }
                      />
                    )}
                  </div>

                  <p
                    className={`ml-1 mt-2 ${
                      profileImageError ? "text-red-500" : "text-lime-200"
                    }`}
                  >
                    PROFILE IMAGE {profileImageError}
                  </p>

                  <div
                    className={`flex gap-2 mr-auto mt-1 rounded-full border-2 ${
                      profileImageError
                        ? "border-red-500 animate-jiggle"
                        : "border-transparent"
                    }`}
                  >
                    <FloatingButton
                      description={"Upload Image File"}
                      onClick={() => {
                        profileImageFileInputRef.current?.click();
                      }}
                    >
                      <div className="p-2">
                        <FaUpload size={24} />
                      </div>
                    </FloatingButton>
                    <FloatingButton
                      description={"Remove Profile Image"}
                      hoverColor="hover:text-red-500"
                      onClick={() => {
                        if (profileImageFileInputRef.current) {
                          profileImageFileInputRef.current.value = "";
                          profileImageFileInputRef.current.files = null;
                        }

                        setFileInput("default");
                      }}
                    >
                      <div className="p-2">
                        <MdOutlineDelete size={24} />
                      </div>
                    </FloatingButton>
                  </div>

                  <input
                    ref={profileImageFileInputRef}
                    accept="image/png, image/jpeg"
                    type="file"
                    id="editProfileImage"
                    name="editProfileImage"
                    className="hidden"
                    onChange={(e) => {
                      setProfileImageError("");

                      setTimeout(() => {
                        if (!e.target.files) return;

                        if (!e.target.files[0]) return;
                        if (e.target.files[0].size > 1048576) {
                          setProfileImageError("Image size exceeds 1MB");
                          return;
                        }

                        setFileInput(e.target.files);
                      }, 100);
                    }}
                  />

                  <p className="">PROFILE COLOR</p>

                  <div
                    className={`mt-2 relative ${
                      ((fileInput !== null && fileInput !== "default") ||
                        (fileInput === null && user.profileImageUrl)) &&
                      "opacity-50"
                    }`}
                  >
                    <HexColorPicker
                      color={profileColorInput}
                      onChange={setProfileColorInput}
                    />
                    <div
                      className={`absolute top-0 left-0 rounded-md cursor-not-allowed w-[13rem] h-[13rem] bg-transparent bg-opacity-50
                                                ${
                                                  (fileInput !== null &&
                                                    fileInput !== "default") ||
                                                  (fileInput === null &&
                                                    user.profileImageUrl)
                                                    ? "block"
                                                    : "hidden"
                                                }
                                                  `}
                    ></div>
                  </div>

                  {user && (
                    <div className="mt-5 ml-2 relative">
                      <Usercard
                        customMenuPosition="right-[1rem] md:right-[-0.5rem] bottom-[-3rem]"
                        user={{
                          ...user,
                          nickname: nicknameInput,
                          statusMessage: statusMessageInput,
                          profileColor: profileColorInput,
                          profileImageUrl: fileInput
                            ? ""
                            : user.profileImageUrl,
                        }}
                        profileImagePlaceholder={fileInput ?? undefined}
                      />
                    </div>
                  )}

                  <PrimaryButton
                    buttonType="submit"
                    customStyles="mt-5 bg-lime-600"
                    disabled={
                      !profileHasChange || editProfileMutation.isPending
                    }
                  >
                    SAVE CHANGES
                  </PrimaryButton>

                  {profileHasChange && (
                    <div className="flex items-center text-red-500">
                      {" "}
                      <BsExclamation size={24} />{" "}
                      <p className="ml-1"> There are unsaved changes</p>
                    </div>
                  )}
                  {!profileHasChange && (
                    <div className="flex items-center text-lime-600">
                      {" "}
                      <FcCheckmark size={24} />{" "}
                      <p className="ml-1"> Profile is up to date</p>
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : (
    <></>
  );
}
