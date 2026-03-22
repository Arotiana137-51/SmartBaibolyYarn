import React from 'react';
import { Text, View, StyleSheet } from 'react-native';

export default function VavolombelonaContent() {
  return (
    <View style={styles.container}>
      <Text style={styles.baseText}>

        <Text style={styles.blue}>
          nambara ny finoantsika an'i Jesoa Kristy isika, dia:{"\n"}
        </Text>

        <Text style={styles.blue}>- araka ny tenin'i Jaona Mpanao Batisa hoe: </Text>
        <Text style={styles.quote}>
          "Indro ny Zanak'ondrin' Andriamanitra Izay manaisotra ny fahotan 'izao tontolo izao" (Jao. 1:29){"\n"}
        </Text>

        <Text style={styles.blue}>- sy araka ny teny nataon'i Andrea hoe: </Text>
        <Text style={styles.quote}>
          "Efa nahita ny Mesia izahay" (Jao. 1:41){"\n"}
        </Text>

        <Text style={styles.blue}>- sy araka ny teny nataon'i Natanaela hoe: </Text>
        <Text style={styles.quote}>
          "Raby ô, Ianao no zanak'Andriamanitra, Ianao no Mpanjaka ny Israely" (Jao. 1:49){"\n"}
        </Text>

        <Text style={styles.blue}>- sy araka ny teny nataon'ny Samaritana hoe: </Text>
        <Text style={styles.quote}>
          "Ny tenanay no nandre, ka fantatray fa Izy tokoa no Mpamonjy izao tontolo izao" (Jao. 4:42){"\n"}
        </Text>

        <Text style={styles.blue}>- sy araka ny teny nataon'i Petera hoe: </Text>
        <Text style={styles.quote}>
          "Ianao no Kristy Zanak'Andriamanitra velona", {"\n"}
          "Ianao no manana ny tenin'ny fiainana mandrakizay" (Mat. 16:16; Jao. 6:68){"\n"}
        </Text>

        <Text style={styles.blue}>- ary araka ny teny nataon'i Tomasy hoe: </Text>
        <Text style={styles.quote}>
          "Tompoko sy Andriamanitro" (Jao. 20:28){"\n"}
        </Text>

        <Text style={styles.blue}>Amen.</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 0,
  },
  baseText: {
    fontSize: 18,
    lineHeight: 30,
  },
  blue: {
    color: '#004E64',
    fontWeight: '600',
  },
  quote: {
    fontStyle: 'italic',
  },
});
