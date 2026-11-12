import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Bell,
  Database,
  Flame,
  Heart,
  Lock,
  LogOut,
  Moon,
  Shield,
  ShieldAlert,
  Sun,
  UserX,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

export default function SettingsScreen() {
  const { colors, isDark, themeMode, setThemeMode } = useTheme();
  const { user, isConfigured, signOut, updateProfile } = useAuth();

  const [isPrivate, setIsPrivate] = useState(user?.isPrivate || false);
  const [missYouNotifs, setMissYouNotifs] = useState(user?.missYouNotificationsEnabled ?? true);
  const [streakNotifs, setStreakNotifs] = useState(user?.streakNotificationsEnabled ?? true);

  const handleTogglePrivate = (val: boolean) => {
    setIsPrivate(val);
    updateProfile({ isPrivate: val });
  };

  const handleToggleMissYouNotifs = (val: boolean) => {
    setMissYouNotifs(val);
    updateProfile({ missYouNotificationsEnabled: val });
  };

  const handleToggleStreakNotifs = (val: boolean) => {
    setStreakNotifs(val);
    updateProfile({ streakNotificationsEnabled: val });
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of AFFORD?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings & Privacy</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Backend Status Card */}
        <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.statusRow}>
            <Database size={18} color={isConfigured ? '#10B981' : colors.tint} />
            <Text style={[styles.statusTitle, { color: colors.text }]}>
              {isConfigured ? 'Connected to Supabase PostgreSQL' : 'Local Persistence & Demo Mode'}
            </Text>
          </View>
          <Text style={[styles.statusDesc, { color: colors.textSecondary }]}>
            {isConfigured
              ? 'Your data is syncing with your live Supabase cloud database.'
              : 'Add your EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env to connect live backend.'}
          </Text>
        </View>

        {/* Appearance Section */}
        <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>APPEARANCE</Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.themeSelectorRow}>
            <TouchableOpacity
              onPress={() => setThemeMode('dark')}
              style={[
                styles.themeBtn,
                themeMode === 'dark' && [styles.themeBtnActive, { borderColor: colors.tint }],
                { backgroundColor: colors.inputBackground },
              ]}
            >
              <Moon size={18} color={themeMode === 'dark' ? colors.tint : colors.text} />
              <Text style={[styles.themeBtnText, { color: colors.text }]}>Dark</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setThemeMode('light')}
              style={[
                styles.themeBtn,
                themeMode === 'light' && [styles.themeBtnActive, { borderColor: colors.tint }],
                { backgroundColor: colors.inputBackground },
              ]}
            >
              <Sun size={18} color={themeMode === 'light' ? colors.tint : colors.text} />
              <Text style={[styles.themeBtnText, { color: colors.text }]}>Light</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Privacy Controls */}
        <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>PRIVACY & SECURITY</Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Private Account */}
          <View style={styles.settingRow}>
            <View style={styles.settingIcon}>
              <Lock size={18} color={colors.text} />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Private Account</Text>
              <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
                Only approved friends can view your memories and stories.
              </Text>
            </View>
            <Switch
              value={isPrivate}
              onValueChange={handleTogglePrivate}
              trackColor={{ false: '#767577', true: colors.tint }}
            />
          </View>

          <View style={styles.divider} />

          {/* Blocked Users */}
          <TouchableOpacity
            onPress={() => Alert.alert('Blocked Users', 'You currently have no blocked users.')}
            style={styles.settingRow}
          >
            <View style={styles.settingIcon}>
              <UserX size={18} color={colors.text} />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Blocked Users</Text>
              <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
                Manage users you have restricted.
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Notifications & Gestures */}
        <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>NOTIFICATIONS & GESTURES</Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Miss You Notifications */}
          <View style={styles.settingRow}>
            <View style={styles.settingIcon}>
              <Heart size={18} color="#F43F5E" />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Miss You Notifications</Text>
              <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
                Get notified when friends drag the Miss You symbol for you.
              </Text>
            </View>
            <Switch
              value={missYouNotifs}
              onValueChange={handleToggleMissYouNotifs}
              trackColor={{ false: '#767577', true: colors.tint }}
            />
          </View>

          <View style={styles.divider} />

          {/* Streak Notifications */}
          <View style={styles.settingRow}>
            <View style={styles.settingIcon}>
              <Flame size={18} color="#F59E0B" />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Streak Expiry Alerts</Text>
              <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
                Alerts before a friendship streak is about to expire.
              </Text>
            </View>
            <Switch
              value={streakNotifs}
              onValueChange={handleToggleStreakNotifs}
              trackColor={{ false: '#767577', true: colors.tint }}
            />
          </View>
        </View>

        {/* Safety & Reporting */}
        <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>SAFETY & SUPPORT</Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => Alert.alert('Report a Concern', 'Your safety is our priority. If you encounter harmful content or behavior, contact safety@afford.app.')}
            style={styles.settingRow}
          >
            <View style={styles.settingIcon}>
              <ShieldAlert size={18} color={colors.text} />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Report a Concern</Text>
              <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
                Confidential report to the AFFORD trust & safety team.
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          onPress={handleSignOut}
          style={[styles.signOutBtn, { borderColor: '#EF4444', backgroundColor: isDark ? '#261214' : '#FEF2F2' }]}
        >
          <LogOut size={18} color="#EF4444" />
          <Text style={styles.signOutText}>Sign Out of AFFORD</Text>
        </TouchableOpacity>

        <Text style={[styles.versionText, { color: colors.textMuted }]}>
          AFFORD v1.0.0 • Where every touch matters
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  container: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  statusCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 8,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  themeSelectorRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 10,
  },
  themeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themeBtnActive: {
    elevation: 2,
  },
  themeBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  settingIcon: {
    width: 32,
    alignItems: 'center',
  },
  settingTextCol: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  settingSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(150,150,150,0.2)',
    marginLeft: 62,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 10,
  },
  signOutText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 11,
    marginTop: 8,
  },
});
