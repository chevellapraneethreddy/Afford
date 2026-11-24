import React, { useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  Bookmark,
  Camera,
  Edit3,
  Flame,
  Grid,
  Heart,
  Image as ImageIcon,
  Lock,
  LogOut,
  Settings,
  ShieldCheck,
  Trash2,
  Users,
  Video as VideoIcon,
  X,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { AffordHeader } from '@/components/AffordHeader';
import { CloseCircleModal } from '@/components/CloseCircleModal';
import { MemoryVaultModal } from '@/components/MemoryVaultModal';
import { OnThisDayCard } from '@/components/OnThisDayCard';
import { BrandColors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

export default function ProfileScreen() {
  const { colors, isDark } = useTheme();
  const {
    user,
    posts,
    signOut,
    updateProfile,
    updateAvatar,
    todayMissYouSentCount,
    todayMissYouReceivedCount,
    onThisDayMemories,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'posts' | 'vault' | 'scrapbook'>('posts');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [showCloseCircleModal, setShowCloseCircleModal] = useState(false);
  const [showVaultModal, setShowVaultModal] = useState(false);

  // Edit form state
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [isPrivate, setIsPrivate] = useState(user?.isPrivate || false);

  const myPosts = posts.filter((p) => p.userId === user?.id || p.user.id === user?.id);

  const handlePickImage = async () => {
    setShowPhotoOptions(false);
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.25,
        base64: true,
      });
      if (!res.canceled && res.assets && res.assets[0]) {
        const asset = res.assets[0];
        const avatarUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        await updateAvatar(avatarUri);
      }
    } catch (e) {
      console.warn('Image picker error', e);
    }
  };

  const handleTakePhoto = async () => {
    setShowPhotoOptions(false);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') return;
      const res = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.25,
        base64: true,
      });
      if (!res.canceled && res.assets && res.assets[0]) {
        const asset = res.assets[0];
        const avatarUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        await updateAvatar(avatarUri);
      }
    } catch (e) {
      console.warn('Camera error', e);
    }
  };

  const handleRemovePhoto = async () => {
    setShowPhotoOptions(false);
    await updateAvatar(null);
  };

  const handleSaveProfile = async () => {
    await updateProfile({
      displayName: displayName.trim(),
      bio: bio.trim(),
      isPrivate,
    });
    setShowEditModal(false);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <AffordHeader />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        {/* Profile Card Header with Panoramic Aura */}
        <View style={[styles.profileHeader, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Panoramic Cover Accent */}
          <LinearGradient
            colors={BrandColors.primaryGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.coverAccent}
          />

          <View style={styles.topRow}>
            {/* Avatar with Radiant Gradient Ring & Tap to Change Photo */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setShowPhotoOptions(true)}
              style={styles.avatarWrapper}
              accessibilityRole="button"
              accessibilityLabel="Change profile picture"
            >
              <LinearGradient
                colors={BrandColors.coralGradient}
                style={styles.avatarGradientRing}
              >
                {user?.avatarUrl && !user.avatarUrl.includes('534528741775') ? (
                  <Image
                    source={{ uri: user.avatarUrl }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={[styles.avatar, { backgroundColor: colors.inputBackground, alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={{ fontSize: 28, fontWeight: '800', color: colors.tint }}>
                      {(user?.displayName || user?.username || 'P').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </LinearGradient>
              <View style={[styles.cameraBadge, { backgroundColor: colors.tint, borderColor: colors.card }]}>
                <Camera size={12} color="#FFFFFF" />
              </View>
              {user?.isPrivate && (
                <View style={[styles.privateBadge, { backgroundColor: colors.tint }]}>
                  <Lock size={10} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statCol}>
                <Text style={[styles.statValue, { color: colors.text }]}>{myPosts.length}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Memories</Text>
              </View>

              <View style={styles.statCol}>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {user?.followersCount || 1420}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Friends</Text>
              </View>

              <View style={styles.statCol}>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {user?.followingCount || 388}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Connected</Text>
              </View>
            </View>
          </View>

          {/* Names & Bio */}
          <View style={styles.bioSection}>
            <View style={styles.nameRow}>
              <Text style={[styles.displayName, { color: colors.text }]}>{user?.displayName}</Text>
              {user?.isVerified && <ShieldCheck size={16} color="#3B82F6" />}
            </View>
            <Text style={[styles.handleText, { color: colors.textSecondary }]}>@{user?.username}</Text>
            {user?.bio ? (
              <Text style={[styles.bioText, { color: colors.text }]}>{user.bio}</Text>
            ) : (
              <Text style={[styles.bioText, { color: colors.textSecondary }]}>
                Cherishing authentic connections & unscripted memories.
              </Text>
            )}
          </View>

          {/* Signature Emotional Connection Counters with Daily count & History shortcut */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/miss-you-history')}
            style={[styles.emotionalCountersRow, { backgroundColor: isDark ? '#10121C' : '#FFF1F2', borderColor: colors.border }]}
            accessibilityRole="button"
            accessibilityLabel="View Miss You History and Daily Stats"
          >
            <View style={styles.counterItem}>
              <LinearGradient
                colors={BrandColors.coralGradient}
                style={styles.counterIconWrap}
              >
                <Heart size={14} color="#FFFFFF" fill="#FFFFFF" />
              </LinearGradient>
              <View>
                <View style={styles.counterNumberRow}>
                  <Text style={[styles.counterNumber, { color: colors.text }]}>
                    {user?.missYouSentCount || 74}
                  </Text>
                  {todayMissYouSentCount > 0 && (
                    <View style={styles.counterTodayChip}>
                      <Text style={styles.counterTodayChipText}>+{todayMissYouSentCount} today</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.counterLabel, { color: colors.textSecondary }]}>Miss Yous Sent</Text>
              </View>
            </View>

            <View style={[styles.counterDivider, { backgroundColor: colors.border }]} />

            <View style={styles.counterItem}>
              <LinearGradient
                colors={['#8B5CF6', '#6D28D9']}
                style={styles.counterIconWrap}
              >
                <Heart size={14} color="#FFFFFF" fill="#FFFFFF" />
              </LinearGradient>
              <View>
                <View style={styles.counterNumberRow}>
                  <Text style={[styles.counterNumber, { color: colors.text }]}>
                    {user?.missYouReceivedCount || 128}
                  </Text>
                  {todayMissYouReceivedCount > 0 && (
                    <View style={[styles.counterTodayChip, { backgroundColor: 'rgba(168, 85, 247, 0.2)' }]}>
                      <Text style={[styles.counterTodayChipText, { color: '#A855F7' }]}>+{todayMissYouReceivedCount} today</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.counterLabel, { color: colors.textSecondary }]}>Received</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Profile Actions: Edit Profile, Settings */}
          <View style={styles.btnRow}>
            <TouchableOpacity
              onPress={() => setShowEditModal(true)}
              style={[styles.editBtn, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
            >
              <Edit3 size={15} color={colors.text} />
              <Text style={[styles.editBtnText, { color: colors.text }]}>Edit Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/settings')}
              style={[styles.settingsBtn, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
            >
              <Settings size={16} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Navigation: Memories vs Shared Memory Vault vs Close Circle */}
        <View style={[styles.tabsBar, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => setActiveTab('posts')}
            style={[
              styles.tabHeaderItem,
              activeTab === 'posts' && [styles.activeTabHeader, { borderBottomColor: colors.tint }],
            ]}
          >
            <Grid size={17} color={activeTab === 'posts' ? colors.tint : colors.textMuted} />
            <Text
              style={[
                styles.tabHeaderText,
                { color: activeTab === 'posts' ? colors.tint : colors.textSecondary },
              ]}
            >
              Memories
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('vault')}
            style={[
              styles.tabHeaderItem,
              activeTab === 'vault' && [styles.activeTabHeader, { borderBottomColor: colors.tint }],
            ]}
          >
            <Bookmark size={17} color={activeTab === 'vault' ? colors.tint : colors.textMuted} />
            <Text
              style={[
                styles.tabHeaderText,
                { color: activeTab === 'vault' ? colors.tint : colors.textSecondary },
              ]}
            >
              Vault
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('scrapbook')}
            style={[
              styles.tabHeaderItem,
              activeTab === 'scrapbook' && [styles.activeTabHeader, { borderBottomColor: colors.tint }],
            ]}
          >
            <Users size={17} color={activeTab === 'scrapbook' ? '#10B981' : colors.textMuted} />
            <Text
              style={[
                styles.tabHeaderText,
                { color: activeTab === 'scrapbook' ? '#10B981' : colors.textSecondary },
              ]}
            >
              Close Circle
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === 'posts' ? (
          <View>
            {onThisDayMemories && onThisDayMemories.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <OnThisDayCard memory={onThisDayMemories[0]} />
              </View>
            )}
            <View style={styles.gridContainer}>
              {posts.slice(0, 9).map((item) => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.85}
                  onPress={() => router.push('/(tabs)')}
                  style={styles.gridItem}
                >
                  {item.mediaType === 'video' ? (
                    Platform.OS === 'web' ? (
                      // @ts-ignore
                      <video
                        src={item.mediaUrl}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        muted
                        playsInline
                      />
                    ) : (
                      <View style={[styles.gridImage, { backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' }]}>
                        <VideoIcon size={24} color="#FFFFFF" />
                      </View>
                    )
                  ) : (
                    <Image source={{ uri: item.mediaUrl }} style={styles.gridImage} />
                  )}
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.45)']}
                  style={styles.gridOverlay}
                >
                  <View style={styles.gridLikesRow}>
                    <Heart size={11} color="#FFFFFF" fill="#FFFFFF" />
                    <Text style={styles.gridLikesText}>{item.likesCount}</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        ) : activeTab === 'vault' ? (
          <View style={styles.vaultContainer}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setShowVaultModal(true)}
              style={[styles.vaultCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <LinearGradient
                colors={BrandColors.coralGradient}
                style={styles.vaultIconCircle}
              >
                <Bookmark size={24} color="#FFFFFF" />
              </LinearGradient>
              <Text style={[styles.vaultTitle, { color: colors.text }]}>Shared Memory Vault</Text>
              <Text style={[styles.vaultDesc, { color: colors.textSecondary }]}>
                A private sanctuary where you and your chosen partners save sacred photographs, voice postcards, and special milestones.
              </Text>
              <View style={[styles.actionPill, { backgroundColor: colors.tint }]}>
                <Text style={styles.actionPillText}>Open Memory Vault →</Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.vaultContainer}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setShowCloseCircleModal(true)}
              style={[styles.vaultCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <LinearGradient
                colors={['#10B981', '#047857']}
                style={styles.vaultIconCircle}
              >
                <Users size={24} color="#FFFFFF" />
              </LinearGradient>
              <Text style={[styles.vaultTitle, { color: colors.text }]}>Close Circle</Text>
              <Text style={[styles.vaultDesc, { color: colors.textSecondary }]}>
                Moments shared to your Close Circle are exclusively protected and never shown to the public. Tap to manage member access.
              </Text>
              <View style={[styles.actionPill, { backgroundColor: '#10B981' }]}>
                <Text style={styles.actionPillText}>Manage Close Circle Members →</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              {/* Profile Photo Editor Section */}
              <View style={styles.editAvatarSection}>
                <View style={styles.editAvatarWrapper}>
                  {user?.avatarUrl && !user.avatarUrl.includes('534528741775') ? (
                    <Image
                      source={{ uri: user.avatarUrl }}
                      style={styles.editAvatarPreview}
                    />
                  ) : (
                    <View style={[styles.editAvatarPreview, { backgroundColor: colors.inputBackground, alignItems: 'center', justifyContent: 'center' }]}>
                      <Text style={{ fontSize: 24, fontWeight: '800', color: colors.tint }}>
                        {(user?.displayName || user?.username || 'P').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={[styles.editAvatarCameraBtn, { backgroundColor: colors.tint, borderColor: colors.card }]}
                    onPress={() => setShowPhotoOptions(true)}
                  >
                    <Camera size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  onPress={() => setShowPhotoOptions(true)}
                  style={styles.changePhotoBtn}
                >
                  <Text style={[styles.changePhotoText, { color: colors.tint }]}>Change Profile Photo</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Display Name</Text>
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                style={[styles.formInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
              />

              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Bio</Text>
              <TextInput
                value={bio}
                onChangeText={setBio}
                multiline
                style={[styles.formInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border, minHeight: 70 }]}
              />

              {/* Private Account Switch */}
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.switchTitle, { color: colors.text }]}>Private Account</Text>
                  <Text style={[styles.switchDesc, { color: colors.textSecondary }]}>
                    When enabled, only approved friends can see your memories and gestures.
                  </Text>
                </View>
                <Switch
                  value={isPrivate}
                  onValueChange={setIsPrivate}
                  trackColor={{ false: '#767577', true: colors.tint }}
                />
              </View>

              <TouchableOpacity
                onPress={handleSaveProfile}
                style={styles.saveProfileBtnWrap}
              >
                <LinearGradient
                  colors={BrandColors.coralGradient}
                  style={styles.saveProfileBtn}
                >
                  <Text style={styles.saveProfileText}>Save Changes</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Interactive Close Circle Management Modal */}
      <CloseCircleModal
        visible={showCloseCircleModal}
        onClose={() => setShowCloseCircleModal(false)}
      />

      {/* Interactive Shared Memory Vault Modal */}
      <MemoryVaultModal
        visible={showVaultModal}
        onClose={() => setShowVaultModal(false)}
      />

      {/* Profile Photo Actions Bottom Sheet Modal */}
      <Modal
        visible={showPhotoOptions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPhotoOptions(false)}
      >
        <TouchableOpacity
          style={styles.photoModalOverlay}
          activeOpacity={1}
          onPress={() => setShowPhotoOptions(false)}
        >
          <View
            style={[styles.photoOptionsSheet, { backgroundColor: colors.card, borderColor: colors.border }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.photoOptionsIndicator} />
            <Text style={[styles.photoOptionsTitle, { color: colors.text }]}>Profile Picture</Text>
            <Text style={[styles.photoOptionsSubtitle, { color: colors.textSecondary }]}>
              Update your photo across your profile, discover, and messages
            </Text>

            <TouchableOpacity
              style={[styles.photoOptionItem, { borderBottomColor: colors.border }]}
              onPress={handlePickImage}
            >
              <View style={[styles.photoOptionIconCircle, { backgroundColor: colors.inputBackground }]}>
                <ImageIcon size={20} color={colors.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.photoOptionText, { color: colors.text }]}>Choose from Gallery</Text>
                <Text style={[styles.photoOptionSubtext, { color: colors.textSecondary }]}>Select a photo from your camera roll</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.photoOptionItem, { borderBottomColor: colors.border }]}
              onPress={handleTakePhoto}
            >
              <View style={[styles.photoOptionIconCircle, { backgroundColor: colors.inputBackground }]}>
                <Camera size={20} color={colors.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.photoOptionText, { color: colors.text }]}>Take Photo</Text>
                <Text style={[styles.photoOptionSubtext, { color: colors.textSecondary }]}>Use your camera for a new picture</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.photoOptionItem, { borderBottomColor: colors.border }]}
              onPress={handleRemovePhoto}
            >
              <View style={[styles.photoOptionIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                <Trash2 size={20} color="#EF4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.photoOptionText, { color: '#EF4444' }]}>Remove Current Photo</Text>
                <Text style={[styles.photoOptionSubtext, { color: colors.textSecondary }]}>Reset to default avatar</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.photoOptionCancelBtn, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
              onPress={() => setShowPhotoOptions(false)}
            >
              <Text style={[styles.photoOptionCancelText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    paddingBottom: 40,
  },
  profileHeader: {
    margin: 16,
    padding: 16,
    borderRadius: 26,
    borderWidth: 1,
    gap: 16,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  coverAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 4,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarGradientRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    padding: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
  },
  privateBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statCol: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 19,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  bioSection: {
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  displayName: {
    fontSize: 19,
    fontWeight: '800',
  },
  handleText: {
    fontSize: 13,
  },
  bioText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  emotionalCountersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  counterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  counterIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterNumber: {
    fontSize: 16,
    fontWeight: '900',
  },
  counterNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  counterTodayChip: {
    backgroundColor: 'rgba(244, 63, 94, 0.18)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  counterTodayChipText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#F43F5E',
  },
  counterLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  counterDivider: {
    width: 1,
    height: 24,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 16,
    borderWidth: 1,
  },
  editBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  tabsBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
    marginTop: 6,
  },
  tabHeaderItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabHeader: {},
  tabHeaderText: {
    fontSize: 13,
    fontWeight: '700',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    paddingTop: 12,
    gap: 8,
  },
  gridItem: {
    width: '31.3%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0F121C',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gridOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 6,
  },
  gridLikesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gridLikesText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  vaultContainer: {
    padding: 16,
  },
  vaultCard: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  vaultIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  vaultTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  vaultDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  actionPill: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 18,
    marginTop: 4,
  },
  actionPillText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    height: '70%',
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderTopWidth: 1,
    padding: 22,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
  },
  modalForm: {
    marginTop: 8,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 10,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 18,
    gap: 12,
  },
  switchTitle: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  switchDesc: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  editAvatarSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
    gap: 8,
  },
  editAvatarWrapper: {
    position: 'relative',
  },
  editAvatarPreview: {
    width: 86,
    height: 86,
    borderRadius: 43,
  },
  editAvatarCameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  changePhotoBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  changePhotoText: {
    fontSize: 14,
    fontWeight: '700',
  },
  photoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  photoOptionsSheet: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    padding: 24,
    paddingBottom: 36,
  },
  photoOptionsIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CCCCCC',
    alignSelf: 'center',
    marginBottom: 16,
  },
  photoOptionsTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  photoOptionsSubtitle: {
    fontSize: 12.5,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  photoOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  photoOptionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoOptionText: {
    fontSize: 15,
    fontWeight: '700',
  },
  photoOptionSubtext: {
    fontSize: 11.5,
    marginTop: 2,
  },
  photoOptionCancelBtn: {
    marginTop: 18,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoOptionCancelText: {
    fontSize: 15,
    fontWeight: '700',
  },
  saveProfileBtnWrap: {
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 14,
  },
  saveProfileBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveProfileText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
