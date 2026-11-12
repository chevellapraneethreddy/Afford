import React, { useState } from 'react';
import {
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowRight,
  Flame,
  Heart,
  MessageCircle,
  Shield,
  Sparkles,
  Users,
  X,
} from 'lucide-react-native';
import { BrandColors } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import { analytics } from '@/lib/analytics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface WelcomeOnboardingModalProps {
  visible: boolean;
  onClose: () => void;
}

const ONBOARDING_SLIDES = [
  {
    badge: 'WELCOME TO AFFORD',
    title: 'Feel closer.\nEven when apart.',
    description:
      'Traditional social apps overwhelmed us with endless feeds and vanity metrics. AFFORD is built for emotional presence, genuine memories, and deeper bonds with your favorite people.',
    tag: '✨ Intentionally minimal • Zero doomscrolling',
    iconType: 'heart',
  },
  {
    badge: 'SIGNATURE EXPERIENCE',
    title: 'The Direct-Tap\nMiss You Gesture',
    description:
      'Beside every friend is a pink heart. Tap it whenever they cross your mind. The counter rises by exactly one with soft haptic feedback and real-time notification. Zero popups. Pure emotion.',
    tag: '❤️ 1 tap = 1 Miss You • Daily & lifetime counts',
    iconType: 'pulse',
  },
  {
    badge: 'DEEP CONNECTIONS',
    title: 'Close Circle &\nFriendship Milestones',
    description:
      'Share private voice postcards, relive shared memories with "On This Day", answer daily connection questions, and celebrate 7, 30, 50, and 100-day friendship streaks together.',
    tag: '🔒 Private Circle • Milestones & Shared Vault',
    iconType: 'shield',
  },
];

export const WelcomeOnboardingModal: React.FC<WelcomeOnboardingModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors, isDark } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = async () => {
    if (currentStep < ONBOARDING_SLIDES.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      await handleComplete();
    }
  };

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem('@afford_onboarding_shown', 'true');
      analytics.track('onboarding_completed', { source: 'welcome_modal' });
    } catch {
      // Non-fatal
    }
    onClose();
  };

  const slide = ONBOARDING_SLIDES[currentStep];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleComplete}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Top Skip / Close Button */}
          <TouchableOpacity
            onPress={handleComplete}
            style={[styles.skipBtn, { backgroundColor: colors.inputBackground }]}
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
          >
            <Text style={[styles.skipBtnText, { color: colors.textSecondary }]}>Skip</Text>
          </TouchableOpacity>

          {/* Hero Visual Icon Container */}
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={
                currentStep === 1
                  ? ['#FF2E93', '#F43F5E']
                  : currentStep === 2
                  ? ['#8B5CF6', '#EC4899']
                  : BrandColors.coralGradient
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCircle}
            >
              {currentStep === 0 && <Heart size={44} color="#FFFFFF" fill="#FFFFFF" />}
              {currentStep === 1 && (
                <View style={styles.pulseIconWrap}>
                  <Heart size={44} color="#FFFFFF" fill="#FFFFFF" />
                  <View style={styles.plusOneChip}>
                    <Text style={styles.plusOneText}>+1</Text>
                  </View>
                </View>
              )}
              {currentStep === 2 && <Shield size={44} color="#FFFFFF" />}
            </LinearGradient>
          </View>

          {/* Badge */}
          <View
            style={[
              styles.badgeWrap,
              { backgroundColor: isDark ? 'rgba(244,63,94,0.15)' : '#FFE4E6' },
            ]}
          >
            <Text style={styles.badgeText}>{slide.badge}</Text>
          </View>

          {/* Slide Title */}
          <Text style={[styles.title, { color: colors.text }]}>{slide.title}</Text>

          {/* Slide Description */}
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {slide.description}
          </Text>

          {/* Highlight Tag */}
          <View
            style={[
              styles.tagPill,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.tagText, { color: colors.tint }]}>{slide.tag}</Text>
          </View>

          {/* Dot Indicator */}
          <View style={styles.dotsRow}>
            {ONBOARDING_SLIDES.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.dot,
                  idx === currentStep
                    ? [styles.activeDot, { backgroundColor: colors.tint }]
                    : { backgroundColor: isDark ? '#374151' : '#E5E7EB' },
                ]}
              />
            ))}
          </View>

          {/* Primary Action Button */}
          <TouchableOpacity
            onPress={handleNext}
            style={styles.actionBtn}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={
              currentStep === ONBOARDING_SLIDES.length - 1 ? 'Get Started' : 'Next Step'
            }
          >
            <LinearGradient
              colors={BrandColors.coralGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionGradient}
            >
              <Text style={styles.actionBtnText}>
                {currentStep === ONBOARDING_SLIDES.length - 1
                  ? 'Get Started ✨'
                  : 'Continue'}
              </Text>
              {currentStep < ONBOARDING_SLIDES.length - 1 && (
                <ArrowRight size={18} color="#FFFFFF" />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 32,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  skipBtn: {
    position: 'absolute',
    top: 18,
    right: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    zIndex: 10,
  },
  skipBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  iconContainer: {
    marginTop: 12,
    marginBottom: 20,
  },
  heroCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F43F5E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  pulseIconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusOneChip: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  plusOneText: {
    color: '#F43F5E',
    fontSize: 11,
    fontWeight: '900',
  },
  badgeWrap: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    marginBottom: 12,
  },
  badgeText: {
    color: '#F43F5E',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  tagPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    width: 6,
  },
  activeDot: {
    width: 22,
  },
  actionBtn: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
