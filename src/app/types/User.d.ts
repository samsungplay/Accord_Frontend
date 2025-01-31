export type User = {
  id: number;
  email: string;
  nickname: string;
  username: string;
  birthDate: Date;
  status: string;
  statusMessage: string | null | undefined;
  profileImageUrl: string | null | undefined;
  profileColor: string;
  isCallMuted: boolean;
  isVideoEnabled: boolean;
  isScreenShareEnabled: "screenonly" | "withaudio" | "no";
  isDeafened: boolean;
  accountType: string;
  canPreviewStream: boolean;
  firstUnreadMessageTimestamp?: number;
  registeredAt: Date;
};
