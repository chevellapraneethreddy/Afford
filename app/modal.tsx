import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Heart, Sparkles, X } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

export default function ModalScreen() {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.iconCircle}>
          <Heart size={32} color="#F43F5E" fill="#F43F5E" />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>The Miss You Gesture</Text>

        <Text style={[styles.description, { color: colors.textSecondary }]}>
          AFFORD introduces a personal way to say "I'm thinking of you" without typing words.
        </Text>

        <View style={styles.pointsList}>
          <View style={styles.pointRow}>
            <Sparkles size={16} color={colors.tint} />
            <Text style={[styles.pointText, { color: colors.text }]}>
              Drag the glowing heart toward the drop zone to send a Miss You signal.
            </Text>
          </View>

          <View style={styles.pointRow}>
            <Sparkles size={16} color={colors.tint} />
            <Text style={[styles.pointText, { color: colors.text }]}>
              Each gesture counts toward your shared emotional connection score and maintains your streak.
            </Text>
          </View>

          <View style={styles.pointRow}>
            <Sparkles size={16} color={colors.tint} />
            <Text style={[styles.pointText, { color: colors.text }]}>
              Long-press or tap anytime for accessible one-touch sending.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.closeBtn, { backgroundColor: colors.tint }]}
        >
          <Text style={styles.closeBtnText}>Got it!</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    gap: 14,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(244,63,94,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  pointsList: {
    width: '100%',
    gap: 12,
    marginVertical: 8,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  pointText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  closeBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
