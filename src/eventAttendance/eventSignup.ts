import { createReaction } from 'monbot';
import { logger } from 'logger';
import { User, MessageEmbed, EmbedField, Guild } from 'discord.js';
import { createSignupFields } from './addEvent';

export const eventSignup = createReaction({
  name: 'event-signup',
  trigger: ['accepted', 'declined'],
  onAdd: async (reaction, user) => {
    const {
      emoji,
      message: { reactions, embeds, guild, channel },
    } = reaction;

    if (!guild) {
      logger.error(`Event signup requires guild object`);
      return;
    }

    const [eventEmbed] = embeds;
    const { acceptedUsersField, declinedUsersField } = getSignupFields(eventEmbed);

    const acceptedUsers: User[] = await extractUsersFromFields({
      usersField: acceptedUsersField,
      user,
      guild,
    });

    const declinedUsers: User[] = await extractUsersFromFields({
      usersField: declinedUsersField,
      user,
      guild,
    });

    switch (emoji.name) {
      case 'accepted':
        acceptedUsers.push(user);
        break;
      case 'declined':
        declinedUsers.push(user);
        break;
    }

    const notSetUsers: User[] =
      guild?.channels.cache
        .find(({ id }) => id === channel.id)
        ?.members.map((member) => member.user)
        .filter((user) => !acceptedUsers.includes(user) && !declinedUsers.includes(user)) ?? [];

    const newSignupFields = createSignupFields({ notSetUsers, acceptedUsers, declinedUsers });
    reaction.message.edit(eventEmbed.spliceFields(3, 3, newSignupFields));

    try {
      reactions.resolve(reaction)?.users.remove(user.id);
    } catch (error) {
      logger.error(`Failed to remove reactions: ${error.message}`);
    }
  },
});

const getSignupFields = (eventEmbed: MessageEmbed) => {
  return {
    acceptedUsersField: Object.values(eventEmbed.fields).find((field) =>
      field.name.startsWith('Accepted')
    ),
    declinedUsersField: Object.values(eventEmbed.fields).find((field) =>
      field.name.startsWith('Declined')
    ),
  };
};

const extractUsersFromFields = async ({
  usersField,
  user,
  guild,
}: {
  usersField: EmbedField | undefined;
  user: User;
  guild: Guild;
}) => {
  return (
    await Promise.all(
      usersField?.value.split('\n').map((userMention) => {
        const userId = userMention.match(/\d+/g)?.map(String).join('') ?? '';
        return guild.members.fetch(userId)?.then((member) => member.user);
      }) ?? []
    )
  ).reduce((users: User[], fieldUser: User | undefined) => {
    if (fieldUser && fieldUser.id !== user.id) {
      return users.concat(fieldUser);
    }
    return users;
  }, []);
};
