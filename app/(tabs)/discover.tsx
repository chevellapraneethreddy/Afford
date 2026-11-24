import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Compass, Flame, Heart, MessageSquare, Play, Search, ShieldCheck, UserCheck, UserPlus, Users, X } from 'lucide-react-native';
import { AffordHeader } from '@/components/AffordHeader';
import { BrandColors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { DISCOVER_CREATORS, SHORT_VIDEOS } from '../../lib/mockData';
import { UserProfile } from '@/types';

const DISCOVERY_TOPICS = [
  { label: 'All Vibes', key: 'all' },
  { label: '🎬 Moments', key: 'moments' },
  { label: '❤️ Close Circles', key: 'circle' },
  { label: '📸 Visual Poetry', key: 'art' },
  { label: '☕ Reflections', key: 'reflections' },
];

export default function DiscoverScreen() {
  const { colors, isDark } = useTheme();
  const {
    followingIds,
    toggleFollow,
    posts,
    allUsers,
    user: currentUser,
    startConversation,
    refreshUsers,
    searchUsers,
  } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearchingDb, setIsSearchingDb] = useState(false);
  const [dbResults, setDbResults] = useState<UserProfile[]>([]);
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    refreshUsers();
  }, [refreshUsers]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshUsers();
    setIsRefreshing(false);
  };

  // 1. Smooth real-time debounce: 200ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 2. Query Supabase database live whenever debounced query updates
  useEffect(() => {
    let isCurrent = true;
    const clean = debouncedQuery.replace(/^@/, '').trim();
    if (!clean) {
      setDbResults([]);
      setIsSearchingDb(false);
      return;
    }

    setIsSearchingDb(true);
    searchUsers(clean)
      .then((results) => {
        if (isCurrent) {
          setDbResults(results);
          setIsSearchingDb(false);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setIsSearchingDb(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [debouncedQuery, searchUsers]);

  const isSearching = searchQuery.trim().length > 0;
  const cleanSearchTerm = searchQuery.trim().replace(/^@/, '').toLowerCase();

  // 3. Combine live Supabase results with instant local matches
  const filteredCreators = useMemo(() => {
    if (!isSearching) {
      // In browse mode: show suggested creators (excluding yourself)
      return (allUsers || []).filter((u) => u.id !== currentUser?.id);
    }

    const map = new Map<string, UserProfile>();

    // Database results take priority
    dbResults.forEach((u) => map.set(u.id, u));

    // Immediate local match so results render with zero latency while typing
    (allUsers || []).forEach((u) => {
      const d = (u.displayName || '').toLowerCase();
      const un = (u.username || '').toLowerCase();
      const bio = (u.bio || '').toLowerCase();
      if (d.includes(cleanSearchTerm) || un.includes(cleanSearchTerm) || bio.includes(cleanSearchTerm)) {
        if (!map.has(u.id)) {
          map.set(u.id, u);
        }
      }
    });

    return Array.from(map.values());
  }, [isSearching, cleanSearchTerm, dbResults, allUsers, currentUser?.id]);

  const matchingPosts = useMemo(() => {
    if (!isSearching) return posts;
    return posts.filter((p) => {
      const cap = (p.caption || '').toLowerCase();
      const dName = (p.user?.displayName || '').toLowerCase();
      const uName = (p.user?.username || '').toLowerCase();
      return cap.includes(cleanSearchTerm) || dName.includes(cleanSearchTerm) || uName.includes(cleanSearchTerm);
    });
  }, [isSearching, cleanSearchTerm, posts]);

  const renderCreatorCard = (creator: UserProfile) => {
    const isFollowing = followingIds.includes(creator.id);
    const isMe = creator.id === currentUser?.id;

    return (
      <View
        key={creator.id}
        style={[
          styles.creatorCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.creatorProfileTouchable}
          activeOpacity={0.8}
          onPress={() => {
            router.push({
              pathname: '/user/[id]',
              params: { id: creator.id },
            } as any);
          }}
          accessibilityRole="button"
          accessibilityLabel={`View profile of ${creator.displayName}`}
        >
          <LinearGradient
            colors={BrandColors.coralGradient}
            style={styles.creatorAvatarRing}
          >
            <View style={[styles.creatorAvatar, { backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }]}>
              {creator.avatarUrl ? (
                <Image source={{ uri: creator.avatarUrl }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.tint }}>
                  {(creator.displayName || creator.username || 'A').charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
          </LinearGradient>

          <View style={styles.creatorInfo}>
            <View style={styles.creatorNameRow}>
              <Text style={[styles.creatorName, { color: colors.text }]}>
                {creator.displayName}
              </Text>
              {creator.isVerified && (
                <ShieldCheck size={14} color="#3B82F6" />
              )}
            </View>
            <Text style={[styles.creatorHandle, { color: colors.textSecondary }]}>
              @{creator.username}
            </Text>
            <Text style={[styles.creatorBio, { color: colors.textMuted }]} numberOfLines={2}>
              {creator.bio || 'Connecting on AFFORD.'}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.creatorButtonsRow}>
          {isMe ? (
            <View style={styles.youBadgePill}>
              <Text style={styles.youBadgeText}>You</Text>
            </View>
          ) : (
            <>
              {/* Message Button */}
              <TouchableOpacity
                onPress={() => {
                  const convId = startConversation(creator);
                  router.push({
                    pathname: '/chat/[id]',
                    params: { id: convId },
                  });
                }}
                style={[
                  styles.creatorMsgBtn,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.border,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Message ${creator.displayName}`}
              >
                <MessageSquare size={15} color={colors.text} />
              </TouchableOpacity>

              {/* Follow / Connect Button */}
              <TouchableOpacity
                onPress={() => toggleFollow(creator.id)}
                style={[
                  styles.followBtn,
                  {
                    backgroundColor: isFollowing ? colors.inputBackground : colors.tint,
                    borderColor: isFollowing ? colors.border : 'transparent',
                  },
                ]}
              >
                {isFollowing ? (
                  <>
                    <UserCheck size={14} color={colors.textSecondary} />
                    <Text style={[styles.followBtnText, { color: colors.textSecondary }]}>Connected</Text>
                  </>
                ) : (
                  <>
                    <UserPlus size={14} color="#FFFFFF" />
                    <Text style={[styles.followBtnText, { color: '#FFFFFF' }]}>Connect</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <AffordHeader />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.tint}
            colors={[colors.tint]}
          />
        }
      >
        {/* Search Bar */}
        <View style={[styles.searchBar, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            placeholder="Search by name or @username..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.searchInput, { color: colors.text }]}
          />
          {isSearchingDb && (
            <ActivityIndicator size="small" color={colors.tint} style={{ marginRight: 6 }} />
          )}
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {isSearching ? (
          /* Live Search Results View: Accounts & Members on top */
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <LinearGradient
                  colors={BrandColors.coralGradient}
                  style={styles.sectionMiniIcon}
                >
                  <Users size={11} color="#FFFFFF" />
                </LinearGradient>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Accounts & Members ({filteredCreators.length})
                </Text>
                {isSearchingDb && (
                  <Text style={{ fontSize: 12, color: colors.tint, marginLeft: 8, fontWeight: '600' }}>
                    • Searching live...
                  </Text>
                )}
              </View>
            </View>

            {filteredCreators.length > 0 ? (
              <View style={styles.creatorsList}>
                {filteredCreators.map(renderCreatorCard)}
              </View>
            ) : (
              <View style={styles.searchEmptyBox}>
                <Users size={34} color={colors.textMuted} />
                <Text style={[styles.searchEmptyTitle, { color: colors.text }]}>
                  No members found for "{searchQuery}"
                </Text>
                <Text style={[styles.searchEmptySub, { color: colors.textSecondary }]}>
                  Check spelling or try searching another name or handle.
                </Text>
              </View>
            )}

            {matchingPosts.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <LinearGradient
                      colors={BrandColors.coralGradient}
                      style={styles.sectionMiniIcon}
                    >
                      <Heart size={11} color="#FFFFFF" fill="#FFFFFF" />
                    </LinearGradient>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      Matching Memories ({matchingPosts.length})
                    </Text>
                  </View>
                </View>

                <View style={styles.gridContainer}>
                  {matchingPosts.map((p, idx) => (
                    <TouchableOpacity
                      key={`grid_${p.id}_${idx}`}
                      activeOpacity={0.85}
                      onPress={() => router.push('/(tabs)')}
                      style={[
                        styles.gridItem,
                        idx % 7 === 0 && styles.gridItemLarge,
                      ]}
                    >
                      <Image source={{ uri: p.mediaUrl }} style={styles.gridImage} />
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.5)']}
                        style={styles.gridItemOverlay}
                      >
                        <View style={styles.gridLikesRow}>
                          <Heart size={11} color="#FFFFFF" fill="#FFFFFF" />
                          <Text style={styles.gridLikesText}>{p.likesCount}</Text>
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </>
        ) : (
          /* Normal Browse View */
          <>
            {/* Discovery Topic Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.topicsScroll}
            >
              {DISCOVERY_TOPICS.map((topic) => {
                const isSelected = selectedTopic === topic.key;
                return (
                  <TouchableOpacity
                    key={topic.key}
                    onPress={() => setSelectedTopic(topic.key)}
                    style={[
                      styles.topicPill,
                      isSelected
                        ? { backgroundColor: colors.tint }
                        : { backgroundColor: colors.inputBackground, borderColor: colors.border },
                    ]}
                  >
                    <Text
                      style={[
                        styles.topicPillText,
                        { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                      ]}
                    >
                      {topic.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Short Moments & Reels Horizontal Strip */}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <LinearGradient
                  colors={BrandColors.coralGradient}
                  style={styles.sectionMiniIcon}
                >
                  <Play size={11} color="#FFFFFF" fill="#FFFFFF" />
                </LinearGradient>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Moments & Stories
                </Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/reels')}>
                <Text style={[styles.viewAllText, { color: colors.tint }]}>Watch All Reels →</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.reelsRow}
            >
              {SHORT_VIDEOS.map((video) => (
                <TouchableOpacity
                  key={video.id}
                  activeOpacity={0.88}
                  onPress={() => router.push('/reels')}
                  style={styles.reelCard}
                >
                  <Image source={{ uri: video.thumbnailUrl }} style={styles.reelThumbnail} />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.85)']}
                    style={styles.reelGradientOverlay}
                  >
                    <View style={styles.playIconCircle}>
                      <Play size={13} color="#FFFFFF" fill="#FFFFFF" />
                    </View>
                    <Text style={styles.reelCaption} numberOfLines={2}>
                      {video.caption}
                    </Text>
                    <Text style={styles.reelAuthor}>
                      @{video.creator.username}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Suggested Creators / Friends Section */}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <LinearGradient
                  colors={BrandColors.coralGradient}
                  style={styles.sectionMiniIcon}
                >
                  <Users size={11} color="#FFFFFF" />
                </LinearGradient>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  People You May Resonate With
                </Text>
              </View>
            </View>

            <View style={styles.creatorsList}>
              {filteredCreators.map(renderCreatorCard)}
            </View>

            {/* Trending Visuals Grid */}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <LinearGradient
                  colors={BrandColors.coralGradient}
                  style={styles.sectionMiniIcon}
                >
                  <Heart size={11} color="#FFFFFF" fill="#FFFFFF" />
                </LinearGradient>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Trending Visual Memories
                </Text>
              </View>
            </View>

            <View style={styles.gridContainer}>
              {posts.map((p, idx) => (
                <TouchableOpacity
                  key={`grid_${p.id}_${idx}`}
                  activeOpacity={0.85}
                  onPress={() => router.push('/(tabs)')}
                  style={[
                    styles.gridItem,
                    idx % 7 === 0 && styles.gridItemLarge,
                  ]}
                >
                  <Image source={{ uri: p.mediaUrl }} style={styles.gridImage} />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.5)']}
                    style={styles.gridItemOverlay}
                  >
                    <View style={styles.gridLikesRow}>
                      <Heart size={11} color="#FFFFFF" fill="#FFFFFF" />
                      <Text style={styles.gridLikesText}>{p.likesCount}</Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    paddingBottom: 40,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  topicsScroll: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 8,
  },
  topicPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  topicPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionMiniIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  viewAllText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  reelsRow: {
    paddingHorizontal: 16,
    gap: 12,
  },
  reelCard: {
    width: 140,
    height: 210,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0A0A0F',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  reelThumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  reelGradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    justifyContent: 'flex-end',
    padding: 10,
  },
  playIconCircle: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reelCaption: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
    marginBottom: 2,
  },
  reelAuthor: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '600',
  },
  creatorsList: {
    paddingHorizontal: 16,
    gap: 10,
  },
  creatorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  creatorAvatarRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  creatorAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  creatorProfileTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  creatorButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  creatorMsgBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  creatorInfo: {
    flex: 1,
  },
  creatorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  creatorName: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  creatorHandle: {
    fontSize: 11.5,
    marginTop: 1,
  },
  creatorBio: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 3,
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  followBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  youBadgePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
  },
  youBadgeText: {
    color: '#F43F5E',
    fontSize: 12,
    fontWeight: '800',
  },
  searchEmptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
    gap: 8,
  },
  searchEmptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  searchEmptySub: {
    fontSize: 12.5,
    textAlign: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    gap: 8,
  },
  gridItem: {
    width: '31.3%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0F121C',
  },
  gridItemLarge: {
    width: '64.6%',
    aspectRatio: 1,
  },
  gridImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gridItemOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 6,
    alignItems: 'flex-start',
  },
  gridLikesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gridLikesText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
