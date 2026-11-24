import React, { useState } from 'react';
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Check, Flag, ShieldAlert, X } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

interface ReportModalProps {
  visible: boolean;
  contentType: 'post' | 'user' | 'message' | 'story';
  contentId: string;
  targetName?: string;
  onClose: () => void;
  onSubmitReport: (reason: string) => void;
}

const REPORT_REASONS = [
  'Harassment or bullying',
  'Inappropriate or sensitive content',
  'Spam or misleading information',
  'Hate speech or discrimination',
  'Impersonation or fake account',
  'Other safety violation',
];

export const ReportModal: React.FC<ReportModalProps> = ({
  visible,
  contentType,
  contentId,
  targetName,
  onClose,
  onSubmitReport,
}) => {
  const { colors, isDark } = useTheme();
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const handleSubmit = () => {
    if (!selectedReason) return;
    onSubmitReport(selectedReason);
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setSelectedReason(null);
      onClose();
      Alert.alert(
        'Report Received',
        'Thank you for looking out for the AFFORD community. Our trust & safety team will review this promptly.'
      );
    }, 1200);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <ShieldAlert size={20} color="#EF4444" />
              <Text style={[styles.title, { color: colors.text }]}>Report {contentType}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {targetName && (
            <Text style={[styles.targetInfo, { color: colors.textSecondary }]}>
              Reporting content related to <Text style={{ fontWeight: '700', color: colors.text }}>{targetName}</Text>
            </Text>
          )}

          <Text style={[styles.prompt, { color: colors.textSecondary }]}>
            Why are you reporting this {contentType}?
          </Text>

          {/* Reasons List */}
          <View style={styles.reasonsList}>
            {REPORT_REASONS.map((reason) => {
              const isSelected = selectedReason === reason;
              return (
                <TouchableOpacity
                  key={reason}
                  onPress={() => setSelectedReason(reason)}
                  style={[
                    styles.reasonItem,
                    {
                      backgroundColor: isSelected
                        ? isDark ? '#261214' : '#FEF2F2'
                        : colors.inputBackground,
                      borderColor: isSelected ? '#EF4444' : 'transparent',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.reasonText,
                      { color: isSelected ? '#EF4444' : colors.text, fontWeight: isSelected ? '700' : '500' },
                    ]}
                  >
                    {reason}
                  </Text>
                  {isSelected && <Check size={16} color="#EF4444" />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!selectedReason || isSubmitted}
            style={[
              styles.submitBtn,
              {
                backgroundColor: '#EF4444',
                opacity: selectedReason && !isSubmitted ? 1 : 0.5,
              },
            ]}
          >
            <Flag size={16} color="#FFFFFF" />
            <Text style={styles.submitBtnText}>
              {isSubmitted ? 'Submitting Report...' : 'Submit Confidential Report'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  card: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    padding: 20,
    gap: 14,
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  closeBtn: {
    padding: 4,
  },
  targetInfo: {
    fontSize: 13,
  },
  prompt: {
    fontSize: 12,
    fontWeight: '600',
  },
  reasonsList: {
    gap: 8,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  reasonText: {
    fontSize: 13,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

