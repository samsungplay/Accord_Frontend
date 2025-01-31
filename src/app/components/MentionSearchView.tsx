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
import { ChatRoom } from "../types/ChatRoom";
import { User } from "../types/User";
import ProfileAvatar from "./ProfileAvatar";

type MentionSearchViewType = {
  query: string;
  editor: Editor;
  width: number;
  setOpen: Dispatch<SetStateAction<string>>;
  currentChatRoom: ChatRoom;
};
export default function MentionSearchView({
  query,
  editor,
  width,
  setOpen,
  currentChatRoom,
}: MentionSearchViewType) {
  const [searchResult, setSearchResult] = useState<User[]>([]);

  useEffect(() => {
    const search = async () => {
      const users = currentChatRoom.participants.filter(
        (participant) =>
          participant.nickname.includes(query) ||
          participant.username.includes(query)
      );
      if ("everyone".includes(query))
        users.push({
          id: -100,
          email: "everyone@accord.com",
          birthDate: new Date(),
          status: "ONLINE",
          statusMessage: "",
          profileImageUrl: null,
          profileColor: "#84CC16",
          nickname: "everyone",
          username: "everyone",
          isCallMuted: false,
          isVideoEnabled: false,
          isScreenShareEnabled: "no",
          isDeafened: false,
          accountType: "ACCORD",
          canPreviewStream: false,
          registeredAt: new Date(),
        });
      setSearchResult(users);
    };

    search();
  }, [query, currentChatRoom]);

  const handleSearchResultClick = useCallback(
    (user: User) => {
      const offset = editor.selection.anchor.offset;
      const textNode =
        editor.children[editor.selection.anchor.path[0]].children[
          editor.selection.anchor.path[1]
        ];
      if (Text.isText(textNode)) {
        const atIndex = textNode.text.lastIndexOf("@", offset - 1);
        if (atIndex !== -1) {
          for (let i = 0; i < offset - atIndex; i++)
            Editor.deleteBackward(editor, {
              unit: "character",
            });
        }
      }

      Transforms.insertNodes(editor, {
        type: "mention",
        content: user.id.toString(),
        children: [
          {
            text: `@${user.id}`,
          },
        ],
      });

      Transforms.select(editor, Editor.end(editor, []));

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
      <p className="font-bold text-sm">MEMBERS matching @{query}</p>
      <div className="overflow-y-scroll w-full h-full flex flex-col mt-2">
        {searchResult?.map((data: User) => {
          return (
            <div
              key={data.id}
              onClick={() => handleSearchResultClick(data)}
              className="flex items-center gap-2 justify-start transition hover:bg-lime-600 cursor-pointer p-0.5 rounded-md"
            >
              <ProfileAvatar user={data} size={24} />
              <p className="ml-2">
                {data.nickname.length > 0 ? data.nickname : data.username}
              </p>
              <p className="ml-auto hidden sm:inline text-lime-700">
                {data.username}
                {data.id && data.id !== -100 ? (
                  <span className="text-opacity-70 text-lime-600">
                    #{data.id}
                  </span>
                ) : (
                  <span> in this chatroom</span>
                )}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  ) : (
    <></>
  );
}
