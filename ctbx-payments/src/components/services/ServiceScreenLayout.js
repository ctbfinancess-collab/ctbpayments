import React from'react';import{StyleSheet,View}from'react-native';import{AppHeader,Icon,Screen}from'../ui';import{colors,spacing}from'../../theme';
// `atmospheric`/`backgroundSource`/`rightContent` são opt-in — a rota de
// Investimentos (lista, detalhe, simulação e revisão) já usa o fundo
// atmosférico; as demais telas (Comprovantes, Consignado, Cobrança, Info)
// continuam com o fundo padrão até serem avaliadas também.
export default function ServiceScreenLayout({atmospheric=false,backgroundSource,children,navigation,onRightPress,rightContent,title}){return <Screen atmospheric={atmospheric} backgroundSource={backgroundSource} gradient={!atmospheric} scroll contentContainerStyle={s.content}><AppHeader title={title} onLeftPress={()=>navigation.goBack()} leftContent={<Icon color={colors.textPrimary} name="chevron-back" size={24} />} onRightPress={onRightPress} rightContent={rightContent}/><View style={s.body}>{children}</View></Screen>}const s=StyleSheet.create({content:{paddingHorizontal:0,paddingBottom:spacing.xxl},body:{gap:spacing.md,padding:spacing.lg}});
