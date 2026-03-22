type TranslationKey =
  | 'tabs.bible'
  | 'tabs.hymns'
  | 'menu.favorites'
  | 'menu.history'
  | 'menu.search'
  | 'menu.misc'
  | 'menu.about'
  | 'common.cancel'
  | 'common.close'
  | 'common.remove'
  | 'common.clear'
  | 'common.send'
  | 'font.increase'
  | 'font.decrease'
  | 'favorites.removeTitle'
  | 'favorites.removeMessage'
  | 'favorites.emptyBible'
  | 'favorites.emptyHymnal'
  | 'favorites.hymnLabel'
  | 'history.titleBible'
  | 'history.titleHymnal'
  | 'history.clearTitle'
  | 'history.clearMessage'
  | 'history.clearAll'
  | 'history.emptyBible'
  | 'history.emptyHymnal'
  | 'search.titleBible'
  | 'search.titleHymnal'
  | 'search.settingsTitle'
  | 'search.searchMode'
  | 'search.raw'
  | 'search.grouped'
  | 'search.match'
  | 'search.wholeWord'
  | 'search.placeholderBible'
  | 'search.placeholderHymns'
  | 'search.noResultsBible'
  | 'search.noResultsHymns'
  | 'search.resultCount'
  | 'verseList.title'
  | 'verseList.searchLabel'
  | 'verseList.empty'
  | 'errors.bibleSearch'
  | 'errors.verseSearch'
  | 'errors.hymnSearch'
  | 'actions.addToFavorites'
  | 'actions.report'
  | 'actions.viewConcordance'
  | 'report.title'
  | 'report.reference'
  | 'report.text'
  | 'report.comment'
  | 'report.placeholder'
  | 'report.note'
  | 'about.sectionDeveloper'
  | 'about.sectionSupport'
  | 'about.sectionInfo'
  | 'about.sectionBestPractices'
  | 'about.developerRole'
  | 'about.developerLine3'
  | 'about.supportLine1'
  | 'about.supportLine2'
  | 'about.infoLinePlatforms'
  | 'about.bestPracticeLine1'
  | 'about.bestPracticeLine2'
  | 'about.bestPracticeLine3'
  | 'about.contribute'
  | 'about.links'
  | 'about.contactDeveloper'
  | 'about.phone'
  | 'about.website'
  | 'about.privacyPolicy'
  | 'about.open'
  | 'about.addLinksHint'
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
    'menu.favorites': 'Ankafizina',
    'menu.history': 'Tsiahy',
    'menu.search': 'Fikarohana',
    'menu.misc': 'Samihafa',
    'menu.about': 'Mombamomba',
    'common.cancel': 'Ajanony',
    'common.close': 'Hidio',
    'common.remove': 'Esory',
    'common.clear': 'Fafao',
    'common.send': 'Alefa',
    'font.increase': 'A+',
    'font.decrease': 'A-',
    'favorites.removeTitle': "Esorina ao amin'ny ankafizina",
    'favorites.removeMessage': "Tena esorina ao amin'ny ankafizina ve ity?",
    'favorites.emptyBible': "Tsy mbola misy andininy ankafizina",
    'favorites.emptyHymnal': "Tsy mbola misy fihirana ankafizina",
    'favorites.hymnLabel': 'Fihirana {{number}}',
    'history.titleBible': 'Tsiahy Baiboly',
    'history.titleHymnal': 'Tsiahy Fihirana',
    'history.clearTitle': 'Fafao ny tsiahy',
    'history.clearMessage': "Tena hofafana daholo ve ny tsiahy?",
    'history.clearAll': 'Fafao daholo',
    'history.emptyBible': "Tsy mbola misy tsiahy Baiboly",
    'history.emptyHymnal': "Tsy mbola misy tsiahy Fihirana",
    'search.titleBible': 'Fikarohana Baiboly',
    'search.titleHymnal': 'Fikarohana Fihirana',
    'search.settingsTitle': 'Fikirana',
    'search.searchMode': 'Fomba fikarohana',
    'search.raw': 'Fikarohana tsotra',
    'search.grouped': 'Fikarohana araka sokajy',
    'search.match': 'Fifanandrify',
    'search.wholeWord': 'Teny manontolo',
    'search.placeholderBible': 'Tadiavo ao amin\'ny Baiboly...',
    'search.placeholderHymns': 'Tadiavo ao amin\'ny fihirana...',
    'search.noResultsBible': "Tsy nahitana valiny tao amin'ny Baiboly",
    'search.noResultsHymns': "Tsy nahitana valiny tao amin'ny fihirana",
    'search.resultCount': '{{count}} valiny',
    'verseList.title': "Valin'ny fikarohana",
    'verseList.searchLabel': 'Fikarohana: "{{query}}"',
    'verseList.empty': "Tsy nahitana andininy ho an'ny \"{{query}}\" ao amin'ny {{book}}",
    'errors.bibleSearch': "Nisy olana teo am-pikarohana ao amin'ny Baiboly",
    'errors.verseSearch': "Nisy olana teo am-pikarohana andininy",
    'errors.hymnSearch': "Nisy olana teo am-pikarohana fihirana",
    'actions.addToFavorites': "Ampidiro ao amin'ny ankafizina",
    'actions.report': 'Tatero',
    'actions.viewConcordance': 'Jereo ny concordance',
    'report.title': 'Tatero',
    'report.reference': 'Tondro',
    'report.text': 'Lahatsoratra',
    'report.comment': 'Fanamarihana',
    'report.placeholder': 'Farito ny olana tokony ahitsy...',
    'report.note': "Rehefa mandefa ianao dia alefa ny tondro, ny lahatsoratra miseho, ary ny fanamarihanao mba hanitsiana ny lesoka. Tsy misy angona momba ny toerana (localisation) angonina.",
    'about.sectionDeveloper': 'Mpamorona',
    'about.sectionSupport': 'Hanohana ny tetikasa',
    'about.sectionInfo': 'Fampahafantarana',
    'about.sectionBestPractices': 'Torohevitra',
    'about.developerRole': 'Mpamorona rindranasa',
    'about.developerLine3': "Aza misalasala mifandray amiko raha misy fanehoan-kevitra, bugs, na soso-kevitra.",
    'about.supportLine1': "Ity Application ity dia karakaraina sy hatsaraina amin'ny fotoanako malalaka.",
    'about.supportLine2': "Raha te hanampy amin'ny fikojakojana sy fanavaozana ianao dia afaka mandray anjara amin'ny.",
    'about.infoLinePlatforms': 'Misy amin\'ny Android sy iOS.',
    'about.bestPracticeLine1': "Ataovy 'Mise à jour matetika ny Application mba hahazoana fanitsiana sy fanamboarana.",
    'about.bestPracticeLine2': "Lazao ny lesoka na tsy fitoviana amin'ny alalan'ny bokotra Tatero.",
    'about.bestPracticeLine3': "Hajao ny privacy policy: jereo ny politika raha ilaina.",
    'about.contribute': 'Handray anjara',
    'about.links': 'Rohy',
    'about.contactDeveloper': 'Hifandray amin\'ny mpamorona',
    'about.phone': 'Finday',
    'about.website': 'Tranonkala',
    'about.privacyPolicy': 'Privacy Policy',
    'about.open': 'Sokafy',
    'about.addLinksHint': "Ampidiro ny rohy (email/tranonkala/privacy policy) ato amin'ity pejy ity.",
    'bible.searchPlaceholder': 'Tadiavo boky iray...',
    'bible.oldTestament': 'Testamenta taloha',
    'bible.newTestament': 'Testamenta vaovao',
    'bible.chaptersTitle': 'Toko',
    'bible.readerPrev': 'Aloha',
    'bible.readerNext': 'Manaraka',
    'bible.readerTitle': '{{book}} toko {{chapterText}}',
    'bible.booksTitle': 'Boky',
    'bible.openBooks': 'Hanokatra ny boky',
    'bible.noResults': 'Tsy misy valiny',
    'bible.loading': 'Mandrasa kely, eo am-pikarakarana...',
    'hymns.title': 'Fihirana',
    'hymns.homeTitle': 'Fihirana',
    'hymns.placeholder': ' eo am-panamboarana',
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
