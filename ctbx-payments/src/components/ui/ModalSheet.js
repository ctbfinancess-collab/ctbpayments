import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, radii, shadows, spacing, typography } from '../../theme';
import Icon from './Icon';
import IconButton from './IconButton';

// No Web, o `Modal` do React Native "porta" pra fora da árvore normal (perto
// de `document.body`) e ignora a moldura de celular (`WebFrame`, ver
// App.js) — o sheet acaba ocupando a largura inteira do navegador em vez de
// ficar contido no card. Como native-modal só existe de verdade em
// iOS/Android, no Web trocamos por uma `View` absoluta comum: sem portal,
// ela fica dentro da árvore normal e é contida pelo `position: relative` +
// `overflow: hidden` da própria moldura.
const ModalContainer = Platform.OS === 'web'
  ? ({ children, visible }) => (visible ? <View style={styles.webModalRoot}>{children}</View> : null)
  : ({ children, onRequestClose, visible }) => (
    <Modal animationType="slide" onRequestClose={onRequestClose} statusBarTranslucent transparent visible={visible}>
      {children}
    </Modal>
  );

export default function ModalSheet({
  visible,
  onClose,
  title,
  children,
  footer,
  closeContent,
  dismissOnBackdrop = true,
  contentStyle,
  testID,
}) {
  const handleBackdropPress = dismissOnBackdrop ? onClose : undefined;

  return (
    <ModalContainer onRequestClose={onClose} visible={visible}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Pressable accessibilityRole="button" onPress={handleBackdropPress} style={styles.backdrop} />
        <SafeAreaView style={styles.safeArea}>
          <View style={[styles.sheet, contentStyle]} testID={testID}>
            <View style={styles.handle} />
            {(title || onClose) && (
              <View style={styles.header}>
                <View style={styles.headerSpacer} />
                {title ? <Text style={styles.title}>{title}</Text> : <View style={styles.title} />}
                {onClose ? (
                  <IconButton
                    accessibilityLabel="Fechar"
                    onPress={onClose}
                    size={36}
                    variant="ghost"
                  >
                    {closeContent || <Icon color={colors.textPrimary} name="close" size={22} />}
                  </IconButton>
                ) : (
                  <View style={styles.headerSpacer} />
                )}
              </View>
            )}
            <View style={styles.content}>{children}</View>
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ModalContainer>
  );
}

const styles = StyleSheet.create({
  webModalRoot: { ...StyleSheet.absoluteFillObject, zIndex: 1000 },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  safeArea: {
    justifyContent: 'flex-end',
  },
  sheet: {
    ...shadows.modal,
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderSubtle,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    borderWidth: 1,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: colors.borderStrong,
    borderRadius: radii.pill,
    height: 4,
    marginTop: spacing.sm,
    width: 40,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 58,
    paddingHorizontal: spacing.lg,
  },
  headerSpacer: {
    height: 36,
    width: 36,
  },
  title: {
    color: colors.textPrimary,
    flex: 1,
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.fontSize.lg,
    lineHeight: typography.lineHeight.lg,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  footer: {
    borderTopColor: colors.borderSubtle,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
});
