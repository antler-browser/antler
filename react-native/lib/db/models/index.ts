/**
 * Database Models
 * Barrel export for all model operations
 */

// Export model namespaces
export { AppStateFns } from './app-state';
export { UserProfileFns } from './user-profile';
export { ScanHistoryFns } from './scan-history';

// Export types
export type { AppState } from './app-state';
export type {
  UserProfile,
  SocialLink,
} from './user-profile';
export type { ScanHistory } from './scan-history';
