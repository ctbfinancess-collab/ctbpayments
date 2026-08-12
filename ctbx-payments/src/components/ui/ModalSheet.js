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
import IconButton from './IconButton';

export default function ModalSheet({
  visible,
  onClose,
  title,
  children,
  footer,
  closeContent = '×',
  dismissOnBackdrop = true,
  animationType = 'slide',
  contentStyle,
  testID,
}) {
  const handleBackdropPress = dismissOnBackdrop ? onClose : undefined;

  return (
    <Modal
      animationType={animationType}
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
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
                    <Text style={styles.closeText}>{closeContent}</Text>
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
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.fontSize.lg,
    lineHeight: typography.lineHeight.lg,
    textAlign: 'center',
  },
  closeText: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.regular,
    fontSize: 26,
    lineHeight: 28,
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
