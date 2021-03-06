import { createCommand } from 'monbot';
import { MessageEmbed, Message, User, EmbedField } from 'discord.js';
import { addHours, addMinutes } from 'date-fns';
import { formatToTimeZone } from 'date-fns-timezone';
import { logger } from 'logger';
import { Event } from 'eventAttendance/eventModel';
import { getMembersInChannel } from '../utils';
import { addEventReactions, timeZone } from 'config';

const requiredArgs = ['title', 'desc', 'start', 'duration'];

type AddEventArgs = {
  title: string;
  desc: string;
  type: string;
  start: Date;
  duration: string;
  color: string;
  url: string;
  debug: boolean;
};

export const addEvent = createCommand({
  name: 'addEvent',
  trigger: /^!add-event\s/i,
  run: async (message, { removeTrigger, parseArgs }) => {
    const { channel, content, guild } = message;
    const { args, missingArgs } = parseArgs<AddEventArgs>(removeTrigger(content), {
      requiredArgs,
      defaults: { type: 'raid', debug: false },
    });

    if (missingArgs.length > 0) {
      channel.send(`Missing parameters: ${missingArgs.join(', ')}`);
      return;
    }

    try {
      const { title, desc: description, type, start: startAt, duration, color, url, debug } = args;

      const endAt = calculateEnd(startAt, duration);
      const timestamp = createTimestamp(startAt, endAt);

      const notSetUsers = getMembersInChannel({
        channels: guild?.channels.cache,
        channelId: channel.id,
        bots: false,
      });

      const eventEmbed = createEventEmbed({
        title,
        description,
        type,
        color,
        url,
        duration,
        timestamp,
        notSetUsers,
      });

      channel.send(eventEmbed).then(addReactionsToEvent);
      if (!debug) {
        message.delete();
      }
    } catch (e) {
      logger.error(`Could not create new event: ${e.message}`);
      channel.send('Could not create new event');
    }
  },
});

const addReactionsToEvent = async (message: Message) => {
  try {
    const emojiCache = message.guild?.emojis.cache;
    const acceptEmoji = emojiCache?.find((emoji) => emoji.name === addEventReactions.accept);
    const declineEmoji = emojiCache?.find((emoji) => emoji.name === addEventReactions.decline);

    if (!acceptEmoji) {
      throw new Error(`Accept emoji '${addEventReactions.accept}' not found`);
    }

    if (!declineEmoji) {
      throw new Error(`Decline emoji '${addEventReactions.decline}' not found`);
    }

    await message.react(acceptEmoji);
    await message.react(declineEmoji);
  } catch (error) {
    logger.error(`Failed to add emojis to event: ${error.message}`);
  }
};

type CreateEmbedParams = Pick<Event, 'title' | 'description' | 'type' | 'color' | 'url'> & {
  duration: string;
  timestamp: string;
  acceptedUsers?: User[];
  declinedUsers?: User[];
  notSetUsers?: User[];
};

export const createEventEmbed = ({
  title,
  description,
  type,
  url,
  duration,
  timestamp,
  acceptedUsers = [],
  declinedUsers = [],
  notSetUsers = [],
  color,
}: CreateEmbedParams): MessageEmbed => {
  const typeCapitalized = type.replace(/^\w/, (char) => char.toUpperCase());
  const eventColor = getEventColorByType(type, color);
  return new MessageEmbed()
    .setColor(eventColor)
    .setTitle(title)
    .setURL(url)
    .setAuthor(typeCapitalized)
    .setDescription(description)
    .addFields(
      {
        name: 'When',
        value: timestamp,
        inline: true,
      },
      {
        name: 'Duration',
        value: duration,
        inline: true,
      },
      { name: '\u200B', value: '\u200B' },
      ...createSignupFields({ notSetUsers, acceptedUsers, declinedUsers })
    )
    .setTimestamp()
    .setFooter(`Set your status by reacting with the emojis below`);
};

const createTimestamp = (startAt: Date, endAt: Date): string => {
  const date = formatToTimeZone(startAt, 'dddd DD/MM', { timeZone });
  const startHours = formatToTimeZone(startAt, 'HH:mm', { timeZone });
  const endHours = formatToTimeZone(endAt, 'HH:mm', { timeZone });

  return `${date} from ${startHours} to ${endHours} server time`;
};

export const createSignupFields = ({
  notSetUsers,
  acceptedUsers,
  declinedUsers,
}: {
  notSetUsers: User[];
  acceptedUsers: User[];
  declinedUsers: User[];
}): EmbedField[] => {
  return [
    {
      name: `Not set (${notSetUsers.length})`,
      value: formatUserMentions(notSetUsers),
      inline: true,
    },
    {
      name: `Accepted (${acceptedUsers.length})`,
      value: formatUserMentions(acceptedUsers),
      inline: true,
    },
    {
      name: `Declined (${declinedUsers.length})`,
      value: formatUserMentions(declinedUsers),
      inline: true,
    },
  ];
};

const formatUserMentions = (users: User[]): string => {
  if (users.length === 0) return '—';
  return users.map((user) => user.toString()).join('\n');
};

const parseDurationString = (duration: string): [number, string][] => {
  const additionParams = duration.split(' ');
  const output: [number, string][] = [];

  additionParams.forEach((param: string) => {
    const indexOfFirstChar: number = param.indexOfRegex(/[a-zA-Z]/);
    const time: number = parseInt(param.slice(0, indexOfFirstChar));
    const type: string = param.slice(indexOfFirstChar);

    output.push([time, type]);
  });

  return output;
};

// Calculate and time by adding duration string into date
// duration string is formatted like "Xh Ym", e.g. "1h 30m", "1h" or "30m"
const calculateEnd = (startTime: Date, duration: string): Date => {
  const additions: [number, string][] = parseDurationString(duration);
  let endTime: Date = startTime;

  additions.forEach((time) => {
    if (time[1] === 'h') {
      endTime = addHours(endTime, time[0]);
    } else if (time[1] === 'm') {
      endTime = addMinutes(endTime, time[0]);
    }
  });

  return endTime;
};

const getEventColorByType = (type: string, defaultColor: string): string => {
  switch (type.toLocaleLowerCase()) {
    case 'normal':
      return '#25948e';
    case 'heroic':
      return '#254694';
    case 'mythic':
      return '#73289c';
    default:
      return defaultColor;
  }
};
