import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Flame, Heart, Sparkles } from 'lucide-react-native';
import { AffordHeader } from '@/components/AffordHeader';
import { DailyPromptCard } from '@/components/DailyPromptCard';
import { OnThisDayCard } from '@/components/OnThisDayCard';
import { PostCard } from '@/components/PostCard';
import { StoryCarousel } from '@/components/StoryCarousel';
import { WelcomeOnboardingModal } from '@/components/WelcomeOnboardingModal';
import { BrandColors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Post } from '@/types';

type FeedFilter = 'all' | 'close_circle' | 'favorites';

export default function HomeScreen() {
  const { colors, isDark } = useTheme();
  const { posts, user, onThisDayMemories, refreshPosts, refreshUsers } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FeedFilter>('all');
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('@afford_onboarding_shown').then((shown) => {
      if (!shown) {
        setShowWelcomeModal(true);
      }
    });
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshPosts?.(), refreshUsers?.()]);
    } catch {}
    setRefreshing(false);
  };

  const getGreeting = () => {
    try {
      const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
      const formatter = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        hour12: false,
        timeZone: userTimeZone,
      });
      const hour = parseInt(formatter.format(new Date()), 10);

      if (hour >= 4 && hour < 12) return 'Good morning';
      if (hour >= 12 && hour < 17) return 'Good afternoon';
      if (hour >= 17 && hour < 22) return 'Good evening';
      return 'Good night';
    } catch {
      const hour = new Date().getHours();
      if (hour >= 4 && hour < 12) return 'Good morning';
      if (hour >= 12 && hour < 17) return 'Good afternoon';
      if (hour >= 17 && hour < 22) return 'Good evening';
      return 'Good night';
    }
  };

  const filteredPosts = posts.filter((p) => {
    if (!p.mediaUrl || p.mediaUrl.includes('RmlsZSBub3QgZm91bmQ=') || p.mediaUrl.includes('File not found')) {
      return false;
    }
    if (p.mediaUrl.startsWith('file:') || p.mediaUrl.startsWith('content:')) {
      if (Platform.OS === 'web' || (user && p.userId !== user.id)) {
        return false;
      }
    }
    if (activeFilter === 'close_circle') return p.isCloseFriendsOnly;
    if (activeFilter === 'favorites') return p.isLikedByMe;
    return true;
  });

  const renderHeader = () => (
    <View>
      {/* Personalized Greeting with Emotional Connection Banner */}
      <View style={styles.greetingSection}>
        <View style={styles.greetingTextCol}>
          <Text style={[styles.greetingSubtitle, { color: colors.textSecondary }]}>
            {getGreeting()},
          </Text>
          <Text style={[styles.greetingTitle, { color: colors.text }]}>
            {user?.displayName || 'Friend'}
          </Text>
        </View>

        <View style={[styles.connectionStreakBadge, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : '#FEF3C7', borderColor: 'rgba(245, 158, 11, 0.3)' }]}>
          <Flame size={14} color="#F59E0B" fill="#F59E0B" />
          <Text style={[styles.streakBadgeText, { color: isDark ? '#FCD34D' : '#B45309' }]}>
            42 Day Bond
          </Text>
        </View>
      </View>

      {/* Stories Carousel */}
      <StoryCarousel />

      {/* Daily Connection Prompt */}
      <DailyPromptCard />

      {/* On This Day Nostalgic Memory */}
      {onThisDayMemories && onThisDayMemories.length > 0 && (
        <OnThisDayCard memory={onThisDayMemories[0]} />
      )}

      {/* Feed Filter Pills & Title */}
      <View style={styles.feedHeaderRow}>
        <View>
          <Text style={[styles.feedTitle, { color: colors.text }]}>Memories & Moments</Text>
          <Text style={[styles.feedCount, { color: colors.textMuted }]}>
            {filteredPosts.length} shared moments
          </Text>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterPillsRow}>
          <TouchableOpacity
            onPress={() => setActiveFilter('all')}
            style={[
              styles.filterPill,
              activeFilter === 'all'
                ? { backgroundColor: colors.tint }
                : { backgroundColor: colors.inputBackground, borderColor: colors.border },
            ]}
          >
            <Text
              style={[
                styles.filterPillText,
                { color: activeFilter === 'all' ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveFilter('close_circle')}
            style={[
              styles.filterPill,
              activeFilter === 'close_circle'
                ? { backgroundColor: '#10B981' }
                : { backgroundColor: colors.inputBackground, borderColor: colors.border },
            ]}
          >
            <Sparkles size={11} color={activeFilter === 'close_circle' ? '#FFFFFF' : '#10B981'} />
            <Text
              style={[
                styles.filterPillText,
                { color: activeFilter === 'close_circle' ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              Close Circle
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <AffordHeader />

      <FlatList
        data={filteredPosts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.postWrapper}>
            <PostCard post={item} />
          </View>
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyFeedBox}>
            <Sparkles size={36} color={colors.textMuted} />
            <Text style={[styles.emptyFeedTitle, { color: colors.text }]}>
              {activeFilter === 'close_circle'
                ? 'No Close Circle moments yet'
                : 'No memories to display'}
            </Text>
            <Text style={[styles.emptyFeedSubtitle, { color: colors.textSecondary }]}>
              {activeFilter === 'close_circle'
                ? 'Share a memory exclusive to your inner circle'
                : 'Connect with more friends or share your first memory!'}
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.tint}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Welcome Onboarding Modal for First-Time Experience */}
      <WelcomeOnboardingModal
        visible={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 110,
  },
  greetingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  greetingTextCol: {
    flex: 1,
  },
  greetingSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  greetingTitle: {
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: -0.3,
    marginTop: 2,
  },
  connectionStreakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  streakBadgeText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  feedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 10,
  },
  feedTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  feedCount: {
    fontSize: 12,
    marginTop: 1,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  filterPillText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  postWrapper: {
    paddingHorizontal: 16,
  },
  emptyFeedBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyFeedTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 6,
  },
  emptyFeedSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
