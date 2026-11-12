import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { Eye, Heart, Send, Sparkles, Users, X } from 'lucide-react-native';
import { BrandColors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { Story } from '@/types';

const { width, height } = Dimensions.get('window');

export default function StoryViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { stories, user, sendMessage } = useAuth();

  const initialIndex = Math.max(0, stories.findIndex((s) => s.id === id));
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPaused, setIsPaused] = useState(false);
  const [showViewersModal, setShowViewersModal] = useState(false);
  const [replyText, setReplyText] = useState('');

  const currentStory: Story | undefined = stories[currentIndex];
  const isOwner = currentStory?.userId === user?.id;

  // Progress Bar Animation
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!currentStory) return;

    progress.value = 0;
    const duration = (currentStory.durationSeconds || 5) * 1000;

    progress.value = withTiming(1, { duration }, (finished) => {
      if (finished) {
        // Auto-advance
      }
    });

    const timer = setTimeout(() => {
      handleNext();
    }, duration);

    return () => clearTimeout(timer);
  }, [currentIndex]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      router.back();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleSendReply = () => {
    if (!replyText.trim() || !currentStory) return;
    // Send DM reply to story owner
    sendMessage(
      `conv_${currentStory.user.username}`,
      `Replied to story: "${replyText.trim()}"`,
      'text'
    );
    setReplyText('');
    router.back();
  };

  const animatedProgressStyle = useAnimatedStyle(() => {
    return {
      width: `${progress.value * 100}%`,
    };
  });

  if (!currentStory) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Moment expired or not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Background Media */}
      <Image source={{ uri: currentStory.mediaUrl }} style={styles.mediaBackground} />
      <View style={styles.darkGradientOverlay} />

      {/* Progress Bars Row */}
      <View style={styles.progressBarContainer}>
        {stories.map((s, index) => (
          <View key={s.id} style={styles.progressTrack}>
            {index === currentIndex ? (
              <Animated.View style={[styles.progressFill, animatedProgressStyle]} />
            ) : (
              <View
                style={[
                  styles.progressFill,
                  { width: index < currentIndex ? '100%' : '0%' },
                ]}
              />
            )}
          </View>
        ))}
      </View>

      {/* Header Info */}
      <View style={styles.header}>
        <View style={styles.authorRow}>
          <Image source={{ uri: currentStory.user.avatarUrl }} style={styles.avatar} />
          <View>
            <View style={styles.nameBadgeRow}>
              <Text style={styles.authorName}>{currentStory.user.displayName}</Text>
              {currentStory.isCloseFriendsOnly && (
                <View style={styles.closeCircleBadge}>
                  <Users size={10} color="#FFFFFF" />
                  <Text style={styles.closeCircleText}>Close Circle</Text>
                </View>
              )}
            </View>
            <Text style={styles.timeAgo}>4h ago</Text>
          </View>
        </View>

        <TouchableOpacity onPress={() => router.back()} style={styles.headerCloseBtn}>
          <X size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Tap Left / Right touch zones */}
      <View style={styles.touchZonesRow}>
        <TouchableWithoutFeedback onPress={handlePrev}>
          <View style={styles.touchZone} />
        </TouchableWithoutFeedback>
        <TouchableWithoutFeedback onPress={handleNext}>
          <View style={styles.touchZone} />
        </TouchableWithoutFeedback>
      </View>

      {/* Caption if provided */}
      {currentStory.caption ? (
        <View style={styles.captionContainer}>
          <Text style={styles.captionText}>{currentStory.caption}</Text>
        </View>
      ) : null}

      {/* Bottom Bar: Owner Viewers List OR Viewer Reply Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.bottomBar}
      >
        {isOwner ? (
          <TouchableOpacity
            onPress={() => setShowViewersModal(true)}
            style={styles.viewersBtn}
          >
            <Eye size={16} color="#FFFFFF" />
            <Text style={styles.viewersCountText}>
              {currentStory.viewsCount || 42} Viewers
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.replyRow}>
            <TextInput
              placeholder={`Send message to ${currentStory.user.displayName}...`}
              placeholderTextColor="rgba(255,255,255,0.7)"
              value={replyText}
              onChangeText={setReplyText}
              style={styles.replyInput}
            />
            <TouchableOpacity onPress={handleSendReply} style={styles.sendReplyBtn}>
              <Send size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Owner Viewers List Modal */}
      <Modal visible={showViewersModal} transparent animationType="slide" onRequestClose={() => setShowViewersModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.viewersSheet}>
            <View style={styles.viewersSheetHeader}>
              <Text style={styles.viewersSheetTitle}>Story Viewers (42)</Text>
              <TouchableOpacity onPress={() => setShowViewersModal(false)}>
                <X size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <Text style={styles.viewersSheetSubtitle}>
              Only you can see who viewed this 24-hour moment.
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  mediaBackground: {
    ...StyleSheet.absoluteFill,
    width,
    height,
    resizeMode: 'cover',
  },
  darkGradientOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  progressBarContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'android' ? 14 : 6,
    gap: 4,
    zIndex: 20,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    zIndex: 20,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  authorName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  closeCircleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  closeCircleText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  timeAgo: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
  },
  headerCloseBtn: {
    padding: 6,
  },
  touchZonesRow: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    zIndex: 10,
  },
  touchZone: {
    flex: 1,
  },
  captionContainer: {
    position: 'absolute',
    bottom: 90,
    left: 20,
    right: 20,
    zIndex: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 12,
    borderRadius: 14,
  },
  captionText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 16,
    right: 16,
    zIndex: 30,
  },
  viewersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 12,
    borderRadius: 20,
    alignSelf: 'center',
    paddingHorizontal: 20,
  },
  viewersCountText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  replyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  replyInput: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 14,
  },
  sendReplyBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#F43F5E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  errorText: {
    color: '#FFF',
    fontSize: 16,
  },
  closeBtn: {
    backgroundColor: '#F43F5E',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  closeBtnText: {
    color: '#FFF',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  viewersSheet: {
    backgroundColor: '#161926',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    minHeight: 250,
  },
  viewersSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  viewersSheetTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  viewersSheetSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
  },
});
