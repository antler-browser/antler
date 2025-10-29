import { eq, asc, max } from 'drizzle-orm';
import { db } from '../index';
import * as schema from '../schema';
import { SocialPlatform } from '../../social-links';

/**
 * User Profile operations
 * Manages user profiles and social links
 */

// Use database schema types
type UserProfileSchema = schema.UserProfile;
type SocialLinkSchema = schema.SocialLink;

export interface SocialLink {
  platform: SocialPlatform;
  handle: string;
}

// Extended type with relations loaded
export interface UserProfile extends UserProfileSchema {
  socialLinks?: SocialLink[];
}

export namespace UserProfileFns {
  /**
   * Get a user profile by DID with social links
   */
  export async function getProfileByDID(did: string): Promise<UserProfile | null> {
    try {
      const profile = await db.query.userProfiles.findFirst({
        where: eq(schema.userProfiles.did, did),
        with: {
          socialLinks: true,
        },
      });

      if (!profile) {
        return null;
      }

      // Transform social links to app format
      return {
        ...profile,
        socialLinks: profile.socialLinks?.map((link: SocialLinkSchema) => ({
          platform: link.platform as SocialPlatform,
            handle: link.handle,
        })),
      };
    } catch (error) {
      console.error(`Error reading user profile: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Create a new user profile (insert only)
   */
  export async function createProfileByDid(did: string, name: string, socialLinks: SocialLink[] | null, avatar: string | null): Promise<void> {
    try {
      if (!did) {
        throw new Error('Profile DID is required');
      }
      if (!name) {
        throw new Error('Profile name is required');
      }

      // Use transaction to ensure atomicity
      await db.transaction(async (tx) => {
        // Check if profile already exists
        const existingProfile = await tx.query.userProfiles.findFirst({
          where: eq(schema.userProfiles.did, did),
        });

        if (existingProfile) {
          throw new Error(`Profile with DID ${did} already exists`);
        }

        // Get the maximum position value to auto-increment
        const result = await tx.select({ maxPosition: max(schema.userProfiles.position) })
          .from(schema.userProfiles);
        const maxPosition = result[0]?.maxPosition ?? -1;
        const newPosition = maxPosition + 1;

        // Insert new profile
        await tx.insert(schema.userProfiles).values({
          did,
          name,
          avatar,
          position: newPosition,
        });

        // Insert social links if any
        if (socialLinks && socialLinks.length > 0) {
          await tx.insert(schema.socialLinks).values(
            socialLinks.map(social => ({
              profileDid: did,
              platform: social.platform,
              handle: social.handle,
            }))
          );
        }
      });
    } catch (error) {
      console.error(`Error creating user profile: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Update an existing user profile (update only)
   */
  export async function updateProfileByDID(did: string,
    updates: {
      name?: string;
      socialLinks?: SocialLink[];
      avatar?: string | null;
    }
  ): Promise<void> {
    try {
      if (!did) {
        throw new Error('Profile DID is required');
      }

      // Use transaction to ensure atomicity
      await db.transaction(async (tx) => {
        // Check if profile exists
        const existingProfile = await tx.query.userProfiles.findFirst({
          where: eq(schema.userProfiles.did, did),
        });

        if (!existingProfile) {
          throw new Error(`Profile with DID ${did} not found`);
        }

        // Build update object with only provided fields
        const updateData: Partial<typeof schema.userProfiles.$inferInsert> = {};
        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.avatar !== undefined) updateData.avatar = updates.avatar;

        // Update profile if there are changes
        if (Object.keys(updateData).length > 0) {
          updateData.updatedAt = new Date();
          await tx.update(schema.userProfiles)
            .set(updateData)
            .where(eq(schema.userProfiles.did, did));
        }

        // Delete old social links
        await tx.delete(schema.socialLinks)
          .where(eq(schema.socialLinks.profileDid, did));

        // Insert new social links if any
        if (updates.socialLinks && updates.socialLinks.length > 0) {
          await tx.insert(schema.socialLinks).values(
            updates.socialLinks.map(social => ({
              profileDid: did,
              platform: social.platform,
              handle: social.handle,
            }))
          );
        }

      });
    } catch (error) {
      console.error(`Error updating user profile: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Delete a user profile and all associated data
   */
  export async function removeProfileByDID(did: string): Promise<void> {
    try {
      // Cascade delete will handle social_links and scan_history
      await db.delete(schema.userProfiles)
        .where(eq(schema.userProfiles.did, did));

      // Also update app state if this was the current DID
      const state = await db.query.appState.findFirst();
      if (state?.currentDid === did) {
        // Get the next profile by position (profile is already deleted, so just get the first one)
        const nextProfile = await db.query.userProfiles.findFirst({
          columns: { did: true },
          orderBy: asc(schema.userProfiles.position),
        });

        const newCurrentDid = nextProfile?.did ?? null;
        await db.update(schema.appState)
          .set({ currentDid: newCurrentDid })
          .where(eq(schema.appState.id, 1));
      }
    } catch (error) {
      console.error(`Error deleting user profile: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Get the current user profile
   */
  export async function getCurrentProfile(): Promise<UserProfile | null> {
    try {
      const state = await db.query.appState.findFirst();
      if (!state?.currentDid) {
        return null;
      }
      return await UserProfileFns.getProfileByDID(state.currentDid);
    } catch (error) {
      console.error(`Error getting current user: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Set the current user by DID
   */
  export async function setCurrentProfile(did: string): Promise<void> {
    try {
      await db.update(schema.appState)
        .set({ currentDid: did })
        .where(eq(schema.appState.id, 1));
    } catch (error) {
      console.error(`Error setting current user: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Get all user profiles ordered by position and creation date
   */
  export async function getAllProfiles(): Promise<Partial<UserProfile>[]> {
    try {
      const profiles = await db.query.userProfiles.findMany({
        with: {
          socialLinks: true,
        },
        orderBy: [asc(schema.userProfiles.position)],
      });

      return profiles.map(profile => ({
        ...profile,
        socialLinks: profile.socialLinks?.map((link: SocialLinkSchema) => ({
          platform: link.platform as SocialPlatform,
          handle: link.handle,
        })),
      }));
    } catch (error) {
      console.error(`Error getting all user profiles: ${(error as Error).message}`);
      return [];
    }
  }
}
