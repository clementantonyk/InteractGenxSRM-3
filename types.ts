export enum AppMode {
  ONBOARDING = 'ONBOARDING',
  WEB = 'WEB',
  COMPANION = 'COMPANION',
}

export interface UserProfile {
  name: string;
  email: string;
  age: string;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  sources?: SearchResult[];
}
