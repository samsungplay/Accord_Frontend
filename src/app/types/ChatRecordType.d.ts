import { ChatReaction } from "./ChatReaction";
import { Poll } from "./Poll";
import { User } from "./User";
import { Vote } from "./Vote";

export type ChatRecordType = {
  id: number;
  type: string;
  message: string;
  date: Date;
  sender: User | null;
  edited: boolean;
  chatReactions: ChatReaction[];
  replyTargetSender?: User;
  replyTargetMessage?: string;
  replyTargetId?: number;
  attachments?: string;
  attachmentsMetadata?: string;
  clientAttachmentUploadProgress?: number;
  pinned: boolean;
  hideEmbed?: boolean;
  poll?: Poll;
  pollVotes: Vote[];
  isSpam?: boolean;
  isNsfw?: boolean;
  chatRoomIdRef?: number;
};
