/**
 * AFFORD Design System Colors & Theme Tokens
 * Luxury emotional social network aesthetic.
 */

const primaryViolet = '#7C3AED';
const primaryRose = '#E11D48';
const primaryCoral = '#F43F5E';
const primarySunset = '#FB7185';
const accentAmber = '#F59E0B';
const accentEmerald = '#10B981';
const accentPurple = '#A855F7';

export const BrandColors = {
  primary: primaryCoral,
  primaryGradient: [primaryCoral, '#E11D48', primaryViolet] as const,
  coralGradient: [primaryCoral, '#E11D48'] as const,
  violetGradient: ['#8B5CF6', '#6D28D9'] as const,
  storyGradient: ['#F43F5E', '#E11D48', '#8B5CF6'] as const,
  closeFriendsGradient: ['#10B981', '#059669', '#047857'] as const,
  goldGradient: ['#F59E0B', '#D97706'] as const,
  primaryViolet,
  primaryRose,
  primaryCoral,
  primarySunset,
  accentAmber,
  accentEmerald,
  accentPurple,
  heartRed: '#EF4444',
  streakOrange: '#F59E0B',
  closeFriendsGreen: '#10B981',
};

export default {
  light: {
    text: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    background: '#FFFFFF',
    backgroundSecondary: '#FAFAFA',
    card: '#FFFFFF',
    cardBorder: '#EAEAEA',
    cardHover: '#FFF5F6',
    inputBackground: '#F5EFF1',
    tint: primaryCoral,
    tintLight: '#FFE4E6',
    tabIconDefault: '#94A3B8',
    tabIconSelected: primaryCoral,
    tabBarBackground: 'rgba(255, 255, 255, 0.95)',
    border: '#EAEAEA',
    accent: primaryViolet,
    missYouHalo: 'rgba(244, 63, 94, 0.18)',
    missYouActive: '#E11D48',
    glowColor: 'rgba(244, 63, 94, 0.25)',
    glassBackground: 'rgba(255, 255, 255, 0.85)',
    glassBorder: 'rgba(244, 63, 94, 0.15)',
  },
  dark: {
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    background: '#090A10',
    backgroundSecondary: '#0F121C',
    card: '#141724',
    cardBorder: 'rgba(244, 63, 94, 0.18)',
    cardHover: '#1B2032',
    inputBackground: '#131622',
    tint: primarySunset,
    tintLight: 'rgba(244, 63, 94, 0.2)',
    tabIconDefault: '#64748B',
    tabIconSelected: primarySunset,
    tabBarBackground: 'rgba(12, 14, 22, 0.95)',
    border: '#23293D',
    accent: '#A78BFA',
    missYouHalo: 'rgba(244, 63, 94, 0.32)',
    missYouActive: primarySunset,
    glowColor: 'rgba(244, 63, 94, 0.35)',
    glassBackground: 'rgba(20, 23, 36, 0.85)',
    glassBorder: 'rgba(244, 63, 94, 0.22)',
  },
};
