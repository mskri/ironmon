import { createReaction } from 'monbot';

export const eventSignup = createReaction({
  name: 'event-signup',
  trigger: ['accepted', 'declined', 'smile'],
  onAdd: ({ message: { channel } }) => {
    channel.send('added');
  },
  onRemove: ({ message: { channel } }) => {
    channel.send('removed');
  },
});
