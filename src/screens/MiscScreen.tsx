import React, {useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {t} from '../i18n/strings';
import {useTheme} from '../contexts/ThemeContext';
import {RootStackParamList} from '../navigation/RootNavigator';

type FanekemCategory = 'FJKM' | 'FLM' | 'FFKM';

type FanekemItem = {
  id: string;
  category: FanekemCategory;
  title: string;
  content?: string;
};

const CATEGORIES: FanekemCategory[] = ['FJKM', 'FLM', 'FFKM'];

 const NIKEA_KONSTANTINOPOLITANA =
   "Isika mino an' Andriamanitra Iray, Ray Tsitoha, Mpanao ny lanitra sy ny tany ary ny zavatra rehetra na ny hita na ny tsy hita.\n\n" +
   "Ary an' i Jesoa Kristy Tompo Iray, Zananilahy Tokan' Andriamanitra nateraky ny Rainy talohan' izao rehetra izao,\n" +
   "ny Mazava avy amin' ny Mazava.\n" +
   "Andriamanitra tokoa avy amin' Andriamanitra\n" +
   "nateraka fa tsy natao,\n" +
   "miray amin' ny Ray amin' ny zavatra rehetra.\n" +
   "Izy no nahariana izao tontolo izao.\n" +
   "Noho ny amintsika olombelona sady ho famonjena antsika dia nidina avy tany an-danitra Izy,\n" +
   "ary nataon' ny Fanahy Masina nofo avy tamin' i Maria Virijiny,\n" +
   "dia tonga olona Izy.\n" +
   "Nohomboana tamin' ny hazofijaliana ho fanavotana antsika, tamin' ny nanapahan' i Pontio Pilato Izy;\n" +
   "nijaly Izy ka nalevina.\n" +
   "Nitsangana tamin' ny maty tamin' ny andro fahatelo araka izay voasoratra Izy.\n" +
   "Niakatra ho any an-danitra Izy, ary mipetraka ao an-tànana ankavanan' ny Ray;\n" +
   "avy any no hiaviany indray amin' ny voninahitra hitsara ny velona sy ny maty,\n" +
   "ary mandrakizay ny Fanjakany.\n" +
   "Isika mino ny Fanahy Masina, Tompo sady mpanome aina.\n" +
   "Izay avy amin' ny Ray sy ny Zanaka ka itsaohana sy ankalazaina miaraka amin' ny Ray sy ny Zanaka;\n" +
   "Izy dia niteny tamin' ny vavan' ny mpaminany.\n\n" +
   "Isika mino ny Fiangonana Iray masina, miorina amin' ny fanambaran' ny Apostoly ary manerana izao tontolo izao.\n" +
   "Isika manaiky ny batisa iray ho famelan-keloka sady manantena ny fitsanganan' ny maty ary ny fiainana mandrakizay.\n\n" +
   "Amena";

 const NIKEA_FJKM =
   "Izaho mino an' Andriamanitra tokana, Ray Tsitoha, nahary ny lanitra sy ny tany ary ny zavatra rehetra, na ny hita na ny tsy hita.\n\n" +
   "Izaho mino an' i Jesoa-Kristy Tompo tokana, Zanaka Lahitokan' Andriamanitra, teraky ny Ray talohan' izao rehetra izao, Andriamanitra avy amin' Andriamanitra, Fahazavana avy amin' ny Fahazavana, Andriamanitra marina avy amin' Andriamanitra marina, nateraka fa tsy natao, iray fomba amin' ny Ray.\n\n" +
   "Izy no nahariana izao rehetra izao, nidina avy any an-danitra ho antsika olombelona sy ho famonjena antsika, ary tonga nofo tao amin' i Maria Virijina noho ny herin' ny Fanahy Masina, ka tonga olombelona nohomboana tamin' ny hazofijaliana ho antsika tamin' ny andron' i Pontio Pilato, nijaly ary nalevina, nitsangana velona tamin' ny andro fahatelo araka ny Soratra Masina niakatra any an-danitra, mipetraka eo an-kavanan' ny Ray ary ho avy indray amim-boninahitra hitsara ny velona sy ny maty ka tsy hanam-pahataperana ny Fanjakany.\n\n" +
   "Izaho mino ny Fanahy Masina Tompo sy Mpamelona avy amin' ny Ray sy ny Zanaka, itsaohana sy omem-boninahitra miaraka amin' ny Ray sy ny Zanaka, ary niteny tamin' ny vavan' ny mpaminany.\n\n" +
   "Izaho mino ny Fiangonana iray, Masina, manerana izao rehetra izao, araka ny fanorenan' ny Apostoly.\n\n" +
   "Izaho manaiky ny Batisa iray ho famelan-keloka, ary miandry ny fitsanganan' ny maty sy ny fiainana ho avy. Amena.";

 const NISEANA_FLM =
   "Izaho mino an' Andriamanitra Tokana, Ray tsitoha, Mpanao ny lanitra sy ny tany ary ny zavatra rehetra, na ny hita na ny tsy hita.\n\n" +
   "Izaho mino an' i Jesosy Kristy Tompo Tokana, Zanak' Andriamanitra Lahitokana; nateraky ny Ray talohan' ny fotoana rehetra; Andriamanitra avy amin' Andriamanitra; fahazavana avy amin' ny fahazavana, Andriamanitra marina avy amin' Andriamanitra marina; nateraka fa tsy noharina; miray Sobstansa (Izy maha-Izy Azy) amin'.ny Ray; amin' ny alalany no nahariana ny zavatra rehetra. Noho isika olombelona sy ny famonjena antsika no nidinany avy any an-danitra, ary tonga nofo notorontoronin' ny Fanahy Masina tao an-kibon' i Maria virijina ka natao olombelona; nohomboana tamin' ny hazo fijaliana koa hisolo antsika fony nanapaka Pontio Pilato; nijaly ary nalevina; ary nitsangana indray tamin' ny andro fahatelo araka ny Soratra Masina; niakatra ho any an-danitra; mipetraka eo ankavanan' ny Ray, ary ho avy indray amim-boninahitra hitsara ny velona sy ny maty, ary tsy hanam-pahataperana ny fanjakany.\n\n" +
   "Izaho mino ny Fanahy Masina, Izay Tompo sady Mpamelona; Izay avy amin' ny Ray sy ny Zanaka; Izay itsaohana sy omem-boninahitra miaraka amin' ny Ray sy ny Zanaka; Izay niteny tamin' ny alàlan' ny mpaminany.\n\n" +
   "Izaho mino ny Fiangonana tokana, masina, apostolika, manerana izao tontolo izao. Izaho manaiky ny batisa iray ho famelan-keloka, ary miandry ny fitsanganan' ny maty sy ny fiainana mandrakizay. Amena.";

 const FANEEKEM_FFKM =
   `Mino an'Andriamanitra Ray Tsitoha, Mpanao ny lanitra sy ny tany aho.\n\n` +
   `Ary mino an'i Jesoa Kristy Zananilahy Tokana Tompontsika, izay notorontoronina tamin'ny Fanahy Masina,\n` +
   `naterak'i Maria Virjiny, nijaly raha nanapaka i Pontio Pilato, nohomboana tamin'ny hazo fijaliana, maty ka nalevina, nidina tany amin'ny fiainan-tsy hita, nitsangana tamin'ny maty tamin'ny andro fahatelo,\n` +
   `niakatra ho any an-danitra,\n` +
   `mipetraka eo an-kavanan' Andriamanitra Ray Tsitoha, avy any no hiaviany hitsara ny velona sy ny maty.\n\n` +
   `Mino ny Fanahy Masina aho, ny Fiangonana Masina manerana izao tontolo izao, ny fiombonan'ny olona masina, ny famelan-keloka, ny fitsanganan'ny tena amin'ny maty ary ny fiainana mandrakizay . Amena`;

 const FAHA4_FJKM =
   `Manambara ny finoantsika an'i Jesoa Kristy isika, dia araka ny tenin'i Jaona Mpanao Batisa hoe : "Indro ny Zanak'ondrin' Andriamanitra Izay manaisotra ny fahotan 'izao tontolo izao" sy araka ny teny nataon'i Andrea hoe : "Efa nahita ny Mesia izahay"\n\n` +
   `Sy araka ny teny nataon'i Natanaela hoe: « raby ô, Ianao no zanak'Andriamanitra, Ianao no Mpanjaka ny Israely »\n\n` +
   `- sy araka ny teny nataon'ny Samaritana hoe : "Ny tenanay no nandre, ka fantatray fa Izy tokoa no Mpamonjy izao tontolo izao" "Ny tenanay no nandre, ka fantatray fa Izy tokoa no Mpamonjy izao tontolo izao"\n\n` +
   `- sy araka ny teny nataon'i Petera hoe : "Ianao no Kristy Zanak'Andriamanitra velona", "Ianao no manana ny tenin'ny fiainana mandrakizay"\n\n` +
   `- ary araka ny teny nataon'i Tomasy hoe : "Tompoko sy Andriamanitro". Amena`;

 type MiscScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const MiscScreen = () => {
  const {theme} = useTheme();
  const navigation = useNavigation<MiscScreenNavigationProp>();
  const [selectedCategory, setSelectedCategory] = useState<FanekemCategory>('FJKM');

  const items: FanekemItem[] = useMemo(
    () => [
      {
        id: 'fjkm-nikea-konstantinopolitana',
        category: 'FJKM',
        title: "Fanekem-pinoana nikeana-kônstantinôpôlitana",
        content: NIKEA_KONSTANTINOPOLITANA,
      },
      {
        id: 'fjkm-nikea',
        category: 'FJKM',
        title: 'Fanekem-pinoana nikeana',
        content: NIKEA_FJKM,
      },
      {
        id: 'fjkm-faha4',
        category: 'FJKM',
        title: 'Fanekem-pinoana faha-4',
        content: FAHA4_FJKM,
      },
      {
        id: 'flm-niseana',
        category: 'FLM',
        title: 'Fanekem-pinoana Niseana',
        content: NISEANA_FLM,
      },
      {
        id: 'ffkm-fanekem',
        category: 'FFKM',
        title: 'Fanekem-pinoana',
        content: FANEEKEM_FFKM,
      },
    ],
    []
  );

  const filteredItems = useMemo(() => {
    return items.filter(i => i.category === selectedCategory);
  }, [items, selectedCategory]);

  const styles = useMemo(() => {
    return StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: theme.colors.backgroundPrimary,
      },
      header: {
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 10,
      },
      title: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        marginBottom: 10,
      },
      segmentRoot: {
        flexDirection: 'row',
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: 12,
        padding: 4,
        borderWidth: 1,
        borderColor: theme.colors.divider,
      },
      segmentItem: {
        flex: 1,
        borderRadius: 10,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
      },
      segmentItemSelected: {
        backgroundColor: theme.colors.accentBlue,
      },
      segmentText: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.textSecondary,
      },
      segmentTextSelected: {
        color: '#FFFFFF',
      },
      listContent: {
        paddingHorizontal: 16,
        paddingBottom: 20,
      },
      card: {
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        marginBottom: 10,
      },
      cardTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: theme.colors.textPrimary,
      },
      emptyText: {
        marginTop: 12,
        color: theme.colors.textSecondary,
        fontSize: 14,
      },
    });
  }, [theme]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('menu.misc')}</Text>
        <View style={styles.segmentRoot}>
          {CATEGORIES.map(cat => {
            const isSelected = cat === selectedCategory;
            return (
              <Pressable
                key={cat}
                accessibilityRole="button"
                accessibilityState={{selected: isSelected}}
                onPress={() => setSelectedCategory(cat)}
                style={({pressed}) => [
                  styles.segmentItem,
                  isSelected ? styles.segmentItemSelected : null,
                  pressed ? {opacity: 0.9} : null,
                ]}
              >
                <Text
                  style={[styles.segmentText, isSelected ? styles.segmentTextSelected : null]}
                  allowFontScaling={false}
                >
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        {filteredItems.length === 0 ? (
          <Text style={styles.emptyText}>Tsy misy mbola ato amin'ity sokajy ity.</Text>
        ) : (
          filteredItems.map(item => (
            <Pressable
              key={item.id}
              accessibilityRole={item.content ? 'button' : undefined}
              onPress={() => {
                if (!item.content) {
                  return;
                }

                navigation.navigate('FanekemDetails', {
                  title: item.title,
                  content: item.content,
                });
              }}
              style={({pressed}) => [
                styles.card,
                item.content ? null : {opacity: 0.65},
                pressed && item.content ? {opacity: 0.9} : null,
              ]}
            >
              <Text style={styles.cardTitle}>{item.title}</Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
export default MiscScreen;
