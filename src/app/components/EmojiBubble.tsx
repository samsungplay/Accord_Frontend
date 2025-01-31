import React, {
  Dispatch,
  SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FaVolumeHigh } from "react-icons/fa6";
import GenericUtil from "../util/GenericUtil";

export default function EmojiBubble({
  shortCodes,
  setShortCodes,
  userIdKey,
  duration,
}: {
  shortCodes: string | undefined;
  setShortCodes?: Dispatch<SetStateAction<{ [userId: number]: string }>>;
  userIdKey?: number;
  duration: number;
}) {
  const [exit, setExit] = useState(false);

  const isSoundEffect = useMemo(() => {
    return shortCodes?.startsWith("sound_");
  }, [shortCodes]);

  const actualShortCode = useMemo(() => {
    if (!shortCodes) return "";

    const actual = shortCodes.startsWith("sound_")
      ? shortCodes.substring(6, shortCodes.lastIndexOf("@@"))
      : shortCodes.substring(0, shortCodes.lastIndexOf("@@"));

    return actual;
  }, [shortCodes]);
  const timeout = useRef<NodeJS.Timeout | null>(null);
  const timeout2 = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (shortCodes?.length) {
      if (timeout.current) {
        clearTimeout(timeout.current);
      }
      if (timeout2.current) {
        clearTimeout(timeout2.current);
      }
      setExit(false);

      timeout.current = setTimeout(() => {
        setExit(true);
      }, duration);
      timeout2.current = setTimeout(() => {
        if (setShortCodes && userIdKey) {
          setShortCodes((prev) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { [userIdKey]: variable, ...withoutUserId } = prev;
            return withoutUserId;
          });
        }
      }, duration + 200);
    }
  }, [shortCodes]);

  return actualShortCode.length ? (
    <div
      key={actualShortCode}
      className={`md:w-[10rem] md:h-[6rem] w-[5rem] h-[3rem] grid z-40 rounded-md relative ${
        exit
          ? "animate-[popInWithScaleUp_0.4s_ease-in-out_forwards]"
          : "animate-[popOut_0.2s_ease-in-out_forwards]"
      } place-content-center ${
        isSoundEffect ? "bg-orange-500" : "bg-lime-700"
      } shadow-md`}
    >
      {isSoundEffect && (
        <>
          <div className="absolute top-1 right-1 md:hidden text-lime-300">
            <FaVolumeHigh size={GenericUtil.remToPx(1)} />
          </div>
          <div className="absolute top-1.5 right-1.5 hidden md:block text-lime-300">
            <FaVolumeHigh size={GenericUtil.remToPx(1.5)} />
          </div>
        </>
      )}
      <div className="hidden md:block">
        {/*@ts-expect-error: em-emoji not detected by jsx */}
        <em-emoji shortcodes={actualShortCode} size={"4rem"}>
          {/*@ts-expect-error: em-emoji not detected by jsx */}
        </em-emoji>
      </div>

      <div className="md:hidden">
        {/*@ts-expect-error: em-emoji not detected by jsx */}
        <em-emoji shortcodes={actualShortCode} size={"2rem"}>
          {/*@ts-expect-error: em-emoji not detected by jsx */}
        </em-emoji>
      </div>
      <div
        className={`absolute ml-auto w-0 h-0 bottom-[20%] md:bottom-[10%] translate-y-[100%] left-0 border-l-[10px] border-solid border-l-transparent
                 border-r-[10px] border-r-transparent border-b-[20px] ${
                   isSoundEffect
                     ? "border-b-orange-500 dark:border-b-orange-400"
                     : "border-b-lime-700 dark:border-b-lime-200"
                 } rotate-[-145deg]`}
      ></div>
    </div>
  ) : (
    <></>
  );
}
