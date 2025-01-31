import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { FaDisplay } from "react-icons/fa6";
import { MdAudiotrack, MdScreenShare, MdSmartDisplay } from "react-icons/md";
import CallContext from "../contexts/CallContext";
import ModalContext from "../contexts/ModalContext";
import { ChatRoom } from "../types/ChatRoom";
import ModalUtils from "../util/ModalUtil";
import PrimaryButton from "./PrimaryButton";
import PrimaryCheckBox from "./PrimaryCheckBox";
import React from "react";

export default function ScreenShareConfig({
  chatRoom,
}: {
  chatRoom: ChatRoom;
}) {
  const [resTip, setResTip] = useState("");
  const [fpsTip, setFpsTip] = useState("");
  const [resWarning, setResWarning] = useState("");
  const [fpsWarning, setFpsWarning] = useState("");
  const resolutions = useMemo(() => {
    return ["360p(SD)", "480p(ED)", "720p(HD)", "1080p(FHD)", "1440p(QHD)"];
  }, []);

  const frameRates = useMemo(() => {
    return ["15fps(Low)", "24fps(Cinematic)", "30fps(Standard)", "60fps(High)"];
  }, []);

  const labelMapper: { [key: string]: string } = useMemo(() => {
    return {
      "360p(SD)": "360p",
      "480p(ED)": "480p",
      "720p(HD)": "720p",
      "1080p(FHD)": "1080p",
      "1440p(QHD)": "1440p",
      "15fps(Low)": "15fps",
      "24fps(Cinematic)": "24fps",
      "30fps(Standard)": "30fps",
      "60fps(High)": "60fps",
    };
  }, []);

  const [selectedResolution, setSelectedResolution] = useState("720p(HD)");
  const [selectedFps, setSelectedFps] = useState("30fps(Standard)");
  const [audio, setAudio] = useState(false);
  const [pending, setPending] = useState(false);
  const callContext = useContext(CallContext);
  const modalContext = useContext(ModalContext);

  useEffect(() => {
    if (selectedResolution === "360p(SD)") {
      setResTip(
        selectedResolution +
          ": Low quality, good for slow connections or small screens."
      );
      setResWarning("Minimal bandwidth usage, but may appear pixelated.");
    } else if (selectedResolution === "480p(ED)") {
      setResTip(
        selectedResolution +
          ": Better quality than 360p, suitable for smaller devices."
      );
      setResWarning("Low bandwidth usage, but not as sharp.");
    } else if (selectedResolution === "720p(HD)") {
      setResTip(
        selectedResolution + ": Clear HD quality, ideal for most screens."
      );
      setResWarning("Requires stable connection to avoid buffering.");
    } else if (selectedResolution === "1080p(FHD)") {
      setResTip(
        selectedResolution + ": High-definition, sharp and detailed video."
      );
      setResWarning("Needs fast internet for smooth streaming.");
    } else if (selectedResolution === "1440p(QHD)") {
      setResTip(
        selectedResolution +
          ": Very high-quality video with more detail for large screens."
      );
      setResWarning("High bandwidth usage, requires very fast internet.");
    }
  }, [selectedResolution]);

  useEffect(() => {
    if (selectedFps === "15fps(Low)") {
      setFpsTip(
        selectedFps + ": Low frame rate, suitable for basic video content."
      );
      setFpsWarning(
        "May appear choppy on smoother screens or for fast-moving content."
      );
    } else if (selectedFps === "24fps(Cinematic)") {
      setFpsTip(
        selectedFps +
          ": Standard cinematic frame rate, ideal for film-like quality."
      );
      setFpsWarning("May not be as smooth for fast action or gaming.");
    } else if (selectedFps === "30fps(Standard)") {
      setFpsTip(
        selectedFps +
          ": Standard smooth frame rate, good for web videos and streaming."
      );
      setFpsWarning(
        "Balanced quality, but can appear less smooth in fast-paced scenes."
      );
    } else if (selectedFps === "60fps(High)") {
      setFpsTip(
        selectedFps +
          ": High frame rate for ultra-smooth motion, great for gaming and action."
      );
      setFpsWarning(
        "Requires fast internet connection and higher processing power."
      );
    }
  }, [selectedFps]);

  const handleInitializeShare = useCallback(async () => {
    if (
      callContext &&
      selectedFps.length > 0 &&
      selectedResolution.length > 0 &&
      !pending
    ) {
      const mapper = {
        "15fps(Low)": 15,
        "24fps(Cinematic)": 24,
        "30fps(Standard)": 30,
        "60fps(High)": 60,
        "360p(SD)": {
          width: 640,
          height: 360,
        },
        "480p(ED)": {
          width: 854,
          height: 480,
        },
        "720p(HD)": {
          width: 1280,
          height: 720,
        },
        "1080p(FHD)": {
          width: 1920,
          height: 1080,
        },
        "1440p(QHD)": {
          width: 2560,
          height: 1440,
        },
      };

      if (!(selectedFps in mapper) || !(selectedResolution in mapper)) {
        return;
      }

      setPending(true);

      const ok = await callContext.handleEnableScreenShare(
        audio ? "withaudio" : "screenonly",
        chatRoom.id,
        {
          width:
            mapper[
              selectedResolution as
                | "360p(SD)"
                | "480p(ED)"
                | "720p(HD)"
                | "1080p(FHD)"
                | "1440p(QHD)"
            ].width,
          height:
            mapper[
              selectedResolution as
                | "360p(SD)"
                | "480p(ED)"
                | "720p(HD)"
                | "1080p(FHD)"
                | "1440p(QHD)"
            ].height,
          fps: mapper[
            selectedFps as
              | "15fps(Low)"
              | "24fps(Cinematic)"
              | "30fps(Standard)"
              | "60fps(High)"
          ],
          audio: audio,
        }
      );

      if (ok) {
        ModalUtils.closeCurrentModal(modalContext);
      }

      setPending(false);
    }
  }, [audio, selectedFps, selectedResolution, pending]);

  return (
    <div className="text-white flex flex-col gap-2 p-2 w-fit max-w-[100vw] max-h-[80vh] overflow-scroll">
      {resTip.length > 0 && (
        <p className="text-lg text-lime-300">
          <span className="font-bold">Note</span>: {resTip}
        </p>
      )}

      {resWarning.length > 0 && (
        <p className="text-lg text-orange-500">
          <span className="font-bold">Warning</span>: {resWarning}
        </p>
      )}

      <div className="flex items-center text-lg gap-2 text-lime-400">
        <FaDisplay />
        <p className="font-bold">Preferred Resolution</p>
      </div>

      <div className="w-full h-full flex items-center rounded-md bg-lime-500">
        {resolutions.map((res, i) => (
          <div
            key={res}
            onClick={() => setSelectedResolution(res)}
            className={`grid place-content-center w-full h-[4rem] transition text-center cursor-pointer text-white hover:text-lime-300 ${
              i === 0
                ? "rounded-s-md"
                : i === resolutions.length - 1
                ? "rounded-e-md"
                : "rounded-none"
            } bg-lime-600 hover:bg-lime-800 p-2 ${
              selectedResolution === res && "bg-lime-800"
            }`}
          >
            {labelMapper[res]}

            {res === "720p(HD)" && (
              <div className="bg-red-500 px-2 text-xs mt-1 rounded-md">
                Recommended
              </div>
            )}
          </div>
        ))}
      </div>

      {fpsTip.length > 0 && (
        <p className="text-lg text-lime-300">
          <span className="font-bold">Note</span>: {fpsTip}
        </p>
      )}

      {fpsWarning.length > 0 && (
        <p className="text-lg text-orange-500">
          <span className="font-bold">Warning</span>: {fpsWarning}
        </p>
      )}

      <div className="flex items-center text-lg gap-2 text-lime-400">
        <MdSmartDisplay />
        <p className="font-bold">Preferred Frame Rate</p>
      </div>

      <div className="w-full h-full flex items-center rounded-md bg-lime-500">
        {frameRates.map((frame, i) => (
          <div
            onClick={() => setSelectedFps(frame)}
            key={frame}
            className={`grid place-content-center w-full h-[4rem] transition text-center cursor-pointer text-white hover:text-lime-300 ${
              i === 0
                ? "rounded-s-md"
                : i === frameRates.length - 1
                ? "rounded-e-md"
                : "rounded-none"
            } bg-lime-600 hover:bg-lime-800 p-2 ${
              selectedFps === frame && "bg-lime-800"
            }`}
          >
            {labelMapper[frame]}
            {frame === "30fps(Standard)" && (
              <div className="bg-red-500 px-2 text-xs mt-1 rounded-md">
                Recommended
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center text-lg gap-2 text-lime-400">
        <MdAudiotrack />
        <p className="font-bold">Prefer to include System Audio?</p>
        <div className="mt-1">
          <PrimaryCheckBox
            onChecked={() => setAudio(true)}
            onUnchecked={() => setAudio(false)}
          ></PrimaryCheckBox>
        </div>
      </div>

      <p className="text-lg text-white">
        <span className="font-bold">Caution</span>: Your system may not be able
        to respect preferred settings due to hardware constraints!
      </p>

      <PrimaryButton onclick={handleInitializeShare} disabled={pending}>
        <div className="flex justify-center gap-2 items-center">
          <MdScreenShare /> Share
        </div>
      </PrimaryButton>
    </div>
  );
}
