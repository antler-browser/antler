import { eq, desc } from 'drizzle-orm';
import { db } from '../index';
import * as schema from '../schema';
import * as SecureStorage from '../../secure-storage';

/**
 * App State operations
 * Manages global application state
 */

export interface AppState {
  currentDid?: string;
  hasCompletedWelcome: boolean;
}

export namespace AppStateFns {
  /**
   * Initializes AppState if it doesn't exist (handled by migration)
   */
  export async function initAppState(): Promise<void> {
    try {
      // App state is initialized by migration 0001
      // This function is kept for API compatibility
      const state = await db.query.appState.findFirst();
      if (!state) {
        throw new Error('App state not initialized by migrations');
      }
    } catch (error) {
      console.error(`Error initializing app state: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Gets AppState, always returning a valid state (never null)
   */
  export async function getAppState(): Promise<AppState> {
    try {
      const state = await db.query.appState.findFirst();
      if (!state) {
        throw new Error('App state should have been initialized');
      }

      return {
        currentDid: state.currentDid ?? undefined,
        hasCompletedWelcome: state.hasCompletedWelcome,
      };
    } catch (error) {
      console.error(`Error reading app state: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Set the current user by DID
   */
  export async function setCurrentDid(did: string): Promise<void> {
    try {
      await db.update(schema.appState)
        .set({ currentDid: did })
        .where(eq(schema.appState.id, 1));
    } catch (error) {
      console.error(`Error setting current DID: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Mark welcome screen as completed
   */
  export async function setWelcomeCompleted(): Promise<void> {
    try {
      await db.update(schema.appState)
        .set({ hasCompletedWelcome: true })
        .where(eq(schema.appState.id, 1));
    } catch (error) {
      console.error(`Error setting welcome completed: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Check if welcome screen has been completed
   */
  export async function hasCompletedWelcome(): Promise<boolean> {
    try {
      const state = await db.query.appState.findFirst();
      return state?.hasCompletedWelcome ?? false;
    } catch (error) {
      console.error(`Error checking welcome status: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Clear all data from the database
   */
  export async function resetAllData(): Promise<void> {
    try {
      await db.transaction(async (tx) => {

        // Get all DIDs from the database
        const userProfiles = await tx.query.userProfiles.findMany({
          columns: { did: true },
        });
    
        // Delete private key for each DID
        const deleteDIDPrivateKeyPromises = userProfiles.map(profile => 
          SecureStorage.deleteDIDPrivateKey(profile.did)
        );
    
        // Delete private keys for all DIDs
        await Promise.allSettled(deleteDIDPrivateKeyPromises);

        // Delete in order to respect foreign key constraints
        await tx.delete(schema.scanHistory);
        await tx.delete(schema.socialLinks);
        await tx.delete(schema.userProfiles);

        // Reset app state
        await tx.update(schema.appState)
          .set({
            currentDid: null,
            hasCompletedWelcome: false,
          });
      });
    } catch (error) {
      console.error(`Error clearing all data: ${(error as Error).message}`);
      throw error;
    }
  }
}
