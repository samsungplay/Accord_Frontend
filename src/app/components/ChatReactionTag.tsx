"use client";
import React from "react";
import {
  forwardRef,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Popover } from "react-tiny-popover";
import ModalContext from "../contexts/ModalContext";
import GenericUtil from "../util/GenericUtil";
import ModalUtils from "../util/ModalUtil";

type ChatReactionTagType = {
  reaction: [
    string,
    [number, boolean, { displayName: string; username: string }[]]
  ];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleReaction: (e: any) => void;
};

const ChatReactionTag = forwardRef(function ChatReactionTagUI(
  { reaction, handleReaction }: ChatReactionTagType,
  ref: React.Ref<{
    counterDown: () => void;
    counterUp: () => void;
  }>
) {
  const [open, setOpen] = useState(false);
  const modalContext = useContext(ModalContext);

  const counterRef1 = useRef<HTMLDivElement>(null);
  const counterRef2 = useRef<HTMLDivElement>(null);
  const counterRef3 = useRef<HTMLDivElement>(null);
  const counterContainerRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    counterDown: () => {
      if (counterRef1.current)
        counterRef1.current.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
    },
    counterUp: () => {
      if (counterRef3.current) {
        counterRef3.current.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    },
  }));

  useEffect(() => {
    if (
      counterRef1.current &&
      counterRef2.current &&
      counterRef3.current &&
      counterContainerRef.current
    ) {
      // counterRef2.current?.scrollIntoView({block:'nearest', inline:'nearest'})

      counterContainerRef.current.scrollTop = GenericUtil.remToPx(1.5);
    }
  }, [reaction]);
  return (
    <Popover
      content={
        <div
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          className="p-2 animate-popOut bg-lime-600 text-white mb-2 rounded-md shadow-md"
        >
          <p className="font-bold">{reaction[0]}</p>
          reacted by
          <div className="text-xs">
            {reaction[1][2].map((data, i) => (
              <p className="text-white" key={i}>
                {data.displayName}{" "}
              </p>
            ))}

            <span
              className="text-blue-500 cursor-pointer"
              onClick={() => {
                ModalUtils.openGenericModal(
                  modalContext,
                  "Rolling Credits..",
                  "",
                  () => {},
                  <div className="overflow-y-scroll max-h-[7rem] mt-2 bg-lime-500 rounded-md flex items-center flex-col gap-1 p-2">
                    {/*@ts-expect-error: em-emoji not detected by jsx */}
                    <em-emoji shortcodes={reaction[0]} size={"1em"}>
                      {" "}
                      {/*@ts-expect-error: em-emoji not detected by jsx */}
                    </em-emoji>{" "}
                    by..
                    {reaction[1][2].map((data, i) => {
                      return (
                        <div
                          key={i + 500}
                          className="font-bold rounded-md text-white flex min-w-[15rem] items-center gap-2 m-1 p-2 justify-center bg-lime-600"
                        >
                          <p className="text-base text-white">
                            {" "}
                            {data.displayName}{" "}
                          </p>
                          <p className="text-sm text-lime-700">
                            {" "}
                            {data.username}{" "}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                );
              }}
            >{`${
              reaction[1][2].length - 3 > 0
                ? `and ${reaction[1][2].length - 3} others..`
                : "Show all"
            }`}</span>
          </div>
        </div>
      }
      positions={["right"]}
      isOpen={open}
    >
      <div
        className="flex items-center gap-2 relative cursor-pointer"
        onClick={() => handleReaction({ shortcodes: reaction[0] })}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <div className="animate-popOut">
          {/*@ts-expect-error: em-emoji not detected by jsx */}
          <em-emoji shortcodes={reaction[0]} size={"1em"}></em-emoji>
        </div>

        <div className="absolute text-sm w-full h-full z-[70] bg-transparent"></div>

        <div
          className="overflow-y-scroll h-[1.5rem] flex gap-0 flex-col no-scrollbar"
          ref={counterContainerRef}
        >
          <div
            ref={counterRef3}
            className="text-white text-center align-middle min-w-[1.5rem] h-[1.5rem] leading-[1.5rem] bg-transparent text-sm"
          >
            {reaction[1][0] + 1}
          </div>
          <div
            ref={counterRef2}
            className="text-white text-center align-middle min-w-[1.5rem] h-[1.5rem] leading-[1.5rem] bg-transparent text-sm"
          >
            {reaction[1][0]}
          </div>
          <div
            ref={counterRef1}
            className="text-white text-center align-middle min-w-[1.5rem] h-[1.5rem] leading-[1.5rem] bg-transparent text-sm"
          >
            {reaction[1][0] - 1}
          </div>
        </div>
      </div>
    </Popover>
  );
});

export default ChatReactionTag;
