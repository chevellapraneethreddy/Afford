import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
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
  ArrowLeft,
  Flame,
  Heart,
  ImageIcon,
  Mic,
  MoreVertical,
  Play,
  Send,
  Sparkles,
} from 'lucide-react-native';
import { ConnectionQuestionCard } from '@/components/ConnectionQuestionCard';
import { MilestoneCelebrationModal } from '@/components/MilestoneCelebrationModal';
import { MissYouGesture } from '@/components/MissYouGesture';
import { VoicePostcardRecorder } from '@/components/VoicePostcardRecorder';
import { BrandColors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Message } from '@/types';

const CHAT_ICEBREAKERS = [
  'Miss you! ❤️',
  'Thinking of you ✨',
  'Coffee soon? ☕',
  'Hope you have an amazing day 🌟',
];

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const {
    conversations,
    messages,
    sendMessage,
    sendMissYouGesture,
    user,
    connectionQuestions,
    milestoneCelebration,
    triggerMilestoneCelebration,
    clearMilestoneCelebration,
  } = useAuth();

  const conversation = conversations.find((c) => c.id === id);
  const friend = conversation?.otherUser;
  const conversationMessages = (id && messages[id]) || [];

  const [inputText, setInputText] = useState('');
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [showQuestionCard, setShowQuestionCard] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const partnerQuestion =
    connectionQuestions.find((q) => q.partnerUser?.id === friend?.id) ||
    connectionQuestions[0];

  useEffect(() => {
    // Scroll to bottom on initial load or new message
    if (flatListRef.current && conversationMessages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [conversationMessages.length]);

  const handleSendText = (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || !id) return;
    sendMessage(id, text.trim(), 'text');
    setInputText('');
  };

  const handleSendImage = async () => {
    if (!id) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!res.canceled && res.assets[0]) {
      sendMessage(id, 'Photo memory', 'image', res.assets[0].uri);
    }
  };

  const handleSendVoice = () => {
    setIsRecordingVoice(!isRecordingVoice);
  };

  const handleVoiceRecorded = (audioUri: string, durationFormatted: string) => {
    if (!id) return;
    setIsRecordingVoice(false);
    sendMessage(id, `Voice Postcard (${durationFormatted})`, 'voice', audioUri);
  };

  const renderMessageItem = ({ item }: { item: Message }) => {
    const isMe = item.senderId === user?.id;

    return (
      <View
        style={[
          styles.messageRow,
          isMe ? styles.messageRowMe : styles.messageRowFriend,
        ]}
      >
        {isMe ? (
          <LinearGradient
            colors={BrandColors.coralGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.messageBubble, styles.bubbleMe]}
          >
            {item.mediaType === 'image' && item.mediaUrl ? (
              <Image source={{ uri: item.mediaUrl }} style={styles.messageImage} />
            ) : item.mediaType === 'voice' ? (
              <View style={styles.voiceMessageContainer}>
                <View style={styles.playBtnCircleMe}>
                  <Play size={14} color="#F43F5E" fill="#F43F5E" />
                </View>
                <View style={styles.waveformBars}>
                  {[12, 20, 16, 26, 14, 22, 10, 18].map((h, i) => (
                    <View key={i} style={[styles.bar, { height: h, backgroundColor: '#FFFFFF' }]} />
                  ))}
                </View>
                <Text style={styles.voiceDurationMe}>0:14</Text>
              </View>
            ) : (
              <Text style={styles.messageTextMe}>{item.content}</Text>
            )}

            <Text style={styles.messageTimeMe}>
              {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </LinearGradient>
        ) : (
          <View
            style={[
              styles.messageBubble,
              styles.bubbleFriend,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {item.mediaType === 'image' && item.mediaUrl ? (
              <Image source={{ uri: item.mediaUrl }} style={styles.messageImage} />
            ) : item.mediaType === 'voice' ? (
              <View style={styles.voiceMessageContainer}>
                <View style={[styles.playBtnCircleFriend, { backgroundColor: colors.tint }]}>
                  <Play size={14} color="#FFFFFF" fill="#FFFFFF" />
                </View>
                <View style={styles.waveformBars}>
                  {[12, 20, 16, 26, 14, 22, 10, 18].map((h, i) => (
                    <View key={i} style={[styles.bar, { height: h, backgroundColor: colors.tint }]} />
                  ))}
                </View>
                <Text style={[styles.voiceDurationFriend, { color: colors.text }]}>0:14</Text>
              </View>
            ) : (
              <Text style={[styles.messageTextFriend, { color: colors.text }]}>
                {item.content}
              </Text>
            )}

            <Text style={[styles.messageTimeFriend, { color: colors.textMuted }]}>
              {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Chat Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerUser}
            onPress={() => {
              if (friend?.id) {
                router.push({ pathname: '/friendship/[id]', params: { id: friend.id } } as any);
              }
            }}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`View friendship bond with ${friend?.displayName || 'Friend'}`}
          >
            <Image
              source={{ uri: friend?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400' }}
              style={styles.headerAvatar}
            />
            <View>
              <View style={styles.headerNameRow}>
                <Text style={[styles.headerName, { color: colors.text }]} numberOfLines={1}>
                  {friend?.displayName || conversation?.name || 'Chat'}
                </Text>
                {conversation?.isMutualMissYou && (
                  <View style={styles.headerMutualBadge}>
                    <Heart size={8} color="#FF4D8D" fill="#FF4D8D" />
                  </View>
                )}
              </View>
              <View style={styles.statusRow}>
                {conversation?.isOnline ? (
                  <>
                    <View style={styles.onlineDot} />
                    <Text style={[styles.statusText, { color: '#10B981' }]}>Active now</Text>
                  </>
                ) : (
                  <Text style={[styles.statusText, { color: colors.textMuted }]}>
                    {conversation?.lastSeenText || 'Offline'}
                  </Text>
                )}
                {conversation?.streakDays && conversation.streakDays > 0 ? (
                  <View style={[styles.headerStreak, { backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : '#FEF3C7' }]}>
                    <Flame size={12} color="#F59E0B" fill="#F59E0B" />
                    <Text style={[styles.headerStreakText, { color: isDark ? '#FCD34D' : '#B45309' }]}>
                      {conversation.streakDays}d
                    </Text>
                  </View>
                ) : null}
                {conversation?.milestone && (
                  <TouchableOpacity
                    onPress={() => friend && triggerMilestoneCelebration(conversation.milestone!, friend)}
                    style={styles.headerMilestonePill}
                    accessibilityRole="button"
                    accessibilityLabel={`${conversation.milestone.days} Day Milestone`}
                  >
                    <Text style={styles.headerMilestoneEmoji}>{conversation.milestone.badge}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* SIGNATURE MISS YOU GESTURE IN CHAT HEADER */}
        {friend && (
          <View style={styles.headerRight}>
            <MissYouGesture
              recipientId={friend.id}
              recipientName={friend.displayName}
              currentCount={conversation?.missYouCount || 0}
              dailyCount={conversation?.dailyMissYouCount || 0}
              isMutual={conversation?.isMutualMissYou || false}
              conversationId={id}
              onSendMissYou={sendMissYouGesture}
              compact
            />
          </View>
        )}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Messages List with Connection Question header */}
        <FlatList
          ref={flatListRef}
          data={conversationMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            partnerQuestion ? (
              <View style={styles.connectionHeaderArea}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setShowQuestionCard(!showQuestionCard)}
                  style={[
                    styles.questionToggleBtn,
                    {
                      backgroundColor: isDark
                        ? 'rgba(255, 77, 141, 0.12)'
                        : 'rgba(255, 241, 242, 0.8)',
                      borderColor: isDark ? 'rgba(255, 77, 141, 0.3)' : 'rgba(255, 77, 141, 0.2)',
                    },
                  ]}
                >
                  <Sparkles size={13} color="#FF4D8D" />
                  <Text style={[styles.questionToggleText, { color: colors.tint }]}>
                    {showQuestionCard
                      ? 'Hide Connection Question ▲'
                      : `Today's Question with ${friend?.displayName?.split(' ')[0] || 'Friend'} 💭 ▼`}
                  </Text>
                </TouchableOpacity>

                {showQuestionCard && (
                  <ConnectionQuestionCard
                    question={partnerQuestion}
                    partnerName={friend?.displayName}
                  />
                )}
              </View>
            ) : undefined
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <LinearGradient
                colors={BrandColors.coralGradient}
                style={styles.emptyIconCircle}
              >
                <Heart size={28} color="#FFFFFF" fill="#FFFFFF" />
              </LinearGradient>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No messages yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Express that you miss them or send a quick warm message below.
              </Text>

              {/* Quick Icebreakers */}
              <View style={styles.icebreakersWrap}>
                {CHAT_ICEBREAKERS.map((prompt, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => handleSendText(prompt)}
                    style={[styles.icebreakerChip, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <Text style={[styles.icebreakerText, { color: colors.text }]}>{prompt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          }
        />

        {/* Voice Postcard Interactive Recorder */}
        {isRecordingVoice && (
          <VoicePostcardRecorder
            onSendVoice={handleVoiceRecorded}
            onCancel={() => setIsRecordingVoice(false)}
          />
        )}

        {/* Input Bar */}
        <View style={[styles.inputBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <TouchableOpacity onPress={handleSendImage} style={styles.iconBtn}>
            <ImageIcon size={22} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSendVoice}
            style={[styles.iconBtn, isRecordingVoice && { backgroundColor: 'rgba(244,63,94,0.15)' }]}
          >
            <Mic size={22} color={isRecordingVoice ? '#F43F5E' : colors.textSecondary} />
          </TouchableOpacity>

          <TextInput
            placeholder="Type a thoughtful message..."
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            style={[
              styles.textInput,
              {
                backgroundColor: colors.inputBackground,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
          />

          <TouchableOpacity
            onPress={() => handleSendText()}
            disabled={!inputText.trim()}
            style={[
              styles.sendBtn,
              { opacity: inputText.trim() ? 1 : 0.4 },
            ]}
          >
            <LinearGradient
              colors={BrandColors.coralGradient}
              style={styles.sendGradient}
            >
              <Send size={15} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Milestone Celebration Modal */}
        <MilestoneCelebrationModal
          visible={Boolean(milestoneCelebration)}
          milestone={milestoneCelebration?.milestone || null}
          friend={milestoneCelebration?.friend || null}
          onClose={clearMilestoneCelebration}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    height: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  backBtn: {
    padding: 4,
  },
  headerUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerName: {
    fontSize: 15.5,
    fontWeight: '800',
  },
  headerMutualBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255, 77, 141, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerMilestonePill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    marginLeft: 3,
  },
  headerMilestoneEmoji: {
    fontSize: 10,
  },
  connectionHeaderArea: {
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  questionToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignSelf: 'center',
    marginBottom: 6,
  },
  questionToggleText: {
    fontSize: 11,
    fontWeight: '800',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  headerStreak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    marginLeft: 4,
  },
  headerStreakText: {
    fontSize: 10,
    fontWeight: '800',
  },
  headerRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 3,
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowFriend: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    position: 'relative',
  },
  bubbleMe: {
    borderBottomRightRadius: 4,
    shadowColor: '#F43F5E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 2,
  },
  bubbleFriend: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  messageTextMe: {
    color: '#FFFFFF',
    fontSize: 14.5,
    lineHeight: 20,
    fontWeight: '500',
  },
  messageTextFriend: {
    fontSize: 14.5,
    lineHeight: 20,
    fontWeight: '500',
  },
  messageTimeMe: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.75)',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  messageTimeFriend: {
    fontSize: 10,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 14,
    marginBottom: 4,
  },
  voiceMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  playBtnCircleMe: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnCircleFriend: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveformBars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  bar: {
    width: 3,
    borderRadius: 2,
  },
  voiceDurationMe: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  voiceDurationFriend: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 240,
  },
  icebreakersWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
    justifyContent: 'center',
    maxWidth: 300,
  },
  icebreakerChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  icebreakerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    paddingHorizontal: 16,
    fontSize: 14,
    borderWidth: 1,
  },
  sendBtn: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  sendGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
