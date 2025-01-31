import { SearchIndex } from "emoji-mart";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useState,
} from "react";
import { Editor, Text, Transforms } from "slate";
import { ReactEditor } from "slate-react";
import React from "react";

type EmojiSearchViewType = {
  query: string;
  editor: Editor;
  width: number;
  setOpen: Dispatch<SetStateAction<string>>;
};
export default function EmojiSearchView({
  query,
  editor,
  width,
  setOpen,
}: EmojiSearchViewType) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [searchResult, setSearchResult] = useState<any[]>([]);

  useEffect(() => {
    const search = async () => {
      const emojis = await SearchIndex.search(query);
      setSearchResult(emojis);
    };

    search();
  }, [query]);

  const handleSearchResultClick = useCallback(
    (code: string) => {
      const offset = editor.selection.anchor.offset;
      const textNode =
        editor.children[editor.selection.anchor.path[0]].children[
          editor.selection.anchor.path[1]
        ];
      if (Text.isText(textNode)) {
        const colonIndex = textNode.text.lastIndexOf(":", offset - 1);
        const nextColonIndex = textNode.text.indexOf(":", colonIndex + 1);
        if (colonIndex !== -1) {
          for (let i = 0; i < offset - colonIndex; i++)
            Editor.deleteBackward(editor, {
              unit: "character",
            });
        }
        if (nextColonIndex !== -1) {
          for (let i = 0; i < nextColonIndex - offset + 1; i++)
            Editor.deleteForward(editor, {
              unit: "character",
            });
        }
        console.log("deleted", offset - colonIndex);
      }
      Transforms.insertText(editor, ":" + code + ":");
      ReactEditor.focus(editor);
      setOpen("");
    },
    [editor]
  );

  return searchResult && searchResult.length > 0 ? (
    <div
      style={{
        width: width,
      }}
      className="bg-lime-500 h-fit max-h-[10rem] mb-[0.9rem] mr-2 text-white rounded-md shadow-md p-2 flex flex-col cursor-default"
    >
      <p className="font-bold text-sm">EMOJIS matching :{query}:</p>
      <div className="overflow-y-scroll w-full h-full flex flex-col mt-2">
        {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          searchResult?.map((data: any) => {
            return (
              <div
                key={data["id"]}
                onClick={() => handleSearchResultClick(data["id"])}
                className="flex items-center gap-2 justify-start transition hover:bg-lime-600 cursor-pointer p-0.5 rounded-md"
              >
                {/*@ts-expect-error: em-emoji not detected by jsx */}
                <em-emoji id={data["id"]} size={"1.5em"}></em-emoji>
                {":" + data["id"] + ":"}
              </div>
            );
          })
        }
      </div>
    </div>
  ) : (
    <></>
  );
}
