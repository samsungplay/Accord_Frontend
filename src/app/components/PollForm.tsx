import { InfiniteData, useMutation } from "@tanstack/react-query";
import {
  useCallback,
  useContext,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { FaPlus } from "react-icons/fa";
import { FaX } from "react-icons/fa6";
import { RiSurveyFill } from "react-icons/ri";
import { ClipLoader } from "react-spinners";
import { createEditor, Descendant, Editor, Node, Text } from "slate";
import { Editable, Slate, withReact } from "slate-react";
import { v4 as uuidv4 } from "uuid";
import api from "../api/api";
import ModalContext from "../contexts/ModalContext";
import queryClient from "../query/QueryClient";
import { ChatRoom } from "../types/ChatRoom";
import ModalUtils from "../util/ModalUtil";
import PollAnswerInput from "./PollAnswerInput";
import PrimaryButton from "./PrimaryButton";
import PrimaryCheckBox from "./PrimaryCheckBox";
import Spinner from "./Spinner";
import React from "react";
import { ChatRecordType } from "../types/ChatRecordType";
import Constants from "../constants/Constants";
import ContentDisplayContext from "../contexts/ContentDisplayContext";

type PollFormType = {
  currentChatRoom: ChatRoom;
};

export default function PollForm({ currentChatRoom }: PollFormType) {
  const [question, setQuestion] = useState("");
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [shouldSubmitForm, setShouldSubmitForm] = useState(false);
  const [questionError, setQuestionError] = useState("");
  const [answerError, setAnswerError] = useState("");
  const [answerErrorId, setAnswerErrorId] = useState("");

  const [answers, setAnswers] = useState<string[]>([uuidv4()]);
  const questionDeferred = useDeferredValue(question);
  const modalContext = useContext(ModalContext);
  const contentDisplayContext = useContext(ContentDisplayContext);

  const initialValue: Descendant[] = [
    {
      type: "paragraph",
      children: [{ text: "" }],
    },
  ];

  const sendPollMutation = useMutation({
    mutationFn: ({
      question,
      answers,
      allowMultiple,
      duration,
    }: {
      question: string;
      answers: string[];
      allowMultiple: boolean;
      duration: number;
    }) => {
      return api.post(`/chat/message/poll/${currentChatRoom.id}`, {
        question,
        answers,
        allowMultiple,
        duration,
      });
    },
    onSettled(data) {
      if (!data) return;

      if (data.status === 200) {
        const payload = data.data;
        queryClient.setQueryData(
          ["chats", currentChatRoom.id.toString()],
          (prev: InfiniteData<{ data: ChatRecordType[] }>) => {
            if (!prev) return undefined;

            if (prev.pages[0].data.length > 0 && prev.pageParams[0] !== 0) {
              //not on first page, reset query

              contentDisplayContext?.setShouldBatchResetChatsQuery(
                (prev) => prev + 1
              );
              return prev;
            }
            const all: ChatRecordType[] = [];
            all.push(payload);
            for (const page of prev.pages) {
              for (const record of page.data) {
                all.push(record);
              }
            }

            if (
              all.length >
              Constants.CLIENT_PER_PAGE_COUNT * Constants.CLIENT_MAX_PAGES
            )
              all.pop();

            const newPages = [];

            let singlePage = [];
            for (let i = 0; i < all.length; i++) {
              singlePage.push(all[i]);
              if (singlePage.length >= Constants.CLIENT_PER_PAGE_COUNT) {
                newPages.push({
                  data: singlePage,
                });
                singlePage = [];
              }
            }

            if (singlePage.length > 0) {
              newPages.push({
                data: singlePage,
              });
            }

            return {
              pages: newPages,
              pageParams: prev.pageParams,
            };
          }
        );

        modalContext?.setShouldExitAnimation(true);
        setTimeout(() => {
          modalContext?.setShouldExitAnimation(false);
          modalContext?.setOpen(false);
        }, 300);
      } else {
        ModalUtils.handleGenericError(modalContext, data);
      }
    },
  });

  useEffect(() => {
    if (shouldSubmitForm) {
      let hasError = false;
      const answersList: string[] = [];
      if (question.length === 0) {
        setQuestionError("Question is missing");
        hasError = true;
      }
      if (answers.length === 0) {
        setAnswerError("At least one answer required");
        hasError = true;
      }
      for (const answer of answers) {
        const el = document.getElementById("pollAnswerInput_" + answer);
        const el2 = document.getElementById("pollAnswerInputEmoji_" + answer);
        if (
          !el ||
          !(el instanceof HTMLInputElement) ||
          !el2 ||
          !(el2 instanceof HTMLInputElement)
        ) {
          setAnswerError("Oof! Something's wrong, try reloading menu!");
          hasError = true;
          break;
        } else {
          if (el.value.length === 0) {
            setAnswerError("Answer is missing");
            setAnswerErrorId(answer);
            hasError = true;
            break;
          }

          answersList.push(
            (el2.value.length === 0 ? "none" : el2.value) + "::" + el.value
          );
        }
      }

      const el3 = document.getElementById("pollDurationSpinner");
      let duration = 1000 * 60 * 60 * 24; //1 day
      if (!el3 || !(el3 instanceof HTMLInputElement)) {
        setAnswerError("Oof! Something's wrong, try reloading menu!");
        hasError = true;
      } else {
        if (el3.value === "1 hour") {
          duration = 1000 * 60 * 60;
        } else if (el3.value === "4 hours") {
          duration = 1000 * 60 * 60 * 4;
        } else if (el3.value === "8 hours") {
          duration = 1000 * 60 * 60 * 8;
        } else if (el3.value === "3 days") {
          duration = 1000 * 60 * 60 * 24 * 3;
        } else if (el3.value === "1 week") {
          duration = 1000 * 60 * 60 * 24 * 7;
        } else if (el3.value === "2 weeks") {
          duration = 1000 * 60 * 60 * 24 * 14;
        }
      }

      if (!hasError) {
        if (!sendPollMutation.isPending) {
          sendPollMutation.mutate({
            question,
            answers: answersList,
            allowMultiple,
            duration,
          });
        }
      }

      setShouldSubmitForm(false);
    }
  }, [shouldSubmitForm, sendPollMutation, allowMultiple, question]);
  const handlePostPoll = useCallback(() => {
    setQuestionError("");
    setAnswerError("");
    setAnswerErrorId("");

    setShouldSubmitForm(true);
  }, [sendPollMutation]);

  const withMaxLength = useCallback((editor: Editor) => {
    const { insertText, insertFragment } = editor;
    editor.insertText = (text) => {
      const len = Editor.string(editor, []).length;
      if (len + text.length <= 300) {
        insertText(text);
      }
    };

    editor.insertFragment = (fragment) => {
      const len = Editor.string(editor, []).length;
      const fragmentLength = fragment.reduce(
        (acc, node) => acc + Node.string(node).length,
        0
      );
      if (len + fragmentLength <= 300) {
        insertFragment(fragment);
      }
    };
    return editor;
  }, []);

  const editor = useMemo(() => {
    return withMaxLength(withReact(createEditor()));
  }, []);

  const getAllText = useCallback((nodes: Descendant[]): string => {
    return nodes
      .map((node) => {
        if (Text.isText(node)) {
          return node.text;
        } else {
          return getAllText(node.children);
        }
      })
      .join("");
  }, []);

  return (
    <div className="flex flex-col w-[90vw] md:w-[50vw] h-fit p-4 bg-lime-700 rounded-md">
      <div className="flex items-center w-full">
        <p className="text-lime-400 text-2xl">Create a Poll</p>
        <div
          onClick={() => {
            modalContext?.setShouldExitAnimation(true);
            setTimeout(() => {
              modalContext?.setShouldExitAnimation(false);
              modalContext?.setOpen(false);
            }, 300);
          }}
          className="ml-auto cursor-pointer transition hover:text-red-500 text-lime-400"
        >
          <FaX size={16} />
        </div>
      </div>

      <p className="text-lime-400 font-bold text-xl mt-2">
        QUESTION{" "}
        <span className="text-red-500 text-sm font-normal">
          {" "}
          {questionError}
        </span>
      </p>

      <div
        className={`bg-lime-600 flex mt-1 text-lime-300 placeholder:text-lime-300 hover:bg-opacity-70 focus:bg-opacity-70 transition duration-500
                                focus:outline-none caret-lime-300 w-full self-center min-h-[2rem] text-lg overflow-hidden p-2 rounded-md
                                border-2 ${
                                  questionError.length > 0
                                    ? "border-red-500 animate-jiggle"
                                    : "border-transparent"
                                }`}
      >
        <Slate
          editor={editor}
          initialValue={initialValue}
          onChange={(e) => {
            setQuestion(getAllText(e));
          }}
        >
          <Editable
            onKeyDown={(e) => {
              const len = Editor.string(editor, []).length;
              if (len >= 300 && e.key !== "Backspace") {
                e.preventDefault();
              }
            }}
            className="focus:outline-none w-[80%] max-h-[10rem] overflow-y-scroll"
            placeholder={"What's the grand question?"}
          />
        </Slate>

        <div className="text-white ml-auto w-fit whitespace-nowrap text-sm flex flex-col justify-end items-center">
          <p
            className={`${
              questionDeferred.length > 300 ? "text-red-500" : "text-lime-400"
            }`}
          >
            {questionDeferred.length}/300
          </p>
        </div>
      </div>

      <p className="text-lime-400 font-bold mt-5 text-sm">
        ANSWERS{" "}
        <span className="text-red-500 text-sm font-normal">{answerError}</span>
      </p>

      {answers.map((e) => {
        return (
          <div className="mt-2" key={e}>
            <PollAnswerInput
              id={e}
              setAnswers={setAnswers}
              error={answerErrorId}
            />
          </div>
        );
      })}

      <div
        className="bg-lime-600 mt-3 cursor-pointer hover:bg-opacity-70 hover:text-opacity-80 transition duration-200 text-lime-400 text-opacity-50 flex items-center gap-4 rounded-md p-2 h-[2.75rem]"
        onClick={() => {
          if (answers.length <= 7) setAnswers((prev) => [...prev, uuidv4()]);
        }}
        style={{
          width: "calc(100% - 2rem)",
        }}
      >
        <FaPlus size={16} />
        Add another answer
      </div>

      <div className="flex w-full items-center gap-2 mt-4">
        <p className="text-lime-400">Duration</p>
        <Spinner
          data={[
            "1 hour",
            "4 hours",
            "8 hours",
            "24 hours",
            "3 days",
            "1 week",
            "2 weeks",
          ]}
          placeholder="24 hours"
          defaultValue="24 hours"
          width={"8rem"}
          id={"pollDurationSpinner"}
          rounded
          showSelected
          customInputStyles="text-lime-400"
          customMenuButtonStyles="text-lime-400"
        />
      </div>

      <div
        className="flex items-center mt-5 p-2 rounded-b-md bg-lime-800 mb-[-1rem] mx-[-1rem]"
        style={{
          width: "calc(100% + 2rem)",
        }}
      >
        <div className="mt-3 flex w-full justify-center gap-2 mb-2 items-center">
          <PrimaryCheckBox
            onChecked={() => setAllowMultiple(true)}
            onUnchecked={() => setAllowMultiple(false)}
          />
          <p className="text-lime-400">Allow Multiple Answers</p>
        </div>
        <PrimaryButton
          onclick={() => handlePostPoll()}
          disabled={sendPollMutation.isPending}
          customStyles="mt-0 bg-lime-500"
        >
          {sendPollMutation.isPending ? (
            <div className="flex items-center justify-center gap-2 p-2">
              <ClipLoader color="white" size={"1rem"} />
              <p>Post</p>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 p-2">
              <RiSurveyFill />
              <p>Post</p>
            </div>
          )}
        </PrimaryButton>
      </div>
    </div>
  );
}
