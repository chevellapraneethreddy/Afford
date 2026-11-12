import React, { useState } from 'react';
import {
  Image,
  Linking,
  Modal,
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Check,
  Copy,
  Heart,
  MessageCircle,
  Share2,
  Shield,
  Sparkles,
  UserPlus,
  Users,
  X,
} from 'lucide-react-native';
import { BrandColors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { analytics } from '@/lib/analytics';
import { INITIAL_FRIENDS } from '@/lib/mockData';

interface InviteFriendsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const InviteFriendsModal: React.FC<InviteFriendsModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const referralCode = user?.username || 'member';
  const inviteUrl = `https://afford.app/join?ref=${referralCode}`;
  const inviteMessage = `Hey! I'm using AFFORD to stay close with meaningful friends and share unscripted memories. Join my private circle here: ${inviteUrl} ❤️`;

  const handleCopyLink = async () => {
    try {
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(inviteUrl);
        }
      } else {
        await Share.share({
          title: 'AFFORD Invitation Link',
          message: inviteUrl,
        });
      }
      setCopied(true);
      analytics.track('friend_invited', { method: 'copy_link', code: referralCode });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleWhatsAppInvite = async () => {
    analytics.track('friend_invited', { method: 'whatsapp', code: referralCode });
    const encoded = encodeURIComponent(inviteMessage);
    const whatsappUrl = `whatsapp://send?text=${encoded}`;
    const webWhatsappUrl = `https://api.whatsapp.com/send?text=${encoded}`;

    try {
      const supported = await Linking.canOpenURL(whatsappUrl);
      if (supported) {
        await Linking.openURL(whatsappUrl);
      } else {
        await Linking.openURL(webWhatsappUrl);
      }
    } catch {
      // Fallback to Native Share sheet
      handleNativeShare();
    }
  };

  const handleNativeShare = async () => {
    analytics.track('friend_invited', { method: 'share_sheet', code: referralCode });
    try {
      await Share.share({
        message: inviteMessage,
        url: inviteUrl,
        title: 'Join my Close Circle on AFFORD',
      });
    } catch (err) {
      console.warn('Share sheet error:', err);
    }
  };

  // Suggested people user might know
  const suggestedPeople = INITIAL_FRIENDS.slice(2, 4);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? '#121422' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255, 77, 141, 0.25)' : 'rgba(0, 0, 0, 0.08)',
            },
          ]}
        >
          {/* Subtle Ambient Glow */}
          <LinearGradient
            colors={[
              isDark ? 'rgba(255, 77, 141, 0.14)' : 'rgba(255, 241, 242, 0.8)',
              'transparent',
            ]}
            style={StyleSheet.absoluteFill}
          />

          {/* Close button */}
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeBtn, { backgroundColor: colors.inputBackground }]}
            accessibilityRole="button"
            accessibilityLabel="Close invitation modal"
          >
            <X size={16} color={colors.text} />
          </TouchableOpacity>

          {/* Icon Halo */}
          <View style={styles.iconHaloWrap}>
            <LinearGradient
              colors={BrandColors.coralGradient}
              style={styles.iconGradient}
            >
              <Heart size={24} color="#FFFFFF" fill="#FFFFFF" />
            </LinearGradient>
          </View>

          {/* Title & Slogan */}
          <Text style={[styles.title, { color: colors.text }]}>Invite Close Friends</Text>
          <Text style={[styles.slogan, { color: colors.tint }]}>
            "Feel closer. Even when apart."
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            AFFORD is best experienced with people who truly matter to you. Invite them to your inner circle.
          </Text>

          {/* Referral Link Box */}
          <View style={[styles.linkBox, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
            <Text style={[styles.linkText, { color: colors.text }]} numberOfLines={1}>
              {inviteUrl}
            </Text>
            <TouchableOpacity
              onPress={handleCopyLink}
              style={[styles.copyBtn, { backgroundColor: copied ? '#10B981' : colors.tint }]}
            >
              {copied ? (
                <>
                  <Check size={12} color="#FFFFFF" strokeWidth={3} />
                  <Text style={styles.copyBtnText}>Copied</Text>
                </>
              ) : (
                <>
                  <Copy size={12} color="#FFFFFF" />
                  <Text style={styles.copyBtnText}>Copy</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Share Actions */}
          <View style={styles.actionGrid}>
            {/* WhatsApp Invite Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleWhatsAppInvite}
              style={[styles.shareActionBtn, { backgroundColor: '#25D366' }]}
            >
              <MessageCircle size={18} color="#FFFFFF" />
              <Text style={styles.shareActionText}>Invite on WhatsApp</Text>
            </TouchableOpacity>

            {/* Other Apps Share Sheet Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleNativeShare}
              style={[styles.shareActionBtn, { backgroundColor: colors.tint }]}
            >
              <Share2 size={16} color="#FFFFFF" />
              <Text style={styles.shareActionText}>Share Invite Link</Text>
            </TouchableOpacity>
          </View>

          {/* Suggested Connections */}
          <View style={[styles.suggestedContainer, { borderTopColor: colors.border }]}>
            <Text style={[styles.suggestedTitle, { color: colors.textSecondary }]}>
              Suggested Friends from your circle:
            </Text>
            <View style={styles.suggestedRow}>
              {suggestedPeople.map((friend) => (
                <View
                  key={friend.id}
                  style={[styles.suggestedChip, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                >
                  <Image source={{ uri: friend.avatarUrl }} style={styles.suggestedAvatar} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.suggestedName, { color: colors.text }]} numberOfLines={1}>
                      {friend.displayName}
                    </Text>
                    <Text style={[styles.suggestedHandle, { color: colors.textSecondary }]}>
                      @{friend.username}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      analytics.track('friend_invited', { target: friend.id });
                      handleNativeShare();
                    }}
                    style={[styles.suggestedAddBtn, { backgroundColor: colors.tint }]}
                  >
                    <UserPlus size={12} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>

          {/* Privacy Note */}
          <View style={styles.privacyNoteRow}>
            <Shield size={12} color={colors.textMuted} />
            <Text style={[styles.privacyNoteText, { color: colors.textMuted }]}>
              Privacy first: AFFORD never uploads your contact book without permission.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 32,
    borderWidth: 1.5,
    padding: 22,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#FF4D8D',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 18,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  closeBtn: {
    position: 'absolute',
    top: 18,
    right: 18,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  iconHaloWrap: {
    marginTop: 6,
    marginBottom: 12,
  },
  iconGradient: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  slogan: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginTop: 3,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 12.5,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  linkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  linkText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
  },
  copyBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  actionGrid: {
    width: '100%',
    gap: 10,
    marginBottom: 16,
  },
  shareActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 16,
    width: '100%',
  },
  shareActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  suggestedContainer: {
    width: '100%',
    borderTopWidth: 1,
    paddingTop: 12,
    marginBottom: 12,
  },
  suggestedTitle: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
  },
  suggestedRow: {
    gap: 8,
  },
  suggestedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  suggestedAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  suggestedName: {
    fontSize: 12,
    fontWeight: '800',
  },
  suggestedHandle: {
    fontSize: 10,
  },
  suggestedAddBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  privacyNoteText: {
    fontSize: 10,
    lineHeight: 14,
    flex: 1,
    textAlign: 'center',
  },
});

