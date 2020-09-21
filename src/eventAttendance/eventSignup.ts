import { createReaction } from 'monbot';
import { logger } from 'logger';
import { User, MessageEmbed, EmbedField, Guild, TextChannel } from 'discord.js';
import { createSignupFields } from './addEvent';
import { getMembersInChannel } from '../utils';

const reportChannel = 'attendance-log';
const statusColorMap = new Map<string, string>([
  ['accepted', '#69e4a6'],
  ['declined', '#ff7285'],
]);

export const eventSignup = createReaction({
  name: 'event-signup',
  trigger: ['accepted', 'declined'],
  onAdd: async (reaction, { user }) => {
    const {
      emoji,
      message: { reactions, embeds, guild, channel, id: messageId },
    } = reaction;

    if (!guild) {
      logger.error(`Event signup requires guild object`);
      return;
    }

    const [eventEmbed] = embeds;
    const { acceptedUsersField, declinedUsersField } = getSignupFields(eventEmbed);

    const allAcceptedUsers: User[] = await extractUsersFromFields({
      usersField: acceptedUsersField,
      guild,
    });
    const acceptedUsers = allAcceptedUsers.filter((u) => u.id !== user.id);

    const allDeclinedUsers: User[] = await extractUsersFromFields({
      usersField: declinedUsersField,
      guild,
    });
    const declinedUsers = allDeclinedUsers.filter((u) => u.id !== user.id);

    const oldStatus = findOldStatus(user, allAcceptedUsers, allDeclinedUsers);

    switch (emoji.name) {
      case 'accepted':
        acceptedUsers.push(user);
        break;
      case 'declined':
        declinedUsers.push(user);
        break;
    }

    if (emoji.name !== oldStatus) {
      const notSetUsers =
        getMembersInChannel({
          channels: guild?.channels.cache,
          channelId: channel.id,
          bots: false,
        }).filter((user) => !acceptedUsers.includes(user) && !declinedUsers.includes(user)) ?? [];

      const newSignupFields = createSignupFields({ notSetUsers, acceptedUsers, declinedUsers });
      reaction.message.edit(eventEmbed.spliceFields(3, 3, newSignupFields));

      const logChannel = guild.channels.cache.find((c) => c.name === reportChannel) as TextChannel;
      const signupLogEmbed = createSignupNoticeEmbed({
        user,
        messageUrl: `https://discordapp.com/channels/${guild.id}/${channel.id}/${messageId}`,
        color: statusColorMap.get(emoji.name) || '#000',
        status: emoji.name,
        oldStatus,
      });
      logChannel.send(signupLogEmbed);
    }

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
  guild,
}: {
  usersField: EmbedField | undefined;
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
    if (fieldUser) {
      return users.concat(fieldUser);
    }
    return users;
  }, []);
};

export const createSignupNoticeEmbed = ({
  user,
  messageUrl,
  color,
  status,
  oldStatus,
}: {
  user: User;
  messageUrl: string;
  color: string;
  status: string;
  oldStatus: string | null;
}): MessageEmbed => {
  const newStatus = `${user} signed up as ${status}`;
  const changeStatus = `${user} changed status to ${status}`;
  const title = oldStatus ? changeStatus : newStatus;

  return new MessageEmbed()
    .setColor(color)
    .setDescription(`${title}\n${messageUrl}`)
    .setTimestamp();
};

const findOldStatus = (user, acceptedUsers, declinedUsers) => {
  if (declinedUsers.includes(user)) {
    return 'declined';
  }
  if (acceptedUsers.includes(user)) {
    return 'accepted';
  }
  return null;
};
