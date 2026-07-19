import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useGlobalSearch } from '../hooks/useGlobalSearch';
import { BibleSearchResult } from '../hooks/useBibleSearch';
import { HymnSearchResult } from '../hooks/useHymnSearch';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList } from '../navigation/RootNavigator';
import { getBibleBookShortName } from '../utils/bibleBookNames';
import {
  normalizeForHighlight,
  findHighlightRanges,
  segmentTextForHighlight,
} from '../utils/searchHighlight';
import { t } from '../i18n/strings';

type RouteProps = RouteProp<RootStackParamList, 'GlobalSearch'>;
type NavProp = NativeStackNavigationProp<RootStackParamList>;

// Simple View-drawn magnifier (mirrors SearchScreen's — no icon lib).
const MagnifyingGlass = ({ color, size = 18 }: { color: string; size?: number }) => (
  <View style={{ width: size, height: size }}>
    <View
      style={{
        position: 'absolute',
        borderWidth: 2,
        borderRadius: 50,
        borderColor: color,
        width: size * 0.8,
        height: size * 0.8,
        top: 0,
        left: 0,
      }}
    />
    <View
      style={{
        position: 'absolute',
        backgroundColor: color,
        width: size * 0.3,
        height: size * 0.15,
        bottom: -size * 0.05,
        right: -size * 0.05,
        borderRadius: 2,
        transform: [{ rotate: '45deg' }],
      }}
    />
  </View>
);

// Discriminated section items so one SectionList can render both sources.
type Row =
  | { kind: 'bible'; data: BibleSearchResult }
  | { kind: 'hymn'; data: HymnSearchResult };

type Section = { title: string; data: Row[] };

const HYMN_CATEGORY_TITLE = (categoryRaw: string) => {
  const c = (categoryRaw || '').trim().toLowerCase();
  if (c === 'ffpm' || c === 'ffpm hymns') return 'FFPM';
  if (c === 'fifo') return 'F. Fifohazana';
  if (c === 'ff') return 'F. Fanampiny';
  if (c === 'antema') return 'Antema';
  return categoryRaw || 'Fihirana';
};

const HYMN_ORDER = ['FFPM', 'F. Fifohazana', 'F. Fanampiny', 'Antema'];

