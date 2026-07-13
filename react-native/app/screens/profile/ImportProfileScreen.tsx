import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  Screen,
  ThemedView,
  ThemedText,
  ThemedButton,
  ThemedTextInput,
  HeaderCloseButton,
} from '../../components/ui';
import { ProfileAvatar, SocialIcon } from '../../components/profile';
import { Colors, Navigation, ProfileTransfer, ProfileTransferIO } from '../../../lib';

// A scanned profile arrives ready to parse, so the choose UI would only flash before the
// preview replaces it.
type Stage = 'loading' | 'choose' | 'preview';

type ImportRoute = RouteProp<
  Navigation.ModalStackParamList,
  typeof Navigation.IMPORT_PROFILE_SCREEN
>;

export function ImportProfileScreen() {
  const navigation = useNavigation<
    Navigation.ModalStackNavigationProp<typeof Navigation.IMPORT_PROFILE_SCREEN>
  >();
  const route = useRoute<ImportRoute>();
  const colors = Colors[useColorScheme() ?? 'light'];

  const scannedPayload = route.params?.payload;

  const [stage, setStage] = useState<Stage>(() => (route.params?.payload ? 'loading' : 'choose'));
  const [pasted, setPasted] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [preview, setPreview] = useState<ProfileTransfer.ImportPreview | null>(null);

  // The parsed profile holds a plaintext private key. Keep it out of React state (and so
  // out of state snapshots and dev tools). No unmount cleanup: Fast Refresh and StrictMode
  // re-run effect cleanups while state (and the preview UI) survives, which would leave the
  // Import button wired to a null ref — and on a real unmount the ref is unreachable anyway.
  const parsedRef = useRef<ProfileTransfer.ExportedProfile | null>(null);

  /** Reports whether the text was a profile, so a caller can decide where to go next. */
  const accept = useCallback(async (raw: string): Promise<boolean> => {
    const result = ProfileTransfer.parseExportedProfile(raw);

    if (!result.valid || !result.profile) {
      setErrors(result.errors);
      return false;
    }

    setErrors([]);
    parsedRef.current = result.profile;
    setPreview(await ProfileTransfer.getImportPreview(result.profile));
    setStage('preview');
    return true;
  }, []);

  // A profile QR code scanned by the camera hands its raw text over as a route param. That
  // text holds a plaintext private key and navigation state lives as long as the stack
  // does, so read it exactly once and clear it straight back off the route.
  const consumedScanRef = useRef(false);
  useEffect(() => {
    if (!scannedPayload || consumedScanRef.current) return;

    consumedScanRef.current = true;
    navigation.setParams({ payload: undefined });

    setIsBusy(true);
    accept(scannedPayload)
      // accept() only sets errors when it fails, so without this a bad scan would sit on
      // the loading stage forever instead of showing the user what was wrong with it.
      .then((ok) => {
        if (!ok) setStage('choose');
      })
      .finally(() => setIsBusy(false));
  }, [scannedPayload, navigation, accept]);

  // Continue sits just under the paste box, so once the keyboard is up it can fall below the
  // fold. Scroll it back into view — after a beat, so the KeyboardAvoidingView has already
  // shrunk the viewport and we aren't scrolling against the old, taller one.
  const scrollRef = useRef<ScrollView>(null);
  const handlePasteFocus = () => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
  };

  const handleChooseFile = async () => {
    Keyboard.dismiss();
    setIsBusy(true);
    try {
      const text = await ProfileTransferIO.pickProfileFile();
      if (text !== null) {
        await accept(text);
      }
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "Couldn't read that file."]);
    } finally {
      setIsBusy(false);
    }
  };

  const handlePaste = async () => {
    Keyboard.dismiss();
    setIsBusy(true);
    try {
      await accept(pasted);
    } finally {
      setIsBusy(false);
    }
  };

  const commit = async () => {
    const profile = parsedRef.current;
    if (!profile || !preview) {
      // Should be unreachable, but never dead-end: send the user back to reload the file.
      reset();
      setErrors(['Something went wrong reading this profile. Please load it again.']);
      return;
    }

    setIsBusy(true);
    try {
      await ProfileTransfer.importProfile(profile, {
        replaceExisting: preview.existingName !== null,
        setAsCurrent: true,
      });

      parsedRef.current = null;
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error) {
      const message =
        error instanceof ProfileTransfer.ProfileTransferError
          ? error.message
          : "Couldn't import this profile.";
      Alert.alert('Import failed', message);
    } finally {
      setIsBusy(false);
    }
  };

  const handleImport = () => {
    if (!preview) return;

    if (preview.existingName !== null) {
      Alert.alert(
        'Replace this profile?',
        `"${preview.existingName}" is already on this device. Importing will overwrite its name, avatar and social links with the ones in this file.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Replace', style: 'destructive', onPress: commit },
        ]
      );
      return;
    }

    commit();
  };

  const reset = () => {
    parsedRef.current = null;
    setPreview(null);
    setErrors([]);
    setPasted('');
    setStage('choose');
  };

  const renderErrors = () =>
    errors.length === 0 ? null : (
      <ThemedView style={[styles.errorBox, { borderColor: colors.notification }]}>
        <Ionicons name="alert-circle-outline" size={20} color={colors.notification} />
        <ThemedView style={styles.errorList}>
          {errors.map((error) => (
            <ThemedText key={error} style={styles.errorText}>
              {error}
            </ThemedText>
          ))}
        </ThemedView>
      </ThemedView>
    );

  const renderLoading = () => (
    <ThemedView style={styles.loading}>
      <ActivityIndicator />
      <ThemedText style={styles.instruction}>Reading the scanned profile…</ThemedText>
    </ThemedView>
  );

  const renderChoose = () => (
    <>
      <ThemedText style={styles.instruction}>
        Import a profile from a file:
      </ThemedText>

      {renderErrors()}

      <ThemedButton title="Choose a file" onPress={handleChooseFile} loading={isBusy} />

      <ThemedText style={styles.pasteLabel}>Or paste the profile export here:</ThemedText>
      <ThemedTextInput
        value={pasted}
        onChangeText={setPasted}
        placeholder='{"type":"local-first-auth:export", ...}'
        multiline
        autoCapitalize="none"
        autoCorrect={false}
        onFocus={handlePasteFocus}
        style={[styles.pasteInput, { borderColor: colors.border }]}
      />
      <ThemedButton
        title="Continue"
        variant="secondary"
        onPress={handlePaste}
        disabled={pasted.trim().length === 0 || isBusy}
      />
    </>
  );

  const renderPreview = () => {
    if (!preview) return null;

    return (
      <>
        {preview.existingName !== null && (
          <ThemedView style={[styles.errorBox, { borderColor: colors.notification }]}>
            <Ionicons name="warning-outline" size={20} color={colors.notification} />
            <ThemedView style={styles.errorList}>
              <ThemedText style={styles.errorText}>
                &quot;{preview.existingName}&quot; is already on this device. Importing will overwrite its
                name, avatar and social links.
              </ThemedText>
            </ThemedView>
          </ThemedView>
        )}

        <ThemedView style={[styles.card, { borderColor: colors.border }]}>
          <ProfileAvatar avatar={preview.avatar} name={preview.name} size={72} />
          <ThemedText style={styles.previewName}>{preview.name}</ThemedText>
          <ThemedText style={styles.previewDid} numberOfLines={1} ellipsizeMode="middle">
            {preview.did}
          </ThemedText>

          {preview.socialLinks.length > 0 && (
            <ThemedView style={styles.socialRow}>
              {preview.socialLinks.map((link) => (
                <SocialIcon key={`${link.platform}-${link.handle}`} platform={link.platform} size={24} />
              ))}
            </ThemedView>
          )}

          {preview.skippedSocials > 0 && (
            <ThemedText style={styles.note}>
              {preview.skippedSocials} link{preview.skippedSocials === 1 ? '' : 's'} in this file
              {preview.skippedSocials === 1 ? " isn't" : " aren't"} supported and will be skipped.
            </ThemedText>
          )}
        </ThemedView>

        <ThemedButton
          title={preview.existingName !== null ? 'Replace profile' : 'Import profile'}
          onPress={handleImport}
          loading={isBusy}
        />
        <ThemedButton
          title="Choose a different file"
          variant="secondary"
          onPress={reset}
          disabled={isBusy}
        />
      </>
    );
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <ThemedView style={styles.headerButtons}>
        <HeaderCloseButton />
      </ThemedView>

      {/* `padding` on both platforms — not just iOS. The manifest's adjustResize would normally
          shrink the window on Android, but `edgeToEdgeEnabled` defeats it: the IME dispatches
          insets instead of resizing, so without an explicit behavior nothing moves out of the
          keyboard's way. No vertical offset: this screen is a sheet inside a `presentation:
          'modal'` stack, so it doesn't span the window. */}
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <ThemedView style={styles.content}>
            <ThemedText type="title" style={styles.title}>
              Import Profile
            </ThemedText>
            {stage === 'loading' && renderLoading()}
            {stage === 'choose' && renderChoose()}
            {stage === 'preview' && renderPreview()}
          </ThemedView>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerButtons: {
    gap: 12,
    marginTop: 10,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 32,
    gap: 12,
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  instruction: {
    fontSize: 15,
    lineHeight: 21,
    opacity: 0.7,
    marginBottom: 8,
  },
  loading: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 48,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  errorList: {
    flex: 1,
    gap: 4,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
  },
  pasteLabel: {
    fontSize: 14,
    opacity: 0.6,
    marginTop: 12,
  },
  // A fixed height, so a multi-KB export scrolls inside the box instead of growing the box.
  pasteInput: {
    height: 100,
    fontSize: 13,
  },
  card: {
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  previewName: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 4,
  },
  previewDid: {
    fontSize: 12,
    opacity: 0.5,
    maxWidth: '100%',
  },
  socialRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginTop: 8,
  },
  note: {
    fontSize: 12,
    opacity: 0.6,
    textAlign: 'center',
    marginTop: 4,
  },
});
