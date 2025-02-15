import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { User } from "../types/User";
import ProfileAvatar from "./ProfileAvatar";
import CallContext from "../contexts/CallContext";
import { useWindowSize } from "usehooks-ts";
import {
  MdFullscreen,
  MdFullscreenExit,
  MdInfo,
  MdPreview,
  MdScreenShare,
  MdStopScreenShare,
  MdVideocamOff,
  MdWarning,
} from "react-icons/md";
import {
  RiPictureInPicture2Fill,
  RiPictureInPictureExitFill,
} from "react-icons/ri";
import { IoMdVideocam } from "react-icons/io";
import RightClickMenuWrapper from "./RightClickMenuWrapper";
import { ChatRoom } from "../types/ChatRoom";
import Usercard from "./Usercard";
import FloatingButton from "./FloatingButton";
import { PuffLoader } from "react-spinners";
import { GiSoundOff, GiSoundOn } from "react-icons/gi";
import EmojiBubble from "./EmojiBubble";
import AnimateHeight from "react-animate-height";
import Constants from "../constants/Constants";
import ModalUtils from "../util/ModalUtil";
import ModalContext from "../contexts/ModalContext";
import { FaDisplay } from "react-icons/fa6";
import useIsLightMode from "../hooks/useIsLightMode";

type VideoCallDisplayType = {
  data: MediaStream | undefined;
  user: User;
  currentUser?: User;
  width: string;
  customClassName?: string;
  hiddenModeParam?: boolean;
  handleKickFromCall?: (user: User) => void;
  currentChatRoom?: ChatRoom;
  zIndex?: number;
  emojiBubbleShortCode?: string;
  setEmojiBubbleShortCode?: Dispatch<
    SetStateAction<{ [userId: number]: string }>
  >;
  isVideoPreview?: boolean;
  showKickUserFromCallButton?: boolean;
};

