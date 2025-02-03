"use client";
import api from "@/app/api/api";
import FloatingButton from "@/app/components/FloatingButton";
import Header from "@/app/components/Header";
import PrimaryButton from "@/app/components/PrimaryButton";

import AuthenticationContext from "@/app/contexts/AuthenticationContext";
import StompContext from "@/app/contexts/StompContext";
import { ChatRoom } from "@/app/types/ChatRoom";
import {
  InfiniteData,
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { FaFeather, FaReply, FaSearch } from "react-icons/fa";
import { FaGear, FaX } from "react-icons/fa6";
import { IoMdPeople, IoMdVideocam } from "react-icons/io";
import { IoCall, IoReturnUpForward } from "react-icons/io5";
import React from "react";

import SelectFriendsInterface from "@/app/components/SelectFriendsInterface";
import ModalContext from "@/app/contexts/ModalContext";
import useSocket from "@/app/hooks/useSocket";
import { User } from "@/app/types/User";
import ModalUtils from "@/app/util/ModalUtil";
import { MdGroupAdd, MdWarning } from "react-icons/md";
import { ClipLoader } from "react-spinners";
import { Popover } from "react-tiny-popover";
import { Editor, Transforms } from "slate";

import ChatRecord from "@/app/components/ChatRecord";
import Constants from "@/app/constants/Constants";
import { ChatRecordType } from "@/app/types/ChatRecordType";

import { format, sub } from "date-fns";

import { BiDownArrowAlt } from "react-icons/bi";

import AttachmentBox from "@/app/components/AttachmentBox";
import ChatInput from "@/app/components/ChatInput";
import MemberListBar from "@/app/components/MemberListBar";
import PinnedMessages from "@/app/components/PinnedMessages";
import ToastContext from "@/app/contexts/ToastContext";
import { ChatReaction } from "@/app/types/ChatReaction";
import ToastUtils from "@/app/util/ToastUtil";
import { GrAttachment } from "react-icons/gr";
import { RiPushpinFill } from "react-icons/ri";
import { v4 as uuidv4 } from "uuid";
import ChatSearchUI from "@/app/components/ChatSearchUI";
import ChatNotificationContext from "@/app/contexts/ChatNotificationContext";
import useNextRenderSetState from "@/app/hooks/useNextRenderSetState";
import ContentDisplayContext from "@/app/contexts/ContentDisplayContext";
import SearchResultsOverlay from "@/app/components/SearchResultsOverlay";
import CallOverlay from "@/app/components/CallOverlay";
import CallContext from "@/app/contexts/CallContext";
import SoundUtil from "@/app/util/SoundUtil";
import { Sound } from "@/app/types/Sound";
import { Background } from "@/app/types/Background";
import GenericUtil from "@/app/util/GenericUtil";
import { UserSettings } from "@/app/types/UserSettings";
import useIsLightMode from "@/app/hooks/useIsLightMode";
import OwnerSettingsUI from "@/app/components/OwnerSettingsUI";
import { ChatRoomRoleSettings } from "@/app/types/ChatRoomRoleSettings";
import RoomAvatar from "@/app/components/RoomAvatar";
import TypingIndicator from "@/app/components/TypingIndicator";

import { GiHand } from "react-icons/gi";
import Usercard from "@/app/components/Usercard";
import { useDebounceValue, useWindowSize } from "usehooks-ts";
import DefaultProfileIcon from "@/app/components/DefaultProfileIcon";

export default function ChatroomPage() {
  // useLayoutEffect(() => {
  //   init({ data });

  //   // //scroll position restoration <-- abandoned feature for now due to keyset pagination constraints
  //   // if (
  //   //   sessionStorage.getItem(params.id + "_scrollPos") &&
  //   //   document.getElementById("chatView")
  //   // ) {
  //   //   document.getElementById("chatView")!.scrollTop = Number.parseInt(
  //   //     sessionStorage.getItem(params.id + "_scrollPos")!
  //   //   );
  //   // }

  //   return () => {
  //     // if (document.getElementById("chatView")) {
  //     //   sessionStorage.setItem(
  //     //     params.id + "_scrollPos",
  //     //     document.getElementById("chatView")!.scrollTop.toString()
  //     //   );
  //     //   // console.log("saved scroll position: ", document.getElementById("chatView")!.scrollTop)
  //     // }
  //   };
  // }, []);

  const [chatFontScale, setChatFontScale] = useState(33.33333333);
  const [underlineLinks, setUnderlineLinks] = useState(true);
  const [showSendButton, setShowSendButton] = useState(true);
  const [convertEmoticon, setConvertEmoticon] = useState(false);
  const [previewSyntax, setPreviewSyntax] = useState(false);

  useLayoutEffect(() => {
    const handler = (e: StorageEvent | undefined) => {
      if (e && e.key === "chatFontScale") {
        const val = parseFloat(e.newValue ?? "33.33333");
        setChatFontScale(isNaN(val) ? 33.3333333 : val);
      } else if (e && e.key === "underlineLinks") {
        setUnderlineLinks(e.newValue === "yes");
      } else if (e && e.key === "showSendButton") {
        setShowSendButton(e.newValue === "yes");
      } else if (e && e.key === "convertEmoticon") {
        setConvertEmoticon(e.newValue === "yes");
      } else if (e && e.key === "previewSyntax") {
        setPreviewSyntax(e.newValue === "yes");
      }
    };

    window.addEventListener("storage", handler);

    setChatFontScale(
      isNaN(parseFloat(localStorage.getItem("chatFontScale") ?? "33.33333333"))
        ? 33.333333333
        : parseFloat(localStorage.getItem("chatFontScale") ?? "33.333333333")
    );

    setUnderlineLinks(
      (localStorage.getItem("underlineLinks") ?? "yes") === "yes"
    );

    setShowSendButton(
      (localStorage.getItem("showSendButton") ?? "yes") === "yes"
    );

    setConvertEmoticon(
      (localStorage.getItem("convertEmoticon") ?? "yes") === "yes"
    );

    setPreviewSyntax(
      (localStorage.getItem("previewSyntax") ?? "yes") === "yes"
    );

    return () => {
      window.removeEventListener("storage", handler);
    };
  }, []);

  const router = useRouter();
  const pageQuery = useSearchParams();
  //handle query parameters for starting call right away as page loads
  useEffect(() => {
    if (pageQuery.get("call") === "true") {
      handleStartCall(false);
    } else if (pageQuery.get("videocall") === "true") {
      handleStartCall(true);
    }
  }, [pageQuery]);
  const params = useParams<{ id: string }>();

  const userSettings = useQuery({
    queryKey: ["user_settings"],
    queryFn: async () => {
      const response = await api.get<UserSettings>("/users/settings");
      return {
        data: response.data,
      };
    },
  });

  const chatRoom = useQuery({
    queryKey: ["chatroom_dm", params.id],
    queryFn: async (): Promise<{ data: ChatRoom }> => {
      if (params.id !== "-1") {
        const response = await api.get<ChatRoom>(
          `/chatrooms/directmessaging/${params.id}`
        );
        return {
          data: response.data,
        };
      } else {
        const [notificationCount, latestMessageId] = (
          await api.get<number[]>(
            `/chatrooms/directmessaging/notifications/${params.id}`
          )
        ).data ?? [0, 0];

        //placeholder chatroom data for spam mailbox
        return {
          data: {
            id: -1,
            name: "Spams",
            participants: [
              {
                id: -1,
                email: "spam@spam.com",
                nickname: "",
                username: "Spams",
                birthDate: new Date(),
                status: "OFFLINE",
                statusMessage: undefined,
                profileImageUrl: undefined,
                profileColor: "#000000",
                isCallMuted: false,
                isVideoEnabled: false,
                isScreenShareEnabled: "no",
                isDeafened: false,
                accountType: "ACCORD",
                canPreviewStream: false,
                registeredAt: new Date(),
              },
              {
                id: -1,
                email: "spam@spam.com",
                nickname: "",
                username: "Spams",
                birthDate: new Date(),
                status: "OFFLINE",
                statusMessage: undefined,
                profileImageUrl: undefined,
                profileColor: "#000000",
                isCallMuted: false,
                isVideoEnabled: false,
                isScreenShareEnabled: "no",
                isDeafened: false,
                accountType: "ACCORD",
                canPreviewStream: false,
                registeredAt: new Date(),
              },
            ],
            direct1to1Identifier: "Spam#0@Spam#0",
            ownerId: 0,
            notificationCount: notificationCount,
            latestMessageId: latestMessageId,
            sounds: [],
            backgrounds: [],
          },
        };
      }
    },
    refetchOnMount: true,
  });

  const currentChatRoom = chatRoom.data?.data;
  const authenticationContext = useContext(AuthenticationContext);
  const currentUser = authenticationContext?.currentUser;

  const stompContext = useContext(StompContext);

  const queryClient = useQueryClient();
  const [showInviteFriendsInterface, setShowInviteFriendsInterface] =
    useState(false);
  const [
    showInviteFriendsInterfaceSmallScreen,
    setShowInviteFriendsInterfaceSmallScreen,
  ] = useState(false);
  const [pendingMessages, setPendingMessages] = useState<ChatRecordType[]>([]);
  const [recentChatNotificationCount, setRecentChatNotificationCount] =
    useState(0);
  const [recentChatnotificationDate, setRecentChatNotificationDate] = useState(
    new Date()
  );
  const clientNotificationCnt = useRef<number>(0);
  const [clientLatestMessageId, setClientLatestMessageId] = useState(0);

  const [editModeChatRecordId, setEditModeChatRecordId] = useState(-1);
  const [attachments, setAttachments] = useState<
    { file: File; spoiler: boolean }[] | null
  >(null);
  const [attachmentsRef, setAttachmentsRef] = useState<HTMLDivElement | null>(
    null
  );
  const [showPinnedMessages, setShowPinnedMessages] = useState(false);
  const [showOwnerSettings, setShowOwnerSettings] = useState(false);

  const [showChatNotificationBar, setShowChatNotificationBar] = useState(false);
  const shouldScrollDownToBottom = useRef<boolean>(false);
  const [replyTarget, setReplyTarget] = useState<ChatRecordType | undefined>(
    undefined
  );

  const modalContext = useContext(ModalContext);
  const toastContext = useContext(ToastContext);
  const notificationContext = useContext(ChatNotificationContext);
  const nextRenderSetNotification = useNextRenderSetState(
    notificationContext?.setCount
  );

  const isInitialLoading = useRef<boolean>(true);
  const fileUploaderRef = useRef<HTMLInputElement>(null);

  const [chatHeightOffset, setChatHeightOffset] = useState(0);
  const [chatViewHeight, setChatViewHeight] = useState(0);
  const [chatInputAddonOffset, setChatInputAddonHeightOffset] = useState(0);
  const [emojiSearchViewWidth, setEmojiSearchViewWidth] = useState(0);
  const [chatViewWidth, setChatViewWidth] = useState(0);

  const [chatInputRef, setChatInputRef] = useState<HTMLDivElement | null>(null);
  const [chatViewRef, setChatViewRef] = useState<HTMLDivElement | null>(null);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const observerRefPrevious = useRef<IntersectionObserver | null>(null);
  const oldElement = useRef<HTMLDivElement | null>(null);
  const oldPrevElement = useRef<HTMLDivElement | null>(null);
  const canFetchNextPage = useRef<boolean>(true);
  const canFetchPrevPage = useRef<boolean>(true);

  const canScroll = useRef<boolean>(true);

  const wasScrolling = useRef<boolean>(false);
  const forcedScrolling = useRef<boolean>(false);
  const resettingQuery = useRef<boolean>(true);

  const currentChatRoomRef = useRef<ChatRoom | null>(null);

  // const wasScrollingTimeout = useRef<NodeJS.Timeout | null>(null);
  const pendingId = useRef<number>(0);

  const markAllMessagesReadMutation = useMutation({
    mutationFn: () => {
      return api.post(
        `/chatrooms/directmessaging/readAllMessages/${params.id}`
      );
    },
    onSettled(data) {
      if (!data) return;
      if (data.status === 200) {
        queryClient.setQueryData(
          ["chatroom_dm", params.id],
          (prev: { data: ChatRoom }) => {
            if (!prev) {
              return undefined;
            }

            return {
              data: {
                ...prev.data,
                participants: prev.data.participants.map((e) => {
                  if (e.id === currentUser?.id) {
                    return {
                      ...e,
                      firstUnreadMessageTimestamp: data.data,
                    };
                  }
                  return e;
                }),
                notificationCount: 0,
              },
            };
          }
        );
      } else {
        ModalUtils.openGenericModal(
          modalContext,
          "ERROR",
          "There was error reading messages. Please try again!",
          () => {
            router.replace("/dashboard");
          }
        );
      }
      readingMessages.current = false;
    },
  });

  const [chatMessagesLoaded, setChatMessagesLoaded] = useState(false);

  const contentDisplayContext = useContext(ContentDisplayContext);

  //let other components batch reset chats query from context
  useEffect(() => {
    const handler = async () => {
      await batchResetQuery();
    };

    if (
      contentDisplayContext?.shouldBatchResetChatsQuery &&
      contentDisplayContext.shouldBatchResetChatsQuery > 0
    ) {
      handler();
    }
  }, [contentDisplayContext?.shouldBatchResetChatsQuery, chatViewRef]);
  useEffect(() => {
    const initialize = async () => {
      await batchResetQuery();
      setChatMessagesLoaded(true);
      console.log("chat messages loaded.");
    };

    const handler = () => {
      // if (wasScrollingTimeout.current) {
      //   clearTimeout(wasScrollingTimeout.current);
      // }
      wasScrolling.current = true;

      // wasScrollingTimeout.current = setTimeout(() => {
      //   wasScrolling.current = false;
      // }, 300);
    };
    window.addEventListener("wheel", handler);

    //wheel event for mobile devices
    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touchEndY = e.touches[0].clientY;
      const deltaY = touchStartY - touchEndY;

      if (Math.abs(deltaY) > 10) {
        wasScrolling.current = true;

        // Update the starting position for the next move
        touchStartY = touchEndY;
      }
    };

    currentChatRoomRef.current = currentChatRoom ?? null;

    if (chatViewRef) {
      chatViewRef.addEventListener("touchstart", handleTouchStart, {
        passive: true,
      });
      chatViewRef.addEventListener("touchmove", handleTouchMove, {
        passive: true,
      });
    }

    if (currentChatRoom) initialize();

    return () => {
      window.removeEventListener("wheel", handler);
      if (chatViewRef) {
        chatViewRef.removeEventListener("touchstart", handleTouchStart);
        chatViewRef.removeEventListener("touchmove", handleTouchMove);
      }
    };
  }, [currentChatRoom?.id, chatViewRef]);

  useLayoutEffect(() => {
    if (!chatInputRef) return;
    const resizedObserver = new ResizeObserver(() => {
      let height = chatInputRef.getBoundingClientRect().height;

      if (attachmentsRef && attachments?.length) {
        height += attachmentsRef.getBoundingClientRect().height;
      }

      setEmojiSearchViewWidth(chatInputRef.getBoundingClientRect().width || 0);

      setChatHeightOffset(height);

      setChatInputAddonHeightOffset(
        attachments?.length ? chatInputRef.getBoundingClientRect().height : 0
      );
    });
    resizedObserver.observe(chatInputRef);

    return () => {
      resizedObserver.disconnect();
    };
  }, [chatInputRef, attachmentsRef, attachments]);

  useLayoutEffect(() => {
    if (!chatViewRef) return;
    const resizeObserver = new ResizeObserver(() => {
      const width = chatViewRef.getBoundingClientRect().width;
      setChatViewWidth(width);
    });
    resizeObserver.observe(chatViewRef);

    return () => {
      resizeObserver.disconnect();
    };
  }, [chatViewRef]);

  const chatRecords = useInfiniteQuery({
    queryKey: ["chats", params.id],
    initialPageParam: 0,

    queryFn: async ({ pageParam = 0 }: { pageParam: number }) => {
      const [nsfwPreference, spamPreference] =
        contentDisplayContext?.getContentFilterFlags(
          currentChatRoomRef.current ?? undefined
        ) ?? ["ANY", "ANY"];

      const response = await api.get<ChatRecordType[]>(
        `/chat/message/${params.id}?pageKey=${pageParam}&nsfw=${nsfwPreference}&spam=${spamPreference}`
      );
      return {
        data: response.data,
      };
    },
    getNextPageParam(lastPage) {
      //get previous page's last seen id

      if (lastPage.data.length < Constants.CLIENT_PER_PAGE_COUNT)
        return undefined;

      return lastPage.data[lastPage.data.length - 1].id;
    },

    getPreviousPageParam(firstPage) {
      //get next page's first seen id

      if (firstPage.data.length === 0) {
        return undefined;
      }
      return -firstPage.data[0].id;
    },
    maxPages: Constants.CLIENT_MAX_PAGES,
    placeholderData: keepPreviousData,
    refetchOnMount: false,
  });

  const observeNextPage = useCallback(
    (el: HTMLDivElement) => {
      if (!el) return;

      // console.log("new page loaded: ", chatRecords.data);

      if (observerRef.current !== null) {
        if (oldElement.current) {
          const id = oldElement.current.id;

          if (
            wasScrolling.current ||
            forcedScrolling.current ||
            resettingQuery.current
          ) {
            document.getElementById(id)?.scrollIntoView(true);
            wasScrolling.current = false;
          }
        }

        observerRef.current.disconnect();
      }
      canFetchNextPage.current = true;

      observerRef.current = new IntersectionObserver(
        async (entries) => {
          if (entries.length < 1) return;
          if (!entries[0].isIntersecting) return;

          if (
            canFetchNextPage.current &&
            chatRecords.hasNextPage &&
            !forcedScrolling.current &&
            !resettingQuery.current
          ) {
            oldPrevElement.current = null;
            oldElement.current = el;
            canFetchNextPage.current = false;

            const chatRecordsRef = queryClient.getQueryData<
              InfiniteData<{ data: ChatRecordType[] }>
            >(["chats", params.id]);

            if (
              chatRecordsRef &&
              (chatRecordsRef.pages[0].data.length === 0 ||
                chatRecordsRef.pageParams[0] === 0)
            ) {
              canFetchPrevPage.current = true;
            }

            console.log("fetching next page!", chatRecordsRef?.pages);

            // if (
            //   chatRecordsRef &&
            //   wasScrolling.current &&
            //   !forcedScrolling.current
            // ) {
            //   setClientLatestMessageId(0);
            //   clientNotificationCnt.current = 0;

            //   setShowChatNotificationBar(false);
            // }

            await chatRecords.fetchNextPage();
          }
        },
        {
          threshold: 0.5,
        }
      );

      // console.log("observing next", el);

      // console.log('observe;', ((chatViewRef?.children.length || 0) > 20))
      observerRef.current.observe(el);
    },
    [chatRecords]
  );

  const baselineJustReached = useRef<boolean>(false);

  const batchResetQuery = useCallback(async () => {
    //disable auto fetching next page

    resettingQuery.current = true;

    const pages: { data: ChatRecordType[] }[] = [];
    const pageParams: number[] = [];
    let nextId = 0;

    const [nsfwPreference, spamPreference] =
      contentDisplayContext?.getContentFilterFlags(
        currentChatRoomRef.current ?? undefined
      ) ?? ["ANY", "ANY"];

    let currentPage = await api.get<ChatRecordType[]>(
      `/chat/message/${params.id}?pageKey=${nextId}&nsfw=${nsfwPreference}&spam=${spamPreference}`
    );

    while (pages.length < Constants.CLIENT_MAX_PAGES) {
      if (currentPage.status !== 200) {
        ModalUtils.openGenericModal(
          modalContext,
          "ERROR",
          "There was error loading messages!",
          () => {}
        );
        forcedScrolling.current = false;

        return;
      }
      if (currentPage.data) {
        pages.push({
          data: currentPage.data,
        });
        pageParams.push(nextId);
      }

      if (
        currentPage.data &&
        currentPage.data.length === Constants.CLIENT_PER_PAGE_COUNT
      ) {
        nextId = currentPage.data[currentPage.data.length - 1].id;
        currentPage = await api.get<ChatRecordType[]>(
          `/chat/message/${params.id}?pageKey=${nextId}&nsfw=${nsfwPreference}&spam=${spamPreference}`
        );
      } else {
        break;
      }
    }

    await queryClient.setQueryData(["chats", params.id], () => {
      return {
        pages: pages,
        pageParams: pageParams,
      };
    });

    const chatViewRef = document.getElementById("chatView");

    if (chatViewRef) chatViewRef.scrollTop = 0;

    resettingQuery.current = false;
  }, [chatViewRef]);

  useEffect(() => {
    //invoked everytime the chat is scrolled to the very bottom

    if (
      chatRecords.data &&
      chatViewRef &&
      chatRecords.data.pages.length >= Constants.CLIENT_MAX_PAGES &&
      chatRecords.data.pages[0].data.length < Constants.CLIENT_PER_PAGE_COUNT &&
      Math.abs(chatViewRef.scrollTop - -chatViewRef.clientHeight) >
        Math.abs(chatViewRef.scrollTop - 0) &&
      baselineJustReached.current
    ) {
      baselineJustReached.current = false;
      console.log("baseline reached; reset.");

      batchResetQuery();
    } else {
      baselineJustReached.current = true;
    }
  }, [chatRecords.data?.pages, chatViewRef]);
  const observePrevPage = useCallback((el: HTMLDivElement) => {
    if (!el) return;
    if (observerRefPrevious.current !== null) {
      if (oldPrevElement.current) {
        const id = oldPrevElement.current.id;
        if (
          wasScrolling.current ||
          forcedScrolling.current ||
          resettingQuery.current
        ) {
          document.getElementById(id)?.scrollIntoView(false);
          wasScrolling.current = false;
        }
      }

      observerRefPrevious.current.disconnect();
    }

    canFetchPrevPage.current = true;

    observerRefPrevious.current = new IntersectionObserver(
      async (entries) => {
        if (entries.length < 1) return;
        if (!entries[0].isIntersecting) return;

        const chatRecordsRef = queryClient.getQueryData<
          InfiniteData<{ data: ChatRecordType[] }>
        >(["chats", params.id]);

        const noPreviousPage =
          (chatRecordsRef && chatRecordsRef.pages[0].data.length === 0) ||
          (chatRecordsRef && chatRecordsRef.pageParams[0] === 0);

        if (canFetchPrevPage.current) {
          oldElement.current = null;
          oldPrevElement.current = el;

          if (
            !noPreviousPage &&
            !forcedScrolling.current &&
            !resettingQuery.current
          ) {
            console.log("fetching previous page!", chatRecordsRef?.pages);
            canFetchPrevPage.current = false;

            await chatRecords.fetchPreviousPage();
          } else if (noPreviousPage) {
            setShowChatNotificationBar(false);
          }
        }
      },
      {
        threshold: 0.5,
      }
    );

    observerRefPrevious.current.observe(el);
  }, []);

  const friends = useQuery({
    queryKey: ["friends"],
    queryFn: async () => {
      const response = await api.get<User[]>("/users/friends");
      return {
        data: response.data,
      };
    },
    refetchOnMount: false,
  });

  const chatRoomName = useMemo(() => {
    if (currentChatRoom && currentUser) {
      return GenericUtil.computeChatRoomName(currentChatRoom, currentUser);
    } else {
      return "";
    }
  }, [currentChatRoom]);

  const [showMemberList, setShowMemberList] = useState(false);

  const readingMessages = useRef<boolean>(false);

  const handleReadAllMessages = useCallback(() => {
    if (!readingMessages.current) {
      readingMessages.current = true;
      markAllMessagesReadMutation.mutate();
    }
  }, []);

  //socket logic
  useSocket(
    stompContext?.stompClient,
    stompContext?.stompFrame,
    (stompClient, currentSocketUser) => {
      const onUserType = stompClient.subscribe(
        `/user/${currentSocketUser}/general/onUserType/${params.id}`,
        (message) => {
          //update chat participants' status
          const userId = parseInt(message.body);

          if (typingLocalTimerRef.current.has(userId)) {
            clearTimeout(typingLocalTimerRef.current.get(userId));
          }

          setTypingUsers((prev) => new Set([...prev, userId]));

          //expire typing indicator for this user after 4 seconds
          typingLocalTimerRef.current.set(
            userId,
            setTimeout(() => {
              setTypingUsers(
                (prev) => new Set([...prev].filter((id) => id !== userId))
              );
              typingLocalTimerRef.current.delete(userId);
            }, 4000)
          );
        }
      );

      const onUserStatusUpdate = stompClient.subscribe(
        `/user/${currentSocketUser}/general/onUserStatusUpdate`,
        (message) => {
          //update chat participants' status
          const data: { targetUser: string; status: string } = JSON.parse(
            message.body
          );
          queryClient.setQueryData(
            ["chatroom_dm", params.id],
            (prev: { data: ChatRoom }) => {
              return {
                data: {
                  ...prev.data,
                  participants: prev.data.participants.map((participant) => {
                    if (
                      participant.username + "@" + participant.id ===
                      data.targetUser
                    ) {
                      return {
                        ...participant,
                        status: data.status,
                      };
                    }
                    return participant;
                  }),
                },
              };
            }
          );
        }
      );

      const onEditProfile = stompClient.subscribe(
        `/user/${currentSocketUser}/general/onEditProfile`,
        (message) => {
          //update chat participants' profile
          const data: User = JSON.parse(message.body);
          let roomHasUser = false;
          queryClient.setQueryData(
            ["chatroom_dm", params.id],
            (prev: { data: ChatRoom }) => {
              return {
                data: {
                  ...prev.data,
                  participants: prev.data.participants.map((participant) => {
                    if (participant.id === data.id) {
                      roomHasUser = true;
                      return {
                        ...data,
                      };
                    }
                    return participant;
                  }),
                },
              };
            }
          );

          if (roomHasUser) {
            queryClient.setQueryData(
              ["chats", params.id],
              (prev: InfiniteData<{ data: ChatRecordType[] }, number>) => {
                // if(!prev.pageParams.includes(0)) {
                //     return
                // }

                const pages: { data: ChatRecordType[] }[] = [];
                const allList: ChatRecordType[] = [];
                for (let i = 0; i < prev.pages.length; i++) {
                  const records = prev.pages[i].data;
                  for (let j = 0; j < records.length; j++) {
                    if ((records[j].sender?.id ?? -1) === data.id) {
                      allList.push({ ...records[j], sender: data });
                    } else if (
                      records[j].replyTargetSender &&
                      records[j].replyTargetSender?.id === data.id
                    ) {
                      allList.push({ ...records[j], replyTargetSender: data });
                    } else {
                      allList.push(records[j]);
                    }
                  }
                }

                //redistribute to the pages
                let batch = [];
                for (let i = 0; i < allList.length; i++) {
                  batch.push(allList[i]);
                  if (batch.length >= Constants.CLIENT_PER_PAGE_COUNT) {
                    pages.push({ data: batch });
                    batch = [];
                  } else if (i === allList.length - 1) {
                    pages.push({ data: batch });
                  }
                }

                // console.log('new pages',pages)

                return {
                  pages: pages,
                  pageParams: prev.pageParams,
                };
              }
            );
          }
        }
      );

      const onLeaveChatRoom = stompClient.subscribe(
        `/user/${currentSocketUser}/general/onLeaveChatRoom`,
        (message) => {
          const payload: {
            leftUser: string;
            chatRoomId: string;
            newOwner: string;
          } = JSON.parse(message.body);
          if (payload.chatRoomId !== params.id.toString()) {
            return;
          }
          queryClient.setQueryData(
            ["chatroom_dm", params.id],
            (prev: { data: ChatRoom }) => {
              return {
                data: {
                  ...prev.data,
                  ownerId:
                    payload.newOwner !== "-1"
                      ? Number.parseInt(payload.newOwner)
                      : prev.data.ownerId,
                  participants: prev.data.participants.filter(
                    (participant) =>
                      participant.username + "@" + participant.id !==
                      payload.leftUser
                  ),
                },
              };
            }
          );
        }
      );

      const onGenerateInvitationCode = stompClient.subscribe(
        `/user/${currentSocketUser}/general/onGenerateInvitationCode/${params.id}`,
        (message) => {
          const payload: { code: string; permanent: boolean } = JSON.parse(
            message.body
          );

          queryClient.setQueryData(
            [
              "chatroom_invitation",
              payload.permanent ? "permanent" : "temporary",
            ],
            () => {
              return {
                data: payload.code,
              };
            }
          );
        }
      );

      const onTransferOwnership = stompClient.subscribe(
        `/user/${currentSocketUser}/general/onTransferOwnership/${params.id}`,
        (message) => {
          const payload: number = Number.parseInt(message.body);
          const currentUser = queryClient.getQueryData<{ data: User }>([
            "user",
          ]);
          let involvesThisUser = false;

          queryClient.setQueryData(
            ["chatroom_dm", params.id],
            (prev: { data: ChatRoom }) => {
              if (
                prev.data.ownerId === currentUser?.data.id ||
                payload === currentUser?.data.id
              ) {
                involvesThisUser = true;
              }
              return {
                data: {
                  ...prev.data,
                  ownerId: payload,
                },
              };
            }
          );

          if (involvesThisUser) {
            invitationCode.refetch();
            invitationCodePermanent.refetch();
          }
        }
      );

      const onUpdateModeratorRole = stompClient.subscribe(
        `/user/${currentSocketUser}/general/onUpdateModeratorRole/${params.id}`,
        (message) => {
          let involvesThisUser = false;
          const currentUser = queryClient.getQueryData<{ data: User }>([
            "user",
          ]);

          if (message.body === "empty") {
            queryClient.setQueryData(
              ["chatroom_dm", params.id],
              (prev: { data: ChatRoom }) => {
                if (
                  prev.data.modIds?.length &&
                  currentUser?.data.id &&
                  prev.data.modIds.includes(currentUser?.data.id)
                ) {
                  involvesThisUser = true;
                }
                return {
                  data: {
                    ...prev.data,
                    modIds: undefined,
                  },
                };
              }
            );

            if (involvesThisUser) {
              invitationCode.refetch();
            }
            return;
          }
          const payload: number[] = JSON.parse(message.body);

          queryClient.setQueryData(
            ["chatroom_dm", params.id],
            (prev: { data: ChatRoom }) => {
              if (
                prev.data.modIds?.length &&
                currentUser?.data.id &&
                prev.data.modIds.includes(currentUser?.data.id)
              ) {
                involvesThisUser = true;
              }
              if (
                currentUser?.data.id &&
                payload.includes(currentUser?.data.id)
              ) {
                involvesThisUser = true;
              }
              return {
                data: {
                  ...prev.data,
                  modIds: payload ?? undefined,
                },
              };
            }
          );

          if (involvesThisUser) {
            invitationCode.refetch();
          }
        }
      );

      const onRoleSettingsUpdate = stompClient.subscribe(
        `/user/${currentSocketUser}/general/onRoleSettingsUpdate/${params.id}`,
        (message) => {
          const payload: ChatRoomRoleSettings = JSON.parse(message.body);

          let hasPublicInviteSettingChanged = false;

          queryClient.setQueryData(
            ["role_settings", params.id],
            (prev: { data: ChatRoomRoleSettings }) => {
              hasPublicInviteSettingChanged =
                prev.data.roleAllowPublicInvite !==
                payload.roleAllowPublicInvite;
              return {
                data: {
                  ...payload,
                },
              };
            }
          );

          if (hasPublicInviteSettingChanged) invitationCode.refetch();
        }
      );

      const onSetPublic = stompClient.subscribe(
        `/user/${currentSocketUser}/general/onSetPublic/${params.id}`,
        (message) => {
          const payload: boolean = message.body === "true";

          queryClient.setQueryData(
            ["chatroom_dm", params.id],
            (prev: { data: ChatRoom }) => {
              return {
                data: {
                  ...prev.data,
                  isPublic: payload,
                },
              };
            }
          );
        }
      );

      const onReadMessages = stompClient.subscribe(
        `/user/${currentSocketUser}/general/onReadMessages/${params.id}`,
        (message) => {
          const payload: { userId: number; firstUnreadTime: number } =
            JSON.parse(message.body);
          queryClient.setQueryData(
            ["chatroom_dm", params.id],
            (prev: { data: ChatRoom }) => {
              if (!prev) {
                return undefined;
              }

              return {
                data: {
                  ...prev.data,
                  participants: prev.data.participants.map((e) => {
                    if (e.id === payload.userId) {
                      return {
                        ...e,
                        firstUnreadMessageTimestamp: payload.firstUnreadTime,
                      };
                    }
                    return e;
                  }),
                },
              };
            }
          );
        }
      );

      const onEditChatRoom = stompClient.subscribe(
        `/user/${currentSocketUser}/general/onEditChatRoom`,
        (message) => {
          const payload: ChatRoom = JSON.parse(message.body);
          if (payload.id.toString() !== params.id.toString()) {
            return;
          }
          queryClient.setQueryData(["chatroom_dm", params.id], () => {
            return {
              data: {
                ...payload,
              },
            };
          });
        }
      );

      const onKickChatRoom = stompClient.subscribe(
        `/user/${currentSocketUser}/general/onKickChatRoom`,
        (message) => {
          const payload = message.body;

          if (payload === currentChatRoom?.id.toString())
            ModalUtils.openGenericModal(
              modalContext,
              "BACK TO WILDERNESS",
              "Owner of this room kicked you out..",
              () => {
                router.replace("/dashboard");
              }
            );
        }
      );

      const onDeleteChatRoom = stompClient.subscribe(
        `/user/${currentSocketUser}/general/onDeleteChatRoom`,
        (message) => {
          const payload = message.body;

          if (payload === currentChatRoom?.id.toString())
            ModalUtils.openGenericModal(
              modalContext,
              "BACK TO WILDERNESS",
              "Owner of this room deleted this chatroom...",
              () => {
                router.replace("/dashboard");
              }
            );
        }
      );

      const onChatMessage = stompClient.subscribe(
        `/user/${currentSocketUser}/general/onChatMessage/${params.id}`,
        (message) => {
          const {
            chatRecord: payload,
          }: {
            chatRecord: ChatRecordType;
            chatRoom: ChatRoom | undefined;
          } = JSON.parse(message.body);
          const blockeds = queryClient.getQueryData<{ data: User[] }>([
            "blockeds",
          ]);
          const blockers = queryClient.getQueryData<{ data: User[] }>([
            "blockers",
          ]);

          const [nsfwPreference, spamPreference] =
            contentDisplayContext?.getContentFilterFlags(
              currentChatRoomRef.current ?? undefined
            ) ?? ["ANY", "ANY"];

          if (
            payload.type === "text" &&
            payload.isNsfw &&
            nsfwPreference === "EXCLUDE"
          )
            return;
          else if (
            payload.type === "text" &&
            payload.isSpam &&
            spamPreference === "EXCLUDE"
          )
            return;

          if (
            payload.type === "text" &&
            payload.sender &&
            ((blockeds?.data &&
              blockeds.data.find((e) => e.id === payload.sender?.id)) ||
              (blockers?.data &&
                blockers.data.find((e) => e.id === payload.sender?.id)))
          ) {
            //ignore if the sender is blocked (or is a blocker)
            return;
          }

          const recordsData = queryClient.getQueryData<
            InfiniteData<{ data: ChatRecordType[] }>
          >(["chats", params.id]);

          if (recordsData && chatViewRef) {
            if (
              (recordsData.pages[0].data.length === 0 ||
                recordsData.pageParams[0] === 0) &&
              document.visibilityState === "visible" &&
              chatViewRef.scrollTop > -10
            ) {
              chatViewRef.scrollTop = 0;

              shouldScrollDownToBottom.current = true;

              setRecentChatNotificationCount(0);
              nextRenderSetNotification(() => {
                return {
                  id: parseInt(params.id),
                  signal: -1,
                };
              });
              setClientLatestMessageId(0);
              clientNotificationCnt.current = 0;

              handleReadAllMessages();

              setShowChatNotificationBar(false);
            } else if (
              (recordsData.pages[0].data.length === 0 ||
                recordsData.pageParams[0] === 0) &&
              document.visibilityState !== "visible"
            ) {
              if (clientNotificationCnt.current === 0) {
                setClientLatestMessageId(payload.id);
              }

              // nextRenderSetNotification(
              //   (prev: { id: string; signal: number }) => {
              //     return {
              //       id: parseInt(params.id),
              //       signal: prev.signal + 1,
              //     };
              //   }
              // );
              setRecentChatNotificationCount((prev) => prev + 1);
              clientNotificationCnt.current++;
            } else {
              setRecentChatNotificationCount((prev) => prev + 1);
              if (currentChatRoom && notificationContext)
                nextRenderSetNotification(
                  (prev: { id: string; signal: number }) => {
                    return {
                      id: parseInt(params.id),
                      signal: prev.signal + 1,
                    };
                  }
                );

              if (clientNotificationCnt.current === 0) {
                setClientLatestMessageId(payload.id);
              }
              clientNotificationCnt.current++;

              setRecentChatNotificationDate(payload.date);
              setShowChatNotificationBar(true);
            }
          }

          queryClient.setQueryData(
            ["chats", params.id],
            (prev: InfiniteData<{ data: ChatRecordType[] }>) => {
              if (!prev) return undefined;

              //not on the "baseline"
              if (prev.pages[0].data.length > 0 && prev.pageParams[0] !== 0) {
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

          canScroll.current = false;
        }
      );

      const onChatMessageDeleteAttachment = stompClient.subscribe(
        `/user/${currentSocketUser}/general/onChatMessageDeleteAttachment/${params.id}`,
        (message) => {
          const payload: {
            attachmentsCode: string;
            recordId: string;
            attachmentsMetadata: string;
          } = JSON.parse(message.body);

          queryClient.setQueryData(
            ["chats", params.id],
            (prev: InfiniteData<{ data: ChatRecordType[] }, number>) => {
              const pages: { data: ChatRecordType[] }[] = [];

              for (let i = 0; i < prev.pages.length; i++) {
                const original = prev.pages[i].data.map((e) => {
                  if (e.id.toString() === payload.recordId) {
                    return {
                      ...e,
                      attachments: payload.attachmentsCode.length
                        ? payload.attachmentsCode
                        : undefined,
                      attachmentsMetadata: payload.attachmentsMetadata.length
                        ? payload.attachmentsMetadata
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
      );

      const onChatMessageHideEmbed = stompClient.subscribe(
        `/user/${currentSocketUser}/general/onChatMessageHideEmbed/${params.id}`,
        (message) => {
          const messageId = message.body;
          queryClient.setQueryData(
            ["chats", params.id],
            (prev: InfiniteData<{ data: ChatRecordType[] }, number>) => {
              const pages: { data: ChatRecordType[] }[] = [];

              for (let i = 0; i < prev.pages.length; i++) {
                const original = prev.pages[i].data.map((e) => {
                  if (e.id.toString() === messageId) {
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
        }
      );

      const onChatMessageEdit = stompClient.subscribe(
        `/user/${currentSocketUser}/general/onChatMessageEdit/${params.id}`,
        (message) => {
          const payload: ChatRecordType = JSON.parse(message.body);

          queryClient.setQueryData(
            ["chats", params.id],
            (prev: InfiniteData<{ data: ChatRecordType[] }, number>) => {
              const pages: { data: ChatRecordType[] }[] = [];

              for (let i = 0; i < prev.pages.length; i++) {
                const original = prev.pages[i].data.map((e) => {
                  if (e.id === payload.id) {
                    return { ...payload };
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

      const onChatMessageDelete = stompClient.subscribe(
        `/user/${currentSocketUser}/general/onChatMessageDelete/${params.id}`,
        (message) => {
          const deletedId = message.body;
          queryClient.setQueryData(
            ["chats", params.id],
            (prev: InfiniteData<{ data: ChatRecordType[] }>) => {
              if (!prev) return undefined;

              const all: ChatRecordType[] = [];
              let deletionOcurred = false;
              for (const page of prev.pages) {
                for (const record of page.data) {
                  if (record.id.toString() !== deletedId) {
                    all.push(record);
                  } else {
                    deletionOcurred = true;
                  }
                }
              }

              if (!deletionOcurred) {
                return prev;
              }

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
        }
      );

      const onChatMessageReact = stompClient.subscribe(
        `/user/${currentSocketUser}/general/onChatMessageReact/${params.id}`,
        (message) => {
          const payload: ChatReaction = JSON.parse(message.body);

          queryClient.setQueryData(
            ["chats", params.id],
            (prev: InfiniteData<{ data: ChatRecordType[] }, number>) => {
              const pages: { data: ChatRecordType[] }[] = [];

              for (let i = 0; i < prev.pages.length; i++) {
                const original = prev.pages[i].data.map((e) => {
                  if (e.id === payload.recordId) {
                    return {
                      ...e,
                      chatReactions: [...e.chatReactions, payload],
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
      );

      const onChatMessageUnreact = stompClient.subscribe(
        `/user/${currentSocketUser}/general/onChatMessageUnreact/${params.id}`,
        (message) => {
          const payload: ChatReaction = JSON.parse(message.body);

          queryClient.setQueryData(
            ["chats", params.id],
            (prev: InfiniteData<{ data: ChatRecordType[] }, number>) => {
              const pages: { data: ChatRecordType[] }[] = [];

              for (let i = 0; i < prev.pages.length; i++) {
                const original = prev.pages[i].data.map((e) => {
                  if (e.id === payload.recordId) {
                    return {
                      ...e,
                      chatReactions: e.chatReactions.filter(
                        (reaction) => reaction.id !== payload.id
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
      );

      const onLeaveCall = stompClient.subscribe(
        `/user/${currentSocketUser}/general/onLeaveCall/${params.id}`,
        (message) => {
          const payload: User = JSON.parse(message.body);

          queryClient.setQueryData(
            ["chatroom_dm", params.id],
            (prev: { data: ChatRoom }) => {
              if (!prev) return undefined;

              const callInstance = prev.data.callInstance;
              if (!callInstance) return prev;

              const filtered = callInstance.activeParticipants.filter(
                (user) => user.id !== payload.id
              );
              const filtered2 = callInstance.pendingParticipants.filter(
                (user) => user.id !== payload.id
              );

              if (filtered.length === 0) {
                setCallOverlayPlayExitAnimation(true);
                setTimeout(() => {
                  setCallOverlayPlayExitAnimation(false);
                  setCallOverlayOpenMode("");
                }, 300);
              }
              return {
                data: {
                  ...prev.data,
                  callInstance:
                    filtered.length > 0
                      ? {
                          ...prev.data.callInstance,
                          activeParticipants: filtered,
                          pendingParticipants: filtered2,
                        }
                      : undefined,
                },
              };
            }
          );
        }
      );

      const onCallAbort = stompClient.subscribe(
        `/user/${currentSocketUser}/general/onCallAbort/${params.id}`,
        () => {
          queryClient.setQueryData(
            ["chatroom_dm", params.id],
            (prev: { data: ChatRoom }) => {
              if (!prev) return undefined;

              const callInstance = prev.data.callInstance;
              if (!callInstance) return prev;

              return {
                data: {
                  ...prev.data,
                  callInstance: undefined,
                },
              };
            }
          );

          setCallOverlayPlayExitAnimation(true);
          setTimeout(() => {
            setCallOverlayPlayExitAnimation(false);
            setCallOverlayOpenMode("");
          }, 300);
        }
      );

      const onJoinCall = stompClient.subscribe(
        `/user/${currentSocketUser}/general/onJoinCall/${params.id}`,
        (message) => {
          const payload: User = JSON.parse(message.body);

          queryClient.setQueryData(
            ["chatroom_dm", params.id],
            (prev: { data: ChatRoom }) => {
              if (!prev) return undefined;

              const callInstance = prev.data.callInstance;
              if (!callInstance) return prev;

              const added = [...callInstance.activeParticipants, payload];
              const filtered = callInstance.pendingParticipants.filter(
                (user) => user.id !== payload.id
              );

              return {
                data: {
                  ...prev.data,
                  callInstance: {
                    ...callInstance,
                    activeParticipants: added,
                    pendingParticipants: filtered,
                  },
                },
              };
            }
          );
        }
      );

      const onRejectCall = stompClient.subscribe(
        `/user/${currentSocketUser}/general/onRejectCall/${params.id}`,
        (message) => {
          const payload = Number.parseInt(message.body);
          //remove user from the pending participants in the chatroom's call instance
          queryClient.setQueryData(
            ["chatroom_dm", params.id],
            (prev: { data: ChatRoom }) => {
              if (!prev || !prev.data.callInstance) return prev;

              return {
                data: {
                  ...prev.data,
                  callInstance: {
                    ...prev.data.callInstance,
                    pendingParticipants:
                      prev.data.callInstance.pendingParticipants.filter(
                        (user) => user.id !== payload
                      ),
                  },
                },
              };
            }
          );
        }
      );

      const onCall = stompClient.subscribe(
        `/user/${currentSocketUser}/general/onCall`,
        (message) => {
          const payload: { chatRoom: ChatRoom; starterId: number } = JSON.parse(
            message.body
          );
          if (payload.chatRoom.id.toString() !== params.id) {
            return;
          }
          queryClient.setQueryData(
            ["chatroom_dm", params.id],
            (prev: { data: ChatRoom }) => {
              if (!prev) return prev;

              return {
                data: {
                  ...prev.data,
                  callInstance: payload.chatRoom.callInstance,
                },
              };
            }
          );
        }
      );

      const onUserMute = stompClient.subscribe(
        `/user/${currentSocketUser}/general/onUserMute`,
        (message) => {
          const payload: {
            userId: number;
            muted: boolean;
            chatRoomId: number;
          } = JSON.parse(message.body);

          queryClient.setQueryData(
            ["chatroom_dm", params.id],
            (prev: { data: ChatRoom }) => {
              if (!prev) return prev;
              return {
                data: {
                  ...prev.data,
                  participants: prev.data.participants.map((participant) => {
                    if (participant.id === payload.userId) {
                      return {
                        ...participant,
                        isCallMuted: payload.muted,
                      };
                    }
                    return participant;
                  }),
                },
              };
            }
          );
        }
      );

      const onUserDeafen = stompClient.subscribe(
        `/user/${currentSocketUser}/general/onUserDeafen`,
        (message) => {
          const payload: {
            userId: number;
            deafened: boolean;
            chatRoomId: number;
          } = JSON.parse(message.body);

          queryClient.setQueryData(
            ["chatroom_dm", params.id],
            (prev: { data: ChatRoom }) => {
              if (!prev) return prev;
              return {
                data: {
                  ...prev.data,
                  participants: prev.data.participants.map((participant) => {
                    if (participant.id === payload.userId) {
                      return {
                        ...participant,
                        isDeafened: payload.deafened,
                      };
                    }
                    return participant;
                  }),
                },
              };
            }
          );
        }
      );

      const onUserCanPreviewStream = stompClient.subscribe(
        `/user/${currentSocketUser}/general/onUserCanPreviewStream`,
        (message) => {
          const payload: {
            userId: number;
            can: boolean;
          } = JSON.parse(message.body);

          queryClient.setQueryData(
            ["chatroom_dm", params.id],
            (prev: { data: ChatRoom }) => {
              if (!prev) return prev;
              return {
                data: {
                  ...prev.data,
                  participants: prev.data.participants.map((participant) => {
                    if (participant.id === payload.userId) {
                      return {
                        ...participant,
                        canPreviewStream: payload.can,
                      };
                    }
                    return participant;
                  }),
                },
              };
            }
          );
        }
      );

      const onUserVideoEnable = stompClient.subscribe(
        `/user/${currentSocketUser}/general/onUserVideoEnable/${params.id}`,
        (message) => {
          const payload: { userId: number; enabled: boolean } = JSON.parse(
            message.body
          );

          queryClient.setQueryData(
            ["chatroom_dm", params.id],
            (prev: { data: ChatRoom }) => {
              if (!prev) return prev;
              return {
                data: {
                  ...prev.data,
                  participants: prev.data.participants.map((participant) => {
                    if (participant.id === payload.userId) {
                      return {
                        ...participant,
                        isVideoEnabled: payload.enabled,
                      };
                    }
                    return participant;
                  }),
                },
              };
            }
          );
        }
      );

      const onCallMusicState = stompClient.subscribe(
        `/user/${currentSocketUser}/general/onCallMusicState/${params.id}`,
        (message) => {
          const payload: { playing: boolean } = JSON.parse(message.body);

          queryClient.setQueryData(
            ["chatroom_dm", params.id],
            (prev: { data: ChatRoom }) => {
              if (!prev) return prev;
              return {
                data: {
                  ...prev.data,
                  callInstance: {
                    ...prev.data.callInstance,
                    hasMusic: payload.playing ? true : undefined,
                  },
                },
              };
            }
          );
        }
      );

      const onUserScreenShareEnable = stompClient.subscribe(
        `/user/${currentSocketUser}/general/onUserScreenShareEnable/${params.id}`,
        (message) => {
          const payload: { userId: number; enabled: string } = JSON.parse(
            message.body
          );

          queryClient.setQueryData(
            ["chatroom_dm", params.id],
            (prev: { data: ChatRoom }) => {
              if (!prev) return prev;
              return {
                data: {
                  ...prev.data,
                  participants: prev.data.participants.map((participant) => {
                    if (participant.id === payload.userId) {
                      return {
                        ...participant,
                        isScreenShareEnabled: payload.enabled,
                      };
                    }
                    return participant;
                  }),
                },
              };
            }
          );
        }
      );

      const onAddSound = stompClient.subscribe(
        `/user/${currentSocketUser}/general/onAddSound/${params.id}`,
        (message) => {
          const payload: Sound = JSON.parse(message.body);

          queryClient.setQueryData(
            ["chatroom_dm", params.id],
            (prev: { data: ChatRoom }) => {
              if (!prev) return prev;
              return {
                data: {
                  ...prev.data,
                  sounds: [...prev.data.sounds, payload],
                },
              };
            }
          );
        }
      );

      const onDeleteSound = stompClient.subscribe(
        `/user/${currentSocketUser}/general/onDeleteSound/${params.id}`,
        (message) => {
          const payload: { name: string; type: string } = JSON.parse(
            message.body
          );

          queryClient.setQueryData(
            ["chatroom_dm", params.id],
            (prev: { data: ChatRoom }) => {
              if (!prev) return prev;
              return {
                data: {
                  ...prev.data,
                  sounds: prev.data.sounds.filter(
                    (e) => e.name !== payload.name || e.type !== payload.type
                  ),
                },
              };
            }
          );
        }
      );

      const onMusicReorder = stompClient.subscribe(
        `/user/${currentSocketUser}/general/onMusicReorder/${params.id}`,
        (message) => {
          const orderIndices: { [key: string]: number } = JSON.parse(
            message.body
          );
          const orderIndicesInverse: { [key: number]: string } = {};
          Object.entries(orderIndices).forEach(([key, value]) => {
            orderIndicesInverse[value] = key;
          });
          queryClient.setQueryData(
            ["chatroom_dm", params.id],
            (prev: { data: ChatRoom }) => {
              if (!prev) return prev;
              const existingSounds = prev.data.sounds.filter(
                (s) => s.type === "sound"
              );
              const existingMusics = prev.data.sounds.filter(
                (s) => s.type === "music"
              );

              let newSounds = [...existingSounds];

              Object.keys(orderIndicesInverse)
                .map((e) => parseInt(e))
                .sort()
                .forEach((key) => {
                  const musicName = orderIndicesInverse[key];
                  const music = existingMusics.find(
                    (e) => e.name === musicName
                  );
                  if (music) newSounds.push(music);
                });

              if (
                newSounds.length !==
                existingMusics.length + existingSounds.length
              ) {
                newSounds = prev.data.sounds;
              }

              return {
                data: {
                  ...prev.data,
                  sounds: newSounds,
                },
              };
            }
          );
        }
      );

      const onAddBackground = stompClient.subscribe(
        `/user/${currentSocketUser}/general/onAddBackground/${params.id}`,
        (message) => {
          const payload: Background = JSON.parse(message.body);

          queryClient.setQueryData(
            ["chatroom_dm", params.id],
            (prev: { data: ChatRoom }) => {
              if (!prev) return prev;
              return {
                data: {
                  ...prev.data,
                  backgrounds: [...prev.data.backgrounds, payload],
                },
              };
            }
          );
        }
      );

      const onDeleteBackground = stompClient.subscribe(
        `/user/${currentSocketUser}/general/onDeleteBackground/${params.id}`,
        (message) => {
          const payload: { name: string } = JSON.parse(message.body);

          queryClient.setQueryData(
            ["chatroom_dm", params.id],
            (prev: { data: ChatRoom }) => {
              if (!prev) return prev;
              return {
                data: {
                  ...prev.data,
                  backgrounds: prev.data.backgrounds.filter(
                    (e) => e.name !== payload.name
                  ),
                },
              };
            }
          );
        }
      );
      return [
        onCall,
        onJoinCall,
        onLeaveCall,
        onRejectCall,
        onUserStatusUpdate,
        onUserType,
        onEditProfile,
        onLeaveChatRoom,
        onEditChatRoom,
        onKickChatRoom,
        onChatMessage,
        onChatMessageEdit,
        onChatMessageDelete,
        onDeleteChatRoom,
        onChatMessageReact,
        onChatMessageUnreact,
        onChatMessageDeleteAttachment,
        onChatMessageHideEmbed,
        onTransferOwnership,
        onUpdateModeratorRole,
        onUserMute,
        onUserVideoEnable,
        onCallAbort,
        onUserScreenShareEnable,
        onUserDeafen,
        onAddSound,
        onDeleteSound,
        onMusicReorder,
        onCallMusicState,
        onAddBackground,
        onDeleteBackground,
        onUserCanPreviewStream,
        onRoleSettingsUpdate,
        onGenerateInvitationCode,
        onSetPublic,
        onReadMessages,
      ];
    },
    [stompContext?.stompClient, stompContext?.stompFrame, chatViewRef]
  );

  const getText = useCallback((editor: Editor) => {
    return GenericUtil.parseMarkdownText(editor);
  }, []);

  const handleOnFileUpload = useCallback(
    (files: FileList | null) => {
      if (!files?.length) {
        return;
      }

      if (setAttachments) {
        const filesArray: { file: File; spoiler: boolean }[] = [];
        if (files) {
          for (const file of files) {
            filesArray.push({
              file: file,
              spoiler: false,
            });
          }
        }
        const updatedAttachments = attachments
          ? [...attachments, ...filesArray]
          : [...filesArray];
        if (updatedAttachments.length > 10) {
          ModalUtils.openGenericModal(
            modalContext,
            "Too heavy..",
            "You cannot attach more than 10 files! Delete some!"
          );
          return;
        }

        setAttachments(updatedAttachments);
        if (fileUploaderRef.current) {
          fileUploaderRef.current.value = "";
        }
      }
    },
    [setAttachments, attachments]
  );

  const sendMessageMutation = useMutation({
    mutationFn: ({
      message,
      pending,
      replyTarget,
      attachments,
      attachmentsMetadata,
    }: {
      message: string;
      pending: ChatRecordType;
      replyTarget: ChatRecordType | undefined;
      attachments: { file: File; spoiler: boolean }[] | null;
      attachmentsMetadata: string;
    }) => {
      if (attachments?.length && attachmentsMetadata.length > 0) {
        const formData: FormData = new FormData();
        formData.set("message", message);
        formData.set(
          "replyTarget",
          replyTarget ? replyTarget.id.toString() : ""
        );
        formData.set(
          "replyTargetSenderId",
          replyTarget && replyTarget.sender
            ? replyTarget.sender.id.toString()
            : ""
        );
        let replyTargetMessage = replyTarget ? replyTarget.message : null;
        if (replyTargetMessage !== null && replyTargetMessage.length === 0) {
          if (
            replyTarget &&
            replyTarget.attachments &&
            replyTarget.attachments.length > 0
          ) {
            replyTargetMessage = "Click to see attachments";
          }
        }

        formData.set(
          "replyTargetMessage",
          replyTargetMessage ? replyTargetMessage : ""
        );

        formData.set("attachmentsMetadata", attachmentsMetadata);

        attachments.forEach((attachment) => {
          formData.append("attachments", attachment.file);
        });

        return api.post(
          `/chat/message/attachments/${currentChatRoom?.id || -1}`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
            onUploadProgress(progressEvent) {
              setPendingMessages((prev) =>
                prev.map((pending_) => {
                  if (pending_.id === pending.id) {
                    pending.clientAttachmentUploadProgress =
                      progressEvent.progress;
                  }
                  return pending_;
                })
              );
            },
          }
        );
      } else {
        let replyTargetMessage = replyTarget ? replyTarget.message : null;
        if (replyTargetMessage !== null && replyTargetMessage.length === 0) {
          if (
            replyTarget &&
            replyTarget.attachments &&
            replyTarget.attachments.length > 0
          ) {
            replyTargetMessage = "Click to see attachments";
          }
        }

        return api.post(`/chat/message/${currentChatRoom?.id || -1}`, {
          message: message,
          replyTarget: replyTarget ? replyTarget.id : null,
          replyTargetSenderId:
            replyTarget && replyTarget.sender ? replyTarget.sender.id : null,
          replyTargetMessage: replyTargetMessage,
        });
      }
    },
    async onSettled(data, error, variables) {
      if (!data) return;

      if (data?.status === 200) {
        if (currentChatRoom) {
          queryClient.setQueryData(
            ["chatroom_dm"],
            (prev: { data: ChatRoom[] }) => {
              if (prev.data[0].id === currentChatRoom.id) {
                return prev;
              }

              const newList = [currentChatRoom];
              prev.data.forEach((chatRoom) => {
                if (chatRoom.id !== currentChatRoom.id) newList.push(chatRoom);
              });

              return {
                data: newList,
              };
            }
          );
        }

        if (chatRecords.data) {
          // console.log(chatRecords.data?.pageParams)
          if (
            chatRecords.data.pages[0].data.length > 0 &&
            chatRecords.data.pageParams[0] !== 0
          ) {
            // setTimeout(() => {
            //     if(chatViewRef) {
            //         chatViewRef.scrollTop = lastScrollHeight.current
            //         console.log('scrolltop set: ', lastScrollHeight.current)
            //         }
            // },10)
            await batchResetQuery();
            setPendingMessages((prev) =>
              prev.filter((e) => e.id !== variables.pending.id)
            );

            return;
          }
          const payload = data.data;
          shouldScrollDownToBottom.current = true;

          await queryClient.setQueryData(
            ["chats", params.id],
            (prev: InfiniteData<{ data: ChatRecordType[] }>) => {
              if (!prev) return undefined;

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

          setPendingMessages((prev) =>
            prev.filter((e) => e.id !== variables.pending.id)
          );
        }

        handleReadAllMessages();
      } else {
        setPendingMessages((prev) =>
          prev.filter((e) => e.id !== variables.pending.id)
        );
        ModalUtils.handleGenericError(modalContext, data);
      }
    },
  });

  const handleAttachAsTextFile = useCallback(
    (message: string, editor: Editor) => {
      //clear the editor
      const point = { path: [0, 0], offset: 0 };
      editor.selection = { anchor: point, focus: point };
      editor.children = [
        {
          type: "paragraph",
          children: [{ text: "" }],
        },
      ];
      //create text file
      const blob = new Blob([message], {
        type: "text/plain",
      });
      const file = new File([blob], "message.txt", {
        type: "text/plain",
      });

      setAttachments((prev) => {
        if (!prev) {
          return [
            {
              file: file,
              spoiler: false,
            },
          ];
        } else {
          return [
            ...prev,
            {
              file: file,
              spoiler: false,
            },
          ];
        }
      });
    },
    []
  );

  const handleSendMessage = useCallback(
    async (editor?: Editor, plainText?: string) => {
      await new Promise((resolve) => setTimeout(() => resolve(true), 50));

      const text = editor ? getText(editor) : plainText ?? "";

      if (text.length === 0 && !attachments?.length) {
        return;
      } else if (editor && text.length > 255 && text.length <= 8000000) {
        ModalUtils.openYesorNoModal(
          modalContext,
          "Too long but there's a way.",
          "Your message is too long.. Would you like to send it as a text file?",
          () => {
            handleAttachAsTextFile(text, editor);
          },
          () => {},
          undefined,
          ["Sure", "Nope"]
        );
        return;
      } else if (text.length > 8000000) {
        ModalUtils.openGenericModal(
          modalContext,
          "Oof!",
          "Your message is way too heavy.."
        );
      }

      let attachmentCode = "";
      let attachmentsMetadata = "";

      if (attachments?.length) {
        for (const attachment of attachments) {
          if (attachment.file.name.length > 35) {
            ModalUtils.openGenericModal(
              modalContext,
              "Oof!",
              `Name for the attachment ${
                attachment.file.name.substring(0, 35) + "..."
              } is too long!`
            );
            return;
          }
          if (!Constants.fileNameRe.test(attachment.file.name)) {
            ModalUtils.openGenericModal(
              modalContext,
              "Oof!",
              `Name for the attachment ${attachment.file.name} contains invalid characters!`
            );
            return;
          }
          if (attachment.file.size >= 8000000) {
            ModalUtils.openGenericModal(
              modalContext,
              "Oof!",
              `${attachment.file.name} exceeds max upload size of 8MB!`
            );
            return;
          }

          attachmentsMetadata += (attachment.spoiler ? "s" : "n") + " ";

          attachmentCode += uuidv4() + "_" + attachment.file.name + ",";
        }
      }

      if (!currentUser) {
        return;
      }

      setRecentChatNotificationCount(0);
      nextRenderSetNotification(() => {
        return {
          id: parseInt(params.id),
          signal: -1,
        };
      });
      setClientLatestMessageId(0);
      clientNotificationCnt.current = 0;
      setShowChatNotificationBar(false);

      try {
        if (editor) {
          Transforms.delete(editor, {
            at: {
              anchor: Editor.start(editor, []),
              focus: Editor.end(editor, []),
            },
          });
        }
      } catch (e) {
        console.error(e);
      }

      //optimistic update - add new pending message
      const id = pendingId.current;
      pendingId.current++;
      const newPendingMessage: ChatRecordType = {
        sender: currentUser,
        date: new Date(),
        id: id,
        type: "pending_text",
        message: text,
        edited: false,
        chatReactions: [],
        pollVotes: [],
        replyTargetId: replyTarget?.id,
        replyTargetMessage: replyTarget?.message,
        replyTargetSender: replyTarget?.sender ?? undefined,
        attachments: attachmentCode.length > 0 ? attachmentCode : undefined,
        attachmentsMetadata:
          attachmentsMetadata.length > 0 ? attachmentsMetadata : undefined,
        clientAttachmentUploadProgress:
          attachmentCode.length > 0 ? 0 : undefined,
        pinned: false,
      };

      //add new pending message
      setPendingMessages((prev) => [newPendingMessage, ...prev]);

      if (
        chatRecords.data &&
        (chatRecords.data.pages[0].data.length === 0 ||
          chatRecords.data.pageParams[0] === 0) &&
        chatViewRef
      ) {
        chatViewRef.scrollTop = 0;
      }

      await sendMessageMutation.mutateAsync({
        message: text,
        pending: newPendingMessage,
        replyTarget: replyTarget,
        attachments: attachments ? [...attachments] : null,
        attachmentsMetadata: attachmentsMetadata.trim(),
      });

      if (fileUploaderRef.current) fileUploaderRef.current.value = "";
      setAttachments(null);

      setReplyTarget(undefined);
    },
    [currentUser, sendMessageMutation, chatRecords, replyTarget]
  );

  const handleJumpToPresent = useCallback(async () => {
    await batchResetQuery();
    setShowChatNotificationBar(false);
  }, [queryClient]);

  const readerObserver = useRef<IntersectionObserver | null>(null);
  const flatChatRecords = useMemo(() => {
    const records: ChatRecordType[] = [];
    // console.log("current state:", chatRecords.data?.pages);

    if (currentChatRoom?.id && chatViewRef) {
      if (chatRecords.data && chatRecords.data.pages["map"]) {
        chatRecords.data.pages.forEach((page) => {
          if (page.data["forEach"]) {
            page.data.forEach((record) => {
              records.push(record);

              if (
                clientLatestMessageId > 0 &&
                clientLatestMessageId === record.id &&
                recentChatNotificationCount > 0
              ) {
                setTimeout(() => {
                  const element = document.getElementById("id_" + record.id);

                  if (element) {
                    const elementRect = element.getBoundingClientRect();
                    const containerRect = chatViewRef.getBoundingClientRect();

                    const isVisible =
                      elementRect.top >= containerRect.top &&
                      elementRect.bottom <= containerRect.bottom &&
                      elementRect.left >= containerRect.left &&
                      elementRect.right <= containerRect.right &&
                      document.visibilityState === "visible";

                    if (isVisible) {
                      setRecentChatNotificationCount(0);
                      clientNotificationCnt.current = 0;

                      if (notificationContext)
                        nextRenderSetNotification(() => {
                          return {
                            id: currentChatRoom.id,
                            signal: -1,
                          };
                        });
                      setShowChatNotificationBar(false);

                      handleReadAllMessages();

                      const currentClientLatestMessageId =
                        clientLatestMessageId;

                      setTimeout(() => {
                        setShouldClearClientLatestMessageId(
                          currentClientLatestMessageId
                        );
                      }, 5000);

                      readerObserver.current?.disconnect();
                    } else {
                      if (readerObserver.current) {
                        readerObserver.current.disconnect();
                      }
                      readerObserver.current = new IntersectionObserver(
                        (entries) => {
                          entries.forEach((entry) => {
                            if (entry.isIntersecting) {
                              setRecentChatNotificationCount(0);
                              clientNotificationCnt.current = 0;

                              if (notificationContext)
                                nextRenderSetNotification(() => {
                                  return {
                                    id: currentChatRoom.id,
                                    signal: -1,
                                  };
                                });
                              setShowChatNotificationBar(false);

                              handleReadAllMessages();

                              const currentClientLatestMessageId =
                                clientLatestMessageId;

                              setTimeout(() => {
                                setShouldClearClientLatestMessageId(
                                  currentClientLatestMessageId
                                );
                              }, 5000);

                              readerObserver.current?.disconnect();
                            }
                          });
                        },
                        {
                          threshold: 0.5,
                        }
                      );

                      readerObserver.current.observe(element);
                    }
                  }
                }, 200);
              }
            });
          }
        });
      }
    }

    return records;
  }, [
    chatRecords.data?.pages,
    currentChatRoom?.id,
    clientLatestMessageId,
    recentChatNotificationCount,
    handleReadAllMessages,
    chatViewRef,
  ]);

  const chatRenderData = useMemo(() => {
    const renderdata: [
      ((el: HTMLDivElement) => void) | null,
      string,
      boolean
    ][] = [];

    flatChatRecords.forEach((record, i) => {
      let refCallback = null;
      let isMergedChat = false;
      if (i === 0) refCallback = observePrevPage;
      else if (i === flatChatRecords.length - 1) refCallback = observeNextPage;

      const currentRecordDate = sub(record.date, {});
      let nextRecordDate = currentRecordDate;
      const currentRecord = record;
      let nextRecord = record;

      if (i + 1 < flatChatRecords.length) {
        nextRecordDate = sub(flatChatRecords[i + 1].date, {});
        nextRecord = flatChatRecords[i + 1];
      }
      let dividerText = "";

      if (clientLatestMessageId === record.id) {
        dividerText = "New Message";
      } else if (nextRecordDate.getDate() !== currentRecordDate.getDate()) {
        dividerText = format(record.date, "LLLL dd, yyyy");
      }

      if (
        nextRecordDate.getFullYear() === currentRecordDate.getFullYear() &&
        nextRecordDate.getMonth() === currentRecordDate.getMonth() &&
        nextRecordDate.getDate() === currentRecordDate.getDate() &&
        nextRecordDate.getHours() === currentRecordDate.getHours() &&
        nextRecordDate.getMinutes() === currentRecordDate.getMinutes() &&
        Math.abs(
          nextRecordDate.getSeconds() - currentRecordDate.getSeconds()
        ) <= 3
      ) {
        //within 3 seconds of previous chat and is sent by the same user

        if (
          nextRecord.sender &&
          currentRecord.sender &&
          nextRecord.sender.id === currentRecord.sender.id &&
          !nextRecord.type.startsWith("system")
        )
          isMergedChat = true;
      }

      if (i === flatChatRecords.length - 1) {
        isMergedChat = false;
      }

      if (currentRecord.replyTargetId) {
        isMergedChat = false;
      }

      renderdata.push([refCallback, dividerText, isMergedChat]);
    });

    return renderdata;
  }, [
    flatChatRecords,
    recentChatNotificationCount,
    currentChatRoom?.latestMessageId,
    clientLatestMessageId,
  ]);

  const pendingChatRenderData = useMemo(() => {
    const renderdata: [string, boolean][] = [];

    pendingMessages.forEach((record, i) => {
      let isMergedChat = false;

      const currentRecordDate = sub(record.date, {});
      let nextRecordDate = currentRecordDate;
      const currentRecord = record;
      let nextRecord = record;

      if (i + 1 < pendingMessages.length) {
        nextRecordDate = sub(pendingMessages[i + 1].date, {});
        nextRecord = pendingMessages[i + 1];
      } else {
        //no next pending messages, try first entry of actual chat records
        if (flatChatRecords.length >= 1) {
          nextRecordDate = sub(flatChatRecords[0].date, {});
          nextRecord = flatChatRecords[0];
        }
      }
      let dividerText = "";

      if (nextRecordDate.getDate() !== currentRecordDate.getDate()) {
        dividerText = format(record.date, "LLLL dd, yyyy");
      }

      if (
        nextRecordDate.getFullYear() === currentRecordDate.getFullYear() &&
        nextRecordDate.getMonth() === currentRecordDate.getMonth() &&
        nextRecordDate.getDate() === currentRecordDate.getDate() &&
        nextRecordDate.getHours() === currentRecordDate.getHours() &&
        nextRecordDate.getMinutes() === currentRecordDate.getMinutes() &&
        Math.abs(
          nextRecordDate.getSeconds() - currentRecordDate.getSeconds()
        ) <= 3
      ) {
        //within 3 seconds of previous chat and sent by the same user
        if (
          currentRecord.sender &&
          nextRecord.sender &&
          currentRecord.sender.id === nextRecord.sender.id
        ) {
          isMergedChat = true;
        }
      }

      if (pendingMessages.length - 1 === i && flatChatRecords.length === 0) {
        isMergedChat = false;
      }

      if (currentRecord.replyTargetId) {
        isMergedChat = false;
      }

      renderdata.push([dividerText, isMergedChat]);
    });

    return renderdata;
  }, [pendingMessages, flatChatRecords]);

  const windowSize = useWindowSize();
  const previousWindowHeightCategoryRef = useRef<number>(0);

  const [height, setHeight] = useDebounceValue(windowSize.height, 1000);
  useEffect(() => {
    const header = document.getElementById("header");

    if (header && chatInputRef) {
      setChatViewHeight(
        chatInputRef.getBoundingClientRect().top -
          header.getBoundingClientRect().bottom
      );
    }
    setHeight(windowSize.height);
  }, [windowSize, chatInputRef]);
  useEffect(() => {
    let windowHeightCategory = 0;

    if (height <= 750) {
      Constants.CLIENT_MAX_PAGES = 3;

      windowHeightCategory = 0;
    } else if (height <= 1080) {
      Constants.CLIENT_MAX_PAGES = 4;

      windowHeightCategory = 1;
    } else if (height <= 1440) {
      Constants.CLIENT_MAX_PAGES = 5;

      windowHeightCategory = 2;
    } else if (height <= 1600) {
      Constants.CLIENT_MAX_PAGES = 6;

      windowHeightCategory = 3;
    } else {
      Constants.CLIENT_MAX_PAGES = 7;

      windowHeightCategory = 4;
    }

    if (windowHeightCategory !== previousWindowHeightCategoryRef.current) {
      if (!resettingQuery.current && chatMessagesLoadedRef.current)
        batchResetQuery();
      previousWindowHeightCategoryRef.current = windowHeightCategory;
    }
  }, [height]);

  const chatMessagesLoadedRef = useRef<boolean>(false);

  useEffect(() => {
    chatMessagesLoadedRef.current = chatMessagesLoaded;
  }, [chatMessagesLoaded]);

  const queryChatRecordByIdMutation = useMutation({
    mutationFn: (id: number) => {
      const [nsfwPreference, spamPreference] =
        contentDisplayContext?.getContentFilterFlags(
          currentChatRoomRef.current ?? undefined
        ) ?? ["ANY", "ANY"];

      return api.get(
        `/chat/message/verify/${
          currentChatRoom?.id || -1
        }/${id}?nsfw=${nsfwPreference}&spam=${spamPreference}`
      );
    },
    async onSettled(data, error, variables) {
      if (!data) return;

      if (data.status === 200 && chatViewRef && chatRecords.data) {
        //found in database, must exist

        const targetId = variables;
        const currentId =
          chatRecords.data.pages.length >= 2
            ? chatRecords.data.pages[1].data[0].id
            : 0;

        console.log("current:", currentId);

        const pageBefore = await api.get<ChatRecordType[]>(
          `/chat/message/${params.id}?pageKey=${-targetId}`
        );

        if (pageBefore.status !== 200) {
          ModalUtils.openGenericModal(
            modalContext,
            "ERROR",
            "There was error loading messages."
          );
          ToastUtils.closeToast(toastContext);
          return;
        }

        const pageAt = await api.get<ChatRecordType[]>(
          `/chat/message/${params.id}?pageKey=${targetId + 1}`
        );

        if (pageAt.status !== 200) {
          ModalUtils.openGenericModal(
            modalContext,
            "ERROR",
            "There was error loading messages."
          );
          ToastUtils.closeToast(toastContext);
          return;
        }

        forcedScrolling.current = true;

        await queryClient.cancelQueries({
          queryKey: ["chats", currentChatRoom?.id.toString()],
        });

        await queryClient.setQueryData(
          ["chats", currentChatRoom?.id.toString()],
          () => {
            console.log("params set: ", pageBefore.data, pageAt.data);
            return {
              pages: [
                {
                  data: pageBefore.data,
                },
                {
                  data: pageAt.data,
                },
              ],
              pageParams: [-targetId, targetId + 1],
            };
          }
        );

        await chatRecords.fetchPreviousPage();

        if (targetId > currentId) {
          //must navigate down
          chatViewRef.scrollTop = -chatViewRef.scrollHeight;
        } else {
          chatViewRef.scrollTop = 0;
        }

        setTimeout(() => {
          if (document.getElementById("id_" + variables) !== null) {
            document
              .getElementById("id_" + variables)!
              .scrollIntoView({ behavior: "smooth", block: "center" });

            setTimeout(() => {
              document.getElementById(
                "id_" + variables
              )!.style.backgroundColor = isLightMode
                ? "rgb(190,242,100)"
                : "rgb(101,163,13)";
              setTimeout(async () => {
                document.getElementById(
                  "id_" + variables
                )!.style.backgroundColor = "";

                forcedScrolling.current = false;
                navigatingToChatRecord.current = false;
              }, 500);
            }, 500);
          }
        }, 500);

        // console.log(document.getElementById("id_" + variables))
        // document.getElementById("id_"+variables)?.scrollIntoView({behavior: 'smooth', block: 'start'})

        ToastUtils.closeToast(toastContext);
      } else {
        ModalUtils.openGenericModal(
          modalContext,
          "NOT FOUND",
          "The chat message has been deleted."
        );
        ToastUtils.closeToast(toastContext);
        navigatingToChatRecord.current = false;
      }
    },
  });

  const navigatingToChatRecord = useRef<boolean>(false);

  const handleNavigateToChatRecord = useCallback(
    async (chatRecordId: number) => {
      if (navigatingToChatRecord.current) return;
      if (flatChatRecords && chatViewRef) {
        navigatingToChatRecord.current = true;
        for (const record of flatChatRecords) {
          //found in current page
          if (record.id === chatRecordId) {
            console.log("found!");
            document.getElementById("id_" + record.id)?.scrollIntoView({
              block: "center",
              behavior: "smooth",
            });

            setTimeout(() => {
              document.getElementById(
                "id_" + record.id
              )!.style.backgroundColor = isLightMode
                ? "rgb(190,242,100)"
                : "rgb(101,163,13)";
              setTimeout(() => {
                document.getElementById(
                  "id_" + record.id
                )!.style.backgroundColor = "";
                navigatingToChatRecord.current = false;
              }, 500);
            }, 500);

            return;
          }
        }

        //not found in current page, query for it in database
        ToastUtils.openToast(toastContext, "Loading messages...");

        if (!queryChatRecordByIdMutation.isPending) {
          queryChatRecordByIdMutation.mutate(chatRecordId);
        }
      }
    },
    [flatChatRecords, chatViewRef, queryChatRecordByIdMutation, toastContext]
  );

  const [
    shouldClearClientLatestMessageId,
    setShouldClearClientLatestMessageId,
  ] = useState<number>(0);

  useEffect(() => {
    if (shouldClearClientLatestMessageId > 0) {
      if (shouldClearClientLatestMessageId === clientLatestMessageId) {
        setClientLatestMessageId(0);
      }

      setShouldClearClientLatestMessageId(0);
    }
  }, [shouldClearClientLatestMessageId, clientLatestMessageId]);
  //notification count handler

  useEffect(() => {
    const handleTabRefocus = () => {
      if (document.visibilityState === "visible") {
        if (clientLatestMessageId > 0) {
          handleNavigateToChatRecord(clientLatestMessageId);
          handleReadAllMessages();
          setRecentChatNotificationCount(0);
        }
      } else {
        const chatRecordData = queryClient.getQueryData<
          InfiniteData<{ data: ChatRecordType[] }>
        >(["chats", params.id]);
        if (
          chatRecordData &&
          !(
            chatRecordData.pageParams[0] !== 0 &&
            chatRecordData.pages[0].data.length > 0
          ) &&
          chatViewRef &&
          chatViewRef.scrollTop > -10
        ) {
          setRecentChatNotificationCount(0);

          setClientLatestMessageId(0);
          clientNotificationCnt.current = 0;
        }
      }
    };

    const loadInitialData = async () => {
      //load the data initially

      if (
        currentChatRoom?.notificationCount !== undefined &&
        flatChatRecords &&
        chatViewRef &&
        !chatRoom.isFetching &&
        isInitialLoading.current &&
        chatMessagesLoaded
      ) {
        isInitialLoading.current = false;

        if (
          currentChatRoom?.latestMessageId !== undefined &&
          currentChatRoom.notificationCount > 0
        ) {
          console.log(
            "navigating to chat ",
            currentChatRoom.latestMessageId,
            currentChatRoom.notificationCount
          );
          console.log("latest message id=" + currentChatRoom.latestMessageId);
          const currentId = currentChatRoom.latestMessageId;
          setTimeout(() => {
            setShouldClearClientLatestMessageId(currentId);
          }, 5000);

          handleNavigateToChatRecord(currentChatRoom.latestMessageId);

          handleReadAllMessages();

          setRecentChatNotificationCount(0);

          setClientLatestMessageId(currentChatRoom.latestMessageId);

          // setRecentChatNotificationCount(currentChatRoom.notificationCount);
        }
      }
    };

    loadInitialData();

    document.addEventListener("visibilitychange", handleTabRefocus);

    return () => {
      document.removeEventListener("visibilitychange", handleTabRefocus);
    };
  }, [
    currentChatRoom,
    flatChatRecords,
    chatViewRef,
    handleReadAllMessages,
    chatRoom.isFetching,
    chatMessagesLoaded,
  ]);

  const typingLocalTimerRef = useRef<Map<number, NodeJS.Timeout>>(new Map());
  const [typingUsers, setTypingUsers] = useState<Set<number>>(new Set());

  const handleShowFileDropSplash = useCallback(() => {
    ModalUtils.openFileDropModal(
      modalContext,
      `Upload to ${
        currentChatRoom && currentUser
          ? GenericUtil.computeChatRoomName(currentChatRoom, currentUser)
          : " this chatroom"
      }`,
      "You can add comments before uploading.",
      (files: FileList): string => {
        if (!files) {
          return "";
        }
        if (files && files.length === 0) {
          modalContext?.setGenericHeader("What?!");
          modalContext?.setGenericContent("This is not a file!");
          return "error";
        }

        if (setAttachments) {
          const filesArray: { file: File; spoiler: boolean }[] = [];
          if (files) {
            for (const file of files) {
              filesArray.push({
                file,
                spoiler: false,
              });
            }
          }
          const updatedAttachments = attachments
            ? [...attachments, ...filesArray]
            : [...filesArray];
          if (updatedAttachments.length > 10) {
            modalContext?.setGenericHeader("Too heavy..");
            modalContext?.setGenericContent(
              "You cannot attach more than 10 files! Delete some!"
            );

            return "error";
          }
          setAttachments(updatedAttachments);
          if (fileUploaderRef.current) {
            fileUploaderRef.current.value = "";
          }
        }
        return "success";
      }
    );
  }, [
    currentChatRoom,
    currentUser,
    setAttachments,
    attachments,
    clientLatestMessageId,
  ]);

  const [searchBarOpen, setSearchBarOpen] = useState(false);
  const [searchResultsPending, setSearchResultsPending] = useState(false);
  const [searchResults, setSearchResults] = useState<ChatRecordType[]>([]);
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);
  const [searchParams, setSearchParams] = useState<{
    query: { content: string; tags: string[] };
    searchOrder: "NEW" | "OLD";
  } | null>(null);
  const [
    shouldDisplayMessageLoadingIndicator,
    setShouldDisplayMessageLoadingIndicator,
  ] = useState(false);
  const [callOverlayOpenMode, setCallOverlayOpenMode] = useState("");
  const [callOverlayPlayExitAnimation, setCallOverlayPlayExitAnimation] =
    useState(false);

  const messageIndicatorTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (chatRecords.isFetchingNextPage || chatRecords.isFetchingPreviousPage) {
      if (messageIndicatorTimerRef.current) {
        clearTimeout(messageIndicatorTimerRef.current);
      }
      messageIndicatorTimerRef.current = setTimeout(() => {
        setShouldDisplayMessageLoadingIndicator(true);
      }, 1000);
    } else {
      if (messageIndicatorTimerRef.current) {
        clearTimeout(messageIndicatorTimerRef.current);
      }
      setShouldDisplayMessageLoadingIndicator(false);
    }
  }, [chatRecords.isFetchingNextPage, chatRecords.isFetchingPreviousPage]);

  useLayoutEffect(() => {
    if (shouldScrollDownToBottom.current && chatViewRef) {
      shouldScrollDownToBottom.current = false;
      chatViewRef.scrollTop = 0;

      // console.log("scroll down to bottom invoked:", chatRecords.data);
    }
  }, [flatChatRecords, chatViewRef]);

  const isCallOngoing = useMemo(() => {
    return currentChatRoom?.callInstance && callOverlayOpenMode.length > 0;
  }, [currentChatRoom?.callInstance, callOverlayOpenMode]);

  const callContext = useContext(CallContext);

  const joinCallMutation = useMutation({
    mutationFn: () => {
      return api.post(`/call/join/${params.id}`, {
        iceCandidates: callContext?.localIceCandidates!.current,
      });
    },
    onSettled(data) {
      if (!data) return;

      if (data.status === 200) {
        //add to the active participants in call instance

        queryClient.setQueryData(
          ["chatroom_dm", params.id],
          (prev: { data: ChatRoom }) => {
            if (!prev || !prev.data.callInstance) return prev;

            return {
              data: {
                ...prev.data,
                callInstance: {
                  ...prev.data.callInstance,
                  activeParticipants: [
                    ...prev.data.callInstance.activeParticipants,
                    currentUser,
                  ],
                  pendingParticipants:
                    prev.data.callInstance.pendingParticipants.filter(
                      (user) => user.id !== (currentUser?.id ?? -1)
                    ),
                },
              },
            };
          }
        );

        queryClient.setQueryData(
          ["chatroom_dm"],
          (prev: { data: ChatRoom[] }) => {
            if (!prev) return undefined;
            return {
              data: prev.data.map((room) => {
                if (room.id === currentChatRoom?.id) {
                  return {
                    ...room,
                    callInstance: {
                      id: -1,
                      activeParticipants: [],
                      pendingParticipants: [],
                    },
                  };
                }
                return room;
              }),
            };
          }
        );

        if (callContext) {
          callContext.setCurrentCallingChatroom(currentChatRoom);
        }

        //subscribe to other existing streams , if any
        if (callContext?.handleSubscribeStream && currentChatRoom) {
          callContext.handleSubscribeStream(
            currentChatRoom,
            new Date().getTime()
          );
        }

        SoundUtil.stopSound(
          Constants.SERVER_STATIC_CONTENT_PATH + "calling_theme.mp3"
        );

        if (userSettings.data?.data) {
          const entranceSound = userSettings.data.data.entranceSound;

          if (entranceSound === "default") {
            SoundUtil.playSoundForce(
              Constants.SERVER_STATIC_CONTENT_PATH + "enter_sound.mp3"
            );
          } else {
            const url =
              Constants.SERVER_STATIC_CONTENT_PATH +
              entranceSound.split("@")[1];
            GenericUtil.isStaticContentAvailable(url).then((available) => {
              if (available) {
                SoundUtil.playSoundForce(
                  Constants.SERVER_STATIC_CONTENT_PATH +
                    entranceSound.split("@")[1]
                );
              } else {
                SoundUtil.playSoundForce(
                  Constants.SERVER_STATIC_CONTENT_PATH + "enter_sound.mp3"
                );
              }
            });
          }
        } else {
          SoundUtil.playSoundForce(
            Constants.SERVER_STATIC_CONTENT_PATH + "enter_sound.mp3"
          );
        }
      } else {
        ModalUtils.handleGenericError(modalContext, data);
      }

      if (callContext?.callWorkPending) {
        callContext.callWorkPending.current = false;
      }
    },
  });

  const handleEndCall = useCallback(async () => {
    if (callContext && callContext.currentCallingChatRoom && currentUser) {
      try {
        await callContext?.handleEndCall(
          callContext.currentCallingChatRoom,
          currentUser
        );

        return true;
      } catch (err) {
        console.error(err);
        ModalUtils.openGenericModal(
          modalContext,
          "Oof",
          (err as Error).message,
          undefined,
          undefined,
          undefined,
          undefined,
          true
        );
        return false;
      }
    }

    return false;
  }, [chatRoom, currentUser, callContext]);

  const handleStartCall = useCallback(
    async (withVideo?: boolean) => {
      //can't start call in  a solo chatroom
      if (currentChatRoom && currentChatRoom.participants.length <= 1) {
        ModalUtils.openGenericModal(
          modalContext,
          "Uh oh.",
          "You cannot start a call in a chatroom with only 1 user!",
          () => {},
          undefined,
          [
            <PrimaryButton key={0}>
              <div className="text-center flex items-center gap-2 cursor-pointer w-full justify-center transition text-white">
                Take me back.
                <IoReturnUpForward />
              </div>
            </PrimaryButton>,
          ],
          undefined,
          false
        );
        return;
      }
      //only if there is no ongoing call, you can start the call
      if (!isCallOngoing) {
        setCallOverlayOpenMode("startCall" + (withVideo ? "withVideo" : ""));
      } else {
        //if not join the call
        const currentUser = queryClient.getQueryData<{ data: User }>(["user"]);
        if (
          !currentUser ||
          joinCallMutation.isPending ||
          callContext?.callWorkPending.current ||
          !callContext?.handlePrepareStartOrJoinCall ||
          !currentChatRoom?.id ||
          !callContext?.handleSubscribeStream
        ) {
          return;
        }
        callContext.callWorkPending.current = true;

        if (callContext.currentCallingChatRoom !== undefined) {
          //if there is already an ongoing call, leave the call first

          if (!(await handleEndCall())) {
            callContext.callWorkPending.current = false;
            return;
          }
        }

        //first, handle video options

        if (currentUser.data.isScreenShareEnabled !== "no") {
          if (
            !(await callContext.handleEnableScreenShare(
              "no",
              currentChatRoom.id
            ))
          ) {
            callContext.callWorkPending.current = false;
            return;
          }
        }

        if (
          !(await callContext.handleEnableVideo(
            withVideo === true,
            currentChatRoom.id,
            true
          ))
        ) {
          callContext.callWorkPending.current = false;

          return;
        }

        try {
          if (
            !(await callContext.handlePrepareStartOrJoinCall(
              currentChatRoom.id,
              false
            ))
          ) {
            ModalUtils.openGenericModal(
              modalContext,
              "Uh oh.",
              "Could not join the call; Please try again!",
              () => {},
              undefined,
              [
                <PrimaryButton key={0}>
                  <div className="text-center flex items-center gap-2 cursor-pointer w-full justify-center transition text-white">
                    Take me back.
                    <IoReturnUpForward />
                  </div>
                </PrimaryButton>,
              ],
              undefined,
              false
            );
            callContext.callWorkPending.current = false;
            return;
          }
          joinCallMutation.mutate();
        } catch (err) {
          console.error(err);
          ModalUtils.openGenericModal(
            modalContext,
            "Uh oh.",
            (err as Error).message,
            () => {},
            undefined,
            [
              <PrimaryButton key={0}>
                <div className="text-center flex items-center gap-2 cursor-pointer w-full justify-center transition text-white">
                  Take me back.
                  <IoReturnUpForward />
                </div>
              </PrimaryButton>,
            ],
            undefined,
            false
          );

          callContext.callWorkPending.current = false;
        }
      }
    },
    [currentChatRoom, callOverlayOpenMode, joinCallMutation, isCallOngoing]
  );

  useEffect(() => {
    //whenever the chatroom has a new call instance (or its participants are updated), if already not open, open the call overlay in preview or
    //in-call mode depending on whether the user is participating in the call.

    if (currentUser?.id) {
      if (
        callOverlayOpenMode.length === 0 &&
        currentChatRoom?.callInstance &&
        currentChatRoom.callInstance.activeParticipants.length > 0
      ) {
        if (
          currentChatRoom.callInstance.activeParticipants.find(
            (user) => user.id === currentUser.id
          )
        ) {
          setCallOverlayOpenMode("inCall");
        } else {
          setCallOverlayOpenMode("previewCall");
        }
      } else if (
        callOverlayOpenMode === "previewCall" &&
        currentChatRoom?.callInstance &&
        currentChatRoom.callInstance.activeParticipants.length > 0 &&
        currentChatRoom.callInstance.activeParticipants.find(
          (user) => user.id === currentUser.id
        )
      ) {
        setCallOverlayOpenMode("inCall");
      }
    }
  }, [callOverlayOpenMode, currentChatRoom?.callInstance, currentUser?.id]);

  const isLightMode = useIsLightMode();

  const roleSettings = useQuery({
    queryKey: ["role_settings", params.id],
    queryFn: async () => {
      const response = await api.get<ChatRoomRoleSettings>(
        `/chatrooms/roleSettings/${params.id}`
      );

      return {
        data: response.data,
      };
    },
    refetchOnMount: true,
  });

  const blockeds = useQuery({
    queryKey: ["blockeds"],
    queryFn: async () => {
      const response = await api.get<User[]>("/users/blockeds");
      return {
        data: response.data,
      };
    },
    refetchOnMount: false,
  });

  const invitationCode = useQuery({
    queryKey: ["chatroom_invitation", "temporary"],
    queryFn: async () => {
      const response = await api.get<string>(
        `/chatrooms/invitation/${params.id}`,
        {
          params: {
            permanent: false,
          },
        }
      );
      if (response.status !== 200) {
        return {
          data: "",
        };
      }
      return {
        data: response.data,
      };
    },
    refetchOnMount: true,
  });

  const invitationCodePermanent = useQuery({
    queryKey: ["chatroom_invitation", "permanent"],
    queryFn: async () => {
      const response = await api.get<string>(
        `/chatrooms/invitation/${params.id}`,
        {
          params: {
            permanent: true,
          },
        }
      );
      if (response.status !== 200) {
        return {
          data: "",
        };
      }
      return {
        data: response.data,
      };
    },
    refetchOnMount: true,
  });

  const shouldShowInvitationLink = useMemo(() => {
    if (!currentUser || !roleSettings || !currentChatRoom) return false;

    if (currentChatRoom.direct1to1Identifier?.length) {
      return false;
    }

    return GenericUtil.checkRoomPermission(
      currentChatRoom,
      currentUser.id,
      undefined,
      roleSettings.data?.data.roleAllowPublicInvite
    );
  }, [roleSettings.data?.data, currentChatRoom, currentUser?.id]);

  const shouldShowManageMembers = useMemo(() => {
    if (!currentUser || !currentChatRoom || !roleSettings.data?.data) {
      return false;
    }
    if (currentChatRoom?.direct1to1Identifier?.length) {
      return false;
    }

    const hasInvitePermission = GenericUtil.checkRoomPermission(
      currentChatRoom,
      currentUser.id,
      undefined,
      roleSettings.data.data.roleAllowFriendsInvite
    );

    const hasKickPermissionTargetUnspecified = GenericUtil.checkRoomPermission(
      currentChatRoom,
      currentUser.id,
      undefined,
      roleSettings.data.data.roleAllowKickUser
    );

    return hasInvitePermission || hasKickPermissionTargetUnspecified;
  }, [roleSettings.data?.data, currentChatRoom, currentUser]);

  const otherUserId = useMemo(() => {
    if (!currentChatRoom?.direct1to1Identifier?.length || !currentUser?.id) {
      return -1;
    } else {
      return (
        currentChatRoom.direct1to1Identifier
          .split("@")
          .map((e) => parseInt(e))
          .find((e) => e !== currentUser.id) ?? -1
      );
    }
  }, [currentChatRoom?.direct1to1Identifier, currentUser?.id]);

  const unfriendMutation = useMutation({
    mutationFn: (username: string) => {
      return api.delete(`/users/friends/${username}`, {
        validateStatus: (status) => status === 200,
      });
    },
    onSettled(data, _error, variables) {
      if (data?.status === 200) {
        queryClient.setQueryData(["friends"], (prev: { data: User[] }) => {
          return {
            data: prev.data.filter(
              (friend) => "user@" + friend.id !== variables
            ),
          };
        });

        contentDisplayContext?.setShouldBatchResetChatsQuery(
          (prev) => prev + 1
        );
      } else if (data) {
        ModalUtils.handleGenericError(modalContext, data);
      }
    },
  });

  const sendFriendRequestMutation = useMutation({
    mutationFn: (username: string) => {
      return api.post(`/users/friends/${username}`, undefined, {
        validateStatus: (status) => status === 200,
      });
    },

    onSettled(data) {
      // console.log("settledd", error, data)
      if (data?.status === 200) {
        ModalUtils.openGenericModal(
          modalContext,
          "FRIEND REQUEST SUCCESS",
          "Friend request has been sent to the user."
        );

        queryClient.setQueryData(
          ["friends", "pending", "outgoing"],
          (prev: { data: User[] }) => {
            if (!prev) return prev;
            return {
              data: [...prev.data, data.data],
            };
          }
        );
      } else if (data?.status === 400) {
        const response = data.data;

        if (response === "User not found") {
          ModalUtils.openGenericModal(
            modalContext,
            "FRIEND REQUEST ERROR",
            "User not found"
          );
        } else if (response === "Friend request already pending") {
          ModalUtils.openGenericModal(
            modalContext,
            "FRIEND REQUEST ERROR",
            "Friend request already pending"
          );
        } else {
          ModalUtils.openGenericModal(
            modalContext,
            "FRIEND REQUEST ERROR",
            data.data
          );
        }
      }
    },
  });

  const handleSendFriendRequest = useCallback(
    (username: string) => {
      if (sendFriendRequestMutation.isPending) return;

      const usernameRegex = new RegExp("^[\\p{L}\\p{N}_.#]+$", "u");

      if (!username) return;

      if (
        username.length > 100 ||
        !(username.includes("#") && usernameRegex.test(username))
      ) {
        ModalUtils.openGenericModal(
          modalContext,
          "FRIEND REQUEST ERROR",
          "Invalid username"
        );
        return;
      }

      sendFriendRequestMutation.mutate(username.replace("#", "@"));
    },
    [sendFriendRequestMutation]
  );

  const handleUnfriend = useCallback(
    (username: string) => {
      if (unfriendMutation.isPending) return;

      unfriendMutation.mutate(username);
    },
    [unfriendMutation]
  );

  const blockMutation = useMutation({
    mutationFn: (username: string) => {
      return api.post(`/users/block/${username}`);
    },
    onSettled(data, _error, variables) {
      if (!data) return;

      if (data.status === 200) {
        const userId = variables.substring(variables.indexOf("@") + 1);
        if (!isNaN(Number(userId))) {
          callContext?.handleSetEnableAudioStream(Number(userId), false, false);
          callContext?.handleSetEnableAudioStream(Number(userId), false, true);
          callContext?.handleSetEnableVideoStream(Number(userId), false, false);
          callContext?.handleSetEnableVideoStream(Number(userId), false, true);
        }
        ModalUtils.openGenericModal(
          modalContext,
          "BLOCK USER",
          `User has been blocked.`
        );

        queryClient.setQueryData(["blockeds"], (prev: { data: User[] }) => {
          if (!prev) return undefined;
          return {
            data: [...prev.data, data.data],
          };
        });

        queryClient.setQueryData(
          ["chats", params.id],
          (prev: InfiniteData<{ data: ChatRecordType[] }>) => {
            if (!prev) return undefined;

            const all: ChatRecordType[] = [];
            let deletionOcurred = false;
            for (const page of prev.pages) {
              for (const record_ of page.data) {
                if (record_.sender) {
                  if (record_.sender.id !== data.data.id) {
                    all.push(record_);
                  } else {
                    deletionOcurred = true;
                  }
                } else {
                  all.push(record_);
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
      } else if (data) {
        ModalUtils.handleGenericError(modalContext, data);
      }
    },
  });

  const handleBlockUser = useCallback(
    (username: string) => {
      if (!blockMutation.isPending) {
        ModalUtils.openYesorNoModal(
          modalContext,
          "BLOCK USER",
          `Are you sure to block this user? You won't be able to view each other's chat nor call 1-to-1,
          and during group calls you and the user will be mutually muted for both audio and video.`,
          () => {
            if (!blockMutation.isPending) blockMutation.mutate(username);
          }
        );
      }
    },
    [blockMutation]
  );

  const unblockMutation = useMutation({
    mutationFn: (username: string) => {
      return api.delete(`/users/block/${username}`, {
        validateStatus: (status) => status === 200,
      });
    },
    onSettled(data, _error, variables) {
      if (data?.status === 200) {
        ModalUtils.openGenericModal(
          modalContext,
          "UNBLOCK USER",
          `User has been unblocked. If you were in a call with this user, consider rejoining the call
          to hear the user again.`
        );
        queryClient.setQueryData(["blockeds"], (prev: { data: User[] }) => {
          if (!prev) return undefined;
          return {
            data: prev.data.filter(
              (blocked) => "user@" + blocked.id !== variables
            ),
          };
        });

        contentDisplayContext?.setShouldBatchResetChatsQuery(
          (prev) => prev + 1
        );

        const userId = variables.substring(variables.indexOf("@") + 1);
        if (!isNaN(Number(userId))) {
          callContext?.handleSetEnableAudioStream(Number(userId), true, false);
          callContext?.handleSetEnableAudioStream(Number(userId), true, true);
          callContext?.handleSetEnableVideoStream(Number(userId), true, false);
          callContext?.handleSetEnableVideoStream(Number(userId), true, true);
        }
      } else if (data) {
        ModalUtils.handleGenericError(modalContext, data);
      }
    },
  });

  const handleUnblockUser = useCallback(
    (username: string) => {
      if (!unblockMutation.isPending) {
        ModalUtils.openYesorNoModal(
          modalContext,
          "UNBLOCK USER",
          `Are you sure to unblock this user?`,
          () => {
            if (!unblockMutation.isPending) unblockMutation.mutate(username);
          }
        );
      }
    },
    [unblockMutation]
  );

  const [waveButtonDisabled, setWaveButtonDisabled] = useState(false);
  const [openDMStartUsercard, setOpenDMStartUsercard] = useState(false);

  return (
    <>
      {!chatRoom.isLoading &&
        chatMessagesLoaded &&
        currentChatRoom &&
        currentChatRoom.participants &&
        currentUser && (
          <div className="flex flex-row w-full h-full animate-fadeIn">
            {shouldDisplayMessageLoadingIndicator && (
              <div
                className="fixed z-[60] top-[20vh] left-[50%] translate-x-[-50%] flex justify-center text-lime-400 p-2
            rounded-md shadow-md bg-lime-600 items-center gap-2"
              >
                Loading more messages...{" "}
                <ClipLoader
                  color={isLightMode ? "rgb(132,204,22)" : "rgb(163,230,53)"}
                  size={20}
                />
              </div>
            )}

            <input
              type="file"
              multiple
              className="hidden"
              ref={fileUploaderRef}
              onChange={(e) => handleOnFileUpload(e.target.files)}
            />
            <div className="w-full flex-shrink-[100] flex flex-col h-full">
              <Header>
                {/*search bar*/}

                <ChatSearchUI
                  setSearchParams={setSearchParams}
                  searchBarOpen={searchBarOpen}
                  setSearchBarOpen={setSearchBarOpen}
                  currentChatRoom={currentChatRoom}
                  currentUser={currentUser}
                  setSearchResults={setSearchResults}
                  setSearchResultsPending={setSearchResultsPending}
                  setSearchOverlayOpen={setSearchOverlayOpen}
                />

                <div className="flex w-full sm:gap-2 text-lime-600 mr-auto ml-1 items-center flex-wrap">
                  <RoomAvatar
                    chatroom={currentChatRoom}
                    currentUser={currentUser}
                    isSpamRoom={params.id === "-1"}
                    size={24}
                  />

                  <div className="md:ml-2 ml-1 text-ellipsis whitespace-nowrap">
                    {chatRoomName}
                  </div>

                  <div
                    className={`ml-2 flex gap-2 rounded-md px-2 text-xs ${
                      params.id === "-1" ? "bg-red-500" : "bg-lime-600"
                    } text-white`}
                  >
                    {params.id !== "-1" && currentChatRoom.direct1to1Identifier
                      ? "DM"
                      : params.id !== "-1"
                      ? "Group"
                      : ""}

                    {params.id === "-1" && "Spam"}
                  </div>

                  {currentChatRoom.isPublic && (
                    <div
                      className={`ml-2 flex gap-2 rounded-md px-2 text-xs bg-lime-700 text-white`}
                    >
                      Public
                    </div>
                  )}

                  {params.id !== "-1" && (
                    <>
                      <div className="">
                        {currentChatRoom.direct1to1Identifier?.length &&
                          !friends.data?.data.find(
                            (e) =>
                              currentChatRoom.direct1to1Identifier?.length &&
                              e.id ===
                                currentChatRoom.direct1to1Identifier
                                  .split("@")
                                  .map((e) => parseInt(e))
                                  .find((e) => e !== currentUser.id)
                          ) && (
                            <FloatingButton
                              direction="down"
                              description="This user is not your friend."
                              backgroundColor="bg-transparent"
                              customPosition="ml-0"
                              customTextColor="text-orange-500"
                            >
                              <MdWarning size={GenericUtil.remToPx(2)} />
                            </FloatingButton>
                          )}
                      </div>

                      <div className="flex ml-auto flex-wrap">
                        <div className="ml-auto">
                          <FloatingButton
                            disabled={
                              callContext?.currentCallingChatRoom?.id.toString() ===
                              params.id
                            }
                            onClick={() => {
                              handleStartCall();
                            }}
                            description="Start Voice Call"
                            backgroundColor="bg-transparent"
                            direction="down"
                          >
                            <IoCall size={24} />
                          </FloatingButton>
                        </div>

                        <div className="mr-1 sm:mr-2">
                          <FloatingButton
                            disabled={
                              callContext?.currentCallingChatRoom?.id.toString() ===
                              params.id
                            }
                            onClick={() => {
                              handleStartCall(true);
                            }}
                            description="Start Video Call"
                            backgroundColor="bg-transparent"
                            direction="down"
                          >
                            <IoMdVideocam size={24} />
                          </FloatingButton>
                        </div>

                        <div className="mr-1 sm:mr-2">
                          <FloatingButton
                            onClick={() => {
                              setShowMemberList((prev) => !prev);
                            }}
                            description={`${
                              showMemberList
                                ? "Hide Member List"
                                : "Show Member List"
                            }`}
                            backgroundColor="bg-transparent"
                            direction="down"
                          >
                            <IoMdPeople size={24} />
                          </FloatingButton>
                        </div>

                        <div>
                          <Popover
                            containerStyle={{
                              zIndex: "75",
                            }}
                            isOpen={showInviteFriendsInterface}
                            positions={["bottom", "left", "right", "top"]}
                            content={
                              chatRoom.data?.data ? (
                                <SelectFriendsInterface
                                  setShowInterface={
                                    setShowInviteFriendsInterface
                                  }
                                  currentChatRoom={chatRoom.data.data}
                                  roleSettings={roleSettings.data?.data}
                                  invitationCode={invitationCode.data?.data}
                                  invitationCodePermanent={
                                    invitationCodePermanent.data?.data
                                  }
                                  shouldShowInvitationLink={
                                    shouldShowInvitationLink
                                  }
                                  shouldShowManageMembers={
                                    shouldShowManageMembers
                                  }
                                />
                              ) : (
                                <></>
                              )
                            }
                          >
                            <div
                              className={`mr-1 sm:mr-2 ${
                                shouldShowManageMembers ||
                                shouldShowInvitationLink
                                  ? "block"
                                  : "hidden"
                              }`}
                            >
                              <div className="hidden sm:block">
                                <FloatingButton
                                  onClick={() => {
                                    if (!showInviteFriendsInterface)
                                      setShowInviteFriendsInterface(true);
                                  }}
                                  description="Manage Chatroom"
                                  backgroundColor="bg-transparent"
                                  direction="down"
                                >
                                  <MdGroupAdd size={24} />
                                </FloatingButton>
                              </div>
                            </div>
                          </Popover>
                        </div>

                        <Popover
                          isOpen={showPinnedMessages}
                          positions={["bottom"]}
                          onClickOutside={() => setShowPinnedMessages(false)}
                          content={
                            <PinnedMessages
                              currentChatRoom={currentChatRoom}
                              currentUser={currentUser}
                              handleNavigateToChatRecord={
                                handleNavigateToChatRecord
                              }
                              getText={getText}
                            />
                          }
                          containerStyle={{
                            zIndex: "5",
                          }}
                        >
                          <div className="mr-1 sm:mr-2">
                            <FloatingButton
                              onClick={() => {
                                setShowPinnedMessages(!showPinnedMessages);
                              }}
                              description="Pinned"
                              backgroundColor="bg-transparent"
                              direction="down"
                            >
                              <RiPushpinFill size={24} />
                            </FloatingButton>
                          </div>
                        </Popover>

                        {currentChatRoom.ownerId === currentUser.id &&
                          !currentChatRoom.direct1to1Identifier?.length && (
                            <Popover
                              isOpen={showOwnerSettings}
                              positions={["bottom", "left", "top", "right"]}
                              onClickOutside={() => setShowOwnerSettings(false)}
                              content={
                                <OwnerSettingsUI
                                  currentChatRoomId={currentChatRoom.id}
                                  isCurrentChatRoomPublic={
                                    currentChatRoom.isPublic
                                  }
                                />
                              }
                              containerStyle={{
                                zIndex: "5",
                              }}
                            >
                              <div className="mr-1 sm:mr-2">
                                <FloatingButton
                                  onClick={() => {
                                    setShowOwnerSettings((prev) => !prev);
                                  }}
                                  description="Owner Settings"
                                  backgroundColor="bg-transparent"
                                  direction="down"
                                >
                                  <FaGear size={24} />
                                </FloatingButton>
                              </div>
                            </Popover>
                          )}
                      </div>
                    </>
                  )}

                  <div
                    className={`mr-1 sm:mr-2 ${
                      params.id === "-1" && "ml-auto"
                    }`}
                    id="searchBarOpener"
                  >
                    <FloatingButton
                      onClick={() => {
                        setSearchBarOpen(!searchBarOpen);
                      }}
                      description="Search"
                      backgroundColor="bg-transparent"
                      direction="down"
                    >
                      <div id="searchBarOpener">
                        <FaSearch size={20} />
                      </div>
                    </FloatingButton>
                  </div>
                </div>
              </Header>
              {searchOverlayOpen && searchParams && (
                <SearchResultsOverlay
                  setSearchResults={setSearchResults}
                  setSearchResultsPending={setSearchResultsPending}
                  setSearchParams={setSearchParams}
                  currentSearchParams={searchParams}
                  emojiSearchViewWidth={emojiSearchViewWidth}
                  currentChatRoom={currentChatRoom}
                  currentUser={currentUser}
                  getText={getText}
                  searchResults={searchResults}
                  searchResultsPending={searchResultsPending}
                  handleNavigateToChatRecord={handleNavigateToChatRecord}
                  setSearchOverlayOpen={setSearchOverlayOpen}
                />
              )}

              {callOverlayOpenMode.length > 0 && (
                <CallOverlay
                  handleStartCall={handleStartCall}
                  playExitAnimation={callOverlayPlayExitAnimation}
                  setPlayExitAnimation={setCallOverlayPlayExitAnimation}
                  currentUser={currentUser}
                  chatroom={currentChatRoom}
                  callOverlayOpenMode={callOverlayOpenMode}
                  setCallOverlayOpenMode={setCallOverlayOpenMode}
                  chatViewWidth={chatViewWidth}
                  setCallOverlayPlayExitAnimation={
                    setCallOverlayPlayExitAnimation
                  }
                />
              )}

              <div
                id="chatView"
                className="flex overflow-scroll flex-col-reverse relative max-h-[100%}"
                ref={setChatViewRef}
                onDragEnter={(e) => {
                  if (e.dataTransfer.items.length > 0)
                    handleShowFileDropSplash();
                }}
                style={{
                  height: `calc(${chatViewHeight}px - ${chatHeightOffset}px + 3rem - 1rem)`,
                }}
              >
                {pendingMessages.map((e, i) => {
                  return (
                    <div key={"pending_" + e.id}>
                      <ChatRecord
                        chatViewRef={chatViewRef ?? undefined}
                        setReplyTarget={setReplyTarget}
                        editModeId={editModeChatRecordId}
                        setEditModeId={setEditModeChatRecordId}
                        currentChatRoom={currentChatRoom}
                        currentUser={currentUser}
                        emojiSearchViewWidth={emojiSearchViewWidth}
                        record={e}
                        dividerText={pendingChatRenderData[i][0]}
                        showDetails={!pendingChatRenderData[i][1]}
                      />
                    </div>
                  );
                })}

                {flatChatRecords.map((record, i) => {
                  return (
                    <div
                      className="transition duration-500"
                      ref={chatRenderData[i][0]}
                      id={"id_" + record.id}
                      key={"msg_" + record.id}
                    >
                      <ChatRecord
                        chatViewRef={chatViewRef ?? undefined}
                        setShowPinnedMessages={setShowPinnedMessages}
                        handleNavigateToChatRecord={handleNavigateToChatRecord}
                        setReplyTarget={setReplyTarget}
                        editModeId={editModeChatRecordId}
                        setEditModeId={setEditModeChatRecordId}
                        currentChatRoom={currentChatRoom}
                        currentUser={currentUser}
                        emojiSearchViewWidth={emojiSearchViewWidth}
                        record={{
                          ...record,
                          sender:
                            record.sender?.id === currentUser.id
                              ? currentUser
                              : record.sender,
                        }}
                        dividerText={chatRenderData[i][1]}
                        showDetails={!chatRenderData[i][2]}
                      />
                    </div>
                  );
                })}

                {(!currentChatRoom.direct1to1Identifier?.length ||
                  currentChatRoom.id === -1) &&
                !chatRecords.hasNextPage ? (
                  <div className="flex flex-col gap-2 p-2">
                    <div
                      className={
                        currentChatRoom.id === -1 ? "text-red-500" : ""
                      }
                    >
                      <RoomAvatar
                        isSpamRoom={currentChatRoom.id === -1}
                        chatroom={currentChatRoom}
                        size={72}
                        currentUser={currentUser}
                      />
                    </div>
                    <p className="text-3xl text-white font-bold">
                      {currentChatRoom.name}
                    </p>
                    <p className="text-white">
                      {currentChatRoom.id > 0 ? (
                        <>
                          Welcome to the beginning of the{" "}
                          <b>{currentChatRoom.name}</b> group.
                        </>
                      ) : (
                        <>
                          This is your <b>Spam</b> inbox.
                        </>
                      )}
                    </p>
                    {flatChatRecords.length === 0 && currentChatRoom.id > 0 && (
                      <PrimaryButton
                        customWidth="w-fit"
                        customStyles="mt-0 bg-lime-700 px-2"
                        disabled={waveButtonDisabled}
                        onclick={() => {
                          //3s cooldown
                          setWaveButtonDisabled(true);
                          handleSendMessage(undefined, ":wave:");
                          setTimeout(() => {
                            setWaveButtonDisabled(false);
                          }, 3000);
                        }}
                      >
                        <div className="flex items-center justify-center gap-2 text-lime-400 whitespace-nowrap">
                          <GiHand />
                          Wave Hi
                        </div>
                      </PrimaryButton>
                    )}
                  </div>
                ) : !chatRecords.hasNextPage ? (
                  <div className="flex flex-col gap-2 p-2">
                    <RoomAvatar
                      chatroom={currentChatRoom}
                      size={72}
                      currentUser={currentUser}
                    />
                    <Popover
                      containerStyle={{
                        zIndex: "50",
                      }}
                      isOpen={openDMStartUsercard}
                      reposition={true}
                      positions={["top", "bottom"]}
                      content={
                        currentChatRoom.participants.find(
                          (e) => e.id !== currentUser.id
                        ) ? (
                          <div className="animate-popOut mb-[1rem] ml-[1rem]">
                            <Usercard
                              user={
                                currentChatRoom.participants.find(
                                  (e) => e.id !== currentUser.id
                                )!
                              }
                              chatRoomId={params.id}
                            />
                          </div>
                        ) : (
                          <></>
                        )
                      }
                      onClickOutside={() => {
                        setOpenDMStartUsercard(false);
                      }}
                    >
                      <p
                        onClick={() => setOpenDMStartUsercard(true)}
                        className="text-3xl w-fit text-white font-bold cursor-pointer hover:underline transition hover:text-lime-300"
                      >
                        {GenericUtil.computeChatRoomName(
                          currentChatRoom,
                          currentUser
                        )}
                      </p>
                    </Popover>
                    <p className="text-white">
                      This is the beginning of your direct message history with{" "}
                      <b>
                        {GenericUtil.computeChatRoomName(
                          currentChatRoom,
                          currentUser
                        ).substring(1)}
                        .
                      </b>
                    </p>
                    <div className="flex items-center gap-2 text-white">
                      {flatChatRecords.length === 0 && (
                        <PrimaryButton
                          customWidth="w-fit"
                          customStyles="mt-0 bg-lime-700 px-2"
                          disabled={waveButtonDisabled}
                          onclick={() => {
                            //3s cooldown
                            setWaveButtonDisabled(true);
                            handleSendMessage(undefined, ":wave:");
                            setTimeout(() => {
                              setWaveButtonDisabled(false);
                            }, 3000);
                          }}
                        >
                          <div className="flex items-center justify-center gap-2 text-lime-400 whitespace-nowrap">
                            <GiHand />
                            Wave Hi
                          </div>
                        </PrimaryButton>
                      )}

                      <PrimaryButton
                        customWidth="w-fit"
                        customStyles="mt-0 bg-lime-700 px-2"
                        onclick={() => {
                          if (
                            friends.data?.data.find((e) => e.id === otherUserId)
                          ) {
                            handleUnfriend("user@" + otherUserId);
                          } else {
                            handleSendFriendRequest("user#" + otherUserId);
                          }
                        }}
                      >
                        <p className="whitespace-nowrap md:hidden">
                          {friends.data?.data.find((e) => e.id === otherUserId)
                            ? "Unfriend"
                            : "Befriend"}
                        </p>
                        <p className="whitespace-nowrap hidden md:inline">
                          {friends.data?.data.find((e) => e.id === otherUserId)
                            ? "Remove Friend"
                            : "Add Friend"}
                        </p>
                      </PrimaryButton>

                      <PrimaryButton
                        customWidth="w-fit"
                        customStyles="mt-0 bg-lime-700 px-2"
                        onclick={() => {
                          if (
                            blockeds.data?.data.find(
                              (e) => e.id === otherUserId
                            )
                          ) {
                            handleUnblockUser("user@" + otherUserId);
                          } else {
                            handleBlockUser("user@" + otherUserId);
                          }
                        }}
                      >
                        {blockeds.data?.data.find((e) => {
                          return e.id === otherUserId;
                        })
                          ? "Unblock"
                          : "Block"}
                      </PrimaryButton>
                    </div>
                  </div>
                ) : (
                  <></>
                )}
              </div>

              <div className="mt-auto bg-transparent rounded-md p-2 h-[5rem] relative items-center">
                <div
                  className="flex flex-col absolute p-1 z-10 w-[96%] gap-1"
                  style={{
                    bottom: attachments?.length
                      ? `calc(1rem + ${chatInputAddonOffset}px)`
                      : "4rem",
                  }}
                >
                  {showChatNotificationBar && (
                    <div
                      onClick={() => {
                        if (clientLatestMessageId > 0)
                          handleNavigateToChatRecord(clientLatestMessageId);
                      }}
                      className="bg-red-500 bg-opacity-70 cursor-pointer transition hover:bg-opacity-70 text-white p-2 justify-center flex items-center gap-2 h-fit w-[96%] shadow-md rounded-md z-10"
                    >
                      <p className="">{`${recentChatNotificationCount} new message(s) @${format(
                        recentChatnotificationDate,
                        "MM/dd/yyyy h:mm bbb"
                      )}`}</p>
                      <p className="text-lime-300">Jump to present</p>
                      <BiDownArrowAlt size={24} />
                    </div>
                  )}

                  {chatRecords.data &&
                    chatRecords.data.pageParams[0] !== 0 &&
                    chatRecords.data.pages[0].data.length > 0 &&
                    !showChatNotificationBar && (
                      <div
                        onClick={handleJumpToPresent}
                        className="bg-lime-400 cursor-pointer transition hover:bg-opacity-70 text-white p-1 justify-center flex items-center gap-2 h-fit w-[96%] shadow-md rounded-md z-10"
                      >
                        <p className="text-lime-600 text-sm">
                          You are viewing older messages - Jump to present
                        </p>
                        <BiDownArrowAlt size={24} />
                      </div>
                    )}

                  {replyTarget && replyTarget.sender && (
                    <div className="bg-lime-400 bg-opacity-70 transition hover:bg-opacity-70 text-lime-700 p-1 justify-start flex items-center gap-2 h-fit w-[96%] shadow-md rounded-md z-10">
                      <p className="text-lime-700 ml-2">
                        Replying to{" "}
                        {replyTarget.sender.nickname.length > 0
                          ? replyTarget.sender.nickname
                          : replyTarget.sender.username}
                      </p>
                      <FaReply size={16} />
                      <div
                        className="ml-auto bg-lime-600 text-white p-1 cursor-pointer transition hover:bg-lime-700 rounded-full mr-2"
                        onClick={() => setReplyTarget(undefined)}
                      >
                        <FaX size={12} />
                      </div>
                    </div>
                  )}

                  {attachments?.length ? (
                    <div
                      ref={setAttachmentsRef}
                      className="bg-lime-400 mt-4 ml-2 transition inset-2 text-lime-700 p-1 justify-start w-[96%] flex items-center gap-2 h-fit shadow-md rounded-md z-10"
                    >
                      <div className="border-2 border-lime-700 w-full h-full flex flex-col border-dotted">
                        <div className="flex items-center">
                          <p className="text-lime-700 mx-2">
                            Attachments {attachments.length}/10
                          </p>
                          <GrAttachment size={16} />
                          <div
                            className="ml-auto bg-lime-600 text-white p-1 cursor-pointer transition hover:bg-lime-700 rounded-full mr-2"
                            onClick={() => {
                              if (fileUploaderRef.current) {
                                fileUploaderRef.current.value = "";
                                setAttachments(null);
                              }
                            }}
                          >
                            <FaX size={12} />
                          </div>
                        </div>

                        <div className="flex items-center cursor-default gap-2 overflow-x-scroll">
                          {attachments.map((attachment, i) => {
                            return (
                              <div key={i}>
                                <AttachmentBox
                                  file={attachment}
                                  fileId={i}
                                  setAttachments={setAttachments}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <></>
                  )}

                  {typingUsers.size > 0 && (
                    <TypingIndicator
                      isLightMode={isLightMode}
                      currentChatRoom={currentChatRoom}
                      typingUserIds={typingUsers}
                    />
                  )}
                </div>

                <ChatInput
                  setChatInputRef={setChatInputRef}
                  currentChatRoom={currentChatRoom}
                  currentUser={currentUser}
                  emojiSearchViewWidth={emojiSearchViewWidth}
                  handleSendMessage={handleSendMessage}
                  attachments={attachments}
                  fileUploaderRef={fileUploaderRef}
                  handleAttachAsTextFile={handleAttachAsTextFile}
                  handleOnFileUpload={handleOnFileUpload}
                  disabled={params.id === "-1"}
                  chatFontScale={chatFontScale}
                  underlineLinks={underlineLinks}
                  showSendButton={showSendButton}
                  convertEmoticon={convertEmoticon}
                  previewSyntax={previewSyntax}
                  customPlaceholderText={
                    "Message " +
                    GenericUtil.computeChatRoomName(
                      currentChatRoom,
                      currentUser
                    )
                  }
                />
              </div>
            </div>

            <div
              className={`${
                showMemberList
                  ? "max-w-[15rem] sm:max-w-[20rem] md:max-w-[25rem] lg:max-w-[35rem] p-4"
                  : "max-w-0"
              } fixed right-0 md:relative w-fit h-full transition-all duration-300 shadow-lg bg-lime-600 text-lime-400 overflow-y-scroll`}
              style={{}}
            >
              <div className="flex flex-nowrap items-center">
                <div className="md:hidden mr-2 flex">
                  <FloatingButton
                    backgroundColor="bg-red-500"
                    onClick={() => {
                      setShowMemberList(false);
                    }}
                    description={`Close`}
                    direction="down"
                  >
                    <FaX size={12} />
                  </FloatingButton>
                </div>
                <p className="whitespace-nowrap">
                  Members - {currentChatRoom.participants.length}
                </p>

                <div>
                  <Popover
                    containerStyle={{
                      zIndex: "75",
                    }}
                    isOpen={showInviteFriendsInterfaceSmallScreen}
                    positions={["bottom", "left", "right", "top"]}
                    content={
                      chatRoom.data?.data ? (
                        <div className="z-[100]">
                          <SelectFriendsInterface
                            setShowInterface={
                              setShowInviteFriendsInterfaceSmallScreen
                            }
                            currentChatRoom={chatRoom.data.data}
                            roleSettings={roleSettings.data?.data}
                            invitationCode={invitationCode.data?.data}
                            invitationCodePermanent={
                              invitationCodePermanent.data?.data
                            }
                            shouldShowInvitationLink={shouldShowInvitationLink}
                            shouldShowManageMembers={shouldShowManageMembers}
                          />
                        </div>
                      ) : (
                        <></>
                      )
                    }
                  >
                    <div
                      className={`ml-auto ${
                        shouldShowManageMembers || shouldShowInvitationLink
                          ? "block"
                          : "hidden"
                      }`}
                    >
                      <div className="sm:hidden">
                        <FloatingButton
                          onClick={() => {
                            setShowInviteFriendsInterfaceSmallScreen(
                              (prev) => !prev
                            );
                          }}
                          description="Manage Chatroom"
                          backgroundColor="bg-transparent"
                          direction="down"
                        >
                          <MdGroupAdd size={24} />
                        </FloatingButton>
                      </div>
                    </div>
                  </Popover>
                </div>
              </div>
              <div className="mt-2">
                {params.id !== "-1" &&
                  currentChatRoom.participants &&
                  currentChatRoom.participants["map"] &&
                  currentUser &&
                  currentChatRoom.participants.map((user) => {
                    if (user.id === currentUser.id) {
                      user = currentUser;
                    }
                    return (
                      <MemberListBar
                        key={user.id}
                        user={user}
                        currentChatRoom={currentChatRoom}
                        currentUser={currentUser}
                      />
                    );
                  })}
              </div>
            </div>
          </div>
        )}

      {!chatRoom.isLoading &&
        (!currentChatRoom ||
          (currentChatRoom as unknown as string) === "Chatroom not found") && (
          <div>
            <Header>
              <div className="flex w-full sm:gap-2 text-lime-600 mr-auto ml-2 items-center">
                <DefaultProfileIcon size={24} backgroundHexcode={"#84CC16"} />
                <div className="ml-1">Who is this?</div>
              </div>
            </Header>
            <div className="relative top-[30%] text-center text-white w-full text-2xl flex flex-col justify-center">
              <div className="text-lime-200 flex w-full justify-center">
                <FaFeather size={128} />
              </div>
              <p className="font-bold text-3xl mt-5">
                Peaceful, but where are we?
              </p>
              {/* <p className="font-bold text-2xl"></p> */}

              <PrimaryButton
                onclick={() => router.replace("/dashboard")}
                customStyles={"mt-5 w-full h-[5rem] bg-lime-600"}
              >
                Drift back home
              </PrimaryButton>
            </div>
          </div>
        )}

      {chatRoom.isLoading && (
        <div className="grid place-content-center h-full w-full">
          <div className="flex gap-4 items-center">
            <ClipLoader
              color={isLightMode ? "rgb(132,204,22)" : "rgb(163,230,53)"}
            />
          </div>
        </div>
      )}
    </>
  );
}
