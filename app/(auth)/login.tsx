import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Heart, Lock, Mail, Sparkles } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

export default function LoginScreen() {
  const { colors, isDark } = useTheme();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Required', 'Please fill in both email and password.');
      return;
    }

    setIsLoading(true);
    const res = await signIn(email.trim(), password.trim());
    setIsLoading(false);

    if (res.success) {
      router.replace('/(tabs)');
    } else {
      Alert.alert('Sign In Failed', res.error || 'Please check your credentials.');
    }
  };

  const handleQuickDemo = async () => {
    setIsLoading(true);
    await signIn('demo@afford.app', 'demo123456');
    setIsLoading(false);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <View style={styles.content}>
          {/* Brand Logo & Tagline */}
          <View style={styles.brandContainer}>
            <View style={[styles.logoCircle, { backgroundColor: 'rgba(244,63,94,0.15)' }]}>
              <Heart size={38} color="#F43F5E" fill="#F43F5E" />
            </View>
            <Text style={[styles.brandTitle, { color: colors.text }]}>
              AFF<Text style={{ color: colors.tint }}>ORD</Text>
            </Text>
            <Text style={[styles.brandTagline, { color: colors.textSecondary }]}>
              Emotional connections & memories where every touch matters.
            </Text>
          </View>

          {/* Form Fields */}
          <View style={styles.formContainer}>
            {/* Email */}
            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
              <Mail size={18} color={colors.textSecondary} />
              <TextInput
                placeholder="Email address"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={[styles.input, { color: colors.text }]}
              />
            </View>

            {/* Password */}
            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
              <Lock size={18} color={colors.textSecondary} />
              <TextInput
                placeholder="Password"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={[styles.input, { color: colors.text }]}
              />
            </View>

            {/* Forgot Password link */}
            <TouchableOpacity
              onPress={() => router.push('/(auth)/forgot-password')}
              style={styles.forgotBtn}
            >
              <Text style={[styles.forgotText, { color: colors.tint }]}>
                Forgot password?
              </Text>
            </TouchableOpacity>

            {/* Sign In Button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={isLoading}
              style={[styles.primaryBtn, { backgroundColor: colors.tint, opacity: isLoading ? 0.7 : 1 }]}
            >
              <Text style={styles.primaryBtnText}>
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Text>
            </TouchableOpacity>

            {/* Quick Demo Access Button */}
            <TouchableOpacity
              onPress={handleQuickDemo}
              style={[styles.demoBtn, { borderColor: colors.border, backgroundColor: isDark ? '#1C1929' : '#FFF1F2' }]}
            >
              <Sparkles size={16} color={colors.tint} />
              <Text style={[styles.demoBtnText, { color: colors.tint }]}>
                Instant Demo Access (Explore Full App)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Register Link */}
          <View style={styles.bottomLinkRow}>
            <Text style={[styles.bottomLinkText, { color: colors.textSecondary }]}>
              New to AFFORD?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={[styles.registerLink, { color: colors.tint }]}>
                Create an account
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    gap: 32,
  },
  brandContainer: {
    alignItems: 'center',
    gap: 8,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 3,
  },
  brandTagline: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
  formContainer: {
    gap: 14,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 14,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
  },
  forgotText: {
    fontSize: 12,
    fontWeight: '600',
  },
  primaryBtn: {
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#F43F5E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  demoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: 1,
  },
  demoBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  bottomLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomLinkText: {
    fontSize: 13,
  },
  registerLink: {
    fontSize: 13,
    fontWeight: '700',
  },
});