export default function VideoCallDisplay({
  user,
  data,
  width,
  customClassName = "",
  hiddenModeParam = false,
  currentUser,
  handleKickFromCall,
  currentChatRoom,
  zIndex = 10,
  emojiBubbleShortCode,
  setEmojiBubbleShortCode,
  isVideoPreview = false,
  showKickUserFromCallButton = false,
}: VideoCallDisplayType) {
  const callContext = useContext(CallContext);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [secondaryVideoRef, setSecondaryVideoRef] =
    useState<HTMLVideoElement | null>(null);
  const windowSize = useWindowSize();
  const primaryStreamRef = useRef<MediaStream | null>(null);
  const secondaryStreamRef = useRef<MediaStream | null>(null);
  const manualFireLoadedDataTimeout = useRef<NodeJS.Timeout | null>(null);
  const viewSwappedRef = useRef<boolean>(false);
  const [codecUnsupported, setCodecUnsupported] = useState(false);

  const singleOnLoadedData = useCallback((e: Event) => {
    if (e.target instanceof HTMLVideoElement && e.target.videoWidth > 5) {
      if (manualFireLoadedDataTimeout.current) {
        clearTimeout(manualFireLoadedDataTimeout.current);
      }
      setAllVideosLoaded(2);
      e.target.removeEventListener("loadeddata", singleOnLoadedData);
    }
  }, []);

  const doubleOnLoadedData = useCallback((e: Event) => {
    if (e.target instanceof HTMLVideoElement && e.target.videoWidth > 5) {
      if (manualFireLoadedDataTimeout.current) {
        clearTimeout(manualFireLoadedDataTimeout.current);
      }
      setAllVideosLoaded((prev) => prev + 1);
      e.target.removeEventListener("loadeddata", doubleOnLoadedData);
    }
  }, []);

  useEffect(() => {
    if (
      data &&
      callContext &&
      videoRef.current &&
      data.getVideoTracks().length === 2
    ) {
      if (manualFireLoadedDataTimeout.current) {
        clearTimeout(manualFireLoadedDataTimeout.current);
      }
      setAllVideosLoaded(0);
      setViewSwapped(false);
      const primaryStream = new MediaStream();
      const secondaryStream = new MediaStream();
      primaryStream.addTrack(data.getVideoTracks()[0]);
      secondaryStream.addTrack(data.getVideoTracks()[1]);
      primaryStreamRef.current = primaryStream;
      secondaryStreamRef.current = secondaryStream;
      const screenShareEnabled =
        user.isScreenShareEnabled !== "no" &&
        !callContext.disabledVideoStreams.has("screen@" + user.id);
      const videoEnabled =
        (user.isVideoEnabled &&
          !callContext.disabledVideoStreams.has("camera@" + user.id)) ||
        isVideoPreview;

      if (screenShareEnabled && !videoEnabled) {
        videoRef.current.srcObject = secondaryStream;
        videoRef.current.addEventListener("loadeddata", singleOnLoadedData);
        manualFireLoadedDataTimeout.current = setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.dispatchEvent(new Event("loadeddata"));
          }
        }, 3000);
      } else if (videoEnabled && !screenShareEnabled) {
        videoRef.current.srcObject = primaryStream;

        videoRef.current.addEventListener("loadeddata", singleOnLoadedData);
        manualFireLoadedDataTimeout.current = setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.dispatchEvent(new Event("loadeddata"));
          }
        }, 3000);
      } else if (secondaryVideoRef && screenShareEnabled && videoEnabled) {
        videoRef.current.srcObject = primaryStream;
        secondaryVideoRef.srcObject = secondaryStream;
        videoRef.current.addEventListener("loadeddata", doubleOnLoadedData);
        secondaryVideoRef.addEventListener("loadeddata", doubleOnLoadedData);
        manualFireLoadedDataTimeout.current = setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.dispatchEvent(new Event("loadeddata"));
          }
          if (secondaryVideoRef) {
            secondaryVideoRef.dispatchEvent(new Event("loadeddata"));
          }
        }, 3000);
      }
    }
    return () => {
      if (videoRef.current) {
        videoRef.current.removeEventListener("loadeddata", singleOnLoadedData);
        videoRef.current.removeEventListener("loadeddata", doubleOnLoadedData);
      }
      if (secondaryVideoRef) {
        secondaryVideoRef.removeEventListener("loadeddata", singleOnLoadedData);
        secondaryVideoRef.removeEventListener("loadeddata", doubleOnLoadedData);
      }
      if (manualFireLoadedDataTimeout.current) {
        clearTimeout(manualFireLoadedDataTimeout.current);
      }
    };
  }, [
    data,
    secondaryVideoRef,
    user.isScreenShareEnabled,
    user.isVideoEnabled,
    user.id,
    callContext?.disabledVideoStreams,
  ]);
  const [mediaWidth, setMediaWidth] = useState(1000);
  const [fullScreen, setFullScreen] = useState(false);
  const [overlayFullscreen, setOverlayFullscreen] = useState(false);
  const [metrics, setMetrics] = useState<{
    width: number;
    height: number;
    fps: number;
    codec: string;
  }>({
    width: 0,
    height: 0,
    fps: -1,
    codec: "",
  });

  const [pip, setPip] = useState(false);

  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const frameHeartbeat = useRef<NodeJS.Timeout | null>(null);
  const hasFrameIncoming = useRef<boolean>(false);

  useEffect(() => {
    console.log(user.id, windowSize.width);
    setMediaWidth(windowSize.width);
  }, [windowSize.width]);

  useEffect(() => {
    if (user.isScreenShareEnabled !== "no") {
      setShowDetails(true);
    } else {
      setShowDetails(false);
    }

    if (user.isVideoEnabled && user.isScreenShareEnabled) {
      setShowDetails(false);
    }
  }, [user.isScreenShareEnabled, user.isVideoEnabled]);

  useEffect(() => {
    const interval = setInterval(() => {
      setFullScreen(
        document.fullscreenElement !== null &&
          document.fullscreenElement.id !== "overlayContainer"
      );
      setOverlayFullscreen(
        document.fullscreenElement !== null &&
          document.fullscreenElement.id === "overlayContainer"
      );
    }, 100);

    let lastMediaTime = 0;
    let lastFrameRun = 0;
    let fps = -1;
    let codec = "";
    let getCodecInfoTimeout: NodeJS.Timeout | null = null;
    const fpsRounder: number[] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const computeFps = (now: DOMHighResTimeStamp, metadata: any) => {
      if (videoRef.current) {
        if (frameHeartbeat.current) {
          clearTimeout(frameHeartbeat.current);
        }
        hasFrameIncoming.current = true;
        frameHeartbeat.current = setTimeout(() => {
          hasFrameIncoming.current = false;
        }, 2000);
        const mediaTimeDifference = Math.abs(
          metadata.mediaTime - lastMediaTime
        );
        const frameNumDiff = Math.abs(metadata.presentedFrames - lastFrameRun);
        const secondsPerFrame = mediaTimeDifference / frameNumDiff;
        if (fpsRounder.length < 3) {
          fpsRounder.push(secondsPerFrame);
        } else if (fpsRounder.length >= 3) {
          fpsRounder.push(secondsPerFrame);
          fpsRounder.shift();
          fps = Math.round(
            1 / (fpsRounder.reduce((a, b) => a + b) / fpsRounder.length)
          );
        }

        lastMediaTime = metadata.mediaTime;
        lastFrameRun = metadata.presentedFrames;

        fpsComputer = videoRef.current.requestVideoFrameCallback(computeFps);
      } else {
        fps = -5;
      }
    };

    let fpsComputer: number | undefined = undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (videoRef.current) {
              if (fpsComputer)
                videoRef.current.cancelVideoFrameCallback(fpsComputer);
              fpsComputer =
                videoRef.current.requestVideoFrameCallback(computeFps);

              if (videoRef.current.paused) videoRef.current.play();
            }
          } else {
            if (fpsComputer) {
              videoRef.current?.cancelVideoFrameCallback(fpsComputer);
            }
          }
        });
      },
      {
        root: null,
        rootMargin: "0px",
        threshold: 0.1,
      }
    );

    const containerElement = document.getElementById(
      "videoCallDisplay-" + user.id
    );

    if (containerElement) {
      observer.observe(containerElement);
    }
    const getCodecInfo = () => {
      let codecSet = false;
      if (data && data.getVideoTracks().length === 0) {
        setCodecUnsupported(true);
      } else {
        setCodecUnsupported(false);
      }
      if (callContext?.peerConnection.current && data) {
        callContext.peerConnection.current
          .getTransceivers()
          .forEach((transceiver) => {
            if (
              !codecSet &&
              transceiver.sender &&
              transceiver.sender.track?.kind === "video" &&
              ((!viewSwappedRef.current &&
                transceiver.sender.track.id === data.getVideoTracks()[0].id) ||
                (viewSwappedRef.current &&
                  transceiver.sender.track.id === data.getVideoTracks()[1].id))
            ) {
              const codecParams = transceiver.sender.getParameters();

              if (codecParams.codecs.length) {
                codec = codecParams.codecs[0].mimeType.split("/")[1];
                codecSet = true;
              }
            }
          });
      }

      if (!codecSet && callContext?.subscriptionConnection.current && data) {
        callContext.subscriptionConnection.current
          .getTransceivers()
          .forEach((transceiver) => {
            if (
              !codecSet &&
              transceiver.receiver &&
              transceiver.receiver.track?.kind === "video" &&
              ((!viewSwappedRef.current &&
                transceiver.receiver.track.id ===
                  data.getVideoTracks()[0].id) ||
                (viewSwappedRef.current &&
                  transceiver.receiver.track.id ===
                    data.getVideoTracks()[1].id))
            ) {
              const codecParams = transceiver.receiver.getParameters();

              if (codecParams.codecs.length) {
                codec = codecParams.codecs[0].mimeType.split("/")[1];

                codecSet = true;
              }
            }
          });
      }

      if (!codecSet) {
        codec = "?";
      }
      getCodecInfoTimeout = setTimeout(getCodecInfo, 1000);
    };

    getCodecInfoTimeout = setTimeout(getCodecInfo, 100);

    const monitorMetricsInterval = setInterval(() => {
      if (videoRef.current && hasFrameIncoming.current) {
        setMetrics({
          width: videoRef.current.videoWidth,
          height: videoRef.current.videoHeight,
          fps: fps,
          codec: codec,
        });
      } else {
        setMetrics({
          width: -5,
          height: -5,
          fps: -5,
          codec: codec,
        });
      }
    }, 500);

    return () => {
      observer.disconnect();
      clearInterval(interval);
      clearInterval(monitorMetricsInterval);
      if (frameHeartbeat.current) {
        clearTimeout(frameHeartbeat.current);
      }
      if (getCodecInfoTimeout) {
        clearTimeout(getCodecInfoTimeout);
      }
      hasFrameIncoming.current = false;
      if (fpsComputer && videoRef.current)
        videoRef.current.cancelVideoFrameCallback(fpsComputer);
    };
  }, [data, user.isVideoEnabled, user.isScreenShareEnabled]);

  const [displayWarning, setDisplayWarning] = useState(false);
  const [displayDisabled, setDisplayDisabled] = useState(false);
  const [allVideosLoaded, setAllVideosLoaded] = useState(0);
  const [focused, setFocused] = useState(false);

  const warningTimeout = useRef<NodeJS.Timeout | null>(null);
  const modalContext = useContext(ModalContext);
  const handleOpenPreview = useCallback(() => {
    ModalUtils.openGenericModal(
      modalContext,
      "",
      "",
      () => {},
      <div className="flex flex-col md:flex-row items-center overflow-y-scroll max-h-[80vh] gap-2">
        {user.isVideoEnabled && (
          <div className="flex flex-col gap-2">
            <div className="mt-2 flex text-lg justify-center items-center gap-2">
              <IoMdVideocam />
              Video
            </div>

            <div className="rounded-md">
              <img
                src={
                  Constants.SERVER_STATIC_CONTENT_PATH +
                  "streamPreview_video_" +
                  user.id +
                  "_" +
                  currentChatRoom?.id +
                  ".webp"
                }
                className="w-full h-auto rounded-md"
              />
            </div>
          </div>
        )}

        {user.isScreenShareEnabled !== "no" && (
          <div className="flex flex-col gap-2">
            <div className="mt-2 flex text-lg justify-center items-center gap-2">
              <FaDisplay />
              Screen
            </div>
            <div className="rounded-md">
              <img
                src={
                  Constants.SERVER_STATIC_CONTENT_PATH +
                  "streamPreview_screen_" +
                  user.id +
                  "_" +
                  currentChatRoom?.id +
                  ".webp"
                }
                className="w-full h-auto rounded-md"
              />
            </div>
          </div>
        )}
      </div>,
      undefined,
      <div className="flex justify-center text-xl font-bold items-center gap-2">
        <MdPreview />
        Previewing {user.nickname.length ? user.nickname : user.username}&apos;s
        stream
      </div>,
      true
    );
  }, [
    user.id,
    currentChatRoom?.id,
    user.isScreenShareEnabled,
    user.isVideoEnabled,
  ]);

  const hiddenMode = useMemo(() => {
    if (hiddenModeParam) {
      if (warningTimeout.current) {
        clearTimeout(warningTimeout.current);
      }
      setDisplayDisabled(false);
      setDisplayWarning(false);
      return true;
    }

    // hide video if the video is disabled by the user
    if (
      (callContext &&
        callContext.disabledVideoStreams.has("camera@" + user.id) &&
        user.isVideoEnabled &&
        user.isScreenShareEnabled === "no") ||
      (callContext &&
        callContext.disabledVideoStreams.has("screen@" + user.id) &&
        !user.isVideoEnabled &&
        user.isScreenShareEnabled !== "no") ||
      (callContext &&
        callContext.disabledVideoStreams.has("screen@" + user.id) &&
        callContext.disabledVideoStreams.has("camera@" + user.id))
    ) {
      if (warningTimeout.current) {
        clearTimeout(warningTimeout.current);
      }
      setDisplayWarning(false);
      setDisplayDisabled(true);
      return true;
    }

    if (allVideosLoaded < 2) {
      if (warningTimeout.current) {
        clearTimeout(warningTimeout.current);
      }
      setDisplayWarning(true);
      setDisplayDisabled(false);
      return true;
    }

    if (metrics.fps < 1) {
      warningTimeout.current = setTimeout(() => {
        setDisplayWarning(true);
        setDisplayDisabled(false);
      }, 1000);
    } else {
      if (warningTimeout.current) clearTimeout(warningTimeout.current);
      setDisplayWarning(false);
      setDisplayDisabled(false);
    }
    return metrics.fps === -5;
  }, [
    hiddenModeParam,
    metrics.fps,
    allVideosLoaded,
    user.isScreenShareEnabled,
    user.isVideoEnabled,
  ]);

  const [viewSwapped, setViewSwapped] = useState(false);

  useEffect(() => {
    viewSwappedRef.current = viewSwapped;
  }, [viewSwapped]);

  const handleSwapView = useCallback(() => {
    if (
      videoRef.current &&
      secondaryVideoRef &&
      primaryStreamRef.current &&
      secondaryStreamRef.current &&
      !viewSwapped
    ) {
      setAllVideosLoaded(0);
      videoRef.current.srcObject = secondaryStreamRef.current;
      secondaryVideoRef.srcObject = primaryStreamRef.current;
      setViewSwapped(true);
      videoRef.current.removeEventListener("loadeddata", doubleOnLoadedData);
      secondaryVideoRef.removeEventListener("loadeddata", doubleOnLoadedData);
      videoRef.current.addEventListener("loadeddata", doubleOnLoadedData);
      secondaryVideoRef.addEventListener("loadeddata", doubleOnLoadedData);
    } else if (
      videoRef.current &&
      secondaryVideoRef &&
      primaryStreamRef.current &&
      secondaryStreamRef.current
    ) {
      setAllVideosLoaded(0);
      videoRef.current.srcObject = primaryStreamRef.current;
      secondaryVideoRef.srcObject = secondaryStreamRef.current;
      setViewSwapped(false);
      videoRef.current.removeEventListener("loadeddata", doubleOnLoadedData);
      secondaryVideoRef.removeEventListener("loadeddata", doubleOnLoadedData);
      videoRef.current.addEventListener("loadeddata", doubleOnLoadedData);
      secondaryVideoRef.addEventListener("loadeddata", doubleOnLoadedData);
    }
  }, [secondaryVideoRef, viewSwapped]);

  const [primaryVideoInverted, setPrimaryVideoInverted] = useState(false);
  const [secondaryVideoInverted, setSecondaryVideoInverted] = useState(false);

  //invert self-video
  useEffect(() => {
    if (!currentUser || user.id !== currentUser.id) {
      return;
    }
    if (user.isVideoEnabled) {
      if (user.isScreenShareEnabled !== "no") {
        if (viewSwapped) {
          setPrimaryVideoInverted(false);
          setSecondaryVideoInverted(true);
        } else {
          setPrimaryVideoInverted(true);
          setSecondaryVideoInverted(false);
        }
      } else {
        setPrimaryVideoInverted(true);
        setSecondaryVideoInverted(false);
      }
    } else {
      setPrimaryVideoInverted(false);
      setSecondaryVideoInverted(false);
    }
  }, [
    user.isVideoEnabled,
    user.isScreenShareEnabled,
    currentUser?.id,
    viewSwapped,
  ]);

  const isLightMode = useIsLightMode();
  return (
    <div
      onClick={() => {
        setFocused((prev) => !prev);
      }}
      id={"videoCallDisplay-" + user.id}
      ref={setContainerRef}
      className={`${customClassName} ${
        (displayWarning || displayDisabled) &&
        callContext?.callDecorator[user.id] === "sound"
          ? "border-white"
          : "border-transparent"
      } transition-all flex ${
        hiddenMode
          ? `${
              displayWarning
                ? "bg-orange-500"
                : displayDisabled
                ? "bg-gray-500"
                : "bg-lime-600"
            } animate-[fadeIn_1s_ease-in-out_forwards] rounded-md ${
              overlayFullscreen ? "h-[55vh]" : "h-[28vh]"
            }`
          : `${
              overlayFullscreen ? "h-auto max-h-[55vh]" : "h-[28vh]"
            } bg-lime-600 rounded-md`
      } items-center justify-center relative border-2`}
      style={{
        width: focused
          ? "100%"
          : mediaWidth < 640
          ? "100%"
          : mediaWidth < 768
          ? Math.max(
              Number.parseInt(width.substring(0, width.indexOf("%"))),
              50
            ) + "%"
          : width,

        zIndex: zIndex,
      }}
    >
      <RightClickMenuWrapper
        menu={
          currentUser && currentChatRoom && handleKickFromCall ? (
            <Usercard
              user={user}
              customBackgroundStyle="bg-lime-500"
              showKickUserFromCallButton={showKickUserFromCallButton}
              handleKickFromCall={handleKickFromCall}
              showCallControls
            />
          ) : (
            <></>
          )
        }
      >
        <div className="absolute bottom-[50%] left-[50%]">
          <EmojiBubble
            userIdKey={currentUser?.id}
            shortCodes={
              emojiBubbleShortCode
                ? emojiBubbleShortCode.substring(
                    emojiBubbleShortCode.indexOf("::") + 2
                  )
                : undefined
            }
            setShortCodes={setEmojiBubbleShortCode}
            duration={Number(
              (emojiBubbleShortCode ?? "1000::").split("::")[0] ?? 1000
            )}
          />
        </div>
        {!hiddenMode ? (
          <div
            className={`${
              viewSwapped ? "animate-fadeIn" : "animate-fadeIn"
            } absolute flex items-center justify-center ${
              user.isVideoEnabled && user.isScreenShareEnabled !== "no"
                ? "bottom-0 left-0"
                : "bottom-0 right-0"
            } m-[0.5rem] gap-1 z-[10]`}
          >
            <ProfileAvatar
              customAnimation="animate-fadeIn"
              user={user}
              showMute={user.isCallMuted}
              showDeafen={user.isDeafened}
              size={32}
            />
            <div
              className={`${
                viewSwapped ? "animate-fadeIn" : "animate-fadeIn"
              } ${
                user.isScreenShareEnabled !== "no" &&
                !callContext?.disabledAudioStreams.has("system@" + user.id)
                  ? "bg-red-500"
                  : callContext?.disabledAudioStreams.has("system@" + user.id)
                  ? "bg-gray-500"
                  : "bg-black"
              } bg-opacity-50 px-1 rounded-md text-sm flex items-center gap-1`}
            >
              {user.isVideoEnabled &&
                user.isScreenShareEnabled === "no" &&
                (user.nickname.length > 0 ? user.nickname : user.username)}

              {user.isScreenShareEnabled !== "no" && "LIVE"}
              {user.isScreenShareEnabled === "withaudio" &&
              !callContext?.disabledAudioStreams.has("system@" + user.id) ? (
                <GiSoundOn />
              ) : user.isScreenShareEnabled === "screenonly" ||
                callContext?.disabledAudioStreams.has("system@" + user.id) ? (
                <GiSoundOff />
              ) : (
                <></>
              )}
            </div>
          </div>
        ) : (
          <div
            className={`${
              viewSwapped ? "animate-fadeIn" : "animate-fadeIn"
            } absolute w-full h-full grid place-content-center z-10 opacity-0 gap-2`}
          >
            <div className="flex flex-col items-center justify-center gap-2">
              <ProfileAvatar
                user={user}
                showMute={user.isCallMuted}
                showDeafen={user.isDeafened}
                size={32}
                customAnimation="animate-fadeIn"
              />
              <div className="flex gap-1 items-center text-lime-300">
                {user.isVideoEnabled && displayWarning ? (
                  <PuffLoader
                    size={16}
                    speedMultiplier={1.0}
                    color={isLightMode ? "rgb(101,163,13)" : "rgb(190,242,100)"}
                  />
                ) : user.isVideoEnabled && displayDisabled ? (
                  <MdVideocamOff size={16} />
                ) : user.isVideoEnabled ? (
                  <IoMdVideocam size={16} />
                ) : (
                  <></>
                )}

                {user.isScreenShareEnabled !== "no" && displayDisabled ? (
                  <MdStopScreenShare size={16} />
                ) : user.isScreenShareEnabled !== "no" ? (
                  <MdScreenShare size={16} />
                ) : (
                  <></>
                )}

                <div className="animate-fadeIn bg-black bg-opacity-50 px-1 rounded-md text-sm">
                  {user.nickname.length > 0 ? user.nickname : user.username}
                </div>

                {user.canPreviewStream && (
                  <FloatingButton
                    description="Preview"
                    backgroundColor="bg-transparent"
                    customTextColor="text-lime-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenPreview();
                    }}
                  >
                    <MdPreview />
                  </FloatingButton>
                )}
              </div>

              <AnimateHeight height={codecUnsupported ? "auto" : 0}>
                <div className="flex justify-center items-center gap-2 text-white whitespace-nowrap">
                  <MdWarning />
                  Unsupported Codec
                </div>
              </AnimateHeight>
            </div>
          </div>
        )}

        <div
          className={`${
            hiddenMode ? "hidden" : "flex"
          } absolute items-center gap-2 w-full rounded-full cursor-pointer justify-end top-0 right-0 m-[0.5rem] z-10`}
        >
          {showDetails &&
            metrics.width >= 0 &&
            metrics.height >= 0 &&
            metrics.fps >= 0 && (
              <div className="self-start ml-4 mt-2 text-xs rounded-md bg-black bg-opacity-50 font-bold text-lime-500 px-2 gap-2 flex items-center mr-auto">
                <p>{Math.round(metrics.fps)} FPS</p>
                <p>{metrics.height}p</p>
                <p>{metrics.codec}</p>
              </div>
            )}

          {showDetails && metrics.fps == -5 && (
            <div className="self-start ml-2 mt-2 text-xs text-red-500 px-2 gap-2 flex items-center mr-auto">
              <p>ERROR, NO METRIC</p>
            </div>
          )}

          {showDetails && metrics.fps == -1 && (
            <div className="self-start ml-2 mt-2 text-xs text-white px-2 gap-2 flex items-center mr-auto">
              <p>Computing..</p>
            </div>
          )}

          <div className="rounded-md bg-opacity-50 bg-black px-2 flex self-end justify-center items-center gap-1">
            <div>
              <FloatingButton
                parentElement={containerRef ?? document.body}
                customTextColor={showDetails ? "text-lime-400" : "text-white"}
                backgroundColor="bg-transparent"
                direction="down"
                description={showDetails ? "Hide Metrics" : "Show Metrics"}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDetails((prev) => !prev);
                }}
              >
                <MdInfo />
              </FloatingButton>
            </div>
            <div
              onClick={(e) => {
                e.stopPropagation();
                if (containerRef) {
                  if (!fullScreen) {
                    containerRef.requestFullscreen();
                    setFullScreen(true);
                  } else {
                    document.exitFullscreen();
                    setFullScreen(false);
                  }
                }
              }}
              className="text-white transition hover:text-lime-400"
            >
              {fullScreen ? (
                <MdFullscreenExit size={24} />
              ) : (
                <MdFullscreen size={24} />
              )}
            </div>

            <div
              onClick={(e) => {
                e.stopPropagation();
                if (videoRef.current) {
                  if (!pip) {
                    videoRef.current.requestPictureInPicture();
                    setPip(true);
                  } else {
                    document.exitPictureInPicture();
                    setPip(false);
                  }
                }
              }}
              className={`${
                hiddenMode ? "hidden" : "block"
              } text-white transition hover:text-lime-400`}
            >
              {pip ? (
                <RiPictureInPictureExitFill size={24} />
              ) : (
                <RiPictureInPicture2Fill size={24} />
              )}
            </div>
          </div>
        </div>

        <video
          ref={videoRef}
          muted
          autoPlay
          controls={false}
          className={`${viewSwapped ? "animate-fadeIn" : "animate-fadeIn"} ${
            fullScreen
              ? "w-[100vw] max-h-[100vh] h-auto object-contain mt-[50vh] -translate-y-[50%]"
              : "w-full h-full max-h-[55vh] object-contain"
          } rounded-md ${hiddenMode ? "hidden" : "block"} ${
            primaryVideoInverted && "-scale-x-100"
          }`}
        ></video>

        {user.isVideoEnabled &&
          user.isScreenShareEnabled !== "no" &&
          !callContext?.disabledVideoStreams.has("camera@" + user.id) &&
          !callContext?.disabledVideoStreams.has("screen@" + user.id) && (
            <video
              onClick={(e) => {
                e.stopPropagation();
                handleSwapView();
              }}
              ref={setSecondaryVideoRef}
              muted
              autoPlay
              controls={false}
              className={`
                ${secondaryVideoInverted && "-scale-x-100"}
                ${
                  viewSwapped ? "animate-fadeIn" : "animate-fadeIn"
                } absolute bottom-[0.25rem] right-[0.25rem] w-[30%] z-20 mt-4 bg-lime-700 aspect-video object-contain rounded-md`}
            ></video>
          )}
      </RightClickMenuWrapper>
    </div>
  );
}
