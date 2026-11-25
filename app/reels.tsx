import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ArrowLeft, Heart, MessageCircle, Music, Send, ShieldCheck, UserCheck, UserPlus, Video, Volume2, VolumeX } from 'lucide-react-native';
import { BrandColors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';

interface ViewableItemInfo {
  item: any;
  key: string;
  index?: number | null;
  isViewable: boolean;
}

function ReelVideoPlayer({
  videoUrl,
  isPlaying,
  isMuted,
}: {
  videoUrl: string;
  isPlaying: boolean;
  isMuted: boolean;
}) {
  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = true;
    p.muted = isMuted;
    if (isPlaying) {
      p.play();
    } else {
      p.pause();
    }
  });

  useEffect(() => {
    player.muted = isMuted;
  }, [player, isMuted]);

  useEffect(() => {
    if (isPlaying) {
      player.play();
    } else {
      player.pause();
    }
  }, [player, isPlaying]);

  return (
    <VideoView
      player={player}
      style={styles.fullVideo}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

export default function ReelsScreen() {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const reelWidth = Platform.OS === 'web' ? Math.min(windowWidth, 600) : windowWidth;
  const reelHeight = windowHeight;
  const { followingIds, toggleFollow, posts, toggleLikePost } = useAuth();
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});

  const reelItems = React.useMemo(() => {
    return (posts || [])
      .filter((p) => p.mediaType === 'video' && p.mediaUrl)
      .map((p) => ({
        id: p.id,
        videoUrl: p.mediaUrl,
        thumbnailUrl: p.mediaUrl,
        caption: p.caption || '',
        likesCount: p.likesCount,
        commentsCount: p.commentsCount,
        sharesCount: p.sharesCount,
        musicTrack: `Original Audio · ${p.user?.displayName || 'Member'}`,
        creator: {
          id: p.user?.id || p.userId,
          username: p.user?.username || 'member',
          displayName: p.user?.displayName || 'Afford Member',
          avatarUrl: p.user?.avatarUrl || '',
          isVerified: p.user?.isVerified || false,
        },
      }));
  }, [posts]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: Array<any> }) => {
    if (viewableItems && viewableItems.length > 0 && typeof viewableItems[0].index === 'number') {
      setActiveVideoIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 70,
  }).current;

  const handleToggleLike = (reelId: string) => {
    setLikedMap((prev) => ({
      ...prev,
      [reelId]: !prev[reelId],
    }));
    toggleLikePost(reelId);
  };

  const handleShare = async (caption: string) => {
    try {
      await Share.share({
        message: `Watch this moment on AFFORD: ${caption}`,
      });
    } catch (e) {
      // fallback
    }
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const isPlaying = index === activeVideoIndex;
    const isLiked = Boolean(likedMap[item.id]);
    const isFollowing = followingIds.includes(item.creator.id);

    return (
      <View style={[styles.reelItemContainer, { width: reelWidth, height: reelHeight }]}>
        {/* Background Video */}
        {isPlaying ? (
          <ReelVideoPlayer
            videoUrl={item.videoUrl}
            isPlaying={isPlaying}
            isMuted={isMuted}
          />
        ) : (
          <Image source={{ uri: item.thumbnailUrl }} style={styles.fullVideo} />
        )}

        <View style={styles.overlayGradient} />

        {/* Right Floating Actions (Like, Comment, Share, Sound) */}
        <View style={styles.rightActionsCol}>
          {/* Like */}
          <TouchableOpacity
            onPress={() => handleToggleLike(item.id)}
            style={styles.actionBtn}
          >
            <Heart
              size={30}
              color={isLiked ? '#F43F5E' : '#FFFFFF'}
              fill={isLiked ? '#F43F5E' : 'none'}
            />
            <Text style={styles.actionCount}>
              {item.likesCount + (isLiked ? 1 : 0)}
            </Text>
          </TouchableOpacity>

          {/* Comment */}
          <TouchableOpacity style={styles.actionBtn}>
            <MessageCircle size={30} color="#FFFFFF" />
            <Text style={styles.actionCount}>{item.commentsCount}</Text>
          </TouchableOpacity>

          {/* Share */}
          <TouchableOpacity onPress={() => handleShare(item.caption)} style={styles.actionBtn}>
            <Send size={28} color="#FFFFFF" />
            <Text style={styles.actionCount}>{item.sharesCount}</Text>
          </TouchableOpacity>

          {/* Mute Toggle */}
          <TouchableOpacity onPress={() => setIsMuted(!isMuted)} style={styles.actionBtn}>
            {isMuted ? <VolumeX size={26} color="#FFFFFF" /> : <Volume2 size={26} color="#FFFFFF" />}
          </TouchableOpacity>
        </View>

        {/* Bottom Details (Creator, Caption, Audio) */}
        <View style={styles.bottomDetails}>
          {/* Creator Pill */}
          <View style={styles.creatorRow}>
            <Image source={{ uri: item.creator.avatarUrl }} style={styles.creatorAvatar} />
            <Text style={styles.creatorName}>{item.creator.displayName}</Text>
            {item.creator.isVerified && <ShieldCheck size={14} color="#3B82F6" />}

            <TouchableOpacity
              onPress={() => toggleFollow(item.creator.id)}
              style={[styles.followBtn, isFollowing && styles.followingBtn]}
            >
              <Text style={styles.followBtnText}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Caption */}
          <Text style={styles.captionText}>{item.caption}</Text>

          {/* Audio track info */}
          <View style={styles.audioRow}>
            <Music size={14} color="#FFFFFF" />
            <Text style={styles.audioText} numberOfLines={1}>
              {item.soundTitle}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Back Navigation Header */}
      <SafeAreaView style={styles.topHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Moments & Reels</Text>
        <View style={{ width: 24 }} />
      </SafeAreaView>

      {reelItems.length === 0 ? (
        <View style={[styles.emptyContainer, { width: reelWidth, height: reelHeight }]}>
          <LinearGradient
            colors={BrandColors.coralGradient}
            style={styles.emptyIconCircle}
          >
            <Video size={36} color="#FFFFFF" />
          </LinearGradient>
          <Text style={styles.emptyTitle}>No Moments Yet</Text>
          <Text style={styles.emptySubtitle}>
            Be the first to share an authentic video moment with friends.
          </Text>
          <TouchableOpacity
            style={styles.createReelBtn}
            onPress={() => router.push('/(tabs)/create')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={BrandColors.primaryGradient}
              style={styles.createReelGradient}
            >
              <Text style={styles.createReelText}>+ Create Video Moment</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={reelItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={reelHeight}
          snapToAlignment="start"
          decelerationRate="fast"
          contentContainerStyle={Platform.OS === 'web' ? { alignItems: 'center' } : undefined}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  reelItemContainer: {
    position: 'relative',
    backgroundColor: '#000',
  },
  fullVideo: {
    ...StyleSheet.absoluteFill,
  },
  overlayGradient: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  rightActionsCol: {
    position: 'absolute',
    right: 14,
    bottom: 110,
    alignItems: 'center',
    gap: 20,
    zIndex: 20,
  },
  actionBtn: {
    alignItems: 'center',
    gap: 4,
  },
  actionCount: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
  },
  bottomDetails: {
    position: 'absolute',
    left: 16,
    right: 80,
    bottom: 40,
    zIndex: 20,
    gap: 8,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  creatorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  creatorName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  followBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#F43F5E',
  },
  followingBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  followBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  captionText: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 18,
  },
  audioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
    maxWidth: '90%',
  },
  audioText: {
    color: '#FFFFFF',
    fontSize: 11,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#0A0C14',
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  createReelBtn: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  createReelGradient: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createReelText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
