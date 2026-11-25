import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Grid,
  Heart,
  Lock,
  MessageCircle,
  MoreVertical,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserPlus,
  Video as VideoIcon,
} from 'lucide-react-native';
import { BrandColors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import { Post, UserProfile } from '@/types';

const GridItemView: React.FC<{ item: Post }> = ({ item }) => {
  const [hasError, setHasError] = useState(false);
  const isInvalid = !item.mediaUrl || (Platform.OS === 'web' && item.mediaUrl.startsWith('file://')) || item.mediaUrl.includes('RmlsZSBub3QgZm91bmQ=');

  return (
    <View style={styles.gridItem}>
      {!hasError && !isInvalid ? (
        item.mediaType === 'video' ? (
          Platform.OS === 'web' ? (
            // @ts-ignore
            <video
              src={item.mediaUrl}
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }}
              muted
              playsInline
            />
          ) : (
            <View style={[styles.gridImage, { backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' }]}>
              <VideoIcon size={24} color="#FFFFFF" />
            </View>
          )
        ) : (
          <Image
            source={{ uri: item.mediaUrl }}
            style={styles.gridImage}
            resizeMode="cover"
            onError={() => setHasError(true)}
          />
        )
      ) : (
        <LinearGradient
          colors={['#1E1B4B', '#0F172A']}
          style={[styles.gridImage, { alignItems: 'center', justifyContent: 'center' }]}
        >
          <Sparkles size={18} color={BrandColors.primaryCoral} />
        </LinearGradient>
      )}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.45)']}
        style={styles.gridOverlay}
      >
        <View style={styles.gridLikesRow}>
          <Heart size={11} color="#FFFFFF" fill="#FFFFFF" />
          <Text style={styles.gridLikesText}>{item.likesCount}</Text>
        </View>
      </LinearGradient>
    </View>
  );
};

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const {
    user: currentUser,
    allUsers,
    posts,
    followingIds,
    toggleFollow,
    startConversation,
    sendMissYouGesture,
    refreshPosts,
  } = useAuth();

  const [fetchedUser, setFetchedUser] = useState<UserProfile | null>(null);

  // Directly fetch profile from Supabase if not already cached in memory
  useEffect(() => {
    if (!id || id === currentUser?.id) return;
    const exists = allUsers.find((u) => u.id === id || u.username === id);
    if (!exists) {
      (async () => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .or(`id.eq.${id},username.eq.${id}`)
            .single();

          if (!error && data) {
            setFetchedUser({
              id: data.id,
              username: data.username || 'member',
              displayName: data.display_name || data.username || 'Afford Member',
              avatarUrl: data.avatar_url || '',
              bio: data.bio || '',
              isPrivate: data.is_private || false,
              missYouNotificationsEnabled: data.miss_you_notifications_enabled ?? true,
              streakNotificationsEnabled: data.streak_notifications_enabled ?? true,
              isVerified: data.is_verified || false,
              followersCount: data.followers_count || 0,
              followingCount: data.following_count || 0,
              missYouSentCount: 0,
              missYouReceivedCount: 0,
              createdAt: data.created_at,
            });
          }
        } catch {
          // ignore error
        }
      })();
    }
  }, [id, allUsers, currentUser?.id]);

  // Find target profile
  const profile: UserProfile = useMemo(() => {
    if (id === currentUser?.id) {
      return currentUser;
    }
    const found = allUsers.find((u) => u.id === id || u.username === id);
    if (found) return found;

    if (fetchedUser) return fetchedUser;

    // Fallback: check posts
    const postWithUser = posts.find((p) => p.userId === id || p.user.id === id);
    if (postWithUser) {
      return {
        id: postWithUser.user.id,
        username: postWithUser.user.username,
        displayName: postWithUser.user.displayName,
        avatarUrl: postWithUser.user.avatarUrl,
        bio: 'Connecting on AFFORD.',
        isPrivate: false,
        missYouNotificationsEnabled: true,
        streakNotificationsEnabled: true,
        isVerified: postWithUser.user.isVerified || false,
        followersCount: 120,
        followingCount: 84,
        missYouSentCount: 12,
        missYouReceivedCount: 18,
        createdAt: new Date().toISOString(),
      };
    }

    return {
      id: id || 'user_unknown',
      username: 'member',
      displayName: 'Afford Member',
      avatarUrl: '',
      bio: 'Cherishing genuine connections.',
      isPrivate: false,
      missYouNotificationsEnabled: true,
      streakNotificationsEnabled: true,
      isVerified: false,
      followersCount: 1,
      followingCount: 1,
      missYouSentCount: 0,
      missYouReceivedCount: 0,
      createdAt: new Date().toISOString(),
    };
  }, [id, allUsers, currentUser, posts, fetchedUser]);

  const isMe = profile.id === currentUser?.id;
  const isFollowing =
    followingIds.includes(profile.id) ||
    (profile.username && followingIds.includes(profile.username)) ||
    (id && followingIds.includes(id));

  const [avatarError, setAvatarError] = useState(false);

  // Directly fetch moments / posts for this profile from Supabase
  const [fetchedPosts, setFetchedPosts] = useState<Post[]>([]);
  useEffect(() => {
    if (!profile?.id) return;
    refreshPosts?.();
    (async () => {
      try {
        const { data: dbPosts, error } = await supabase
          .from('posts')
          .select('*')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false });

        if (!error && dbPosts && dbPosts.length > 0) {
          setFetchedPosts(
            dbPosts.map((p: any) => ({
              id: p.id,
              userId: p.user_id,
              user: {
                id: profile.id,
                username: profile.username,
                displayName: profile.displayName,
                avatarUrl: profile.avatarUrl,
              },
              mediaUrl: p.media_url,
              mediaType: p.media_type || 'image',
              caption: p.caption || '',
              filterName: p.filter_name || 'Original',
              isCloseFriendsOnly: p.is_close_friends_only || false,
              likesCount: p.likes_count || 0,
              commentsCount: p.comments_count || 0,
              sharesCount: p.shares_count || 0,
              isLikedByMe: false,
              createdAt: p.created_at,
            }))
          );
        }
      } catch {}
    })();
  }, [profile?.id]);

  // User posts combined from store and database
  const userPosts: Post[] = useMemo(() => {
    const map = new Map<string, Post>();
    posts
      .filter((p) => {
        if (!p.mediaUrl || p.mediaUrl.includes('RmlsZSBub3QgZm91bmQ=') || p.mediaUrl.includes('File not found')) {
          return false;
        }
        if (p.mediaUrl.startsWith('file:') || p.mediaUrl.startsWith('content:')) {
          if (Platform.OS === 'web' || !isMe) {
            return false;
          }
        }
        return (
          p.userId === profile.id ||
          p.user?.id === profile.id ||
          (profile.username && p.user?.username?.toLowerCase() === profile.username.toLowerCase()) ||
          (profile.displayName && p.user?.displayName?.toLowerCase() === profile.displayName.toLowerCase())
        );
      })
      .forEach((p) => map.set(p.id, p));

    fetchedPosts
      .filter((p) => {
        if (!p.mediaUrl || p.mediaUrl.includes('RmlsZSBub3QgZm91bmQ=') || p.mediaUrl.includes('File not found')) {
          return false;
        }
        if (p.mediaUrl.startsWith('file:') || p.mediaUrl.startsWith('content:')) {
          if (Platform.OS === 'web' || !isMe) {
            return false;
          }
        }
        return true;
      })
      .forEach((p) => {
        if (!map.has(p.id)) map.set(p.id, p);
      });

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [posts, profile.id, profile.username, profile.displayName, fetchedPosts, isMe]);

  // Safe avatar URL handling - avoid broken blob or file URLs from other tabs/browsers
  const displayAvatarUrl = useMemo(() => {
    if (avatarError || !profile.avatarUrl) {
      return null;
    }
    if ((profile.avatarUrl.startsWith('blob:') || profile.avatarUrl.startsWith('file:')) && !isMe) {
      return null;
    }
    if (profile.avatarUrl.includes('534528741775')) {
      return null;
    }
    return profile.avatarUrl;
  }, [profile.avatarUrl, avatarError, isMe]);

  const displayUsername = useMemo(() => {
    if (profile.username && profile.username !== 'alex_rivera') {
      return profile.username;
    }
    if (profile.displayName && profile.displayName !== 'Alex Rivera') {
      return profile.displayName.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 20);
    }
    return profile.username || 'member';
  }, [profile.username, profile.displayName]);

  const [missYouSent, setMissYouSent] = useState(false);

  const handleStartChat = () => {
    const convId = startConversation(profile);
    router.push({
      pathname: '/chat/[id]',
      params: { id: convId },
    });
  };

  const handleSendMissYou = async () => {
    setMissYouSent(true);
    await sendMissYouGesture(profile.id);
    setTimeout(() => {
      setMissYouSent(false);
    }, 2000);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerUsername, { color: colors.text }]}>
            @{displayUsername}
          </Text>
          {profile.isVerified && (
            <ShieldCheck size={15} color="#3B82F6" />
          )}
        </View>

        <TouchableOpacity style={styles.moreBtn}>
          <MoreVertical size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        {/* Profile Info Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.topRow}>
            {/* Avatar with Radiant Gradient Ring */}
            <View style={styles.avatarWrapper}>
              <LinearGradient
                colors={BrandColors.coralGradient}
                style={styles.avatarGradientRing}
              >
                <View style={[styles.avatarInner, { backgroundColor: colors.card }]}>
                  {displayAvatarUrl ? (
                    <Image
                      source={{ uri: displayAvatarUrl }}
                      style={styles.avatar}
                      resizeMode="cover"
                      onError={() => setAvatarError(true)}
                    />
                  ) : (
                    <View style={{ width: '100%', height: '100%', backgroundColor: colors.inputBackground, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={[styles.avatarInitial, { color: colors.tint }]}>
                        {(profile.displayName || profile.username || 'P').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
              </LinearGradient>
              {profile.isPrivate && (
                <View style={[styles.privateBadge, { backgroundColor: colors.tint }]}>
                  <Lock size={10} color="#FFFFFF" />
                </View>
              )}
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statCol}>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {userPosts.length}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Memories</Text>
              </View>

              <View style={styles.statCol}>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {profile.followersCount ?? 0}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Followers</Text>
              </View>

              <View style={styles.statCol}>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {profile.followingCount ?? 0}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Following</Text>
              </View>
            </View>
          </View>

          {/* User Name & Bio */}
          <View style={styles.bioSection}>
            <View style={styles.nameRow}>
              <Text style={[styles.displayName, { color: colors.text }]}>
                {profile.displayName}
              </Text>
              {profile.isVerified && (
                <ShieldCheck size={15} color="#3B82F6" />
              )}
            </View>
            {profile.bio ? (
              <Text style={[styles.bioText, { color: colors.textSecondary }]}>
                {profile.bio}
              </Text>
            ) : (
              <Text style={[styles.bioText, { color: colors.textMuted }]}>
                No bio yet. Connecting on AFFORD.
              </Text>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            {isMe ? (
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/profile')}
                style={[styles.primaryActionBtn, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
              >
                <Text style={[styles.primaryActionText, { color: colors.text }]}>Edit Profile</Text>
              </TouchableOpacity>
            ) : (
              <>
                {/* Follow Button */}
                <TouchableOpacity
                  onPress={() => toggleFollow(profile.id)}
                  style={[
                    styles.followBtn,
                    isFollowing
                      ? { backgroundColor: colors.inputBackground, borderColor: colors.border }
                      : { backgroundColor: colors.tint, borderColor: colors.tint },
                  ]}
                >
                  {isFollowing ? (
                    <>
                      <UserCheck size={16} color={colors.text} />
                      <Text style={[styles.actionBtnText, { color: colors.text }]}>Following</Text>
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} color="#FFFFFF" />
                      <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>Connect</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Message Button */}
                <TouchableOpacity
                  onPress={handleStartChat}
                  style={[styles.messageBtn, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                >
                  <MessageCircle size={16} color={colors.text} />
                  <Text style={[styles.actionBtnText, { color: colors.text }]}>Message</Text>
                </TouchableOpacity>

                {/* Miss You Button */}
                <TouchableOpacity
                  onPress={handleSendMissYou}
                  style={[
                    styles.missYouBtn,
                    missYouSent
                      ? { backgroundColor: '#FF4D8D', borderColor: '#FF4D8D' }
                      : { backgroundColor: 'rgba(244, 63, 94, 0.08)', borderColor: 'rgba(244, 63, 94, 0.25)' },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Send Miss You signal to ${profile.displayName}`}
                >
                  <Heart size={16} color={missYouSent ? '#FFFFFF' : colors.tint} fill={missYouSent ? '#FFFFFF' : colors.tint} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Tab Header */}
        <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
          <View style={[styles.activeTab, { borderBottomColor: colors.tint }]}>
            <Grid size={18} color={colors.tint} />
            <Text style={[styles.activeTabText, { color: colors.tint }]}>Memories</Text>
          </View>
        </View>

        {/* Posts Grid */}
        <View style={styles.gridContainer}>
          {userPosts.length > 0 ? (
            userPosts.map((item) => (
              <GridItemView key={item.id} item={item} />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
                No memories posted yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                When {profile.displayName} posts moments, they will appear here.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerUsername: {
    fontSize: 16,
    fontWeight: '800',
  },
  moreBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    paddingBottom: 40,
  },
  profileCard: {
    margin: 16,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    gap: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarGradientRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    padding: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    width: 71,
    height: 71,
    borderRadius: 35.5,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  avatar: {
    width: 71,
    height: 71,
    borderRadius: 35.5,
  },
  avatarInitial: {
    fontSize: 28,
    fontWeight: '800',
  },
  privateBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statCol: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  bioSection: {
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  displayName: {
    fontSize: 17,
    fontWeight: '800',
  },
  bioText: {
    fontSize: 13.5,
    lineHeight: 19,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryActionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  followBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  messageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  missYouBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },
  activeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 2,
  },
  activeTabText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 1,
  },
  gridItem: {
    width: '33.333%',
    aspectRatio: 1,
    padding: 1,
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
  },
  gridOverlay: {
    position: 'absolute',
    bottom: 1,
    left: 1,
    right: 1,
    height: 30,
    justifyContent: 'flex-end',
    padding: 4,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
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
  emptyContainer: {
    width: '100%',
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
  },
});
