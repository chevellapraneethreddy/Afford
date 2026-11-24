import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  Camera,
  ChevronRight,
  Flame,
  Heart,
  MessageCircle,
  Mic,
  Play,
  Share2,
  Sparkles,
  Trophy,
} from 'lucide-react-native';
import { MilestoneCelebrationModal } from '@/components/MilestoneCelebrationModal';
import { MissYouGesture } from '@/components/MissYouGesture';
import { BrandColors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { INITIAL_FRIENDS } from '@/lib/mockData';
import { FriendshipMilestone, Message, UserProfile } from '@/types';

export default function FriendshipProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const {
    user,
    conversations,
    messages,
    missYouHistory,
    connectionQuestions,
    sendMissYouGesture,
    milestoneCelebration,
    triggerMilestoneCelebration,
    clearMilestoneCelebration,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'memories' | 'questions' | 'milestones'>('memories');

  // Find the conversation and friend profile
  const conversation = useMemo(() => {
    return (
      conversations.find((c) => c.otherUser?.id === id || c.id === id) ||
      conversations[0]
    );
  }, [conversations, id]);

  const friend: UserProfile = useMemo(() => {
    if (conversation?.otherUser) return conversation.otherUser;
    const found = INITIAL_FRIENDS.find((f) => f.id === id);
    if (found) return found;
    return {
      ...INITIAL_FRIENDS[0],
      id: id || 'usr_unknown',
      displayName: 'Close Friend',
    };
  }, [conversation, id]);

  const conversationMessages: Message[] = useMemo(() => {
    if (!conversation?.id) return [];
    return messages[conversation.id] || [];
  }, [conversation?.id, messages]);

  // Extract shared photos
  const sharedPhotos = useMemo(() => {
    return conversationMessages
      .filter((m) => m.mediaType === 'image' && m.mediaUrl)
      .map((m) => ({ id: m.id, url: m.mediaUrl!, timestamp: m.createdAt }));
  }, [conversationMessages]);

  // Extract shared voice postcards
  const sharedVoices = useMemo(() => {
    return conversationMessages
      .filter((m) => m.mediaType === 'voice')
      .map((m) => ({ id: m.id, text: m.content, timestamp: m.createdAt, senderId: m.senderId }));
  }, [conversationMessages]);

  // Calculate mutual Miss You stats
  const totalSentToFriend = useMemo(() => {
    return missYouHistory.filter((ev) => ev.recipientId === friend.id).length;
  }, [missYouHistory, friend.id]);

  const totalReceivedFromFriend = useMemo(() => {
    return missYouHistory.filter((ev) => ev.senderId === friend.id).length;
  }, [missYouHistory, friend.id]);

  const todaySentToFriend = useMemo(() => {
    return missYouHistory.filter((ev) => ev.recipientId === friend.id && ev.isToday).length;
  }, [missYouHistory, friend.id]);

  const streakDays = conversation?.streakDays || 42;
  const milestone: FriendshipMilestone = conversation?.milestone || {
    days: 30,
    title: 'Silver Streak',
    description: '30 consecutive days of meaningful connection',
    badge: '🥈',
    tier: 'silver',
    unlockedAt: 'Yesterday',
  };

  const handleShareFriendship = async () => {
    try {
      await Share.share({
        title: `Friendship with ${friend.displayName}`,
        message: `We've been staying close on AFFORD for ${streakDays} days! We've sent ${conversation?.missYouCount || 28} Miss You signals to each other. ❤️`,
      });
    } catch {
      // Dismissed
    }
  };

  // Shared connection questions
  const friendQuestions = useMemo(() => {
    return connectionQuestions.filter((q) => q.partnerUser?.id === friend.id || q.answeredByMe);
  }, [connectionQuestions, friend.id]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.headerBtn, { backgroundColor: colors.inputBackground }]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Friendship Bond</Text>
          <Text style={[styles.headerSubtitle, { color: colors.tint }]}>Feel closer. Even when apart.</Text>
        </View>

        <TouchableOpacity
          onPress={handleShareFriendship}
          style={[styles.headerBtn, { backgroundColor: colors.inputBackground }]}
          accessibilityRole="button"
          accessibilityLabel="Share Friendship Bond"
        >
          <Share2 size={18} color={colors.tint} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* HERO SECTION: Connected Avatars */}
        <LinearGradient
          colors={
            isDark
              ? ['rgba(244,63,94,0.18)', 'rgba(124,58,237,0.12)', 'rgba(0,0,0,0)']
              : ['#FFE4E6', '#F3E8FF', colors.background]
          }
          style={styles.heroCard}
        >
          <View style={styles.avatarsRow}>
            {/* User Avatar */}
            <View style={styles.avatarWrap}>
              {user?.avatarUrl && !user.avatarUrl.includes('534528741775') ? (
                <Image
                  source={{ uri: user.avatarUrl }}
                  style={styles.heroAvatar}
                />
              ) : (
                <View style={[styles.heroAvatar, { backgroundColor: colors.inputBackground, alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ fontSize: 24, fontWeight: '800', color: colors.tint }}>
                    {(user?.displayName || user?.username || 'P').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text style={[styles.heroAvatarLabel, { color: colors.textSecondary }]}>You</Text>
            </View>

            {/* Glowing Connection Link */}
            <View style={styles.connectionNode}>
              <View style={styles.nodeLine} />
              <LinearGradient colors={BrandColors.coralGradient} style={styles.heartPulsePill}>
                <Heart size={18} color="#FFFFFF" fill="#FFFFFF" />
              </LinearGradient>
              <View style={styles.nodeLine} />
            </View>

            {/* Friend Avatar */}
            <View style={styles.avatarWrap}>
              <Image
                source={{
                  uri: friend.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
                }}
                style={styles.heroAvatar}
              />
              <Text style={[styles.heroAvatarLabel, { color: colors.textSecondary }]}>
                {friend.displayName.split(' ')[0]}
              </Text>
            </View>
          </View>

          {/* Bond Titles & Badges */}
          <Text style={[styles.friendDisplayName, { color: colors.text }]}>
            {friend.displayName}
          </Text>
          <Text style={[styles.friendUsername, { color: colors.textMuted }]}>
            @{friend.username}
          </Text>

          {/* Mutual Connection Badge */}
          {conversation?.isMutualMissYou && (
            <View style={styles.mutualPill}>
              <Heart size={13} color="#FF4D8D" fill="#FF4D8D" />
              <Text style={styles.mutualPillText}>Mutual Miss You Circle</Text>
              <Sparkles size={12} color="#FFD700" />
            </View>
          )}

          {/* Milestone Badge Pill */}
          {milestone && (
            <TouchableOpacity
              onPress={() => triggerMilestoneCelebration(milestone, friend)}
              style={[
                styles.milestonePill,
                {
                  backgroundColor: isDark ? 'rgba(245,158,11,0.2)' : '#FEF3C7',
                  borderColor: 'rgba(245,158,11,0.4)',
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${milestone.title}. Tap to celebrate milestone.`}
            >
              <Text style={styles.milestoneBadgeEmoji}>{milestone.badge}</Text>
              <Text style={[styles.milestonePillText, { color: isDark ? '#FCD34D' : '#B45309' }]}>
                {milestone.title} ({streakDays}d Streak) • Tap to Celebrate
              </Text>
            </TouchableOpacity>
          )}

          {/* Direct Tap Miss You Counter */}
          <View style={styles.signatureSection}>
            <Text style={[styles.signatureLabel, { color: colors.textSecondary }]}>
              SEND MISS YOU SIGNAL
            </Text>
            <View style={styles.signatureActionRow}>
              <MissYouGesture
                recipientId={friend.id}
                recipientName={friend.displayName}
                currentCount={conversation?.missYouCount || 28}
                dailyCount={conversation?.dailyMissYouCount || todaySentToFriend}
                isMutual={conversation?.isMutualMissYou || false}
                conversationId={conversation?.id}
                onSendMissYou={sendMissYouGesture}
              />
              <View style={styles.signatureTextCol}>
                <Text style={[styles.signaturePrompt, { color: colors.text }]}>
                  Tap heart to send Miss You
                </Text>
                <Text style={[styles.signatureSub, { color: colors.textMuted }]}>
                  Instant vibration & real-time notification
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* 4-STAT GRID */}
        <View style={styles.statsGrid}>
          {/* Card 1: Streak */}
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Flame size={20} color="#F59E0B" fill="#F59E0B" />
            <Text style={[styles.statValue, { color: colors.text }]}>{streakDays} Days</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Connection Streak</Text>
          </View>

          {/* Card 2: Lifetime Miss You */}
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Heart size={20} color="#F43F5E" fill="#F43F5E" />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {conversation?.missYouCount || totalSentToFriend + 28}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Lifetime Miss You</Text>
          </View>

          {/* Card 3: Today's Signals */}
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Sparkles size={20} color="#EC4899" />
            <Text style={[styles.statValue, { color: colors.text }]}>
              +{conversation?.dailyMissYouCount || todaySentToFriend} Today
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Today's Signals</Text>
          </View>

          {/* Card 4: Connection Anniversary */}
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Calendar size={20} color="#8B5CF6" />
            <Text style={[styles.statValue, { color: colors.text }]}>Oct 2025</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Bond Established</Text>
          </View>
        </View>

        {/* SECTION TABS */}
        <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => setActiveTab('memories')}
            style={[
              styles.tabItem,
              activeTab === 'memories' && { borderBottomColor: colors.tint, borderBottomWidth: 2 },
            ]}
          >
            <Camera size={16} color={activeTab === 'memories' ? colors.tint : colors.textMuted} />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'memories' ? colors.tint : colors.textSecondary },
              ]}
            >
              Memories ({sharedPhotos.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('questions')}
            style={[
              styles.tabItem,
              activeTab === 'questions' && { borderBottomColor: colors.tint, borderBottomWidth: 2 },
            ]}
          >
            <Sparkles size={16} color={activeTab === 'questions' ? colors.tint : colors.textMuted} />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'questions' ? colors.tint : colors.textSecondary },
              ]}
            >
              Connection Q&A ({friendQuestions.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('milestones')}
            style={[
              styles.tabItem,
              activeTab === 'milestones' && { borderBottomColor: colors.tint, borderBottomWidth: 2 },
            ]}
          >
            <Trophy size={16} color={activeTab === 'milestones' ? colors.tint : colors.textMuted} />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'milestones' ? colors.tint : colors.textSecondary },
              ]}
            >
              Milestones
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB 1: MEMORIES & SHARED PHOTOS / VOICES */}
        {activeTab === 'memories' && (
          <View style={styles.tabContent}>
            {/* Voice Postcards Archive */}
            <View style={styles.subSectionHeader}>
              <Mic size={16} color={colors.tint} />
              <Text style={[styles.subSectionTitle, { color: colors.text }]}>Voice Postcards</Text>
            </View>

            {sharedVoices.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: colors.inputBackground }]}>
                <Mic size={24} color={colors.textMuted} />
                <Text style={[styles.emptyBoxText, { color: colors.textSecondary }]}>
                  No voice postcards sent yet. Tap Chat below to record one!
                </Text>
              </View>
            ) : (
              sharedVoices.map((voice) => (
                <View
                  key={voice.id}
                  style={[
                    styles.voiceCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.voicePlayBtn}>
                    <Play size={14} color="#FFFFFF" fill="#FFFFFF" />
                  </View>
                  <View style={styles.voiceDetails}>
                    <Text style={[styles.voiceTitle, { color: colors.text }]}>{voice.text}</Text>
                    <Text style={[styles.voiceTime, { color: colors.textMuted }]}>
                      {voice.timestamp}
                    </Text>
                  </View>
                </View>
              ))
            )}

            {/* Shared Photos */}
            <View style={[styles.subSectionHeader, { marginTop: 20 }]}>
              <Camera size={16} color={colors.tint} />
              <Text style={[styles.subSectionTitle, { color: colors.text }]}>Shared Photos</Text>
            </View>

            {sharedPhotos.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: colors.inputBackground }]}>
                <Camera size={24} color={colors.textMuted} />
                <Text style={[styles.emptyBoxText, { color: colors.textSecondary }]}>
                  Shared photos from your chat appear here privately.
                </Text>
              </View>
            ) : (
              <View style={styles.photosGrid}>
                {sharedPhotos.map((photo) => (
                  <Image key={photo.id} source={{ uri: photo.url }} style={styles.photoThumb} />
                ))}
              </View>
            )}
          </View>
        )}

        {/* TAB 2: CONNECTION QUESTIONS */}
        {activeTab === 'questions' && (
          <View style={styles.tabContent}>
            {friendQuestions.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: colors.inputBackground }]}>
                <Sparkles size={24} color={colors.textMuted} />
                <Text style={[styles.emptyBoxText, { color: colors.textSecondary }]}>
                  Daily connection questions answered with {friend.displayName} will be preserved
                  here.
                </Text>
              </View>
            ) : (
              friendQuestions.map((q) => (
                <View
                  key={q.id}
                  style={[
                    styles.questionCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.qCategoryRow}>
                    <Text style={[styles.qCategory, { color: colors.tint }]}>
                      {q.category.toUpperCase()} CONNECTION
                    </Text>
                    <Text style={[styles.qDate, { color: colors.textMuted }]}>{q.activeDate}</Text>
                  </View>

                  <Text style={[styles.qPrompt, { color: colors.text }]}>{q.questionText}</Text>

                  {/* My Answer */}
                  {q.myAnswer && (
                    <View
                      style={[
                        styles.answerBubble,
                        { backgroundColor: isDark ? 'rgba(244,63,94,0.12)' : '#FFE4E6' },
                      ]}
                    >
                      <Text style={[styles.answerAuthor, { color: colors.tint }]}>Your Answer:</Text>
                      <Text style={[styles.answerText, { color: colors.text }]}>{q.myAnswer}</Text>
                    </View>
                  )}

                  {/* Friend's Answer */}
                  {q.partnerAnswer && (
                    <View
                      style={[
                        styles.answerBubble,
                        { backgroundColor: isDark ? 'rgba(124,58,237,0.12)' : '#F3E8FF', marginTop: 8 },
                      ]}
                    >
                      <Text style={[styles.answerAuthor, { color: '#8B5CF6' }]}>
                        {friend.displayName}'s Answer:
                      </Text>
                      <Text style={[styles.answerText, { color: colors.text }]}>
                        {q.partnerAnswer}
                      </Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 3: MILESTONE ROADMAP */}
        {activeTab === 'milestones' && (
          <View style={styles.tabContent}>
            <View
              style={[
                styles.milestoneCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.roadmapTitle, { color: colors.text }]}>
                Friendship Milestone Roadmap
              </Text>
              <Text style={[styles.roadmapSubtitle, { color: colors.textMuted }]}>
                Celebrate consistency and meaningful memories together.
              </Text>

              {/* Milestones list */}
              {[
                { days: 7, title: 'Bronze Streak', badge: '🥉', desc: '7 days connected' },
                { days: 30, title: 'Silver Streak', badge: '🥈', desc: '30 days connected' },
                { days: 50, title: 'Gold Streak', badge: '🥇', desc: '50 days connected' },
                { days: 100, title: 'Diamond Circle', badge: '💎', desc: '100 days of deep connection' },
              ].map((tier, idx) => {
                const isReached = streakDays >= tier.days;
                return (
                  <View
                    key={tier.days}
                    style={[
                      styles.tierRow,
                      {
                        backgroundColor: isReached
                          ? isDark
                            ? 'rgba(244,63,94,0.08)'
                            : '#FFF1F2'
                          : 'transparent',
                        borderColor: isReached ? colors.tint : colors.border,
                      },
                    ]}
                  >
                    <Text style={styles.tierEmoji}>{tier.badge}</Text>
                    <View style={styles.tierDetails}>
                      <Text
                        style={[
                          styles.tierTitle,
                          { color: isReached ? colors.text : colors.textMuted },
                        ]}
                      >
                        {tier.title}
                      </Text>
                      <Text style={[styles.tierDesc, { color: colors.textSecondary }]}>
                        {tier.desc}
                      </Text>
                    </View>
                    {isReached ? (
                      <View style={styles.unlockedBadge}>
                        <Sparkles size={12} color="#FFFFFF" />
                        <Text style={styles.unlockedText}>Unlocked</Text>
                      </View>
                    ) : (
                      <Text style={[styles.lockedText, { color: colors.textMuted }]}>
                        {tier.days - streakDays}d left
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* BOTTOM ACTION BUTTON */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            onPress={() => {
              if (conversation?.id) {
                router.push({ pathname: '/chat/[id]', params: { id: conversation.id } } as any);
              }
            }}
            style={styles.openChatBtn}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={BrandColors.coralGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.openChatGradient}
            >
              <MessageCircle size={18} color="#FFFFFF" />
              <Text style={styles.openChatText}>Open Chat with {friend.displayName}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* MILESTONE CELEBRATION MODAL */}
      {milestoneCelebration && (
        <MilestoneCelebrationModal
          visible={!!milestoneCelebration}
          milestone={milestoneCelebration.milestone}
          friend={milestoneCelebration.friend}
          onClose={clearMilestoneCelebration}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroCard: {
    padding: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 12,
  },
  avatarWrap: {
    alignItems: 'center',
  },
  heroAvatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: '#F43F5E',
  },
  heroAvatarLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  connectionNode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nodeLine: {
    width: 18,
    height: 2,
    backgroundColor: '#F43F5E',
    opacity: 0.5,
  },
  heartPulsePill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F43F5E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  friendDisplayName: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  friendUsername: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
    marginBottom: 12,
  },
  mutualPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 77, 141, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 141, 0.35)',
    marginBottom: 10,
  },
  mutualPillText: {
    color: '#FF4D8D',
    fontSize: 12,
    fontWeight: '800',
  },
  milestonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  milestoneBadgeEmoji: {
    fontSize: 15,
  },
  milestonePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  signatureSection: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 14,
    borderRadius: 20,
    marginTop: 8,
    alignItems: 'center',
  },
  signatureLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
  },
  signatureActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  signatureTextCol: {
    flex: 1,
  },
  signaturePrompt: {
    fontSize: 14,
    fontWeight: '700',
  },
  signatureSub: {
    fontSize: 11,
    fontWeight: '400',
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    width: '48%',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tabContent: {
    padding: 16,
  },
  subSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  emptyBox: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyBoxText: {
    fontSize: 13,
    textAlign: 'center',
  },
  voiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  voicePlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F43F5E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceDetails: {
    flex: 1,
  },
  voiceTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  voiceTime: {
    fontSize: 11,
    marginTop: 2,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoThumb: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 12,
  },
  questionCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
  },
  qCategoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  qCategory: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  qDate: {
    fontSize: 11,
  },
  qPrompt: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 12,
  },
  answerBubble: {
    padding: 10,
    borderRadius: 12,
  },
  answerAuthor: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  answerText: {
    fontSize: 13,
    lineHeight: 18,
  },
  milestoneCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  roadmapTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  roadmapSubtitle: {
    fontSize: 12,
    marginBottom: 16,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  tierEmoji: {
    fontSize: 22,
  },
  tierDetails: {
    flex: 1,
  },
  tierTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  tierDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  unlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  unlockedText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  lockedText: {
    fontSize: 11,
    fontWeight: '700',
  },
  bottomBar: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  openChatBtn: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  openChatGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  openChatText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
