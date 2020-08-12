import { Monbot } from 'monbot';
import { BOT_AUTH_TOKEN, ADMINS } from 'constants/env';
import { commands } from 'commands';
import { reactions } from 'reactions';

Monbot(BOT_AUTH_TOKEN, {
  admins: ADMINS,
  commands,
  reactions,
});
