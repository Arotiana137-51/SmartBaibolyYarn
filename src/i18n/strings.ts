type TranslationKey =
  | 'tabs.bible'
  | 'tabs.hymns'
  | 'menu.favorites'
  | 'menu.history'
  | 'menu.search'
  | 'menu.misc'
  | 'menu.about'
  | 'font.increase'
  | 'font.decrease'
  | 'bible.searchPlaceholder'
  | 'bible.oldTestament'
  | 'bible.newTestament'
  | 'bible.chaptersTitle'
  | 'bible.readerPrev'
  | 'bible.readerNext'
  | 'bible.readerTitle'
  | 'bible.booksTitle'
  | 'bible.openBooks'
  | 'bible.noResults'
  | 'bible.loading'
  | 'hymns.title'
  | 'hymns.homeTitle'
  | 'hymns.placeholder';

type TranslationParams = Record<string, string | number>;

type TranslationMap = Record<TranslationKey, string>;

type Translations = {
  fr: TranslationMap;
};

const translations: Translations = {
  fr: {
    'tabs.bible': 'Baiboly',
    'tabs.hymns': 'Fihirana',
    'menu.favorites': 'Favoris',
    'menu.history': 'Historique',
    'menu.search': 'Recherche',
    'menu.misc': 'Divers',
    'menu.about': 'A propos',
    'font.increase': 'A+',
    'font.decrease': 'A-',
    'bible.searchPlaceholder': 'Rechercher un livre',
    'bible.oldTestament': 'Testament ancien',
    'bible.newTestament': 'Testament nouveau',
    'bible.chaptersTitle': 'Chapitres',
    'bible.readerPrev': 'Precedent',
    'bible.readerNext': 'Suivant',
    'bible.readerTitle': '{{book}} {{chapter}}',
    'bible.booksTitle': 'Livres',
    'bible.openBooks': 'Ouvrir les livres',
    'bible.noResults': 'Aucun resultat',
    'bible.loading': 'Chargement...',
    'hymns.title': 'Fihirana',
    'hymns.homeTitle': 'Fihirana',
    'hymns.placeholder': 'Ecran en cours de preparation',
  },
};

const defaultLocale: keyof Translations = 'fr';

export const t = (key: TranslationKey, params?: TranslationParams): string => {
  const template = translations[defaultLocale][key] ?? key;
  if (!params) {
    return template;
  }

  return Object.entries(params).reduce(
    (acc, [paramKey, value]) => acc.replace(`{{${paramKey}}}`, String(value)),
    template
  );
};

export type { TranslationKey };
