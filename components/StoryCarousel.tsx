import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Plus, Sparkles } from 'lucide-react-native';
import { BrandColors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Story } from '@/types';

export const StoryCarousel: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { stories, user } = useAuth();

  const handleCreateStory = () => {
    router.push({
      pathname: '/(tabs)/create',
      params: { mode: 'story' },
    });
  };

  const handleOpenStory = (story: Story) => {
    router.push({
      pathname: '/story/[id]',
      params: { id: story.id },
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Current User Add Story Ring */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleCreateStory}
          style={styles.storyItem}
        >
          <View style={styles.avatarWrapper}>
            <LinearGradient
              colors={BrandColors.coralGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.addRingGradient}
            >
              <View style={[styles.innerBorder, { backgroundColor: colors.background }]}>
                <Image
                  source={{ uri: user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400' }}
                  style={styles.avatarImage}
                />
              </View>
            </LinearGradient>
            <LinearGradient
              colors={BrandColors.coralGradient}
              style={[styles.addBadge, { borderColor: colors.background }]}
            >
              <Plus size={11} color="#FFFFFF" strokeWidth={3} />
            </LinearGradient>
          </View>
          <Text
            style={[styles.storyUsername, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            Your Story
          </Text>
        </TouchableOpacity>

        {/* Friends Stories */}
        {stories.map((story) => {
          const isCloseFriend = story.isCloseFriendsOnly;
          const isViewed = story.isViewedByMe;

          return (
            <TouchableOpacity
              key={story.id}
              activeOpacity={0.8}
              onPress={() => handleOpenStory(story)}
              style={styles.storyItem}
            >
              <View style={styles.avatarWrapper}>
                {isViewed ? (
                  <View style={[styles.viewedRing, { borderColor: colors.border }]}>
                    <Image
                      source={{ uri: story.user.avatarUrl }}
                      style={styles.avatarImage}
                    />
                  </View>
                ) : (
                  <LinearGradient
                    colors={isCloseFriend ? BrandColors.closeFriendsGradient : BrandColors.storyGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.storyRingGradient}
                  >
                    <View style={[styles.innerBorder, { backgroundColor: colors.background }]}>
                      <Image
                        source={{ uri: story.user.avatarUrl }}
                        style={styles.avatarImage}
                      />
                    </View>
                  </LinearGradient>
                )}

                {/* Close Friend badge */}
                {isCloseFriend && (
                  <View style={styles.closeFriendBadge}>
                    <Sparkles size={8} color="#FFFFFF" />
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.storyUsername,
                  {
                    color: isViewed ? colors.textMuted : colors.text,
                    fontWeight: isViewed ? '500' : '700',
                  },
                ]}
                numberOfLines={1}
              >
                {story.user.displayName.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 14,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 14,
  },
  storyItem: {
    alignItems: 'center',
    width: 72,
  },
  avatarWrapper: {
    position: 'relative',
    width: 66,
    height: 66,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addRingGradient: {
    width: 66,
    height: 66,
    borderRadius: 33,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyRingGradient: {
    width: 66,
    height: 66,
    borderRadius: 33,
    padding: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F43F5E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  viewedRing: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 1.5,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerBorder: {
    width: '100%',
    height: '100%',
    borderRadius: 31,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  addBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  closeFriendBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  storyUsername: {
    marginTop: 6,
    fontSize: 11,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});
