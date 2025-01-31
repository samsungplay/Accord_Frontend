export type UserSettings = {
  spamFilterMode: "All" | "Friends" | "Others" | "Groups" | "None";
  nsfwDmFriends: "Show" | "Blur" | "Block";
  nsfwDmOthers: "Show" | "Blur" | "Block";
  nsfwGroups: "Show" | "Blur" | "Block";
  allowNonFriendsDM: boolean;
  allowFriendRequestEveryone: boolean;
  allowFriendRequestFof: boolean;
  allowFriendRequestGroup: boolean;
  entranceSound: string;
  canPreviewStream: boolean;
  notifyReaction: "all" | "dm" | "never";
  doNotification: boolean;
  messageRequests: boolean;
  mutedChatRoomIds: number[];
  displaySpoiler: "click" | "owned" | "always";
};
