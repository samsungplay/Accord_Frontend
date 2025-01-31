import { Background } from "./Background";
import { Call } from "./Call";
import { Sound } from "./Sound";
import { User } from "./User";

export type ChatRoom = {
  id: number;
  name: string;
  modIds?: number[];
  participants: User[];
  direct1to1Identifier: string | null;
  ownerId: number;
  notificationCount: number;
  latestMessageId: number;
  callInstance?: Call | null;
  sounds: Sound[];
  backgrounds: Background[];
  roomImage?: string;
  isPublic?: boolean;
};
