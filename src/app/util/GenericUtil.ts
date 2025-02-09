import { Editor, Element, Text } from "slate";
import api from "../api/api";
import { ChatRecordType } from "../types/ChatRecordType";
import { ChatRoom } from "../types/ChatRoom";
import { CustomWindow } from "../types/globals";
import { User } from "../types/User";
import Constants from "../constants/Constants";
import { CustomText } from "../types/Editor";
import { UserSettings } from "../types/UserSettings";

declare let window: CustomWindow;
export interface PreprocessedMediaStreamTrack extends MediaStreamTrack {
  voiceActivity?: number;
  customLabel?: string;
}

const remToPx = (rem: number) => {
  return rem * parseFloat(getComputedStyle(document.documentElement).fontSize);
};

const isStaticContentAvailable = async (url: string) => {
  try {
    const response = await api.head(url);
    return response.status.toString().startsWith("20");
  } catch (error) {
    console.error("Error checking static content availability:", error);
    return false;
  }
};
const createPlaceholderTrack = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unknown error ocurred - Please try again!");
  }
  context.fillStyle = "black";
  context.fillRect(0, 0, 1, 1);
  const stream = canvas.captureStream();
  const placeholderTrack = stream.getVideoTracks()[0];
  return placeholderTrack;
};

const createPlaceholderAudioTrack = () => {
  const audioContext = new AudioContext();
  const oscillator = audioContext.createOscillator();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(0, audioContext.currentTime);
  const gainNode = audioContext.createGain();
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  oscillator.connect(gainNode);
  const destination = audioContext.createMediaStreamDestination();
  gainNode.connect(destination);
  oscillator.start();
  const placeholderAudioTrack = destination.stream.getAudioTracks()[0];
  const originalStop = placeholderAudioTrack.stop.bind(placeholderAudioTrack);
  placeholderAudioTrack.stop = () => {
    originalStop();

    oscillator.stop();
    oscillator.disconnect();
    gainNode.disconnect();

    if (audioContext.state !== "closed")
      audioContext.close().catch((err) => {
        console.warn("error closing AudioContext:", err);
      });
  };

  return placeholderAudioTrack;
};

const createPreprocessedAudioStream = (stream: MediaStream) => {
  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  const gainNode = audioContext.createGain();
  source.connect(gainNode);
  const destination = audioContext.createMediaStreamDestination();
  const analyzer = audioContext.createAnalyser();
  analyzer.fftSize = 512;
  analyzer.smoothingTimeConstant = 0.8;
  source.connect(analyzer);

  const maskNode = audioContext.createGain();
  gainNode.connect(maskNode);
  maskNode.connect(destination);

  const processedTrack =
    destination.stream.getAudioTracks()[0] as PreprocessedMediaStreamTrack;

  let timeout: NodeJS.Timeout | null = null;

  const checkVoiceActivity = () => {
    const dataArray = new Uint8Array(analyzer.frequencyBinCount);
    analyzer.getByteFrequencyData(dataArray);

    const avgFrequency =
      dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;

    processedTrack.voiceActivity = avgFrequency;

    const frequencyThreshold =
      (255 * (window.inputSensitivityScale ?? 10.0)) / 100.0;

    gainNode.gain.value = (window.inputVolumeScale ?? 100.0) / 100.0;
    if (window.inputMode === "Voice Activity") {
      if (avgFrequency < frequencyThreshold) {
        maskNode.gain.value = 0;
      } else {
        maskNode.gain.value = 1;
      }
    } else if (window.inputMode === "Push to Talk") {
      if (window.shouldMaskAudioStream) {
        maskNode.gain.value = 0;
        processedTrack.voiceActivity = 0;
      } else {
        maskNode.gain.value = 1;
      }
    }

    timeout = setTimeout(checkVoiceActivity, 50);
  };

  checkVoiceActivity();

  const originalStop = processedTrack.stop.bind(processedTrack);
  processedTrack.stop = () => {
    originalStop();
    gainNode.disconnect();
    if (audioContext.state !== "closed") audioContext.close();
    if (timeout) clearTimeout(timeout);
    console.log("destination stream memory cleaned up.");
  };

  processedTrack.customLabel = stream.getAudioTracks()[0].label;

  //copy video track, if there were only
  if (stream.getVideoTracks().length > 0) {
    destination.stream.addTrack(stream.getVideoTracks()[0]);
  }
  return destination.stream;
};

const createPlaceholderRecord = (
  message: string,
  user: User
): ChatRecordType => {
  return {
    id: 0,
    type: "text",
    message: message,
    date: new Date(),
    sender: user,
    edited: false,
    chatReactions: [],
    pinned: false,
    pollVotes: [],
  };
};

const createPlaceholderChatRoom = (): ChatRoom => {
  return {
    id: 0,
    name: "name",
    participants: [],
    direct1to1Identifier: null,
    ownerId: 0,
    notificationCount: 0,
    latestMessageId: 0,
    sounds: [],
    backgrounds: [],
  };
};

