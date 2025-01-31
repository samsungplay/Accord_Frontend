import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ChatRecordType } from "../types/ChatRecordType";
import ChatRecord from "./ChatRecord";
import { ChatRoom } from "../types/ChatRoom";
import { User } from "../types/User";
import { Editor } from "slate";
import { BounceLoader } from "react-spinners";
import { useOnClickOutside, useWindowSize } from "usehooks-ts";
import { FaFeatherPointed } from "react-icons/fa6";
import { useMutation } from "@tanstack/react-query";
import api from "../api/api";
import ModalUtils from "../util/ModalUtil";
import ModalContext from "../contexts/ModalContext";

import {
  MdOutlineKeyboardArrowLeft,
  MdOutlineKeyboardArrowRight,
} from "react-icons/md";
import useIsLightMode from "../hooks/useIsLightMode";
type SearchResultsOverlayType = {
  searchResults: ChatRecordType[];
  currentChatRoom: ChatRoom;
  currentUser: User;
  getText: (editor: Editor) => string;
  searchResultsPending: boolean;
  setSearchResultsPending: Dispatch<SetStateAction<boolean>>;
  setSearchResults: Dispatch<SetStateAction<ChatRecordType[]>>;
  emojiSearchViewWidth: number;
  handleNavigateToChatRecord: (id: number) => void;
  setSearchOverlayOpen: Dispatch<SetStateAction<boolean>>;
  currentSearchParams: {
    query: {
      content: string;
      tags: string[];
    };
    searchOrder: "NEW" | "OLD";
  };
  setSearchParams: Dispatch<
    SetStateAction<{
      query: {
        content: string;
        tags: string[];
      };
      searchOrder: "NEW" | "OLD";
    } | null>
  >;
};
export default function SearchResultsOverlay({
  searchResults,
  currentChatRoom,
  currentUser,

  searchResultsPending,
  emojiSearchViewWidth,
  handleNavigateToChatRecord,
  setSearchOverlayOpen,
  currentSearchParams,
  setSearchResults,
  setSearchResultsPending,
}: SearchResultsOverlayType) {
  const [headerHeight, setHeaderHeight] = useState(0);
  const windowSize = useWindowSize();
  const [playExitAnimation, setPlayExitAnimation] = useState(false);
  const [disablePreviousButton, setDisablePreviousButton] = useState(true);
  const [disableNextButton, setDisableNextButton] = useState(false);
  const [currentSearchOrder, setCurrentSeachOrder] = useState<"NEW" | "OLD">(
    "NEW"
  );
  useEffect(() => {
    setCurrentSeachOrder("NEW");
  }, [currentSearchParams]);
  const [refetchSearches, setRefetchSearches] = useState(false);
  const [searchResultsContainerRef, setSearchResultsContainerRef] =
    useState<HTMLDivElement | null>(null);

  const modalContext = useContext(ModalContext);

  useLayoutEffect(() => {
    const header = document.getElementById("header");
    if (header) {
      setHeaderHeight(header.getBoundingClientRect().height);
    }
  }, [windowSize]);
  const overlayRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(overlayRef, (e) => {
    const current = e.target as HTMLElement;

    let currentNode = current;
    let i = 0;

    while (currentNode !== undefined && i < 30) {
      if (
        currentNode &&
        (currentNode.id === "searchBarOpener" ||
          currentNode.id === "searchMenu" ||
          (currentNode.classList &&
            currentNode.classList.contains("searchResultsOverlay")))
      ) {
        return;
      }

      if (!currentNode) break;

      currentNode = currentNode.parentNode as HTMLElement;
      i++;
    }

    setPlayExitAnimation(true);
    setTimeout(() => {
      setPlayExitAnimation(false);
      setSearchOverlayOpen(false);
    }, 300);
  });

  const searchMessageMutation = useMutation({
    mutationFn: ({
      cursorId,
      searchOrder,
      previous,
    }: {
      cursorId: number;
      searchOrder: "NEW" | "OLD";
      previous: boolean;
    }) => {
      return api.post<ChatRecordType[]>(
        `/chat/message/search/${currentChatRoom.id}`,
        {
          cursorId,
          previous,
          order: searchOrder,
          content: currentSearchParams.query.content,
          tags: currentSearchParams.query.tags,
          localTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }
      );
    },
    onSettled(data, error, variables) {
      if (!data) return;

      setSearchResultsPending(false);
      if (data.status === 200 && data.data) {
        if (searchResultsContainerRef) {
          searchResultsContainerRef.scrollTop = 0;
        }
        if (data.data.length === 0 && variables.previous) {
          setDisablePreviousButton(true);
          setDisableNextButton(false);
          return;
        } else if (data.data.length === 0) {
          setDisableNextButton(true);
          setDisablePreviousButton(false);
          return;
        } else if (variables.cursorId !== 0) {
          setDisableNextButton(false);
          setDisablePreviousButton(false);
        }
        setSearchResults(data.data);
      } else {
        ModalUtils.handleGenericError(modalContext, data);
      }
    },
  });

  const handleSearchNextPage = useCallback(() => {
    if (disableNextButton || searchResults.length === 0) {
      return;
    }

    if (!searchMessageMutation.isPending) {
      searchMessageMutation.mutate({
        cursorId: searchResults[searchResults.length - 1].id,
        previous: false,
        searchOrder: currentSearchOrder,
      });
    }
  }, [searchMessageMutation, disableNextButton, currentSearchOrder]);

  const handleSearchPreviousPage = useCallback(() => {
    if (disablePreviousButton || searchResults.length === 0) {
      return;
    }

    if (!searchMessageMutation.isPending) {
      searchMessageMutation.mutate({
        cursorId: searchResults[0].id,
        previous: true,
        searchOrder: currentSearchOrder,
      });
    }
  }, [searchMessageMutation, disablePreviousButton, currentSearchOrder]);

  const handleResetPage = useCallback(
    (searchOrder: "OLD" | "NEW") => {
      if (searchOrder === currentSearchOrder) {
        return;
      }

      if (!searchMessageMutation.isPending) {
        setCurrentSeachOrder(searchOrder);
        setRefetchSearches(true);
        setDisableNextButton(false);
        setDisablePreviousButton(true);
      }
    },
    [searchMessageMutation, setCurrentSeachOrder, currentSearchOrder]
  );

  useEffect(() => {
    if (refetchSearches) {
      searchMessageMutation.mutate({
        cursorId: 0,
        previous: false,
        searchOrder: currentSearchOrder,
      });
      setRefetchSearches(false);
    }
  }, [currentSearchOrder, refetchSearches]);

  const isLightMode = useIsLightMode();
  return (
    <div
      ref={overlayRef}
      key={emojiSearchViewWidth + "_" + headerHeight}
      className={`h-[50vh] self-center bg-lime-700 shadow-lg rounded-md text-white
      overflow-y-scroll flex flex-col gap-1 p-2 absolute z-[10] top-0
      ${playExitAnimation ? "animate-fadeOutDown" : "animate-fadeInUp"}
     `}
      style={{
        width: emojiSearchViewWidth,
        top: headerHeight,
      }}
    >
      <div className="flex w-full mt-2 justify-end items-center gap-2 px-2 bg-transparent text-lime-400">
        <div
          onClick={() => handleResetPage("NEW")}
          className={`rounded-md p-2 cursor-pointer hover:bg-lime-600 transition ${
            currentSearchOrder === "NEW" ? "bg-lime-600" : "bg-transparent"
          }`}
        >
          New
        </div>
        <div
          onClick={() => handleResetPage("OLD")}
          className={`rounded-md p-2 cursor-pointer hover:bg-lime-600 transition ${
            currentSearchOrder === "OLD" ? "bg-lime-600" : "bg-transparent"
          }`}
        >
          Old
        </div>
      </div>
      <p className="font-bold text-lime-300">Search Results</p>
      <hr className="bg-lime-400 text-lime-400 border-lime-400 w-full" />

      {searchResultsPending ? (
        <div className="grid place-content-center w-full h-full">
          <div className="flex justify-center items-center text-lime-400 gap-2">
            <p>Cautiously aligning with your query...</p>
            <BounceLoader
              size={24}
              color={isLightMode ? "rgb(132,204,22)" : "rgb(163,230,53)"}
            />
          </div>
        </div>
      ) : (
        <div
          ref={setSearchResultsContainerRef}
          className="flex flex-col w-full h-full overflow-y-scroll"
        >
          {searchResults.length === 0 && (
            <div className="grid place-content-center w-full h-full text-lime-400">
              <div className="flex flex-col items-center justify-center mb-2 gap-2">
                <FaFeatherPointed size={48} />
                <p className="text-lime-400 font-bold">Tranquil Void...</p>
              </div>
            </div>
          )}
          {searchResults.map((searchResult) => {
            return (
              <div key={searchResult.id}>
                <ChatRecord
                  searchContent={currentSearchParams.query.content.trim()}
                  isSimplePreview={true}
                  record={searchResult}
                  currentChatRoom={currentChatRoom}
                  currentUser={currentUser}
                  handleNavigateToChatRecord={handleNavigateToChatRecord}
                  showJumpToMessageButton
                />
              </div>
            );
          })}
        </div>
      )}
      <div className="flex w-full text-lime-400 items-center justify-center gap-2 p-1 shadow-md">
        <div
          onClick={handleSearchPreviousPage}
          className={`
                ${
                  disablePreviousButton
                    ? "cursor-not-allowed bg-transparent"
                    : "cursor-pointer hover:bg-lime-600"
                }
                flex items-center w-[7rem] justify-center bg-transparent transition px-2 rounded-md`}
        >
          <MdOutlineKeyboardArrowLeft /> Previous
        </div>
        <div
          onClick={handleSearchNextPage}
          className={`
                ${
                  disableNextButton
                    ? "cursor-not-allowed bg-transparent"
                    : "cursor-pointer hover:bg-lime-600"
                }
                flex items-center w-[7rem] justify-center bg-transparent transition px-2 rounded-md`}
        >
          Next
          <MdOutlineKeyboardArrowRight />
        </div>
      </div>
    </div>
  );
}
