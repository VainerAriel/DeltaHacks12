export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  preferences: {
    language?: string;
    notifications?: boolean;
    theme?: 'light' | 'dark' | 'system';
  };
}
