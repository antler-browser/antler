import React, { useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Platform,
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LocalStorage } from '../../../lib';

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
}

interface ProfileCardProps {
  profile: LocalStorage.UserProfile;
  onPress: () => void;
  index: number;
  scrollX: Animated.Value;
  isActive?: boolean;
}

const ProfileCard: React.FC<ProfileCardProps> = ({
  profile,
  onPress,
  index,
  scrollX,
}) => {
  const getUserInitial = () => {
    if (!profile?.name) return '?';
    return profile.name.charAt(0).toUpperCase();
  };

  // Simple scale and opacity animations based on scroll position
  const inputRange = [
    (index - 1) * CARD_TOTAL_WIDTH,
    index * CARD_TOTAL_WIDTH,
    (index + 1) * CARD_TOTAL_WIDTH,
  ];


  const opacity = scrollX.interpolate({
    inputRange,
    outputRange: [0.6, 1, 0.6],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={[
      styles.cardContainer,
      { opacity }
    ]}>
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={styles.profileCardContent}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getUserInitial()}</Text>
          </View>
          <Text style={styles.profileName} numberOfLines={1}>
            {profile?.name || 'User'}
          </Text>
          {/* {isActive && (
            <View style={styles.activeIndicator}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            </View>
          )} */}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

interface AddProfileCardProps {
  onPress: () => void;
}

const AddProfileCard: React.FC<AddProfileCardProps> = ({onPress}) => {
  return (
    <View style={styles.cardContainer}>
      <TouchableOpacity
        style={[styles.card, styles.addCard]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={styles.addCardContent}>
          <Ionicons name="add-circle-outline" size={48} color="white" />
          <Text style={styles.addText}>Add Profile</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export const ProfileCarousel: React.FC<ProfileCarouselProps> = ({
  profiles,
  currentIndex,
  onProfileChange,
  onAddProfile,
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
    if (index !== currentIndex && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        x: index * CARD_TOTAL_WIDTH,
        animated: true,
      });
      onProfileChange(index);
    }
  }, [currentIndex, onProfileChange]);

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
              onPress={() => handleProfilePress(index)}
            />
          ))}
          {profiles.length > 0 && (
            <AddProfileCard onPress={onAddProfile}/>
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Darker background for better visibility
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  addCard: {
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  profileCardContent: {
    alignItems: 'center',
    width: '100%',
  },
  addCardContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarText: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
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
