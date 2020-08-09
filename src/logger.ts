import pino from 'pino';
import { ENV } from 'constants/env';

const options =
  ENV === 'development'
    ? {
        level: 'debug',
        prettyPrint: {
          colorize: true,
          ignore: 'pid,hostname',
        },
      }
    : {
        level: 'info',
      };

export const logger = pino({
  ...options,
});
