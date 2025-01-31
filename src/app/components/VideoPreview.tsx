import { Duration, intervalToDuration } from "date-fns";
import {
  MouseEvent,
  MouseEventHandler,
  ReactEventHandler,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FaPause, FaPlay } from "react-icons/fa";
import {
  IoVolumeHigh,
  IoVolumeLow,
  IoVolumeMedium,
  IoVolumeMute,
} from "react-icons/io5";
import { MdFullscreen, MdFullscreenExit, MdVideocam } from "react-icons/md";
import { Popover } from "react-tiny-popover";
import DraggableProgressbar from "./DraggableProgressbar";
import React from "react";

type VideoPreviewType = {
  src: string;
  uuid: string;
  customOnLoadedMetadata?: () => void;
};
export default function VideoPreview({
  src,
  uuid,
  customOnLoadedMetadata,
}: VideoPreviewType) {
  //features: play/pause button progress bar volume bar show time running and when hover on the seek bar show the time to be seeked
  const audioRef = useRef<HTMLVideoElement>(null);

  const [paused, setPaused] = useState(true);
  const [seekProgress, setSeekProgress] = useState(0.0);
  const seekProgressDeferred = useDeferredValue(seekProgress);
  const [seekHoverOpen, setSeekHoverOpen] = useState(false);
  const [mouseX, setMouseX] = useState(0);
  const [duration, setDuration] = useState(-1);
  const [shouldExitAnimation, setShouldExitAnimation] = useState(false);
  const [shouldVCExitAnimation, setShouldVCExitAnimation] = useState(false);
  const [videoControlsExitAnimation, setVideoControlsExitAnimation] =
    useState(false);
  const [showVideoControls, setShowVideoControls] = useState(false);
  const mouseXDeferred = useDeferredValue(mouseX);
  const isDragging = useRef<boolean>(false);
  const [volumeProgress, setVolumeProgress] = useState(50);
  const [volumeControlOpen, setVolumeControlOpen] = useState(false);
  const volumeControlOpenTimerRef = useRef<NodeJS.Timeout | null>(null);
  const videoControlTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastVolumeProgress = useRef<number>(50);
  const [playButtonClickEffect, setPlayButtonClickEffect] = useState(false);
  const [volumeButtonClickEffect, setVolumeButtonClickEffect] = useState(false);
  const [fullScreenButtonClickEffect, setFullScreenButtonClickEffect] =
    useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [rootRef, setRootRef] = useState<HTMLDivElement | null>(null);
  const [clickedVideo, setClickedVideo] = useState(false);

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
      if (paused) {
        handlePlayPause();
      }
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
    },
    [duration]
  );

  const handleDragSeekbar = useCallback(
    (e: MouseEvent | React.Touch) => {
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

      if (paused) {
        handlePlayPause();
      }

      if (seekBar && audioRef.current) {
        const targetTime = Math.round(
          duration * (mouseX / seekBar.getBoundingClientRect().width)
        );

        let progress = (targetTime / duration) * 100;

        if (progress > 100) progress = 100;
        else if (progress < 0) progress = 0;

        setSeekProgress(progress);

        audioRef.current.currentTime = targetTime;
        isDragging.current = false;

        setSeekHoverOpen(false);
      }
    }, [duration, mouseX]);

  const handlePlayPause = useCallback(() => {
    if (audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play();
        setPaused(false);
      } else {
        audioRef.current.pause();
        setPaused(true);
      }
    }
  }, []);

  const handleProgress: ReactEventHandler<HTMLAudioElement> = useCallback(
    (e) => {
      if (!isDragging.current) {
        setSeekProgress((e.currentTarget.currentTime / duration) * 100);
      }
    },
    [duration]
  );

  const handleProgressHover = (e: React.MouseEvent | React.Touch) => {
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

  const handleFullscreenToggle = useCallback(() => {
    if (!rootRef) return;
    if (fullscreen) {
      document.exitFullscreen();
    } else {
      rootRef.requestFullscreen();
    }

    setFullscreen(!fullscreen);
  }, [fullscreen, rootRef]);

  useEffect(() => {
    const interval = setInterval(() => {
      setFullscreen(document.fullscreenElement !== null);
    }, 100);

    const onLoadedMetadata = () => {
      if (customOnLoadedMetadata) {
        customOnLoadedMetadata();
      }
    };

    if (audioRef.current) {
      audioRef.current.addEventListener("loadedmetadata", onLoadedMetadata);
    }

    return () => {
      clearInterval(interval);
      if (audioRef.current) {
        audioRef.current.removeEventListener(
          "loadedmetadata",
          onLoadedMetadata
        );
      }
    };
  }, []);

  return (
    <div
      ref={setRootRef}
      className="w-full h-full flex flex-col relative justify-center"
      onMouseMove={() => {
        if (videoControlTimerRef.current) {
          clearTimeout(videoControlTimerRef.current);
        }
        if (!showVideoControls) setShowVideoControls(true);

        videoControlTimerRef.current = setTimeout(() => {
          setVideoControlsExitAnimation(true);
          setTimeout(() => {
            setShowVideoControls(false);
            setVideoControlsExitAnimation(false);
          }, 300);
        }, 3000);
      }}
      onTouchMove={() => {
        if (videoControlTimerRef.current) {
          clearTimeout(videoControlTimerRef.current);
        }
        if (!showVideoControls) setShowVideoControls(true);

        videoControlTimerRef.current = setTimeout(() => {
          setVideoControlsExitAnimation(true);
          setTimeout(() => {
            setShowVideoControls(false);
            setVideoControlsExitAnimation(false);
          }, 300);
        }, 3000);
      }}
    >
      {paused && clickedVideo && (
        <div
          className="bg-lime-300 rounded-full p-4 animate-[ping_1s_ease-in-out_forwards] bg-opacity-50 absolute"
          style={{
            top: "calc(50% - 2rem)",
            left: "calc(50% - 2rem)",
          }}
        >
          <div className="sm:hidden">
            <FaPause size={16} />
          </div>
          <div className="hidden sm:block lg:hidden">
            <FaPause size={24} />
          </div>
          <div className="hidden lg:block">
            <FaPause size={32} />
          </div>
        </div>
      )}
      {!paused && clickedVideo && (
        <div
          className="bg-lime-300 rounded-full p-4 animate-[ping_1s_ease-in-out_forwards] bg-opacity-50 absolute"
          style={{
            top: "calc(50% - 2rem)",
            left: "calc(50% - 2rem)",
          }}
        >
          <div className="sm:hidden">
            <FaPlay size={16} />
          </div>
          <div className="hidden sm:block lg:hidden">
            <FaPlay size={24} />
          </div>
          <div className="hidden lg:block">
            <FaPlay size={32} />
          </div>
        </div>
      )}

      <video
        ref={audioRef}
        onClick={() => {
          setClickedVideo(true);
          handlePlayPause();
        }}
        onTimeUpdate={handleProgress}
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration);
        }}
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
        autoPlay={false}
        className="w-full rounded-md h-auto"
        src={src}
      ></video>
      <div
        className={`${
          videoControlsExitAnimation ? "animate-fadeOut" : "animate-fadeIn"
        } ${
          showVideoControls ? "flex" : "hidden"
        } bg-lime-500 rounded-md bottom-[0rem] h-[2.5rem] p-2 bg-opacity-40 absolute items-center gap-2 w-full`}
      >
        <MdVideocam size={36} />
        <div className="rounded-full grid place-content-center h-[2rem] w-[2rem] bg-lime-700 cursor-pointer group/audioplayer transition hover:bg-opacity-70 shadow-md p-2">
          <div
            onClick={() => handlePlayPause()}
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

        <p className="text-white text-sm sm:inline hidden">
          {formattedCurrentTime}/{formattedDuration}
        </p>

        <Popover
          parentElement={rootRef ?? document.body}
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
          parentElement={rootRef ?? document.body}
          positions={["top"]}
          isOpen={volumeControlOpen}
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
              } w-[5rem] h-[2rem] -rotate-90 flex items-center p-1 mb-[2rem] bg-lime-600 rounded-md shadow-md searchResultsOverlay`}
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
            zIndex: "50",
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
              onClick={() => handleVolumeMuteToggle()}
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

        <div className="rounded-full grid place-content-center h-[2rem] w-[2rem] bg-lime-700 cursor-pointer group/audioplayer transition hover:bg-opacity-70 shadow-md p-2">
          <div
            onClick={() => handleFullscreenToggle()}
            onMouseDown={() => {
              setFullScreenButtonClickEffect(true);
            }}
            onMouseUp={() => {
              setFullScreenButtonClickEffect(false);
            }}
            style={{
              marginTop: fullScreenButtonClickEffect ? "0.1rem" : "0",
            }}
            className="scale-90 group-hover/audioplayer:scale-100 transition"
          >
            {!fullscreen ? (
              <MdFullscreen size={16} />
            ) : (
              <MdFullscreenExit size={16} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
