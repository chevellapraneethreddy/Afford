import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import { Compass, Heart, Home, MessageCircle, Plus, User } from 'lucide-react-native';
import { BrandColors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

export default function TabLayout() {
  const { colors, isDark } = useTheme();
  const { conversations } = useAuth();

  const totalUnread = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: {
          backgroundColor: colors.tabBarBackground,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDark ? 0.3 : 0.05,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: '700',
          letterSpacing: 0.2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabIconWrap}>
              <Home size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
              {focused && <View style={[styles.activeDot, { backgroundColor: colors.tint }]} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabIconWrap}>
              <Compass size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
              {focused && <View style={[styles.activeDot, { backgroundColor: colors.tint }]} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          tabBarIcon: ({ focused }) => (
            <LinearGradient
              colors={BrandColors.coralGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.createBtnGradient}
            >
              <Plus size={20} color="#FFFFFF" strokeWidth={3} />
            </LinearGradient>
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarBadge: totalUnread > 0 ? totalUnread : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#F43F5E',
            fontSize: 9,
            fontWeight: '800',
          },
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabIconWrap}>
              <MessageCircle size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
              {focused && <View style={[styles.activeDot, { backgroundColor: colors.tint }]} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabIconWrap}>
              <User size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
              {focused && <View style={[styles.activeDot, { backgroundColor: colors.tint }]} />}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  createBtnGradient: {
    width: 36,
    height: 36,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F43F5E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
    marginBottom: 2,
  },
});
