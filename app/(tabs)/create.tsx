import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Camera,
  Check,
  Clock,
  Film,
  Image as ImageIcon,
  Sparkles,
  Users,
  Video,
  X,
} from 'lucide-react-native';
import { AffordHeader } from '@/components/AffordHeader';
import { BrandColors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

const FILTERS = [
  { name: 'Original', desc: 'Natural light', overlay: 'transparent' },
  { name: 'Warm Nostalgia', desc: 'Golden romantic memory', overlay: 'rgba(245, 158, 11, 0.12)' },
  { name: 'Golden Velvet', desc: 'Evening warmth & contrast', overlay: 'rgba(225, 29, 72, 0.1)' },
  { name: 'Film Noir', desc: 'Timeless monochrome mood', overlay: 'rgba(0, 0, 0, 0.25)' },
  { name: 'Vivid Nature', desc: 'Elevated vibrance & sky', overlay: 'rgba(16, 185, 129, 0.1)' },
];

const MOOD_CHIPS = ['Grateful', '🌅 Nostalgic', '❤️ Warm Bond', '🌟 Inspired', '☕ Peaceful'];

export default function CreateScreen() {
  const { colors, isDark } = useTheme();
  const { createPost, createStory } = useAuth();
  const params = useLocalSearchParams<{ mode?: string }>();

  // Form State
  const [targetType, setTargetType] = useState<'post' | 'story'>(params.mode === 'story' ? 'story' : 'post');
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [selectedFilter, setSelectedFilter] = useState<string>('Original');
  const [caption, setCaption] = useState<string>('');
  const [isCloseFriendsOnly, setIsCloseFriendsOnly] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);

  useEffect(() => {
    if (params.mode === 'story' || params.mode === 'post') {
      setTargetType((prev) => (prev === params.mode ? prev : (params.mode as 'post' | 'story')));
    }
  }, [params.mode]);

  // Pick Image/Video from Library
  const pickMediaFromLibrary = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Needed', 'Please allow gallery access to pick media for AFFORD.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: false,
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const isVideo = asset.type === 'video' || (asset.uri && (asset.uri.endsWith('.mp4') || asset.uri.endsWith('.mov')));
        const mediaUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setSelectedMedia(mediaUri);
        setMediaType(isVideo ? 'video' : 'image');
      }
    } catch (e) {
      console.warn('Media pick error:', e);
    }
  };

  // Launch Camera
  const takeMediaWithCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Needed', 'Please grant camera access to capture moments.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const isVideo = asset.type === 'video' || (asset.uri && (asset.uri.endsWith('.mp4') || asset.uri.endsWith('.mov')));
        const mediaUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setSelectedMedia(mediaUri);
        setMediaType(isVideo ? 'video' : 'image');
      }
    } catch (e) {
      console.warn('Camera capture error:', e);
    }
  };

  const handleAddMood = (chip: string) => {
    setCaption((prev) => (prev ? `${prev} ${chip}` : chip));
  };

  const handlePublish = async () => {
    if (!selectedMedia) {
      Alert.alert('Select Media', 'Please pick or capture a photo or video before publishing.');
      return;
    }

    setIsPublishing(true);

    try {
      if (targetType === 'story') {
        await createStory(selectedMedia, caption, isCloseFriendsOnly, mediaType);
        Alert.alert('Story Live! ✨', 'Your 24-hour story is now live for everyone to see.');
      } else {
        await createPost(selectedMedia, caption, isCloseFriendsOnly, selectedFilter, mediaType);
        Alert.alert('Published! 🎉', 'Your memory has been shared with everyone on AFFORD.');
      }

      // Reset & redirect to home
      setCaption('');
      setSelectedMedia(null);
      router.push('/(tabs)');
    } catch (e) {
      Alert.alert('Error', 'Failed to publish. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  const currentFilterObj = FILTERS.find((f) => f.name === selectedFilter);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <AffordHeader />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Target Type Selector: Post vs Story */}
          <View style={[styles.tabSelector, { backgroundColor: colors.inputBackground }]}>
            <TouchableOpacity
              onPress={() => setTargetType('post')}
              style={[
                styles.tabBtn,
                targetType === 'post' && [styles.activeTabBtn, { backgroundColor: colors.tint }],
              ]}
            >
              <Film size={15} color={targetType === 'post' ? '#FFFFFF' : colors.textSecondary} />
              <Text
                style={[
                  styles.tabBtnText,
                  { color: targetType === 'post' ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                Memory Post
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setTargetType('story')}
              style={[
                styles.tabBtn,
                targetType === 'story' && [styles.activeTabBtn, { backgroundColor: colors.tint }],
              ]}
            >
              <Clock size={15} color={targetType === 'story' ? '#FFFFFF' : colors.textSecondary} />
              <Text
                style={[
                  styles.tabBtnText,
                  { color: targetType === 'story' ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                24h Moment / Story
              </Text>
            </TouchableOpacity>
          </View>

          {/* Media Preview Stage */}
          <View style={[styles.mediaPreviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {selectedMedia ? (
              <View style={styles.imageWrapper}>
                {mediaType === 'video' ? (
                  Platform.OS === 'web' ? (
                    // @ts-ignore
                    <video
                      src={selectedMedia}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 16 }}
                      controls
                      autoPlay
                      muted
                      loop
                    />
                  ) : (
                    <View style={[styles.previewImage, { backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' }]}>
                      <Film size={48} color={BrandColors.primaryCoral} />
                      <Text style={{ color: '#FFFFFF', fontWeight: '700', marginTop: 8 }}>Video Ready</Text>
                    </View>
                  )
                ) : (
                  <Image source={{ uri: selectedMedia }} style={styles.previewImage} />
                )}
                {currentFilterObj && mediaType !== 'video' && (
                  <View
                    style={[
                      StyleSheet.absoluteFill,
                      { backgroundColor: currentFilterObj.overlay },
                    ]}
                  />
                )}
                <TouchableOpacity
                  onPress={() => setSelectedMedia(null)}
                  style={styles.removeMediaBtn}
                >
                  <X size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptyMediaBox}>
                <ImageIcon size={44} color={colors.textMuted} />
                <Text style={[styles.emptyMediaTitle, { color: colors.text }]}>
                  Choose a Memory
                </Text>
                <Text style={[styles.emptyMediaSubtitle, { color: colors.textSecondary }]}>
                  Capture from camera or pick from your camera roll.
                </Text>
              </View>
            )}

            {/* Media Action Buttons */}
            <View style={styles.mediaActionsRow}>
              <TouchableOpacity
                onPress={pickMediaFromLibrary}
                style={[styles.mediaActionBtn, { backgroundColor: colors.inputBackground }]}
              >
                <ImageIcon size={18} color={colors.tint} />
                <Text style={[styles.mediaActionText, { color: colors.text }]}>Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={takeMediaWithCamera}
                style={[styles.mediaActionBtn, { backgroundColor: colors.inputBackground }]}
              >
                <Camera size={18} color={colors.tint} />
                <Text style={[styles.mediaActionText, { color: colors.text }]}>Camera</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Filters Selector */}
          {selectedMedia && (
            <View style={styles.filtersSection}>
              <View style={styles.filterTitleRow}>
                <Sparkles size={16} color={colors.tint} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Emotional Lighting & Atmosphere
                </Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersList}>
                {FILTERS.map((f) => {
                  const isSelected = selectedFilter === f.name;
                  return (
                    <TouchableOpacity
                      key={f.name}
                      onPress={() => setSelectedFilter(f.name)}
                      style={[
                        styles.filterCard,
                        {
                          backgroundColor: isSelected
                            ? isDark ? 'rgba(244,63,94,0.18)' : '#FFF1F2'
                            : colors.inputBackground,
                          borderColor: isSelected ? colors.tint : colors.border,
                        },
                      ]}
                    >
                      <View style={[styles.filterPreviewDot, { backgroundColor: colors.tint }]} />
                      <Text
                        style={[
                          styles.filterName,
                          { color: isSelected ? colors.tint : colors.text, fontWeight: isSelected ? '800' : '600' },
                        ]}
                      >
                        {f.name}
                      </Text>
                      <Text style={[styles.filterDesc, { color: colors.textMuted }]}>{f.desc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Caption & Sentiment Section */}
          <View style={styles.captionSection}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 8 }]}>
              Reflection & Mood
            </Text>

            {/* Quick Mood Chips */}
            <View style={styles.moodChipsRow}>
              {MOOD_CHIPS.map((chip, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => handleAddMood(chip)}
                  style={[styles.moodChip, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                >
                  <Text style={[styles.moodChipText, { color: colors.textSecondary }]}>{chip}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              placeholder="What makes this moment meaningful to you?"
              placeholderTextColor={colors.textMuted}
              value={caption}
              onChangeText={setCaption}
              multiline
              style={[
                styles.captionInput,
                {
                  backgroundColor: colors.inputBackground,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
            />
          </View>

          {/* Audience / Close Friends Toggle */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setIsCloseFriendsOnly(!isCloseFriendsOnly)}
            style={[
              styles.audienceCard,
              {
                backgroundColor: isCloseFriendsOnly
                  ? isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5'
                  : colors.card,
                borderColor: isCloseFriendsOnly ? '#10B981' : colors.border,
              },
            ]}
          >
            <View style={styles.audienceLeft}>
              <View
                style={[
                  styles.audienceIconCircle,
                  { backgroundColor: isCloseFriendsOnly ? '#10B981' : colors.inputBackground },
                ]}
              >
                <Users size={18} color={isCloseFriendsOnly ? '#FFFFFF' : colors.textSecondary} />
              </View>
              <View>
                <Text style={[styles.audienceTitle, { color: colors.text }]}>
                  {isCloseFriendsOnly ? 'Close Circle Only' : 'Shared with All Connections'}
                </Text>
                <Text style={[styles.audienceSubtitle, { color: colors.textSecondary }]}>
                  {isCloseFriendsOnly
                    ? 'Only your inner circle will see this moment'
                    : 'Visible to everyone who follows you'}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.checkbox,
                {
                  borderColor: isCloseFriendsOnly ? '#10B981' : colors.border,
                  backgroundColor: isCloseFriendsOnly ? '#10B981' : 'transparent',
                },
              ]}
            >
              {isCloseFriendsOnly && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
            </View>
          </TouchableOpacity>

          {/* Publish Button */}
          <TouchableOpacity
            onPress={handlePublish}
            disabled={isPublishing || !selectedMedia}
            style={[
              styles.publishBtn,
              { opacity: isPublishing || !selectedMedia ? 0.6 : 1 },
            ]}
          >
            <LinearGradient
              colors={BrandColors.coralGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.publishGradient}
            >
              <Text style={styles.publishBtnText}>
                {isPublishing
                  ? 'Sharing Moment...'
                  : targetType === 'story'
                  ? 'Share to 24h Moments'
                  : 'Publish Memory to Feed 🚀'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  tabSelector: {
    flexDirection: 'row',
    borderRadius: 18,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 14,
  },
  activeTabBtn: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  mediaPreviewCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  imageWrapper: {
    width: '100%',
    aspectRatio: 4 / 3,
    position: 'relative',
    backgroundColor: '#0A0A0F',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeMediaBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyMediaBox: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyMediaTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 12,
  },
  emptyMediaSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  mediaActionsRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 10,
  },
  mediaActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 14,
  },
  mediaActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  filtersSection: {
    gap: 8,
  },
  filterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  filtersList: {
    gap: 10,
    paddingVertical: 4,
  },
  filterCard: {
    width: 132,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  filterPreviewDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 6,
  },
  filterName: {
    fontSize: 12,
    marginBottom: 2,
  },
  filterDesc: {
    fontSize: 10,
  },
  captionSection: {
    gap: 8,
  },
  moodChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  moodChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  moodChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  captionInput: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    fontSize: 14,
    minHeight: 88,
    textAlignVertical: 'top',
  },
  audienceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  audienceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  audienceIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audienceTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  audienceSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishBtn: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 6,
    shadowColor: '#F43F5E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  publishGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
