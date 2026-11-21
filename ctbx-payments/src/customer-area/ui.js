import React, { useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { breakpoints, ca, fonts } from './theme';

const emblem = require('../../assets/brand/ctbx-emblem.png');
const wordmark = require('../../assets/brand/ctbx-wordmark.png');

export function useLayout() {
  const { width } = useWindowDimensions();
  return { width, isDesktop: width >= breakpoints.desktop, isTablet: width >= breakpoints.tablet };
}

// Marca como no cabeçalho do site: emblema, traço vertical e PAYMENTS dourado.
export function Brand({ size = 'md' }) {
  const e = size === 'lg' ? 64 : size === 'sm' ? 36 : 46;
  return (
    <View accessibilityLabel="CTBX Payments" accessibilityRole="image" style={styles.brand}>
      <Image accessibilityIgnoresInvertColors source={emblem} style={{ height: e, width: e }} />
      <View style={[styles.brandDivider, { height: e * 0.7 }]} />
      <Image source={wordmark} style={{ height: e * 0.3, width: e * 0.3 * (640 / 82) }} resizeMode="contain" />
    </View>
  );
}

export function Eyebrow({ children, style }) {
  return <Text style={[styles.eyebrow, style]}>{children}</Text>;
}

export function GoldTitle({ children, style }) {
  const { isDesktop } = useLayout();
  return <Text accessibilityRole="header" style={[styles.goldTitle, { fontSize: isDesktop ? 46 : 34 }, style]}>{children}</Text>;
}

export function Heading({ children, style, level = 1 }) {
  return <Text accessibilityRole="header" aria-level={level} style={[level === 1 ? styles.h1 : styles.h2, style]}>{children}</Text>;
}

export function Body({ children, style, muted }) {
  return <Text style={[styles.body, muted && { color: ca.textMuted }, style]}>{children}</Text>;
}

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({ title, onPress, variant = 'primary', loading, disabled, style, accessibilityLabel }) {
  const inactive = disabled || loading;
  const content = loading
    ? <ActivityIndicator color={variant === 'primary' ? ca.onGold : ca.text} />
    : <Text style={[styles.buttonText, variant === 'primary' ? { color: ca.onGold } : { color: ca.text }]}>{title}</Text>;
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel || title}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ hovered, pressed }) => [styles.buttonBase, variant !== 'primary' && styles.buttonOutline, variant === 'ghost' && styles.buttonGhost, hovered && variant !== 'primary' && styles.buttonOutlineHover, (pressed || inactive) && { opacity: inactive ? 0.55 : 0.85 }, style]}
    >
      {variant === 'primary'
        ? <LinearGradient colors={ca.goldGradient} locations={[0, 0.55, 1]} style={styles.buttonGradient}>{content}</LinearGradient>
        : <View style={styles.buttonInner}>{content}</View>}
    </Pressable>
  );
}

export function LinkText({ children, onPress, style }) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} style={({ hovered }) => [hovered && { opacity: 0.8 }]}>
      <Text style={[styles.link, style]}>{children}</Text>
    </Pressable>
  );
}

