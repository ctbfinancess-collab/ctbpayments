import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';

export default function FinancialCard({ card }) {
  return <View style={styles.card}>
    <View style={styles.row}><Text style={styles.brand}>CTBX Payments</Text><Image source={require('../../../assets/legacy/assets_bandeiras_mastercard.png')} style={styles.logo} resizeMode="contain" /></View>
    <Text style={styles.number}>••••  ••••  ••••  {card.lastFour}</Text>
    <View style={styles.row}><View><Text style={styles.label}>TITULAR</Text><Text style={styles.value}>{card.holder}</Text></View><View><Text style={styles.label}>VALIDADE</Text><Text style={styles.value}>{card.expiry}</Text></View></View>
  </View>;
}
const styles = StyleSheet.create({ card:{backgroundColor:colors.navy700,borderColor:colors.purple400,borderRadius:radii.xl,borderWidth:1,minHeight:190,padding:spacing.xl,justifyContent:'space-between'},row:{alignItems:'center',flexDirection:'row',justifyContent:'space-between'},brand:{...typography.heading3,color:colors.textPrimary},logo:{height:34,width:54},number:{color:colors.textPrimary,fontSize:20,letterSpacing:2},label:{...typography.caption,color:colors.textSecondary},value:{...typography.body,color:colors.textPrimary,fontWeight:'700',marginTop:3}});
