import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  Platform,
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
import { useVideoPlayer, VideoView } from 'expo-video';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Bookmark, Heart, Image as ImageIcon, MessageCircle, MoreHorizontal, Send, ShieldCheck, Sparkles, Video, Volume2, VolumeX } from 'lucide-react-native';
import { BrandColors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Post } from '@/types';
import { CommentsSheet } from './CommentsSheet';

const NativePostVideo: React.FC<{ uri: string; isVisible?: boolean }> = ({ uri, isVisible = true }) => {
  const [isMuted, setIsMuted] = useState(true);
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.volume = 1.0;
    if (isVisible) {
      p.play();
    } else {
      p.pause();
    }
  });

  useEffect(() => {
    if (!player) return;
    if (isVisible) {
      player.play();
    } else {
      player.pause();
      player.muted = true;
    }
  }, [player, isVisible]);

  useEffect(() => {
    return () => {
      try {
        player?.pause();
        if (player) {
          player.muted = true;
        }
      } catch {}
    };
  }, [player]);

  const toggleMute = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setIsMuted((prev) => {
      const next = !prev;
      if (player) {
        player.muted = next;
      }
      return next;
    });
  };

  return (
    <View style={styles.mediaImage}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
      />
      <TouchableOpacity
        onPress={toggleMute}
        style={styles.soundButton}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={isMuted ? 'Unmute video' : 'Mute video'}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        {isMuted ? (
          <VolumeX size={18} color="#FFFFFF" />
        ) : (
          <Volume2 size={18} color="#FFFFFF" />
        )}
      </TouchableOpacity>
    </View>
  );
};

const PostVideoPlayer: React.FC<{ uri: string; isVisible?: boolean }> = ({ uri, isVisible = true }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || !videoRef.current) return;
    if (isVisible) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isVisible]);

  if (Platform.OS === 'web') {
    return (
      <View style={{ width: '100%', height: '100%', position: 'relative' }}>
        {/* @ts-ignore */}
        <video
          ref={videoRef}
          src={uri}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          controls
          playsInline
          loop
          autoPlay={isVisible}
        />
      </View>
    );
  }

  return <NativePostVideo uri={uri} isVisible={isVisible} />;
};

interface PostCardProps {
  post: Post;
  isVisible?: boolean;
}

const PostCardComponent: React.FC<PostCardProps> = ({ post, isVisible = true }) => {
  const { colors, isDark } = useTheme();
  const { toggleLikePost } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [post.mediaUrl]);

  // Heart pop animation on double tap
  const heartScale = useSharedValue(0);
  const likeBtnScale = useSharedValue(1);
  const lastTapRef = React.useRef<number>(0);

  const handleLikePress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}

    try {
      likeBtnScale.value = withSequence(
        withSpring(1.35),
        withSpring(1.0)
      );
    } catch (e) {}
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
    setIsSaved((prev) => !prev);
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
        <TouchableOpacity
          style={styles.userInfo}
          activeOpacity={0.8}
          onPress={() => {
            if (post.user?.id) {
              router.push({ pathname: '/user/[id]', params: { id: post.user.id } } as any);
            }
          }}
          accessibilityRole="button"
          accessibilityLabel={`View profile of ${post.user.displayName}`}
        >
          <View style={styles.avatarWrapper}>
            {post.user.avatarUrl && !post.user.avatarUrl.includes('534528741775') ? (
              <Image source={{ uri: post.user.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.inputBackground, alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.tint }}>
                  {(post.user.displayName || 'A').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
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
                  <Text style={styles.closeFriendText}>Close Circle</Text>
                </View>
              )}
            </View>
            <Text style={[styles.username, { color: colors.textSecondary }]}>
              @{post.user.username}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MoreHorizontal size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Media with Double-Tap detection */}
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={handleDoubleTap}
        style={[styles.mediaContainer, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}
      >
        {!imageError && post.mediaUrl && !post.mediaUrl.includes('RmlsZSBub3QgZm91bmQ=') && !post.mediaUrl.includes('File not found') && !(Platform.OS === 'web' && post.mediaUrl.startsWith('file://')) ? (
          post.mediaType === 'video' ? (
            <PostVideoPlayer uri={post.mediaUrl} isVisible={isVisible} />
          ) : (
            <Image
              source={{ uri: post.mediaUrl }}
              style={styles.mediaImage}
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
          )
        ) : (
          <View style={styles.mediaFallback}>
            <LinearGradient
              colors={['#1E1B4B', '#0F172A']}
              style={styles.fallbackGradient}
            >
              <Sparkles size={36} color={BrandColors.primaryCoral} />
              <Text style={styles.fallbackTitle}>
                {post.user?.displayName || 'Memory'}
              </Text>
              {post.caption ? (
                <Text style={styles.fallbackCaption} numberOfLines={2}>
                  {post.caption}
                </Text>
              ) : null}
            </LinearGradient>
          </View>
        )}

        {/* Filter Badge overlay */}
        {post.filterName && post.filterName !== 'Original' && (
          <View style={styles.filterBadge}>
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
            accessibilityRole="button"
            accessibilityLabel="Comments"
          >
            <MessageCircle size={23} color={colors.text} strokeWidth={1.8} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleShare}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.actionBtn}
            accessibilityRole="button"
            accessibilityLabel="Share"
          >
            <Send size={22} color={colors.text} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>

        {/* Bookmark / Save */}
        <TouchableOpacity
          onPress={handleSaveToggle}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.actionBtn}
          accessibilityRole="button"
          accessibilityLabel="Save memory"
        >
          <Bookmark
            size={23}
            color={isSaved ? (colors.text || '#0F172A') : colors.text}
            fill={isSaved ? (colors.text || '#0F172A') : 'none'}
            strokeWidth={1.8}
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

export const PostCard = React.memo(PostCardComponent, (prev, next) => {
  return (
    prev.post.id === next.post.id &&
    prev.post.likesCount === next.post.likesCount &&
    prev.post.isLikedByMe === next.post.isLikedByMe &&
    prev.post.commentsCount === next.post.commentsCount &&
    prev.post.mediaUrl === next.post.mediaUrl &&
    prev.isVisible === next.isVisible
  );
});

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
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  soundButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 18,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    elevation: 5,
  },
  mediaFallback: {
    width: '100%',
    height: '100%',
  },
  fallbackGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  fallbackTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 6,
  },
  fallbackCaption: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
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
