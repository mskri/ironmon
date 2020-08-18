import axios from 'axios';
import { createReaction } from 'monbot';
import { constructEventSignupUrl } from 'constants/urls';
import { EventSignup, EventSignupStatus } from './eventSignupModel';

export const eventSignup = createReaction({
  name: 'event-signup',
  trigger: ['accepted', 'declined'],
  onAdd: async (reaction, user) => {
    const {
      emoji,
      message: { id: eventId },
    } = reaction;
    const status = getSignupStatus(emoji.name);
    const url = constructEventSignupUrl(eventId);
    await axios.post<EventSignup>(url, {
      userTag: user.tag,
      status,
    });
  },
  onRemove: async (reaction, user) => {
    const {
      message: { id: eventId },
    } = reaction;
    const url = constructEventSignupUrl(eventId);
    await axios.put<EventSignup>(url, {
      userTag: user.tag,
      status: EventSignupStatus.notSet,
    });
  },
});

const getSignupStatus = (emojiName: string): string => {
  switch (emojiName) {
    case 'accepted':
      return EventSignupStatus.accepted;
    case 'declined':
      return EventSignupStatus.declined;
    default:
      return EventSignupStatus.notSet;
  }
};
