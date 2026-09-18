import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  AppScreen,
  AppHeader,
  PrimaryButton,
  SecondaryButton,
  ErrorState,
  KeyboardAwareScrollView,
} from '../../../../../src/components/common';
import { colors, radius, spacing, typography, shadows } from '../../../../../src/theme';
import { useAuthStore } from '../../../../../src/stores/useAuthStore';
import { canManageQuestionnaires } from '../../../../../src/survey/assertQuestionnaireAdmin';
import {
  addQuestion,
  addSection,
  deleteQuestion,
  deleteSection,
  ensureDraftVersion,
  getDraftDefinition,
  moveQuestion,
  moveSection,
  renameSection,
} from '../../../../../src/data';
import type { QuestionType, QuestionnaireDefinitionSnapshot } from '@appsurvey/shared';
import { QUESTION_TYPE_LABELS } from '@appsurvey/shared';

const ADDABLE_TYPES: QuestionType[] = [
  'short_text',
  'long_text',
  'integer',
  'decimal',
  'date',
  'single_choice',
  'multi_choice',
  'yes_no',
  'rating_scale',
  'info',
  'photo',
];

export default function QuestionnaireEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, profile, userRole } = useAuthStore();
  const accountId = user?.id || profile?.id || 'local-account';
  const actorId = user?.id || profile?.id || null;

  const [definition, setDefinition] = useState<QuestionnaireDefinitionSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [addTypeForSection, setAddTypeForSection] = useState<string | null>(null);

  const allowed = canManageQuestionnaires(userRole);

  const reload = useCallback(async () => {
    if (!id || !allowed) return;
    setLoading(true);
    setError(null);
    try {
      await ensureDraftVersion(accountId, userRole, id, actorId);
      const def = await getDraftDefinition(accountId, id);
      setDefinition(def);
      if (!def) setError('Brouillon introuvable.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [accountId, actorId, allowed, id, userRole]);

  useFocusEffect(
    useCallback(() => {
      if (!allowed) {
        router.replace('/(protected)/s07-access-denied' as never);
        return;
      }
      reload();
    }, [allowed, reload, router])
  );

  if (!allowed) return null;

  const pickType = (sectionId: string) => {
    setAddTypeForSection(sectionId);
  };

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader
        title="Éditeur"
        subtitle="Brouillon local"
        onBack={() => router.back()}
        rightActions={
          <Pressable
            onPress={() =>
              router.push(`/(protected)/(admin)/questionnaires/${id}/preview` as never)
            }
          >
            <Text style={styles.headerLink}>Aperçu</Text>
          </Pressable>
        }
      />
      {loading ? (
        <ActivityIndicator color={colors.vert} style={{ marginTop: spacing.xl }} />
      ) : error || !definition ? (
        <ErrorState title="Erreur" message={error || 'Introuvable'} />
      ) : (
        <KeyboardAwareScrollView contentContainerStyle={styles.container}>
          {addTypeForSection ? (
            <View style={styles.typePicker}>
              <Text style={styles.sectionTitle}>Choisir un type</Text>
              {ADDABLE_TYPES.map((t) => (
                <Pressable
                  key={t}
                  style={styles.typeRow}
                  onPress={async () => {
                    try {
                      await addQuestion(accountId, userRole, id!, addTypeForSection, t);
                      setAddTypeForSection(null);
                      await reload();
                    } catch (e) {
                      Alert.alert('Erreur', e instanceof Error ? e.message : 'Échec');
                    }
                  }}
                >
                  <Text style={styles.qLabel}>{QUESTION_TYPE_LABELS[t]}</Text>
                </Pressable>
              ))}
              <SecondaryButton title="Annuler" onPress={() => setAddTypeForSection(null)} />
            </View>
          ) : null}
          {definition.sections
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((section) => (
              <View key={section.id} style={styles.section}>
                <View style={styles.sectionHeader}>
                  {renamingId === section.id ? (
                    <View style={{ gap: 8, marginBottom: 8 }}>
                      <TextInput
                        value={renameValue}
                        onChangeText={setRenameValue}
                        style={styles.renameInput}
                        autoFocus
                      />
                      <View style={styles.row}>
                        <Pressable
                          onPress={async () => {
                            await renameSection(
                              accountId,
                              userRole,
                              id!,
                              section.id,
                              renameValue
                            );
                            setRenamingId(null);
                            await reload();
                          }}
                        >
                          <Text style={styles.link}>OK</Text>
                        </Pressable>
                        <Pressable onPress={() => setRenamingId(null)}>
                          <Text style={styles.link}>Annuler</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                  )}
                  <View style={styles.row}>
                    <Pressable
                      onPress={async () => {
                        await moveSection(accountId, userRole, id!, section.id, 'up');
                        await reload();
                      }}
                    >
                      <Text style={styles.link}>Monter</Text>
                    </Pressable>
                    <Pressable
                      onPress={async () => {
                        await moveSection(accountId, userRole, id!, section.id, 'down');
                        await reload();
                      }}
                    >
                      <Text style={styles.link}>Descendre</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setRenamingId(section.id);
                        setRenameValue(section.title);
                      }}
                    >
                      <Text style={styles.link}>Renommer</Text>
                    </Pressable>
                    <Pressable
                      onPress={async () => {
                        try {
                          await deleteSection(accountId, userRole, id!, section.id);
                          await reload();
                        } catch (e) {
                          Alert.alert('Erreur', e instanceof Error ? e.message : 'Échec');
                        }
                      }}
                    >
                      <Text style={[styles.link, { color: colors.erreur }]}>Suppr.</Text>
                    </Pressable>
                  </View>
                </View>

                {section.questions
                  .slice()
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((q) => (
                    <Pressable
                      key={q.id}
                      style={styles.question}
                      onPress={() =>
                        router.push(
                          `/(protected)/(admin)/questionnaires/${id}/question/${q.id}` as never
                        )
                      }
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.qLabel}>{q.label}</Text>
                        <Text style={styles.qMeta}>
                          {QUESTION_TYPE_LABELS[q.type]}
                          {q.required ? ' · obligatoire' : ''}
                        </Text>
                      </View>
                      <View style={styles.qActions}>
                        <Pressable
                          onPress={async () => {
                            await moveQuestion(accountId, userRole, id!, q.id, 'up');
                            await reload();
                          }}
                        >
                          <Text style={styles.link}>↑</Text>
                        </Pressable>
                        <Pressable
                          onPress={async () => {
                            await moveQuestion(accountId, userRole, id!, q.id, 'down');
                            await reload();
                          }}
                        >
                          <Text style={styles.link}>↓</Text>
                        </Pressable>
                        <Pressable
                          onPress={async () => {
                            await deleteQuestion(accountId, userRole, id!, q.id);
                            await reload();
                          }}
                        >
                          <Text style={[styles.link, { color: colors.erreur }]}>×</Text>
                        </Pressable>
                      </View>
                    </Pressable>
                  ))}

                <SecondaryButton
                  title="Ajouter une question"
                  onPress={() => pickType(section.id)}
                  style={{ marginTop: spacing.s }}
                />
              </View>
            ))}

          <PrimaryButton
            title="Ajouter une section"
            onPress={async () => {
              await addSection(accountId, userRole, id!);
              await reload();
            }}
            style={{ marginTop: spacing.s }}
          />
          <SecondaryButton
            title="Hub modèle"
            onPress={() =>
              router.push(`/(protected)/(admin)/questionnaires/${id}` as never)
            }
            style={{ marginTop: spacing.s }}
          />
        </KeyboardAwareScrollView>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.m, paddingBottom: spacing.xxl },
  headerLink: { ...typography.presets.labelMedium, color: colors.vert, fontWeight: '700' },
  section: {
    backgroundColor: colors.blanc,
    borderRadius: radius.m,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    marginBottom: spacing.m,
    ...shadows.sm,
  },
  sectionHeader: { marginBottom: spacing.s },
  sectionTitle: {
    ...typography.presets.titleMedium,
    color: colors.vert,
    fontWeight: '800',
    marginBottom: 4,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s },
  link: { ...typography.presets.labelSmall, color: colors.vert, fontWeight: '700' },
  question: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.s,
    borderTopWidth: 1,
    borderTopColor: colors.bordure,
    gap: spacing.s,
  },
  qLabel: { ...typography.presets.bodyMedium, color: colors.texte, fontWeight: '600' },
  qMeta: { ...typography.presets.labelSmall, color: colors.horsLigne },
  qActions: { flexDirection: 'row', gap: spacing.s },
  renameInput: {
    borderWidth: 1,
    borderColor: colors.bordure,
    borderRadius: radius.s,
    padding: spacing.s,
    ...typography.presets.bodyMedium,
    color: colors.texte,
    backgroundColor: colors.blanc,
  },
  typePicker: {
    backgroundColor: colors.blanc,
    borderRadius: radius.m,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    marginBottom: spacing.m,
    gap: spacing.xs,
  },
  typeRow: {
    paddingVertical: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: colors.bordure,
  },
});
