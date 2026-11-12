# AFFORD — Feel closer. Even when apart.

> **An emotional social networking application focused on close human relationships, shared memories, daily connection, and the signature 1-Tap Miss You gesture.**

---

## 🌟 Vision & Key Features

### 1. Signature Feature: The 1-Tap "Miss You" Gesture
Beside eligible conversations in the Messages tab and in individual chat headers, users have a dedicated 52px interactive AFFORD heart symbol:
- **Direct 1-Tap Counter**: Single tap instantly increments the displayed Miss You count by 1 (optimistic update with immediate feedback).
- **Zero Interruption**: No modals, popups, or confirmation screens — keeps users directly inside their conversation flow.
- **Micro-Animations & Haptics**: Features a snappy spring heart pulse, subtle haptic feedback, and a floating `+1` indicator.
- **Daily & Lifetime Tracking**: Displays total lifetime count alongside today's count (`+X today`).
- **Mutual Miss You Signals**: Displays a subtle `❤️ Mutual` badge when two friends frequently send Miss You signals to each other.
- **Private Miss You History (`/miss-you-history`)**: Detailed timeline of sent and received Miss You events with timestamps and daily totals.
- **Database & Supabase Sync**: Every tap writes securely to `public.miss_you_events` and syncs real-time notifications to the recipient.

### 2. Main Navigation (5 Tabs)
1. **Home (`/`)**:
   - Time-of-day personalized greeting with AFFORD brand wordmark.
   - Stories & Moments horizontal carousel with indicator rings (Emerald for Close Friends, Coral for friends, subtle for viewed).
   - Featured Daily Connection Prompt & "On This Day" throwback memories from previous years.
   - Social memory posts feed with double-tap heart animations, comments sheet, and media previews.
2. **Discover (`/discover`)**:
   - Universal search across friends, moments, and creators.
   - Curated topic pills (*Moments*, *Close Circle*, *Art*, *Travel*, *Reflections*).
   - Suggested creators with 1-tap follow toggles and privacy respect.
   - 3-column discovery media grid.
3. **Create (`/create`)**:
   - Choose between publishing a **Memory Post** or a **24h Story / Moment**.
   - Camera capture or gallery image picker.
   - Atmospheric filters (*Warm Nostalgia*, *Golden Velvet*, *Film Noir*, *Vivid Nature*, *Original*).
   - Close Circle toggle to restrict visibility to trusted friends only.
4. **Messages (`/messages`)**:
   - Conversation cards with 52px circular avatars, active status badges, and streak day flames (`42d`).
   - Integrated 52px **Miss You Gesture** button with vertically stacked lifetime and daily counters.
   - Search filter across friends and message history.
5. **Profile (`/profile`)**:
   - User identity: avatar, username, display name, bio, private account indicator.
   - Emotional connection stats: Total Miss Yous Sent and Received today/lifetime.
   - 3-tab layout: Moments grid, Shared Memory Vault, and Miss You stats.
   - Profile editor and shareable profile links.

### 3. Emotional Connection Features
- **Direct Messaging (`/chat/[id]`)**: Real-time messaging, voice postcards with waveform visualizer, image sharing, streak badges, and header Miss You shortcut.
- **Daily Connection Questions**: Thoughtful daily prompts for friends and couples to privately answer and bond over.
- **Friendship Milestones**: Automatic celebration animations for 7, 30, 50, and 100-day streaks.
- **Friendship Profiles (`/friendship/[id]`)**: Deep-dive relationship page displaying streak progress, shared memories, and mutual bond history.
- **24-Hour Story Viewer (`/story/[id]`)**: Segmented auto-progress bars, hold-to-pause, tap navigation, and private DM replies.
- **Vertical Video Feed (`/reels`)**: Full-screen reels with snapping pagination, video controls, and likes.
- **Settings & Privacy (`/settings`)**: Appearance (Light/Dark themes), account privacy, notification controls, blocked accounts, and session management.

---

## 🛠 Technology Stack

- **Framework**: React Native with Expo SDK 58 (Expo Router v58)
- **Language**: TypeScript
- **Styling & Design System**: Responsive tokens (`constants/Colors.ts`) with Light (pure white default) & Dark luxury modes
- **Backend & Database**: Supabase (PostgreSQL with Row Level Security policies)
- **State Management & Offline Storage**: React Context + `@react-native-async-storage/async-storage`
- **Animations & Gestures**: `react-native-reanimated` & `react-native-gesture-handler`
- **Icons**: `lucide-react-native`
- **Haptics**: `expo-haptics`
- **Media**: `expo-image-picker` & `expo-av`

---

## 🗄️ Database Architecture & Migrations

PostgreSQL migrations with Row Level Security (RLS) policies:
- `supabase/migrations/20261109000000_afford_schema.sql` (Core schema)
- `supabase/migrations/20261109000001_fix_rls_recursion_and_view.sql` (Security & view optimization)
- `supabase/migrations/20261110000000_social_features.sql` (Milestones, questions, & daily counts)

Core tables:
- `profiles`, `friendships`, `follows`, `close_friends`, `blocks`, `reports`
- `conversations`, `conversation_members`, `messages`, `message_attachments`
- `miss_you_events`, `streaks`, `posts`, `post_likes`, `post_comments`
- `stories`, `story_views`, `notifications`, `daily_prompts`, `prompt_responses`

---

## ⚙️ Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Add your Supabase project credentials:

```ini
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
EXPO_PUBLIC_DEMO_MODE=false
```

---

## 🚀 Getting Started

### 1. Install dependencies
```bash
npx expo install
# or
pnpm install
```

### 2. Typecheck & verify
```bash
npx tsc --noEmit
```

### 3. Start Expo development server
```bash
npx expo start
```

### 4. Run on Platform
- **Expo Go (Android / iOS)**: Scan the terminal QR code from the Expo Go app.
- **Tunnel Mode (Remote Testing)**: `npx expo start --go --tunnel`
- **Web**: `npx expo start --web`
