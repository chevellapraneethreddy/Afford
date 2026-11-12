import React, { useEffect, useRef, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Heart, Sparkles } from 'lucide-react-native';
import { BrandColors } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';

export interface MissYouGestureProps {
  recipientId: string;
  recipientName: string;
  currentCount: number;
  dailyCount?: number;
  isMutual?: boolean;
  conversationId?: string;
  onSendMissYou: (recipientId: string, conversationId?: string) => Promise<{ success: boolean; newCount: number }>;
  compact?: boolean;
}

export const MissYouGesture: React.FC<MissYouGestureProps> = ({
  recipientId,
  recipientName,
  currentCount,
  dailyCount = 0,
  isMutual = false,
  conversationId,
  onSendMissYou,
  compact = false,
}) => {
  const { colors, isDark } = useTheme();

  // Optimistic count states (lifetime & today's count)
  const [localCount, setLocalCount] = useState<number>(currentCount);
  const [localDailyCount, setLocalDailyCount] = useState<number>(dailyCount);

  // References for debounce & concurrency safety
  const lastTapRef = useRef<number>(0);
  const pendingRequestsRef = useRef<number>(0);

  // Animations
  const heartScale = useSharedValue(1);
  const floatY = useSharedValue(0);
  const floatOpacity = useSharedValue(0);
  const floatScale = useSharedValue(0.5);

  // Synchronize when parent prop updates and no optimistic calls are pending
  useEffect(() => {
    if (pendingRequestsRef.current === 0) {
      setLocalCount(currentCount);
      setLocalDailyCount(dailyCount);
    }
  }, [currentCount, dailyCount]);

  const handleTap = () => {
    const now = Date.now();
    // 120ms debounce to prevent accidental hardware double-click bounces
    if (now - lastTapRef.current < 120) {
      return;
    }
    lastTapRef.current = now;

    // 1. Immediate optimistic UI count increments
    setLocalCount((prev) => prev + 1);
    setLocalDailyCount((prev) => prev + 1);
    pendingRequestsRef.current += 1;

    // 2. Snappy heart spring pulse
    heartScale.value = withSequence(
      withSpring(1.22, { damping: 10, stiffness: 450 }),
      withSpring(1.0, { damping: 12, stiffness: 350 })
    );

    // 3. Floating "+1" animation above the heart
    floatY.value = 0;
    floatOpacity.value = 1;
    floatScale.value = 0.7;
    floatScale.value = withSpring(1.1, { damping: 10, stiffness: 400 });
    floatY.value = withTiming(-22, { duration: 320 });
    floatOpacity.value = withSequence(
      withTiming(1, { duration: 180 }),
      withTiming(0, { duration: 140 })
    );

    // 4. Subtle haptic feedback
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }

    // 5. Send Miss You event to Supabase
    onSendMissYou(recipientId, conversationId)
      .then((res) => {
        pendingRequestsRef.current = Math.max(0, pendingRequestsRef.current - 1);
        if (res.success) {
          if (pendingRequestsRef.current === 0) {
            setLocalCount(res.newCount);
          }
        } else {
          // Roll back on network failure
          setLocalCount((prev) => Math.max(0, prev - 1));
          setLocalDailyCount((prev) => Math.max(0, prev - 1));
        }
      })
      .catch((err) => {
        console.warn('Miss You error:', err);
        pendingRequestsRef.current = Math.max(0, pendingRequestsRef.current - 1);
        setLocalCount((prev) => Math.max(0, prev - 1));
        setLocalDailyCount((prev) => Math.max(0, prev - 1));
      });
  };

  const animatedHeartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const animatedFloatStyle = useAnimatedStyle(() => ({
    opacity: floatOpacity.value,
    transform: [
      { translateY: floatY.value },
      { scale: floatScale.value },
    ],
  }));

  // Standard conversation row button size is 52px; compact mode for headers is 34px
  const buttonSize = compact ? 34 : 52;
  const iconSize = compact ? 16 : 24;

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {/* Floating "+1" indicator on tap */}
      <Animated.View
        pointerEvents="none"
        style={[styles.floatingPlusOne, animatedFloatStyle]}
      >
        <Text style={[styles.floatingPlusOneText, { color: colors.tint }]}>+1</Text>
      </Animated.View>

      {/* Direct-Tap Pink Heart Button */}
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={handleTap}
        style={[styles.symbolTouch, { width: buttonSize, height: buttonSize }]}
        accessibilityRole="button"
        accessibilityLabel={`Send Miss You to ${recipientName}. Lifetime count ${localCount}, today ${localDailyCount}`}
      >
        <Animated.View style={[styles.symbolWrapper, animatedHeartStyle]}>
          <View
            style={[
              styles.symbolButton,
              {
                width: buttonSize,
                height: buttonSize,
                borderRadius: buttonSize / 2,
                borderColor: isMutual ? '#FF4D8D' : 'rgba(244, 63, 94, 0.35)',
              },
            ]}
          >
            <LinearGradient
              colors={
                isMutual
                  ? (['#FF4D8D', '#F43F5E'] as const)
                  : BrandColors.coralGradient
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.symbolGradient}
            >
              <Heart
                size={iconSize}
                color="#FFFFFF"
                fill="#FFFFFF"
              />
            </LinearGradient>
          </View>
        </Animated.View>
      </TouchableOpacity>

      {/* Miss You Counts: Main count centered directly below heart */}
      <View style={styles.countsContainer}>
        <Text
          style={[
            styles.countText,
            { color: colors.tint, fontSize: compact ? 10 : 12 },
          ]}
        >
          {localCount}
        </Text>

        {/* Daily count (+X today) centered directly below */}
        {localDailyCount > 0 && !compact && (
          <Text style={[styles.dailyText, { color: colors.textSecondary }]}>
            +{localDailyCount} today
          </Text>
        )}

        {/* Mutual indicator if active and no daily count yet */}
        {isMutual && !compact && localDailyCount === 0 && (
          <View style={styles.mutualIndicatorRow}>
            <Sparkles size={8} color="#FF4D8D" />
            <Text style={styles.mutualIndicatorText}>Mutual</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: 64,
  },
  containerCompact: {
    width: 40,
  },
  floatingPlusOne: {
    position: 'absolute',
    top: -12,
    zIndex: 99,
    alignSelf: 'center',
  },
  floatingPlusOneText: {
    fontSize: 12,
    fontWeight: '800',
  },
  symbolTouch: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbolWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbolButton: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  symbolGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countsContainer: {
    marginTop: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 14,
  },
  dailyText: {
    fontSize: 9.5,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 1,
    lineHeight: 12,
  },
  mutualIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 1,
  },
  mutualIndicatorText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FF4D8D',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
});
