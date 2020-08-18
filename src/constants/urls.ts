import { API_BASE } from 'constants/env';

export const URL_CREATE_EVENT = `${API_BASE}/events`;

export const constructEventSignupUrl = (eventId: string): string =>
  `${API_BASE}/events/${eventId}/signup`;
