import React, {useMemo} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {t} from '../i18n/strings';
import {useTheme} from '../contexts/ThemeContext';
import {RootStackParamList} from '../navigation/RootNavigator';
import {normalizeTextPreservingMarkers} from '../utils/bibleTextUtils';

type FanekemItem = {
  id: string;
  title: string;
  content: string;
};

const LAHARANA_1_APOSTOLIKA =
  "Mino an’Andriamanitra Ray Tsitoha, Mpanao ny lanitra sy ny tany aho.\n\nAry mino an’i Jesoa Kristy Zananilahy Tokana Tompontsika, izay notorontoronina tamin’ny Fanahy Masina, naterak’i Maria Virjiny, nijaly raha nanapaka i Pontio Pilato, nohomboana tamin’ny hazo fijaliana, maty ka nalevina, nidina tany amin’ny fiainan-tsy hita, nitsangana tamin’ny maty tamin’ny andro fahatelo, niakatra ho any an-danitra, mipetraka eo an-kavanan’ Andriamanitra Ray Tsitoha, avy any no hiaviany hitsara ny velona sy ny maty.\n\nMino ny Fanahy Masina aho, ny Fiangonana Masina manerana izao tontolo izao, ny fiombonan’ny olona masina, ny famelan-keloka, ny fitsanganan’ny tena amin’ny maty ary ny fiainana mandrakizay.\n\nAmena. (Symbole des Apotres)";

const LAHARANA_2_NIKEANA =
  "Isika mino an'Andriamanitra Iray, Ray Tsitoha, Mpanao ny lanitra sy ny tany ary ny zavatra rehetra na ny hita na ny tsy hita.\n\nAry mino an’i Jesoa Kristy Tompo iray, Zananilahy Tokan’ Andriamanitra, nateraky ny Rainy talohan’izao rehetra izao, ny Mazava avy amin’ny Mazava, Andriamanitra tokoa avy amin’Andriamanitra, nateraka fa tsy natao, miray amin’ny Ray amin’ny zavatra rehetra; Izy no nahariana izao rehetra izao.\n\nNoho ny amintsika olombelona sady ho famonjena antsika dia nidina avy tany an-danitra Izy, ary nataon’ny Fanahy Masina nofo avy tamin’i Maria Virjiny, dia tonga olona Izy.\n\nNohomboana tao amin’ny hazo fijaliana ho fanavotana antsika, tamin’ny nanapahan’i Pontio Pilato Izy; nijaly Izy ka nalevina. Nitsangana tamin’ny maty tamin’ny andro fahatelo araka izay voasoratra Izy. Niakatra ho any an-dranitra Izy, ary mipetraka ao an-tanana an-kavanan’ny Ray; avy any no hiaviany indray amin’ny voninahitra hitsara ny velona sy ny maty, ary mandrakizay ny Fanjakany.\n\nIsika mino ny Fanahy Masina, Tompo sady Mpanome aina, izay avy amin’ny Ray sy ny Zanaka ka itsaohana sy ankalazaina miaraka amin’ny Ray sy ny Zanaka; Izy dia niteny tamin’ny vavan’ny mpaminany.\n\nIsika mino ny Fiangonana Iray, Masina, miorina min’ny fanambaran’ny Apostoly ary manerana izao tontolo izao. Isika manaiky ny batisa iray ho famelan-keloka sady manantena ny fitsanganan‘ny maty ary ny fiainana mandrakizay.\n\nAmena. (Symbole de Nicée-Constantinople)";

const LAHARANA_2B_NISEANA =
  "Izaho mino an' Andriamanitra Tokana, Ray tsitoha, Mpanao ny lanitra sy ny tany ary ny zavatra rehetra, na ny hita na ny tsy hita.\n\nIzaho mino an’ i Jesosy Kristy Tompo Tokana, Zanak' Andriamanitra Lahitokana; nateraky ny Ray talohan' ny fotoana rehetra; Andriamanitra avy amin' Andriamanitra; fahazavana avy amin’ ny fahazavana, Andriamanitra marina avy amin’ ny Andriamanitra marina; nateraka fa tsy noharina; miray Sobstansa (Izy maha-Izy Azy) amin’ny Ray; amin’ ny alalany no nahariana ny zavatra rehetra.\n\nNoho isika olombelona sy ny famonjena antsika no nidinany avy any an-danitra, ary tonga nofo notorontoronin’ ny Fanahy Masina tao an-kibon’ i Maria virijina ka natao olombelona; nohomboana tamin’ ny hazo fijaliana koa hisolo antsika fony nanapaka Pontio Pilato; nijaly ary nalevina; ary nitsangana indray tamin’ ny andro fahatelo araka ny Soratra Masina; niakatra ho any an-danitra; mipetraka eo ankavanan’ ny Ray, ary ho avy indray amim-boninahitra hitsara ny velona sy ny maty, ary tsy hanam-pahataperana ny fanjakany.\n\nIzaho mino ny Fanahy Masina, Izay Tompo sady Mpamelona; Izay avy amin’ ny Ray sy ny Zanaka; Izay itsaohana sy omem-boninahitra miaraka amin’ ny Ray sy ny Zanaka; Izay niteny tamin' ny alàlan' ny mpaminany.\n\nIzaho mino ny Fiangonana tokana, masina, apostolika, manerana izao tontolo izao. Izaho manaiky ny batisa iray ho famelan-keloka, ary miandry ny fitsanganan’ ny maty sy ny fiainana mandrakizay.\n\nAmena.";

