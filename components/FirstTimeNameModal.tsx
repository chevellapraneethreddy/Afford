import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, Heart, User } from 'lucide-react-native';
import { BrandColors } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';

interface FirstTimeNameModalProps {
  visible: boolean;
  onSubmit: (name: string) => void;
}

export const FirstTimeNameModal: React.FC<FirstTimeNameModalProps> = ({
  visible,
  onSubmit,
}) => {
  const { colors, isDark } = useTheme();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const trimmed = name.trim();
  const isValid = trimmed.length >= 2;

  const handleContinue = () => {
    if (!isValid) {
      setError('Please enter your name (at least 2 letters) to continue.');
      return;
    }
    setError('');
    onSubmit(trimmed);
  };

  const previewHandle = trimmed.length > 0
    ? `@${trimmed.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20)}`
    : '';

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
    >
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: isDark ? '#0A0C14' : '#FFFFFF' },
        ]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardWrap}
        >
          <View style={styles.content}>
            {/* Header / Brand Icon */}
            <View style={styles.iconCircleWrap}>
              <LinearGradient
                colors={BrandColors.coralGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconCircle}
              >
                <Heart size={32} color="#FFFFFF" fill="#FFFFFF" />
              </LinearGradient>
            </View>

            {/* Title & Description */}
            <Text style={[styles.wordmark, { color: colors.text }]}>
              AFF<Text style={{ color: colors.tint }}>ORD</Text>
            </Text>
            <Text style={[styles.title, { color: colors.text }]}>
              What should we call you?
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Enter your name to set up your profile and start connecting with your circle.
            </Text>

            {/* Input Field Card */}
            <View style={styles.inputCard}>
              <View
                style={[
                  styles.inputWrap,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: error ? '#EF4444' : colors.border,
                  },
                ]}
              >
                <User size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Enter your full name"
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={(val) => {
                    setName(val);
                    if (error) setError('');
                  }}
                  autoFocus
                  autoCapitalize="words"
                  autoCorrect={false}
                  maxLength={40}
                  returnKeyType="done"
                  onSubmitEditing={handleContinue}
                />
              </View>

              {previewHandle ? (
                <Text style={[styles.previewText, { color: colors.textSecondary }]}>
                  Your username will be <Text style={{ color: colors.tint, fontWeight: '700' }}>{previewHandle}</Text>
                </Text>
              ) : null}

              {error ? (
                <Text style={styles.errorText}>{error}</Text>
              ) : null}
            </View>

            {/* Continue Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleContinue}
              disabled={!isValid}
              style={[styles.continueBtnWrap, !isValid && styles.btnDisabled]}
            >
              <LinearGradient
                colors={isValid ? BrandColors.coralGradient : ['#D1D5DB', '#9CA3AF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.continueBtn}
              >
                <Text style={styles.continueBtnText}>Continue to AFFORD</Text>
                <ArrowRight size={18} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>

            <Text style={[styles.footerNote, { color: colors.textMuted }]}>
              You only have to do this once. You can edit this anytime in your profile settings.
            </Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  content: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },
  iconCircleWrap: {
    marginBottom: 16,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F43F5E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  wordmark: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 28,
    paddingHorizontal: 12,
  },
  inputCard: {
    width: '100%',
    marginBottom: 20,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    fontWeight: '600',
  },
  previewText: {
    fontSize: 12,
    marginTop: 8,
    marginLeft: 4,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
    marginLeft: 4,
  },
  continueBtnWrap: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#F43F5E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  btnDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  footerNote: {
    fontSize: 11.5,
    textAlign: 'center',
    marginTop: 18,
    lineHeight: 16,
    paddingHorizontal: 16,
  },
});
