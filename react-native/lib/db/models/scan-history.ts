import { eq, desc } from 'drizzle-orm';
import { db } from '../index';
import * as schema from '../schema';

/**
 * Scan History operations
 * Manages QR code scan history
 */

export interface ScanHistory {
  id: number;
  url: string;
  profileDid: string;
  createdAt: Date;
}

export namespace ScanHistoryFns {
  /**
   * Save a new scan to history
   */
  export async function saveScan(url: string, profileDid: string): Promise<void> {
    try {
      await db.insert(schema.scanHistory).values({
        url,
        profileDid,
      });
    } catch (error) {
      console.error(`Error saving scan history: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Get scan history for a user
   */
  export async function getScans(
    did: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ScanHistory[]> {
    try {
      const scans = await db.query.scanHistory.findMany({
        where: eq(schema.scanHistory.profileDid, did),
        orderBy: desc(schema.scanHistory.createdAt),
        limit,
        offset,
      });

      return scans.map(scan => ({
        id: scan.id,
        url: scan.url,
        profileDid: scan.profileDid,
        createdAt: scan.createdAt,
      }));
    } catch (error) {
      console.error(`Error getting scan history: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Clear all scan history
   */
  export async function deleteAllScansForProfile(did: string): Promise<void> {
    try {
      await db.delete(schema.scanHistory).where(eq(schema.scanHistory.profileDid, did));
    } catch (error) {
      console.error(`Error deleting all scans for profile: ${(error as Error).message}`);
      throw error;
    }
  }
}
