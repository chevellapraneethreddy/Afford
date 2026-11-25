import React, { useEffect, useState } from 'react';
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
import { useAuth, isValidUUID, toValidUUID } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import { PostComment } from '@/types';

interface CommentsSheetProps {
  visible: boolean;
  postId: string;
  onClose: () => void;
}

export const CommentsSheet: React.FC<CommentsSheetProps> = ({ visible, postId, onClose }) => {
  const { colors, isDark } = useTheme();
  const { user, addPostComment } = useAuth();
  const [inputText, setInputText] = useState('');
  const [localComments, setLocalComments] = useState<PostComment[]>([]);

  useEffect(() => {
    if (!visible || !postId) return;
    let isCurrent = true;
    (async () => {
      try {
        const validPostId = isValidUUID(postId) ? postId : toValidUUID(postId);
        const { data, error } = await supabase
          .from('post_comments')
          .select('id, post_id, user_id, comment, created_at')
          .eq('post_id', validPostId)
          .order('created_at', { ascending: true });

        if (!error && data && isCurrent) {
          const userIds = Array.from(new Set(data.map((c: any) => c.user_id)));
          const { data: profs } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .in('id', userIds);

          const profMap = new Map<string, any>();
          (profs || []).forEach((p: any) => profMap.set(p.id, p));

          const mapped: PostComment[] = data.map((c: any) => {
            const author = profMap.get(c.user_id);
            return {
              id: c.id,
              postId: c.post_id,
              userId: c.user_id,
              username: author?.username || 'member',
              displayName: author?.display_name || author?.username || 'Afford Member',
              avatarUrl: author?.avatar_url || '',
              comment: c.comment,
              createdAt: 'Recently',
            };
          });
          setLocalComments(mapped);
        }
      } catch {}
    })();
    return () => {
      isCurrent = false;
    };
  }, [visible, postId]);

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
                  {item.avatarUrl ? (
                    <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, { backgroundColor: colors.inputBackground, alignItems: 'center', justifyContent: 'center' }]}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.tint }}>
                        {(item.displayName || 'U').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
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
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
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

