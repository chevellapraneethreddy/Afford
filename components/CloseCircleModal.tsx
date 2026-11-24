import React, { useState } from 'react';
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Check, ShieldCheck, UserCheck, Users, X } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { INITIAL_FRIENDS } from '@/lib/mockData';

interface CloseCircleModalProps {
  visible: boolean;
  onClose: () => void;
}

export const CloseCircleModal: React.FC<CloseCircleModalProps> = ({ visible, onClose }) => {
  const { colors, isDark } = useTheme();
  // Default close friends IDs
  const [closeFriendIds, setCloseFriendIds] = useState<string[]>(['usr_elena', 'usr_sofia']);

  const toggleMember = (id: string) => {
    setCloseFriendIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleGroup}>
              <View style={styles.iconCircle}>
                <Users size={20} color="#10B981" />
              </View>
              <View>
                <Text style={[styles.title, { color: colors.text }]}>Close Circle</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  {closeFriendIds.length} members selected
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Description banner */}
          <View style={[styles.infoBanner, { backgroundColor: isDark ? '#062B1D' : '#ECFDF5' }]}>
            <Text style={styles.infoBannerText}>
              Memories and 24h stories marked with the green circle are strictly confidential and only visible to members of your Close Circle.
            </Text>
          </View>

          {/* Friends Selection List */}
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {INITIAL_FRIENDS.map((friend) => {
              const isSelected = closeFriendIds.includes(friend.id);

              return (
                <TouchableOpacity
                  key={friend.id}
                  activeOpacity={0.8}
                  onPress={() => toggleMember(friend.id)}
                  style={[
                    styles.friendRow,
                    {
                      backgroundColor: isSelected
                        ? isDark ? '#062B1D' : '#F0FDF4'
                        : colors.card,
                      borderColor: isSelected ? '#10B981' : colors.border,
                    },
                  ]}
                >
                  <Image source={{ uri: friend.avatarUrl }} style={styles.avatar} />

                  <View style={styles.friendInfo}>
                    <View style={styles.nameRow}>
                      <Text style={[styles.displayName, { color: colors.text }]}>
                        {friend.displayName}
                      </Text>
                      {friend.isVerified && <ShieldCheck size={14} color="#3B82F6" />}
                    </View>
                    <Text style={[styles.handle, { color: colors.textSecondary }]}>
                      @{friend.username}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.checkCircle,
                      {
                        backgroundColor: isSelected ? '#10B981' : colors.inputBackground,
                        borderColor: isSelected ? '#10B981' : colors.border,
                      },
                    ]}
                  >
                    {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Save Button */}
          <TouchableOpacity onPress={onClose} style={styles.saveBtn}>
            <Text style={styles.saveBtnText}>Save Close Circle</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  card: {
    height: '75%',
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    padding: 20,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  infoBanner: {
    padding: 12,
    borderRadius: 14,
  },
  infoBannerText: {
    color: '#10B981',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 8,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  friendInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  displayName: {
    fontSize: 14,
    fontWeight: '700',
  },
  handle: {
    fontSize: 12,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

