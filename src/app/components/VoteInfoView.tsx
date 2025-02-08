import { useContext, useMemo, useState } from "react";
import { FaX } from "react-icons/fa6";
import ModalContext from "../contexts/ModalContext";
import { Poll } from "../types/Poll";
import { Vote } from "../types/Vote";
import ProfileAvatar from "./ProfileAvatar";
import React from "react";
type VoteInfoViewType = {
  poll: Poll;
  options: string[];
  votes: Vote[];
  optionCounts: number[];
};
export default function VoteInfoView({
  options,
  votes,
  poll,
  optionCounts,
}: VoteInfoViewType) {
  const [filter, setFilter] = useState(0);

  const votesFiltered = useMemo(() => {
    return votes.filter((vote) => vote.answerIndex === filter);
  }, [votes, filter]);

  const modalContext = useContext(ModalContext);

  return (
    <div className="w-[90vw] sm:w-[70vw] h-fit max-h-[25rem] min-h-[15rem] bg-lime-600 rounded-md text-white">
      <div className="p-2 shadow-md pl-4">
        <div className="flex items-center w-full">
          <p className="text-xl font-bold">{poll.question}</p>
          <div
            onClick={() => {
              modalContext?.setShouldExitAnimation(true);
              setTimeout(() => {
                modalContext?.setShouldExitAnimation(false);
                modalContext?.setOpen(false);
              }, 300);
            }}
            className="ml-auto cursor-pointer hover:text-red-500 text-lime-400 transition"
          >
            <FaX />
          </div>
        </div>

        <p className="text-base">{votes.length} votes</p>
      </div>

      <hr className="bg-lime-400 border-lime-400 text-lime-400" />
      <div className="grid grid-cols-[1fr_2fr] items-start mt-0 w-full h-full bg-lime-600 rounded-md">
        <div className="w-full h-full flex flex-col min-h-[15rem] max-h-[25rem] overflow-y-scroll rounded-bl-md shadow-lg bg-lime-600">
          {options.map((option, i) => {
            const ind = option.lastIndexOf("::");
            const shortcode = option.substring(0, ind);
            const content = option.substring(ind + 2);

            return (
              <div
                onClick={() => setFilter(i)}
                key={option + "_" + i}
                className={`flex p-2 cursor-pointer
                            transition hover:bg-lime-700 gap-2 items-center
                            ${filter === i && "bg-lime-700"}
                            ${i === options.length - 1 && "rounded-bl-md"}`}
              >
                {shortcode !== "none" && (
                  //@ts-expect-error: em-emoji not detected by jsx
                  <em-emoji shortcodes={shortcode} />
                )}

                <p
                  className="overflow-x-scroll
                                max-w-[12rem]"
                >
                  {content}
                </p>

                <p className="ml-auto text-sm text-lime-400">
                  ({optionCounts[i]})
                </p>
              </div>
            );
          })}
        </div>

        <div className="w-full h-full overflow-y-scroll min-h-[15rem] max-h-[25rem] bg-lime-700 bg-opacity-70 rounded-br-md flex flex-col gap-1">
          {votesFiltered.map((vote) => {
            return (
              <div
                key={vote.id}
                className="flex p-2 cursor-default
                            transition hover:bg-lime-800 rounded-md gap-2 items-center"
              >
                <ProfileAvatar user={vote.voter} size={12} />
                {vote.voter.nickname.length > 0
                  ? vote.voter.nickname
                  : vote.voter.username}
                <p className="text-xs text-lime-400">
                  {vote.voter.username + "#" + vote.voter.id}
                </p>
                <br />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
