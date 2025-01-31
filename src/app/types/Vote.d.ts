import { User } from "./User";

export type Vote = {
  id: number;
  voter: User;
  answerIndex: number;
};
