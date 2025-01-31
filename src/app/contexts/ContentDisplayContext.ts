import {
  createContext,
  Dispatch,
  MutableRefObject,
  SetStateAction,
} from "react";
import { ChatRoom } from "../types/ChatRoom";

const ContentDisplayContext = createContext<{
  contentMode: string;
  contentModeSetter: Dispatch<SetStateAction<string>>;
  shouldBatchResetChatsQuery: number;
  setShouldBatchResetChatsQuery: Dispatch<SetStateAction<number>>;
  contextMenus: [string, React.ReactNode][];
  setContextMenus: Dispatch<SetStateAction<[string, React.ReactNode][]>>;
  rootMusicPlayerOptions: {
    targetElement: HTMLDivElement | null;
    src: string;
    uuid: string;
    customTextColor: string;
    autoPlay: undefined | "simple" | "withevent";
    loop: boolean;
    allLoop: boolean;
    srcList: string[];
    icon?: string;
  } | null;
  setRootMusicPlayerOptions: Dispatch<
    SetStateAction<{
      targetElement: HTMLDivElement | null;
      src: string;
      uuid: string;
      customTextColor: string;
      autoPlay: undefined | "simple" | "withevent";
      loop: boolean;
      allLoop: boolean;
      srcList: string[];
      icon?: string;
    } | null>
  >;
  rootMusicPlayerRef: MutableRefObject<HTMLAudioElement | null>;
  getContentFilterFlags: (chatRoom: ChatRoom | undefined) => [string, string];
} | null>(null);

export default ContentDisplayContext;