const LAHARANA_3_SORATRA_MASINA =
  "Mino an’Andriamanitra Tsitoha aho, Izay Mpanao ny lanitra sy ny tany. Andriamanitra dia Fanahy. Andriamanitra dia fitiavana. Andriamanitra dia manjaka hatramin’ny taloha indrindra ka ho mandrakizay. Andriamanitra dia nampiseho ny fitiavany antsika, fa fony mbola mpanota isika, dia maty hamonjy antsika Kristy.\n\nMino an’i Jesoa Kristy, Zananilahy Tokana, Tompontsika aho. Tonga izy hitady sy hamonjy ny very. Izy no làlana sy fahamarinana ary fiainana. Izy dia tsy miova omaly sy anio ary mandrakizay.\n\nMino ny Fanahy Masina aho. Izy no manambara amin’ny fanahintsika fa zanak’ Andriamanitra isika. Fanahy iray ihany no nanaovam-batisa antsika rehetra ho tena iray. Ny fandresena izay enti-mandresy izao tontolo izao dia ny finoantsika. Tompo ô, ampitomboy ny finoanay. Amena";

const LAHARANA_4_VAVOLOMBELONA =
  "Manambara ny finoantsika an’i Jesoa Kristy isika, dia:\n- araka ny tenin’i Jaona Mpanao Batisa hoe: “Indro ny Zanak’ondrin’ Andriamanitra Izay manaisotra ny fahotan ‘izao tontolo izao” (Jao. 1: 29)\n- sy araka ny teny nataon’i Andrea hoe: “Efa nahita ny Mesia izahay” (Jao. 1: 41)\n- sy araka ny teny nataon’i Natanaela hoe: “Raby ô, Ianao no zanak’Andriamanitra, Ianao no Mpanjaka ny Israely” (Jao. 1: 49)\n- sy araka ny teny nataon’ny Samaritana hoe: “Ny tenanay no nandre, ka fantatray fa Izy tokoa no Mpamonjy izao tontolo izao” (Jao. 4: 42)\n- sy araka ny teny nataon’i Petera hoe: “Ianao no Kristy Zanak’Andriamanitra velona”, “Ianao no manana ny tenin’ny fiainana mandrakizay” (Mat. 16: 16; Jao. 6: 68)\n- ary araka ny teny nataon’i Tomasy hoe: “Tompoko sy Andriamanitro”. (Jao. 20: 28)\n\nAmen.";

const BASE_ITEMS: Array<{id: string; title: string; content: string}> = [
  {
    id: 'divers-1-fanekem-apostolika',
    title: 'Fanekem-pinoana Apostolika',
    content: LAHARANA_1_APOSTOLIKA,
  },
  {
    id: 'divers-2-fanekem-nikeana',
    title: 'Fanekem-pinoana Nikeana',
    content: LAHARANA_2_NIKEANA,
  },
  {
    id: 'divers-3-fanekem-soratra-masina',
    title: 'Fanekem-pinoana araka ny Soratra Masina',
    content: LAHARANA_3_SORATRA_MASINA,
  },
  {
    id: 'divers-4-fanekem-vavolombelona',
    title: "Fanekem-pinoan'ireo vavolombelona niara-belona tamin'ny Tompo",
    content: LAHARANA_4_VAVOLOMBELONA,
  },
  {
    id: 'divers-2b-fanekem-niseana',
    title: 'Fanekem-pinoana Niseana',
    content: LAHARANA_2B_NISEANA,
  },
];

type MiscScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const MiscScreen = () => {
  const {theme} = useTheme();
  const navigation = useNavigation<MiscScreenNavigationProp>();

  const items: FanekemItem[] = BASE_ITEMS.map(item => ({
    ...item,
    title: normalizeTextPreservingMarkers(item.title),
  }));

  const styles = useMemo(() => {
    return StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: theme.colors.backgroundPrimary,
      },
      header: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
      },
      title: {
        fontSize: 28,
        fontWeight: '400',
        color: theme.colors.textPrimary,
        marginBottom: 16,
        letterSpacing: 0.5,
      },
      listContent: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 24,
      },
      button: {
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
      },
      buttonInner: {
        flexDirection: 'row',
        alignItems: 'center',
      },
      numberBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.navBackground,
        marginRight: 12,
      },
      numberText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.25,
      },
      buttonText: {
        fontSize: 16,
        fontWeight: '500',
        color: theme.colors.textPrimary,
        letterSpacing: 0.25,
        lineHeight: 24,
      },
    });
  }, [theme]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('menu.misc')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        {items.map((item, index) => (
          <Pressable
            key={item.id}
            style={styles.button}
            onPress={() =>
              navigation.navigate('FanekemDetails', {
                title: item.title,
                content: item.content,
              })
            }
          >
            <View style={styles.buttonInner}>
              <View style={styles.numberBadge}>
                <Text style={styles.numberText}>{index + 1}</Text>
              </View>
              <Text style={styles.buttonText}>{item.title}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};
export default MiscScreen;