export function Field({ label, value, onChangeText, error, hint, secure, autoComplete, keyboardType, placeholder, autoCapitalize = 'none', maxLength, onSubmitEditing, inputMode, testID, multiline, numberOfLines }) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, focused && styles.inputFocused, !!error && styles.inputError]}>
        <TextInput
          accessibilityLabel={label}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          autoCorrect={false}
          inputMode={inputMode}
          keyboardType={keyboardType}
          maxLength={maxLength}
          multiline={multiline}
          numberOfLines={numberOfLines}
          onBlur={() => setFocused(false)}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onSubmitEditing={onSubmitEditing}
          placeholder={placeholder}
          placeholderTextColor={ca.textMuted}
          secureTextEntry={secure && !visible}
          style={[styles.input, multiline && { minHeight: 110, textAlignVertical: 'top' }]}
          testID={testID}
          value={value}
        />
        {secure ? (
          <Pressable accessibilityLabel={visible ? 'Ocultar senha' : 'Mostrar senha'} accessibilityRole="button" onPress={() => setVisible((v) => !v)} style={styles.toggle}>
            <Text style={styles.toggleText}>{visible ? 'Ocultar' : 'Mostrar'}</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? <Text accessibilityLiveRegion="polite" style={styles.fieldError}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const NOTICE = {
  info: { bg: ca.infoBg, border: ca.borderStrong, color: ca.textSoft },
  success: { bg: ca.successBg, border: 'rgba(127, 184, 143, 0.35)', color: ca.success },
  error: { bg: ca.dangerBg, border: 'rgba(224, 138, 128, 0.35)', color: ca.danger },
  warning: { bg: ca.warningBg, border: 'rgba(197, 164, 108, 0.35)', color: ca.goldLight },
};

export function Notice({ kind = 'info', title, children, style }) {
  const t = NOTICE[kind];
  return (
    <View accessibilityLiveRegion="polite" accessibilityRole={kind === 'error' ? 'alert' : undefined} style={[styles.notice, { backgroundColor: t.bg, borderColor: t.border }, style]}>
      {title ? <Text style={[styles.noticeTitle, { color: t.color }]}>{title}</Text> : null}
      {children ? <Text style={styles.noticeText}>{children}</Text> : null}
    </View>
  );
}

export function StatusPill({ tone = 'neutral', label }) {
  const tones = { neutral: [ca.infoBg, ca.textSoft], success: [ca.successBg, ca.success], warning: [ca.warningBg, ca.goldLight], danger: [ca.dangerBg, ca.danger] };
  const [bg, color] = tones[tone] || tones.neutral;
  return <View style={[styles.pill, { backgroundColor: bg }]}><Text style={[styles.pillText, { color }]}>{label}</Text></View>;
}

export function DataRow({ label, value, last }) {
  return (
    <View style={[styles.dataRow, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text selectable style={styles.dataValue}>{value}</Text>
    </View>
  );
}

// Página rolável com o fundo grafite (o reset do react-native-web trava a
// rolagem do <body>, então cada página rola dentro de um ScrollView).
export function Page({ children, contentStyle }) {
  return (
    <ScrollView contentContainerStyle={[styles.pageContent, contentStyle]} keyboardShouldPersistTaps="handled" style={styles.page}>
      {children}
    </ScrollView>
  );
}

export function LoadingBlock({ label = 'Carregando…' }) {
  return (
    <View accessibilityLabel={label} style={styles.loading}>
      <ActivityIndicator color={ca.gold} />
      <Text style={[styles.body, { color: ca.textMuted, marginTop: 12 }]}>{label}</Text>
    </View>
  );
}

const webOnly = (style) => (Platform.OS === 'web' ? style : {});

const styles = StyleSheet.create({
  brand: { alignItems: 'center', flexDirection: 'row', gap: 14 },
  brandDivider: { backgroundColor: 'rgba(244, 244, 242, 0.3)', width: 1 },
  eyebrow: { color: ca.goldLight, fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 1.9, textTransform: 'uppercase' },
  goldTitle: { color: ca.goldTitle, fontFamily: fonts.serif, letterSpacing: -0.2, lineHeight: undefined },
  h1: { color: ca.text, fontFamily: fonts.semibold, fontSize: 26, letterSpacing: -0.3 },
  h2: { color: ca.text, fontFamily: fonts.semibold, fontSize: 18 },
  body: { color: ca.textSoft, fontFamily: fonts.regular, fontSize: 15, lineHeight: 23 },
  card: { backgroundColor: ca.bgRaised, borderColor: ca.border, borderRadius: 18, borderWidth: 1, padding: 24 },
  buttonBase: { borderRadius: 999, minHeight: 50, overflow: 'hidden', ...webOnly({ cursor: 'pointer' }) },
  buttonGradient: { alignItems: 'center', borderRadius: 999, justifyContent: 'center', minHeight: 50, paddingHorizontal: 26 },
  buttonInner: { alignItems: 'center', justifyContent: 'center', minHeight: 48, paddingHorizontal: 26 },
  buttonOutline: { borderColor: 'rgba(217, 191, 142, 0.7)', borderWidth: 1 },
  buttonGhost: { borderColor: 'rgba(191, 194, 199, 0.35)' },
  buttonOutlineHover: { backgroundColor: 'rgba(197, 164, 108, 0.08)' },
  buttonText: { fontFamily: fonts.semibold, fontSize: 15, letterSpacing: 0.2 },
  link: { color: ca.goldLight, fontFamily: fonts.medium, fontSize: 14, ...webOnly({ cursor: 'pointer' }) },
  field: { marginBottom: 18 },
  label: { color: ca.textSoft, fontFamily: fonts.medium, fontSize: 13, marginBottom: 8 },
  inputWrap: { alignItems: 'center', backgroundColor: ca.bg, borderColor: ca.borderStrong, borderRadius: 12, borderWidth: 1, flexDirection: 'row', minHeight: 50 },
  inputFocused: { borderColor: ca.goldLight },
  inputError: { borderColor: ca.danger },
  input: { color: ca.text, flex: 1, fontFamily: fonts.regular, fontSize: 15, paddingHorizontal: 16, paddingVertical: 13, ...webOnly({ outlineStyle: 'none' }) },
  toggle: { paddingHorizontal: 14, paddingVertical: 10, ...webOnly({ cursor: 'pointer' }) },
  toggleText: { color: ca.goldLight, fontFamily: fonts.medium, fontSize: 13 },
  fieldError: { color: ca.danger, fontFamily: fonts.regular, fontSize: 13, marginTop: 6 },
  hint: { color: ca.textMuted, fontFamily: fonts.regular, fontSize: 13, marginTop: 6 },
  notice: { borderRadius: 12, borderWidth: 1, gap: 4, marginBottom: 18, paddingHorizontal: 16, paddingVertical: 12 },
  noticeTitle: { fontFamily: fonts.semibold, fontSize: 14 },
  noticeText: { color: ca.textSoft, fontFamily: fonts.regular, fontSize: 14, lineHeight: 21 },
  pill: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  pillText: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0.3 },
  dataRow: { borderBottomColor: ca.border, borderBottomWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', paddingVertical: 14 },
  dataLabel: { color: ca.textMuted, fontFamily: fonts.regular, fontSize: 14 },
  dataValue: { color: ca.text, fontFamily: fonts.medium, fontSize: 14, textAlign: 'right' },
  page: { backgroundColor: ca.bg, flex: 1 },
  pageContent: { flexGrow: 1 },
  loading: { alignItems: 'center', backgroundColor: ca.bg, flex: 1, justifyContent: 'center', padding: 40 },
});

// Escolha entre opções (substitui um <select>): botões em forma de pílula.
export function ChoiceGroup({ label, options, value, onChange, error }) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={styles.label}>{label}</Text>
      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              key={String(o.value)}
              onPress={() => onChange(o.value)}
              style={({ hovered }) => [choiceStyles.choice, selected && choiceStyles.selected, hovered && !selected && { borderColor: ca.textMuted }]}
            >
              <Text style={[choiceStyles.text, selected && { color: ca.goldLight }]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

// Seletor de arquivo. No navegador usa o <input type="file"> nativo (abre a
// câmera no celular). Fora do navegador, orienta a usar o site.
export function FilePicker({ accept, onFile, disabled, label = 'Escolher arquivo' }) {
  const inputRef = React.useRef(null);
  if (Platform.OS !== 'web') return <Text style={styles.hint}>Envie este arquivo pelo site da Área do Cliente.</Text>;
  return (
    <View>
      {React.createElement('input', {
        ref: inputRef,
        type: 'file',
        accept,
        style: { display: 'none' },
        onChange: (e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) onFile(f); },
        'aria-hidden': true,
        tabIndex: -1,
      })}
      <Button disabled={disabled} onPress={() => inputRef.current && inputRef.current.click()} style={{ alignSelf: 'flex-start', minWidth: 200 }} title={label} variant="outline" />
    </View>
  );
}

const choiceStyles = StyleSheet.create({
  choice: { borderColor: ca.borderStrong, borderRadius: 999, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10, ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}) },
  selected: { backgroundColor: 'rgba(197, 164, 108, 0.1)', borderColor: ca.goldLight },
  text: { color: ca.textSoft, fontFamily: fonts.medium, fontSize: 14 },
});

// Selfie tirada NA HORA pela câmera (Fase 4, ajuste): não abre seletor de
// arquivos. Usa getUserMedia (câmera frontal no celular, webcam no
// computador), mostra a prévia e entrega a foto em JPEG. Observação: isto
// impede escolher uma imagem salva pela tela, mas não é "prova de vida"
// (que exige um serviço especializado).
export function CameraCapture({ onPhoto, disabled, label = 'Abrir câmera' }) {
  const videoRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const [state, setState] = useState('idle'); // idle | live | preview
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState('');
  const stop = () => { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; };
  React.useEffect(() => () => { stop(); if (photo?.url) URL.revokeObjectURL(photo.url); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (Platform.OS !== 'web') return <Text style={styles.hint}>Tire a selfie pelo site da Área do Cliente.</Text>;
  const open = async () => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) { setError('Este navegador não permite usar a câmera. Use o celular ou outro navegador.'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
      streamRef.current = stream;
      setState('live');
    } catch {
      setError('Não foi possível abrir a câmera. Permita o acesso à câmera no navegador e tente de novo.');
    }
  };
  const take = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth; canvas.height = v.videoHeight;
    canvas.getContext('2d').drawImage(v, 0, 0);
    canvas.toBlob((blob) => { if (!blob) return; stop(); setPhoto({ blob, url: URL.createObjectURL(blob) }); setState('preview'); }, 'image/jpeg', 0.92);
  };
  const retake = () => { if (photo?.url) URL.revokeObjectURL(photo.url); setPhoto(null); open(); };
  const use = () => { const p = photo; setState('idle'); setPhoto(null); onPhoto(p.blob); setTimeout(() => URL.revokeObjectURL(p.url), 0); };
  const frame = { width: '100%', maxWidth: 360, borderRadius: 12, background: '#0e0f11', display: 'block', marginBottom: 12 };
  return (
    <View style={{ width: '100%', maxWidth: 360 }}>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
      {state === 'live' ? (
        <>
          {React.createElement('video', {
            // Liga a câmera ao elemento assim que ele aparece na tela.
            ref: (el) => { videoRef.current = el; if (el && streamRef.current && el.srcObject !== streamRef.current) { el.srcObject = streamRef.current; el.play().catch(() => {}); } },
            playsInline: true, muted: true, autoPlay: true, style: { ...frame, transform: 'scaleX(-1)' } })}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <Button onPress={take} style={{ minWidth: 160 }} title="Tirar foto" />
            <Button onPress={() => { stop(); setState('idle'); }} style={{ minWidth: 120 }} title="Cancelar" variant="ghost" />
          </View>
        </>
      ) : state === 'preview' && photo ? (
        <>
          {React.createElement('img', { src: photo.url, alt: 'Prévia da selfie', style: frame })}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <Button onPress={use} style={{ minWidth: 160 }} title="Usar esta foto" />
            <Button onPress={retake} style={{ minWidth: 140 }} title="Tirar outra" variant="ghost" />
          </View>
        </>
      ) : (
        <Button disabled={disabled} onPress={open} style={{ alignSelf: 'flex-start', minWidth: 200 }} title={label} variant="outline" />
      )}
    </View>
  );
}
