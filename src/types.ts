export type TagName = 'Work' | 'Personal' | 'Design' | 'Important';

export type ViewTab = 'home' | 'starred' | 'photos' | 'more';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface CloudFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  url: string;
  folderId?: string;
  starred: boolean;
  tag?: TagName;
  createdAt: number;
  isImage: boolean;
  telegramMessageId?: number;
}

export interface CloudFolder {
  id: string;
  name: string;
  description?: string;
  color?: string;
  isTelegramGroup?: boolean;
  createdAt: number;
}

export interface TelegramUser {
  isSignedIn: boolean;
  username: string;
  displayName: string;
  phone?: string;
  telegramId?: string;
  avatarUrl?: string;
  syncEnabled: boolean;
  cloudStorageType: 'browser' | 'telegram';
}

export const TAG_COLORS: Record<TagName, string> = {
  Work: '#4f7cf0',
  Personal: '#f4a04a',
  Design: '#8b6cf0',
  Important: '#ef5d8a',
};
