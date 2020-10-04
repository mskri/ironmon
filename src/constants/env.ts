export const BOT_AUTH_TOKEN: string = process.env.BOT_AUTH_TOKEN ?? '';

export const ADMINS: string[] = process.env.ADMINS?.split(',') ?? [];

export const ENV = process.env.NODE_ENV;
