import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FaSearch } from "react-icons/fa";
import { Popover } from "react-tiny-popover";
import SearchMenu from "./SearchMenu";
import { useOnClickOutside } from "usehooks-ts";
import { ChatRoom } from "../types/ChatRoom";
import { User } from "../types/User";
import {
  Editable,
  ReactEditor,
  RenderElementProps,
  RenderLeafProps,
  Slate,
  withReact,
} from "slate-react";
import {
  createEditor,
  Descendant,
  Editor,
  Element,
  Node,
  NodeEntry,
  Path,
  Range,
  Text,
  Transforms,
} from "slate";
import { isValid, parse } from "date-fns";
import useNextRenderSetState from "../hooks/useNextRenderSetState";
import { useMutation } from "@tanstack/react-query";
import api from "../api/api";
import { ChatRecordType } from "../types/ChatRecordType";
import ModalUtils from "../util/ModalUtil";
import ModalContext from "../contexts/ModalContext";
import ContentDisplayContext from "../contexts/ContentDisplayContext";

type ChatSearchUIType = {
  currentChatRoom: ChatRoom;
  currentUser: User;
  searchBarOpen: boolean;
  setSearchBarOpen: Dispatch<SetStateAction<boolean>>;
  setSearchResults: Dispatch<SetStateAction<ChatRecordType[]>>;
  setSearchResultsPending: Dispatch<SetStateAction<boolean>>;
  setSearchOverlayOpen: Dispatch<SetStateAction<boolean>>;
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
export default function ChatSearchUI({
  currentChatRoom,
  currentUser,
  searchBarOpen,
  setSearchBarOpen,
  setSearchResults,
  setSearchResultsPending,
  setSearchOverlayOpen,
  setSearchParams,
}: ChatSearchUIType) {
  const searchInputContainerRef = useRef<HTMLDivElement>(null);
  const validPrefixes = useMemo(() => {
    return [
      "from:",
      "has:",
      "before:",
      "during:",
      "after:",
      "pinned:",
      "mentions:",
    ];
  }, []);
  const validSuffixes = useMemo(() => {
    const defaults = [
      ["has:", "link"],
      ["has:", "embed"],
      ["has:", "file"],
      ["has:", "image"],
      ["has:", "poll"],
      ["has:", "video"],
      ["has:", "sound"],
      ["has:", "reply"],
      ["pinned:", "true"],
      ["pinned:", "false"],
      ["mentions:", "everyone"],
    ];

    return defaults;
  }, [currentUser]);

  const renderLeaf = useCallback((prop: RenderLeafProps) => {
    return (
      <span
        {...prop.attributes}
        className={`
    ${prop.leaf["username"] && "rounded-sm px-1 text-lime-300 bg-lime-700"}`}
      >
        {prop.children}
      </span>
    );
  }, []);

  const testValidDate = useCallback((e: string) => {
    const parsed = parse(e, "yyyy-MM-dd", new Date());
    return isValid(parsed) && parsed.getFullYear() >= 2020;
  }, []);

  const validDateRegexes = useMemo(() => {
    const regexes: RegExp[] = [];

    regexes.push(new RegExp("^[\\s]*week$"));
    //year-month is a valid date ex). 2024-03 or 2024-3
    regexes.push(new RegExp("^[\\s]*2\\d\\d\\d\\-(0?[1-9]|1[0-2])$"));
    //years alone are valid date ex). 2024
    regexes.push(new RegExp("^[\\s]*2\\d\\d\\d$"));
    //other date formats are tested by testValidDate method
    //month names are valid dates
    regexes.push(new RegExp("^[\\s]*january$"));
    regexes.push(new RegExp("^[\\s]*february$"));
    regexes.push(new RegExp("^[\\s]*march$"));
    regexes.push(new RegExp("^[\\s]*april$"));
    regexes.push(new RegExp("^[\\s]*may$"));
    regexes.push(new RegExp("^[\\s]*june$"));
    regexes.push(new RegExp("^[\\s]*july$"));
    regexes.push(new RegExp("^[\\s]*august$"));
    regexes.push(new RegExp("^[\\s]*september$"));
    regexes.push(new RegExp("^[\\s]*october$"));
    regexes.push(new RegExp("^[\\s]*november$"));
    regexes.push(new RegExp("^[\\s]*october$"));

    return regexes;
  }, []);

  const validUsernameRegexes = useMemo(() => {
    const regexes: RegExp[] = [];

    currentChatRoom.participants.forEach((participant) => {
      if (participant.id === currentUser.id) {
        participant = currentUser;
      }

      const accounted: Set<string> = new Set();

      if (
        participant.nickname.length > 0 &&
        !accounted.has(participant.nickname)
      ) {
        regexes.push(new RegExp("^[\\s]*" + participant.nickname + "$"));
        accounted.add(participant.nickname);
      }

      if (!accounted.has(participant.username)) {
        regexes.push(new RegExp("^[\\s]*" + participant.username + "$"));
        accounted.add(participant.username);
      }

      regexes.sort((a, b) => b.source.length - a.source.length);

      regexes.push(
        new RegExp(
          "^[\\s]*" + participant.username + "#" + participant.id + "$"
        )
      );
    });

    return regexes;
  }, [currentChatRoom, currentUser]);

  const [decorated, setDecorated] = useState(false);

  const nextRenderSetDecorate = useNextRenderSetState(setDecorated);

  const decorate = useCallback((entry: NodeEntry) => {
    const ranges: Range[] = [];

    if (!Text.isText(entry[0])) {
      return ranges;
    }

    let currentText = entry[0].text;
    //consider only the first block of text
    const firstNonBlankIndex =
      currentText.length - currentText.trimStart().length;
    const blank = currentText.indexOf(" ", firstNonBlankIndex + 1);
    if (blank > 0) {
      currentText = currentText.substring(0, blank);
    }

    //valid date strings : month name, week, year, or any valid full date string

    if (!Path.hasPrevious(entry[1])) {
      nextRenderSetDecorate(() => setDecorated(true));

      return ranges;
    }

    const previousSibling = Node.get(editor, Path.previous(entry[1]));
    if (!Element.isElement(previousSibling)) {
      return ranges;
    }

    if (
      previousSibling.type === "search_tag" &&
      (previousSibling.content === "from:" ||
        previousSibling.content === "mentions:")
    ) {
      for (const regex of validUsernameRegexes) {
        if (regex.test(currentText)) {
          ranges.push({
            username: true,
            anchor: {
              path: entry[1],
              offset: 0,
            },
            focus: {
              path: entry[1],
              offset: currentText.length,
            },
          });

          leafDataRef.current.set(entry[1].join(","), currentText.length);

          break;
        }
      }
    } else if (
      previousSibling.type === "search_tag" &&
      (previousSibling.content === "during:" ||
        previousSibling.content === "before:" ||
        previousSibling.content === "after:")
    ) {
      for (const regex of validDateRegexes) {
        if (regex.test(currentText) || testValidDate(currentText.trimStart())) {
          ranges.push({
            username: true,
            anchor: {
              path: entry[1],
              offset: 0,
            },
            focus: {
              path: entry[1],
              offset: currentText.length,
            },
          });
          leafDataRef.current.set(entry[1].join(","), currentText.length);

          break;
        }
      }
    }

    nextRenderSetDecorate(() => setDecorated(true));

    return ranges;
  }, []);
  const withConfiguration = useCallback((editor: ReactEditor) => {
    const { insertText, isInline, isElementReadOnly, apply } = editor;

    editor.isInline = (element) => {
      return element.type === "search_tag" || isInline(element);
    };

    editor.isElementReadOnly = (element) => {
      return element.type === "search_tag" || isElementReadOnly(element);
    };

    editor.apply = (operation) => {
      if (operation.type === "remove_node") {
        if (
          Element.isElement(operation.node) &&
          operation.node.type === "search_tag"
        ) {
          setTimeout(() => {
            Transforms.move(editor, { unit: "character", distance: 1 });
          }, 100);
        }
      }
      apply(operation);
    };

    //converting search tag syntaxes to actual search tag elements
    editor.insertText = (text) => {
      insertText(text);

      let hasSearchTag = false;

      const start = Editor.start(editor, []);
      const end = Editor.end(editor, []);
      const range = Editor.range(editor, start, end);
      let entries = [...Node.texts(editor, range)];
      entries = entries.reverse();

      //first, process the valid prefixes
      for (const [node, path] of entries) {
        if (path.length > 2) continue;
        const { text } = node;

        const validEntries: [string, number][] = [];
        for (const validPrefix of validPrefixes) {
          let offset = text.length - 1;
          while (offset >= 0) {
            const index = text.lastIndexOf(validPrefix, offset);
            if (index === -1) break;
            validEntries.push([validPrefix, index]);
            offset = index - 1;
          }
        }
        validEntries.sort((a, b) => b[1] - a[1]);
        for (const [validPrefix, index] of validEntries) {
          const startPoint = { path, offset: index };
          const endPoint = { path, offset: index + validPrefix.length };

          const targetRange = { anchor: startPoint, focus: endPoint };

          Transforms.delete(editor, { at: targetRange });

          const searchTag = {
            type: "search_tag",
            children: [{ text: validPrefix }],
            content: validPrefix,
          };
          //   console.log("replace");
          Transforms.insertNodes(editor, searchTag, { at: startPoint });
          hasSearchTag = true;
        }
      }
      //then process the conditional valid suffixes
      entries = [...Node.texts(editor, range)];
      entries = entries.reverse();
      for (const [node, path] of entries) {
        if (path.length > 2) continue;
        const { text } = node;

        const validEntries: [string[], number][] = [];
        for (const validSuffix of validSuffixes) {
          let offset = text.length - 1;
          while (offset >= 0) {
            const index = text.lastIndexOf(validSuffix[1], offset);
            if (index === -1) break;
            validEntries.push([validSuffix, index]);
            offset = index - 1;
          }
        }
        validEntries.sort((a, b) => b[1] - a[1]);

        for (const [validSuffix, index] of validEntries) {
          //first, check if the valid prefix is present
          if (!Path.hasPrevious(path)) {
            continue;
          }
          const previousSibling = Node.get(editor, Path.previous(path));

          if (!Element.isElement(previousSibling)) {
            continue;
          }

          if (previousSibling.type !== "search_tag") {
            continue;
          }

          if (previousSibling.content !== validSuffix[0]) {
            continue;
          }

          const startPoint = { path, offset: index };
          const endPoint = {
            path,
            offset: index + validSuffix[1].length,
          };

          const targetRange = { anchor: startPoint, focus: endPoint };

          Transforms.delete(editor, { at: targetRange });

          const searchTag = {
            type: "search_tag",
            children: [{ text: validSuffix[1] }],
            content: validSuffix[1],
          };
          //   console.log("replace");
          Transforms.insertNodes(editor, searchTag, { at: startPoint });
          hasSearchTag = true;
        }
      }

      if (hasSearchTag) {
        Transforms.move(editor, { unit: "character", distance: 1 });
        Transforms.move(editor, { unit: "character", distance: 1 });
      }
    };

    return editor;
  }, []);

  const initialValue: Descendant[] = [
    { type: "paragraph", children: [{ text: "" }] },
  ];

  const SearchTag = ({ attributes, children }: RenderElementProps) => {
    return (
      <span
        {...attributes}
        contentEditable={false}
        className="rounded-sm px-1 text-lime-300 bg-lime-700"
      >
        {children}
      </span>
    );
  };

  const renderElement = useCallback(
    ({ attributes, children, element }: RenderElementProps) => {
      switch (element.type) {
        case "search_tag":
          return (
            <SearchTag attributes={attributes} element={element}>
              {children}
            </SearchTag>
          );
        default:
          return <p {...attributes}>{children}</p>;
      }
    },
    []
  );

  const leafDataRef = useRef<Map<string, number>>(new Map());

  const editor = useMemo(() => {
    return withConfiguration(withReact(createEditor()));
  }, []);

  const getCurrentStructuredQuery = useCallback(() => {
    //TODO: return a query in form {content: string, tags: string[]}

    const start = Editor.start(editor, []);
    const end = Editor.end(editor, []);
    const range = Editor.range(editor, start, end);
    const tags: string[] = [];
    let content = "";
    let currentBuildingTag = "";

    const entries = [...Node.texts(editor, range)];

    for (const [node, path] of entries) {
      const parent = Node.parent(editor, path);

      if (
        Element.isElement(parent) &&
        parent.type === "search_tag" &&
        parent.content
      ) {
        if (parent.content.includes(":")) {
          currentBuildingTag = parent.content.trim();
        } else {
          currentBuildingTag += parent.content.trim();

          if (currentBuildingTag.includes(":")) tags.push(currentBuildingTag);
        }
      } else if (!Element.isElement(parent) || parent.type !== "search_tag") {
        const pathKey = path.join(",");

        if (leafDataRef.current.has(pathKey)) {
          const offset = leafDataRef.current.get(pathKey)!;
          if (currentBuildingTag.includes(":")) {
            currentBuildingTag += node.text.substring(0, offset).trim();
            tags.push(currentBuildingTag);
            currentBuildingTag = "";
          }
          if (offset < node.text.length) content += node.text.substring(offset);
        } else {
          content += node.text;
        }
      }
    }
    // console.log({ content, tags });

    return {
      content,
      tags,
    };
  }, []);

  const getCurrentQuery = useCallback(() => {
    if (Range.isCollapsed(editor.selection)) {
      const currentPath = editor.selection.anchor.path;
      const currentElement = Node.get(editor, currentPath);
      if (Path.hasPrevious(currentPath) && Text.isText(currentElement)) {
        const previousSibling = Node.get(editor, Path.previous(currentPath));
        if (
          Element.isElement(previousSibling) &&
          previousSibling.type === "search_tag" &&
          previousSibling.content &&
          previousSibling.content.includes(":")
        ) {
          return previousSibling.content + currentElement.text.trim();
        } else {
          return currentElement.text;
        }
      } else if (Text.isText(currentElement)) {
        return currentElement.text;
      }
    }

    return "";
  }, [editor]);

  useOnClickOutside(searchInputContainerRef, (e) => {
    const current = e.target as HTMLElement;
    const parent = current.parentNode as HTMLElement;
    const grandParent = parent.parentNode as HTMLElement;
    const grandGrandParent = parent.parentNode as HTMLElement;

    let currentNode = current;
    let i = 0;

    while (currentNode !== undefined && i < 30) {
      if (currentNode && currentNode.id === "searchMenu") {
        return;
      }

      if (!currentNode) break;

      currentNode = currentNode.parentNode as HTMLElement;
      i++;
    }

    if (
      current.id === "searchBarOpener" ||
      parent.id === "searchBarOpener" ||
      grandParent.id === "searchBarOpener" ||
      grandGrandParent.id === "searchBarOpener"
    ) {
      return;
    }

    setSearchBarOpen(false);
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [onChangeTrigger, setOnChangeTrigger] = useState(0);

  const searchQueryDeferred = useDeferredValue(searchQuery);
  const [structuredQuery, setStructuredQuery] = useState<{
    content: string;
    tags: string[];
  }>({ content: "", tags: [] });
  const structuredQueryDeferred = useDeferredValue(structuredQuery);

  useEffect(() => {
    if (decorated) {
      // console.log(
      //   "this code is invoked onchange() but after decorate function runs."
      // );
      const structuredQuery = getCurrentStructuredQuery();
      setStructuredQuery(structuredQuery);

      setDecorated(false);
      leafDataRef.current.clear();
    }
  }, [decorated, onChangeTrigger]);

  useEffect(() => {
    if (searchBarOpen) ReactEditor.focus(editor);
  }, [searchBarOpen, editor]);

  const modalContext = useContext(ModalContext);
  const contentDisplayContext = useContext(ContentDisplayContext);
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
      const [nsfwFlag, spamFlag] = contentDisplayContext?.getContentFilterFlags(
        currentChatRoom
      ) ?? ["ANY", "ANY"];

      return api.post<ChatRecordType[]>(
        `/chat/message/search/${currentChatRoom.id}?nsfw=${nsfwFlag}&spam=${spamFlag}`,
        {
          cursorId,
          previous,
          order: searchOrder,
          content: structuredQueryDeferred.content,
          tags: structuredQueryDeferred.tags,
          localTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }
      );
    },
    onSettled(data, error, variables) {
      if (!data) return;
      setSearchResultsPending(false);
      if (data.status === 200 && data.data) {
        setSearchResults(data.data);
        setSearchParams({
          query: structuredQueryDeferred,
          searchOrder: variables.searchOrder,
        });
      } else {
        ModalUtils.handleGenericError(modalContext, data);
      }
    },
  });
  const handleSearchChatMessage = useCallback(
    (cursorId: number = 0, searchOrder: "NEW" | "OLD", previous: boolean) => {
      if (
        structuredQueryDeferred.content.trim().length === 0 &&
        structuredQueryDeferred.tags.length === 0
      ) {
        return;
      }

      if (structuredQueryDeferred.tags.length > 10) {
        ModalUtils.openGenericModal(
          modalContext,
          "Oof.",
          "You have too many filters set. Try simplifying them!",
          undefined,
          undefined,
          undefined,
          undefined,
          true
        );
        return;
      }

      if (structuredQueryDeferred.content.length > 255) {
        ModalUtils.openGenericModal(
          modalContext,
          "Oof.",
          "Your search query is too long!",
          undefined,
          undefined,
          undefined,
          undefined,
          true
        );
        return;
      }

      if (structuredQueryDeferred.content.length < 2) {
        ModalUtils.openGenericModal(
          modalContext,
          "Oof.",
          "Your search query is too short - please type at least 2 characters!",
          undefined,
          undefined,
          undefined,
          undefined,
          true
        );
        return;
      }

      if (!searchMessageMutation.isPending) {
        setSearchResultsPending(true);
        setSearchOverlayOpen(true);
        searchMessageMutation.mutate({
          cursorId,
          searchOrder,
          previous,
        });
      }
    },
    [structuredQueryDeferred, searchMessageMutation]
  );
  return (
    <div ref={searchInputContainerRef}>
      <Popover
        isOpen={searchBarOpen}
        positions={["bottom"]}
        align="center"
        containerStyle={{
          zIndex: "80",
        }}
        content={
          <SearchMenu
            searchQuery={searchQueryDeferred}
            currentChatRoom={currentChatRoom}
            currentUser={currentUser}
            editor={editor}
            structuredQuery={structuredQueryDeferred}
          />
        }
      >
        <div
          style={{
            borderRadius: "0 0 0.375rem 0.375rem",
          }}
          className={`absolute w-[15rem] transition-all duration-300 sm:w-[15rem] md:w-[20rem] lg:w-[25rem]
                      ${
                        searchBarOpen
                          ? "top-full opacity-100 z-[70]"
                          : "top-0 opacity-0 z-[-10]"
                      } origin-right right-0 flex gap-2 items-center p-2 shadow-md bg-lime-400 text-lime-600`}
        >
          <div className="mt-1">
            <FaSearch size={24} />
          </div>

          <Slate
            editor={editor}
            initialValue={initialValue}
            onChange={() => {
              setOnChangeTrigger(Math.random());
              setSearchQuery(getCurrentQuery());
            }}
            onSelectionChange={() => {
              setSearchQuery(getCurrentQuery());
            }}
          >
            <div className="bg-lime-600 focus:bg-lime-600 hover:bg-lime-600 overflow-x-scroll overflow-y-scroll max-h-[4rem] w-full whitespace-nowrap rounded-md transition caret-lime-300">
              <Editable
                decorate={decorate}
                renderElement={renderElement}
                renderLeaf={renderLeaf}
                className="focus:outline-none caret-lime-300 rounded-md max-w-[100%] overflow-x-scroll whitespace-nowrap p-2 focus:bg-lime-600 transition text-lime-300"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearchChatMessage(0, "NEW", false);
                    setSearchBarOpen(false);
                  }
                }}
              />
            </div>
          </Slate>
        </div>
      </Popover>
    </div>
  );
}
