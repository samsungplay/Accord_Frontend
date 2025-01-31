import { formatDistanceToNow, sub } from "date-fns";
import { init } from "emoji-mart";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { FaVoteYea } from "react-icons/fa";
import { IoArrowBackOutline } from "react-icons/io5";
import PrimaryButton from "./PrimaryButton";

import data from "@emoji-mart/data";
import { InfiniteData, useMutation } from "@tanstack/react-query";
import { TiCancel } from "react-icons/ti";
import api from "../api/api";
import ModalContext from "../contexts/ModalContext";
import queryClient from "../query/QueryClient";
import { ChatRecordType } from "../types/ChatRecordType";
import { ChatRoom } from "../types/ChatRoom";
import { Poll } from "../types/Poll";
import { User } from "../types/User";
import ModalUtils from "../util/ModalUtil";
import VoteInfoView from "./VoteInfoView";
import React from "react";

type PollType = {
  poll: Poll;
  currentChatRoom: ChatRoom;
  currentUser: User;
  record: ChatRecordType;
};
export default function PollUI({
  poll,
  currentChatRoom,
  currentUser,
  record,
}: PollType) {
  const [selected, setSelected] = useState(-1);
  const [selecteds, setSelecteds] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [expirationString, setExpirationString] = useState("");
  const [expired, setExpired] = useState(false);
  const modalContext = useContext(ModalContext);

  const options = useMemo(() => {
    return poll.answers.split(";");
  }, [poll.answers]);

  const optionVotesCount = useMemo(() => {
    const cnts = new Array(options.length).fill(0);
    for (const vote of record.pollVotes) {
      cnts[vote.answerIndex]++;
    }
    return cnts;
  }, [options, record.pollVotes]);

  useEffect(() => {
    init({ data });
  }, []);
  useEffect(() => {
    //precision of 1 second
    // console.log("hmm?")
    if (expired) return;
    const timer = setInterval(() => {
      // console.log("workin: ", formatDistanceToNow(expiration))

      if (!expired) {
        setExpirationString(formatDistanceToNow(poll.expiration));
        if (new Date().getTime() > sub(poll.expiration, {}).getTime()) {
          setExpired(true);
        }
      }
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [poll.expiration, expired]);

  useEffect(() => {
    if (poll.allowMultiple) {
      setSelected(-1);
    } else {
      setSelecteds([]);
    }
  }, [poll.allowMultiple]);

  const voteMutation = useMutation({
    onMutate: (variables) => {
      const previous = queryClient.getQueryData([
        "chats",
        currentChatRoom.id.toString(),
      ]);
      setSelected(-1);
      setSelecteds([]);
      queryClient.setQueryData(
        ["chats", currentChatRoom.id.toString()],
        (prev: InfiniteData<{ data: ChatRecordType[] }, number>) => {
          const pages: { data: ChatRecordType[] }[] = [];

          for (let i = 0; i < prev.pages.length; i++) {
            const original = prev.pages[i].data.map((e) => {
              if (e.id === record.id) {
                const pollVotes = [...record.pollVotes];
                for (const answerIndex of variables) {
                  pollVotes.push({
                    id: -1,
                    voter: currentUser,
                    answerIndex: answerIndex,
                  });
                }

                return {
                  ...e,
                  pollVotes: pollVotes,
                };
              }
              return e;
            });

            pages.push({
              data: original,
            });
          }

          return {
            pages: pages,
            pageParams: prev.pageParams,
          };
        }
      );

      return {
        previous,
      };
    },
    mutationFn: (answerIndices: number[]) => {
      return api.post(
        `/chat/message/poll/${poll.id}/vote/${currentChatRoom.id}`,
        {
          answerIndex: answerIndices,
        }
      );
    },
    onSettled(data, error, variables, context) {
      if (!data) return;
      if (data.status === 200) {
        //nothing to do
      } else {
        queryClient.setQueryData(
          ["chats", currentChatRoom.id.toString()],
          context?.previous
        );
        ModalUtils.handleGenericError(modalContext, data);
      }
    },
  });

  const unVoteMutation = useMutation({
    onMutate: () => {
      const previous = queryClient.getQueryData([
        "chats",
        currentChatRoom.id.toString(),
      ]);
      queryClient.setQueryData(
        ["chats", currentChatRoom.id.toString()],
        (prev: InfiniteData<{ data: ChatRecordType[] }, number>) => {
          const pages: { data: ChatRecordType[] }[] = [];

          for (let i = 0; i < prev.pages.length; i++) {
            const original = prev.pages[i].data.map((e) => {
              if (e.id === record.id && record.pollVotes) {
                return {
                  ...e,
                  pollVotes: record.pollVotes.filter((vote) => {
                    return vote.voter.id !== currentUser.id;
                  }),
                };
              }
              return e;
            });

            pages.push({
              data: original,
            });
          }

          return {
            pages: pages,
            pageParams: prev.pageParams,
          };
        }
      );

      return {
        previous,
      };
    },
    mutationFn: () => {
      return api.delete(
        `/chat/message/poll/${poll.id}/vote/${currentChatRoom.id}`
      );
    },
    onSettled(data, error, variables, context) {
      if (!data) return;
      if (data.status === 200) {
        //nothing to do
      } else {
        queryClient.setQueryData(
          ["chats", currentChatRoom.id.toString()],
          context?.previous
        );
        ModalUtils.handleGenericError(modalContext, data);
      }
    },
  });

  const handleVote = useCallback(() => {
    if (
      (poll.allowMultiple && selecteds.length === 0) ||
      (!poll.allowMultiple && selected === -1)
    )
      return;

    if (!voteMutation.isPending) {
      if (poll.allowMultiple) {
        voteMutation.mutate(selecteds);
      } else {
        voteMutation.mutate([selected]);
      }
    }
  }, [voteMutation, poll.allowMultiple, selected, selecteds]);

  const handleUnvote = useCallback(() => {
    if (!unVoteMutation.isPending) {
      unVoteMutation.mutate();
    }
  }, [unVoteMutation]);

  const userHasVoted = useMemo(() => {
    return record.pollVotes
      .map((vote) => vote.voter.id)
      .includes(currentUser.id);
  }, [record.pollVotes]);

  const handleOpenVoteInfoModal = useCallback(() => {
    ModalUtils.openCustomModal(
      modalContext,
      <VoteInfoView
        poll={poll}
        options={options}
        optionCounts={optionVotesCount}
        votes={record.pollVotes}
      />,
      true
    );
  }, []);

  return (
    <div className="w-[90%] sm:w-[60%] bg-lime-700 text-lime-400 rounded-md p-2">
      <p className="text-xl">{poll.question}</p>
      <p className="text-base text-lime-500">
        {poll.allowMultiple ? "Select multiple answers" : "Select one answer"}
      </p>

      <div className="flex flex-col gap-2 mt-2">
        {!showResults && !userHasVoted && !expired
          ? options.map((option, i) => {
              const ind = option.lastIndexOf("::");
              const shortcode = option.substring(0, ind);
              const content = option.substring(ind + 2);
              return (
                <div
                  key={"pollOption_" + i}
                  onClick={() => {
                    if (userHasVoted) return;
                    if (!poll.allowMultiple) setSelected(i);
                    else {
                      if (selecteds.includes(i)) {
                        setSelecteds((prev) => prev.filter((e) => e !== i));
                      } else {
                        setSelecteds((prev) => [...prev, i]);
                      }
                    }
                  }}
                  className={`bg-lime-600 relative flex items-center transition duration-200
                                        ${
                                          !userHasVoted && !expired
                                            ? "hover:border-lime-500 cursor-pointer"
                                            : "cursor-not-allowed"
                                        }
                        border-[3px] p-3 h-[3.5rem] rounded-md
                        ${
                          (poll.allowMultiple && selecteds.includes(i)) ||
                          (!poll.allowMultiple && selected == i)
                            ? "border-lime-400"
                            : "border-transparent"
                        }`}
                >
                  {shortcode !== "none" && (
                    //@ts-expect-error: em-emoji not detected by jsx
                    <em-emoji shortcodes={shortcode} size={"2rem"} />
                  )}

                  <p className="ml-2 mb-0.5">{content}</p>
                  <div
                    className={`w-2 h-2
                            ml-auto ${
                              poll.allowMultiple
                                ? "rounded-none"
                                : "rounded-full"
                            } ${
                      (poll.allowMultiple && selecteds.includes(i)) ||
                      (!poll.allowMultiple && selected == i)
                        ? "bg-lime-700"
                        : "bg-lime-600"
                    } border-4 transition duration-200 border-lime-500 p-2`}
                  ></div>
                </div>
              );
            })
          : options.map((option, i) => {
              const ind = option.lastIndexOf("::");
              const shortcode = option.substring(0, ind);
              const content = option.substring(ind + 2);
              return (
                <div
                  key={"pollOption_" + i}
                  onClick={() => {
                    if (userHasVoted) return;
                    if (!poll.allowMultiple) setSelected(i);
                    else {
                      if (selecteds.includes(i)) {
                        setSelecteds((prev) => prev.filter((e) => e !== i));
                      } else {
                        setSelecteds((prev) => [...prev, i]);
                      }
                    }
                  }}
                  className={`bg-lime-600 flex relative items-center transition duration-200
                         ${
                           !userHasVoted && !expired
                             ? "hover:border-lime-500 cursor-pointer"
                             : "cursor-not-allowed"
                         } border-[3px] p-3 h-[3.5rem] rounded-md
                        ${
                          (poll.allowMultiple && selecteds.includes(i)) ||
                          (!poll.allowMultiple && selected === i)
                            ? "border-lime-400"
                            : "border-transparent"
                        }`}
                >
                  <div
                    className="absolute h-full top-0 left-0 bg-lime-500 bg-opacity-40 animate-[loadBar_0.5s_ease-in-out] origin-left"
                    style={{
                      width: `${
                        record.pollVotes.length >= 1
                          ? Math.round(
                              (optionVotesCount[i] / record.pollVotes.length) *
                                100.0
                            )
                          : 0
                      }%`,
                    }}
                  ></div>
                  {shortcode !== "none" && (
                    //@ts-expect-error: em-emoji not detected by jsx
                    <em-emoji shortcodes={shortcode} size={"2rem"} />
                  )}
                  <p className="ml-2 mb-0.5">{content}</p>
                  <p className="ml-auto text-sm animate-[fadeInAndDown_0.3s_ease-in-out] text-lime-500">
                    {optionVotesCount[i]} votes
                  </p>
                  <p className="ml-2 text-lg animate-[fadeInAndDown_0.3s_ease-in-out] hidden sm:inline text-lime-500">
                    {record.pollVotes.length >= 1
                      ? Math.round(
                          (optionVotesCount[i] / record.pollVotes.length) *
                            100.0
                        )
                      : 0}
                    %
                  </p>
                </div>
              );
            })}
      </div>

      <div className="mt-2 flex items-center flex-wrap sm:flex-nowrap justify-center sm:justify-start">
        <p
          onClick={() => handleOpenVoteInfoModal()}
          className="text-lime-400 hover:underline hover:text-opacity-70 transition cursor-pointer mt-2 text-sm ml-1"
        >
          {record.pollVotes.length}
          <span className="hidden sm:inline"> votes</span>
        </p>
        <div className="w-[0.1rem] mt-2 h-[1rem] bg-lime-500 ml-1 sm:ml-4"></div>
        <p className="text-lime-600 mt-2 text-sm ml-1 sm:ml-4 mr-1">
          {!expired ? `${expirationString} left` : "Expired"}
        </p>

        {!showResults && !userHasVoted && !expired ? (
          <>
            <p
              onClick={() => {
                setSelected(-1);
                setSelecteds([]);
                setShowResults(true);
              }}
              className="mt-2 mr-1 ml-auto hover:underline hover:text-opacity-70 text-lime-400 transition cursor-pointer"
            >
              <span className="lg:inline hidden">Show </span> Results
            </p>

            <PrimaryButton
              customStyles="mt-2 sm:mt-0 ml-4 mr-2 bg-lime-500"
              customWidth="w-[5rem]"
              onclick={() => {
                handleVote();
              }}
              disabled={
                (poll.allowMultiple && selecteds.length === 0) ||
                (!poll.allowMultiple && selected === -1) ||
                voteMutation.isPending
              }
            >
              <div className="flex items-center justify-center gap-2 w-full">
                <FaVoteYea />
                <p>Vote</p>
              </div>
            </PrimaryButton>
          </>
        ) : (
          <PrimaryButton
            customStyles="mt-2 ml-auto mr-2 bg-lime-500"
            customWidth={`${
              !userHasVoted && !expired ? "w-[5rem]" : "w-[9rem]"
            }`}
            onclick={
              !userHasVoted
                ? () => setShowResults((prev) => !prev)
                : () => handleUnvote()
            }
            disabled={(userHasVoted && unVoteMutation.isPending) || expired}
          >
            <div className="flex items-center justify-center gap-2 w-full">
              {!userHasVoted && !expired ? (
                <>
                  <IoArrowBackOutline />
                  <p>Back</p>
                </>
              ) : !expired ? (
                <>
                  <TiCancel />
                  <p>Remove Vote</p>
                </>
              ) : (
                <>
                  <p>Expired</p>
                </>
              )}
            </div>
          </PrimaryButton>
        )}
      </div>
    </div>
  );
}
