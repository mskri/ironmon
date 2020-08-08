import pino from 'pino';

export const logger = pino({
  level: 'debug',
  prettyPrint: {
    ignore: 'pid,hostname',
  },
});
