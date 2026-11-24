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
import { Bookmark, Calendar, Heart, Lock, Plus, Sparkles, X } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

interface MemoryVaultModalProps {
  visible: boolean;
  onClose: () => void;
}

const VAULT_ITEMS = [
  {
    id: 'vault_1',
    title: 'Autumn in DUMBO',
    date: 'October 14, 2024',
    partnerName: 'Elena Rostova',
    imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800',
    type: 'Photo & Audio Note',
    note: 'The evening we found that hidden rooftop garden listening to acoustic cello.',
    timesMissedTogether: 42,
  },
  {
    id: 'vault_2',
    title: 'First Film Roll Exhibition',
    date: 'February 2, 2024',
    partnerName: 'Maya Chen',
    imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800',
    type: '35mm Film Collage',
    note: 'Framing all the architectural negatives before dawn with warm espresso.',
    timesMissedTogether: 28,
  },
  {
    id: 'vault_3',
    title: 'Midnight Beach Bonfire',
    date: 'June 21, 2024',
    partnerName: 'Sofia Martinez',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
    type: 'Digital Scrapbook',
    note: 'The longest day of the year under the stars. Waves kept rhythm with our stories.',
    timesMissedTogether: 35,
  },
];

export const MemoryVaultModal: React.FC<MemoryVaultModalProps> = ({ visible, onClose }) => {
  const { colors, isDark } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleGroup}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(244,63,94,0.15)' }]}>
                <Bookmark size={20} color={colors.tint} />
              </View>
              <View>
                <Text style={[styles.title, { color: colors.text }]}>Shared Memory Vault</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  Private sanctuary for sacred milestones
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Privacy badge */}
          <View style={[styles.securityBanner, { backgroundColor: isDark ? '#1C1929' : '#FFF1F2' }]}>
            <Lock size={14} color={colors.tint} />
            <Text style={[styles.securityBannerText, { color: colors.tint }]}>
              Encrypted & Protected • Only shared participants have access
            </Text>
          </View>

          {/* Vault Memories List */}
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {VAULT_ITEMS.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.vaultCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Image source={{ uri: item.imageUrl }} style={styles.vaultImage} />
                <View style={styles.vaultDetails}>
                  <View style={styles.metaRow}>
                    <View style={styles.dateRow}>
                      <Calendar size={12} color={colors.textMuted} />
                      <Text style={[styles.dateText, { color: colors.textMuted }]}>{item.date}</Text>
                    </View>
                    <View style={styles.partnerBadge}>
                      <Heart size={10} color="#F43F5E" fill="#F43F5E" />
                      <Text style={styles.partnerText}>{item.partnerName}</Text>
                    </View>
                  </View>

                  <Text style={[styles.vaultTitle, { color: colors.text }]}>{item.title}</Text>
                  <Text style={[styles.vaultNote, { color: colors.textSecondary }]}>{item.note}</Text>

                  <View style={styles.footerRow}>
                    <Text style={[styles.typeText, { color: colors.tint }]}>{item.type}</Text>
                    <Text style={[styles.statText, { color: colors.textMuted }]}>
                      ❤️ Missed {item.timesMissedTogether} times
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
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
    height: '80%',
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
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  securityBannerText: {
    fontSize: 11,
    fontWeight: '700',
  },
  list: {
    flex: 1,
  },
  vaultCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 14,
  },
  vaultImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  vaultDetails: {
    padding: 14,
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 11,
  },
  partnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(244,63,94,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  partnerText: {
    color: '#F43F5E',
    fontSize: 11,
    fontWeight: '700',
  },
  vaultTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  vaultNote: {
    fontSize: 13,
    lineHeight: 18,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statText: {
    fontSize: 11,
  },
});

