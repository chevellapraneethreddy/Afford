import React, { useState } from 'react';
import {
  FlatList,
  Image,
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
import { Compass, Flame, Heart, Play, Search, ShieldCheck, Sparkles, UserCheck, UserPlus, X } from 'lucide-react-native';
import { AffordHeader } from '@/components/AffordHeader';
import { BrandColors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { DISCOVER_CREATORS, SHORT_VIDEOS } from '../../lib/mockData';
import { UserProfile } from '@/types';

const DISCOVERY_TOPICS = [
  { label: '✨ All Vibes', key: 'all' },
  { label: '🎬 Moments', key: 'moments' },
  { label: '❤️ Close Circles', key: 'circle' },
  { label: '📸 Visual Poetry', key: 'art' },
  { label: '☕ Reflections', key: 'reflections' },
];

export default function DiscoverScreen() {
  const { colors, isDark } = useTheme();
  const { followingIds, toggleFollow, posts } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('all');

  // Filter public creators based on query (excluding private accounts unless already followed)
  const filteredCreators = DISCOVER_CREATORS.filter((creator) => {
    if (creator.isPrivate && !followingIds.includes(creator.id)) {
      return false;
    }
    const match =
      creator.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      creator.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (creator.bio && creator.bio.toLowerCase().includes(searchQuery.toLowerCase()));
    return match;
  });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <AffordHeader />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        {/* Search Bar */}
        <View style={[styles.searchBar, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            placeholder="Search connections, creators, memories..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.text }]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

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
              colors={['#8B5CF6', '#6D28D9']}
              style={styles.sectionMiniIcon}
            >
              <Sparkles size={11} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              People You May Resonate With
            </Text>
          </View>
        </View>

        <View style={styles.creatorsList}>
          {filteredCreators.map((creator) => {
            const isFollowing = followingIds.includes(creator.id);

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
                <LinearGradient
                  colors={BrandColors.coralGradient}
                  style={styles.creatorAvatarRing}
                >
                  <Image source={{ uri: creator.avatarUrl }} style={styles.creatorAvatar} />
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
                    {creator.bio}
                  </Text>
                </View>

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
              </View>
            );
          })}
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
