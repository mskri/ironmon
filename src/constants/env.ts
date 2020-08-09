import dotenv from 'dotenv';

const { error, parsed } = dotenv.config();

if (error) {
  throw error;
}

export const BOT_AUTH_TOKEN: string = parsed?.BOT_AUTH_TOKEN ?? '';

export const ADMINS: string[] = parsed?.ADMINS?.split(',') ?? [];

export const API_BASE = parsed?.API_BASE;

export const ENV = parsed?.NODE_ENV;
