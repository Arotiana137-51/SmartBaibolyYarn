import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

type ReportIssueModalProps = {
  visible: boolean;
  reference: string;
  text: string;
  onClose: () => void;
  onSubmit: (comment: string) => void;
};

const ReportIssueModal: React.FC<ReportIssueModalProps> = ({
  visible,
  reference,
  text,
  onClose,
  onSubmit,
}) => {
  const { theme } = useTheme();
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (visible) {
      setComment('');
    }
  }, [visible]);

  const canSubmit = useMemo(() => comment.trim().length > 0, [comment]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.card,
            { backgroundColor: theme.colors.backgroundSecondary },
          ]}
          onPress={() => {}}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
              Signaler
            </Text>
            <Pressable onPress={onClose}>
              <Text style={[styles.closeText, { color: theme.colors.textSecondary }]}>
                Fermer
              </Text>
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Référence</Text>
            <Text style={[styles.value, { color: theme.colors.textPrimary }]}>
              {reference}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Texte</Text>
            <Text
              style={[styles.value, { color: theme.colors.textPrimary }]}
              numberOfLines={8}
            >
              {text}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Commentaire</Text>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Décris le problème à corriger..."
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              style={[
                styles.input,
                {
                  borderColor: theme.colors.divider,
                  color: theme.colors.textPrimary,
                },
              ]}
            />
            <Text style={[styles.note, { color: theme.colors.textSecondary }]}>
              En envoyant, tu transmets la référence, le texte affiché et ton commentaire afin de corriger les erreurs.
              Aucune donnée de localisation n’est collectée.
            </Text>
          </View>

          <View style={styles.actions}>
            <Pressable
              style={[styles.button, { borderColor: theme.colors.divider }]}
              onPress={onClose}
            >
              <Text style={[styles.buttonText, { color: theme.colors.textPrimary }]}>Annuler</Text>
            </Pressable>

            <Pressable
              style={[
                styles.button,
                styles.primaryButton,
                {
                  backgroundColor: canSubmit ? '#005a9e' : theme.colors.divider,
                },
              ]}
              onPress={() => onSubmit(comment)}
              disabled={!canSubmit}
            >
              <Text style={[styles.buttonText, { color: '#fff' }]}>Envoyer</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    minWidth: 280,
    maxWidth: '92%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  closeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    marginBottom: 6,
  },
  value: {
    fontSize: 14,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 10,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  note: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  button: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    borderWidth: 0,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});

export default ReportIssueModal;
