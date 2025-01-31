import { User } from "./User";

export type Call = {
  id: number;
  activeParticipants: User[];
  pendingParticipants: User[];
  hasMusic?: boolean;
  createdAt: number;
};
