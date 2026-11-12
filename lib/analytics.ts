import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabase';

export type AnalyticsEventType =
  | 'session_start'
  | 'onboarding_completed'
  | 'miss_you_sent'
  | 'miss_you_received'
  | 'friend_invited'
  | 'milestone_unlocked'
  | 'connection_question_answered'
  | 'voice_postcard_sent'
  | 'story_created'
  | 'post_created'
  | 'conversation_opened';

export interface AnalyticsEvent {
  id: string;
  eventName: AnalyticsEventType;
  timestamp: string;
  metadata?: Record<string, any>;
}

const STORAGE_KEY = '@afford_privacy_analytics';

class PrivacyAnalytics {
  private queue: AnalyticsEvent[] = [];
  private isInitialized = false;

  async init(userId?: string) {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.queue = JSON.parse(saved);
      }
    } catch {
      this.queue = [];
    }

    // Record session start for DAU / WAU calculation
    this.track('session_start', {
      platform: 'mobile',
      date: new Date().toISOString().split('T')[0],
      hour: new Date().getHours(),
    });
  }

  async track(eventName: AnalyticsEventType, metadata?: Record<string, any>) {
    const event: AnalyticsEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      eventName,
      timestamp: new Date().toISOString(),
      metadata,
    };

    this.queue.unshift(event);

    // Keep last 150 events locally to maintain performance & storage efficiency
    if (this.queue.length > 150) {
      this.queue = this.queue.slice(0, 150);
    }

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
    } catch {
      // Storage fallback
    }

    // If Supabase is connected, optionally record anonymous event
    if (isSupabaseConfigured()) {
      (async () => {
        try {
          await supabase.from('analytics_events').insert({
            event_name: eventName,
            metadata: metadata || {},
            created_at: event.timestamp,
          });
        } catch {
          // Non-fatal
        }
      })();
    }
  }

  async getSummary() {
    const today = new Date().toISOString().split('T')[0];
    const todayEvents = this.queue.filter((e) => e.timestamp.startsWith(today));

    const totalMissYous = this.queue.filter((e) => e.eventName === 'miss_you_sent').length;
    const totalInvites = this.queue.filter((e) => e.eventName === 'friend_invited').length;
    const totalMilestones = this.queue.filter((e) => e.eventName === 'milestone_unlocked').length;

    return {
      totalEvents: this.queue.length,
      todayEventsCount: todayEvents.length,
      totalMissYous,
      totalInvites,
      totalMilestones,
      recentEvents: this.queue.slice(0, 20),
    };
  }
}

export const analytics = new PrivacyAnalytics();

