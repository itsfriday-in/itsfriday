// Auth0 Identity from user profile
export interface UserIdentity {
  connection: string;
  user_id: string;
  provider: string;
  isSocial: boolean;
  profileData?: {
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  };
}

// Normalized connected account for UI
export interface ConnectedAccount {
  id: string;
  provider: ProviderType;
  email: string;
  isPrimary: boolean;
  connection: string;
  userId: string;
  lastUsed?: string;
}

// Active session info
export interface ActiveSession {
  id: string;
  device: string;
  browser: string;
  location: string;
  ip: string;
  lastActive: string;
  isCurrent: boolean;
}

// User profile data
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
  emailVerified: boolean;
  createdAt?: string;
  updatedAt?: string;
  user_metadata?: Record<string, any>; // Add this line
}

// Supported provider types
export type ProviderType = 'google' | 'apple' | 'email';

// Provider configuration
export interface ProviderConfig {
  type: ProviderType;
  name: string;
  connection: string;
  icon: string;
  description: string;
}

// All supported providers
export const SUPPORTED_PROVIDERS: ProviderConfig[] = [
  {
    type: 'google',
    name: 'Google',
    connection: 'google-oauth2',
    icon: 'google',
    description: 'Sign in with your Google account',
  },
  {
    type: 'apple',
    name: 'Apple',
    connection: 'apple',
    icon: 'apple',
    description: 'Sign in with your Apple ID',
  },
  {
    type: 'email',
    name: 'Email',
    connection: 'email',
    icon: 'email',
    description: 'Sign in with a magic link',
  },
];

// Map connection strings to provider types
export function getProviderFromConnection(connection: string): ProviderType {
  if (connection.includes('google')) return 'google';
  if (connection.includes('apple')) return 'apple';
  return 'email';
}

// Get provider config by type
export function getProviderConfig(type: ProviderType): ProviderConfig | undefined {
  return SUPPORTED_PROVIDERS.find((p) => p.type === type);
}

// API Response types
export interface IdentitiesResponse {
  identities: ConnectedAccount[];
  primaryIdentity: string;
}

export interface ProfileResponse {
  profile: UserProfile;
}

export interface LinkResponse {
  redirectUrl: string;
}

export interface UnlinkResponse {
  success: boolean;
  message: string;
}

// Settings page state
export interface SettingsState {
  identities: ConnectedAccount[];
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;
}