const parseMarkdownText = (editor: Editor) => {
  let text = "";

  const rootList = editor.children as Element[];
  rootList.forEach((node, i) => {
    if (node.type === "paragraph") {
      for (const child of node.children) {
        if (Text.isText(child)) {
          const convertEmoticon =
            localStorage.getItem("convertEmoticon") ?? "yes";
          if (convertEmoticon === "yes") {
            //automatically convert emoticon text to emoji if needed
            text += child.text.replace(Constants.emoticonRe, (match) => {
              return (
                (Constants.emoticonConvertMap as { [key: string]: string })[
                  match
                ] ?? match
              );
            });
          } else {
            text += child.text;
          }
        } else if (child.type === "mention") {
          text += "[m]" + (child.children[0] as CustomText).text + "[m]";
        }
      }
      if (i !== rootList.length - 1) {
        text += "\n";
      }
    } else if (node.type === "codeblock") {
      if (i !== rootList.length - 1)
        text += "'''" + (node.children[0] as CustomText).text + "'''" + "\n";
      else text += "'''" + (node.children[0] as CustomText).text + "'''";
    } else if (node.type === "blockquote") {
      if (i !== rootList.length - 1)
        text += "> " + (node.children[0] as CustomText).text + "\n";
      else text += "> " + (node.children[0] as CustomText).text;
    }
  });

  return text;
};

const monitorPreview = (
  stream: MediaStream,
  chatRoomId: number,
  type: "video" | "screen"
) => {
  if ((localStorage.getItem("previewStream") ?? "true") !== "true") {
    console.log("aborting preview capture process since it is disabled.");
    return;
  }
  const video = document.createElement("video");
  video.srcObject = stream;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  let captureInterval: NodeJS.Timeout | null = null;
  video.play().then(() => {
    console.log("initialize preview capture process");
    const handleCapture = () => {
      if (context) {
        const aspectRatio = video.videoWidth / video.videoHeight;
        if (video.videoWidth > 1280) {
          canvas.width = 1280;
          canvas.height = 1280.0 / aspectRatio;
        } else {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const formData = new FormData();
        formData.set("chatRoomId", chatRoomId.toString());
        formData.set("type", type);

        let quality = 1.0;

        const blobHandler: BlobCallback = (blob) => {
          if (!blob) {
            console.error(
              "failed to convert preview frame canvas to image file."
            );
            captureInterval = setTimeout(handleCapture, 5000);
            return;
          }

          if (blob.size > 5 * 1024 * 1024 && quality > 0.1) {
            console.log("preview stream frame too large; attempt downscale.");
            quality -= 0.1;
            canvas.toBlob(blobHandler, "image/webp", quality);
            return;
          } else if (blob.size > 5 * 1024 * 1024 && quality <= 0.1) {
            console.error(
              "unexpected error : failed to convert preview frame canvas to image file. Aborting process."
            );
            return;
          }

          formData.set("file", blob);
          api
            .post(`/call/streamPreview`, formData, {
              headers: {
                "Content-Type": "multipart/form-data",
              },
            })
            .then((res) => {
              if (res.status !== 200) {
                console.error("failed to send preview frame canvas to server.");
              }
              //  else console.log("captured preview frame & sent");

              captureInterval = setTimeout(handleCapture, 5000);
            });
        };

        canvas.toBlob(blobHandler, "image/jpeg", quality);
      }
    };
    captureInterval = setTimeout(handleCapture, 500);
  });

  const originalStop = stream
    .getVideoTracks()[0]
    .stop.bind(stream.getVideoTracks()[0]);

  stream.getVideoTracks()[0].stop = () => {
    originalStop();
    if (captureInterval) {
      clearTimeout(captureInterval);
    }
    video.pause();
    video.src = "";
    video.srcObject = null;
    video.load();
    console.log("preview frame capture stopped");
  };
};

const applyStreamAttenuation = (apply: boolean) => {
  if ((window.streamAttenuation ?? "yes") !== "yes") {
    return;
  }

  const streamAttenuationStrength = window.attenuationStrength ?? 50.0;

  const activeAudioChannel = document.getElementById("activeAudioChannel");

  if (activeAudioChannel) {
    for (const audioElement of activeAudioChannel.children) {
      if (
        audioElement.id.includes("userSystemAudioStream") &&
        audioElement instanceof HTMLAudioElement
      ) {
        const className = audioElement.className;
        const userId = parseInt(className.split("-")[1]);
        const volumeLevel = parseFloat(
          localStorage.getItem("accord_systemVolume_" + userId) ?? "1.0"
        );

        if (apply) {
          audioElement.volume =
            (1.0 - streamAttenuationStrength / 100.0) * volumeLevel;
        } else {
          audioElement.volume = volumeLevel;
        }
      }
    }
  }
};

function isTouchDevice() {
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia("(pointer: coarse)").matches
  );
}
async function checkMediaType(url: string) {
  const isImage = await new Promise<boolean>((resolve) => {
    const image = new Image();

    image.src = url;
    image.onload = () => {
      resolve(true);
    };
    image.onerror = () => {
      resolve(false);
    };
  });

  if (isImage) return "image";

  const isVideo = await new Promise<boolean>((resolve) => {
    const video = document.createElement("video");

    video.src = url;
    video.onloadedmetadata = () => {
      const width = video.videoWidth;
      const height = video.videoHeight;
      if (video.src.length) {
        video.src = "";
        video.load();
      }

      resolve(width > 3 && height > 3);
    };
    video.onerror = () => {
      resolve(false);
    };
  });

  if (isVideo) return "video";

  const isAudio = await new Promise<boolean>((resolve) => {
    const audio = new Audio();

    audio.src = url;
    audio.onloadedmetadata = () => {
      if (audio.src.length) {
        audio.src = "";
        audio.load();
      }
      resolve(true);
    };
    audio.onerror = () => {
      resolve(false);
    };
  });

  if (isAudio) return "audio";

  return "invalid";
}

