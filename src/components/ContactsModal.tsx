import React, {useEffect, useState} from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type {EmergencyContact} from '../types';
import {colors, font, radius, spacing} from '../theme';
import {AppButton} from './AppButton';
import {isValidPhone, MAX_CONTACTS} from '../services/storage';

interface Props {
  visible: boolean;
  initial: EmergencyContact[];
  onClose: () => void;
  onSave: (contacts: EmergencyContact[]) => Promise<void> | void;
}

export function ContactsModal({visible, initial, onClose, onSave}: Props) {
  const [contacts, setContacts] = useState<EmergencyContact[]>(initial);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setContacts(initial.map(c => ({...c})));
      setErrors([]);
    }
  }, [visible, initial]);

  const update = (i: number, field: keyof EmergencyContact, value: string) => {
    setContacts(prev => prev.map((c, idx) => (idx === i ? {...c, [field]: value} : c)));
    setErrors(prev => prev.map((e, idx) => (idx === i ? '' : e)));
  };

  const handleSave = async () => {
    const errs = contacts.map(c => {
      const hasAny = c.name.trim() || c.phone.trim();
      if (!hasAny) {
        return '';
      }
      if (!c.phone.trim()) {
        return 'Phone number is required';
      }
      if (!isValidPhone(c.phone)) {
        return 'Enter a valid phone number';
      }
      return '';
    });
    setErrors(errs);
    if (errs.some(Boolean)) {
      return;
    }
    setSaving(true);
    try {
      await onSave(
        contacts.map((c, i) => ({
          name: c.name.trim() || (c.phone.trim() ? `Contact ${i + 1}` : ''),
          phone: c.phone,
        })),
      );
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Emergency Contacts</Text>
              <Text style={styles.subtitle}>
                Up to {MAX_CONTACTS} people who get your location by SMS during SOS.
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close" testID="contacts-close">
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {contacts.map((c, i) => (
              <View key={i} style={[styles.card, errors[i] ? styles.cardError : null]}>
                <View style={styles.cardHeader}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.cardTitle}>
                    {i === 0 ? 'Primary contact' : `Contact ${i + 1}`}
                  </Text>
                </View>
                <TextInput
                  testID={`contact-name-${i}`}
                  nativeID={`contact-name-${i}`}
                  value={c.name}
                  onChangeText={t => update(i, 'name', t)}
                  placeholder="Name (e.g. Maa, Papa, Priya)"
                  placeholderTextColor={colors.textDim}
                  style={styles.input}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
                <TextInput
                  testID={`contact-phone-${i}`}
                  nativeID={`contact-phone-${i}`}
                  value={c.phone}
                  onChangeText={t => update(i, 'phone', t)}
                  placeholder="Phone (e.g. +91 98765 43210)"
                  placeholderTextColor={colors.textDim}
                  style={styles.input}
                  keyboardType="phone-pad"
                  maxLength={18}
                />
                {errors[i] ? <Text style={styles.error}>{errors[i]}</Text> : null}
              </View>
            ))}

            <AppButton
              id="contacts-save"
              label="SAVE CONTACTS"
              variant="sos"
              loading={saving}
              onPress={handleSave}
              style={styles.save}
            />
            <Text style={styles.footnote}>
              Stored only on this phone. Nothing is uploaded anywhere.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end'},
  sheet: {
    maxHeight: '92%',
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg},
  title: {color: colors.text, fontSize: font.sizes.xl, fontWeight: '800'},
  subtitle: {color: colors.textMuted, fontSize: font.sizes.sm, marginTop: 4, maxWidth: 280},
  close: {color: colors.textMuted, fontSize: 20, padding: 4},
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  cardError: {borderColor: colors.sos},
  cardHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md},
  badge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.sosSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  badgeText: {color: colors.sos, fontWeight: '800', fontSize: font.sizes.sm},
  cardTitle: {color: colors.text, fontWeight: '700', fontSize: font.sizes.md},
  input: {
    backgroundColor: colors.bg,
    color: colors.text,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: Platform.OS === 'android' ? 10 : 14,
    fontSize: font.sizes.md,
    marginBottom: spacing.sm,
  },
  error: {color: '#FB7185', fontSize: font.sizes.xs, fontWeight: '600'},
  save: {marginTop: spacing.sm},
  footnote: {color: colors.textDim, fontSize: font.sizes.xs, textAlign: 'center', marginTop: spacing.md},
});
