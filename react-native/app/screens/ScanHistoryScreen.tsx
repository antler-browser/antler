import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Screen,
  ThemedView,
  ThemedText,
  HeaderCloseButton
} from '../components/ui';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Navigation, AppStateFns, ScanHistoryFns, WebViewSigning } from '../../lib';
import type { ScanHistory } from '../../lib/db/models/scan-history';

type NavigationProp = NativeStackNavigationProp<Navigation.RootStackParamList>;

const PAGE_SIZE = 20;

/**
 * Format timestamp as relative time (e.g., "2h ago", "3d ago")
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 4) return `${weeks}w ago`;
  if (months < 12) return `${months}mo ago`;
  return `${years}y ago`;
}

export function ScanHistoryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [scans, setScans] = useState<ScanHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentDid, setCurrentDid] = useState<string | null>(null);

  const loadScans = useCallback(async (did: string, offset: number = 0, append: boolean = false) => {
    try {
      const newScans = await ScanHistoryFns.getScans(did, PAGE_SIZE, offset);

      if (append) {
        setScans(prev => [...prev, ...newScans]);
      } else {
        setScans(newScans);
      }

      // If we got less than PAGE_SIZE, there are no more scans
      setHasMore(newScans.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error loading scan history:', error);
    }
  }, []);

  const fetchScans = useCallback(async () => {
    try {
      const appState = await AppStateFns.getAppState();
      if (!appState?.currentDid) {
        setLoading(false);
        return;
      }

      setCurrentDid(appState.currentDid);
      await loadScans(appState.currentDid, 0, false);
    } catch (error) {
      console.error('Error fetching scans:', error);
    } finally {
      setLoading(false);
    }
  }, [loadScans]);

  useEffect(() => {
    fetchScans();
  }, [fetchScans]);

  const handleRefresh = useCallback(async () => {
    if (!currentDid) return;

    setRefreshing(true);
    try {
      await loadScans(currentDid, 0, false);
    } finally {
      setRefreshing(false);
    }
  }, [currentDid, loadScans]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !currentDid) return;

    setLoadingMore(true);
    try {
      await loadScans(currentDid, scans.length, true);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, currentDid, scans.length, loadScans]);

  const handleScanPress = useCallback(async (scan: ScanHistory) => {
    if (!currentDid) return;

    try {
      // Generate fresh ephemeral key pair for this WebView session
      const webViewPublicKey = await WebViewSigning.generateEphemeralKeyPair();

      navigation.navigate(Navigation.MODAL_STACK, {
        screen: Navigation.WEBVIEW_SCREEN,
        params: {
          url: scan.url,
          did: currentDid,
          webViewPublicKey,
        },
      });
    } catch (error) {
      console.error('Error generating ECDSA P-256 key pair:', error);
    }
  }, [currentDid, navigation]);

  const renderScanItem = ({ item }: { item: ScanHistory }) => {
    const hasManifest = item.name || item.icon;
    const displayName = item.name || 'Unknown';
    const displayLocation = item.location || '';
    const displayType = item.type || '';

    return (
      <TouchableOpacity
        style={styles.scanItem}
        onPress={() => handleScanPress(item)}
        activeOpacity={0.7}
      >
        <ThemedView style={styles.scanItemContent}>
          {/* Icon/Image */}
          <ThemedView style={styles.iconContainer}>
            {item.icon ? (
              <Image
                source={{ uri: item.icon }}
                style={styles.manifestIcon}
              />
            ) : (
              <Ionicons
                name={hasManifest ? "qr-code-outline" : "link-outline"}
                size={28}
                color={colors.text}
                style={{ opacity: 0.6 }}
              />
            )}
          </ThemedView>

          {/* Content */}
          <ThemedView style={styles.scanItemText}>
            <ThemedText style={styles.scanItemName} numberOfLines={1}>
              {displayName}
            </ThemedText>
            <ThemedText style={styles.scanItemTime}>
              {formatRelativeTime(new Date(item.createdAt))}
            </ThemedText>
          </ThemedView>

          {/* Chevron */}
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.text}
            style={{ opacity: 0.4 }}
          />
        </ThemedView>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <ThemedView style={styles.emptyState}>
      <Ionicons name="time-outline" size={64} color={colors.text} style={{ opacity: 0.3 }} />
      <ThemedText style={styles.emptyStateTitle}>No scan history yet</ThemedText>
      <ThemedText style={styles.emptyStateText}>
        Scan QR codes to see them here
      </ThemedText>
    </ThemedView>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;

    return (
      <ThemedView style={styles.footer}>
        <ActivityIndicator size="small" color={colors.tint} />
      </ThemedView>
    );
  };

  if (loading) {
    return (
      <Screen edges={['top', 'bottom']}>
        <ThemedView style={styles.headerButtons}>
          <HeaderCloseButton />
        </ThemedView>
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </ThemedView>
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <ThemedView style={styles.headerButtons}>
        <HeaderCloseButton />
      </ThemedView>

      <ThemedView style={styles.content}>
        <ThemedText type="title" style={styles.title}>History</ThemedText>

        <FlatList
          data={scans}
          renderItem={renderScanItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[
            styles.listContent,
            scans.length === 0 && styles.emptyListContent
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.tint}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
        />
      </ThemedView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerButtons: {
    gap: 12,
    marginTop: 10,
  },
  content: {
    flex: 1,
    marginTop: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  listContent: {
    paddingBottom: 40,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  scanItem: {
    marginBottom: 8,
  },
  scanItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  manifestIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  scanItemText: {
    flex: 1,
    gap: 2,
  },
  scanItemName: {
    fontSize: 16,
    fontWeight: '600',
  },
  scanItemMeta: {
    fontSize: 14,
    opacity: 0.6,
  },
  scanItemTime: {
    fontSize: 13,
    paddingTop: 4,
    opacity: 0.5,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    opacity: 0.6,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
