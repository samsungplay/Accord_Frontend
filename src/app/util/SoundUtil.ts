import Constants from "../constants/Constants";
import { CustomWindow } from "../types/globals";
import GenericUtil from "./GenericUtil";

const cache: Map<string, HTMLAudioElement> = new Map();

declare let window: CustomWindow;

const shouldPlaySound = (source: string, channel?: string) => {
  if (channel === "preview") {
    return true;
  }
  const disableNs = localStorage.getItem("disableNs") ?? "no";

  if (disableNs === "yes") {
    return false;
  }
  const messageNs = localStorage.getItem("messageNs") ?? "yes";

  if (
    messageNs !== "yes" &&
    (source ===
      Constants.SERVER_STATIC_CONTENT_PATH + "standard_notification.ogg" ||
      source ===
        Constants.SERVER_STATIC_CONTENT_PATH + "emphasized_notification.ogg")
  ) {
    return false;
  }

  const deafenNs = localStorage.getItem("deafenNs") ?? "yes";

  if (
    deafenNs !== "yes" &&
    source === Constants.SERVER_STATIC_CONTENT_PATH + "deafen_sound.mp3"
  ) {
    return false;
  }

  const undeafenNs = localStorage.getItem("undeafenNs") ?? "yes";

  if (
    undeafenNs !== "yes" &&
    source === Constants.SERVER_STATIC_CONTENT_PATH + "undeafen_sound.mp3"
  ) {
    return false;
  }

  const muteNs = localStorage.getItem("muteNs") ?? "yes";

  if (
    muteNs !== "yes" &&
    source === Constants.SERVER_STATIC_CONTENT_PATH + "mute_sound.mp3"
  ) {
    return false;
  }

  const unmuteNs = localStorage.getItem("unmuteNs") ?? "yes";

  if (
    unmuteNs !== "yes" &&
    source === Constants.SERVER_STATIC_CONTENT_PATH + "unmute_sound.mp3"
  ) {
    return false;
  }

  const leaveCallNs = localStorage.getItem("leaveCallNs") ?? "yes";

  if (
    leaveCallNs !== "yes" &&
    source === Constants.SERVER_STATIC_CONTENT_PATH + "exit_sound.mp3"
  ) {
    return false;
  }

  const joinCallNs = localStorage.getItem("joinCallNs") ?? "yes";

  if (
    joinCallNs !== "yes" &&
    source === Constants.SERVER_STATIC_CONTENT_PATH + "enter_sound.mp3"
  ) {
    return false;
  }

  const callMelodyNs = localStorage.getItem("callMelodyNs") ?? "yes";

  if (
    callMelodyNs !== "yes" &&
    source === Constants.SERVER_STATIC_CONTENT_PATH + "calling_theme.mp3"
  ) {
    return false;
  }

  const streamStartNs = localStorage.getItem("streamStartNs") ?? "yes";

  if (
    streamStartNs !== "yes" &&
    source === Constants.SERVER_STATIC_CONTENT_PATH + "streaming_sound.mp3"
  ) {
    return false;
  }

  const streamEndNs = localStorage.getItem("streamEndNs") ?? "yes";

  if (
    streamEndNs !== "yes" &&
    source === Constants.SERVER_STATIC_CONTENT_PATH + "unstreaming_sound.mp3"
  ) {
    return false;
  }

  return true;
};

const playSoundForce = (source: string, channel?: string) => {
  if (!shouldPlaySound(source, channel)) {
    return;
  }
  const newAudio = new Audio(source);

  const handler = () => {
    newAudio.play();
    newAudio.removeEventListener("canplaythrough", handler);
  };

  const endHandler = () => {
    newAudio.removeEventListener("ended", endHandler);
  };

  newAudio.addEventListener("canplaythrough", handler);
  newAudio.addEventListener("ended", endHandler);
};

