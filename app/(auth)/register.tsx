import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, AtSign, Heart, Lock, Mail, User } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

export default function RegisterScreen() {
  const { colors } = useTheme();
  const { signUp } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!displayName.trim() || !username.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Incomplete Fields', 'Please complete all fields to create your account.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Password Too Short', 'Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    const res = await signUp(email.trim(), password.trim(), username.trim(), displayName.trim());
    setIsLoading(false);

    if (res.success) {
      Alert.alert('Welcome to AFFORD! ✨', 'Your account has been created.', [
        { text: 'Start Connecting', onPress: () => router.replace('/(tabs)') },
      ]);
    } else {
      Alert.alert('Registration Failed', res.error || 'Please try again.');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.titleSection}>
            <View style={styles.iconCircle}>
              <Heart size={28} color="#F43F5E" fill="#F43F5E" />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Join AFFORD</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Create your profile to connect through memories and meaningful gestures.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            {/* Display Name */}
            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
              <User size={18} color={colors.textSecondary} />
              <TextInput
                placeholder="Full Name / Display Name"
                placeholderTextColor={colors.textMuted}
                value={displayName}
                onChangeText={setDisplayName}
                style={[styles.input, { color: colors.text }]}
              />
            </View>

            {/* Username */}
            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
              <AtSign size={18} color={colors.textSecondary} />
              <TextInput
                placeholder="Username (e.g. alex_rivera)"
                placeholderTextColor={colors.textMuted}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                style={[styles.input, { color: colors.text }]}
              />
            </View>

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
                placeholder="Password (minimum 6 characters)"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={[styles.input, { color: colors.text }]}
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleRegister}
              disabled={isLoading}
              style={[styles.primaryBtn, { backgroundColor: colors.tint, opacity: isLoading ? 0.7 : 1 }]}
            >
              <Text style={styles.primaryBtnText}>
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sign In Link */}
          <View style={styles.bottomLinkRow}>
            <Text style={[styles.bottomLinkText, { color: colors.textSecondary }]}>
              Already have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={[styles.loginLink, { color: colors.tint }]}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: 16,
    gap: 24,
  },
  backBtn: {
    alignSelf: 'flex-start',
    padding: 4,
  },
  titleSection: {
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(244,63,94,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
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
  primaryBtn: {
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
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
  },
  bottomLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  bottomLinkText: {
    fontSize: 13,
  },
  loginLink: {
    fontSize: 13,
    fontWeight: '700',
  },
});
