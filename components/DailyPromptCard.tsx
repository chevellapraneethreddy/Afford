import React, { useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { HeartHandshake, MessageCircle, Send, Sparkles } from 'lucide-react-native';
import { BrandColors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

const EMOTIONAL_TAGS = ['Grateful', '🌅 Nostalgic', '❤️ Warm', '☕ Peaceful', '😂 Smiling'];

export const DailyPromptCard: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { dailyPrompt, submitDailyPrompt, user } = useAuth();
  const [inputText, setInputText] = useState(dailyPrompt.myResponse || '');
  const [isEditing, setIsEditing] = useState(false);

  const handleSubmit = () => {
    if (!inputText.trim()) return;
    submitDailyPrompt(inputText.trim());
    setIsEditing(false);
  };

  const handleSelectTag = (tag: string) => {
    setInputText((prev) => (prev ? `${prev} ${tag}` : tag));
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isDark ? 'rgba(244, 63, 94, 0.22)' : 'rgba(244, 63, 94, 0.15)',
        },
      ]}
    >
      <LinearGradient
        colors={BrandColors.coralGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.topAccentBar}
      />

      {/* Category & Badge */}
      <View style={styles.headerRow}>
        <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(244, 63, 94, 0.15)' : 'rgba(244, 63, 94, 0.1)' }]}>
          <Sparkles size={11} color={colors.tint} />
          <Text style={[styles.badgeText, { color: colors.tint }]}>
            DAILY EMOTIONAL PROMPT
          </Text>
        </View>

        {/* Friend Reflections Badge */}
        <View style={styles.participantsBadge}>
          <Text style={[styles.participantsText, { color: colors.textSecondary }]}>
            {dailyPrompt.myResponse ? 'Answered today ✨' : 'Reflect with friends today'}
          </Text>
        </View>
      </View>

      {/* Prompt Question */}
      <Text style={[styles.promptQuestion, { color: colors.text }]}>
        "{dailyPrompt.promptText}"
      </Text>

      {/* Answer status or input */}
      {dailyPrompt.myResponse && !isEditing ? (
        <View style={[styles.myResponseBox, { backgroundColor: isDark ? '#111420' : '#FFF5F6', borderColor: colors.border }]}>
          <View style={styles.myResponseHeader}>
            <Text style={[styles.myResponseLabel, { color: colors.tint }]}>Your reflection:</Text>
            <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editBtn}>
              <Text style={[styles.editText, { color: colors.textSecondary }]}>Edit</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.myResponseText, { color: colors.text }]}>
            {dailyPrompt.myResponse}
          </Text>
        </View>
      ) : (
        <View style={styles.inputContainer}>
          {/* Quick Emotional Mood Chips */}
          <View style={styles.chipsRow}>
            {EMOTIONAL_TAGS.map((tag, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => handleSelectTag(tag)}
                style={[
                  styles.moodChip,
                  {
                    backgroundColor: isDark ? '#191D2C' : '#F5EFF1',
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.moodChipText, { color: colors.textSecondary }]}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            placeholder="Share your reflection with close friends..."
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            style={[
              styles.textInput,
              {
                backgroundColor: isDark ? '#10121C' : '#FFFFFF',
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
          />
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!inputText.trim()}
            style={[
              styles.submitBtn,
              { opacity: inputText.trim() ? 1 : 0.5 },
            ]}
          >
            <LinearGradient
              colors={BrandColors.coralGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitGradient}
            >
              <Send size={14} color="#FFFFFF" />
              <Text style={styles.submitBtnText}>Share Reflection</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 10,
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#F43F5E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  topAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  participantsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  participantsText: {
    fontSize: 11,
    fontWeight: '600',
  },
  promptQuestion: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 23,
    marginBottom: 12,
  },
  inputContainer: {
    gap: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 2,
  },
  moodChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  moodChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    minHeight: 52,
  },
  submitBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    alignSelf: 'flex-end',
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  myResponseBox: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  myResponseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  myResponseLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  myResponseText: {
    fontSize: 13.5,
    lineHeight: 19,
  },
  editBtn: {
    paddingHorizontal: 4,
  },
  editText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
