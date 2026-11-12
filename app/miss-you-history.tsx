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
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Flame,
  Heart,
  Sparkles,
  Users,
} from 'lucide-react-native';
import { BrandColors } from '../constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { MissYouEvent } from '@/types';

type FilterType = 'all' | 'received' | 'sent';

export default function MissYouHistoryScreen() {
  const { colors, isDark } = useTheme();
  const {
    user,
    missYouHistory,
    fetchMissYouHistory,
    todayMissYouSentCount,
    todayMissYouReceivedCount,
    conversations,
  } = useAuth();

  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  useEffect(() => {
    fetchMissYouHistory();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchMissYouHistory();
    setIsRefreshing(false);
  };

  // Filtered events
  const filteredEvents = missYouHistory.filter((ev) => {
    if (activeFilter === 'received') return ev.recipientId === user?.id;
    if (activeFilter === 'sent') return ev.senderId === user?.id;
    return true;
  });

  // Mutual friends list
  const mutualConversations = conversations.filter((c) => c.isMutualMissYou && c.otherUser);

  const formatTimestamp = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMinutes = Math.floor(diffMs / (60 * 1000));
      const diffHours = Math.floor(diffMs / (3600 * 1000));

      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      if (diffHours < 24 && date.getDate() === now.getDate()) {
        return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }
      if (diffHours < 48) {
        return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Recently';
    }
  };

  const renderEventItem = ({ item }: { item: MissYouEvent }) => {
    const isSentByMe = item.senderId === user?.id;
    const otherUser = isSentByMe ? item.recipient : item.sender;

    return (
      <View
        style={[
          styles.eventCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.eventLeft}>
          {/* Direction Indicator Avatar Halo */}
          <View style={styles.avatarWrapper}>
            <LinearGradient
              colors={
                isSentByMe
                  ? BrandColors.coralGradient
                  : (['#A855F7', '#EC4899'] as const)
              }
              style={styles.avatarGradientRing}
            >
              <View style={styles.avatarInner}>
                <Heart
                  size={14}
                  color="#FFFFFF"
                  fill="#FFFFFF"
                />
              </View>
            </LinearGradient>
            <View
              style={[
                styles.directionBadge,
                {
                  backgroundColor: isSentByMe ? '#FF4D8D' : '#8B5CF6',
                },
              ]}
            >
              {isSentByMe ? (
                <ArrowUpRight size={10} color="#FFFFFF" strokeWidth={3} />
              ) : (
                <ArrowDownLeft size={10} color="#FFFFFF" strokeWidth={3} />
              )}
            </View>
          </View>

          {/* Details */}
          <View style={styles.eventTextGroup}>
            <View style={styles.eventTitleRow}>
              <Text style={[styles.eventName, { color: colors.text }]}>
                {otherUser?.displayName || 'Friend'}
              </Text>
              {item.isToday && (
                <View
                  style={[
                    styles.todayPill,
                    {
                      backgroundColor: isDark
                        ? 'rgba(255, 77, 141, 0.2)'
                        : 'rgba(255, 77, 141, 0.12)',
                    },
                  ]}
                >
                  <Text style={styles.todayPillText}>Today</Text>
                </View>
              )}
            </View>

            <Text style={[styles.eventSubtitle, { color: colors.textSecondary }]}>
              {isSentByMe
                ? `You sent a Miss You signal`
                : `${otherUser?.displayName?.split(' ')[0] || 'Friend'} sent you a Miss You`}
            </Text>

            <Text style={[styles.eventTimestamp, { color: colors.textSecondary }]}>
              {formatTimestamp(item.createdAt)}
            </Text>
          </View>
        </View>

        {/* Quick Chat Shortcut */}
        {item.conversationId && (
          <TouchableOpacity
            onPress={() => {
              router.push({
                pathname: '/chat/[id]',
                params: { id: item.conversationId },
              });
            }}
            style={[
              styles.chatShortcutBtn,
              {
                backgroundColor: isDark
                  ? 'rgba(255, 77, 141, 0.15)'
                  : 'rgba(255, 77, 141, 0.08)',
                borderColor: isDark ? 'rgba(255, 77, 141, 0.3)' : 'rgba(255, 77, 141, 0.2)',
              },
            ]}
          >
            <Text style={styles.chatShortcutText}>Chat</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleGroup}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Miss You Signals</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Connection History & Mutual Bonds
          </Text>
        </View>

        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => item.id}
        renderItem={renderEventItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.tint}
          />
        }
        ListHeaderComponent={
          <>
            {/* Summary Statistics Card */}
            <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <LinearGradient
                colors={['rgba(255, 77, 141, 0.12)', 'rgba(168, 85, 247, 0.06)']}
                style={StyleSheet.absoluteFill}
              />

              <View style={styles.statsCardHeader}>
                <View style={styles.statsCardTitleRow}>
                  <LinearGradient
                    colors={BrandColors.coralGradient}
                    style={styles.statsMiniIcon}
                  >
                    <Heart size={14} color="#FFFFFF" fill="#FFFFFF" />
                  </LinearGradient>
                  <Text style={[styles.statsCardTitle, { color: colors.text }]}>
                    Miss You Activity
                  </Text>
                </View>
                <Text style={[styles.statsLiveBadge, { color: colors.tint }]}>Live Stats</Text>
              </View>

              <View style={styles.statsGrid}>
                {/* Today Sent */}
                <View style={[styles.statBox, { borderRightColor: colors.border, borderBottomColor: colors.border }]}>
                  <Text style={[styles.statNumber, { color: '#FF4D8D' }]}>
                    {todayMissYouSentCount}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    Sent Today
                  </Text>
                </View>

                {/* Today Received */}
                <View style={[styles.statBox, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.statNumber, { color: '#A855F7' }]}>
                    {todayMissYouReceivedCount}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    Received Today
                  </Text>
                </View>

                {/* Lifetime Sent */}
                <View style={[styles.statBox, { borderRightColor: colors.border }]}>
                  <Text style={[styles.statNumber, { color: colors.text }]}>
                    {user?.missYouSentCount || 0}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    Lifetime Sent
                  </Text>
                </View>

                {/* Lifetime Received */}
                <View style={styles.statBox}>
                  <Text style={[styles.statNumber, { color: colors.text }]}>
                    {user?.missYouReceivedCount || 0}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    Lifetime Received
                  </Text>
                </View>
              </View>
            </View>

            {/* Mutual Miss You Highlight Section */}
            {mutualConversations.length > 0 && (
              <View style={styles.mutualSection}>
                <View style={styles.mutualSectionHeader}>
                  <Sparkles size={16} color="#FF4D8D" />
                  <Text style={[styles.mutualSectionTitle, { color: colors.text }]}>
                    Mutual Connections
                  </Text>
                  <Text style={[styles.mutualSectionSubtitle, { color: colors.textSecondary }]}>
                    ({mutualConversations.length})
                  </Text>
                </View>

                <View style={styles.mutualChipsRow}>
                  {mutualConversations.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => router.push({ pathname: '/chat/[id]', params: { id: c.id } })}
                      style={[
                        styles.mutualChip,
                        {
                          backgroundColor: isDark
                            ? 'rgba(255, 77, 141, 0.15)'
                            : 'rgba(255, 77, 141, 0.08)',
                          borderColor: isDark ? 'rgba(255, 77, 141, 0.35)' : 'rgba(255, 77, 141, 0.2)',
                        },
                      ]}
                    >
                      <Heart size={12} color="#FF4D8D" fill="#FF4D8D" />
                      <Text style={[styles.mutualChipName, { color: colors.text }]}>
                        {c.otherUser?.displayName?.split(' ')[0]}
                      </Text>
                      {c.streakDays && c.streakDays > 0 ? (
                        <View style={styles.mutualChipStreak}>
                          <Flame size={10} color="#F59E0B" fill="#F59E0B" />
                          <Text style={styles.mutualChipStreakText}>{c.streakDays}d</Text>
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Filter Tabs */}
            <View style={styles.filterTabsRow}>
              {(['all', 'received', 'sent'] as FilterType[]).map((tab) => {
                const isActive = activeFilter === tab;
                const label =
                  tab === 'all'
                    ? `All (${missYouHistory.length})`
                    : tab === 'received'
                    ? `Received ❤️`
                    : `Sent 💌`;

                return (
                  <TouchableOpacity
                    key={tab}
                    onPress={() => setActiveFilter(tab)}
                    style={[
                      styles.filterTab,
                      {
                        backgroundColor: isActive
                          ? colors.tint
                          : isDark
                          ? 'rgba(255, 255, 255, 0.06)'
                          : '#F1F5F9',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterTabText,
                        {
                          color: isActive ? '#FFFFFF' : colors.textSecondary,
                          fontWeight: isActive ? '800' : '600',
                        },
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? 'rgba(255, 77, 141, 0.15)' : 'rgba(255, 77, 141, 0.08)' }]}>
              <Heart size={32} color={colors.tint} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {activeFilter === 'received'
                ? 'No received signals yet'
                : activeFilter === 'sent'
                ? 'No sent signals yet'
                : 'No Miss You signals yet'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Tap the glowing pink heart beside any friend in your messages list to send them an instant signal!
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitleGroup: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  statsCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 18,
    marginBottom: 20,
  },
  statsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statsCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statsMiniIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsCardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  statsLiveBadge: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 16,
    overflow: 'hidden',
  },
  statBox: {
    width: '50%',
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'transparent',
  },
  statNumber: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  mutualSection: {
    marginBottom: 20,
  },
  mutualSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  mutualSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  mutualSectionSubtitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  mutualChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mutualChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  mutualChipName: {
    fontSize: 12,
    fontWeight: '700',
  },
  mutualChipStreak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  mutualChipStreakText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#F59E0B',
  },
  filterTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  filterTabText: {
    fontSize: 12,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 10,
  },
  eventLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarGradientRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  directionBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  eventTextGroup: {
    flex: 1,
  },
  eventTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventName: {
    fontSize: 14,
    fontWeight: '800',
  },
  todayPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  todayPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FF4D8D',
  },
  eventSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  eventTimestamp: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  chatShortcutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  chatShortcutText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF4D8D',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
  },
});
