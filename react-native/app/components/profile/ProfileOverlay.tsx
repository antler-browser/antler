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
import { LocalStorage } from '../../../lib';
import { ProfileAvatar } from './ProfileAvatar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.8;
const CARD_HEIGHT = 110;
const CARD_MARGIN = 10;
const CARD_TOTAL_WIDTH = CARD_WIDTH + CARD_MARGIN * 2;
  
interface ProfileCardProps {
  profile: LocalStorage.UserProfile;
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
            style={styles.avatarMargin}
          />
          <Text style={styles.profileName} numberOfLines={1}>
            {profile?.name || 'User'}
          </Text>
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
    backgroundColor: 'rgba(255, 0, 102, 0.5)',
  },
  addCard: {
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
});