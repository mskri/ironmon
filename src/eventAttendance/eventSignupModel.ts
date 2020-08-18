export type EventSignup = {
  userTag: string;
  status: number;
};

export enum EventSignupStatus {
  'notSet' = 'not-set',
  'accepted' = 'accepted',
  'declined' = 'declined',
}
