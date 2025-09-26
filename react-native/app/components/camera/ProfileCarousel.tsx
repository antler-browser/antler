import React, { useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Platform,
  Vibration,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  SharedValue,
} from 'react-native-reanimated';
import { LocalStorage } from '../../../lib';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = 120;
const CARD_HEIGHT = 160;
const CARD_MARGIN = 10;

interface ProfileCarouselProps {
  profiles: LocalStorage.UserProfile[];
  activeProfileIndex: number;
  onProfileSelect: (index: number) => void;
  onAddProfile: () => void;
}

interface ProfileCardProps {
  profile?: LocalStorage.UserProfile;
  isAdd?: boolean;
  isActive: boolean;
  onPress: () => void;
  index: number;
  scrollX: SharedValue<number>;
}

const ProfileCard: React.FC<ProfileCardProps> = ({
  profile,
  isAdd,
  isActive,
  onPress,
  index,
  scrollX,
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * (CARD_WIDTH + CARD_MARGIN * 2),
      index * (CARD_WIDTH + CARD_MARGIN * 2),
      (index + 1) * (CARD_WIDTH + CARD_MARGIN * 2),
    ];

    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.85, 1, 0.85],
      'clamp'
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.6, 1, 0.6],
      'clamp'
    );

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const getUserInitial = () => {
    if (!profile?.name) return '?';
    return profile.name.charAt(0).toUpperCase();
  };

  return (
    <Animated.View style={[styles.cardContainer, animatedStyle]}>
      <TouchableOpacity
        style={[
          styles.card,
          isActive && styles.activeCard,
          isAdd && styles.addCard,
        ]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        {isAdd ? (
          <View style={styles.addCardContent}>
            <Ionicons name="add-circle-outline" size={48} color="white" />
            <Text style={styles.addText}>Add Profile</Text>
          </View>
        ) : (
          <View style={styles.profileCardContent}>
            <View style={[styles.avatar, isActive && styles.activeAvatar]}>
              <Text style={styles.avatarText}>{getUserInitial()}</Text>
            </View>
            <Text style={styles.profileName} numberOfLines={1}>
              {profile?.name || 'User'}
            </Text>
            {isActive && (
              <View style={styles.activeIndicator}>
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

export function ProfileCarousel({
  profiles,
  activeProfileIndex,
  onProfileSelect,
  onAddProfile,
}: ProfileCarouselProps) {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollX = useSharedValue(0);

  const handleScroll = useCallback((event: any) => {
    scrollX.value = event.nativeEvent.contentOffset.x;
  }, []);

  const handleMomentumScrollEnd = useCallback((event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (CARD_WIDTH + CARD_MARGIN * 2));

    if (index < profiles.length && index !== activeProfileIndex) {
      if (Platform.OS === 'ios') {
        Vibration.vibrate(1);
      }
      onProfileSelect(index);
    }
  }, [profiles.length, activeProfileIndex, onProfileSelect]);

  useEffect(() => {
    // Scroll to active profile when it changes
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        x: activeProfileIndex * (CARD_WIDTH + CARD_MARGIN * 2),
        animated: true,
      });
    }
  }, [activeProfileIndex]);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.overlay}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          snapToInterval={CARD_WIDTH + CARD_MARGIN * 2}
          decelerationRate="fast"
          onScroll={handleScroll}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          scrollEventThrottle={16}
        >
          {profiles.map((profile, index) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              isActive={index === activeProfileIndex}
              onPress={() => onProfileSelect(index)}
              index={index}
              scrollX={scrollX}
            />
          ))}
          <ProfileCard
            isAdd
            isActive={false}
            onPress={onAddProfile}
            index={profiles.length}
            scrollX={scrollX}
          />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  scrollContent: {
    paddingHorizontal: (SCREEN_WIDTH - CARD_WIDTH) / 2,
  },
  cardContainer: {
    marginHorizontal: CARD_MARGIN,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeCard: {
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
  },
  addCard: {
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'transparent',
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  activeAvatar: {
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
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