import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserProfile, SocialLinks } from '../../../lib';
import { ProfileAvatar } from './ProfileAvatar';
import { SocialIcon } from './SocialIcon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.8;
const CARD_HEIGHT = 110;
const CARD_MARGIN = 10;
const CARD_TOTAL_WIDTH = CARD_WIDTH + CARD_MARGIN * 2;

interface ProfileCardProps {
  profile: UserProfile;
  onPress: () => void;
  index: number;
  scrollX: Animated.Value;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  profile,
  onPress,
  index,
  scrollX,
}) => {
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
        style={[styles.card, styles.profileCard]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={styles.profileCardContent}>
          <ProfileAvatar
            avatar={profile.avatar}
            name={profile.name}
            size={64}
          />
          <View style={styles.textContainer}>
            <Text style={styles.profileName} numberOfLines={1}>
              {profile.name}
            </Text>
            {profile.socialLinks && profile.socialLinks.length > 0 && (
              <View style={styles.socialIconsContainer}>
                {profile.socialLinks.map((social, index) => (
                  <View key={`${social.platform}-${index}`} style={styles.socialIconWrapper}>
                    <SocialIcon
                      platform={social.platform as SocialLinks.SocialPlatform}
                      size={16}
                      color="rgba(255, 255, 255, 0.9)"
                    />
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

interface AddProfileCardProps {
  index: number;
  scrollX: Animated.Value;
  onPress: () => void;
}

export const AddProfileCard: React.FC<AddProfileCardProps> = ({index, scrollX, onPress}) => {
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
        style={[styles.card, styles.addCard]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={styles.addCardContent}>
          <Ionicons name="add-circle-outline" size={48} color="white" />
          <Text style={styles.addText}>Add Profile</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: CARD_MARGIN,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  addCard: {
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  profileCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 12,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  socialIconsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
    rowGap: 6,
  },
  socialIconWrapper: {
    opacity: 0.9,
  },
  addCardContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMargin: {
    marginBottom: 12,
  },
  profileName: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  internalDescription: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    marginTop: 2,
  },
  addText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
});