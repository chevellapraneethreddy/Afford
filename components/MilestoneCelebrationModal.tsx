import React from 'react';
import {
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  Flame,
  Heart,
  Share2,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react-native';
import { BrandColors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { FriendshipMilestone, UserProfile } from '@/types';

interface MilestoneCelebrationModalProps {
  visible: boolean;
  milestone: FriendshipMilestone | null;
  friend: UserProfile | null;
  onClose: () => void;
}

export const MilestoneCelebrationModal: React.FC<MilestoneCelebrationModalProps> = ({
  visible,
  milestone,
  friend,
  onClose,
}) => {
  const { colors, isDark } = useTheme();
  const { user, createStory } = useAuth();

  if (!milestone || !friend) return null;

  const getTierColors = (tier: string): readonly [string, string, ...string[]] => {
    switch (tier) {
      case 'diamond':
        return ['#38BDF8', '#818CF8', '#C084FC'] as const;
      case 'gold':
        return ['#F59E0B', '#FBBF24', '#D97706'] as const;
      case 'silver':
        return ['#94A3B8', '#CBD5E1', '#64748B'] as const;
      default:
        return ['#F97316', '#FB923C', '#C2410C'] as const;
    }
  };

  const tierColors = getTierColors(milestone.tier);

  // Next milestone calculation
  const getNextMilestoneDays = (current: number) => {
    if (current < 7) return 7;
    if (current < 30) return 30;
    if (current < 50) return 50;
    if (current < 100) return 100;
    return 365;
  };

  const nextDays = getNextMilestoneDays(milestone.days);
  const progressPercent = Math.min(100, Math.round((milestone.days / nextDays) * 100));

  const handleShareToStory = () => {
    createStory(
      friend.avatarUrl,
      `🔥 ${milestone.days} Day Streak Milestone with @${friend.username}! ${milestone.badge} ${milestone.title}`,
      false
    );
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? '#141624' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
            },
          ]}
        >
          {/* Radiant Background Aura */}
          <LinearGradient
            colors={[
              isDark ? 'rgba(245, 158, 11, 0.18)' : 'rgba(254, 243, 199, 0.7)',
              'transparent',
            ]}
            style={StyleSheet.absoluteFill}
          />

          {/* Close button */}
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeBtn, { backgroundColor: colors.inputBackground }]}
            accessibilityRole="button"
            accessibilityLabel="Close milestone celebration"
          >
            <X size={16} color={colors.text} />
          </TouchableOpacity>

          {/* Big Milestone Badge Ring */}
          <View style={styles.badgeWrapper}>
            <LinearGradient
              colors={tierColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.badgeOuterRing}
            >
              <View style={styles.badgeInnerCircle}>
                <Text style={styles.badgeEmoji}>{milestone.badge}</Text>
              </View>
            </LinearGradient>
            <View style={styles.trophyPill}>
              <Trophy size={11} color="#FFFFFF" />
              <Text style={styles.trophyPillText}>{milestone.tier.toUpperCase()}</Text>
            </View>
          </View>

          {/* Milestone Title & Days */}
          <View style={styles.titleSection}>
            <View style={styles.streakDaysRow}>
              <Flame size={20} color="#F59E0B" fill="#F59E0B" />
              <Text style={styles.streakDaysNumber}>{milestone.days} DAYS</Text>
            </View>
            <Text style={[styles.milestoneTitle, { color: colors.text }]}>
              {milestone.title}
            </Text>
            <Text style={[styles.milestoneDesc, { color: colors.textSecondary }]}>
              {milestone.description}
            </Text>
          </View>

          {/* Connected Friend Avatars */}
          <View style={styles.connectedAvatarsRow}>
            <View style={styles.avatarItem}>
              <Image
                source={{ uri: user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400' }}
                style={styles.avatarImg}
              />
              <Text style={[styles.avatarName, { color: colors.text }]}>You</Text>
            </View>

            <View style={styles.avatarConnector}>
              <LinearGradient
                colors={tierColors}
                style={styles.connectorLine}
              />
              <View style={[styles.connectorHeart, { backgroundColor: isDark ? '#141624' : '#FFFFFF' }]}>
                <Heart size={14} color="#FF4D8D" fill="#FF4D8D" />
              </View>
            </View>

            <View style={styles.avatarItem}>
              <Image
                source={{ uri: friend.avatarUrl }}
                style={styles.avatarImg}
              />
              <Text style={[styles.avatarName, { color: colors.text }]} numberOfLines={1}>
                {friend.displayName.split(' ')[0]}
              </Text>
            </View>
          </View>

          {/* Next Goal Progress Bar */}
          <View style={[styles.progressCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC' }]}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressTitle, { color: colors.textSecondary }]}>
                Next Milestone: {nextDays} Days
              </Text>
              <Text style={[styles.progressPercent, { color: colors.tint }]}>
                {milestone.days}/{nextDays}d
              </Text>
            </View>
            <View style={[styles.progressBarTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0' }]}>
              <LinearGradient
                colors={tierColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: `${progressPercent}%` }]}
              />
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleShareToStory}
              style={styles.primaryBtn}
            >
              <LinearGradient
                colors={BrandColors.coralGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.btnGradient}
              >
                <Share2 size={16} color="#FFFFFF" />
                <Text style={styles.btnText}>Share Achievement</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.secondaryBtn, { borderColor: colors.border }]}
            >
              <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Keep Connected 🔥</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 32,
    borderWidth: 1.5,
    padding: 24,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  closeBtn: {
    position: 'absolute',
    top: 18,
    right: 18,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  badgeWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 16,
    position: 'relative',
  },
  badgeOuterRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeInnerCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 42,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeEmoji: {
    fontSize: 40,
  },
  trophyPill: {
    position: 'absolute',
    bottom: -8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  trophyPillText: {
    color: '#F59E0B',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  streakDaysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  streakDaysNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 0.8,
  },
  milestoneTitle: {
    fontSize: 19,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
  },
  milestoneDesc: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  connectedAvatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 20,
    width: '100%',
  },
  avatarItem: {
    alignItems: 'center',
    gap: 4,
    width: 60,
  },
  avatarImg: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  avatarName: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  avatarConnector: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 30,
  },
  connectorLine: {
    width: '100%',
    height: 3,
    borderRadius: 1.5,
  },
  connectorHeart: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FF4D8D',
  },
  progressCard: {
    width: '100%',
    borderRadius: 16,
    padding: 12,
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 11,
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 11,
    fontWeight: '800',
  },
  progressBarTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  actionsRow: {
    width: '100%',
    gap: 10,
  },
  primaryBtn: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  btnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryBtn: {
    width: '100%',
    paddingVertical: 11,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
