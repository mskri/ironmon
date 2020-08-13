import axios from 'axios';
import { createCommand } from 'monbot';
import { MessageEmbed, GuildMember, Message, User } from 'discord.js';
import { addHours, addMinutes } from 'date-fns';
import { formatToTimeZone } from 'date-fns-timezone';
import { URL_CREATE_USER, URL_CREATE_EVENT } from 'constants/urls';
import { logger } from 'logger';
import { Event } from 'eventAttendance/eventModel';

const timeZone = 'Europe/Berlin';
const requiredArgs = ['title', 'desc', 'start', 'duration'];
const emojis = {
  accept: 'accepted',
  decline: 'declined',
};

type AddEventArgs = {
  title: string;
  desc: string;
  type: string;
  start: Date;
  duration: string;
  color: string;
  url: string;
};

export const addEvent = createCommand({
  name: 'addEvent',
  trigger: /^!add-event\s/i,
  run: async (
    { channel, content, guild, member, id: messageId },
    { removeTrigger, parseArgs }
  ) => {
    const contentWithoutTrigger = removeTrigger(content);
    const { args, hasMissingArgs, missingArgs } = parseArgs<AddEventArgs>(
      contentWithoutTrigger,
      {
        requiredArgs,
        defaults: { type: 'raid' },
      }
    );

    if (hasMissingArgs) {
      channel.send(`Missing parameters: ${missingArgs.join(', ')}`);
      return;
    }

    const {
      title,
      desc: description,
      type,
      start: startAt,
      duration,
      color,
      url,
    } = args;
    const endAt = calculateEnd(startAt, duration);

    try {
      const eventAuthor = await axios.post<User>(URL_CREATE_USER, {
        id: member?.user.id,
        username: member?.user.username,
        discordTag: member?.user.tag,
      });

      await axios.post<Event>(URL_CREATE_EVENT, {
        id: messageId,
        title,
        description,
        type: type.toLowerCase(),
        color,
        url,
        userId: eventAuthor.data.id,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
      });

      const notSetUsers = guild?.channels.cache
        .find(({ id }) => id === channel.id)
        ?.members.sort(byMemberUsername)
        .map((member) => member.id);

      const timestamp = createTimestamp(startAt, endAt);
      const eventEmbed = createEventEmbed({
        title,
        description,
        type,
        color,
        url,
        duration,
        timestamp,
        acceptedMembers: [],
        declinedMembers: [],
        notSetMembers: notSetUsers,
      });

      channel.send(eventEmbed).then(addReactionsToEvent);
    } catch (e) {
      logger.error(`Could not create new event: ${e.message}`);
      return channel.send('Could not create new event');
    }
  },
});

const addReactionsToEvent = async (message: Message) => {
  try {
    const acceptEmoji = message.guild?.emojis.cache.find(
      (emoji) => emoji.name === emojis.accept
    );
    const declineEmoji = message.guild?.emojis.cache.find(
      (emoji) => emoji.name === emojis.decline
    );

    if (!acceptEmoji) {
      throw new Error(`Accept emoji '${emojis.accept}' not found`);
    }

    if (!declineEmoji) {
      throw new Error(`Decline emoji '${emojis.decline}' not found`);
    }

    await message.react(acceptEmoji);
    await message.react(declineEmoji);
  } catch (error) {
    logger.error(`Failed to add emojis to event: ${error.message}`);
  }
};

type CreateEmbedParams = Omit<
  Event,
  'startAt' | 'endAt' | 'createdAt' | 'updatedAt'
> & {
  duration: string;
  timestamp: string;
  acceptedMembers?: string[];
  declinedMembers?: string[];
  notSetMembers?: string[];
};

const createEventEmbed = ({
  title,
  description,
  type,
  url,
  duration,
  timestamp,
  acceptedMembers = [],
  declinedMembers = [],
  notSetMembers = [],
  color,
}: CreateEmbedParams): MessageEmbed => {
  const typeCapitalized = type.replace(/^\w/, (char) => char.toUpperCase());

  return new MessageEmbed()
    .setColor(color)
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
      {
        name: `Not set (${notSetMembers.length})`,
        value: formatMembers(notSetMembers),
        inline: true,
      },
      {
        name: `Accepted (${acceptedMembers.length})`,
        value: formatMembers(acceptedMembers),
        inline: true,
      },
      {
        name: `Declined (${declinedMembers.length})`,
        value: formatMembers(declinedMembers),
        inline: true,
      }
    )
    .setTimestamp()
    .setFooter(`Set your status by reacting with the emojis below`);
};

const createTimestamp = (startTime: Date, endTime: Date): string => {
  const date = formatToTimeZone(startTime, 'dddd DD/MM', { timeZone });
  const startHours = formatToTimeZone(startTime, 'HH:mm', { timeZone });
  const endHours = formatToTimeZone(endTime, 'HH:mm', { timeZone });

  return `${date} from ${startHours} to ${endHours} server time`;
};

const formatMembers = (memberIds: string[]): string => {
  if (memberIds.length === 0) return '—';
  return memberIds.map((memberId) => `<@${memberId}>`).join('\n');
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

const byMemberUsername = (memberA: GuildMember, memberB: GuildMember) =>
  memberA.user.username.localeCompare(memberB.user.username);