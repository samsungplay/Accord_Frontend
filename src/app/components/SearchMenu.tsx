import React, { useCallback, useEffect, useMemo, useState } from "react";
import AnimateHeight from "react-animate-height";
import { FaPlus } from "react-icons/fa";
import { ChatRoom } from "../types/ChatRoom";
import { User } from "../types/User";
import ProfileAvatar from "./ProfileAvatar";
import PrimaryCalendar from "./PrimaryCalendar";
import { format } from "date-fns";
import { Editor, Node, Range, Text, Transforms } from "slate";
import { ReactEditor } from "slate-react";

type SearchMenuType = {
  searchQuery: string;
  structuredQuery: { content: string; tags: string[] };
  currentChatRoom: ChatRoom;
  currentUser: User;
  editor: Editor;
};
export default function SearchMenu({
  searchQuery,
  currentChatRoom,
  currentUser,
  editor,
  structuredQuery,
}: SearchMenuType) {
  const searchOptions = useMemo(() => {
    return {
      "SEARCH OPTIONS": [
        ["from", "user"],
        ["mentions", "user"],
        ["has", "link, embed, or file"],
        ["before", "specific date"],
        ["during", "specific date"],
        ["after", "specific date"],
        ["pinned", "true or false"],
      ],
      "MESSAGE CONTAINS": [
        ["has", "link"],
        ["has", "embed"],
        ["has", "file"],
        ["has", "image"],
        ["has", "poll"],
        ["has", "video"],
        ["has", "sound"],
        ["has", "reply"],
      ],
    };
  }, []);
  const searchCriteria: { [key: string]: string[] } = useMemo(() => {
    return {
      "SEARCH OPTIONS": ["header", "nonempty", "showdefault"],
      "MESSAGE CONTAINS": ["value", "nonempty"],
    };
  }, []);

  const [filteredSearchOptions, setFilteredSearchOptions] = useState<{
    [key: string]: string[][];
  }>({
    "SEARCH OPTIONS": [
      ["from", "user"],
      ["mentions", "user"],
      ["has", "link, embed, or file"],
      ["before", "specific date"],
      ["after", "specific date"],
      ["pinned", "true or false"],
    ],
  });

  const handleFilterSearchOptions = useCallback(
    (query: string) => {
      const searchOptionsFiltered: { [key: string]: string[][] } = {};

      const originalQuery = query;
      //when searching for search options, only consider the current block of text
      if (query.lastIndexOf(" ") !== -1) {
        query = query.substring(query.lastIndexOf(" ") + 1);
      }

      //filter by section headers, option headers, and option values
      Object.entries(searchOptions).forEach(([headers, options]) => {
        if (
          (searchCriteria[headers].includes("nonempty") && query.length > 0) ||
          !searchCriteria[headers].includes("nonempty") ||
          (originalQuery.length === 0 &&
            searchCriteria[headers].includes("showdefault"))
        ) {
          if (headers.includes(query)) {
            searchOptionsFiltered[headers] = options;
          } else {
            const queriedOptionsByHeader = options.filter((option) =>
              option[0].includes(query)
            );
            const queriedOptionsByValue = options.filter((option) =>
              option[1].includes(query)
            );

            if (
              queriedOptionsByHeader.length > 0 &&
              searchCriteria[headers].includes("header")
            ) {
              searchOptionsFiltered[headers] = queriedOptionsByHeader;
            }
            if (
              queriedOptionsByValue.length > 0 &&
              searchCriteria[headers].includes("value")
            ) {
              searchOptionsFiltered[headers] = queriedOptionsByValue;
            }
          }
        }
      });

      //search query menus
      if (query.startsWith("from:") || query.startsWith("mentions:")) {
        let subQuery = "";
        if (query.startsWith("from:") && query !== "from:") {
          subQuery = query.substring(query.indexOf(":") + 1);
        } else if (query.startsWith("mentions") && query !== "mentions:") {
          subQuery = query.substring(query.indexOf(":") + 1);
        }

        let participants: User[] = [];

        if (subQuery.length > 0) {
          participants = currentChatRoom.participants.filter((user) => {
            if (user.id === currentUser.id) {
              user = currentUser;
            }

            return (
              user.nickname.includes(subQuery) ||
              (user.username + "#" + user.id).includes(subQuery)
            );
          });
        } else {
          participants = currentChatRoom.participants.map((user) =>
            user.id === currentUser.id ? currentUser : user
          );
        }

        if (participants.length > 0 || "everyone".includes(subQuery)) {
          const fromOptions: string[][] = [];
          participants.forEach((user) => {
            fromOptions.push(["", user.id.toString()]);
          });
          const mentionOptions: string[][] = [];
          participants.forEach((user) => {
            mentionOptions.push(["", user.id.toString()]);
          });
          if ("everyone".includes(subQuery)) {
            mentionOptions.push(["", "everyone"]);
          }

          if (query.startsWith("from:"))
            searchOptionsFiltered["FROM USER"] = fromOptions;
          else searchOptionsFiltered["MENTIONS USER"] = mentionOptions;
        }
      } else if (query.startsWith("has:")) {
        let subQuery = "";
        if (query !== "has:") {
          subQuery = query.substring(query.indexOf(":") + 1);
        }

        const optionValues = searchOptions["MESSAGE CONTAINS"].map((value) => [
          "",
          value[1],
        ]);

        if (subQuery.length > 0) {
          searchOptionsFiltered["MESSAGE CONTAINS"] = optionValues.filter(
            (val) => val[1].includes(subQuery)
          );
        } else {
          searchOptionsFiltered["MESSAGE CONTAINS"] = optionValues;
        }
      } else if (query.startsWith("pinned:")) {
        let subQuery = "";
        if (query !== "pinned:") {
          subQuery = query.substring(query.indexOf(":") + 1);
        }

        const optionValues = [
          ["", "true"],
          ["", "false"],
        ];

        if (subQuery.length > 0) {
          searchOptionsFiltered["PINNED OPTIONS"] = optionValues.filter((val) =>
            val[1].includes(subQuery)
          );
        } else {
          searchOptionsFiltered["PINNED OPTIONS"] = optionValues;
        }
      } else if (
        query.trimEnd() === "during:" ||
        query.trimEnd() === "before:" ||
        query.trimEnd() === "after:"
      ) {
        //show calendar
        searchOptionsFiltered["CALENDAR"] = [["", ""]];
      }

      //filter by username
      if (query.length > 0) {
        const matchingParticipants = currentChatRoom.participants.filter(
          (user) => {
            if (user.id === currentUser.id) {
              user = currentUser;
            }

            return (
              user.nickname.includes(query) ||
              (user.username + "#" + user.id).includes(query)
            );
          }
        );

        if (matchingParticipants.length > 0 || "everyone".includes(query)) {
          const fromOptions: string[][] = [];
          matchingParticipants.forEach((user) => {
            fromOptions.push(["from", user.id.toString()]);
          });
          const mentionOptions: string[][] = [];
          matchingParticipants.forEach((user) => {
            mentionOptions.push(["mentions", user.id.toString()]);
          });

          if ("everyone".includes(query)) {
            mentionOptions.push(["mentions", "everyone"]);
          }

          if (fromOptions.length)
            searchOptionsFiltered["FROM USER"] = fromOptions;
          searchOptionsFiltered["MENTIONS USER"] = mentionOptions;
        }
      }
      //filter by date with some pre defined date strings
      if (query.length > 0) {
        const queryLowered = query.toLowerCase();

        const months = [
          "january",
          "february",
          "march",
          "april",
          "may",
          "june",
          "july",
          "august",
          "september",
          "october",
          "november",
          "december",
        ];
        const years = [];
        for (let i = 2024; i <= new Date().getFullYear(); i++)
          years.push(i.toString());

        const monthString = months.filter((month) =>
          month.toLowerCase().includes(queryLowered)
        );
        const yearString = years.filter((year) => year.includes(queryLowered));

        if (monthString.length > 0 || yearString.length > 0) {
          if (monthString.length > 0) {
            searchOptionsFiltered["DATES"] = [
              ["before", monthString[0]],
              ["during", monthString[0]],
              ["after", monthString[0]],
            ];
          } else {
            searchOptionsFiltered["DATES"] = [
              ["before", yearString[0]],
              ["during", yearString[0]],
              ["after", yearString[0]],
            ];
          }
        }
      }

      setFilteredSearchOptions(searchOptionsFiltered);
    },
    [searchOptions, searchCriteria]
  );

  useEffect(() => {
    handleFilterSearchOptions(searchQuery);
  }, [searchQuery]);

  const [monthName, setMonthName] = useState(
    Math.random() > 0.5 ? format(new Date(), "MMMM").toLowerCase() : "week"
  );

  const deleteCurrentTextBlock = useCallback((editor: Editor) => {
    if (editor.selection && Range.isCollapsed(editor.selection)) {
      const currentPath = editor.selection.anchor.path;
      const currentNode = Node.get(editor, currentPath);

      if (Text.isText(currentNode)) {
        const currentOffset = editor.selection.anchor.offset;
        const precedingBlankIndex = currentNode.text.lastIndexOf(
          " ",
          currentOffset - 1
        );

        Transforms.delete(editor, {
          at: {
            anchor: {
              path: currentPath,
              offset: precedingBlankIndex + 1,
            },
            focus: {
              path: currentPath,
              offset: currentOffset,
            },
          },
        });
      }
    }
  }, []);

  const filteredSearchOptionsEntries = useMemo(() => {
    return Object.entries(filteredSearchOptions);
  }, [filteredSearchOptions]);

  useEffect(() => {
    if (Math.random() > 0.5) {
      setMonthName(format(new Date(), "MMMM").toLowerCase());
    } else {
      setMonthName("week");
    }
  }, [filteredSearchOptionsEntries]);
  return (
    <div
      id="searchMenu"
      className="flex flex-col gap-2 bg-lime-700 w-[15rem] sm:w-[15rem] md:w-[20rem] lg:w-[25rem] rounded-md shadow-md
      overflow-hidden max-h-[50vh]"
    >
      <AnimateHeight
        height={structuredQuery.content.length > 0 ? "auto" : 0}
        delay={0}
        duration={500}
        className="flex-shrink-0"
      >
        <div
          className="w-full bg-lime-500 p-2 flex-shrink-0 rounded-t-md overflow-hidden text-white"
          style={{}}
        >
          <div className="whitespace-nowrap">SEARCH MESSAGE CONTAINING:</div>

          <div className="font-bold ml-1 whitespace-nowrap overflow-hidden text-ellipsis">
            {structuredQuery.content.length < 2 ? (
              <p className="text-lime-600">Type at least 2 characters</p>
            ) : (
              structuredQuery.content
            )}
          </div>
        </div>
      </AnimateHeight>
      <div
        className={`${
          filteredSearchOptionsEntries.length === 0 && "hidden"
        } p-2 flex flex-col gap-2 overflow-y-scroll`}
      >
        {filteredSearchOptionsEntries.map(([header, options]) => {
          return (
            <div key={header} className="">
              <div className="text-lime-300 text-sm font-bold p-2">
                {header} <br />
                {header.includes("USER") && (
                  <span className="text-xs font-normal">
                    PRO TIP: Type full username with id for more accurate
                    results
                  </span>
                )}
              </div>
              <hr className="h-[0.1rem] bg-lime-300 text-lime-300 border-lime-300 mb-2" />
              {options.map((option) => {
                if (header.includes("MENTIONS") && option[1] === "everyone") {
                  return (
                    <div
                      onClick={() => {
                        deleteCurrentTextBlock(editor);
                        editor.insertText("everyone");
                        ReactEditor.focus(editor);
                      }}
                      key={option[0] + option[1]}
                      className="flex w-full items-center hover:bg-lime-500 rounded-md cursor-pointer hover:text-white text-lime-300 transition p-2 gap-2 overflow-x-scroll"
                    >
                      everyone
                    </div>
                  );
                } else if (header.includes("USER")) {
                  let targetUser: User = currentUser;
                  if (option[1] !== currentUser.id.toString()) {
                    const users = currentChatRoom.participants.filter(
                      (user) => user.id.toString() === option[1]
                    );
                    targetUser = users[0];
                  }

                  return (
                    <div
                      key={option[0] + option[1]}
                      onClick={() => {
                        deleteCurrentTextBlock(editor);
                        editor.insertText(
                          targetUser.username + "#" + targetUser.id
                        );
                        ReactEditor.focus(editor);
                      }}
                      className="flex w-full items-center hover:bg-lime-500 rounded-md cursor-pointer
                        hover:text-white text-lime-300 transition p-2 gap-2 overflow-x-scroll"
                    >
                      <p className="text-lime-600">
                        {option[0]}
                        {option[0].length > 0 ? ":" : ""}
                      </p>
                      <ProfileAvatar user={targetUser} size={24} />
                      <p>
                        {targetUser.nickname.length > 0
                          ? targetUser.nickname
                          : targetUser.username}
                      </p>
                      <p className="text-lime-600 hidden sm:block">
                        {targetUser.username}#{targetUser.id}
                      </p>
                    </div>
                  );
                } else if (header === "CALENDAR") {
                  //display calendar
                  return (
                    <div
                      key={"Calendar"}
                      className="flex flex-col w-full items-center justify-center transition p-2"
                    >
                      <PrimaryCalendar
                        setMonthName={setMonthName}
                        onClickDay={(value) => {
                          const dateString = format(value, "yyyy-MM-dd");
                          editor.insertText(dateString);
                          ReactEditor.focus(editor);
                        }}
                      />

                      <div className="mt-2 text-lime-400">
                        You can also type{" "}
                        <span
                          onClick={() => {
                            editor.insertText(monthName);
                            ReactEditor.focus(editor);
                          }}
                          className="px-2 ml-2 bg-lime-600 text-white rounded-md cursor-pointer hover:bg-opacity-70 transition"
                        >
                          {monthName}
                        </span>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div
                      key={option[0] + "_" + option[1]}
                      onClick={() => {
                        if (
                          (option[0] === "before" ||
                            option[0] === "after" ||
                            option[0] === "during") &&
                          option[1] !== "specific date"
                        ) {
                          deleteCurrentTextBlock(editor);
                          editor.insertText(option[0] + ":");
                          editor.insertText(option[1]);
                        } else if (option[0].length > 0) {
                          deleteCurrentTextBlock(editor);
                          editor.insertText(option[0] + ":");
                        } else {
                          deleteCurrentTextBlock(editor);
                          editor.insertText(option[1]);
                        }
                        ReactEditor.focus(editor);
                      }}
                      className="flex w-full items-center hover:bg-lime-500 rounded-md cursor-pointer
                          hover:text-white text-lime-300 transition p-2"
                    >
                      <p>
                        <b>
                          {option[0]}
                          {option[0].length > 0 ? ":" : ""}
                        </b>{" "}
                        {option[1]}
                      </p>
                      <div className="ml-auto">
                        <FaPlus />
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
