export const timeZone = 'Europe/Berlin';

export const addEventReactions = {
  accept: 'accepted',
  decline: 'declined',
};

export const signups = {
  report: true,
  reportChannel: 'attendance-log',
  statusColorMap: new Map<string, string>([
    ['accepted', '#69e4a6'],
    ['declined', '#ff7285'],
  ]),
};
