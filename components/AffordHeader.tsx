import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Bell, Flame, Heart, Sparkles, UserPlus, X } from 'lucide-react-native';
import { BrandColors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { InviteFriendsModal } from '@/components/InviteFriendsModal';

export const AffordHeader: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { notifications, markNotificationsRead, user } = useAuth();
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'all' | 'miss_you'>('all');

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleOpenNotifications = () => {
    setShowNotificationsModal(true);
    markNotificationsRead();
  };

  const filteredNotifications = notifications.filter((item) => {
    if (notifFilter === 'miss_you') return item.type === 'miss_you';
    return true;
  });

  return (
    <View style={[styles.headerContainer, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
      {/* Brand Logo & Name */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push('/(tabs)')}
        style={styles.logoContainer}
      >
        <LinearGradient
          colors={BrandColors.coralGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.logoIconGradient}
        >
          <Heart size={16} color="#FFFFFF" fill="#FFFFFF" />
        </LinearGradient>
        <View style={styles.brandTextCol}>
          <View style={styles.brandTitleRow}>
            <Text style={[styles.brandTitle, { color: colors.text }]}>
              AFF<Text style={{ color: colors.tint }}>ORD</Text>
            </Text>
            <View style={styles.brandSubDot} />
          </View>
          <Text style={[styles.brandTagline, { color: colors.textMuted }]} numberOfLines={1}>
            Feel closer. Even when apart.
          </Text>
        </View>
      </TouchableOpacity>

      {/* Header Actions */}
      <View style={styles.actionsRow}>
        {/* Invite Friends Button */}
        <TouchableOpacity
          onPress={() => setShowInviteModal(true)}
          style={[
            styles.invitePill,
            {
              backgroundColor: isDark ? 'rgba(244,63,94,0.15)' : '#FFE4E6',
              borderColor: 'rgba(244,63,94,0.3)',
            },
          ]}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Invite Friends"
        >
          <UserPlus size={13} color="#F43F5E" />
          <Text style={styles.invitePillText}>Invite</Text>
        </TouchableOpacity>

        {/* Streak Indicator */}
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/messages')}
          style={[styles.streakPill, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7', borderColor: 'rgba(245, 158, 11, 0.3)' }]}
        >
          <Flame size={15} color="#F59E0B" fill="#F59E0B" />
          <Text style={[styles.streakText, { color: isDark ? '#FCD34D' : '#B45309' }]}>
            42
          </Text>
        </TouchableOpacity>

        {/* Notification Bell */}
        <TouchableOpacity
          onPress={handleOpenNotifications}
          style={[styles.iconButton, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
        >
          <Bell size={19} color={colors.text} />
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Notifications Modal */}
      <Modal
        visible={showNotificationsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNotificationsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sheetHandle} />

            <View style={styles.modalHeader}>
              <View style={styles.modalTitleGroup}>
                <View style={styles.modalIconWrap}>
                  <Bell size={18} color={colors.tint} />
                </View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Notifications</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowNotificationsModal(false)}
                style={[styles.closeBtn, { backgroundColor: colors.inputBackground }]}
              >
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Filter Pills */}
            <View style={styles.filterRow}>
              <TouchableOpacity
                onPress={() => setNotifFilter('all')}
                style={[
                  styles.filterPill,
                  notifFilter === 'all'
                    ? { backgroundColor: colors.tint }
                    : { backgroundColor: colors.inputBackground },
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    { color: notifFilter === 'all' ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  All ({notifications.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setNotifFilter('miss_you')}
                style={[
                  styles.filterPill,
                  notifFilter === 'miss_you'
                    ? { backgroundColor: colors.tint }
                    : { backgroundColor: colors.inputBackground },
                ]}
              >
                <Heart size={12} color={notifFilter === 'miss_you' ? '#FFFFFF' : '#F43F5E'} fill={notifFilter === 'miss_you' ? '#FFFFFF' : '#F43F5E'} />
                <Text
                  style={[
                    styles.filterPillText,
                    { color: notifFilter === 'miss_you' ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  Miss You Signals
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.notifList} showsVerticalScrollIndicator={false}>
              {filteredNotifications.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Sparkles size={32} color={colors.textMuted} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    {notifFilter === 'miss_you' ? 'No new Miss You signals yet' : 'You are all caught up!'}
                  </Text>
                </View>
              ) : (
                filteredNotifications.map((item) => (
                  <View
                    key={item.id}
                    style={[
                      styles.notifCard,
                      {
                        backgroundColor: item.isRead
                          ? colors.card
                          : isDark
                          ? 'rgba(244, 63, 94, 0.12)'
                          : '#FFF1F2',
                        borderColor: item.isRead ? colors.border : colors.tint,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.notifIconCircle,
                        {
                          backgroundColor:
                            item.type === 'miss_you'
                              ? 'rgba(244,63,94,0.18)'
                              : item.type === 'streak_warning'
                              ? 'rgba(245,158,11,0.18)'
                              : 'rgba(124,58,237,0.18)',
                        },
                      ]}
                    >
                      {item.type === 'miss_you' ? (
                        <Heart size={16} color="#F43F5E" fill="#F43F5E" />
                      ) : item.type === 'streak_warning' ? (
                        <Flame size={16} color="#F59E0B" fill="#F59E0B" />
                      ) : (
                        <Bell size={16} color={colors.tint} />
                      )}
                    </View>
                    <View style={styles.notifContent}>
                      <Text style={[styles.notifTitle, { color: colors.text }]}>{item.title}</Text>
                      <Text style={[styles.notifBody, { color: colors.textSecondary }]}>{item.body}</Text>
                      <Text style={[styles.notifTime, { color: colors.textMuted }]}>{item.createdAt}</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Invite Friends Modal */}
      <InviteFriendsModal
        visible={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIconGradient: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F43F5E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  brandTextCol: {
    justifyContent: 'center',
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
  },
  brandTagline: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.2,
    marginTop: -2,
  },
  brandSubDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F43F5E',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  invitePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  invitePillText: {
    color: '#F43F5E',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '800',
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#F43F5E',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    height: '75%',
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    padding: 20,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(150, 150, 150, 0.4)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
  },
  modalTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 12,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  notifList: {
    marginTop: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 10,
  },
  notifIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  notifContent: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  notifBody: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  notifTime: {
    fontSize: 11,
  },
});
