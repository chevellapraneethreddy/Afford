import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Send, X } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { PostComment } from '@/types';

interface CommentsSheetProps {
  visible: boolean;
  postId: string;
  onClose: () => void;
}

const SAMPLE_COMMENTS: Record<string, PostComment[]> = {
  post_1: [
    {
      id: 'c1',
      postId: 'post_1',
      userId: 'usr_maya',
      username: 'maya_chen',
      displayName: 'Maya Chen',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400',
      comment: 'Remember the hot cocoa we grabbed across the street? The best.',
      createdAt: '1h ago',
    },
    {
      id: 'c2',
      postId: 'post_1',
      userId: 'usr_sofia',
      username: 'sofia_martinez',
      displayName: 'Sofia Martinez',
      avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400',
      comment: 'This warmth in your photos always makes me stop scrolling ✨',
      createdAt: '45m ago',
    },
  ],
};

export const CommentsSheet: React.FC<CommentsSheetProps> = ({ visible, postId, onClose }) => {
  const { colors, isDark } = useTheme();
  const { user, addPostComment } = useAuth();
  const [inputText, setInputText] = useState('');
  const [localComments, setLocalComments] = useState<PostComment[]>(SAMPLE_COMMENTS[postId] || []);

  const handleSend = () => {
    if (!inputText.trim() || !user) return;
    const newComment: PostComment = {
      id: `c_${Date.now()}`,
      postId,
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      comment: inputText.trim(),
      createdAt: 'Just now',
    };

    setLocalComments((prev) => [...prev, newComment]);
    addPostComment(postId, inputText.trim());
    setInputText('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Comments</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Comments List */}
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {localComments.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Be the first to leave a warm note.
                </Text>
              </View>
            ) : (
              localComments.map((item) => (
                <View key={item.id} style={styles.commentRow}>
                  <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
                  <View style={styles.commentBody}>
                    <View style={styles.commentMeta}>
                      <Text style={[styles.author, { color: colors.text }]}>{item.displayName}</Text>
                      <Text style={[styles.time, { color: colors.textMuted }]}>{item.createdAt}</Text>
                    </View>
                    <Text style={[styles.commentText, { color: colors.textSecondary }]}>
                      {item.comment}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          {/* Comment Input */}
          <View style={[styles.inputRow, { backgroundColor: colors.inputBackground, borderTopColor: colors.border }]}>
            <TextInput
              placeholder="Add a kind comment..."
              placeholderTextColor={colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              style={[styles.input, { color: colors.text }]}
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={!inputText.trim()}
              style={[
                styles.sendBtn,
                { backgroundColor: colors.tint, opacity: inputText.trim() ? 1 : 0.4 },
              ]}
            >
              <Send size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    height: '65%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.2)',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  list: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  commentBody: {
    flex: 1,
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  author: {
    fontSize: 13,
    fontWeight: '700',
  },
  time: {
    fontSize: 11,
  },
  commentText: {
    fontSize: 13,
    lineHeight: 18,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 6,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

