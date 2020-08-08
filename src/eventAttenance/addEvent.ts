import { createCommand } from 'monbot';
import { MessageEmbed, GuildMember } from 'discord.js';
import {
  addHours,
  addMinutes,
  differenceInHours,
  differenceInMinutes,
  subHours,
} from 'date-fns';
import { formatToTimeZone } from 'date-fns-timezone';
import { URL_CREATE_USER, URL_CREATE_EVENT } from 'constants/urls';
import { logger } from 'logger';
import axios from 'axios';

const timeZone = 'Europe/Berlin';
const requiredRole = '494171126038134795'; // Mythic team
const requiredArgs = ['title', 'desc', 'start', 'duration'];

type AddEventArgs = {
  title: string;
  desc: string;
  start: Date;
  duration: string;
  color: string;
  url: string;
};

type User = {
  id: number;
  username: string;
  discordTag: string;
  discordId: string;
};

type Event = {
  id: string;
  title: string;
  description: string;
  color: string;
  url: string;
  startAt: Date;
  endAt: Date;
  userId: string;
  guildId: string;
  channelId: string;
  messageId: string;
  createdAt: string;
  modifiedAt: string;
};

type EventPostData = Pick<
  Event,
  | 'title'
  | 'description'
  | 'color'
  | 'url'
  | 'startAt'
  | 'endAt'
  | 'guildId'
  | 'channelId'
  | 'messageId'
>;

export const addEvent = createCommand({
  name: 'addEvent',
  trigger: /^!add-event\s/i,
  run: async function (
    { channel, content, guild, member, id: messageId },
    { removeTrigger, parseArgs }
  ) {
    const { args, hasMissingArgs, missingArgs } = parseArgs<AddEventArgs>(
      removeTrigger(content),
      {
        requiredArgs,
        defaults: {
          color: '#0099ff',
          url: 'https://google.com',
        },
      }
    );

    if (hasMissingArgs) {
      channel.send(`Missing parameters: ${missingArgs.join(', ')}`);
      return;
    }

    const {
      title,
      desc: description,
      start: startAt,
      duration,
      color,
      url,
    } = args;

    const eventData: EventPostData = {
      title,
      description,
      color,
      url,
      startAt,
      endAt: calculateEnd(startAt, duration),
      guildId: guild?.id ?? '',
      channelId: channel.id,
      messageId,
    };

    try {
      const eventAuthor = await axios.post<User>(URL_CREATE_USER, {
        username: member?.user.username,
        discordTag: member?.user.tag,
        discordId: member?.user.id,
      });

      const ev = await axios.post<{ id: number }>(URL_CREATE_EVENT, {
        ...eventData,
        userId: eventAuthor.data.id,
      });

      const eventId = ev.data.id;

      const membersWithRequiredRole = (
        members: GuildMember[],
        member: GuildMember
      ): GuildMember[] => {
        if (member.roles.cache.get(requiredRole) !== undefined) {
          members.push(member);
        }
        return members;
      };

      const acceptedMembersSorted =
        guild?.channels.cache
          .find(({ id: channelId }) => channelId === channel.id)
          ?.members.reduce(membersWithRequiredRole, [])
          .sort(byMemberUsername) ?? [];

      const eventEmbed = createEmbed({
        ...eventData,
        id: eventId,
        duration,
        acceptedMembers: acceptedMembersSorted,
        declinedMembers: acceptedMembersSorted,
        notSetMembers: acceptedMembersSorted,
      });

      channel.send(eventEmbed);
    } catch (e) {
      logger.error(e);
      return channel.send('Could not create new event');
    }
  },
});

type CreateEmbedParams = {
  id: number;
  title: string;
  description: string;
  startAt: Date;
  endAt: Date;
  duration: string;
  acceptedMembers: GuildMember[];
  declinedMembers: GuildMember[];
  notSetMembers: GuildMember[];
  color: string;
};

const createEmbed = ({
  id,
  title,
  description,
  startAt,
  endAt,
  duration,
  acceptedMembers,
  declinedMembers,
  notSetMembers,
  color,
}: CreateEmbedParams): MessageEmbed => {
  const timestamp = createTimestamp(startAt, endAt);

  return (
    new MessageEmbed()
      .setColor(color)
      .setTitle(title)
      // .setURL('https://google.com/')
      .setAuthor(
        `Event #${id}`
        // 'https://',
        // 'https://google.com'
      )
      .setDescription(description)
      // .setThumbnail('https://')
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
          name: `Accepted (${acceptedMembers.length})`,
          value: formatMembers(acceptedMembers),
          inline: true,
        },
        {
          name: `Declined (${declinedMembers.length})`,
          value: formatMembers(declinedMembers),
          inline: true,
        },
        {
          name: `Not set (${notSetMembers.length})`,
          value: formatMembers(notSetMembers),
          inline: true,
        }
      )
      .setTimestamp()
      .setFooter(`Set your status by reacting with the emojis below`)
  );
};

const createTimestamp = (startTime: Date, endTime: Date): string => {
  const date = formatToTimeZone(startTime, 'dddd DD/MM', { timeZone });
  const startHours = formatToTimeZone(startTime, 'HH:mm', { timeZone });
  const endHours = formatToTimeZone(endTime, 'HH:mm', { timeZone });

  return `${date} from ${startHours} to ${endHours} server time`;
};

const createDuration = (start: Date, end: Date): string => {
  const diffInHours = differenceInHours(end, start);
  const differMinutes = differenceInMinutes(subHours(end, diffInHours), start);
  const hours = diffInHours ? `${diffInHours} hours` : null;
  const minutes = differMinutes ? `${differMinutes} minutes` : null;

  return [hours, minutes].join(' ').trim();
};

const formatMembers = (members: GuildMember[]): string => {
  if (members.length === 0) return '—';
  return members.map((member) => `<@${member.id}>`).join('\n');
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
