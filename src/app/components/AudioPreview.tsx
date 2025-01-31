import React, { Dispatch, SetStateAction, useContext, useEffect } from "react";
import {
  MouseEventHandler,
  useCallback,
  useDeferredValue,
  useMemo,
  useRef,
  useState,
} from "react";

import { MdAudiotrack } from "react-icons/md";
import { FaPause, FaPlay } from "react-icons/fa";
import {
  IoVolumeHigh,
  IoVolumeLow,
  IoVolumeMedium,
  IoVolumeMute,
} from "react-icons/io5";
import { Popover } from "react-tiny-popover";
import { Duration, intervalToDuration } from "date-fns";

import DraggableProgressbar from "./DraggableProgressbar";
import ReactDOM from "react-dom";
import CallContext from "../contexts/CallContext";
import ContentDisplayContext from "../contexts/ContentDisplayContext";

type AudioPreviewType = {
  src: string;
  uuid: string;
  customTextColor?: string;
  autoPlay?: "simple" | "withevent";
  targetRenderElement?: HTMLDivElement;
  customOnPlayPauseHandler?: (paused: boolean, currentTime: number) => void;
  customOnSeekHandler?: (currentTime: number) => void;
  setAudioRemoteController?: Dispatch<SetStateAction<HTMLAudioElement | null>>;
  hideWhenNoTargetElement?: boolean;
  loop?: boolean;
  allLoop?: boolean;
  srcList?: string[];
  customOnLoadedMetadata?: () => void;
};
export default function AudioPreview({
  src,
  uuid,
  customTextColor = "text-white",
  autoPlay,
  targetRenderElement,
  customOnPlayPauseHandler,
  customOnSeekHandler,
  loop = false,
  setAudioRemoteController,
  hideWhenNoTargetElement,
  allLoop = false,
  srcList = [],
  customOnLoadedMetadata,
}: AudioPreviewType) {
  //features: play/pause button progress bar volume bar show time running and when hover on the seek bar show the time to be seeked
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [paused, setPaused] = useState(true);
  const [seekProgress, setSeekProgress] = useState(0.0);
  const seekProgressDeferred = useDeferredValue(seekProgress);
  const [seekHoverOpen, setSeekHoverOpen] = useState(false);
  const [mouseX, setMouseX] = useState(0);
  const [duration, setDuration] = useState(-1);
  const [shouldExitAnimation, setShouldExitAnimation] = useState(false);
  const [shouldVCExitAnimation, setShouldVCExitAnimation] = useState(false);
  const mouseXDeferred = useDeferredValue(mouseX);
  const isDragging = useRef<boolean>(false);
  const [volumeProgress, setVolumeProgress] = useState(50);
  const [volumeControlOpen, setVolumeControlOpen] = useState(false);
  const volumeControlOpenTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastVolumeProgress = useRef<number>(50);
  const [playButtonClickEffect, setPlayButtonClickEffect] = useState(false);
  const [volumeButtonClickEffect, setVolumeButtonClickEffect] = useState(false);

  const callContext = useContext(CallContext);
  const contentDisplayContext = useContext(ContentDisplayContext);
  const durationRef = useRef<number>(-1);

  const autoPlayRef = useRef<undefined | "simple" | "withevent">(undefined);
  const loopRef = useRef<boolean>(false);
  const allLoopRef = useRef<boolean>(false);
  const srcListRef = useRef<string[]>([]);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  useEffect(() => {
    autoPlayRef.current = autoPlay;
  }, [autoPlay]);

  useEffect(() => {
    loopRef.current = loop;
    if (audioRef.current) {
      audioRef.current.loop = loop;
    }
  }, [loop]);

  useEffect(() => {
    allLoopRef.current = allLoop;
  }, [allLoop]);

  useEffect(() => {
    srcListRef.current = srcList;
  }, [srcList]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio(src);
    const onTimeUpdate = (e: Event) => {
      handleProgress(e);
    };
    const onLoadedMetadata = (e: Event) => {
      if (e.currentTarget instanceof HTMLAudioElement) {
        setDuration(e.currentTarget.duration);
      }

      if (customOnLoadedMetadata) customOnLoadedMetadata();
    };
    const onPlay = () => {
      setPaused(false);
    };
    const onPause = () => {
      setPaused(true);
    };

    const onEnded = () => {
      console.log(
        "on end invoked:",
        loopRef.current,
        audioRef.current?.loop,
        allLoopRef.current
      );
      if (srcListRef.current.length === 0) {
        return;
      }
      if (loopRef.current) {
        return;
      }

      //depending on allLoop value, either automatically move to the next song or stop the current song
      const i = srcListRef.current.indexOf(src);
      let nextI = i + 1;

      if (
        (nextI !== -1 && nextI <= srcListRef.current.length - 1) ||
        allLoopRef.current
      ) {
        if (nextI > srcListRef.current.length - 1) nextI = 0;
        let moved = false;
        contentDisplayContext?.setRootMusicPlayerOptions((prev) => {
          if (prev) {
            moved = true;
            return {
              ...prev,
              autoPlay: "simple",
              src: srcListRef.current[nextI],
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
        contentDisplayContext?.setRootMusicPlayerOptions(null);
      }
    };
    audio.autoplay = autoPlayRef.current !== undefined;
    audio.loop = loopRef.current;

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    audioRef.current = audio;

    if (customOnPlayPauseHandler && autoPlayRef.current === "withevent") {
      customOnPlayPauseHandler(false, 0);
    }

    if (setAudioRemoteController) setAudioRemoteController(audio);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      if (setAudioRemoteController) {
        setAudioRemoteController(null);
      }

      audioRef.current = null;
    };
  }, [src, setAudioRemoteController]);

  const formattedToString = useCallback((formatted: Duration) => {
    const items = [];
    if (formatted.hours) {
      items.push(formatted.hours.toString());
    }
    if (formatted.minutes) {
      items.push(String(formatted.minutes).padStart(2, "0"));
    } else {
      items.push("00");
    }
    if (formatted.seconds) {
      items.push(String(formatted.seconds).padStart(2, "0"));
    } else {
      items.push("00");
    }

    return items.join(":");
  }, []);

  const formattedDuration = useMemo(() => {
    if (duration !== -1) {
      const formatted = intervalToDuration({ start: 0, end: duration * 1000 });

      return formattedToString(formatted);
    } else {
      return "loading...";
    }
  }, [duration]);

  const formattedCurrentSeekTime = useMemo(() => {
    const seekBar = document.getElementById("seekbar_" + uuid);
    if (seekBar) {
      const formatted = intervalToDuration({
        start: 0,
        end:
          duration *
          1000 *
          (mouseXDeferred / seekBar.getBoundingClientRect().width),
      });
      return formattedToString(formatted);
    } else return "loading...";
  }, [duration, mouseXDeferred]);

  const formattedCurrentTime = useMemo(() => {
    if (duration !== -1 && audioRef.current) {
      const formatted = intervalToDuration({
        start: 0,
        end: seekProgressDeferred * 0.01 * duration * 1000,
      });

      return formattedToString(formatted);
    } else {
      return "loading...";
    }
  }, [seekProgressDeferred, duration]);

  const handleClickSeekbar: MouseEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      const seekBar = document.getElementById("seekbar_" + uuid);

      if (!seekBar) return;
      let progress = e.pageX - seekBar.getBoundingClientRect().x;

      if (progress > seekBar.getBoundingClientRect().width)
        progress = seekBar.getBoundingClientRect().width;
      else if (progress < 0) progress = 0;

      if (seekBar) {
        const targetTime = Math.round(
          duration * (progress / seekBar.getBoundingClientRect().width)
        );

        if (audioRef.current) {
          audioRef.current.currentTime = targetTime;
          let progress = (targetTime / duration) * 100;

          if (progress > 100) progress = 100;
          else if (progress < 0) progress = 0;

          setSeekProgress(progress);
        }
      }

      if (customOnSeekHandler && audioRef.current) {
        customOnSeekHandler(audioRef.current.currentTime);
      }
    },
    [duration, paused, customOnSeekHandler]
  );

  const handleDragSeekbar: MouseEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      const seekBar = document.getElementById("seekbar_" + uuid);
      isDragging.current = true;
      if (seekBar) {
        const targetTime =
          duration *
          ((e.pageX - seekBar.getBoundingClientRect().x) /
            seekBar.getBoundingClientRect().width);

        let progress = (targetTime / duration) * 100;

        if (progress > 100) progress = 100;
        else if (progress < 0) progress = 0;

        setSeekProgress(progress);
        setSeekHoverOpen(true);
      }
    },
    [duration]
  );

  const handleDragSeekbarEnd: MouseEventHandler<HTMLDivElement> =
    useCallback(() => {
      const seekBar = document.getElementById("seekbar_" + uuid);

      if (seekBar && audioRef.current) {
        const targetTime = Math.round(
          duration * (mouseX / seekBar.getBoundingClientRect().width)
        );

        let progress = (targetTime / duration) * 100;

        if (progress > 100) progress = 100;
        else if (progress < 0) progress = 0;

        setSeekProgress(progress);
        setSeekHoverOpen(false);

        audioRef.current.currentTime = targetTime;
        isDragging.current = false;
      }
      if (customOnSeekHandler && audioRef.current) {
        customOnSeekHandler(audioRef.current.currentTime);
      }
    }, [duration, mouseX, customOnSeekHandler]);

  const handlePlayPause = useCallback(() => {
    if (audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play();
        if (customOnPlayPauseHandler && audioRef.current)
          customOnPlayPauseHandler(false, audioRef.current.currentTime);
        setPaused(false);
      } else {
        audioRef.current.pause();
        if (customOnPlayPauseHandler && audioRef.current)
          customOnPlayPauseHandler(true, audioRef.current.currentTime);
        setPaused(true);
      }
    }
  }, [customOnPlayPauseHandler]);

  const handleProgress = useCallback((e: Event) => {
    if (!isDragging.current && e.currentTarget instanceof HTMLAudioElement) {
      setSeekProgress(
        (e.currentTarget.currentTime / durationRef.current) * 100
      );
    }
  }, []);

  const handleProgressHover: MouseEventHandler<HTMLDivElement> = (e) => {
    if (e.pageX === 0) return;
    const seekBar = document.getElementById("seekbar_" + uuid);

    if (!seekBar) return;

    let progress = e.pageX - seekBar.getBoundingClientRect().x;

    if (progress > seekBar.getBoundingClientRect().width)
      progress = seekBar.getBoundingClientRect().width;
    else if (progress < 0) progress = 0;

    setMouseX(progress);
  };

  const handleVolumeDrag: MouseEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      const volumeBar = document.getElementById("volumebar_" + uuid);
      if (volumeBar && audioRef.current) {
        const position =
          (volumeBar.getBoundingClientRect().height -
            (e.pageY - volumeBar.getBoundingClientRect().y)) /
          volumeBar.getBoundingClientRect().height;

        setVolumeProgress(Math.max(0, Math.min(position, 1)) * 100);

        audioRef.current.volume = Math.max(0, Math.min(position, 1));
      }
    },
    []
  );

  const handleVolumeMuteToggle = useCallback(() => {
    if (!audioRef.current) return;
    if (volumeProgress > 0) {
      lastVolumeProgress.current = volumeProgress;
      setVolumeProgress(0);
      audioRef.current.volume = 0;
    } else {
      setVolumeProgress(lastVolumeProgress.current);
      audioRef.current.volume = lastVolumeProgress.current / 100;
    }
  }, [volumeProgress]);

  const content = (
    <div className="bg-transparent flex items-center gap-2 w-full">
      <MdAudiotrack size={36} />
      <div className="rounded-full grid place-content-center h-[2rem] w-[2rem] bg-lime-700 cursor-pointer group/audioplayer transition hover:bg-opacity-70 shadow-md p-2">
        <div
          onClick={(e) => {
            e.stopPropagation();
            handlePlayPause();
          }}
          onMouseDown={() => {
            setPlayButtonClickEffect(true);
          }}
          onMouseUp={() => {
            setPlayButtonClickEffect(false);
          }}
          style={{
            marginTop: playButtonClickEffect ? "0.1rem" : "0",
          }}
          className="scale-90 group-hover/audioplayer:scale-100 transition"
        >
          {paused ? <FaPlay size={16} /> : <FaPause size={16} />}
        </div>
      </div>

      <p className={`${customTextColor} text-sm sm:inline hidden`}>
        {formattedCurrentTime}/{formattedDuration}
      </p>

      <Popover
        positions={["top"]}
        content={
          <div
            className={`origin-left ${
              shouldExitAnimation
                ? "animate-popInCentered"
                : "animate-popOutCentered"
            } translate-x-[-50%] text-white bg-lime-500 rounded-md shadow-md px-2 mb-2 text-sm searchResultsOverlay`}
          >
            {formattedCurrentSeekTime}
          </div>
        }
        isOpen={seekHoverOpen}
        align="start"
        transformMode="relative"
        transform={{
          top: 0,
          left: mouseXDeferred,
        }}
        containerStyle={{
          zIndex: "30",
        }}
      >
        <div className="w-full">
          <DraggableProgressbar
            id={"seekbar_" + uuid}
            onMouseDown={handleClickSeekbar}
            onMouseMove={handleProgressHover}
            onMouseEnter={() => setSeekHoverOpen(true)}
            onMouseLeave={() => {
              setShouldExitAnimation(true);
              setTimeout(() => {
                setSeekHoverOpen(false);
                setShouldExitAnimation(false);
              }, 100);
            }}
            progress={seekProgressDeferred}
            onDrag={(e) => {
              handleDragSeekbar(e);
              handleProgressHover(e);
            }}
            onDragEnd={handleDragSeekbarEnd}
          />
        </div>
      </Popover>

      <Popover
        positions={["top"]}
        isOpen={volumeControlOpen}
        reposition={false}
        content={
          <div
            onMouseEnter={() => {
              if (volumeControlOpenTimerRef.current) {
                clearTimeout(volumeControlOpenTimerRef.current);
              }
              setVolumeControlOpen(true);
            }}
            onMouseLeave={() => {
              volumeControlOpenTimerRef.current = setTimeout(() => {
                setShouldVCExitAnimation(true);
                setTimeout(() => {
                  setVolumeControlOpen(false);
                  setShouldVCExitAnimation(false);
                }, 300);
              }, 100);
            }}
            className={`${
              shouldVCExitAnimation
                ? "animate-volumeControllerDisappear"
                : "animate-volumeControllerAppear"
            } w-[5rem] h-[2rem] soundPicker -rotate-90 flex items-center p-1 mb-[2rem] bg-lime-600 rounded-md shadow-md searchResultsOverlay`}
          >
            <DraggableProgressbar
              id={"volumebar_" + uuid}
              progress={volumeProgress}
              onDrag={handleVolumeDrag}
              onMouseDown={handleVolumeDrag}
              height={"0.45rem"}
              dragPointSize={"0.75rem"}
              dragPointHalfSize={"0.375rem"}
            />
          </div>
        }
        containerStyle={{
          zIndex: "30",
        }}
      >
        <div
          onMouseEnter={() => {
            if (volumeControlOpenTimerRef.current) {
              clearTimeout(volumeControlOpenTimerRef.current);
            }
            setVolumeControlOpen(true);
          }}
          onMouseLeave={() => {
            volumeControlOpenTimerRef.current = setTimeout(() => {
              setShouldVCExitAnimation(true);
              setTimeout(() => {
                setVolumeControlOpen(false);
                setShouldVCExitAnimation(false);
              }, 300);
            }, 100);
          }}
          className="h-[2rem] w-[2rem] grid place-content-center rounded-full bg-lime-700 cursor-pointer group/audioplayer transition hover:bg-opacity-70 shadow-md p-2"
        >
          <div
            onMouseDown={() => setVolumeButtonClickEffect(true)}
            onMouseUp={() => setVolumeButtonClickEffect(false)}
            onClick={(e) => {
              e.stopPropagation();
              handleVolumeMuteToggle();
            }}
            style={{
              marginTop: volumeButtonClickEffect ? "0.1rem" : "0",
            }}
            className="scale-90 group-hover/audioplayer:scale-100 transition"
          >
            {volumeProgress < 1 ? (
              <IoVolumeMute size={20} />
            ) : volumeProgress < 40 ? (
              <IoVolumeLow size={20} />
            ) : volumeProgress < 70 ? (
              <IoVolumeMedium size={20} />
            ) : (
              <IoVolumeHigh size={20} />
            )}
          </div>
        </div>
      </Popover>
    </div>
  );
  return targetRenderElement ? (
    ReactDOM.createPortal(content, targetRenderElement)
  ) : (
    <div className={hideWhenNoTargetElement ? "hidden" : ""}>{content}</div>
  );
}
