"use client";
import React, { useRef } from "react";
import EmojiPicker from "@emoji-mart/react";
import {
  BsEmojiExpressionless,
  BsEmojiSmile,
  BsFillSendFill,
} from "react-icons/bs";
import { FaFileUpload, FaPoll, FaPlus } from "react-icons/fa";
import { Popover } from "react-tiny-popover";
import {
  Slate,
  Editable,
  ReactEditor,
  withReact,
  RenderLeafProps,
  RenderPlaceholderProps,
  RenderElementProps,
} from "slate-react";
import EmojiSearchView from "./EmojiSearchView";
import MenuBox from "./MenuBox";
import {
  Dispatch,
  RefObject,
  SetStateAction,
  useCallback,
  useContext,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Transforms,
  createEditor,
  Descendant,
  Text,
  Element,
  Editor,
  NodeEntry,
  Range,
} from "slate";
import { CustomText } from "../types/Editor";
import { ChatRoom } from "../types/ChatRoom";
import { User } from "../types/User";
import Constants from "../constants/Constants";
import EmojiLeafComponent from "./EmojiLeafComponent";
import ModalUtils from "../util/ModalUtil";
import ModalContext from "../contexts/ModalContext";
import PollForm from "./PollForm";
import MentionBlock from "./MentionBlock";
import MentionSearchView from "./MentionSearchView";
import PrimaryButton from "./PrimaryButton";
import TenorPicker from "./TenorPicker";
import { MdGifBox, MdOutlineGifBox } from "react-icons/md";
import GenericUtil from "../util/GenericUtil";
import api from "../api/api";

