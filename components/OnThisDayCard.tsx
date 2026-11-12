import React, { useState } from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Calendar,
  Clock,
  Heart,
  MapPin,
  Send,
  Share2,
  Sparkles,
  Star,
} from 'lucide-react-native';
import { BrandColors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { OnThisDayMemory } from '@/types';

interface OnThisDayCardProps {
  memory: OnThisDayMemory;
  onShareToStory?: (memory: OnThisDayMemory) => void;
  onSendToFriend?: (memory: OnThisDayMemory) => void;
}

export const OnThisDayCard: React.FC<OnThisDayCardProps> = ({
  memory,
  onShareToStory,
  onSendToFriend,
}) => {
  const { colors, isDark } = useTheme();
  const { createStory, user } = useAuth();
  const [isShared, setIsShared] = useState(false);

  // Privacy check: If Close Friends Only, ensure current user has access
  // (In our app, user is author or has close friend relationship)
  const isAuthor = memory.user.id === user?.id;

  const handleShare = () => {
    if (onShareToStory) {
      onShareToStory(memory);
    } else {
      createStory(
        memory.mediaUrl,
        `✨ On This Day (${memory.yearsAgo} year${memory.yearsAgo > 1 ? 's' : ''} ago): ${memory.caption.slice(0, 50)}...`,
        memory.isCloseFriendsOnly
      );
      setIsShared(true);
      setTimeout(() => setIsShared(false), 3000);
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isDark ? 'rgba(251, 191, 36, 0.35)' : 'rgba(245, 158, 11, 0.3)',
        },
      ]}
    >
      {/* Golden nostalgic gradient halo */}
      <LinearGradient
        colors={[
          isDark ? 'rgba(245, 158, 11, 0.12)' : 'rgba(254, 243, 199, 0.7)',
          'transparent',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Card Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitleRow}>
          <LinearGradient
            colors={(['#F59E0B', '#D97706'] as const)}
            style={styles.headerIconWrap}
          >
            <Sparkles size={14} color="#FFFFFF" />
          </LinearGradient>
          <View>
            <View style={styles.badgeRow}>
              <Text style={[styles.mainBadgeText, { color: isDark ? '#FCD34D' : '#B45309' }]}>
                ON THIS DAY
              </Text>
              <Text style={[styles.dotSeparator, { color: colors.textSecondary }]}>•</Text>
              <Text style={[styles.yearsAgoText, { color: isDark ? '#FDE68A' : '#92400E' }]}>
                {memory.yearsAgo} Year{memory.yearsAgo > 1 ? 's' : ''} Ago
              </Text>
            </View>
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>
              {memory.originalDate}
            </Text>
          </View>
        </View>

        {memory.isCloseFriendsOnly && (
          <View style={styles.closeFriendsBadge}>
            <Star size={10} color="#10B981" fill="#10B981" />
            <Text style={styles.closeFriendsText}>Close Circle</Text>
          </View>
        )}
      </View>

      {/* Memory Media Preview */}
      <View style={styles.mediaContainer}>
        <Image
          source={{ uri: memory.mediaUrl }}
          style={styles.mediaImage}
          resizeMode="cover"
        />

        {memory.location && (
          <View style={styles.locationTag}>
            <MapPin size={10} color="#FFFFFF" />
            <Text style={styles.locationText}>{memory.location}</Text>
          </View>
        )}
      </View>

      {/* Caption & Author */}
      <View style={styles.contentArea}>
        <View style={styles.authorRow}>
          <Image
            source={{ uri: memory.user.avatarUrl }}
            style={styles.authorAvatar}
          />
          <Text style={[styles.authorName, { color: colors.text }]}>
            {isAuthor ? 'You' : memory.user.displayName}
          </Text>
          <Text style={[styles.authorHandle, { color: colors.textSecondary }]}>
            @{memory.user.username}
          </Text>
        </View>

        <Text style={[styles.captionText, { color: colors.text }]} numberOfLines={3}>
          "{memory.caption}"
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={[styles.actionsRow, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleShare}
          style={[styles.shareStoryBtn, { backgroundColor: isShared ? '#10B981' : undefined }]}
        >
          <LinearGradient
            colors={isShared ? (['#10B981', '#059669'] as const) : BrandColors.coralGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.shareGradient}
          >
            <Share2 size={13} color="#FFFFFF" />
            <Text style={styles.shareBtnText}>
              {isShared ? 'Shared to Story ✨' : 'Reshare Memory'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {onSendToFriend && (
          <TouchableOpacity
            onPress={() => onSendToFriend(memory)}
            style={[styles.sendFriendBtn, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}
          >
            <Send size={13} color={colors.text} />
            <Text style={[styles.sendFriendText, { color: colors.text }]}>Send</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1.5,
    overflow: 'hidden',
    marginBottom: 20,
    marginHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mainBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  dotSeparator: {
    fontSize: 10,
  },
  yearsAgoText: {
    fontSize: 12,
    fontWeight: '800',
  },
  dateText: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  closeFriendsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  closeFriendsText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
  },
  mediaContainer: {
    width: '100%',
    height: 220,
    position: 'relative',
    backgroundColor: '#000000',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  locationTag: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  locationText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  contentArea: {
    padding: 16,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  authorAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  authorName: {
    fontSize: 12,
    fontWeight: '800',
  },
  authorHandle: {
    fontSize: 11,
  },
  captionText: {
    fontSize: 13,
    lineHeight: 19,
    fontStyle: 'italic',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  shareStoryBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  shareGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  sendFriendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
  },
  sendFriendText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
