import { Collection, GuildChannel, User, GuildMember } from 'discord.js';

export const getMembersInChannel = ({
  channels,
  channelId,
  bots = false,
}: {
  channels?: Collection<string, GuildChannel>;
  channelId: string;
  bots?: false;
}): User[] => {
  const allMembersInChannel = channels?.find(({ id }) => id === channelId)?.members;
  return (
    allMembersInChannel?.reduce((users: User[], member: GuildMember) => {
      if (bots) {
        return [...users, member.user];
      }
      return member.user.bot ? users : [...users, member.user];
    }, []) ?? []
  );
};
