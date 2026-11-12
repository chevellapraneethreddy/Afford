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
import {
  Check,
  Heart,
  Lock,
  MessageCircle,
  Send,
  Sparkles,
  Users,
} from 'lucide-react-native';
import { BrandColors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { ConnectionQuestion } from '@/types';

interface ConnectionQuestionCardProps {
  question: ConnectionQuestion;
  partnerName?: string;
  onAnswerSubmit?: (answer: string) => void;
  compact?: boolean;
}

export const ConnectionQuestionCard: React.FC<ConnectionQuestionCardProps> = ({
  question,
  partnerName,
  onAnswerSubmit,
  compact = false,
}) => {
  const { colors, isDark } = useTheme();
  const { user, answerConnectionQuestion } = useAuth();
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const targetPartner = question.partnerUser;
  const targetName = partnerName || targetPartner?.displayName?.split(' ')[0] || 'Friend';

  const handleSendAnswer = async () => {
    if (!inputText.trim()) return;
    setIsSubmitting(true);
    if (onAnswerSubmit) {
      onAnswerSubmit(inputText.trim());
    } else {
      await answerConnectionQuestion(
        question.id,
        inputText.trim(),
        targetPartner?.id,
        question.isPrivate
      );
    }
    setInputText('');
    setIsSubmitting(false);
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'couples':
        return '#FF4D8D';
      case 'deep':
        return '#8B5CF6';
      case 'fun':
        return '#F59E0B';
      default:
        return '#10B981';
    }
  };

  const categoryColor = getCategoryColor(question.category);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isDark ? 'rgba(255, 77, 141, 0.28)' : 'rgba(255, 77, 141, 0.18)',
        },
      ]}
    >
      <LinearGradient
        colors={[
          isDark ? 'rgba(255, 77, 141, 0.08)' : 'rgba(255, 241, 242, 0.6)',
          'transparent',
        ]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header Pill */}
      <View style={styles.headerRow}>
        <View style={styles.pillRow}>
          <View
            style={[
              styles.categoryPill,
              { backgroundColor: `${categoryColor}20` },
            ]}
          >
            <Sparkles size={11} color={categoryColor} />
            <Text style={[styles.categoryText, { color: categoryColor }]}>
              {question.category.toUpperCase()}
            </Text>
          </View>

          {question.isPrivate && (
            <View
              style={[
                styles.privatePill,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9' },
              ]}
            >
              <Lock size={10} color={colors.textSecondary} />
              <Text style={[styles.privateText, { color: colors.textSecondary }]}>
                Private with {targetName}
              </Text>
            </View>
          )}
        </View>

        <Text style={[styles.dailyTag, { color: colors.tint }]}>Daily Reflection</Text>
      </View>

      {/* Question Prompt */}
      <Text style={[styles.questionText, { color: colors.text }]}>
        {question.questionText}
      </Text>

      {/* Answer Area */}
      {question.answeredByMe ? (
        <View style={styles.answersSection}>
          {/* My Answer */}
          <View style={[styles.answerBubble, { backgroundColor: isDark ? 'rgba(255, 77, 141, 0.12)' : '#FFF1F2', borderColor: '#FF4D8D30' }]}>
            <View style={styles.answerAuthorRow}>
              <Text style={[styles.answerAuthorText, { color: '#FF4D8D' }]}>Your reflection:</Text>
              <Check size={12} color="#FF4D8D" strokeWidth={3} />
            </View>
            <Text style={[styles.answerBodyText, { color: colors.text }]}>
              "{question.myAnswer}"
            </Text>
          </View>

          {/* Partner Answer */}
          {question.partnerAnswer ? (
            <View style={[styles.answerBubble, { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.12)' : '#F3E8FF', borderColor: '#8B5CF630' }]}>
              <View style={styles.answerAuthorRow}>
                <Heart size={12} color="#8B5CF6" fill="#8B5CF6" />
                <Text style={[styles.answerAuthorText, { color: '#8B5CF6' }]}>
                  {targetName}'s reflection:
                </Text>
              </View>
              <Text style={[styles.answerBodyText, { color: colors.text }]}>
                "{question.partnerAnswer}"
              </Text>
            </View>
          ) : (
            <View style={[styles.waitingBubble, { borderColor: colors.border }]}>
              <Lock size={12} color={colors.textSecondary} />
              <Text style={[styles.waitingText, { color: colors.textSecondary }]}>
                Waiting for {targetName}'s answer to unlock mutual answers... 🔒
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.inputArea}>
          <TextInput
            placeholder={`Share your private answer with ${targetName}...`}
            placeholderTextColor={colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            style={[
              styles.textInput,
              {
                backgroundColor: colors.inputBackground,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
          />
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSendAnswer}
            disabled={!inputText.trim() || isSubmitting}
            style={[
              styles.sendBtn,
              { opacity: inputText.trim() ? 1 : 0.5 },
            ]}
          >
            <LinearGradient
              colors={BrandColors.coralGradient}
              style={styles.sendBtnGradient}
            >
              <Send size={14} color="#FFFFFF" />
              <Text style={styles.sendBtnText}>
                {isSubmitting ? 'Sharing...' : `Share with ${targetName}`}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 16,
    overflow: 'hidden',
    position: 'relative',
    marginVertical: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  categoryText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  privatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  privateText: {
    fontSize: 10,
    fontWeight: '600',
  },
  dailyTag: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  questionText: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 22,
    marginBottom: 14,
  },
  inputArea: {
    gap: 10,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    minHeight: 64,
    textAlignVertical: 'top',
  },
  sendBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  sendBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  answersSection: {
    gap: 8,
  },
  answerBubble: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  answerAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  answerAuthorText: {
    fontSize: 11,
    fontWeight: '800',
  },
  answerBodyText: {
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  waitingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  waitingText: {
    fontSize: 11,
    fontWeight: '500',
    fontStyle: 'italic',
  },
});
