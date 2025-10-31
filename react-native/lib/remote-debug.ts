import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Remote debugging utility for debugging errors on physical devices
 *
 * Setup:
 * 1. Create a Slack webhook: https://api.slack.com/messaging/webhooks
 * 2. Set the webhook URL in the lib/remote-debug.ts file
 *
 * Usage:
 *   RemoteDebug.sendLog('Profile created', { did: 'did:key:...' });
 *   RemoteDebug.sendError('Profile query failed', { error: 'Not found' });
 */

export type DebugLogLevel = 'info' | 'warn' | 'error';

interface DebugLogOptions {
  level?: DebugLogLevel;
  data?: Record<string, any>;
  timestamp?: number;
}

/**
 * Sends a debug log to a remote service (e.g., Slack)
 * Fire-and-forget pattern - does not block or throw errors
 *
 * @param message - Short descriptive message
 * @param options - Optional level, data, and timestamp
 */
export async function sendLog(
  message: string,
  options: DebugLogOptions = {}
): Promise<void> {
  const { level = 'info', data, timestamp = Date.now() } = options;

  // Always log to console as fallback
  const consoleMessage = `[RemoteDebug:${level}] ${message}`;
  if (level === 'error') {
    console.error(consoleMessage, data);
  } else if (level === 'warn') {
    console.warn(consoleMessage, data);
  } else {
    console.log(consoleMessage, data);
  }

  // Get webhook URL from environment
  const webhookUrl = '';

  // Build payload for Slack
  const emoji = level === 'error' ? ':x:' : level === 'warn' ? ':warning:' : ':white_check_mark:';
  const deviceInfo = `${Platform.OS} ${Platform.Version}`;
  const appVersion = Constants.expoConfig?.version || 'unknown';

  let slackText = `${emoji} *${message}*\n`;
  slackText += `_Device: ${deviceInfo} | App: v${appVersion} | Time: ${timestamp}_`;

  if (data) {
    slackText += '\n```' + JSON.stringify(data, null, 2) + '```';
  }

  const payload = {
    text: slackText,
  };

  // Send to webhook (fire-and-forget, catch all errors silently)
  try {
    console.log('[RemoteDebug] Attempting to send to webhook...', webhookUrl.substring(0, 50));
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('[RemoteDebug] Webhook response status:', response.status);

    if (!response.ok) {
      const responseText = await response.text();
      console.error('[RemoteDebug] Webhook failed with status:', response.status, responseText);
    } else {
      console.log('[RemoteDebug] Webhook sent successfully!');
    }
  } catch (error) {
    // Log error details for debugging
    console.error('[RemoteDebug] Failed to send webhook:', error);
    console.error('[RemoteDebug] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Convenience function for sending info-level logs
 */
export function sendInfo(message: string, data?: Record<string, any>): Promise<void> {
  return sendLog(message, { level: 'info', data });
}

/**
 * Convenience function for sending warning-level logs
 */
export function sendWarn(message: string, data?: Record<string, any>): Promise<void> {
  return sendLog(message, { level: 'warn', data });
}

/**
 * Convenience function for sending error-level logs
 */
export function sendError(message: string, data?: Record<string, any>): Promise<void> {
  return sendLog(message, { level: 'error', data });
}