const GlobalSearchScreen = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavProp>();
  const { theme } = useTheme();
  const mode = route.params?.mode ?? 'bible';

  const { search, isLoading } = useGlobalSearch();
  const [query, setQuery] = useState('');
  const [bible, setBible] = useState<BibleSearchResult[]>([]);
  const [hymns, setHymns] = useState<HymnSearchResult[]>([]);

  useEffect(() => {
    if (!query.trim()) {
      setBible([]);
      setHymns([]);
      return;
    }
    const id = setTimeout(async () => {
      const res = await search(query);
      setBible(res.bible);
      setHymns(res.hymns);
    }, 300);
    return () => clearTimeout(id);
  }, [query, search]);

  const normalizedHighlight = useMemo(() => normalizeForHighlight(query), [query]);

  const highlight = useCallback(
    (text: string, baseColor: string) => {
      if (!text) return null;
      if (!normalizedHighlight) return <Text style={{ color: baseColor }}>{text}</Text>;
      const ranges = findHighlightRanges(text, normalizedHighlight);
      const segments = segmentTextForHighlight(text, ranges);
      return segments.map((seg, i) => (
        <Text
          key={i}
          style={seg.match ? { color: theme.colors.accentBlue, fontWeight: '600' } : { color: baseColor }}
        >
          {seg.text}
        </Text>
      ));
    },
    [normalizedHighlight, theme.colors.accentBlue],
  );

  // Build sections. Mode-aware order: the current mode's source ranks first.
  const sections = useMemo<Section[]>(() => {
    const bibleSection: Section[] = bible.length
      ? [{ title: 'Baiboly', data: bible.map(data => ({ kind: 'bible' as const, data })) }]
      : [];

    const grouped = hymns.reduce<Record<string, Row[]>>((acc, h) => {
      const title = HYMN_CATEGORY_TITLE(h.category);
      (acc[title] ||= []).push({ kind: 'hymn', data: h });
      return acc;
    }, {});
    const hymnSections: Section[] = HYMN_ORDER.filter(title => grouped[title]?.length).map(
      title => ({
        title,
        data: grouped[title],
      }),
    );
    // Any category not in the known order, appended alphabetically.
    Object.keys(grouped)
      .filter(title => !HYMN_ORDER.includes(title))
      .sort()
      .forEach(title => hymnSections.push({ title, data: grouped[title] }));

    return mode === 'hymnal'
      ? [...hymnSections, ...bibleSection]
      : [...bibleSection, ...hymnSections];
  }, [bible, hymns, mode]);

  const openBible = useCallback(
    (item: BibleSearchResult) => {
      navigation.navigate('VerseList', {
        bookId: item.bookId,
        bookName: item.bookName,
        query,
      });
    },
    [navigation, query],
  );

  const openHymn = useCallback(
    (item: HymnSearchResult) => {
      navigation.navigate('Home', { mode: 'hymnal', selectedHymnId: item.id });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: Row }) => {
      if (item.kind === 'bible') {
        const b = item.data;
        return (
          <Pressable
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: theme.colors.backgroundSecondary },
              pressed && { transform: [{ scale: 0.995 }] },
            ]}
            android_ripple={{ color: theme.colors.accentBlue + '20' }}
            onPress={() => openBible(b)}
          >
            <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
              {getBibleBookShortName(b.bookName, b.bookId)}
            </Text>
            <Text style={[styles.cardCount, { color: theme.colors.accentBlue }]}>
              {t('search.resultCount', { count: b.verseCount })}
            </Text>
          </Pressable>
        );
      }
      const h = item.data;
      return (
        <Pressable
          style={({ pressed }) => [
            styles.card,
            { backgroundColor: theme.colors.backgroundSecondary },
            pressed && { transform: [{ scale: 0.995 }] },
          ]}
          android_ripple={{ color: theme.colors.accentBlue + '20' }}
          onPress={() => openHymn(h)}
        >
          <View style={styles.hymnHeader}>
            <Text style={[styles.hymnBadge, { backgroundColor: theme.colors.accentBlue }]}>{h.number}</Text>
            <Text style={[styles.cardTitle, { color: theme.colors.textPrimary, flex: 1 }]} numberOfLines={2}>
              {h.title ? highlight(h.title, theme.colors.textPrimary) : h.title}
            </Text>
          </View>
          {h.matchedVerse ? (
            <Text style={[styles.hymnSnippet, { color: theme.colors.textSecondary }]} numberOfLines={3}>
              {highlight(h.matchedVerse, theme.colors.textSecondary)}
            </Text>
          ) : null}
        </Pressable>
      );
    },
    [theme.colors, openBible, openHymn, highlight],
  );

  const hasResults = bible.length > 0 || hymns.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.backgroundPrimary }]}>
      <View style={styles.searchBarWrap}>
        <View
          style={[
            styles.searchBar,
            { backgroundColor: theme.colors.backgroundSecondary, borderColor: theme.colors.divider },
          ]}
        >
          <MagnifyingGlass color={theme.colors.textSecondary} size={18} />
          <TextInput
            style={[styles.input, { color: theme.colors.textPrimary }]}
            placeholder={t('search.placeholderBible')}
            placeholderTextColor={theme.colors.textSecondary}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.colors.accentBlue} />
        </View>
      ) : hasResults ? (
        <SectionList
          sections={sections}
          keyExtractor={(item, index) =>
            item.kind === 'bible' ? `b:${item.data.bookId}:${index}` : `h:${item.data.id}:${index}`
          }
          renderItem={renderItem}
          renderSectionHeader={({ section }) => (
            <View style={[styles.sectionHeader, { backgroundColor: theme.colors.backgroundPrimary }]}>
              <Text style={[styles.sectionHeaderText, { color: theme.colors.textSecondary }]}>
                {section.title}
              </Text>
            </View>
          )}
          stickySectionHeadersEnabled={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
        />
      ) : query.trim() ? (
        <View style={styles.loading}>
          <Text style={{ color: theme.colors.textSecondary }}>{t('search.noResultsBible')}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBarWrap: { padding: 12 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: { flex: 1, marginLeft: 10, fontSize: 16, paddingVertical: 2 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  listContent: { paddingBottom: 24 },
  sectionHeader: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  sectionHeaderText: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  card: {
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 12,
    padding: 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardCount: { fontSize: 13, marginTop: 2 },
  hymnHeader: { flexDirection: 'row', alignItems: 'center' },
  hymnBadge: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    minWidth: 28,
    textAlign: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 10,
    overflow: 'hidden',
  },
  hymnSnippet: { fontSize: 14, lineHeight: 20, marginTop: 8 },
});

export default GlobalSearchScreen;
