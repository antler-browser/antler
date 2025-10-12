import React, { useCallback, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Platform,
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Animated,
} from 'react-native';
import { LocalStorage } from '../../../lib';
import { ProfileCard, AddProfileCard } from './ProfileOverlay';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.8;
const CARD_HEIGHT = 110;
const CARD_MARGIN = 10;
const CARD_TOTAL_WIDTH = CARD_WIDTH + CARD_MARGIN * 2;
const CAROUSEL_HEIGHT = SCREEN_HEIGHT * 0.75;

interface ProfileCarouselProps {
  profiles: LocalStorage.UserProfile[];
  currentIndex: number;
  onProfileChange: (index: number) => void;
  onAddProfile: () => void;
  onViewProfile: (profile: LocalStorage.UserProfile) => void;
}

export const ProfileCarousel: React.FC<ProfileCarouselProps> = ({
  profiles,
  currentIndex,
  onProfileChange,
  onAddProfile,
  onViewProfile,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  // Handle scroll end to update current profile
  const handleScrollEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / CARD_TOTAL_WIDTH);

    if (index >= 0 && index < profiles.length) {
      onProfileChange(index);
    }
  }, [profiles.length, onProfileChange]);

  // Handle profile card tap
  const handleProfilePress = useCallback((index: number) => {
    if (index === currentIndex) {
      // Tapping the current profile opens the profile view
      onViewProfile(profiles[index]);
    } else if (scrollViewRef.current) {
      // Tapping a different profile scrolls to it
      scrollViewRef.current.scrollTo({
        x: index * CARD_TOTAL_WIDTH,
        animated: true,
      });
      onProfileChange(index);
    }
  }, [currentIndex, onProfileChange, onViewProfile, profiles]);

  // Scroll to current index when it changes externally
  useEffect(() => {
    if (scrollViewRef.current && currentIndex >= 0) {
      scrollViewRef.current.scrollTo({
        x: currentIndex * CARD_TOTAL_WIDTH,
        animated: false,
      });
      // Also update the animated value
      scrollX.setValue(currentIndex * CARD_TOTAL_WIDTH);
    }
  }, [currentIndex, scrollX]);

  return (
    <View style={[styles.container]} pointerEvents="box-none">
      <View style={styles.overlay}>
        <Animated.ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_TOTAL_WIDTH}
          decelerationRate="fast"
          contentContainerStyle={[styles.scrollContent, { alignItems: 'flex-end' }]}
          style={styles.scrollView}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: true }
          )}
          onMomentumScrollEnd={handleScrollEnd}
          scrollEventThrottle={16}
        >
          {profiles.map((profile, index) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              index={index}
              scrollX={scrollX}
              isActive={index === currentIndex}
              onPress={() => handleProfilePress(index)}
            />
          ))}
          {profiles.length > 0 && (
            <AddProfileCard
              index={profiles.length}
              scrollX={scrollX}
              onPress={onAddProfile}
              isActive={profiles.length === currentIndex}
            />
          )}
        </Animated.ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: CAROUSEL_HEIGHT,
    marginBottom: 16,
  },
  overlay: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1, // Lighter shadow
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: (SCREEN_WIDTH - CARD_WIDTH) / 2,
    height: CAROUSEL_HEIGHT,
    paddingBottom: 20,
  },
  cardContainer: {
    marginHorizontal: CARD_MARGIN,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  profileCardContent: {
    alignItems: 'center',
    width: '100%',
  },
  addCardContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMargin: {
    marginBottom: 8,
  },
  profileName: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  addText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  activeIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
});
