import React, { useState } from 'react';
import {
  Image,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Bookmark, Heart, MessageCircle, MoreHorizontal, Send, ShieldCheck, Sparkles } from 'lucide-react-native';
import { BrandColors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Post } from '@/types';
import { CommentsSheet } from './CommentsSheet';

interface PostCardProps {
  post: Post;
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const { colors, isDark } = useTheme();
  const { toggleLikePost } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Heart pop animation on double tap
  const heartScale = useSharedValue(0);
  const likeBtnScale = useSharedValue(1);
  const lastTapRef = React.useRef<number>(0);

  const handleLikePress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}

    likeBtnScale.value = withSequence(
      withSpring(1.35),
      withSpring(1.0)
    );
    toggleLikePost(post.id);
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      if (!post.isLikedByMe) {
        toggleLikePost(post.id);
      }
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {}

      heartScale.value = withSequence(
        withSpring(1.3),
        withTiming(1, { duration: 150 }),
        withTiming(0, { duration: 250 })
      );
    }
    lastTapRef.current = now;
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this memory from ${post.user.displayName} on AFFORD: ${post.caption}`,
      });
    } catch (e) {
      // share fallback
    }
  };

  const handleSaveToggle = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    setIsSaved(!isSaved);
  };

  const animatedHeartStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: heartScale.value }],
      opacity: heartScale.value > 0 ? 1 : 0,
    };
  });

  const animatedLikeBtnStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: likeBtnScale.value }],
    };
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={styles.avatarWrapper}>
            <Image source={{ uri: post.user.avatarUrl }} style={styles.avatar} />
          </View>
          <View>
            <View style={styles.nameRow}>
              <Text style={[styles.displayName, { color: colors.text }]}>
                {post.user.displayName}
              </Text>
              {post.user.isVerified && (
                <ShieldCheck size={14} color="#3B82F6" />
              )}
              {post.isCloseFriendsOnly && (
                <View style={styles.closeFriendBadge}>
                  <Sparkles size={10} color="#10B981" />
                  <Text style={styles.closeFriendText}>Close Circle</Text>
                </View>
              )}
            </View>
            <Text style={[styles.username, { color: colors.textSecondary }]}>
              @{post.user.username}
            </Text>
          </View>
        </View>

        <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MoreHorizontal size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Media with Double-Tap detection */}
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={handleDoubleTap}
        style={styles.mediaContainer}
      >
        <Image source={{ uri: post.mediaUrl }} style={styles.mediaImage} />

        {/* Filter Badge overlay */}
        {post.filterName && post.filterName !== 'Original' && (
          <View style={styles.filterBadge}>
            <Sparkles size={11} color="#FFFFFF" />
            <Text style={styles.filterText}>{post.filterName}</Text>
          </View>
        )}

        {/* Double-tap animated heart */}
        <Animated.View style={[styles.doubleTapHeart, animatedHeartStyle]}>
          <LinearGradient
            colors={BrandColors.coralGradient}
            style={styles.doubleTapCircle}
          >
            <Heart size={52} color="#FFFFFF" fill="#FFFFFF" />
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>

      {/* Action Row */}
      <View style={styles.actionsRow}>
        <View style={styles.leftActions}>
          <TouchableOpacity
            onPress={handleLikePress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.actionBtn}
          >
            <Animated.View style={animatedLikeBtnStyle}>
              <Heart
                size={23}
                color={post.isLikedByMe ? '#F43F5E' : colors.text}
                fill={post.isLikedByMe ? '#F43F5E' : 'none'}
              />
            </Animated.View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowComments(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.actionBtn}
          >
            <MessageCircle size={23} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleShare}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.actionBtn}
          >
            <Send size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Vault / Bookmark */}
        <TouchableOpacity
          onPress={handleSaveToggle}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.actionBtn}
        >
          <Bookmark
            size={22}
            color={isSaved ? colors.tint : colors.text}
            fill={isSaved ? colors.tint : 'none'}
          />
        </TouchableOpacity>
      </View>

      {/* Likes Count & Details */}
      <View style={styles.detailsContainer}>
        <View style={styles.likesRow}>
          <Heart size={13} color="#F43F5E" fill="#F43F5E" />
          <Text style={[styles.likesText, { color: colors.text }]}>
            {post.likesCount.toLocaleString()} {post.likesCount === 1 ? 'connection' : 'connections'} liked
          </Text>
        </View>

        {/* Caption */}
        <View style={styles.captionContainer}>
          <Text
            style={[styles.captionText, { color: colors.text }]}
            numberOfLines={isExpanded ? undefined : 2}
          >
            <Text style={styles.captionUsername}>{post.user.displayName} </Text>
            {post.caption}
          </Text>
          {post.caption.length > 80 && !isExpanded && (
            <TouchableOpacity onPress={() => setIsExpanded(true)}>
              <Text style={[styles.moreText, { color: colors.textSecondary }]}>more</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Comments Link */}
        {post.commentsCount > 0 && (
          <TouchableOpacity
            onPress={() => setShowComments(true)}
            style={styles.commentsLink}
          >
            <Text style={[styles.commentsLinkText, { color: colors.textSecondary }]}>
              View all {post.commentsCount} reflections
            </Text>
          </TouchableOpacity>
        )}

        {/* Timestamp */}
        <Text style={[styles.timeText, { color: colors.textMuted }]}>
          {new Date(post.createdAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })}
        </Text>
      </View>

      {/* Comments Bottom Sheet */}
      <CommentsSheet
        visible={showComments}
        postId={post.id}
        onClose={() => setShowComments(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarWrapper: {
    padding: 1,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  displayName: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  closeFriendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  closeFriendText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
  },
  username: {
    fontSize: 12,
    marginTop: 1,
  },
  mediaContainer: {
    width: '100%',
    aspectRatio: 1,
    position: 'relative',
    backgroundColor: '#0A0A0F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  filterBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  filterText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '700',
  },
  doubleTapHeart: {
    position: 'absolute',
    zIndex: 10,
  },
  doubleTapCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F43F5E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionBtn: {
    padding: 2,
  },
  detailsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  likesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  likesText: {
    fontSize: 13,
    fontWeight: '800',
  },
  captionContainer: {
    marginBottom: 4,
  },
  captionText: {
    fontSize: 13.5,
    lineHeight: 19,
  },
  captionUsername: {
    fontWeight: '800',
  },
  moreText: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  commentsLink: {
    marginTop: 4,
    marginBottom: 2,
  },
  commentsLinkText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 10.5,
    marginTop: 4,
    letterSpacing: 0.2,
  },
});
