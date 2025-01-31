/* eslint-disable react/display-name */
"use client";
import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ProfileAvatar from "./ProfileAvatar";

import FloatingButton from "./FloatingButton";
import {
  FaArrowLeft,
  FaArrowRight,
  FaBan,
  FaCheck,
  FaCrown,
  FaDownload,
  FaExternalLinkAlt,
  FaHandPeace,
  FaReply,
  FaSmile,
  FaUpload,
} from "react-icons/fa";
import { MdCallEnd, MdDelete, MdOpenInNew, MdWarning } from "react-icons/md";
import {
  AiFillEdit,
  AiFillFile,
  AiFillSound,
  AiFillVideoCamera,
} from "react-icons/ai";

import { ChatRecordType } from "../types/ChatRecordType";
import { add, format, formatDuration, intervalToDuration, sub } from "date-fns";
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
  NodeEntry,
  Path,
  Range,
  Text,
  Transforms,
} from "slate";
import { CustomText } from "../types/Editor";
import Constants from "../constants/Constants";
import { Element } from "slate";
import CodeBlock from "./CodeBlock";
import { Popover } from "react-tiny-popover";
import EmojiChatComponent from "./EmojiChatComponent";
import ChatInput from "./ChatInput";
import { ChatRoom } from "../types/ChatRoom";
import { User } from "../types/User";
import {
  InfiniteData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import api from "../api/api";
import ModalContext from "../contexts/ModalContext";
import ModalUtils from "../util/ModalUtil";
import EmojiPicker from "@emoji-mart/react";
import { ChatReaction } from "../types/ChatReaction";
import ChatReactionTag from "./ChatReactionTag";
import Usercard from "./Usercard";
import GenericUtil from "../util/GenericUtil";
import AudioPreview from "./AudioPreview";
import VideoPreview from "./VideoPreview";
import TextPreview from "./TextPreview";
import {
  RiClipboardFill,
  RiPassExpiredFill,
  RiPushpinFill,
  RiUnpinFill,
} from "react-icons/ri";
import PrimaryButton from "./PrimaryButton";
import { GiPartyPopper, GiPeaceDove } from "react-icons/gi";
import { BiSolidRename } from "react-icons/bi";
import { BarLoader } from "react-spinners";
import AnimateHeight from "react-animate-height";
import { FaX } from "react-icons/fa6";
import useNextRenderSetState from "../hooks/useNextRenderSetState";
import Poll from "./PollUI";
import { BsEmojiNeutralFill, BsEmojiSmile } from "react-icons/bs";
import MentionBlock from "./MentionBlock";
import SpoilerChatComponent from "./SpoilerChatComponent";
import SpoilerAttachmentWrapper from "./SpoilerAttachmentWrapper";
import ToastUtils from "../util/ToastUtil";
import ToastContext from "../contexts/ToastContext";
import { IoIosCall } from "react-icons/io";
import { useRouter } from "next/navigation";
import useIsLightMode from "../hooks/useIsLightMode";
import { IoShield } from "react-icons/io5";
import { ChatRoomRoleSettings } from "../types/ChatRoomRoleSettings";

type ChatRecordPropsType = {
  record: ChatRecordType;
  dividerText?: string;
  showDetails?: boolean;
  currentChatRoom: ChatRoom;
  currentUser: User;
  emojiSearchViewWidth?: number;
  editModeId?: number;
  setEditModeId?: Dispatch<SetStateAction<number>>;
  isSimplePreview?: boolean;
  showPinControllers?: boolean;
  setReplyTarget?: Dispatch<SetStateAction<ChatRecordType | undefined>>;
  handleNavigateToChatRecord?: (id: number) => void;
  setShowPinnedMessages?: Dispatch<SetStateAction<boolean>>;
  chatViewRef?: HTMLDivElement;

  showJumpToMessageButton?: boolean;
  searchContent?: string;
  simplePreviewCustomStyles?: string;

  customHoverColor?: string;
};

const ChatRecord = React.memo(
  ({
    setReplyTarget,
    setShowPinnedMessages,
    handleNavigateToChatRecord,
    record,
    isSimplePreview = false,
    dividerText = "",
    showDetails = true,
    currentChatRoom,
    currentUser,
    emojiSearchViewWidth,
    editModeId,
    setEditModeId,
    showPinControllers = false,
    chatViewRef,

    showJumpToMessageButton = false,
    searchContent = "",
    simplePreviewCustomStyles = "shadow-2xl rounded-md p-4",
  }: ChatRecordPropsType) => {
    const [rerender, setRerender] = useState(false);

    const [msgDisplayMode, setMsgDisplayMode] = useState(
      localStorage.getItem("msgDisplay") ?? "Cozy"
    );
    const [showAvatarsOnCompactMode, setShowAvatarsOnCompactMode] = useState(
      (localStorage.getItem("avatarsCompact") ?? "false") === "true"
    );

    const [chatFontScale, setChatFontScale] = useState(
      isNaN(parseFloat(localStorage.getItem("chatFontScale") ?? "33.33333333"))
        ? 33.333333333
        : parseFloat(localStorage.getItem("chatFontScale") ?? "33.333333333")
    );

    const [msgSpaceScale, setMsgSpaceScale] = useState(
      isNaN(parseFloat(localStorage.getItem("msgSpaceScale") ?? "66.67"))
        ? 66.67
        : parseFloat(localStorage.getItem("msgSpaceScale") ?? "66.67")
    );

    const [displayDirectPreview, setDisplayDirectPreview] = useState(
      localStorage.getItem("displayDirectPreview") ?? "yes"
    );

    const [displayLinkPreview, setDisplayLinkPreview] = useState(
      localStorage.getItem("displayLinkPreview") ?? "yes"
    );

    const [displayEmbed, setDisplayEmbed] = useState(
      localStorage.getItem("displayEmbed") ?? "yes"
    );

    const [displayChatReaction, setDisplayChatReaction] = useState(
      localStorage.getItem("displayChatReaction") ?? "yes"
    );

    const [timeFormat, setTimeFormat] = useState(
      localStorage.getItem("timeFormat") ?? "12-hour"
    );

    const [underlineLinks, setUnderlineLinks] = useState(
      (localStorage.getItem("underlineLinks") ?? "yes") === "yes"
    );

    const [displaySpoiler, setDisplaySpoiler] = useState(
      localStorage.getItem("displaySpoiler") ?? "click"
    );

    const [convertEmoticon, setConvertEmoticon] = useState(
      (localStorage.getItem("convertEmoticon") ?? "yes") === "yes"
    );

    const [previewSyntax, setPreviewSyntax] = useState(
      (localStorage.getItem("previewSyntax") ?? "yes") === "yes"
    );

    const router = useRouter();
    const [unblurNSFW, setUnblurNSFW] = useState(
      record.sender?.id === currentUser.id && !record.replyTargetMessage?.length
    );

    const shouldShowDetails = useMemo(() => {
      return showDetails || msgDisplayMode === "Compact";
    }, [showDetails, msgDisplayMode]);

    useLayoutEffect(() => {
      const handler = (e: StorageEvent | undefined) => {
        if (e && e.key === "msgDisplay") {
          setMsgDisplayMode(e.newValue ?? "Cozy");
        } else if (e && e.key === "avatarsCompact") {
          setShowAvatarsOnCompactMode(e.newValue === "true");
        } else if (e && e.key === "chatFontScale") {
          const val = parseFloat(e.newValue ?? "33.33333");
          setChatFontScale(isNaN(val) ? 33.3333333 : val);
          editor.onChange();
        } else if (e && e.key === "msgSpaceScale") {
          const val = parseFloat(e.newValue ?? "66.67");
          setMsgSpaceScale(isNaN(val) ? 66.67 : val);
        } else if (e && e.key === "timeFormat") {
          setTimeFormat(e.newValue ?? "12-hour");
        } else if (e && e.key === "underlineLinks") {
          setUnderlineLinks(e.newValue === "yes");
          editor.onChange();
        } else if (e && e.key === "displayLinkPreview") {
          setDisplayLinkPreview(e.newValue ?? "yes");
        } else if (e && e.key === "displayDirectPreview") {
          setDisplayDirectPreview(e.newValue ?? "yes");
        } else if (e && e.key === "displayEmbed") {
          setDisplayEmbed(e.newValue ?? "yes");
        } else if (e && e.key === "displayChatReaction") {
          setDisplayChatReaction(e.newValue ?? "yes");
        } else if (e && e.key === "convertEmoticon") {
          setConvertEmoticon(e.newValue === "yes");
        } else if (e && e.key === "previewSyntax") {
          setPreviewSyntax(e.newValue === "yes");
        } else if (e && e.key === "displaySpoiler") {
          setDisplaySpoiler(e.newValue ?? "click");
          editor.onChange();
        }

        if (
          record.sender?.id === currentUser.id &&
          !record.replyTargetMessage?.length
        )
          return;

        if (currentChatRoom.id <= 0) {
          return;
        }

        const friends = queryClient.getQueryData<{ data: User[] }>([
          "friends",
        ])?.data;
        if (!friends) {
          return;
        }

        if (
          e &&
          ![
            "dm_friends_sensitive",
            "dm_others_sensitive",
            "group_sensitive",
          ].includes(e.key ?? "none")
        ) {
          return;
        }

        if (currentChatRoom.direct1to1Identifier?.length) {
          let otherUserId = record.sender?.id;
          if (otherUserId === currentUser.id && record.replyTargetSender) {
            otherUserId = record.replyTargetSender.id;
          }

          if (otherUserId === currentUser.id) {
            setUnblurNSFW(true);
          } else if (friends.find((e) => e.id === otherUserId)) {
            setUnblurNSFW(
              (localStorage.getItem("dm_friends_sensitive") ?? "Show") ===
                "Show"
            );
          } else {
            setUnblurNSFW(
              (localStorage.getItem("dm_others_sensitive") ?? "Show") === "Show"
            );
          }
        } else {
          setUnblurNSFW(
            (localStorage.getItem("group_sensitive") ?? "Show") === "Show"
          );
        }
      };

      handler(undefined);
      window.addEventListener("storage", handler);

      return () => {
        window.removeEventListener("storage", handler);
      };
    }, []);

    const numUnread = useMemo(() => {
      if (isSimplePreview) return 0;

      let unread = currentChatRoom.participants.length;
      const time = sub(record.date, {}).getTime();

      currentChatRoom.participants.forEach((p) => {
        if (
          p.firstUnreadMessageTimestamp !== undefined &&
          p.firstUnreadMessageTimestamp > 0
        ) {
          if (time < p.firstUnreadMessageTimestamp) {
            unread--;
          }
        } else {
          unread--;
        }
      });

      return unread;
    }, [currentChatRoom.participants, record.date, isSimplePreview]);

    const [reactionEmojiPickerOpen, setReactionEmojiPickerOpen] =
      useState(false);
    const [animatingReactionTag, setAnimatingReactionTag] = useState(false);
    const [openUserCard, setOpenUserCard] = useState(false);
    const [openReplyUserCard, setOpenReplyUserCard] = useState(false);
    const [isUserMentioned, setIsUserMentioned] = useState(false);
    const [attachmentItems, setAttachmentItems] = useState<React.ReactNode>(
      <></>
    );
    const [embeds, setEmbeds] = useState<string[]>([]);

    const [embeddableItems, setEmbeddableItems] = useState<React.ReactNode>(
      <></>
    );

    const [embedLoadingCount, setEmbedLoadingCount] = useState(0);

    const nextRenderSetState = useNextRenderSetState(setEmbeds);

    const chatReactionTagRefs = useRef<
      Map<
        string,
        {
          counterDown: () => void;
          counterUp: () => void;
        } | null
      >
    >(new Map());

    const openSingleImageViewModal = useCallback((url: string) => {
      ModalUtils.openCustomModal(
        modalContext,

        <div className="flex items-center gap-2 text-lime-300 bg-transparent justify-center self-center">
          <div className="flex flex-col bg-transparent">
            <img
              src={url}
              className="w-auto max-w-full h-auto max-h-[75vh] rounded-md"
            />
            <p
              onClick={() => {
                const link = document.createElement("a");
                link.href = url;
                link.target = "_blank";
                link.click();
              }}
              className="ml-2 text-lg cursor-pointer transition hover:underline hover:text-opacity-90 text-opacity-50 text-lime-300"
            >
              Open in Browser
            </p>
          </div>
        </div>,
        true
      );
    }, []);

    const openImageViewModal = useCallback(
      (i: number, fullFileNames: string[]) => {
        const fullFileName = fullFileNames[i];

        ModalUtils.openCustomModal(
          modalContext,

          <div className="flex items-center gap-2 text-lime-300 bg-transparent justify-center self-center">
            <div
              className="cursor-pointer"
              onClick={() => {
                let prevI = i - 1;
                if (prevI < 0) prevI = fullFileNames.length - 1;
                openImageViewModal(prevI, fullFileNames);
              }}
            >
              <FaArrowLeft size={32} />
            </div>

            <div className="flex flex-col bg-transparent">
              <img
                src={Constants.SERVER_STATIC_CONTENT_PATH + fullFileName}
                className="w-auto max-w-full h-auto max-h-[75vh] rounded-md"
              />
              <p
                onClick={() => {
                  const link = document.createElement("a");
                  link.href =
                    Constants.SERVER_STATIC_CONTENT_PATH + fullFileName;
                  link.target = "_blank";
                  link.click();
                }}
                className="ml-2 text-lg cursor-pointer transition hover:underline hover:text-opacity-90 text-opacity-50 text-lime-300"
              >
                Open in Browser
              </p>
            </div>
            <div
              className="cursor-pointer"
              onClick={() => {
                let nextI = i + 1;
                if (nextI >= fullFileNames.length) nextI = 0;
                openImageViewModal(nextI, fullFileNames);
              }}
            >
              <FaArrowRight size={32} />
            </div>
          </div>,
          true
        );
      },
      []
    );

    useEffect(() => {
      const handleLoadAttachmentItems = async () => {
        if (
          record.attachments &&
          record.attachments.length > 0 &&
          record.attachmentsMetadata &&
          record.attachmentsMetadata.length > 0 &&
          record.type !== "pending_text"
        ) {
          const generics = [];
          const images: { attachment: string; metadata: string }[] = [];
          const audios = [];
          const videos = [];
          const texts = [];

          const metadata = record.attachmentsMetadata.split(" ");
          const attachments = record.attachments.split(",").slice(0, -1);
          if (metadata.length !== attachments.length) {
            console.error("Invalid attachment metadata found");
            return;
          }

          //group by file format
          for (let i = 0; i < attachments.length; i++) {
            const attachment = attachments[i];
            const meta = metadata[i];
            const data = attachment.split(";");
            const fileName = data[2];
            let extension = "";
            if (fileName.lastIndexOf(".") !== -1) {
              extension = fileName.substring(fileName.lastIndexOf(".") + 1);
            }
            if (
              (extension === "jpg" ||
                extension === "jpeg" ||
                extension === "png" ||
                extension === "gif" ||
                extension === "webp") &&
              displayDirectPreview === "yes"
            ) {
              images.push({
                attachment: attachment,
                metadata: meta,
              });
            } else if (
              (extension === "mp3" ||
                extension === "wav" ||
                extension === "ogg") &&
              displayDirectPreview === "yes"
            ) {
              audios.push({
                attachment: attachment,
                metadata: meta,
              });
            } else if (
              (extension === "mp4" || extension === "webm") &&
              displayDirectPreview === "yes"
            ) {
              videos.push({
                attachment: attachment,
                metadata: meta,
              });
            } else if (
              extension === "txt" ||
              extension === "java" ||
              extension === "cpp"
            ) {
              texts.push({
                attachment: attachment,
                metadata: meta,
              });
            } else {
              generics.push({
                attachment: attachment,
                metadata: meta,
              });
            }
          }

          const textItems = texts.map((attachment) => {
            const data = attachment.attachment.split(";");
            const uuid = data[0];
            const fileSize = data[1];
            const fileName = data[2];

            const fullFileName = uuid + "_" + fileName;

            return (
              <SpoilerAttachmentWrapper
                key={attachment.attachment.substring(0, 36)}
                active={attachment.metadata === "s"}
              >
                <div
                  className={`rounded-md mt-2 relative group/attachments flex ${
                    isSimplePreview ? "w-[75%]" : "w-full"
                  } border-[1px] border-lime-400 bg-lime-600 text-lime-300 items-center gap-2`}
                >
                  <TextPreview
                    isSimplePreview={isSimplePreview}
                    record={record}
                    fileName={fileName}
                    fullFileName={fullFileName}
                    fileSize={fileSize}
                    currentUser={currentUser}
                    uuid={uuid}
                    handleDeleteChatAttachment={handleDeleteChatAttachment}
                  />
                </div>
              </SpoilerAttachmentWrapper>
            );
          });

          const videoItems = videos.map((attachment) => {
            const data = attachment.attachment.split(";");
            const uuid = data[0];
            const fileSize = data[1];
            const fileName = data[2];

            const fullFileName = uuid + "_" + fileName;

            return (
              <SpoilerAttachmentWrapper
                key={attachment.attachment.substring(0, 36)}
                active={attachment.metadata === "s"}
              >
                <div
                  className={`rounded-md mt-2 relative group/attachments flex w-full border-[1px] border-lime-400 bg-lime-600 text-lime-300 p-2 items-center gap-2`}
                >
                  <div className="flex flex-col w-full gap-2">
                    <div className="flex items-center w-full">
                      <div className="mr-2">
                        <AiFillVideoCamera size={48} />
                      </div>
                      <div className="flex flex-col gap-1 w-full h-full">
                        <p
                          onClick={() => {
                            const link = document.createElement("a");
                            link.href =
                              Constants.SERVER_ATTACHMENT_CONTENT_PATH +
                              fullFileName;
                            link.download = fileName;

                            link.click();
                          }}
                          className="underline text-blue-500 transition cursor-pointer
                         hover:text-opacity-70"
                          style={{ overflowWrap: "anywhere" }}
                        >
                          {fileName}
                        </p>
                        <p className="text-sm text-lime-400">{fileSize}MB</p>
                      </div>
                    </div>
                    <hr className="text-lime-400 bg-lime-400 border-lime-400" />
                    <VideoPreview
                      src={Constants.SERVER_STATIC_CONTENT_PATH + fullFileName}
                      uuid={uuid}
                    />
                  </div>

                  <div
                    className={`${
                      record.type === "pending_text" && "hidden"
                    } hidden group-hover/attachments:flex absolute right-[0.5rem] top-[0.5rem]`}
                  >
                    <FloatingButton
                      onClick={() => {
                        const link = document.createElement("a");
                        link.href =
                          Constants.SERVER_ATTACHMENT_CONTENT_PATH +
                          fullFileName;
                        link.download = fileName;

                        link.click();
                      }}
                      description="Download"
                      backgroundColor="bg-transparent"
                      backgroundGroupHoverColor="bg-lime-600"
                      customTextColor="text-lime-700"
                    >
                      <FaDownload />
                    </FloatingButton>

                    {record.sender &&
                      record.sender.id === currentUser.id &&
                      !isSimplePreview && (
                        <FloatingButton
                          onClick={() => {
                            handleDeleteChatAttachment(uuid);
                          }}
                          description="Delete"
                          backgroundColor="bg-transparent"
                          backgroundGroupHoverColor="bg-lime-600"
                          customTextColor="text-red-500"
                        >
                          <MdDelete />
                        </FloatingButton>
                      )}
                  </div>
                </div>
              </SpoilerAttachmentWrapper>
            );
          });

          const audioItems = audios.map((attachment) => {
            const data = attachment.attachment.split(";");
            const uuid = data[0];
            const fileSize = data[1];
            const fileName = data[2];

            const fullFileName = uuid + "_" + fileName;

            return (
              <SpoilerAttachmentWrapper
                key={attachment.attachment.substring(0, 36)}
                active={attachment.metadata === "s"}
              >
                <div
                  className={`rounded-md mt-2 relative group/attachments flex w-full border-[1px] border-lime-400 bg-lime-600 text-lime-300 p-2 items-center gap-2`}
                >
                  <div className="flex flex-col w-full gap-2">
                    <div className="flex items-center w-full">
                      <div className="mr-2">
                        <AiFillSound size={36} />
                      </div>

                      <div className="flex flex-col gap-1 w-full h-full">
                        <p
                          onClick={() => {
                            const link = document.createElement("a");
                            link.href =
                              Constants.SERVER_ATTACHMENT_CONTENT_PATH +
                              fullFileName;
                            link.download = fileName;

                            link.click();
                          }}
                          className="underline text-blue-500 transition cursor-pointer
                         hover:text-opacity-70"
                          style={{ overflowWrap: "anywhere" }}
                        >
                          {fileName}
                        </p>
                        <p className="text-sm text-lime-400">{fileSize}MB</p>
                      </div>
                    </div>
                    <hr className="text-lime-400 bg-lime-400 border-lime-400" />
                    <AudioPreview
                      src={Constants.SERVER_STATIC_CONTENT_PATH + fullFileName}
                      uuid={uuid}
                    />
                  </div>

                  <div
                    className={`${
                      record.type === "pending_text" && "hidden"
                    } hidden group-hover/attachments:flex absolute right-[0.5rem] top-[0.5rem]`}
                  >
                    <FloatingButton
                      onClick={() => {
                        const link = document.createElement("a");
                        link.href =
                          Constants.SERVER_ATTACHMENT_CONTENT_PATH +
                          fullFileName;
                        link.download = fileName;

                        link.click();
                      }}
                      description="Download"
                      backgroundColor="bg-transparent"
                      backgroundGroupHoverColor="bg-lime-600"
                      customTextColor="text-lime-700"
                    >
                      <FaDownload />
                    </FloatingButton>

                    {record.sender &&
                      record.sender.id === currentUser.id &&
                      !isSimplePreview && (
                        <FloatingButton
                          onClick={() => {
                            handleDeleteChatAttachment(uuid);
                          }}
                          description="Delete"
                          backgroundColor="bg-transparent"
                          backgroundGroupHoverColor="bg-lime-600"
                          customTextColor="text-red-500"
                        >
                          <MdDelete />
                        </FloatingButton>
                      )}
                  </div>
                </div>
              </SpoilerAttachmentWrapper>
            );
          });

          const genericItems = generics.map((attachment) => {
            const data = attachment.attachment.split(";");
            const uuid = data[0];
            const fileSize = data[1];
            const fileName = data[2];

            const fullFileName = uuid + "_" + fileName;

            return (
              <SpoilerAttachmentWrapper
                key={attachment.attachment.substring(0, 36)}
                active={attachment.metadata === "s"}
              >
                <div
                  className={`rounded-md mt-2 relative group/attachments flex w-full border-[1px] border-lime-400 bg-lime-600 text-lime-300 p-2 items-center gap-2`}
                >
                  <AiFillFile size={48} />
                  <div className="flex flex-col gap-1 w-full h-full">
                    <p
                      onClick={() => {
                        const link = document.createElement("a");
                        link.href =
                          Constants.SERVER_ATTACHMENT_CONTENT_PATH +
                          fullFileName;
                        link.download = fileName;
                        link.click();
                      }}
                      className="underline text-blue-500 transition cursor-pointer
                         hover:text-opacity-70"
                      style={{ overflowWrap: "anywhere" }}
                    >
                      {fileName}
                    </p>
                    <p className="text-sm text-lime-400">{fileSize}MB</p>
                  </div>

                  <div
                    className={`${
                      record.type === "pending_text" && "hidden"
                    } hidden group-hover/attachments:flex absolute right-[0.5rem] top-[0.5rem]`}
                  >
                    <FloatingButton
                      onClick={() => {
                        const link = document.createElement("a");
                        link.href =
                          Constants.SERVER_ATTACHMENT_CONTENT_PATH +
                          fullFileName;
                        link.download = fileName;

                        link.click();
                      }}
                      description="Download"
                      backgroundColor="bg-transparent"
                      backgroundGroupHoverColor="bg-lime-600"
                      customTextColor="text-lime-700"
                    >
                      <FaDownload />
                    </FloatingButton>

                    {record.sender &&
                      record.sender.id === currentUser.id &&
                      !isSimplePreview && (
                        <FloatingButton
                          onClick={() => {
                            handleDeleteChatAttachment(uuid);
                          }}
                          description="Delete"
                          backgroundColor="bg-transparent"
                          backgroundGroupHoverColor="bg-lime-600"
                          customTextColor="text-red-500"
                        >
                          <MdDelete />
                        </FloatingButton>
                      )}
                  </div>
                </div>
              </SpoilerAttachmentWrapper>
            );
          });

          const imageGroups = [];

          let groupSize = 3;
          let rows = Math.ceil(images.length / groupSize);

          let gridHeight = GenericUtil.remToPx(12) * rows;
          let heightPerRow: string | number = gridHeight / rows;
          const width = "100%";

          if (images.length === 1) {
            heightPerRow = GenericUtil.remToPx(24);
            // width = "60%";
          } else if (images.length === 3) {
            //image length is 3, then group size should be 2
            groupSize = 2;
            rows = Math.ceil(images.length / groupSize);
            gridHeight = GenericUtil.remToPx(12) * rows;
            heightPerRow = gridHeight / rows;
          }

          for (let i = 0; i < images.length; i++) {
            //group by groupSize
            const groupedImages = [images[i]]
              .concat(new Array(groupSize - 1).fill(0).map(() => images[++i]))
              .filter((e) => e !== undefined);
            const fullFileNames = groupedImages.map((attachment) => {
              const data = attachment.attachment.split(";");
              const uuid = data[0];
              const fileName = data[2];

              const fullFileName = uuid + "_" + fileName;
              return fullFileName;
            });
            const group = (
              <div className="flex items-center gap-1 mt-1">
                {groupedImages.map((attachment, i) => {
                  const data = attachment.attachment.split(";");
                  const uuid = data[0];
                  const fileName = data[2];

                  const fullFileName = uuid + "_" + fileName;

                  return (
                    <SpoilerAttachmentWrapper
                      key={uuid}
                      active={attachment.metadata === "s"}
                    >
                      <div
                        key={uuid}
                        className={`rounded-md relative group/attachments flex bg-transparent w-full text-lime-300 items-center`}
                        style={{
                          width: width,
                          height: heightPerRow,
                        }}
                      >
                        <img
                          onClick={() => {
                            openImageViewModal(i, fullFileNames);
                          }}
                          draggable={false}
                          src={
                            Constants.SERVER_STATIC_CONTENT_PATH + fullFileName
                          }
                          className="w-full h-full object-cover rounded-md cursor-pointer"
                        ></img>

                        <div
                          className={`${
                            record.type === "pending_text" && "hidden"
                          } hidden group-hover/attachments:flex absolute right-[0.5rem] top-[0.5rem]`}
                        >
                          <FloatingButton
                            onClick={() => {
                              const link = document.createElement("a");
                              link.href =
                                Constants.SERVER_ATTACHMENT_CONTENT_PATH +
                                fullFileName;
                              link.download = "test";
                              link.click();
                            }}
                            description="Download"
                            backgroundColor="bg-transparent"
                            backgroundGroupHoverColor="bg-lime-600"
                            customTextColor="text-lime-700"
                          >
                            <FaDownload />
                          </FloatingButton>

                          {record.sender &&
                            record.sender.id === currentUser.id &&
                            !isSimplePreview && (
                              <FloatingButton
                                onClick={() => {
                                  handleDeleteChatAttachment(uuid);
                                }}
                                description="Delete"
                                backgroundColor="bg-transparent"
                                backgroundGroupHoverColor="bg-lime-600"
                                customTextColor="text-red-500"
                              >
                                <MdDelete />
                              </FloatingButton>
                            )}
                        </div>
                      </div>
                    </SpoilerAttachmentWrapper>
                  );
                })}
              </div>
            );

            imageGroups.push(group);
          }

          const imageItems = (
            <div key={"imageitems"} className="flex flex-col">
              {imageGroups.map((group, i) => {
                return <div key={i}>{group}</div>;
              })}
            </div>
          );

          setAttachmentItems([
            ...genericItems,
            imageItems,
            ...audioItems,
            ...videoItems,
            ...textItems,
          ]);
        } else {
          setAttachmentItems(<></>);
        }
      };

      handleLoadAttachmentItems();
    }, [
      record.sender,
      record.type,
      record.attachments,
      record.attachmentsMetadata,
      isSimplePreview,
      displayDirectPreview,
    ]);

    const modalContext = useContext(ModalContext);
    const toastContext = useContext(ToastContext);
    const queryClient = useQueryClient();

    const editMode = useMemo(() => {
      return editModeId === record.id;
    }, [editModeId]);

    useEffect(() => {
      const now = new Date();
      let nextDay12AM = add(now, {
        days: 1,
      });

      nextDay12AM = sub(nextDay12AM, {
        hours: now.getHours(),
        minutes: now.getMinutes(),
        seconds: now.getSeconds(),
      });

      setTimeout(() => {
        //re render due to date change
        setRerender((prev) => !prev);
      }, nextDay12AM.getTime() - now.getTime());
    }, []);

    const isToday = useCallback(
      (e: Date) => {
        e = sub(e, {});
        const now = new Date();
        return (
          e.getDate() === now.getDate() &&
          e.getFullYear() === now.getFullYear() &&
          e.getMonth() === now.getMonth()
        );
      },
      [rerender]
    );

    const isYesterday = useCallback(
      (e: Date) => {
        // console.log(e)
        e = sub(e, {});
        const now = sub(new Date(), {
          days: 1,
        });
        return (
          e.getDate() === now.getDate() &&
          e.getFullYear() === now.getFullYear() &&
          e.getMonth() === now.getMonth()
        );
      },
      [rerender]
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

    useEffect(() => {
      const point = { path: [0, 0], offset: 0 };
      editor.selection = { anchor: point, focus: point };
      const lines = record.message.split("\n") || [""];

      editor.children = [
        {
          type: "paragraph",
          children: [{ text: "" }],
        },
      ];

      let mentionTagMatches: RegExpExecArray[] = [];
      let path: Path = [0, 0];
      let isUserMentioned = false;

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

        mentionTagMatches = [...lines[i].matchAll(Constants.mentionRe)];

        for (let j = mentionTagMatches.length - 1; j >= 0; j--) {
          const match = mentionTagMatches[j];
          path = [editor.children.length - 2, 0];

          Transforms.select(editor, {
            anchor: {
              path: path,
              offset: match.index,
            },
            focus: {
              path: path,
              offset: match.index + match[0].length,
            },
          });

          const content = match[0].substring(4, match[0].length - 3);
          Transforms.insertNodes(editor, {
            type: "mention",
            content,
            children: [
              {
                text: match[0].substring(3, match[0].length - 3),
              },
            ],
          });

          if (content === currentUser.id.toString() || content === "-100") {
            isUserMentioned = true;
          }
          // Transforms.move(editor)
        }
      }

      const lastNodeIndex = editor.children.length - 1;

      const lastNode = editor.children[lastNodeIndex];

      if (
        lastNode.type === "paragraph" &&
        lastNode.children.length === 1 &&
        Text.isText(lastNode.children[0]) &&
        lastNode.children[0].text === ""
      ) {
        Transforms.removeNodes(editor, {
          at: [lastNodeIndex],
        });
      }

      if (record.replyTargetSender?.id === currentUser.id) {
        isUserMentioned = true;
      }
      setIsUserMentioned(isUserMentioned);
    }, [record.message, record.replyTargetSender, editMode, currentUser.id]);

    const useCacheTimeout = useRef<NodeJS.Timeout | null>(null);
    useEffect(() => {
      if (useCacheTimeout.current) clearTimeout(useCacheTimeout.current);
      useCache.current = false;
      useCacheTimeout.current = setTimeout(() => {
        useCache.current = true;
      }, 300);
    }, [editor.children]);
    const renderLeaf = useCallback(
      (props: RenderLeafProps) => {
        return props.leaf["editmark"] ? (
          <span
            style={{
              fontSize:
                0.75 * (12 + (chatFontScale / 100.0) * (24 - 12)) + "px",
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
                ${props.leaf["blockquote"] && "border-l-4 border-lime-400 py-2"}
                
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
                  ? `${
                      (props.leaf["list"] as unknown as number) * 0.5 + 0.5
                    }rem`
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
            ) : props.leaf["spoiler"] &&
              (displaySpoiler === "click" ||
                (displaySpoiler === "owned" &&
                  currentChatRoom.ownerId !== currentUser.id &&
                  !currentChatRoom.direct1to1Identifier?.length)) ? (
              <SpoilerChatComponent>{props.children}</SpoilerChatComponent>
            ) : (
              props.children
            )}
          </span>
        );
      },
      [
        chatFontScale,
        underlineLinks,
        currentChatRoom.ownerId,
        currentUser.id,
        currentChatRoom.direct1to1Identifier,
        displaySpoiler,
      ]
    );

    const escapeRegExpSpecialCharacters = useCallback((string: string) => {
      return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }, []);

    const decorationCache = useRef<Map<string, Range[]>>(new Map());

    const useCache = useRef<boolean>(false);

    const decorate = useCallback(
      (entry: NodeEntry) => {
        const ranges: Range[] = [];
        const embeds: string[] = [];

        //process multiline markdowns

        if (
          decorationCache.current.has(entry[1].join("@")) &&
          useCache.current
        ) {
          return decorationCache.current.get(entry[1].join("@"));
        }

        if ((entry[0] as unknown as Editor)["operations"]) {
          let allText = "";
          const lineLengths: number[] = [];
          const lines = [];

          if (record.edited) {
            const node = editor.children[editor.children.length - 1];
            const textNode = node.children[node.children.length - 1];
            let offset = 0;
            if (Text.isText(textNode)) {
              offset = textNode.text.length;
            }

            ranges.push({
              editmark: true,
              anchor: {
                path: [editor.children.length - 1, node.children.length - 1],
                offset: offset,
              },
              focus: {
                path: [editor.children.length - 1, node.children.length - 1],
                offset: offset,
              },
            });
          }

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
          const multilineMatches: { type: string; data: RegExpExecArray[] }[] =
            [
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
          decorationCache.current.set(entry[1].join("@"), ranges);
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

        if (searchContent.length > 0) {
          allMatches.push({
            type: "searchcontent",
            data: [
              ...entry[0].text.matchAll(
                new RegExp(escapeRegExpSpecialCharacters(searchContent), "g")
              ),
            ],
          });
        }

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
                  entry[0].text.replaceAll(Constants.emojiRe, "").trim()
                    .length > 0
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

        nextRenderSetState(() => {
          return embeds;
        });
        decorationCache.current.set(entry[1].join("@"), ranges);

        return ranges;
      },
      [record.edited, searchContent]
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
              <CodeBlock attributes={attributes} element={element}>
                {children}
              </CodeBlock>
            );
          case "mention":
            return (
              <MentionBlock
                attributes={attributes}
                element={element}
                currentChatRoom={currentChatRoom}
                currentUser={currentUser}
              >
                {children}
              </MentionBlock>
            );
          default:
            return (
              <p
                {...attributes}
                className={`whitespace-pre-wrap ${
                  record.type.startsWith("pending") && "text-opacity-50"
                }`}
                style={{
                  overflowWrap: "anywhere",
                }}
              >
                {children}
              </p>
            );
        }
      },
      [currentChatRoom, currentUser]
    );

    const deleteMessageMutation = useMutation({
      mutationFn: () => {
        return api.delete(`/chat/message/${currentChatRoom.id}/${record.id}`);
      },
      onSettled(data) {
        if (!data) return;
        if (data.status === 200) {
          queryClient.setQueryData(
            ["chats", currentChatRoom.id.toString()],
            (prev: InfiniteData<{ data: ChatRecordType[] }>) => {
              if (!prev) return undefined;

              const all: ChatRecordType[] = [];
              let deletionOcurred = false;
              for (const page of prev.pages) {
                for (const record_ of page.data) {
                  if (record_.id !== record.id) {
                    all.push(record_);
                  } else {
                    deletionOcurred = true;
                  }
                }
              }

              if (!deletionOcurred) return prev;

              const newPages = [];
              //dummy empty page if it was start of the page
              if (prev.pages[0].data.length === 0 || prev.pageParams[0] === 0) {
                newPages.push({
                  data: [],
                });
              }
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
        } else {
          ModalUtils.handleGenericError(modalContext, data);
        }
      },
    });

    const editMessageMutation = useMutation({
      mutationFn: (text: string) => {
        return api.put(`/chat/message/${currentChatRoom.id}/${record.id}`, {
          message: text,
        });
      },
      onSettled(data, _error, variables) {
        if (!data) return;

        if (data.status === 200) {
          queryClient.setQueryData(
            ["chats", currentChatRoom.id.toString()],
            (prev: InfiniteData<{ data: ChatRecordType[] }, number>) => {
              const pages: { data: ChatRecordType[] }[] = [];

              for (let i = 0; i < prev.pages.length; i++) {
                const original = prev.pages[i].data.map((e) => {
                  if (e.id === record.id) {
                    return { ...e, message: variables, edited: true };
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
        } else {
          ModalUtils.handleGenericError(modalContext, data);
        }

        if (setEditModeId) setEditModeId(-1);
      },
    });

    const handleEditMessage = useCallback(() => {
      if (!editMessageMutation.isPending) {
        editMessageMutation.mutate(GenericUtil.parseMarkdownText(editor));
      }
    }, [editMessageMutation]);

    const handleDeleteMessage = useCallback(() => {
      ModalUtils.openYesorNoModal(
        modalContext,
        "Delete Message",
        "",
        () => {
          if (!deleteMessageMutation.isPending) {
            deleteMessageMutation.mutate();
          }
        },
        () => {},
        <div>
          <p className="text-sm">
            Are you sure you want to delete this message?
          </p>
          <ChatRecord
            record={record}
            currentChatRoom={currentChatRoom}
            currentUser={currentUser}
            emojiSearchViewWidth={emojiSearchViewWidth}
            editModeId={editModeId}
            setEditModeId={setEditModeId}
            setReplyTarget={setReplyTarget}
            isSimplePreview={true}
          />
        </div>
      );
    }, [deleteMessageMutation]);

    const chatReactionMutation = useMutation({
      mutationFn: (code: string) => {
        return api.post(`/chat/reaction/${currentChatRoom.id}/${record.id}`, {
          reaction: code,
        });
      },
      onSettled(data, _error, variables) {
        if (!data) return;

        if (data.status === 200) {
          //replace the optimistic data to real data
          queryClient.setQueryData(
            ["chats", currentChatRoom.id.toString()],
            (prev: InfiniteData<{ data: ChatRecordType[] }, number>) => {
              const pages: { data: ChatRecordType[] }[] = [];

              for (let i = 0; i < prev.pages.length; i++) {
                const original = prev.pages[i].data.map((e) => {
                  if (e.id === record.id) {
                    return {
                      ...e,
                      chatReactions: e.chatReactions.map((reaction) => {
                        if (
                          reaction.id === -10 &&
                          reaction.code === variables &&
                          reaction.reactorId === currentUser.id
                        ) {
                          return data.data;
                        }
                        return reaction;
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
        } else if (data.status === 400) {
          ModalUtils.openGenericModal(modalContext, "Oof!", data.data);
          //delete the optimistic data
          queryClient.setQueryData(
            ["chats", currentChatRoom.id.toString()],
            (prev: InfiniteData<{ data: ChatRecordType[] }, number>) => {
              const pages: { data: ChatRecordType[] }[] = [];

              for (let i = 0; i < prev.pages.length; i++) {
                const original = prev.pages[i].data.map((e) => {
                  if (e.id === record.id) {
                    return {
                      ...e,
                      chatReactions: e.chatReactions.filter(
                        (reaction) =>
                          reaction.id !== -10 ||
                          reaction.code !== variables ||
                          reaction.reactorId !== currentUser.id
                      ),
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
        } else {
          ModalUtils.handleGenericError(modalContext, data);

          //delete the optimistic data
          queryClient.setQueryData(
            ["chats", currentChatRoom.id.toString()],
            (prev: InfiniteData<{ data: ChatRecordType[] }, number>) => {
              const pages: { data: ChatRecordType[] }[] = [];

              for (let i = 0; i < prev.pages.length; i++) {
                const original = prev.pages[i].data.map((e) => {
                  if (e.id === record.id) {
                    return {
                      ...e,
                      chatReactions: e.chatReactions.filter(
                        (reaction) =>
                          reaction.id !== -10 ||
                          reaction.code !== variables ||
                          reaction.reactorId !== currentUser.id
                      ),
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
        }
      },
    });

    const chatUnreactionMutation = useMutation({
      mutationFn: ({ code }: { code: string; originalData: ChatReaction }) => {
        return api.post(`/chat/unreaction/${currentChatRoom.id}/${record.id}`, {
          reaction: code,
        });
      },
      onSettled(data, _error, variables) {
        if (!data) return;

        if (data.status === 200) {
          //nothing to do, already optimistically updated
        } else if (data.status === 400) {
          ModalUtils.openGenericModal(modalContext, "Oof!", data.data);
          //rollback optimistic data
          queryClient.setQueryData(
            ["chats", currentChatRoom.id.toString()],
            (prev: InfiniteData<{ data: ChatRecordType[] }, number>) => {
              const pages: { data: ChatRecordType[] }[] = [];

              for (let i = 0; i < prev.pages.length; i++) {
                const original = prev.pages[i].data.map((e) => {
                  if (e.id === record.id) {
                    return {
                      ...e,
                      chatReactions: [
                        ...e.chatReactions,
                        variables.originalData,
                      ],
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
        } else {
          ModalUtils.handleGenericError(modalContext, data);

          //rollback optimistic data
          queryClient.setQueryData(
            ["chats", currentChatRoom.id.toString()],
            (prev: InfiniteData<{ data: ChatRecordType[] }, number>) => {
              const pages: { data: ChatRecordType[] }[] = [];

              for (let i = 0; i < prev.pages.length; i++) {
                const original = prev.pages[i].data.map((e) => {
                  if (e.id === record.id) {
                    return {
                      ...e,
                      chatReactions: [
                        ...e.chatReactions,
                        variables.originalData,
                      ],
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
        }
      },
    });

    const handleChatReaction = useCallback(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (e: any) => {
        //cannot apply chat reactions in simple preview mode
        if (isSimplePreview) {
          return;
        }
        const code = e["shortcodes"];

        let exist = false;
        let originalData: ChatReaction | null = null;
        if (animatingReactionTag) return;

        for (const reaction of record.chatReactions) {
          if (reaction.code === code && reaction.reactorId === currentUser.id) {
            exist = true;
            originalData = reaction;
            break;
          }
        }

        if (exist) {
          if (
            !chatUnreactionMutation.isPending &&
            !chatReactionMutation.isPending
          ) {
            //optimistic update

            setAnimatingReactionTag(true);

            const ref = chatReactionTagRefs.current.get(code);
            if (ref) ref.counterDown();

            setTimeout(() => {
              queryClient.setQueryData(
                ["chats", currentChatRoom.id.toString()],
                (prev: InfiniteData<{ data: ChatRecordType[] }, number>) => {
                  const pages: { data: ChatRecordType[] }[] = [];

                  for (let i = 0; i < prev.pages.length; i++) {
                    const original = prev.pages[i].data.map((e) => {
                      if (e.id === record.id) {
                        return {
                          ...e,
                          chatReactions: e.chatReactions.filter(
                            (reaction) =>
                              reaction.code !== code ||
                              reaction.reactorId !== currentUser.id
                          ),
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

              chatUnreactionMutation.mutate({
                code: code,
                originalData: originalData!,
              });

              setAnimatingReactionTag(false);
            }, 100);
          }
        } else {
          if (
            !chatReactionMutation.isPending &&
            !chatUnreactionMutation.isPending
          ) {
            //optimistic update

            setAnimatingReactionTag(true);
            const ref = chatReactionTagRefs.current.get(code);

            if (ref) ref.counterUp();

            setTimeout(() => {
              const expectedData: ChatReaction = {
                id: -10,
                code: code,
                reactorId: currentUser.id,
                recordId: record.id,
                reactorName:
                  currentUser.nickname.length > 0
                    ? currentUser.nickname
                    : currentUser.username,
                reactorUsername: currentUser.username,
              };
              queryClient.setQueryData(
                ["chats", currentChatRoom.id.toString()],
                (prev: InfiniteData<{ data: ChatRecordType[] }, number>) => {
                  const pages: { data: ChatRecordType[] }[] = [];

                  for (let i = 0; i < prev.pages.length; i++) {
                    const original = prev.pages[i].data.map((e) => {
                      if (e.id === record.id) {
                        return {
                          ...e,
                          chatReactions: [...e.chatReactions, expectedData],
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

              chatReactionMutation.mutate(code);

              setAnimatingReactionTag(false);
            }, 100);
          }
        }
      },
      [
        record.id,
        record.chatReactions,
        currentUser,
        chatReactionMutation,
        chatUnreactionMutation,
        animatingReactionTag,
      ]
    );

    const reactionsMerged = useMemo(() => {
      const merged = new Map<
        string,
        [number, boolean, { displayName: string; username: string }[]]
      >();

      if (!record.chatReactions) {
        return [];
      }

      for (const reaction of record.chatReactions) {
        if (!merged.has(reaction.code))
          merged.set(reaction.code, [0, false, []]);
        const item = merged.get(reaction.code);

        item![0]++;

        if (!item![1]) item![1] = reaction.reactorId === currentUser.id;

        item![2].push({
          displayName: reaction.reactorName,
          username: reaction.reactorUsername,
        });

        merged.set(reaction.code, item!);
      }

      return [...merged.entries()];
    }, [JSON.stringify(record.chatReactions)]);

    const pinMessageMutation = useMutation({
      mutationFn: () => {
        return api.post(
          `/chat/message/${currentChatRoom.id}/pinned/${record.id}`
        );
      },
      onSettled(data) {
        if (!data) return;

        if (data.status === 200) {
          queryClient.setQueryData(
            ["chats", currentChatRoom.id.toString()],
            (prev: InfiniteData<{ data: ChatRecordType[] }, number>) => {
              const pages: { data: ChatRecordType[] }[] = [];

              for (let i = 0; i < prev.pages.length; i++) {
                const original = prev.pages[i].data.map((e) => {
                  if (e.id === record.id) {
                    return { ...record, pinned: true };
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
        } else if (
          data.status === 400 &&
          data.data === "Cannot pin more than 50 messages"
        ) {
          setTimeout(() => {
            ModalUtils.openGenericModal(
              modalContext,
              "Crap..",
              "You cannot pin more than 50 messages! Delete some!"
            );
          }, 500);
        } else {
          setTimeout(() => {
            ModalUtils.handleGenericError(modalContext, data);
          }, 500);
        }
      },
    });

    const unpinMessageMutation = useMutation({
      mutationFn: () => {
        return api.delete(
          `/chat/message/${currentChatRoom.id}/pinned/${record.id}`
        );
      },
      onSettled(data) {
        if (!data) return;

        if (data.status === 200) {
          queryClient.setQueryData(
            ["chats", currentChatRoom.id.toString()],
            (prev: InfiniteData<{ data: ChatRecordType[] }, number>) => {
              const pages: { data: ChatRecordType[] }[] = [];

              for (let i = 0; i < prev.pages.length; i++) {
                const original = prev.pages[i].data.map((e) => {
                  if (e.id === record.id) {
                    return { ...record, pinned: false };
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
        } else if (data.data === "Chat message already unpinned") {
          setTimeout(() => {
            ModalUtils.openGenericModal(
              modalContext,
              "Already done.",
              "Looks like someone already unpinned this message!",
              () => {
                queryClient.setQueryData(
                  ["chats", currentChatRoom.id.toString()],
                  (prev: InfiniteData<{ data: ChatRecordType[] }, number>) => {
                    const pages: { data: ChatRecordType[] }[] = [];

                    for (let i = 0; i < prev.pages.length; i++) {
                      const original = prev.pages[i].data.map((e) => {
                        if (e.id === record.id) {
                          return { ...record, pinned: false };
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
              }
            );
          }, 500);
        } else {
          setTimeout(() => {
            ModalUtils.handleGenericError(modalContext, data);
          }, 500);
        }
      },
    });

    const handleUnpinMessage = useCallback(() => {
      ModalUtils.openGenericModal(
        modalContext,
        "",
        "",
        () => {
          if (!unpinMessageMutation.isPending) {
            unpinMessageMutation.mutate();
          }
        },
        <div className="max-h-[30rem] overflow-y-scroll">
          <p className="text-md">You sure want to unpin this message?</p>
          <ChatRecord
            record={record}
            currentChatRoom={currentChatRoom}
            currentUser={currentUser}
            emojiSearchViewWidth={emojiSearchViewWidth}
            editModeId={editModeId}
            setEditModeId={setEditModeId}
            setReplyTarget={setReplyTarget}
            isSimplePreview={true}
          />
        </div>,
        [
          <PrimaryButton key={0} customStyles="mt-5 bg-red-500 w-full">
            Remove it please!
          </PrimaryButton>,
          <PrimaryButton
            key={1}
            customStyles="mt-5 bg-transparent hover:underline w-full"
          >
            Not yet
          </PrimaryButton>,
        ],
        <div className="flex items-center justify-center gap-2">
          <RiUnpinFill size={36} />
          <p className="text-white text-2xl">Unpin Message</p>
        </div>
      );
    }, [unpinMessageMutation]);
    const handlePinMessage = useCallback(() => {
      ModalUtils.openGenericModal(
        modalContext,
        "",
        "",
        () => {
          if (!pinMessageMutation.isPending) {
            pinMessageMutation.mutate();
          }
        },
        <div className="max-h-[30rem] overflow-y-scroll">
          <p className="text-md">
            Just double checking if you would like to pin it for posterity and
            greatness!
          </p>
          <ChatRecord
            record={record}
            currentChatRoom={currentChatRoom}
            currentUser={currentUser}
            emojiSearchViewWidth={emojiSearchViewWidth}
            editModeId={editModeId}
            setEditModeId={setEditModeId}
            setReplyTarget={setReplyTarget}
            isSimplePreview={true}
          />
        </div>,
        [
          <PrimaryButton key={0} customStyles="mt-5 bg-lime-500 w-full">
            Oh yeah , pin it.
          </PrimaryButton>,
          <PrimaryButton
            key={1}
            customStyles="mt-5 bg-transparent hover:underline w-full"
          >
            Not today
          </PrimaryButton>,
        ],
        <div className="flex items-center justify-center gap-2">
          <RiPushpinFill size={36} />
          <p className="text-white text-2xl">Pin for it.</p>
        </div>
      );
    }, [pinMessageMutation]);

    const deleteChatAttachmentMutationPendingRef = useRef<boolean>(false);

    //optimistic update
    const deleteChatAttachmentMutation = useMutation({
      onMutate: async (attachmentId: string) => {
        const previous = queryClient.getQueryData([
          "chats",
          currentChatRoom.id.toString(),
        ]);
        //optimstic update

        let attachmentsCode = "";
        let attachmentsMetadata = "";
        let i = 0;
        if (record.attachments && record.attachmentsMetadata) {
          const currentAttachments = record.attachments.split(",").slice(0, -1);
          const currentMetadata = record.attachmentsMetadata.split(" ");
          if (currentAttachments.length !== currentMetadata.length) {
            console.error("Invalid attachments metadata");
            return;
          }
          for (const attachment of currentAttachments) {
            const data = attachment.split(";");
            const uuid = data[0];
            console.log("test uuid: ", uuid);
            if (attachmentId === uuid) {
              i++;
              continue;
            }
            attachmentsCode += attachment + ",";
            attachmentsMetadata += currentMetadata[i] + " ";
            i++;
          }
        }

        attachmentsMetadata = attachmentsMetadata.trim();

        if (attachmentsCode.length === 0 && record.message.length === 0) {
          //the message is empty, delete the message altogether
          queryClient.setQueryData(
            ["chats", currentChatRoom.id.toString()],
            (prev: InfiniteData<{ data: ChatRecordType[] }>) => {
              if (!prev) return undefined;

              const all: ChatRecordType[] = [];
              let deletionOcurred = false;
              for (const page of prev.pages) {
                for (const record_ of page.data) {
                  if (record_.id !== record.id) {
                    all.push(record_);
                  } else {
                    deletionOcurred = true;
                  }
                }
              }

              if (!deletionOcurred) return prev;

              const newPages = [];
              //dummy empty page if it was start of the page
              if (prev.pages[0].data.length === 0 || prev.pageParams[0] === 0) {
                newPages.push({
                  data: [],
                });
              }
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
        } else {
          //otherwise, just deleting the attachment should do
          queryClient.setQueryData(
            ["chats", currentChatRoom.id.toString()],
            (prev: InfiniteData<{ data: ChatRecordType[] }, number>) => {
              const pages: { data: ChatRecordType[] }[] = [];

              for (let i = 0; i < prev.pages.length; i++) {
                const original = prev.pages[i].data.map((e) => {
                  if (e.id === record.id) {
                    return {
                      ...record,
                      attachments:
                        attachmentsCode.length > 0
                          ? attachmentsCode
                          : undefined,
                      attachmentsMetadata:
                        attachmentsMetadata.length > 0
                          ? attachmentsMetadata
                          : undefined,
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
        }
        return { previous };
      },

      mutationFn: (attachmentId: string) => {
        return api.delete(
          `/chat/message/attachments/${currentChatRoom.id}/${record.id}/${attachmentId}`
        );
      },
      onSettled(data, error, variables, context) {
        if (!data) return;

        if (data.status !== 200) {
          queryClient.setQueryData(
            ["chats", currentChatRoom.id.toString()],
            context?.previous
          );
          ModalUtils.handleGenericError(modalContext, data);
        }

        deleteChatAttachmentMutationPendingRef.current = false;
      },
    });

    const handleDeleteChatAttachment = useCallback((attachmentId: string) => {
      if (!deleteChatAttachmentMutationPendingRef.current) {
        deleteChatAttachmentMutationPendingRef.current = true;
        deleteChatAttachmentMutation.mutate(attachmentId);
      }
    }, []);

    const dateString = useMemo(() => {
      return isToday(record.date)
        ? `Today at ${format(
            record.date,
            timeFormat === "12-hour" ? "h:mm bbb" : "H:mm"
          )}`
        : isYesterday(record.date)
        ? `Yesterday at ${format(
            record.date,
            timeFormat === "12-hour" ? "h:mm bbb" : "H:mm"
          )}`
        : format(
            record.date,
            timeFormat === "12-hour" ? "MM/dd/yyyy h:mm bbb" : "MM/dd/yyyy H:mm"
          );
    }, [record.date, isToday, isYesterday, timeFormat]);

    const miliSecondsToDurationString = useCallback((milliseconds: string) => {
      if (isNaN(parseFloat(milliseconds))) {
        return "unknown";
      }
      // Calculate the start and end date based on milliseconds
      const start = new Date(0);
      const end = new Date(Number.parseInt(milliseconds));

      // Get duration object (days, hours, minutes, seconds, etc.)
      const duration = intervalToDuration({ start, end });

      // Format the duration object to a string
      return formatDuration(duration);
    }, []);

    //optimistic update
    const hideEmbedMutation = useMutation({
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
                if (e.id.toString() === record.id.toString()) {
                  return { ...e, hideEmbed: true };
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
          `/chat/message/${currentChatRoom.id}/${record.id}/embeds`
        );
      },
      onSettled(data, error, variables, context) {
        if (!data) return;
        if (data.status === 200) {
          //do nothing as optimistically updated
        } else {
          //roll back
          queryClient.setQueryData(
            ["chats", currentChatRoom.id],
            context?.previous
          );
          ModalUtils.handleGenericError(modalContext, data);
        }
      },
    });
    const embedsStringified = useMemo(() => {
      return JSON.stringify(embeds);
    }, [embeds]);

    const roleSettings = useQuery({
      queryKey: ["role_settings", currentChatRoom.id.toString()],
      queryFn: async () => {
        const response = await api.get<ChatRoomRoleSettings>(
          `/chatrooms/roleSettings/${currentChatRoom.id}`
        );

        return {
          data: response.data,
        };
      },
      refetchOnMount: false,
    });

    const handleHideEmbed = useCallback(() => {
      ModalUtils.openYesorNoModal(
        modalContext,
        "Too many embeds",
        "Are you sure you want to delete all the embeds from this message?",
        () => {
          if (!hideEmbedMutation.isPending) {
            hideEmbedMutation.mutate();
          }
        },
        undefined,
        undefined,
        ["Go ahead", "Nope"]
      );
    }, [hideEmbedMutation]);

    const isLightMode = useIsLightMode();

    const shouldShowDeleteButton = useMemo(() => {
      if (record.sender?.id === currentUser.id) {
        return true;
      }

      if (!roleSettings.data?.data || !record.sender || !currentUser.id) {
        return false;
      }

      if (
        currentChatRoom.direct1to1Identifier?.length &&
        record.sender.id !== currentUser.id
      ) {
        return false;
      }
      return GenericUtil.checkRoomPermission(
        currentChatRoom,
        currentUser.id,
        [record.sender.id],
        roleSettings.data.data.roleAllowDeleteMessage
      );
    }, [
      roleSettings.data?.data,
      currentChatRoom,
      record.sender?.id,
      currentUser.id,
    ]);

    const shouldShowPinButton = useMemo(() => {
      if (currentChatRoom.direct1to1Identifier?.length) {
        return true;
      }

      if (!roleSettings.data?.data || !record.sender || !currentUser.id) {
        return false;
      }

      return GenericUtil.checkRoomPermission(
        currentChatRoom,
        currentUser.id,
        undefined,
        roleSettings.data.data.roleAllowPinMessage
      );
    }, [
      roleSettings.data?.data,
      currentChatRoom,
      record.sender?.id,
      currentUser.id,
    ]);

    useEffect(() => {
      //if embed was already loading, return
      if (embedLoadingCount > 0) {
        return;
      }

      const handler = async () => {
        if (
          embeds.length === 0 ||
          isSimplePreview ||
          record.hideEmbed ||
          displayEmbed === "no"
        ) {
          setEmbeddableItems(<></>);
          return;
        }

        setEmbeddableItems(
          <div className="flex justify-center items-center">
            <BarLoader
              color={isLightMode ? "rgb(132,204,22)" : "rgb(163,230,53)"}
            />
          </div>
        );
        setEmbedLoadingCount(embeds.length);

        const embeddableItems = await Promise.all(
          embeds.map(async (url, i) => {
            //first, test if the url is a src for image/video/audio

            const mediaType =
              displayLinkPreview === "yes"
                ? await GenericUtil.checkMediaType(url)
                : "invalid";

            let metadata: {
              title: string;
              description: string;
              image: string;
              video: string;
              videoWidth: string;
              videoHeight: string;
              siteName: string;
            } = {
              title: "",
              description: "",
              image: "",
              video: "",
              videoWidth: "",
              videoHeight: "",
              siteName: "",
            };

            //if not direct content url, try to load in a general fashion

            if (mediaType === "invalid") {
              // console.log('fetching embeds: ', url, metadataCacheRef.current)

              try {
                const response = await api.post<{
                  title: string;
                  description: string;
                  image: string;
                  video: string;
                  videoWidth: string;
                  videoHeight: string;
                  siteName: string;
                }>(
                  `/fetchmetadata`,
                  {
                    url: url,
                  },
                  {}
                );
                if (response.status === 200) {
                  metadata = response.data;
                }
              } catch (e) {
                console.error("ERROR: ", e);
              }
            }

            if (displayLinkPreview === "no") {
              metadata.image = "";
              metadata.video = "";
            }

            if (
              !metadata.image.length &&
              !metadata.video.length &&
              mediaType === "invalid"
            ) {
              //embed contains no image nor video
              //decrement 1 loading count
              setEmbedLoadingCount((prev) => prev - 1);
            }

            return metadata.title.length > 0 || mediaType !== "invalid" ? (
              <div
                key={url + i}
                className={`group/embedding animate-fadeInUpFaster flex w-[70%] md:w-[50%] mb-2 ${
                  !shouldShowDetails ? "ml-[3.3rem]" : "ml-0"
                }`}
              >
                <div
                  className={`${
                    url.includes("youtube.com") ? "bg-red-500" : "bg-lime-400"
                  } w-[0.25rem]`}
                  style={{
                    borderRadius: "0.375rem 0 0 0.375rem",
                  }}
                ></div>
                <div
                  style={{
                    borderRadius: "0 0.375rem 0.375rem 0",
                  }}
                  className="pl-2 bg-lime-600 p-2 text-white w-full flex flex-col gap-2 relative"
                >
                  <div className="absolute right-0 px-2 gap-2 cursor-pointer hidden group-hover/embedding:flex justify-center items-center ">
                    <div
                      onClick={handleHideEmbed}
                      className="transition hover:text-lime-300"
                    >
                      <FaX />
                    </div>

                    <div
                      onClick={() => {
                        const link = document.createElement("a");
                        link.href = url;
                        link.target = "_blank";
                        link.click();
                      }}
                      className="transition hover:text-lime-300"
                    >
                      <FaExternalLinkAlt />
                    </div>
                  </div>
                  <p className="text-lime-300 text-sm">{metadata.siteName}</p>
                  {metadata.title.length > 0 ? (
                    <>
                      <p
                        className="text-2xl font-bold underline text-blue-500 hover:text-blue-400 transition cursor-pointer"
                        style={{
                          overflowWrap: "anywhere",
                        }}
                        onClick={() => {
                          const link = document.createElement("a");
                          link.href = url;
                          link.target = "_blank";
                          link.click();
                        }}
                      >
                        {metadata.title}
                      </p>
                      <p
                        className="text-sm"
                        style={{
                          overflowWrap: "anywhere",
                        }}
                      >
                        {metadata.description}
                      </p>
                    </>
                  ) : (
                    <></>
                  )}
                  {mediaType === "invalid" &&
                  metadata.image.length &&
                  metadata.video.length === 0 ? (
                    <img
                      key={
                        Math.floor(Math.random() * 1000000) +
                        1 +
                        new Date().getTime()
                      }
                      onLoad={() => setEmbedLoadingCount((prev) => prev - 1)}
                      onError={() => setEmbedLoadingCount((prev) => prev - 1)}
                      draggable={false}
                      className="max-w-full w-auto h-auto rounded-md"
                      src={metadata.image}
                    />
                  ) : (
                    <></>
                  )}

                  {mediaType === "invalid" && metadata.video.length ? (
                    <iframe
                      key={
                        Math.floor(Math.random() * 1000000) +
                        1 +
                        new Date().getTime()
                      }
                      draggable={false}
                      onLoad={() => setEmbedLoadingCount((prev) => prev - 1)}
                      onError={() => setEmbedLoadingCount((prev) => prev - 1)}
                      style={{
                        width:
                          metadata.videoWidth.length > 0
                            ? Number.parseInt(metadata.videoWidth) * 0.33
                            : "100%",
                        height:
                          metadata.videoHeight.length > 0
                            ? Number.parseInt(metadata.videoHeight) * 0.33
                            : "auto",
                      }}
                      className="max-w-full rounded-md self-center"
                      src={metadata.video}
                    />
                  ) : (
                    <></>
                  )}

                  {mediaType === "image" && (
                    <>
                      <img
                        key={
                          Math.floor(Math.random() * 1000000) +
                          1 +
                          url +
                          "_" +
                          new Date().getTime()
                        }
                        draggable={false}
                        className="max-w-full w-auto h-auto rounded-md cursor-pointer"
                        onLoad={() => {
                          setEmbedLoadingCount((prev) => prev - 1);
                        }}
                        onError={() => setEmbedLoadingCount((prev) => prev - 1)}
                        onClick={() => {
                          openSingleImageViewModal(url);
                        }}
                        src={url}
                      />
                    </>
                  )}

                  {mediaType === "audio" && (
                    <AudioPreview
                      key={Math.floor(Math.random() * 1000000) + 1 + Date.now()}
                      uuid={
                        "audioPreview_" +
                        (Math.floor(Math.random() * 1000000) + 1)
                      }
                      src={url}
                      customOnLoadedMetadata={() => {
                        setEmbedLoadingCount((prev) => prev - 1);
                      }}
                    />
                  )}

                  {mediaType === "video" && (
                    <>
                      <VideoPreview
                        key={
                          Math.floor(Math.random() * 1000000) + 1 + Date.now()
                        }
                        uuid={
                          "videoPreview_" +
                          (Math.floor(Math.random() * 1000000) + 1)
                        }
                        src={url}
                        customOnLoadedMetadata={() => {
                          setEmbedLoadingCount((prev) => prev - 1);
                        }}
                      />
                    </>
                  )}
                </div>
              </div>
            ) : (
              <></>
            );
          })
        );

        setEmbeddableItems(() => embeddableItems);
      };

      handler();
    }, [embedsStringified, record.hideEmbed, displayLinkPreview, displayEmbed]);

    const isSingleUrlMessage = useMemo(() => {
      const test = Constants.urlEntireMatchRe.test(record.message.trim());

      return test;
    }, [record.message]);

    return (
      <div
        style={{
          fontSize: 12 + ((24 - 12) * chatFontScale) / 100.0 + "px",
          marginTop:
            shouldShowDetails || record.type.startsWith("system")
              ? (24 * msgSpaceScale) / 100.0 + "px"
              : 0,
        }}
      >
        {record.type.startsWith("system") && (
          <div className="flex flex-col">
            <div className={`relative justify-center items-center flex`}>
              {dividerText.length > 0 && (
                <>
                  <div className="bg-lime-700 h-[0.1rem] w-full"></div>
                  <p className="min-w-fit mx-1 text-lime-700">{dividerText}</p>
                  <div className="bg-lime-700 h-[0.1rem] w-full"></div>
                </>
              )}
            </div>

            {record.type.startsWith(
              `system_private_${currentUser.id}_react`
            ) && (
              <div className="flex items-center mt-0 ml-4 text-lime-300">
                <div className="text-lime-300">
                  <BsEmojiSmile size={24} />
                </div>
                <div className="w-fit">
                  <p
                    className="ml-2"
                    style={{
                      overflowWrap: "anywhere",
                    }}
                  >
                    {record.sender
                      ? record.sender.nickname.length > 0
                        ? record.sender.nickname
                        : record.sender.username
                      : currentChatRoom.name}{" "}
                    reacted with{" "}
                    {/*@ts-expect-error jsx does not recognize em-emoji as valid syntax */}
                    <em-emoji shortcodes={record.message.split("@")[0]} /> on{" "}
                    <span
                      className="text-white cursor-pointer hover:underline transition hover:text-opacity-70"
                      onClick={() => {
                        const messageId = parseInt(
                          record.message.split("@")[1]
                        );
                        if (handleNavigateToChatRecord)
                          handleNavigateToChatRecord(messageId);
                      }}
                    >
                      your message
                    </span>
                    .
                  </p>
                </div>

                <div
                  style={{
                    overflowWrap: "anywhere",
                    fontSize:
                      0.75 * (12 + (chatFontScale / 100.0) * (24 - 12)) + "px",
                  }}
                  className="mr-2 mt-1 ml-2"
                >
                  {dateString}
                </div>
              </div>
            )}

            {record.type.startsWith(
              `system_private_${currentUser.id}_missedCall`
            ) && (
              <div className="flex items-center mt-0 ml-4 text-lime-300">
                <div className="rotate-180 text-red-500">
                  <IoIosCall size={24} />
                </div>
                <div className="w-fit">
                  <p
                    className="ml-2"
                    style={{
                      overflowWrap: "anywhere",
                    }}
                  >
                    You missed a call from{" "}
                    {record.sender
                      ? record.sender.nickname.length > 0
                        ? record.sender.nickname
                        : record.sender.username
                      : currentChatRoom.name}{" "}
                    {record.message.length > 0 ? (
                      <span>
                        which lasted{" "}
                        {miliSecondsToDurationString(record.message)}
                      </span>
                    ) : (
                      ""
                    )}
                    .
                  </p>
                </div>

                <div
                  style={{
                    overflowWrap: "anywhere",
                    fontSize:
                      0.75 * (12 + (chatFontScale / 100.0) * (24 - 12)) + "px",
                  }}
                  className="mr-2 mt-1 ml-2"
                >
                  {dateString}
                </div>
              </div>
            )}

            {record.type.startsWith("system_grant_moderator") &&
              record.sender && (
                <div className="flex items-center mt-0 ml-4 text-lime-300">
                  <IoShield size={24} />
                  <div className="w-fit">
                    <p
                      className="ml-2"
                      style={{
                        overflowWrap: "anywhere",
                      }}
                    >
                      {record.sender.nickname.length
                        ? record.sender.nickname
                        : record.sender.username}{" "}
                      has been granted a moderator status.
                    </p>
                  </div>

                  <div
                    style={{
                      overflowWrap: "anywhere",
                      fontSize:
                        0.75 * (12 + (chatFontScale / 100.0) * (24 - 12)) +
                        "px",
                    }}
                    className="mr-2 mt-1 ml-2"
                  >
                    {dateString}
                  </div>
                </div>
              )}

            {record.type.startsWith("system_revoke_moderator") &&
              record.sender && (
                <div className="flex items-center mt-0 ml-4 text-lime-300">
                  <div className="text-red-500">
                    <IoShield size={24} />
                  </div>
                  <div className="w-fit">
                    <p
                      className="ml-2"
                      style={{
                        overflowWrap: "anywhere",
                      }}
                    >
                      {record.sender.nickname.length
                        ? record.sender.nickname
                        : record.sender.username}{" "}
                      &apos;s moderator status has been revoked.
                    </p>
                  </div>

                  <div
                    style={{
                      overflowWrap: "anywhere",
                      fontSize:
                        0.75 * (12 + (chatFontScale / 100.0) * (24 - 12)) +
                        "px",
                    }}
                    className="mr-2 mt-1 ml-2"
                  >
                    {dateString}
                  </div>
                </div>
              )}

            {record.type.startsWith("system_endCall") && record.sender && (
              <div className="flex items-center mt-0 ml-4 text-lime-300">
                <MdCallEnd size={24} />
                <div className="w-fit">
                  <p
                    className="ml-2"
                    style={{
                      overflowWrap: "anywhere",
                    }}
                  >
                    A call that lasted{" "}
                    {miliSecondsToDurationString(record.message)} came to an
                    end.
                  </p>
                </div>

                <div
                  style={{
                    overflowWrap: "anywhere",
                    fontSize:
                      0.75 * (12 + (chatFontScale / 100.0) * (24 - 12)) + "px",
                  }}
                  className="mr-2 mt-1 ml-2"
                >
                  {dateString}
                </div>
              </div>
            )}

            {record.type.startsWith("system_startCall") && record.sender && (
              <div className="flex items-center mt-0 ml-4 text-lime-300">
                <IoIosCall size={24} />
                <div className="w-fit">
                  <p
                    className="ml-2"
                    style={{
                      overflowWrap: "anywhere",
                    }}
                  >
                    {record.sender.nickname.length > 0
                      ? record.sender.nickname
                      : record.sender.username}{" "}
                    started a call.
                  </p>
                </div>

                <div
                  style={{
                    overflowWrap: "anywhere",
                    fontSize:
                      0.75 * (12 + (chatFontScale / 100.0) * (24 - 12)) + "px",
                  }}
                  className="mr-2 mt-1 ml-2"
                >
                  {dateString}
                </div>
              </div>
            )}
            {record.type.startsWith("system_poll_expired") && record.sender && (
              <div className="flex items-center mt-0 ml-4 text-lime-300">
                <div className="flex flex-col">
                  <div className="w-fit flex items-center">
                    <RiPassExpiredFill size={24} />
                    <p
                      className="ml-2"
                      style={{
                        overflowWrap: "anywhere",
                      }}
                    >
                      {record.sender.nickname.length > 0
                        ? record.sender.nickname
                        : record.sender.username}
                      &apos;s poll<span> </span>
                      <span
                        onClick={() => {
                          const pollMessageId = Number.parseInt(
                            record.type.substring(
                              record.type.lastIndexOf("_") + 1
                            )
                          );
                          if (handleNavigateToChatRecord)
                            handleNavigateToChatRecord(pollMessageId);
                        }}
                        className="text-white hover:underline cursor-pointer hover:text-opacity-70 transition"
                      >
                        {record.message.split("@")[0]}
                      </span>
                      <span> </span>
                      has closed.{" "}
                    </p>
                    <div
                      style={{
                        overflowWrap: "anywhere",
                        fontSize:
                          0.75 * (12 + (chatFontScale / 100.0) * (24 - 12)) +
                          "px",
                      }}
                      className="mr-2 mt-1 ml-2"
                    >
                      {dateString}
                    </div>
                  </div>

                  <div className="ml-8 mt-2 rounded-md flex items-center gap-4 p-3 bg-lime-700">
                    <div className="flex flex-col gap-2 w-full">
                      <div className="flex items-center justify-center gap-2">
                        <p className="font-bold text-lime-300 text-center">
                          Winners
                        </p>
                        {record.message.split("@")[1] === "nowinner" ? (
                          <BsEmojiNeutralFill size={36} />
                        ) : (
                          <GiPartyPopper size={36} />
                        )}
                      </div>

                      {record.message.split("@")[1] === "nowinner" ? (
                        <p className="text-center">The was no winner</p>
                      ) : (
                        record.message
                          .split("@")[1]
                          .split(",")
                          .map((winner, i) => {
                            const ind = winner.lastIndexOf("::");
                            const shortcode = winner.substring(0, ind);
                            const content = winner.substring(ind + 2);

                            return (
                              <div
                                key={i}
                                className="flex items-center gap-2 p-2 min-h-[4rem] rounded-md text-lime-600 bg-lime-500 w-full
                    border-lime-300 border-2"
                              >
                                {shortcode !== "none" && (
                                  //@ts-expect-error: em-emoji not detected by jsx
                                  <em-emoji
                                    shortcodes={shortcode}
                                    size={"2rem"}
                                  />
                                )}
                                {content}
                              </div>
                            );
                          })
                      )}
                      <PrimaryButton
                        customStyles="ml-auto bg-lime-500 p-2"
                        customWidth="w-full"
                        onclick={() => {
                          const pollMessageId = Number.parseInt(
                            record.type.substring(
                              record.type.lastIndexOf("_") + 1
                            )
                          );
                          if (handleNavigateToChatRecord)
                            handleNavigateToChatRecord(pollMessageId);
                        }}
                      >
                        View
                      </PrimaryButton>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {record.type.startsWith("system_rename") && (
              <div className="flex items-center mt-0 ml-4 text-lime-300">
                <BiSolidRename size={24} />
                <div className="w-fit">
                  <p
                    className="ml-2"
                    style={{
                      overflowWrap: "anywhere",
                    }}
                  >
                    This chatroom has been renamed to{" "}
                    <span className="font-bold text-lime-400">
                      {record.message}
                    </span>
                    .
                  </p>
                </div>

                <div
                  style={{
                    overflowWrap: "anywhere",
                    fontSize:
                      0.75 * (12 + (chatFontScale / 100.0) * (24 - 12)) + "px",
                  }}
                  className="mr-2 mt-1 ml-2"
                >
                  {dateString}
                </div>
              </div>
            )}
            {record.type.startsWith("system_join") && record.sender && (
              <div className="flex items-center mt-0 ml-4 text-lime-300">
                <GiPeaceDove size={24} />
                <div className="w-fit">
                  <p
                    className="ml-2"
                    style={{
                      overflowWrap: "anywhere",
                    }}
                  >
                    {record.sender.nickname.length > 0
                      ? record.sender.nickname
                      : record.sender.username}{" "}
                    joins the meditation. Let there be harmony!
                  </p>
                </div>

                <div
                  style={{
                    overflowWrap: "anywhere",
                    fontSize:
                      0.75 * (12 + (chatFontScale / 100.0) * (24 - 12)) + "px",
                  }}
                  className="mr-2 mt-1 ml-2"
                >
                  {dateString}
                </div>
              </div>
            )}

            {record.type.startsWith("system_ownershiptransfer") &&
              record.sender &&
              record.replyTargetSender && (
                <div className="flex items-center mt-0 ml-4 text-lime-300">
                  <FaCrown size={24} />
                  <div className="w-fit">
                    <p
                      className="ml-2"
                      style={{
                        overflowWrap: "anywhere",
                      }}
                    >
                      {record.sender.nickname.length > 0
                        ? record.sender.nickname
                        : record.sender.username}
                      <span> </span>
                      bequeathes the ownership of this chatroom to{" "}
                      {record.replyTargetSender.nickname.length > 0
                        ? record.replyTargetSender.nickname
                        : record.replyTargetSender.username}
                      . Hail new owner!
                    </p>
                  </div>

                  <div
                    style={{
                      overflowWrap: "anywhere",
                      fontSize:
                        0.75 * (12 + (chatFontScale / 100.0) * (24 - 12)) +
                        "px",
                    }}
                    className="mr-2 mt-1 ml-2"
                  >
                    {dateString}
                  </div>
                </div>
              )}

            {record.type.startsWith("system_ownerleave") &&
              record.sender &&
              record.replyTargetSender && (
                <div className="flex items-center mt-0 ml-4 text-lime-300">
                  <FaHandPeace size={24} />
                  <div className="w-fit">
                    <p
                      className="ml-2"
                      style={{
                        overflowWrap: "anywhere",
                      }}
                    >
                      {record.sender.nickname.length > 0
                        ? record.sender.nickname
                        : record.sender.username}{" "}
                      decided to leave this chatroom in search for peace. the
                      ownership of this chatroom has been transferred to{" "}
                      {record.replyTargetSender.nickname.length > 0
                        ? record.replyTargetSender.nickname
                        : record.replyTargetSender.username}
                      .
                    </p>
                  </div>

                  <div
                    style={{
                      overflowWrap: "anywhere",
                      fontSize:
                        0.75 * (12 + (chatFontScale / 100.0) * (24 - 12)) +
                        "px",
                    }}
                    className="mr-2 mt-1 ml-2"
                  >
                    {dateString}
                  </div>
                </div>
              )}

            {record.type.startsWith("system_leave") && record.sender && (
              <div className="flex items-center mt-0 ml-4 text-lime-300">
                <FaHandPeace size={24} />
                <div className="w-fit">
                  <p
                    className="ml-2"
                    style={{
                      overflowWrap: "anywhere",
                    }}
                  >
                    {record.sender.nickname.length > 0
                      ? record.sender.nickname
                      : record.sender.username}{" "}
                    decided to leave this chatroom in search for peace.
                  </p>
                </div>

                <div
                  style={{
                    overflowWrap: "anywhere",
                    fontSize:
                      0.75 * (12 + (chatFontScale / 100.0) * (24 - 12)) + "px",
                  }}
                  className="mr-2 mt-1 ml-2"
                >
                  {dateString}
                </div>
              </div>
            )}
            {record.type.startsWith("system_kick") &&
              record.sender &&
              record.replyTargetSender && (
                <div className="flex items-center mt-0 ml-4 text-lime-300">
                  <FaBan size={24} />
                  <div className="w-fit">
                    <p
                      className="ml-2"
                      style={{
                        overflowWrap: "anywhere",
                      }}
                    >
                      {record.sender.nickname.length > 0
                        ? record.sender.nickname
                        : record.sender.username}{" "}
                      has been kicked into the wilderness by{" "}
                      {record.replyTargetSender.nickname.length
                        ? record.replyTargetSender.nickname
                        : record.replyTargetSender.username}
                      {". "}
                      Oof!
                    </p>
                  </div>

                  <div
                    style={{
                      overflowWrap: "anywhere",
                      fontSize:
                        0.75 * (12 + (chatFontScale / 100.0) * (24 - 12)) +
                        "px",
                    }}
                    className="mr-2 mt-1 ml-2"
                  >
                    {dateString}
                  </div>
                </div>
              )}
            {record.type.startsWith("system_pin") && record.sender && (
              <div className="flex items-center mt-0 ml-4 text-lime-300">
                <RiPushpinFill size={24} />
                <div className="w-fit">
                  <p
                    className="ml-2"
                    style={{
                      overflowWrap: "anywhere",
                    }}
                  >
                    {record.sender.nickname.length > 0
                      ? record.sender.nickname
                      : record.sender.username}{" "}
                    pinned a{" "}
                    <span
                      className="text-white cursor-pointer hover:underline transition hover:text-opacity-70"
                      onClick={() => {
                        const pinnedId = Number.parseInt(
                          record.type.substring(
                            record.type.lastIndexOf("_") + 1
                          )
                        );
                        if (handleNavigateToChatRecord)
                          handleNavigateToChatRecord(pinnedId);
                      }}
                    >
                      message
                    </span>{" "}
                    to this chatroom. See all
                    <span> </span>
                    <span
                      onClick={() => {
                        if (setShowPinnedMessages) {
                          setShowPinnedMessages(true);
                        }
                      }}
                      className="text-white cursor-pointer hover:underline
                     transition hover:text-opacity-70"
                    >
                      pinned messages.
                    </span>
                  </p>
                </div>

                <div
                  style={{
                    overflowWrap: "anywhere",
                    fontSize:
                      0.75 * (12 + (chatFontScale / 100.0) * (24 - 12)) + "px",
                  }}
                  className="mr-2 mt-1 ml-2"
                >
                  {dateString}
                </div>
              </div>
            )}
          </div>
        )}

        {(record.type === "text" ||
          record.type === "pending_text" ||
          record.type === "poll") &&
          record.sender && (
            <div
              className={`${
                shouldShowDetails ? "mt-0" : "my-0"
              } flex flex-col transition group relative ${
                isUserMentioned &&
                "bg-lime-600 border-l-2 border-lime-300 rounded-md"
              }


              ${record.isNsfw && !unblurNSFW && "cursor-not-allowed"}
             `}
            >
              {(record.isNsfw || record.isSpam) &&
                record.sender.id === currentUser.id && (
                  <div className="absolute px-2 text-sm z-[9] text-red-500 hidden group-hover:block bg-black bg-opacity-50 rounded-md top-1/2 left-1/2 -translate-x-[50%] -translate-y-[50%]">
                    Flagged for spam/nsfw. Some users may not see this.
                  </div>
                )}
              {record.isNsfw && !unblurNSFW ? (
                <div
                  onClick={() => setUnblurNSFW(true)}
                  className="absolute gap-2 flex top-1/2 items-center left-1/2 z-[10] cursor-pointer transition hover:bg-opacity-70 text-white -translate-x-[50%] -translate-y-[50%] rounded-md px-2 text-lg bg-lime-700"
                >
                  <MdWarning />
                  <p className="md:hidden">NSFW-Unblur</p>
                  <p className="hidden md:inline">
                    Contains Sensitive Content - Unblur
                  </p>
                </div>
              ) : (
                <></>
              )}

              <div
                className={` ${
                  record.isNsfw && !unblurNSFW && "pointer-events-none"
                }`}
              >
                <div className={`relative justify-center items-center flex`}>
                  {dividerText.length > 0 && (
                    <>
                      <div className="bg-lime-700 h-[0.1rem] w-full"></div>
                      <p className="min-w-fit mx-1 text-lime-700">
                        {dividerText}
                      </p>
                      <div className="bg-lime-700 h-[0.1rem] w-full"></div>
                    </>
                  )}

                  {(showPinControllers || showJumpToMessageButton) &&
                    currentChatRoom.id > 0 && (
                      <div className="hidden text-xs group-hover:flex gap-2 absolute bottom-[-1.25rem] z-[50] p-2 cursor-pointer right-[0.25rem] translate-y-[50%] ml-auto bg-transparent text-lime-400 rounded-md">
                        <div
                          className="bg-lime-700 flex items-center px-2 transition hover:bg-opacity-90 rounded-md cursor-pointer"
                          onClick={() => {
                            if (handleNavigateToChatRecord) {
                              handleNavigateToChatRecord(record.id);
                            }
                          }}
                        >
                          Jump to message
                        </div>

                        {showPinControllers && shouldShowPinButton && (
                          <div className="bg-white grid place-content-center transition hover:bg-opacity-90 rounded-md cursor-pointer">
                            {record.pinned ? (
                              <FloatingButton
                                onClick={() => {
                                  handleUnpinMessage();
                                }}
                                description="Unpin Message"
                                backgroundColor="bg-white"
                                backgroundGroupHoverColor="bg-white"
                              >
                                <RiUnpinFill />
                              </FloatingButton>
                            ) : (
                              <FloatingButton
                                onClick={() => {
                                  handlePinMessage();
                                }}
                                description="Pin Message"
                                backgroundColor="bg-white"
                                backgroundGroupHoverColor="bg-white"
                              >
                                <RiPushpinFill />
                              </FloatingButton>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                  {!editMode && !isSimplePreview && currentChatRoom.id > 0 && (
                    <Popover
                      containerStyle={{
                        zIndex: 75,
                      }}
                      positions={["left", "bottom"]}
                      parentElement={chatViewRef}
                      reposition={true}
                      content={
                        <>
                          <div className="w-full h-full mr-2 sm:hidden">
                            <EmojiPicker
                              perLine={4}
                              onEmojiSelect={handleChatReaction}
                            />
                          </div>
                          <div className="w-full h-full hidden mr-2 sm:block">
                            <EmojiPicker onEmojiSelect={handleChatReaction} />
                          </div>
                        </>
                      }
                      isOpen={reactionEmojiPickerOpen}
                      onClickOutside={() => {
                        setReactionEmojiPickerOpen(false);
                      }}
                    >
                      <div
                        className={`${
                          reactionEmojiPickerOpen
                            ? "flex"
                            : "hidden group-hover:flex"
                        } absolute flex-wrap max-w-[6rem] sm:flex-nowrap sm:max-w-[1000rem] bottom-[-1rem] z-[50] right-0 translate-y-[50%] ml-auto bg-white text-lime-400 rounded-md shadow-lg`}
                      >
                        <FloatingButton
                          onClick={() => {
                            setReactionEmojiPickerOpen(
                              !reactionEmojiPickerOpen
                            );
                          }}
                          description="Add Reaction"
                          backgroundColor="bg-white"
                          backgroundGroupHoverColor="bg-white"
                        >
                          <FaSmile />
                        </FloatingButton>

                        {shouldShowPinButton && (
                          <>
                            {record.pinned ? (
                              <FloatingButton
                                onClick={() => {
                                  handleUnpinMessage();
                                }}
                                description="Unpin Message"
                                backgroundColor="bg-white"
                                backgroundGroupHoverColor="bg-white"
                              >
                                <RiUnpinFill />
                              </FloatingButton>
                            ) : (
                              <FloatingButton
                                onClick={() => {
                                  handlePinMessage();
                                }}
                                description="Pin Message"
                                backgroundColor="bg-white"
                                backgroundGroupHoverColor="bg-white"
                              >
                                <RiPushpinFill />
                              </FloatingButton>
                            )}
                          </>
                        )}

                        {shouldShowDeleteButton && (
                          <FloatingButton
                            onClick={() => {
                              handleDeleteMessage();
                            }}
                            description="Delete"
                            backgroundColor="bg-white"
                            backgroundGroupHoverColor="bg-white"
                          >
                            <MdDelete />
                          </FloatingButton>
                        )}

                        {record.sender.id === currentUser.id ? (
                          <FloatingButton
                            onClick={() => {
                              if (setEditModeId) setEditModeId(record.id);
                            }}
                            description="Edit"
                            backgroundColor="bg-white"
                            backgroundGroupHoverColor="bg-white"
                          >
                            <AiFillEdit />
                          </FloatingButton>
                        ) : (
                          <>
                            <FloatingButton
                              onClick={() => {
                                if (setReplyTarget) setReplyTarget(record);
                              }}
                              description="Reply"
                              backgroundColor="bg-white"
                              backgroundGroupHoverColor="bg-white"
                            >
                              <FaReply />
                            </FloatingButton>
                          </>
                        )}

                        <FloatingButton
                          onClick={() => {
                            const text = GenericUtil.parseMarkdownText(editor);
                            navigator.clipboard.writeText(text);
                            ToastUtils.openSplashToast(
                              toastContext,
                              <div className="flex items-center justify-center gap-2 text-lime-500">
                                <FaCheck size={16} />
                                Chat copied for sharing
                              </div>
                            );
                          }}
                          description="Copy"
                          backgroundColor="bg-white"
                          backgroundGroupHoverColor="bg-white"
                        >
                          <RiClipboardFill />
                        </FloatingButton>
                      </div>
                    </Popover>
                  )}

                  {currentChatRoom.id <= 0 && record.isSpam && (
                    <div
                      className={`hidden group-hover:flex
                   absolute flex-wrap max-w-[4rem] sm:flex-nowrap sm:max-w-[1000rem] bottom-[-1rem] z-[50] right-0 translate-y-[50%] ml-auto bg-white text-lime-400 rounded-md shadow-lg`}
                    >
                      <FloatingButton
                        onClick={() => {
                          router.replace(
                            "/dashboard/chatroom/" + (record.chatRoomIdRef ?? 0)
                          );
                        }}
                        description="Go to chatroom"
                        backgroundColor="bg-white"
                        backgroundGroupHoverColor="bg-white"
                      >
                        <MdOpenInNew size={12} />
                      </FloatingButton>

                      <FloatingButton
                        onClick={() => {
                          const text = GenericUtil.parseMarkdownText(editor);
                          navigator.clipboard.writeText(text);
                          ToastUtils.openSplashToast(
                            toastContext,
                            <div className="flex items-center justify-center gap-2 text-lime-500">
                              <FaCheck size={16} />
                              Chat copied for sharing
                            </div>
                          );
                        }}
                        description="Copy"
                        backgroundColor="bg-white"
                        backgroundGroupHoverColor="bg-white"
                      >
                        <RiClipboardFill size={12} />
                      </FloatingButton>
                    </div>
                  )}
                </div>

                <div
                  className={`flex w-[100%] ${
                    shouldShowDetails && "pt-2 px-2"
                  } ${
                    editMode
                      ? "bg-lime-500"
                      : `group-hover:bg-lime-500 ${
                          isSimplePreview || reactionEmojiPickerOpen
                            ? "bg-lime-500"
                            : "bg-transparent"
                        } 
                       

                       ${isSimplePreview && simplePreviewCustomStyles}`
                  } transition`}
                >
                  <p
                    style={{
                      overflowWrap: "anywhere",
                      fontSize:
                        0.75 * (12 + (chatFontScale / 100.0) * (24 - 12)) +
                        "px",
                    }}
                    className={`text-lime-300 min-w-fit mr-2 mt-1 ${
                      (msgDisplayMode === "Cozy" || !shouldShowDetails) &&
                      "hidden"
                    } ${
                      record.type.startsWith("pending") && "text-opacity-50"
                    }`}
                  >
                    {dateString}
                  </p>
                  {shouldShowDetails && (
                    <div
                      className={`${
                        record.replyTargetSender && "mt-[1.5rem]"
                      } ${
                        !showAvatarsOnCompactMode &&
                        msgDisplayMode === "Compact" &&
                        "hidden"
                      }`}
                    >
                      <div
                        className={
                          msgDisplayMode === "Compact" ? "mt-1" : "mt-0"
                        }
                      >
                        <ProfileAvatar
                          size={msgDisplayMode === "Compact" ? 16 : 48}
                          user={record.sender}
                        />
                      </div>
                    </div>
                  )}

                  <div
                    className={`flex ${
                      msgDisplayMode === "Compact"
                        ? "flex-row flex-wrap"
                        : "flex-col"
                    } w-full ml-2`}
                  >
                    {record.replyTargetId &&
                      record.replyTargetSender &&
                      record.replyTargetMessage && (
                        <div className="flex items-center w-full gap-2">
                          {showAvatarsOnCompactMode === true ||
                            (msgDisplayMode === "Cozy" && (
                              <ProfileAvatar
                                user={record.replyTargetSender}
                                size={24}
                              />
                            ))}

                          <div className="text-lime-700 flex w-full items-center gap-2">
                            <Popover
                              containerStyle={{
                                zIndex: 50,
                              }}
                              isOpen={openReplyUserCard}
                              reposition={true}
                              positions={["top", "bottom"]}
                              content={
                                <div className="animate-popOut mb-[1rem] ml-[1rem]">
                                  <Usercard
                                    user={record.replyTargetSender}
                                    chatRoomId={currentChatRoom?.id.toString()}
                                  />
                                </div>
                              }
                              onClickOutside={() => setOpenReplyUserCard(false)}
                            >
                              <p
                                className="cursor-pointer transition hover:text-lime-600 hover:underline"
                                onClick={() =>
                                  setOpenReplyUserCard(!openReplyUserCard)
                                }
                              >
                                @
                                {record.replyTargetSender.nickname.length > 0
                                  ? record.replyTargetSender.nickname
                                  : record.replyTargetSender.username}
                              </p>
                            </Popover>

                            <p
                              onClick={() => {
                                if (
                                  handleNavigateToChatRecord &&
                                  record.replyTargetId
                                ) {
                                  handleNavigateToChatRecord(
                                    record.replyTargetId
                                  );
                                }
                              }}
                              className="text-white max-h-[1.6rem] overflow-hidden cursor-pointer
                                        text-opacity-70 transition hover:text-opacity-100 text-ellipsis"
                              style={{
                                overflowWrap: "anywhere",
                              }}
                            >
                              {record.replyTargetMessage}
                            </p>
                          </div>
                        </div>
                      )}

                    {shouldShowDetails && (
                      <div
                        className={`flex items-center gap-2 ${
                          msgDisplayMode === "Compact" ? "w-fit" : "w-full"
                        }`}
                      >
                        <Popover
                          isOpen={openUserCard}
                          positions={["top", "bottom"]}
                          reposition={true}
                          containerStyle={{
                            zIndex: 50,
                          }}
                          content={
                            <div className="animate-popOut mb-[1rem] ml-[1rem]">
                              <Usercard
                                user={record.sender}
                                chatRoomId={currentChatRoom?.id.toString()}
                              />
                            </div>
                          }
                          onClickOutside={() => setOpenUserCard(false)}
                        >
                          <p
                            onClick={() => setOpenUserCard(!openUserCard)}
                            className={`text-lime-700 hover:text-opacity-70 hover:underline transition cursor-pointer self-start ${
                              record.type.startsWith("pending") &&
                              "text-opacity-50"
                            }`}
                            style={{
                              overflowWrap: "anywhere",
                            }}
                          >
                            {record.sender.nickname.length > 0
                              ? record.sender.nickname
                              : record.sender.username}
                          </p>
                        </Popover>

                        <p
                          className={`text-lime-300 ${
                            msgDisplayMode === "Compact" && "hidden"
                          } ${
                            record.type.startsWith("pending") &&
                            "text-opacity-50"
                          }`}
                          style={{
                            overflowWrap: "anywhere",
                            fontSize:
                              0.75 *
                                (12 + (chatFontScale / 100.0) * (24 - 12)) +
                              "px",
                          }}
                        >
                          {dateString}
                          {numUnread > 0 && (
                            <span className="text-xs text-lime-200 ml-1">
                              {numUnread}
                            </span>
                          )}
                          {(record.isNsfw || record.isSpam) &&
                            record.sender.id === currentUser.id && (
                              <span className="text-red-500 ml-2 rounded-md bg-opacity-50 px-2 bg-lime-700">
                                !
                              </span>
                            )}
                        </p>
                      </div>
                    )}

                    <div
                      className={`flex flex-col ${
                        msgDisplayMode === "Compact" ? "w-fit ml-2" : "w-full"
                      } h-full ${editMode && "p-2"}`}
                    >
                      <div
                        className={`flex items-center relative  ${
                          !editMode &&
                          record.isNsfw &&
                          !unblurNSFW &&
                          "blur-xl bg-lime-700"
                        }`}
                      >
                        {!shouldShowDetails && (
                          <p
                            style={{
                              fontSize:
                                0.75 *
                                  (12 + (chatFontScale / 100.0) * (24 - 12)) +
                                "px",
                            }}
                            className="absolute left-0 hidden group-hover:inline text-lime-300"
                          >
                            {format(
                              record.date,
                              timeFormat === "12-hour" ? "h:mm bbb" : "H:mm"
                            )}

                            {numUnread > 0 && (
                              <span className="text-xs text-lime-200 ml-2">
                                {numUnread}
                              </span>
                            )}
                            {(record.isNsfw || record.isSpam) &&
                              record.sender.id === currentUser.id && (
                                <span className="text-red-500 ml-2 px-2 rounded-md bg-opacity-50 bg-lime-700">
                                  !
                                </span>
                              )}
                          </p>
                        )}

                        {editMode && emojiSearchViewWidth ? (
                          <div
                            className={`w-full ${
                              !shouldShowDetails && "ml-[3rem]"
                            } flex flex-col`}
                          >
                            <ChatInput
                              currentChatRoom={currentChatRoom}
                              emojiSearchViewWidth={emojiSearchViewWidth}
                              currentUser={currentUser}
                              absolutePosition={false}
                              initialValue={editor.children}
                              showMoreButton={false}
                              customEditor={editor}
                              chatFontScale={chatFontScale}
                              underlineLinks={underlineLinks}
                              convertEmoticon={convertEmoticon}
                              showGifMenu={false}
                              previewSyntax={previewSyntax}
                            />
                            <p className="text-xs text-white cursor-default">
                              <span
                                onClick={() => {
                                  if (setEditModeId) setEditModeId(-1);
                                }}
                                className="underline text-blue-500 cursor-pointer mr-1"
                              >
                                cancel
                              </span>{" "}
                              or
                              <span
                                onClick={() => {
                                  handleEditMessage();
                                }}
                                className="underline text-blue-500 cursor-pointer ml-2"
                              >
                                save
                              </span>
                            </p>
                          </div>
                        ) : record.message.length > 0 ? (
                          <div
                            className={`${
                              !shouldShowDetails && "ml-[3.5rem]"
                            } w-full whitespace-pre-wrap text-white ${
                              record.type.startsWith("pending") &&
                              "text-opacity-50"
                            }
                                            `}
                            style={{
                              overflowWrap: "anywhere",
                            }}
                          >
                            <Slate editor={editor} initialValue={initialValue}>
                              <Editable
                                className={`focus:outline-none caret-lime-300 ${
                                  isSingleUrlMessage &&
                                  !record.hideEmbed &&
                                  !isSimplePreview &&
                                  "hidden"
                                }`}
                                readOnly
                                renderLeaf={renderLeaf}
                                decorate={decorate}
                                renderElement={renderElement}
                              ></Editable>
                            </Slate>
                          </div>
                        ) : (
                          <></>
                        )}
                      </div>

                      <div
                        className={` ${
                          record.isNsfw && !unblurNSFW && "blur-2xl"
                        }`}
                      >
                        {attachmentItems}
                      </div>

                      {record.attachments &&
                      record.clientAttachmentUploadProgress ? (
                        <div className="rounded-md mt-2 relative peer flex border-[1px] border-lime-400 text-lime-300 bg-lime-600 p-2 items-center gap-2">
                          <div className="flex flex-col gap-2 w-full h-full">
                            <div className="flex items-center gap-2">
                              <FaUpload size={20} />
                              <p>
                                Uploading{" "}
                                {record.attachments.split(",").length - 1}{" "}
                                Files...
                              </p>
                            </div>

                            <progress
                              value={record.clientAttachmentUploadProgress}
                              className="text-lime-600 rounded-md w-full"
                            ></progress>
                          </div>
                        </div>
                      ) : (
                        <></>
                      )}

                      <AnimateHeight
                        height={
                          embeds.length > 0 && embedLoadingCount === 0
                            ? "auto"
                            : 0
                        }
                        delay={0}
                        duration={500}
                      >
                        <div
                          className={`${
                            record.isNsfw && !unblurNSFW && "blur-2xl"
                          }`}
                        >
                          {embeddableItems}
                        </div>
                      </AnimateHeight>

                      {record.type === "poll" && record.poll && (
                        <Poll
                          poll={record.poll}
                          currentUser={currentUser}
                          currentChatRoom={currentChatRoom}
                          record={record}
                        />
                      )}

                      {record.chatReactions &&
                        record.chatReactions.length > 0 &&
                        displayChatReaction === "yes" && (
                          <div
                            className={`flex flex-wrap items-center gap-2 mt-0.5 ${
                              !shouldShowDetails && "ml-[3.5rem]"
                            }`}
                          >
                            {reactionsMerged.map((reaction) => {
                              return (
                                <div
                                  key={reaction[0]}
                                  className={`border-2 ${
                                    reaction[1][1]
                                      ? "border-lime-300 bg-lime-700"
                                      : "border-transparent bg-lime-600"
                                  } transition hover:bg-lime-700 rounded-md cursor-pointer py-0 px-2 flex items-center gap-2`}
                                >
                                  <ChatReactionTag
                                    ref={(el) => {
                                      chatReactionTagRefs.current.set(
                                        reaction[0],
                                        el
                                      );
                                    }}
                                    handleReaction={handleChatReaction}
                                    reaction={reaction}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
      </div>
    );
  }
);

export default ChatRecord;
