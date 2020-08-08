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

const timeZone = 'Europe/Berlin';
const requiredRole = '494171126038134795'; // Mythic team
const requiredArgs = ['title', 'desc', 'start', 'duration'];

type AddEventArgs = {
  title: string;
  desc: string;
  start: Date;
  duration: string;
  color: string;
};

export const addEvent = createCommand({
  name: 'addEvent',
  trigger: /^!add-event\s/i,
  // requiredRoles: [
  //   '380065303440392203', // Officers
  //   '494171126038134795', // Mythic team
  // ],
  // channels: ['bot-test'],
  // guilds: [
  //   '369588869794103297', // IronBot
  // ],
  run: function ({ channel, content, guild }, { removeTrigger, parseArgs }) {
    const { args, hasMissingArgs, missingArgs } = parseArgs<AddEventArgs>(
      removeTrigger(content),
      {
        requiredArgs,
        defaults: {
          color: '#0099ff',
        },
      }
    );

    if (hasMissingArgs) {
      channel.send(`Missing parameters: ${missingArgs.join(', ')}`);
      return;
    }

    const { title, desc, start, duration, color } = args;
    console.log({ args });
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
      id: '1',
      title,
      description: desc,
      startAt: start,
      duration,
      acceptedMembers: acceptedMembersSorted,
      declinedMembers: acceptedMembersSorted,
      notSetMembers: acceptedMembersSorted,
      color,
    });

    channel.send(eventEmbed);
  },
});

type CreateEmbedParams = {
  id: string;
  title: string;
  description: string;
  startAt: Date;
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
  duration,
  acceptedMembers,
  declinedMembers,
  notSetMembers,
  color,
}: CreateEmbedParams): MessageEmbed => {
  const endAt = calculateEnd(startAt, duration);
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
