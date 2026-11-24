import React from 'react';
import {
  ActionSheetIOS,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Plus, Sparkles } from 'lucide-react-native';
import { BrandColors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Story } from '@/types';

export const StoryCarousel: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { stories, user, createStory } = useAuth();

  // Find if current user has an active story
  const myStory = stories.find(
    (s) => s.userId === user?.id || s.user?.id === user?.id || (user?.username && s.user?.username === user?.username)
  );

  const hasValidUserAvatar = !!(user?.avatarUrl && !user.avatarUrl.includes('534528741775'));

  const handlePickFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        router.push({
          pathname: '/(tabs)/create',
          params: { mode: 'story' },
        });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: false,
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const isVideo = asset.type === 'video' || (asset.uri && (asset.uri.endsWith('.mp4') || asset.uri.endsWith('.mov')));
        const mediaUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        await createStory(mediaUri, '', false, isVideo ? 'video' : 'image');
        Alert.alert('Story Live! ✨', 'Your 24-hour story is now live for everyone to see.');
      }
    } catch (e) {
      console.warn('Story pick error:', e);
      router.push({
        pathname: '/(tabs)/create',
        params: { mode: 'story' },
      });
    }
  };

  const handleCaptureCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        router.push({
          pathname: '/(tabs)/create',
          params: { mode: 'story' },
        });
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const isVideo = asset.type === 'video' || (asset.uri && (asset.uri.endsWith('.mp4') || asset.uri.endsWith('.mov')));
        const mediaUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        await createStory(mediaUri, '', false, isVideo ? 'video' : 'image');
        Alert.alert('Story Live! ✨', 'Your 24-hour story has been captured and shared.');
      }
    } catch (e) {
      console.warn('Camera error:', e);
      router.push({
        pathname: '/(tabs)/create',
        params: { mode: 'story' },
      });
    }
  };

  const handleAddStoryOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Choose from Gallery', 'Take Photo with Camera', 'Open Story Editor'],
          cancelButtonIndex: 0,
        },
        (btnIdx) => {
          if (btnIdx === 1) handlePickFromGallery();
          else if (btnIdx === 2) handleCaptureCamera();
          else if (btnIdx === 3) {
            router.push({ pathname: '/(tabs)/create', params: { mode: 'story' } });
          }
        }
      );
    } else {
      Alert.alert(
        'Add to Your Story',
        'Share a disappearing moment with your circle.',
        [
          { text: 'Gallery', onPress: handlePickFromGallery },
          { text: 'Camera', onPress: handleCaptureCamera },
          {
            text: 'Editor',
            onPress: () => router.push({ pathname: '/(tabs)/create', params: { mode: 'story' } }),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  const handleUserStoryPress = () => {
    if (myStory) {
      handleOpenStory(myStory);
    } else {
      handleAddStoryOptions();
    }
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
        {/* Current User Story Ring */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleUserStoryPress}
          style={styles.storyItem}
          accessibilityRole="button"
          accessibilityLabel={myStory ? 'View your story' : 'Add to your story'}
        >
          <View style={styles.avatarWrapper}>
            <LinearGradient
              colors={myStory ? BrandColors.storyGradient : BrandColors.coralGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.addRingGradient}
            >
              <View style={[styles.innerBorder, { backgroundColor: colors.background }]}>
                {hasValidUserAvatar ? (
                  <Image
                    source={{ uri: user!.avatarUrl }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <View style={[styles.avatarInitialContainer, { backgroundColor: colors.inputBackground }]}>
                    <Text style={[styles.avatarInitialText, { color: colors.tint }]}>
                      {(user?.displayName || user?.username || 'Y').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
            </LinearGradient>

            {/* Plus badge to add another story directly from gallery */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handlePickFromGallery}
              style={[styles.addBadge, { borderColor: colors.background }]}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityLabel="Add new story"
            >
              <LinearGradient
                colors={BrandColors.coralGradient}
                style={styles.addBadgeGradient}
              >
                <Plus size={12} color="#FFFFFF" strokeWidth={3} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
          <Text
            style={[styles.storyUsername, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {myStory ? 'Your Story' : 'Add Story'}
          </Text>
        </TouchableOpacity>

        {/* Friends Stories */}
        {stories
          .filter((s) => s.userId !== user?.id && s.user?.id !== user?.id && (!user?.username || s.user?.username !== user?.username))
          .map((story) => {
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
                    {story.user.avatarUrl && !story.user.avatarUrl.includes('534528741775') ? (
                      <Image
                        source={{ uri: story.user.avatarUrl }}
                        style={styles.avatarImage}
                      />
                    ) : (
                      <View style={[styles.avatarInitialContainer, { backgroundColor: colors.inputBackground }]}>
                        <Text style={[styles.avatarInitialText, { color: colors.tint }]}>
                          {(story.user.displayName || 'F').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <LinearGradient
                    colors={isCloseFriend ? BrandColors.closeFriendsGradient : BrandColors.storyGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.storyRingGradient}
                  >
                    <View style={[styles.innerBorder, { backgroundColor: colors.background }]}>
                      {story.user.avatarUrl && !story.user.avatarUrl.includes('534528741775') ? (
                        <Image
                          source={{ uri: story.user.avatarUrl }}
                          style={styles.avatarImage}
                        />
                      ) : (
                        <View style={[styles.avatarInitialContainer, { backgroundColor: colors.inputBackground }]}>
                          <Text style={[styles.avatarInitialText, { color: colors.tint }]}>
                            {(story.user.displayName || 'F').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
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
  avatarInitialContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialText: {
    fontSize: 20,
    fontWeight: '800',
  },
  addBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  addBadgeGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
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
