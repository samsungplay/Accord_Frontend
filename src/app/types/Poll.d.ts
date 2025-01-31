export type Poll = {
  id: number;
  question: string;
  answers: string;
  expiration: Date;
  allowMultiple: boolean;
};
