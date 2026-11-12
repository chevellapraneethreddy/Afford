import React, { useState } from 'react';
import {
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Flame, Heart, MessageSquarePlus, Search, Sparkles, X } from 'lucide-react-native';
import { AffordHeader } from '@/components/AffordHeader';
import { MilestoneCelebrationModal } from '@/components/MilestoneCelebrationModal';
import { MissYouGesture } from '@/components/MissYouGesture';
import { BrandColors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Conversation } from '@/types';

type ChatFilter = 'all' | 'unread' | 'streaks';

export default function MessagesScreen() {
  const { colors, isDark } = useTheme();
  const {
    conversations,
    sendMissYouGesture,
    milestoneCelebration,
    triggerMilestoneCelebration,
    clearMilestoneCelebration,
    todayMissYouSentCount,
  } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<ChatFilter>('all');

  const filteredConversations = conversations.filter((c) => {
    const friend = c.otherUser;
    const name = friend?.displayName || c.name || '';
    const username = friend?.username || '';
    const lastMsg = c.lastMessage || '';

    const matchesSearch =
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lastMsg.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilter === 'unread') return c.unreadCount > 0;
    if (activeFilter === 'streaks') return (c.streakDays || 0) > 0;
    return true;
  });

  const handleOpenChat = (conversation: Conversation) => {
    router.push({
      pathname: '/chat/[id]',
      params: { id: conversation.id },
    });
  };

  const renderConversationItem = ({ item }: { item: Conversation }) => {
    const friend = item.otherUser;
    const name = friend?.displayName || item.name || 'Conversation';
    const avatar = friend?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400';
    const hasUnread = item.unreadCount > 0;

    return (
      <View
        style={[
          styles.conversationRow,
          {
            backgroundColor: hasUnread && isDark ? 'rgba(244,63,94,0.08)' : colors.card,
            borderColor: hasUnread ? colors.tint : colors.border,
          },
        ]}
      >
        {/* Clickable Area to open chat */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleOpenChat(item)}
          style={styles.chatInfoArea}
          accessibilityRole="button"
          accessibilityLabel={`Open chat with ${name}. ${hasUnread ? `${item.unreadCount} unread messages.` : ''}`}
        >
          {/* Avatar with Online indicator - Tapping opens Friendship Profile */}
          <TouchableOpacity
            style={styles.avatarContainer}
            activeOpacity={0.8}
            onPress={() => {
              if (friend?.id) {
                router.push({ pathname: '/friendship/[id]', params: { id: friend.id } } as any);
              } else {
                handleOpenChat(item);
              }
            }}
            accessibilityRole="button"
            accessibilityLabel={`View friendship bond with ${name}`}
          >
            <Image source={{ uri: avatar }} style={styles.avatar} />
            {item.isOnline && (
              <View
                style={[styles.onlineBadge, { borderColor: colors.card }]}
                accessibilityLabel="Active now"
              />
            )}
          </TouchableOpacity>

          {/* Details */}
          <View style={styles.detailsCol}>
            <View style={styles.topRow}>
              <View style={styles.nameRow}>
                <Text style={[styles.nameText, { color: colors.text }]} numberOfLines={1}>
                  {name}
                </Text>
                {item.isMutualMissYou && (
                  <View style={styles.mutualMiniTag} accessibilityLabel="Mutual Miss You friend">
                    <Heart size={9} color="#FF4D8D" fill="#FF4D8D" />
                  </View>
                )}
              </View>
              <Text style={[styles.timeText, { color: colors.textMuted }]}>
                {item.lastMessageAt}
              </Text>
            </View>

            <View style={styles.bottomRow}>
              <Text
                style={[
                  styles.previewText,
                  {
                    color: hasUnread ? colors.text : colors.textSecondary,
                    fontWeight: hasUnread ? '700' : '400',
                  },
                ]}
                numberOfLines={1}
              >
                {item.lastMessage}
              </Text>

              {/* Unread count, Milestone & Streak pill */}
              <View style={styles.badgesGroup}>
                {/* Friendship Milestone badge */}
                {item.milestone && (
                  <TouchableOpacity
                    onPress={() => friend && triggerMilestoneCelebration(item.milestone!, friend)}
                    style={[
                      styles.milestoneMiniPill,
                      {
                        backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7',
                        borderColor: isDark ? 'rgba(245, 158, 11, 0.4)' : '#FDE68A',
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.milestone.days} Day Milestone: ${item.milestone.title}`}
                  >
                    <Text style={styles.milestoneMiniEmoji}>{item.milestone.badge}</Text>
                  </TouchableOpacity>
                )}

                {item.streakDays && item.streakDays > 0 ? (
                  <View style={[styles.streakPill, { backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : '#FEF3C7' }]}>
                    <Flame size={12} color="#F59E0B" fill="#F59E0B" />
                    <Text style={[styles.streakDaysText, { color: isDark ? '#FCD34D' : '#B45309' }]}>
                      {item.streakDays}d
                    </Text>
                  </View>
                ) : null}

                {hasUnread && (
                  <LinearGradient
                    colors={BrandColors.coralGradient}
                    style={styles.unreadBadge}
                  >
                    <Text style={styles.unreadCountText}>{item.unreadCount}</Text>
                  </LinearGradient>
                )}
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* SIGNATURE FEATURE: DIRECT-TAP MISS YOU COUNTER */}
        {friend && (
          <View style={[styles.missYouArea, { borderLeftColor: colors.border }]}>
            <MissYouGesture
              recipientId={friend.id}
              recipientName={friend.displayName}
              currentCount={item.missYouCount || 0}
              dailyCount={item.dailyMissYouCount || 0}
              isMutual={item.isMutualMissYou || false}
              conversationId={item.id}
              onSendMissYou={sendMissYouGesture}
            />
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <AffordHeader />

      <View style={styles.container}>
        {/* Search */}
        <View style={[styles.searchBar, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            placeholder="Search conversations, friends..."
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

        {/* Miss You Interactive Banner with Daily Count & History Shortcut */}
        <TouchableOpacity
          onPress={() => router.push('/miss-you-history')}
          style={[
            styles.gestureHintBanner,
            { backgroundColor: isDark ? 'rgba(244,63,94,0.14)' : 'rgba(244,63,94,0.08)' },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Tap heart to send Miss You. ${todayMissYouSentCount} sent today. Tap to view Miss You History.`}
        >
          <View style={styles.hintLeftRow}>
            <Heart size={14} color="#F43F5E" fill="#F43F5E" />
            <Text style={[styles.gestureHintText, { color: colors.tint }]}>
              Tap heart to send Miss You • {todayMissYouSentCount} sent today
            </Text>
          </View>
          <Text style={[styles.hintHistoryLink, { color: colors.tint }]}>History →</Text>
        </TouchableOpacity>

        {/* Filter Pills */}
        <View style={styles.filterTabsRow}>
          <TouchableOpacity
            onPress={() => setActiveFilter('all')}
            style={[
              styles.filterTab,
              activeFilter === 'all'
                ? { backgroundColor: colors.tint }
                : { backgroundColor: colors.inputBackground, borderColor: colors.border },
            ]}
          >
            <Text
              style={[
                styles.filterTabText,
                { color: activeFilter === 'all' ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              All ({conversations.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveFilter('unread')}
            style={[
              styles.filterTab,
              activeFilter === 'unread'
                ? { backgroundColor: colors.tint }
                : { backgroundColor: colors.inputBackground, borderColor: colors.border },
            ]}
          >
            <Text
              style={[
                styles.filterTabText,
                { color: activeFilter === 'unread' ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              Unread
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveFilter('streaks')}
            style={[
              styles.filterTab,
              activeFilter === 'streaks'
                ? { backgroundColor: '#F59E0B' }
                : { backgroundColor: colors.inputBackground, borderColor: colors.border },
            ]}
          >
            <Flame size={12} color={activeFilter === 'streaks' ? '#FFFFFF' : '#F59E0B'} fill={activeFilter === 'streaks' ? '#FFFFFF' : '#F59E0B'} />
            <Text
              style={[
                styles.filterTabText,
                { color: activeFilter === 'streaks' ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              Streaks
            </Text>
          </TouchableOpacity>
        </View>

        {/* Conversation List */}
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversationItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Sparkles size={32} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No conversations found</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {searchQuery
                  ? 'Try searching with a different name or message'
                  : 'Start a private conversation from Discover or user profiles!'}
              </Text>
            </View>
          }
        />

        {/* Friendship Milestone Celebration Modal */}
        <MilestoneCelebrationModal
          visible={Boolean(milestoneCelebration)}
          milestone={milestoneCelebration?.milestone || null}
          friend={milestoneCelebration?.friend || null}
          onClose={clearMilestoneCelebration}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
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
  gestureHintBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 10,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  hintLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
  },
  gestureHintText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  hintHistoryLink: {
    fontSize: 11.5,
    fontWeight: '800',
    paddingLeft: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  mutualMiniTag: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 77, 141, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneMiniPill: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneMiniEmoji: {
    fontSize: 11,
  },
  filterTabsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 10,
  },
  conversationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  chatInfoArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 10,
  },
  avatarContainer: {
    position: 'relative',
    width: 52,
    height: 52,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
  },
  detailsCol: {
    flex: 1,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  nameText: {
    fontSize: 15.5,
    fontWeight: '800',
    flex: 1,
    marginRight: 8,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewText: {
    fontSize: 13,
    flex: 1,
    marginRight: 8,
  },
  badgesGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
  },
  streakDaysText: {
    fontSize: 10,
    fontWeight: '800',
  },
  unreadBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadCountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  missYouArea: {
    width: 68,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 8,
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 6,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
});