type ChatInputType = {
  setChatInputRef?: Dispatch<SetStateAction<HTMLDivElement | null>>;
  emojiSearchViewWidth: number;
  currentChatRoom?: ChatRoom;
  currentUser: User;
  handleSendMessage?: (editor: Editor) => void;
  absolutePosition?: boolean;
  initialValue?: Descendant[];
  showMoreButton?: boolean;
  customEditor?: Editor;
  customPlaceholderText?: string;
  attachments?: { file: File; spoiler: boolean }[] | null;
  fileUploaderRef?: RefObject<HTMLInputElement>;
  handleAttachAsTextFile?: (message: string, editor: Editor) => void;
  handleOnFileUpload?: (files: FileList | null) => void;
  disabled?: boolean;
  chatFontScale?: number;
  underlineLinks?: boolean;
  showSendButton?: boolean;
  convertEmoticon?: boolean;
  showGifMenu?: boolean;
  previewSyntax?: boolean;
  emojiZIndex?: number;
  focusOnMount?: boolean;
  customInitialText?: string;

  setBoundText?: Dispatch<SetStateAction<string>>;
};
export default function ChatInput({
  fileUploaderRef,
  attachments,
  setChatInputRef,
  customPlaceholderText,
  customEditor,
  showMoreButton = true,
  absolutePosition = true,
  emojiSearchViewWidth,
  currentChatRoom,
  handleSendMessage,
  currentUser,
  initialValue,
  handleAttachAsTextFile,
  handleOnFileUpload,
  disabled,
  chatFontScale = 33.33333333,
  underlineLinks = true,
  showSendButton = false,
  convertEmoticon = false,
  showGifMenu = true,
  previewSyntax = true,
  emojiZIndex,
  focusOnMount = true,
  customInitialText,
  setBoundText,
}: ChatInputType) {
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [openSearchView, setOpenSearchView] = useState("");
  const [emojiQuery, setEmojiQuery] = useState("");
  const [mentionQuery, setMentionQuery] = useState("");
  const [emojiMenuOpen, setEmojiMenuOpen] = useState(false);
  const [tenorMenuOpen, setTenorMenuOpen] = useState(false);

  const emojiQueryDeferred = useDeferredValue(emojiQuery);
  const mentionQueryDeferred = useDeferredValue(mentionQuery);

  const [editorText_, setEditorText] = useState("");
  const editorText = useDeferredValue(editorText_);

  const modalContext = useContext(ModalContext);

  useEffect(() => {
    editor.onChange();
  }, [chatFontScale, underlineLinks, convertEmoticon, previewSyntax]);
  useEffect(() => {
    const node = editor.children[editor.children.length - 1];
    const textNode = node.children[node.children.length - 1];
    let offset = 0;
    if (Text.isText(textNode)) {
      offset = textNode.text.length;
    }

    Transforms.select(editor, {
      anchor: {
        path: [editor.children.length - 1, node.children.length - 1],
        offset: offset,
      },
      focus: {
        path: [editor.children.length - 1, node.children.length - 1],
        offset: offset,
      },
    });

    if (focusOnMount) ReactEditor.focus(editor);

    const text = GenericUtil.parseMarkdownText(editor);
    setEditorText(text);
    if (setBoundText) {
      setBoundText(text);
    }
  }, []);

  const decorate = useCallback(
    (entry: NodeEntry) => {
      if (!previewSyntax) {
        return [];
      }
      const ranges: Range[] = [];

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
            }
          }
        }
      }

      if (!Text.isText(entry[0])) {
        // console.log(entry[0])
        return ranges;
      }

      const currentText = entry[0].text;

      const allMatches: { type: string; data: RegExpExecArray[] }[] = [
        {
          type: "underlinebolditalic",
          data: [...currentText.matchAll(Constants.underlineBoldItalicsRe)],
        },
        {
          type: "underlinebold",
          data: [...currentText.matchAll(Constants.underlineBoldRe)],
        },
        {
          type: "bolditalic",
          data: [...currentText.matchAll(Constants.boldItalicRe)],
        },
        {
          type: "bold",
          data: [...currentText.matchAll(Constants.boldRe)],
        },

        {
          type: "underlineitalic",
          data: [...currentText.matchAll(Constants.underlineItalicsRe)],
        },
        {
          type: "underline",
          data: [...currentText.matchAll(Constants.underlineRe)],
        },
        {
          type: "italic",
          data: [...currentText.matchAll(Constants.italicRe)],
        },
        {
          type: "heading3",
          data: [...currentText.matchAll(Constants.heading3Re)],
        },
        {
          type: "heading2",
          data: [...currentText.matchAll(Constants.heading2Re)],
        },
        {
          type: "subtext",
          data: [...currentText.matchAll(Constants.subTextRe)],
        },
        {
          type: "heading1",
          data: [...currentText.matchAll(Constants.heading1Re)],
        },
        {
          type: "blockquote",
          data: [...currentText.matchAll(Constants.blockQuoteRe)],
        },
        {
          type: "strikethrough",
          data: [...currentText.matchAll(Constants.strikethroughRe)],
        },
        {
          type: "maskedlink",
          data: [...currentText.matchAll(Constants.maskedLinkeRe)],
        },
        {
          type: "list",
          data: [...currentText.matchAll(Constants.listRe)],
        },
        {
          type: "emoticon",
          data: [...currentText.matchAll(Constants.emoticonRe)],
        },
        {
          type: "code",
          data: [...currentText.matchAll(Constants.codeRe)],
        },
        {
          type: "emoji",
          data: [...currentText.matchAll(Constants.emojiRe)],
        },
        {
          type: "emojisearch",
          data: [...currentText.matchAll(Constants.emojiSearchRe)],
        },
        {
          type: "url",
          data: [...currentText.matchAll(Constants.urlRe)],
        },
        {
          type: "spoiler",
          data: [...currentText.matchAll(Constants.spoilerRe)],
        },
      ];

      // console.log(allMatches[allMatches.length-1].data)

      const italicChecked: Set<number> = new Set();
      const headingChecked: Set<number> = new Set();
      const underlineChecked: Set<number> = new Set();
      const underlineItalicChecked: Set<number> = new Set();
      const emoticonChecked: Set<number> = new Set();

      for (const matchEntry of allMatches) {
        const data = matchEntry.data;

        for (const match of data) {
          if (matchEntry.type === "spoiler") {
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
              url: true,
              anchor: {
                path: entry[1],
                offset: match.index,
              },
              focus: {
                path: entry[1],
                offset: match.index + matchString.length,
              },
            });
          } else if (matchEntry.type === "list") {
            if (
              (Editor.parent(editor, entry[1])[0] as Element).type ===
              "codeblock"
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
              maskedlink: true,
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
              (Editor.parent(editor, entry[1])[0] as Element).type ===
              "codeblock"
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
              (Editor.parent(editor, entry[1])[0] as Element).type ===
              "codeblock"
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
              (Editor.parent(editor, entry[1])[0] as Element).type ===
              "codeblock"
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
              (Editor.parent(editor, entry[1])[0] as Element).type ===
              "codeblock"
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
              (Editor.parent(editor, entry[1])[0] as Element).type ===
              "codeblock"
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
          } else if (matchEntry.type === "emoji") {
            const matchString = match[0];

            const start = match.index;
            const end = start + matchString.length;

            ranges.push({
              emoji: matchString,
              anchor: {
                path: entry[1],
                offset: start,
              },
              focus: {
                path: entry[1],
                offset: end,
              },
            });
          } else if (matchEntry.type === "emoticon") {
            const matchString = match[0];
            const start = match.index;
            const end = start + matchString.length;

            for (let i = start; i <= end; i++) {
              emoticonChecked.add(i);
            }
            ranges.push({
              emoticon: matchString,
              anchor: {
                path: entry[1],
                offset: start,
              },
              focus: {
                path: entry[1],
                offset: end,
              },
            });
          } else if (matchEntry.type === "emojisearch") {
            const matchString = match[0];

            const start = match.index;
            const end = start + matchString.length;

            ranges.push({
              emojisearch: matchString,
              anchor: {
                path: entry[1],
                offset: start,
              },
              focus: {
                path: entry[1],
                offset: end,
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
          } else if (
            matchEntry.type === "code" &&
            !emoticonChecked.has(match.index)
          ) {
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
    },
    [previewSyntax]
  );

  const renderElement = useCallback(
    (props: RenderElementProps) => {
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
            <div
              {...attributes}
              className="font-mono w-[95%] p-2 bg-lime-400 text-lime-700 rounded-md"
            >
              {children}
            </div>
          );
        case "mention":
          return currentChatRoom ? (
            <MentionBlock
              attributes={attributes}
              element={element}
              currentChatRoom={currentChatRoom}
              currentUser={currentUser}
            >
              {children}
            </MentionBlock>
          ) : (
            <p {...attributes}>{children}</p>
          );
        default:
          return <p {...attributes}>{children}</p>;
      }
    },
    [currentChatRoom, currentUser]
  );

  const withConfiguration = useCallback((editor: ReactEditor) => {
    const isInline = editor.isInline;
    const isElementReadOnly = editor.isElementReadOnly;
    const apply = editor.apply;
    const isBlock = editor.isBlock;
    const isVoid = editor.isVoid;
    const deleteBackward = editor.deleteBackward;

    editor.isVoid = (element) => {
      return isVoid(element);
    };

    editor.isBlock = (element) => {
      return isBlock(element);
    };
    editor.isInline = (element) => {
      return element.type === "mention" || isInline(element);
    };
    editor.isElementReadOnly = (element) => {
      return (
        element.type === "mention" ||
        element.type === "codeblock" ||
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

    editor.apply = (operation) => {
      // if(operation.type === 'remove_node') {
      //     const node = operation.node as Element
      //     // if(node.type === 'codeblock') {
      //     //     //handle codeblock deletion
      //     //     // const text = (node.children[0] as CustomText).text
      //     //     // console.log(text,operation.path)
      //     //     // apply(operation)
      //     //     // Transforms.insertText(editor,"'''" + text + "''",{
      //     //     //     at: operation.path
      //     //     // })
      //     //     // console.log(editor.children)
      //     // }
      //     // else {
      //     //     apply(operation)
      //     // }

      // }
      // else

      apply(operation);
      return editor;
    };

    return editor;
  }, []);

  const editor = useMemo(
    () =>
      customEditor
        ? customEditor
        : withConfiguration(withReact(createEditor())),
    []
  );

  if (!initialValue) {
    initialValue = [
      {
        type: "paragraph",
        children: [
          {
            text: "",
          },
        ],
      },
    ];
  }

  useEffect(() => {
    if (customInitialText) {
      const point = { path: [0, 0], offset: 0 };
      editor.selection = { anchor: point, focus: point };
      const lines = customInitialText.split("\n") || [""];

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
    }
  }, [customInitialText]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEmojiSelect = useCallback((e: any) => {
    setEmojiMenuOpen(false);

    Transforms.insertText(editor, e["shortcodes"]);

    ReactEditor.focus(editor);
  }, []);

  const renderPlaceholder = useCallback(
    ({ children, attributes }: RenderPlaceholderProps) => {
      return (
        <span
          {...attributes}
          className="whitespace-nowrap overflow-hidden text-ellipsis"
        >
          {children}
        </span>
      );
    },
    []
  );

  const handleUpdateSearchViewQuery = useCallback(() => {
    const offset = editor.selection.anchor.offset;
    const textNode =
      editor.children[editor.selection.anchor.path[0]].children[
        editor.selection.anchor.path[1]
      ];
    if (Text.isText(textNode)) {
      //handle emoji queries
      const colonIndex = textNode.text.lastIndexOf(":", offset - 1);
      const nextColonIndex = textNode.text.indexOf(":", colonIndex + 1);
      let query = "";
      //characters to ignore in emoji queries
      const specialChars = ["/", "\\", "!", "@", "$", "#", ":", ";", ")", "("];
      if (colonIndex !== -1 && nextColonIndex !== -1) {
        if (
          colonIndex + 1 < textNode.text.length &&
          specialChars.indexOf(textNode.text.charAt(colonIndex + 1)) !== -1
        ) {
          query = "";
        } else {
          query = textNode.text.substring(colonIndex + 1, nextColonIndex);
        }
      } else if (colonIndex !== -1 && nextColonIndex === -1) {
        if (
          colonIndex + 1 < textNode.text.length &&
          specialChars.indexOf(textNode.text.charAt(colonIndex + 1)) !== -1
        ) {
          query = "";
        } else {
          query = textNode.text.substring(colonIndex + 1);
        }
      }

      if (query.startsWith(" ")) query = "";
      if (query.includes(" ")) query = "";

      setEmojiQuery(query);

      if (query.length > 0) {
        setOpenSearchView("emoji");
        return;
      }

      //handle user mention queries

      const atIndex = textNode.text.lastIndexOf("@", offset - 1);
      if (atIndex !== -1) {
        query = textNode.text.substring(atIndex + 1);
        if (query.startsWith(" ")) query = "";
        if (query.includes(" ")) query = "";

        if (query.length > 0) {
          setMentionQuery(query);
          setOpenSearchView("mention");
          return;
        }
      }

      setOpenSearchView("");
    }
  }, []);

  const renderLeaf = useCallback(
    (props: RenderLeafProps) => {
      return props.leaf["emoji"] ||
        (props.leaf["emoticon"] && convertEmoticon) ? (
        <EmojiLeafComponent
          props={props}
          underlineLinks={underlineLinks}
          chatFontScale={chatFontScale}
        />
      ) : (
        <span
          {...props.attributes}
          className={`
            ${props.leaf["spoiler"] ? "bg-lime-700 rounded-sm" : ""}
                ${
                  props.leaf["url"] && underlineLinks
                    ? `text-blue-500 underline`
                    : ""
                }
                ${props.leaf["emojisearch"] ? "text-blue-300" : ""}
                ${props.leaf["emoji"] ? "text-blue-300 cursor-pointer" : ""}
                ${props.leaf["greyed"] ? "text-lime-700" : ""}
                ${props.leaf["bold"] ? "font-bold" : ""} ${
            props.leaf["italic"] && "italic"
          }
                ${
                  props.leaf["code"] &&
                  "font-mono bg-lime-400 text-lime-700 rounded-md py-2"
                }
                ${props.leaf["blockquote"] && "border-l-4 border-lime-400 py-2"}
               
                ${props.leaf["underline"] && "underline"}
                ${props.leaf["strikethrough"] && "line-through"}
                ${props.leaf["subtext"] && "text-lime-700"}
                ${
                  props.leaf["maskedlink"] &&
                  underlineLinks &&
                  "text-blue-500 underline"
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
                ? 0.75 * (12 + (chatFontScale / 100.0) * (24 - 12)) + "px"
                : props.leaf["heading3"] !== undefined
                ? 1.25 * (12 + (chatFontScale / 100.0) * (24 - 12)) + "px"
                : props.leaf["heading2"] !== undefined
                ? 1.5 * (12 + (chatFontScale / 100.0) * (24 - 12)) + "px"
                : props.leaf["heading1"] !== undefined
                ? 1.875 * (12 + (chatFontScale / 100.0) * (24 - 12)) + "px"
                : "inherit",
          }}
        >
          {props.children}
        </span>
      );
    },
    [chatFontScale, underlineLinks, convertEmoticon]
  );

  const handleUploadFile = useCallback(() => {
    if (attachments?.length && attachments.length >= 10) {
      ModalUtils.openGenericModal(
        modalContext,
        "Too heavy..",
        "You cannot attach more than 10 files! Delete some!"
      );
      return;
    }
    if (fileUploaderRef?.current) {
      fileUploaderRef.current.click();
    }
  }, [attachments]);

  const handleCreatePoll = useCallback(() => {
    if (currentChatRoom)
      ModalUtils.openCustomModal(
        modalContext,
        <PollForm currentChatRoom={currentChatRoom} />
      );
  }, [currentChatRoom]);

  const menus = useMemo(() => {
    const items = [
      <div
        key={0}
        className="flex gap-2 sm:p-1 items-center"
        onClick={handleUploadFile}
      >
        <FaFileUpload /> Upload File
      </div>,
    ];
    if (editorText.length > 0) {
      items.push(
        <div
          key={2}
          className="flex gap-2 sm:p-1 items-center"
          onClick={() => {
            if (handleAttachAsTextFile)
              handleAttachAsTextFile(editorText, editor);
          }}
        >
          <FaFileUpload /> Upload Your Message As Text File
        </div>
      );
    }

    items.push(
      <div
        key={1}
        onClick={() => handleCreatePoll()}
        className="flex gap-2 sm:p-1 items-center"
      >
        <FaPoll />
        Create Poll
      </div>
    );

    return items;
  }, [editorText]);

  const [typing, setTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleSendTypeEvent = useCallback(async () => {
    if (currentChatRoom) {
      await api.post(
        `/chat/message/type/${currentChatRoom.id}`,
        currentChatRoom.participants.map((e) => e.username + "@" + e.id)
      );
    }
  }, [currentChatRoom?.id, currentChatRoom?.participants]);

  useEffect(() => {
    if (typing) {
      const sendTypingHandler = () => {
        handleSendTypeEvent();
        //send typing event every 3 seconds
        typingIntervalRef.current = setTimeout(sendTypingHandler, 3000);
      };
      typingIntervalRef.current = setTimeout(sendTypingHandler, 100);
    } else {
      if (typingIntervalRef.current) clearTimeout(typingIntervalRef.current);
    }

    return () => {
      if (typingIntervalRef.current) {
        clearTimeout(typingIntervalRef.current);
      }
    };
  }, [typing, handleSendTypeEvent]);

  return (
    <div
      id="chatInput"
      ref={setChatInputRef}
      className={`w-[96%] ${
        absolutePosition ? "absolute flex items-center gap-2 bottom-[1rem]" : ""
      }
}
        `}
    >
      {disabled ? (
        <div
          className="absolute top-0 left-0 w-full h-full rounded-md bg-white bg-opacity-[30%] cursor-not-allowed z-10
          
        "
        ></div>
      ) : (
        <></>
      )}
      <div className="flex items-start p-2 w-full bg-lime-600 rounded-md">
        {showMoreButton && (
          <Popover
            containerStyle={{
              zIndex: "50",
            }}
            isOpen={chatMenuOpen}
            content={
              <div className="mb-1 shadow-md">
                <MenuBox menus={menus} />
              </div>
            }
            positions={["top"]}
            onClickOutside={() => setChatMenuOpen(false)}
          >
            <div
              onClick={() => setChatMenuOpen((prev) => !prev)}
              className="self-start rounded-full whitespace-nowrap p-2 bg-lime-400 text-lime-500 hover:text-lime-700 cursor-pointer transition"
            >
              <FaPlus />
            </div>
          </Popover>
        )}

        <Popover
          containerStyle={{
            zIndex: emojiZIndex?.toString() ?? "0",
          }}
          align="start"
          isOpen={openSearchView.length > 0}
          content={
            <>
              {openSearchView === "emoji" ? (
                <EmojiSearchView
                  query={emojiQueryDeferred}
                  editor={editor}
                  width={emojiSearchViewWidth}
                  setOpen={setOpenSearchView}
                />
              ) : openSearchView === "mention" && currentChatRoom ? (
                <MentionSearchView
                  query={mentionQueryDeferred}
                  editor={editor}
                  width={emojiSearchViewWidth}
                  setOpen={setOpenSearchView}
                  currentChatRoom={currentChatRoom}
                />
              ) : (
                <></>
              )}
            </>
          }
          positions={["top"]}
        >
          <div
            className="bg-lime-600 float-left ml-4 text-lime-300 placeholder:text-lime-300 hover:bg-opacity-70 focus:bg-opacity-70 transition duration-500 focus:shadow-md
                                focus:outline-none caret-lime-300 w-full self-center max-h-[20rem] overflow-scroll"
          >
            <Slate
              editor={editor}
              onSelectionChange={handleUpdateSearchViewQuery}
              initialValue={initialValue}
            >
              <Editable
                tabIndex={disabled ? -1 : 0}
                decorate={decorate}
                renderLeaf={renderLeaf}
                renderElement={renderElement}
                className={`focus:outline-none relative`}
                onPaste={(e) => {
                  if (e.clipboardData && handleOnFileUpload) {
                    handleOnFileUpload(e.clipboardData.files);
                  }
                }}
                style={{
                  overflowWrap: "anywhere",
                  fontSize: 12 + ((24 - 12) * chatFontScale) / 100.0 + "px",
                }}
                onBlur={() => {
                  //for handling IME inputs
                  const text = GenericUtil.parseMarkdownText(editor);
                  setEditorText(text);
                  if (setBoundText) {
                    setBoundText(text);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && handleSendMessage) {
                    e.preventDefault();

                    handleSendMessage(editor);

                    setOpenSearchView("");

                    setTimeout(() => {
                      const text = GenericUtil.parseMarkdownText(editor);
                      setEditorText(text);

                      if (setBoundText) {
                        setBoundText(text);
                      }
                    }, 50);
                  } else {
                    if (typingTimeoutRef.current) {
                      clearTimeout(typingTimeoutRef.current);
                    }

                    setTyping(true);

                    typingTimeoutRef.current = setTimeout(
                      () => setTyping(false),
                      1000
                    );

                    setTimeout(() => {
                      handleUpdateSearchViewQuery();

                      const text = GenericUtil.parseMarkdownText(editor);
                      setEditorText(text);

                      if (setBoundText) {
                        setBoundText(text);
                      }
                    }, 50);
                  }
                }}
                // renderPlaceholder={
                //   customPlaceholderText ? renderPlaceholder : undefined
                // }
                // placeholder={customPlaceholderText}
              />

              <div
                style={{
                  width: emojiSearchViewWidth * 0.5,
                }}
                className={`absolute slate-placeholder whitespace-nowrap overflow-ellipsis overflow-hidden top-[25%] h-fit opacity-50 pointer-events-none`}
              >
                {customPlaceholderText}
              </div>
            </Slate>
          </div>
        </Popover>

        <div className="text-white text-sm mx-2 mt-1 items-center hidden md:flex">
          <p className={`${editorText.length > 255 && "text-red-500"}`}>
            {editorText.length}/255
          </p>
        </div>

        <Popover
          containerStyle={{
            zIndex: emojiZIndex?.toString() ?? "50",
          }}
          onClickOutside={() => setEmojiMenuOpen(false)}
          reposition={true}
          isOpen={emojiMenuOpen}
          positions={["top", "bottom"]}
          content={
            <div className="mb-2 overflow-scroll">
              <div className="w-full h-full sm:hidden">
                <EmojiPicker perLine={7} onEmojiSelect={handleEmojiSelect} />
              </div>
              <div className="w-full h-full hidden sm:block">
                <EmojiPicker onEmojiSelect={handleEmojiSelect} />
              </div>
            </div>
          }
        >
          <div
            onClick={() => setEmojiMenuOpen((prev) => !prev)}
            className="group self-start rounded-full whitespace-nowrap scale-100 hover:scale-125 bg-lime-400 text-lime-600 hover:text-lime-700 cursor-pointer transition"
          >
            <div className="block group-hover:hidden">
              <BsEmojiExpressionless size={28} />
            </div>
            <div className="hidden group-hover:block">
              <BsEmojiSmile size={28} />
            </div>
          </div>
        </Popover>

        {showGifMenu ? (
          <Popover
            containerStyle={{
              zIndex: "50",
            }}
            onClickOutside={() => setTenorMenuOpen(false)}
            reposition={true}
            isOpen={tenorMenuOpen}
            positions={["top", "bottom"]}
            content={
              <div className="animate-fadeInUpFaster max-w-[90vw] md:max-w-[50vw] bg-lime-700 rounded-md">
                <TenorPicker
                  onGifSelected={(url) => {
                    editor.children = [
                      {
                        type: "paragraph",
                        children: [
                          {
                            text: url,
                          },
                        ],
                      },
                    ];

                    if (handleSendMessage) handleSendMessage(editor);

                    setTenorMenuOpen(false);
                  }}
                />
              </div>
            }
          >
            <div
              onClick={() => setTenorMenuOpen((prev) => !prev)}
              className="ml-2 bg-transparent group self-start whitespace-nowrap scale-100 hover:scale-125 text-lime-300 hover:text-lime-400 cursor-pointer transition"
            >
              <div className="block group-hover:hidden">
                <MdOutlineGifBox size={30} />
              </div>
              <div className="hidden group-hover:block">
                <MdGifBox size={30} />
              </div>
            </div>
          </Popover>
        ) : (
          <></>
        )}
      </div>
      {showSendButton && (
        <PrimaryButton
          customWidth="w-fit"
          customHeight="h-10"
          customStyles="bg-lime-500 text-white px-2 md:px-4 lg:px-8"
          onclick={() => {
            ReactEditor.focus(editor);
            //Simulate pressing enter key
            const event = new KeyboardEvent("keydown", {
              key: "Enter",
              keyCode: 13,
              code: "Enter",
              which: 13,
              bubbles: true,
            });

            // Dispatch the event on an input field
            ReactEditor.toDOMNode(editor, editor).dispatchEvent(event);

            setOpenSearchView("");
          }}
        >
          <BsFillSendFill />
        </PrimaryButton>
      )}
    </div>
  );
}
