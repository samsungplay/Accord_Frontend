export type ChatRoomRoleSettings = {
  id: number;
  chatRoomId: number;
  roleAllowFriendsInvite: "all" | "mod" | "owner";
  roleAllowPublicInvite: "all" | "mod" | "owner";
  roleAllowDeleteMessage: "all" | "mod" | "owner";
  roleAllowKickUser: "all" | "mod" | "owner";
  roleAllowAbortCall: "all" | "mod" | "owner";
  roleAllowAddContent: "all" | "mod" | "owner";
  roleAllowDeleteContent: "all" | "mod" | "owner";
  roleAllowPinMessage: "all" | "mod" | "owner";
};
