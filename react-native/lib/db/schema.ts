import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

/**
 * App State Table
 * Stores global application state
 */
export const appState = sqliteTable('app_state', {
  id: integer('id').primaryKey({ autoIncrement: false }).default(1), // Single row table
  currentDid: text('current_did'),
  hasCompletedWelcome: integer('has_completed_welcome', { mode: 'boolean' }).notNull().default(false),
});

/**
 * User Profiles Table
 * Stores user profile information
 */
export const userProfiles = sqliteTable('user_profiles', {
  did: text('did').primaryKey(),
  name: text('name').notNull(),
  avatar: text('avatar'),
  position: integer('position').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

/**
 * Social Links Table
 * Stores social media links for user profiles
 */
export const socialLinks = sqliteTable('social_links', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  profileDid: text('profile_did').notNull().references(() => userProfiles.did, { onDelete: 'cascade' }),
  platform: text('platform').notNull(),
  handle: text('handle').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

/**
 * Scan History Table
 * Stores QR code scan history
 */
export const scanHistory = sqliteTable('scan_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  url: text('url').notNull(),
  profileDid: text('profile_did').notNull().references(() => userProfiles.did, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// Relations
export const userProfilesRelations = relations(userProfiles, ({ many }) => ({
  socialLinks: many(socialLinks),
}));

export const socialLinksRelations = relations(socialLinks, ({ one }) => ({
  profile: one(userProfiles, {
    fields: [socialLinks.profileDid],
    references: [userProfiles.did],
  }),
}));

// Types for use in application code
export type AppState = typeof appState.$inferSelect;
export type InsertAppState = typeof appState.$inferInsert;

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;

export type SocialLink = typeof socialLinks.$inferSelect;
export type InsertSocialLink = typeof socialLinks.$inferInsert;

export type ScanHistory = typeof scanHistory.$inferSelect;
export type InsertScanHistory = typeof scanHistory.$inferInsert;
