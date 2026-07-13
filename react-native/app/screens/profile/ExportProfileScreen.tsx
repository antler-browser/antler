import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, ThemedView, ThemedText, HeaderCloseButton } from '../../components/ui';
import { ProfileAvatar } from '../../components/profile';
import { Colors, ProfileTransfer, ProfileTransferIO, UserProfile, UserProfileFns } from '../../../lib';

const EXPORT_WARNING_TITLE = 'Export this profile?';
const EXPORT_WARNING_BODY =
  'The exported file contains your private key in plain text. Anyone who opens it can permanently act as you.\n\n' +
  'Only send it to yourself — AirDrop it to your other device, or save it to a password manager. Never post it anywhere public.';

export function ExportProfileScreen() {
  const colors = Colors[useColorScheme() ?? 'light'];

  const [profiles, setProfiles] = useState<Partial<UserProfile>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyDid, setBusyDid] = useState<string | null>(null);

  // If a previous run was killed mid-share, a file holding a private key may still be in
  // the cache. Clear it before we write another one.
  useEffect(() => {
    ProfileTransferIO.sweepStaleExports();
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      UserProfileFns.getAllProfiles()
        .then((result) => {
          if (active) setProfiles(result);
        })
        .finally(() => {
          if (active) setIsLoading(false);
        });

      return () => {
        active = false;
      };
    }, [])
  );

  const runExport = async (did: string, deliver: (json: string) => Promise<void>) => {
    setBusyDid(did);
    try {
      const exported = await ProfileTransfer.buildExportedProfile(did);
      await deliver(ProfileTransfer.serializeExportedProfile(exported));
    } catch (error) {
      // Report the message only. The profile object holds a plaintext private key and
      // must never reach a log.
      const message =
        error instanceof ProfileTransfer.ProfileTransferError
          ? error.message
          : "Couldn't export this profile.";
      Alert.alert('Export failed', message);
    } finally {
      setBusyDid(null);
    }
  };

  const confirmThenExport = (did: string, deliver: (json: string) => Promise<void>, confirmLabel: string) => {
    Alert.alert(EXPORT_WARNING_TITLE, EXPORT_WARNING_BODY, [
      { text: 'Cancel', style: 'cancel' },
      { text: confirmLabel, style: 'destructive', onPress: () => runExport(did, deliver) },
    ]);
  };

  const handleShare = (did: string) => {
    confirmThenExport(
      did,
      (json) => ProfileTransferIO.shareExportedProfile(json, ProfileTransfer.getDefaultExportFileName(did)),
      'Export'
    );
  };

  const handleCopy = (did: string) => {
    confirmThenExport(
      did,
      async (json) => {
        await ProfileTransferIO.copyExportedProfile(json);
        Alert.alert(
          'Copied',
          'Your profile is on the clipboard. Other apps can read the clipboard — paste it where you need it and then copy something else.'
        );
      },
      'Copy'
    );
  };

  const renderProfile = (profile: Partial<UserProfile>) => {
    const did = profile.did!;
    const isBusy = busyDid === did;

    return (
      <ThemedView key={did} style={[styles.profileRow, { borderColor: colors.border }]}>
        <TouchableOpacity
          style={styles.profileMain}
          onPress={() => handleShare(did)}
          disabled={isBusy}
          activeOpacity={0.7}
        >
          <ProfileAvatar avatar={profile.avatar} name={profile.name} size={44} />
          <ThemedView style={styles.profileText}>
            <ThemedText style={styles.profileName}>{profile.name}</ThemedText>
            <ThemedText style={styles.profileDid} numberOfLines={1} ellipsizeMode="middle">
              {did}
            </ThemedText>
          </ThemedView>
          {isBusy ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Ionicons name="share-outline" size={22} color={colors.text} style={{ opacity: 0.7 }} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.copyButton}
          onPress={() => handleCopy(did)}
          disabled={isBusy}
          activeOpacity={0.7}
        >
          <Ionicons name="copy-outline" size={16} color={colors.text} style={{ opacity: 0.6 }} />
          <ThemedText style={styles.copyText}>Copy as JSON</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <ThemedView style={styles.headerButtons}>
        <HeaderCloseButton />
      </ThemedView>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.content}>
          <ThemedText type="title" style={styles.title}>
            Export Profile
          </ThemedText>

          <ThemedView style={[styles.warning, { borderColor: colors.notification }]}>
            <Ionicons name="warning-outline" size={20} color={colors.notification} />
            <ThemedText style={styles.warningText}>
              An exported profile contains your private key. Anyone who opens the file can act as you.
            </ThemedText>
          </ThemedView>

          {isLoading ? (
            <ActivityIndicator style={styles.loading} color={colors.text} />
          ) : profiles.length === 0 ? (
            <ThemedText style={styles.empty}>
              You don&apos;t have any profiles to export yet.
            </ThemedText>
          ) : (
            <>
              <ThemedText style={styles.instruction}>
                Choose the profile you want to export.
              </ThemedText>
              {profiles.map(renderProfile)}
            </>
          )}
        </ThemedView>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerButtons: {
    gap: 12,
    marginTop: 10,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  instruction: {
    fontSize: 14,
    opacity: 0.6,
    marginBottom: 12,
  },
  loading: {
    marginTop: 24,
  },
  empty: {
    fontSize: 15,
    opacity: 0.6,
    marginTop: 12,
  },
  profileRow: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  profileMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  profileText: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
  },
  profileDid: {
    fontSize: 12,
    opacity: 0.5,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  copyText: {
    fontSize: 13,
    opacity: 0.6,
  },
});