const stopSound = (source: string) => {
  const audio = cache.get(source);

  if (audio) {
    audio.pause();
    cache.delete(source);
  }
};
const playSoundOverwrite = (source: string, channel?: string) => {
  if (!shouldPlaySound(source, channel)) {
    return;
  }
  const audio = cache.get(source);
  if (audio) {
    audio.pause();
  }
  const newAudio = new Audio(source);

  if (channel === "sound") {
    newAudio.volume = (window.sbVolumeScale ?? 100.0) / 100.0;
  }

  const canPlayThroughHandler = () => {
    newAudio.play().catch(() => {
      cache.delete(source);
    });
    newAudio.removeEventListener("canplaythrough", canPlayThroughHandler);
  };
  const endedHandler = () => {
    cache.delete(source);
    newAudio.removeEventListener("ended", endedHandler);
  };

  newAudio.addEventListener("canplaythrough", canPlayThroughHandler);
  newAudio.addEventListener("ended", endedHandler);
  cache.set(source, newAudio);
};

const playSoundIfEnd = (source: string, channel?: string) => {
  if (!shouldPlaySound(source, channel)) {
    return;
  }
  const audio = cache.get(source);
  if (audio) {
    return;
  }
  const newAudio = new Audio(source);

  const canPlayThroughHandler = () => {
    newAudio.play().catch(() => {
      cache.delete(source);
    });
    newAudio.removeEventListener("canplaythrough", canPlayThroughHandler);
  };
  const endedHandler = () => {
    cache.delete(source);
    newAudio.removeEventListener("ended", endedHandler);
  };

  newAudio.addEventListener("canplaythrough", canPlayThroughHandler);
  newAudio.addEventListener("ended", endedHandler);

  cache.set(source, newAudio);
};

let silentTick = 0;
const monitorSoundActivity = (
  mediaStream: MediaStream,
  mediaElement: HTMLMediaElement,
  onSoundActivityChange: (hasSound: boolean) => void,
  onLongSilence?: (silent: boolean) => void
) => {
  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(mediaStream);

  const analyzer = audioContext.createAnalyser();

  analyzer.fftSize = 512;
  analyzer.smoothingTimeConstant = 0.8;
  source.connect(analyzer);
  let lastHasSound = false;

  const checkSoundActivity = () => {
    if (!document.body.contains(mediaElement)) {
      if (window.speakers === undefined) {
        window.speakers = new Set();
      }
      window.speakers.delete(mediaElement.id);
      if (audioContext.state !== "closed") {
        audioContext.close();
      }
      return;
    }
    const dataArray = new Uint8Array(analyzer.frequencyBinCount);
    analyzer.getByteFrequencyData(dataArray);

    const avgFrequency =
      dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    // console.log("testing: ", avgFrequency, audioContext.state);

    const hasSound = avgFrequency > 0;

    if (!hasSound && mediaElement.id === "localAudioStream") {
      silentTick += 1;
      if (silentTick === 50) {
        if (onLongSilence) {
          onLongSilence(true);
        }
      }
    } else if (hasSound && mediaElement.id === "localAudioStream") {
      if (onLongSilence && silentTick > 0) {
        onLongSilence(false);
      }
      silentTick = 0;
    }
    if (hasSound !== lastHasSound) {
      onSoundActivityChange(hasSound);

      if (!mediaElement.muted && mediaElement.id !== "localAudioStream") {
        if (hasSound) {
          const lastSpeakersCount = (window.speakers ?? new Set()).size;
          //handle stream attenuation
          if (window.speakers === undefined) {
            window.speakers = new Set();
          }
          window.speakers.add(mediaElement.id);

          if (lastSpeakersCount === 0 && window.speakers.size >= 1) {
            //at least 1 person speaking; apply stream attenuation

            GenericUtil.applyStreamAttenuation(true);
          }
        } else {
          const lastSpeakersCount = (window.speakers ?? new Set()).size;
          if (window.speakers === undefined) {
            window.speakers = new Set();
          }
          window.speakers.delete(mediaElement.id);
          if (lastSpeakersCount > 0 && window.speakers.size === 0) {
            //no one is speaking; unapply stream attenuation
            GenericUtil.applyStreamAttenuation(false);
          }
        }
      }
    }

    lastHasSound = hasSound;
    setTimeout(checkSoundActivity, 100);
  };

  setTimeout(checkSoundActivity, 50);
};

const SoundUtil = {
  playSoundIfEnd,
  playSoundOverwrite,
  playSoundForce,
  stopSound,
  monitorSoundActivity,
};

export default SoundUtil;