//start from here
const computeChatRoomName = (chatRoom: ChatRoom, currentUser: User) => {
  if (chatRoom.id === -1) return "Spams";
  if (!chatRoom.direct1to1Identifier?.length) {
    return chatRoom.name;
  } else {
    if (chatRoom.participants.length <= 1) {
      return "Inactive DM";
    } else {
      const otherUser = chatRoom.participants.find(
        (e) => e.id !== currentUser.id
      );
      return otherUser
        ? "@" +
            (otherUser.nickname.length
              ? otherUser.nickname
              : otherUser.username)
        : "Inactive DM";
    }
  }
};

const checkRoomPermission = (
  chatRoom: ChatRoom,
  currentUserId: number,
  targetUserIds: number[] | undefined,
  roleSetting: "all" | "mod" | "owner" | undefined
) => {
  const isOwner = chatRoom.ownerId === currentUserId;
  const isModerator =
    chatRoom.modIds?.length && chatRoom.modIds.includes(currentUserId);

  if (roleSetting === "owner" && !isOwner) {
    return false;
  }
  if (roleSetting === "mod" && !isModerator && !isOwner) {
    return false;
  }

  if (targetUserIds) {
    for (const id of targetUserIds) {
      const isTargetOwner = chatRoom.ownerId === id;
      const isTargetModerator =
        chatRoom.modIds?.length && chatRoom.modIds.includes(id);
      if (isTargetOwner && !isOwner) {
        return false;
      }
      if (isTargetModerator && !isOwner && !isModerator) {
        return false;
      }
    }
  }
  return true;
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = atob(base64);
  return new Uint8Array([...rawData].map((char) => char.charCodeAt(0)));
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;

  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return window.btoa(binary); // Base64 encoding
}

const synchronizeUserSettings = (userSettings: UserSettings) => {
  if (
    userSettings.nsfwDmFriends !==
    (localStorage.getItem("dm_friends_sensitive") ?? "Show")
  ) {
    localStorage.setItem("dm_friends_sensitive", userSettings.nsfwDmFriends);
  }
  if (
    userSettings.nsfwDmOthers !==
    (localStorage.getItem("dm_others_sensitive") ?? "Show")
  ) {
    localStorage.setItem("dm_others_sensitive", userSettings.nsfwDmOthers);
  }
  if (
    userSettings.nsfwGroups !==
    (localStorage.getItem("group_sensitive") ?? "Show")
  ) {
    localStorage.setItem("group_sensitive", userSettings.nsfwGroups);
  }

  if (
    userSettings.spamFilterMode !==
    (localStorage.getItem("filterSpamMode") ?? "None")
  ) {
    localStorage.setItem("filterSpamMode", userSettings.spamFilterMode);
  }

  if (
    userSettings.displaySpoiler !==
    (localStorage.getItem("displaySpoiler") ?? "click")
  ) {
    localStorage.setItem("displaySpoiler", userSettings.displaySpoiler);
  }

  if (
    userSettings.messageRequests.toString() !==
    (localStorage.getItem("messageRequests") ?? "false")
  ) {
    localStorage.setItem(
      "messageRequests",
      userSettings.messageRequests.toString()
    );
  }

  if (
    userSettings.doNotification.toString() !==
    (localStorage.getItem("doNotification") ?? "true")
  ) {
    localStorage.setItem(
      "doNotification",
      userSettings.doNotification.toString()
    );
  }

  if (
    userSettings.canPreviewStream.toString() !==
    (localStorage.getItem("previewStream") ?? "true")
  ) {
    localStorage.setItem(
      "previewStream",
      userSettings.canPreviewStream.toString()
    );
  }
};
const GenericUtil = {
  remToPx,
  urlBase64ToUint8Array,
  arrayBufferToBase64,

  createPlaceholderTrack,
  synchronizeUserSettings,

  createPlaceholderAudioTrack,
  createPlaceholderRecord,
  createPlaceholderChatRoom,
  createPreprocessedAudioStream,
  isStaticContentAvailable,
  monitorPreview,
  applyStreamAttenuation,
  checkMediaType,
  computeChatRoomName,
  checkRoomPermission,
  parseMarkdownText,
  isTouchDevice,
};

export default GenericUtil;
