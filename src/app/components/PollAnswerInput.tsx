import EmojiPicker from "@emoji-mart/react";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useDeferredValue,
  useState,
} from "react";
import { BsEmojiNeutralFill, BsEmojiSmileFill } from "react-icons/bs";
import { MdDelete } from "react-icons/md";
import { Popover } from "react-tiny-popover";
import PrimaryInput from "./PrimaryInput";
import React from "react";

type PollAnswerInputType = {
  id: string;
  setAnswers: Dispatch<SetStateAction<string[]>>;
  error: string;
};
export default function PollAnswerInput({
  id,
  setAnswers,
  error,
}: PollAnswerInputType) {
  const [open, setOpen] = useState(false);
  const [answerText, setAnswerText] = useState("");
  const answerTextDeferred = useDeferredValue(answerText);
  const [shortCode, setShortCode] = useState("");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleOnEmojiSelect = useCallback((e: any) => {
    setShortCode(e["shortcodes"]);
  }, []);

  return (
    <div
      className={`relative w-full flex items-center border-2 ${
        error === id
          ? "border-red-500 rounded-md animate-jiggle"
          : "border-transparent"
      }`}
    >
      <input
        className="hidden"
        readOnly
        id={"pollAnswerInputEmoji_" + id}
        value={shortCode}
      />

      <Popover
        isOpen={open}
        positions={["top", "right"]}
        containerStyle={{
          zIndex: "91",
        }}
        onClickOutside={() => setOpen(false)}
        content={
          <div className="my-2 shadow-md opacity-80">
            <div className="hidden sm:block">
              <EmojiPicker onEmojiSelect={handleOnEmojiSelect} />
            </div>
            <div className="block sm:hidden">
              <EmojiPicker onEmojiSelect={handleOnEmojiSelect} perLine={5} />
            </div>
          </div>
        }
      >
        <div
          onClick={() => setOpen(!open)}
          className="p-2 group cursor-pointer mt-1 bg-lime-600 grid place-content-center rounded-s-md h-[2.75rem] w-[2.75rem]"
        >
          <div className="group-hover:scale-[110%] transition text-lime-400">
            {shortCode.length === 0 ? (
              <>
                <div className="hidden group-hover:block">
                  <BsEmojiSmileFill size={28} />
                </div>
                <div className="block group-hover:hidden">
                  <BsEmojiNeutralFill size={28} />
                </div>
              </>
            ) : (
              <>
                {/*@ts-expect-error: em-emoji not detected by jsx*/}
                <em-emoji shortcodes={shortCode} size={"2rem"} />
              </>
            )}
          </div>
        </div>
      </Popover>

      <PrimaryInput
        onChange={(e) => setAnswerText(e.target.value)}
        value_={answerText}
        id={"pollAnswerInput_" + id}
        type="text"
        customStylesInput="w-full text-lg min-h-[2.75rem] focus:shadow-none
        hover:bg-opacity-100 focus:bg-opacity-100
        placeholder:text-opacity-40 rounded-none"
        placeholder="Type your answer"
        maxLength={55}
      />

      <div className="text-sm text-lime-400 bg-lime-600 rounded-e-md h-[2.75rem] mt-1 flex flex-col justify-end p-2">
        {answerTextDeferred.length}/55
      </div>

      <div
        onClick={() => {
          setAnswers((prev) =>
            prev.filter((e) => {
              return e !== id;
            })
          );
        }}
        className="p-1 w-[2rem] mt-1 grid place-content-center text-lime-400 hover:text-red-500 cursor-pointer transition"
      >
        <MdDelete size={28} />
      </div>
    </div>
  );
}
