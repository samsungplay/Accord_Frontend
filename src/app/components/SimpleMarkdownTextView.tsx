import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import {
  Slate,
  Editable,
  RenderLeafProps,
  ReactEditor,
  withReact,
  RenderElementProps,
} from "slate-react";
import EmojiChatComponent from "./EmojiChatComponent";
import SpoilerChatComponent from "./SpoilerChatComponent";
import {
  Transforms,
  createEditor,
  Descendant,
  Editor,
  NodeEntry,
  Element,
  Text,
  Range,
} from "slate";
import { CustomText } from "../types/Editor";
import Constants from "../constants/Constants";
import CodeBlock from "./CodeBlock";

//logic is the same as ChatRecord, but note this does not support mention tags
export default function SimpleMarkdownTextView({ text }: { text: string }) {
  useLayoutEffect(() => {
    const handler = (e: StorageEvent | undefined) => {
      if (e && e.key === "underlineLinks") {
        setUnderlineLinks(e.newValue === "yes");
        editor.onChange();
      }
    };

    handler(undefined);
    window.addEventListener("storage", handler);

    return () => {
      window.removeEventListener("storage", handler);
    };
  }, []);

  const [underlineLinks, setUnderlineLinks] = useState(
    (localStorage.getItem("underlineLinks") ?? "yes") === "yes"
  );

  useEffect(() => {
    const point = { path: [0, 0], offset: 0 };
    editor.selection = { anchor: point, focus: point };
    const lines = text.split("\n") || [""];

    editor.children = [
      {
        type: "paragraph",
        children: [{ text: "" }],
      },
    ];

    for (let i = 0; i < lines.length; i++) {
      Transforms.insertNodes(
        editor,
        {
          type: "paragraph",
          children: [
            {
              text: lines[i],
            },
          ],
        },
        {
          at: [editor.children.length - 1],
        }
      );
    }
  }, [text]);

  const renderLeaf = useCallback(
    (props: RenderLeafProps) => {
      return props.leaf["editmark"] ? (
        <span
          style={{
            fontSize: 0.75 * (12 + (100.0 / 100.0) * (24 - 12)) + "px",
          }}
          className="text-lime-300 ml-2"
        >
          (edited)
        </span>
      ) : (
        <span
          {...props.attributes}
          className={`
              ${props.leaf["searchcontent"] ? "bg-lime-300" : ""}
                    ${
                      props.leaf["url"] && underlineLinks
                        ? "text-blue-500 transition hover:text-blue-400 underline cursor-pointer"
                        : ""
                    }
                    ${props.leaf["greyed"] ? "hidden" : ""}
                    ${props.leaf["bold"] ? "font-bold" : ""} ${
            props.leaf["italic"] && "italic"
          }
                    ${
                      props.leaf["code"] &&
                      "font-mono bg-lime-400 text-lime-700 rounded-md py-2"
                    }
                    ${
                      props.leaf["blockquote"] &&
                      "border-l-4 border-lime-400 py-2"
                    }
                    
                    ${props.leaf["underline"] && "underline"}
                    ${props.leaf["strikethrough"] && "line-through"}
                    ${props.leaf["subtext"] && "text-lime-700"}
                    ${
                      props.leaf["maskedlink"] &&
                      underlineLinks &&
                      "text-blue-500 transition hover:text-blue-400 underline cursor-pointer"
                    }
                    ${
                      props.leaf["list"] !== undefined &&
                      (props.leaf["list"] as unknown as number) === 0 &&
                      "before:content-['•'] before:mr-[0.25rem]"
                    }
                    ${
                      props.leaf["list"] !== undefined &&
                      (props.leaf["list"] as unknown as number) > 0 &&
                      "before:content-['○'] before:mr-[0.25rem]"
                    }
                    whitespace-pre-wrap
                    `}
          style={{
            paddingLeft:
              props.leaf["list"] !== undefined
                ? `${(props.leaf["list"] as unknown as number) * 0.5 + 0.5}rem`
                : props.leaf["blockquote"]
                ? "1rem"
                : "0rem",

            fontSize:
              props.leaf["subtext"] !== undefined
                ? 0.75 * (12 + (100.0 / 100.0) * (24 - 12)) + "px"
                : props.leaf["heading3"] !== undefined
                ? 1.25 * (12 + (100.0 / 100.0) * (24 - 12)) + "px"
                : props.leaf["heading2"] !== undefined
                ? 1.5 * (12 + (100.0 / 100.0) * (24 - 12)) + "px"
                : props.leaf["heading1"] !== undefined
                ? 1.875 * (12 + (100.0 / 100.0) * (24 - 12)) + "px"
                : "inherit",
          }}
          onClick={
            props.leaf["maskedlink"] || props.leaf["url"]
              ? () => {
                  const link = document.createElement("a");
                  link.href = props.leaf["maskedlink"] ?? props.leaf["url"];
                  link.target = "_blank";
                  link.click();
                }
              : undefined
          }
        >
          {props.leaf["emoji"] ? (
            <EmojiChatComponent
              code={props.leaf["emoji"]}
              size={props.leaf["emojisize"] || "1.5em"}
            />
          ) : props.leaf["spoiler"] ? (
            <SpoilerChatComponent>{props.children}</SpoilerChatComponent>
          ) : (
            props.children
          )}
        </span>
      );
    },
    [underlineLinks]
  );

  const withConfiguration = useCallback((editor: ReactEditor) => {
    const isElementReadOnly = editor.isElementReadOnly;
    const deleteBackward = editor.deleteBackward;
    const isInline = editor.isInline;

    editor.isInline = (element) => {
      return element.type === "mention" || isInline(element);
    };

    editor.isElementReadOnly = (element) => {
      return (
        element.type === "codeblock" ||
        element.type === "mention" ||
        isElementReadOnly(element)
      );
    };

    editor.deleteBackward = (element) => {
      let deleted = false;
      // console.log(editor.children,editor.selection.anchor,editor.selection.focus,editor.children[editor.selection.anchor.path[0]].type,
      // editor.selection.anchor.offset
      // )
      const ind = editor.selection.anchor.path[0] - 1;
      if (ind >= 0 && editor.selection.anchor.offset === 0) {
        if (editor.children[ind].type === "codeblock") {
          // console.log('code block deleted!')
          deleted = true;
          const text = (editor.children[ind].children[0] as CustomText).text;
          deleteBackward(element);
          Transforms.insertText(editor, "'''" + text + "''", {
            at: [ind, 0],
          });
        }
      }
      if (
        editor.children[editor.selection.anchor.path[0]].type ===
          "blockquote" &&
        editor.selection.anchor.offset <= 0
      ) {
        Transforms.setNodes(
          editor,
          {
            type: "paragraph",
          },
          {
            at: editor.selection,
          }
        );

        Transforms.insertText(editor, ">", {
          at: editor.selection,
        });

        return;
      }

      if (!deleted) deleteBackward(element);
    };

    return editor;
  }, []);

  const editor = useMemo(() => {
    return withConfiguration(withReact(createEditor()));
  }, []);

  const initialValue: Descendant[] = [
    {
      type: "paragraph",
      children: [{ text: "" }],
    },
  ];

  const decorate = useCallback((entry: NodeEntry) => {
    const ranges: Range[] = [];
    const embeds: string[] = [];

    //process multiline markdowns

    if ((entry[0] as unknown as Editor)["operations"]) {
      let allText = "";
      const lineLengths: number[] = [];
      const lines = [];

      for (const node of entry[0].children) {
        const paragraphNode = node as Element;
        if (paragraphNode.type === "paragraph") {
          try {
            allText += (paragraphNode.children[0] as CustomText).text;
            lineLengths.push(
              (paragraphNode.children[0] as CustomText).text.length
            );
            lines.push((paragraphNode.children[0] as CustomText).text);
          } catch (e) {
            console.error(e);
          }
        }
      }
      const multilineMatches: { type: string; data: RegExpExecArray[] }[] = [
        {
          type: "multilinecode",
          data: [...allText.matchAll(Constants.multilineCodeRe)],
        },
      ];

      for (const matchEntry of multilineMatches) {
        const data = matchEntry.data;

        for (const match of data) {
          if (matchEntry.type === "multilinecode") {
            let start = 0;
            let end = 0;
            let accum = 0;
            let accumLagged = 0;
            let lineStart = -1;
            let lineEnd = -1;

            const globalStart = match.index + 3;
            const globalEnd = globalStart + match[0].length - 6;
            let matchTextWithBreak = "";

            lineLengths.forEach((len, i) => {
              accum += len;

              if (globalStart < accum && lineStart === -1) {
                lineStart = i;
                start = globalStart - accumLagged;
              }
              if (globalEnd < accum && lineEnd === -1) {
                lineEnd = i;
                end = globalEnd - accumLagged;
              }

              accumLagged += len;
            });

            for (let i = lineStart; i <= lineEnd; i++) {
              if (i === lineStart && i === lineEnd) {
                matchTextWithBreak += lines[i].substring(start, end);
              } else if (i === lineStart) {
                matchTextWithBreak +=
                  lines[i].substring(start, lines[i].length) + "\n";
              } else if (i === lineEnd) {
                matchTextWithBreak += lines[i].substring(0, end);
              } else {
                matchTextWithBreak += lines[i] + "\n";
              }
            }

            // console.log(lineStart,lineEnd)
            if (start !== 3) {
              continue;
            }

            Transforms.insertNodes(
              editor,
              {
                type: "codeblock",
                children: [
                  {
                    text: matchTextWithBreak,
                  },
                ],
                content: matchTextWithBreak,
              },
              {
                at: {
                  path: [lineStart, 0],
                  offset: 0,
                },
              }
            );

            Transforms.delete(editor, {
              at: {
                anchor: {
                  path: [lineStart + 1, 0],
                  offset: 0,
                },
                focus: {
                  path: [lineEnd + 1, 0],
                  offset: end + 3,
                },
              },
            });

            try {
              if (lineEnd !== lineStart) {
                Transforms.delete(editor, {
                  at: [lineEnd],
                });
              } else {
                Transforms.delete(editor, {
                  at: [lineEnd + 1],
                });
              }
            } catch (e) {
              console.error(e);
            }
          }
        }
      }
    }

    if (!Text.isText(entry[0])) {
      // console.log(entry[0])
      return ranges;
    }

    const allMatches: { type: string; data: RegExpExecArray[] }[] = [
      {
        type: "underlinebolditalic",
        data: [...entry[0].text.matchAll(Constants.underlineBoldItalicsRe)],
      },
      {
        type: "underlinebold",
        data: [...entry[0].text.matchAll(Constants.underlineBoldRe)],
      },
      {
        type: "bolditalic",
        data: [...entry[0].text.matchAll(Constants.boldItalicRe)],
      },
      {
        type: "bold",
        data: [...entry[0].text.matchAll(Constants.boldRe)],
      },

      {
        type: "underlineitalic",
        data: [...entry[0].text.matchAll(Constants.underlineItalicsRe)],
      },
      {
        type: "underline",
        data: [...entry[0].text.matchAll(Constants.underlineRe)],
      },
      {
        type: "italic",
        data: [...entry[0].text.matchAll(Constants.italicRe)],
      },
      {
        type: "heading3",
        data: [...entry[0].text.matchAll(Constants.heading3Re)],
      },
      {
        type: "heading2",
        data: [...entry[0].text.matchAll(Constants.heading2Re)],
      },
      {
        type: "subtext",
        data: [...entry[0].text.matchAll(Constants.subTextRe)],
      },
      {
        type: "heading1",
        data: [...entry[0].text.matchAll(Constants.heading1Re)],
      },
      {
        type: "blockquote",
        data: [...entry[0].text.matchAll(Constants.blockQuoteRe)],
      },
      {
        type: "strikethrough",
        data: [...entry[0].text.matchAll(Constants.strikethroughRe)],
      },
      {
        type: "maskedlink",
        data: [...entry[0].text.matchAll(Constants.maskedLinkeRe)],
      },
      {
        type: "list",
        data: [...entry[0].text.matchAll(Constants.listRe)],
      },
      {
        type: "code",
        data: [...entry[0].text.matchAll(Constants.codeRe)],
      },
      {
        type: "emoji",
        data: [...entry[0].text.matchAll(Constants.emojiRe)],
      },
      {
        type: "url",
        data: [...entry[0].text.matchAll(Constants.urlRe)],
      },
      {
        type: "spoiler",
        data: [...entry[0].text.matchAll(Constants.spoilerRe)],
      },
    ];

    // console.log(allMatches[allMatches.length-1].data)

    const italicChecked: Set<number> = new Set();
    const headingChecked: Set<number> = new Set();
    const underlineChecked: Set<number> = new Set();
    const underlineItalicChecked: Set<number> = new Set();

    for (const matchEntry of allMatches) {
      const data = matchEntry.data;

      for (const match of data) {
        if (matchEntry.type === "searchcontent") {
          const matchString = match[0];
          const start = match.index;
          const end = start + matchString.length;
          ranges.push({
            searchcontent: true,
            anchor: {
              path: entry[1],
              offset: start,
            },
            focus: {
              path: entry[1],
              offset: end,
            },
          });
        } else if (matchEntry.type === "spoiler") {
          const matchString = match[0];
          const start = match.index + 2;
          const end = start + matchString.length - 4;
          ranges.push({
            greyed: true,
            anchor: {
              path: entry[1],
              offset: match.index,
            },
            focus: {
              path: entry[1],
              offset: match.index + 2,
            },
          });
          ranges.push({
            spoiler: true,
            anchor: {
              path: entry[1],
              offset: start,
            },
            focus: {
              path: entry[1],
              offset: end,
            },
          });
          ranges.push({
            greyed: true,
            anchor: {
              path: entry[1],
              offset: end,
            },
            focus: {
              path: entry[1],
              offset: end + 2,
            },
          });
        } else if (matchEntry.type === "url") {
          const matchString = match[0];
          ranges.push({
            url: matchString,
            anchor: {
              path: entry[1],
              offset: match.index,
            },
            focus: {
              path: entry[1],
              offset: match.index + matchString.length,
            },
          });
          //max of 10 embeds
          if (embeds.length < 10) embeds.push(matchString);
        } else if (matchEntry.type === "emoji") {
          const matchString = match[0];

          const start = match.index;
          const end = start + matchString.length;

          ranges.push({
            emoji: matchString,
            emojisize:
              entry[0].text.replaceAll(Constants.emojiRe, "").trim().length > 0
                ? "1.5em"
                : "5em",
            anchor: {
              path: entry[1],
              offset: start,
            },
            focus: {
              path: entry[1],
              offset: end,
            },
          });
        } else if (matchEntry.type === "list") {
          if (
            (Editor.parent(editor, entry[1])[0] as Element).type === "codeblock"
          ) {
            continue;
          }

          const matchString = match[0];
          let anchor = 0;
          if (matchString.startsWith("-# ")) {
            anchor = matchString.indexOf("-", 1);
          } else {
            anchor = matchString.indexOf("-");
          }

          const searchPoint = Math.max(
            matchString.indexOf(">"),
            matchString.indexOf("#")
          );

          const numSpaces =
            searchPoint > -1
              ? anchor - matchString.indexOf(" ", searchPoint) - 1
              : anchor;

          const start = match.index + 2 + anchor;
          const end = start + matchString.length - 2 - anchor;

          ranges.push({
            greyed: true,
            anchor: {
              path: entry[1],
              offset: anchor,
            },
            focus: {
              path: entry[1],
              offset: anchor + 1,
            },
          });

          ranges.push({
            list: numSpaces,
            anchor: {
              path: entry[1],
              offset: start,
            },
            focus: {
              path: entry[1],
              offset: end,
            },
          });
        } else if (matchEntry.type === "maskedlink") {
          const matchString = match[0];
          const start = match.index + 1;
          const end = start + matchString.indexOf("]") - 1;
          const url = matchString.substring(
            matchString.indexOf("(") + 1,
            matchString.lastIndexOf(")")
          );

          ranges.push({
            greyed: true,
            anchor: {
              path: entry[1],
              offset: match.index,
            },
            focus: {
              path: entry[1],
              offset: match.index + 1,
            },
          });

          ranges.push({
            maskedlink: url,
            anchor: {
              path: entry[1],
              offset: start,
            },
            focus: {
              path: entry[1],
              offset: end,
            },
          });

          ranges.push({
            greyed: true,
            anchor: {
              path: entry[1],
              offset: end,
            },
            focus: {
              path: entry[1],
              offset: start + matchString.length - 1,
            },
          });
        } else if (matchEntry.type === "blockquote") {
          if (
            (Editor.parent(editor, entry[1])[0] as Element).type === "codeblock"
          ) {
            continue;
          }

          const anchor = match[0].indexOf(">");
          const matchString = match[0].substring(anchor + 2);

          Transforms.insertText(editor, matchString, {
            at: [entry[1][0]],
          });

          Transforms.setNodes(
            editor,
            {
              type: "blockquote",
            },
            {
              at: [entry[1][0]],
            }
          );
        } else if (
          matchEntry.type === "subtext" &&
          !headingChecked.has(match.index + 2)
        ) {
          if (
            (Editor.parent(editor, entry[1])[0] as Element).type === "codeblock"
          ) {
            continue;
          }

          const matchString = match[0];
          const start = match.index + 3;
          headingChecked.add(start);
          const end = start + matchString.length - 3;

          ranges.push({
            greyed: true,
            anchor: {
              path: entry[1],
              offset: match.index,
            },
            focus: {
              path: entry[1],
              offset: match.index + 2,
            },
          });

          ranges.push({
            subtext: true,
            anchor: {
              path: entry[1],
              offset: start,
            },
            focus: {
              path: entry[1],
              offset: end,
            },
          });
        } else if (
          matchEntry.type === "heading1" &&
          !headingChecked.has(match.index + 1)
        ) {
          if (
            (Editor.parent(editor, entry[1])[0] as Element).type === "codeblock"
          ) {
            continue;
          }
          const matchString = match[0];
          const start = match.index + 2;
          headingChecked.add(start);
          const end = start + matchString.length - 2;

          ranges.push({
            greyed: true,
            anchor: {
              path: entry[1],
              offset: match.index,
            },
            focus: {
              path: entry[1],
              offset: match.index + 1,
            },
          });

          ranges.push({
            heading1: true,
            anchor: {
              path: entry[1],
              offset: start,
            },
            focus: {
              path: entry[1],
              offset: end,
            },
          });
        } else if (
          matchEntry.type === "heading2" &&
          !headingChecked.has(match.index + 2)
        ) {
          if (
            (Editor.parent(editor, entry[1])[0] as Element).type === "codeblock"
          ) {
            continue;
          }

          const matchString = match[0];
          const start = match.index + 3;
          headingChecked.add(start);
          const end = start + matchString.length - 3;

          ranges.push({
            greyed: true,
            anchor: {
              path: entry[1],
              offset: match.index,
            },
            focus: {
              path: entry[1],
              offset: match.index + 2,
            },
          });

          ranges.push({
            heading2: true,
            anchor: {
              path: entry[1],
              offset: start,
            },
            focus: {
              path: entry[1],
              offset: end,
            },
          });
        } else if (
          matchEntry.type === "heading3" &&
          !headingChecked.has(match.index + 3)
        ) {
          if (
            (Editor.parent(editor, entry[1])[0] as Element).type === "codeblock"
          ) {
            continue;
          }

          const matchString = match[0];
          const start = match.index + 4;
          headingChecked.add(start);
          const end = start + matchString.length - 4;

          ranges.push({
            greyed: true,
            anchor: {
              path: entry[1],
              offset: match.index,
            },
            focus: {
              path: entry[1],
              offset: match.index + 3,
            },
          });

          ranges.push({
            heading3: true,
            anchor: {
              path: entry[1],
              offset: start,
            },
            focus: {
              path: entry[1],
              offset: end,
            },
          });
        } else if (
          matchEntry.type === "underlinebolditalic" &&
          !underlineItalicChecked.has(match.index + 5)
        ) {
          const matchString = match[0];

          const start = match.index + 5;
          underlineItalicChecked.add(start);
          const end = start + matchString.length - 10;

          ranges.push({
            greyed: true,
            anchor: {
              path: entry[1],
              offset: match.index,
            },
            focus: {
              path: entry[1],
              offset: match.index + 5,
            },
          });

          ranges.push({
            underline: true,
            italic: true,
            bold: true,
            anchor: {
              path: entry[1],
              offset: start,
            },
            focus: {
              path: entry[1],
              offset: end,
            },
          });

          ranges.push({
            greyed: true,
            anchor: {
              path: entry[1],
              offset: end,
            },
            focus: {
              path: entry[1],
              offset: end + 5,
            },
          });
        } else if (
          matchEntry.type === "underlinebold" &&
          !underlineItalicChecked.has(match.index + 4)
        ) {
          const matchString = match[0];

          const start = match.index + 4;
          underlineItalicChecked.add(start);
          const end = start + matchString.length - 8;

          ranges.push({
            greyed: true,
            anchor: {
              path: entry[1],
              offset: match.index,
            },
            focus: {
              path: entry[1],
              offset: match.index + 4,
            },
          });

          ranges.push({
            underline: true,
            bold: true,
            anchor: {
              path: entry[1],
              offset: start,
            },
            focus: {
              path: entry[1],
              offset: end,
            },
          });

          ranges.push({
            greyed: true,
            anchor: {
              path: entry[1],
              offset: end,
            },
            focus: {
              path: entry[1],
              offset: end + 4,
            },
          });
        } else if (
          matchEntry.type === "underlineitalic" &&
          !underlineItalicChecked.has(match.index + 3)
        ) {
          const matchString = match[0];

          const start = match.index + 3;
          underlineItalicChecked.add(start);
          const end = start + matchString.length - 6;

          ranges.push({
            greyed: true,
            anchor: {
              path: entry[1],
              offset: match.index,
            },
            focus: {
              path: entry[1],
              offset: match.index + 3,
            },
          });

          ranges.push({
            underline: true,
            italic: true,
            anchor: {
              path: entry[1],
              offset: start,
            },
            focus: {
              path: entry[1],
              offset: end,
            },
          });

          ranges.push({
            greyed: true,
            anchor: {
              path: entry[1],
              offset: end,
            },
            focus: {
              path: entry[1],
              offset: end + 3,
            },
          });
        } else if (
          matchEntry.type === "bolditalic" &&
          !italicChecked.has(match.index + 3) &&
          !underlineItalicChecked.has(match.index + 3)
        ) {
          const matchString = match[0];

          const start = match.index + 3;
          italicChecked.add(start);
          const end = start + matchString.length - 6;

          ranges.push({
            greyed: true,
            anchor: {
              path: entry[1],
              offset: match.index,
            },
            focus: {
              path: entry[1],
              offset: match.index + 3,
            },
          });

          ranges.push({
            bold: true,
            italic: true,
            anchor: {
              path: entry[1],
              offset: start,
            },
            focus: {
              path: entry[1],
              offset: end,
            },
          });

          ranges.push({
            greyed: true,
            anchor: {
              path: entry[1],
              offset: end,
            },
            focus: {
              path: entry[1],
              offset: end + 3,
            },
          });
        } else if (matchEntry.type === "strikethrough") {
          const matchString = match[0];

          const start = match.index + 2;

          const end = start + matchString.length - 4;

          ranges.push({
            greyed: true,
            anchor: {
              path: entry[1],
              offset: match.index,
            },
            focus: {
              path: entry[1],
              offset: match.index + 2,
            },
          });

          ranges.push({
            strikethrough: true,
            anchor: {
              path: entry[1],
              offset: start,
            },
            focus: {
              path: entry[1],
              offset: end,
            },
          });

          ranges.push({
            greyed: true,
            anchor: {
              path: entry[1],
              offset: end,
            },
            focus: {
              path: entry[1],
              offset: end + 2,
            },
          });
        } else if (
          matchEntry.type === "bold" &&
          !italicChecked.has(match.index + 2) &&
          !underlineItalicChecked.has(match.index + 2)
        ) {
          const matchString = match[0];

          const start = match.index + 2;
          italicChecked.add(start);
          const end = start + matchString.length - 4;

          ranges.push({
            greyed: true,
            anchor: {
              path: entry[1],
              offset: match.index,
            },
            focus: {
              path: entry[1],
              offset: match.index + 2,
            },
          });

          ranges.push({
            bold: true,
            anchor: {
              path: entry[1],
              offset: start,
            },
            focus: {
              path: entry[1],
              offset: end,
            },
          });

          ranges.push({
            greyed: true,
            anchor: {
              path: entry[1],
              offset: end,
            },
            focus: {
              path: entry[1],
              offset: end + 2,
            },
          });
        } else if (
          matchEntry.type === "underline" &&
          !underlineItalicChecked.has(match.index + 2)
        ) {
          const matchString = match[0];
          const start = match.index + 2;

          underlineChecked.add(start);
          const end = start + matchString.length - 4;

          ranges.push({
            greyed: true,
            anchor: {
              path: entry[1],
              offset: match.index,
            },
            focus: {
              path: entry[1],
              offset: match.index + 2,
            },
          });

          ranges.push({
            underline: true,
            anchor: {
              path: entry[1],
              offset: start,
            },
            focus: {
              path: entry[1],
              offset: end,
            },
          });

          ranges.push({
            greyed: true,
            anchor: {
              path: entry[1],
              offset: end,
            },
            focus: {
              path: entry[1],
              offset: end + 2,
            },
          });
        } else if (matchEntry.type === "italic") {
          const matchString = match[0];

          if (
            matchString.charAt(0) === "*" &&
            (italicChecked.has(match.index + 1) ||
              underlineItalicChecked.has(match.index + 1))
          ) {
            continue;
          } else if (
            matchString.charAt(0) === "_" &&
            underlineChecked.has(match.index + 1)
          ) {
            continue;
          } else if (
            matchString.charAt(0) === "_" &&
            underlineItalicChecked.has(match.index + 1)
          ) {
            continue;
          }

          const start = match.index + 1;
          italicChecked.add(start);
          const end = start + matchString.length - 2;

          ranges.push({
            greyed: true,
            anchor: {
              path: entry[1],
              offset: match.index,
            },
            focus: {
              path: entry[1],
              offset: match.index + 1,
            },
          });

          ranges.push({
            italic: true,
            anchor: {
              path: entry[1],
              offset: start,
            },
            focus: {
              path: entry[1],
              offset: end,
            },
          });

          ranges.push({
            greyed: true,
            anchor: {
              path: entry[1],
              offset: end,
            },
            focus: {
              path: entry[1],
              offset: end + 1,
            },
          });
        } else if (matchEntry.type === "code") {
          const matchString = match[0];

          const start = match.index + 1;
          italicChecked.add(start);
          const end = start + matchString.length - 2;

          ranges.push({
            greyed: true,
            anchor: {
              path: entry[1],
              offset: match.index,
            },
            focus: {
              path: entry[1],
              offset: match.index + 1,
            },
          });

          ranges.push({
            code: true,
            anchor: {
              path: entry[1],
              offset: start,
            },
            focus: {
              path: entry[1],
              offset: end,
            },
          });

          ranges.push({
            greyed: true,
            anchor: {
              path: entry[1],
              offset: end,
            },
            focus: {
              path: entry[1],
              offset: end + 1,
            },
          });
        }
      }
    }

    return ranges;
  }, []);

  const renderElement = useCallback((props: RenderElementProps) => {
    const { attributes, children, element } = props;

    switch (element.type) {
      case "blockquote":
        return (
          <div
            {...attributes}
            className="w-[95%] bg-lime-700 pl-4 pr-2 border-l-4 border-lime-300"
          >
            {children}
          </div>
        );
      case "codeblock":
        return (
          <CodeBlock attributes={attributes} element={element}>
            {children}
          </CodeBlock>
        );
      default:
        return (
          <p
            {...attributes}
            className={`whitespace-pre-wrap`}
            style={{
              overflowWrap: "anywhere",
            }}
          >
            {children}
          </p>
        );
    }
  }, []);

  return (
    <div className="text-white">
      <Slate editor={editor} initialValue={initialValue}>
        <Editable
          className={`focus:outline-none caret-lime-300`}
          readOnly
          renderElement={renderElement}
          decorate={decorate}
          renderLeaf={renderLeaf}
        ></Editable>
      </Slate>
    </div>
  );
}
