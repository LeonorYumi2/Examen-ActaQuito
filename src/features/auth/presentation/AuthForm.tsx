import { useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Eye, EyeOff } from 'lucide-react-native';
import { QuitoSkylineIllustration } from '@/components/ui/quito-skyline-illustration';
import { QuitoCivicIsotype } from '@/components/ui/quito-civic-isotype';
import { VectorIcon } from '@/components/ui/vector-icon';
import { EditorialLottie } from '@/components/ui/editorial-lottie';
import {
  BrandColors,
  Elevations,
  FontFamilies,
  Radii,
  Spacing,
} from '@/constants/tokens';
import { AuthPending } from './AuthPending';

/**
 * AuthPanel — COMPOSICIÓN EDITORIAL PREMIUM ABIERTA
 *
 * Características visuales adaptadas a Android real:
 * - Composición abierta directamente sobre el fondo marfil (#F7F4EF), sin tarjeta encapsulada.
 * - Encabezado cívico amplio con monograma "Q" de 48dp y acento Quito.
 * - Ilustración arquitectónica vectorial (Pichincha, Basílica, San Francisco, Panecillo)
 *   renderizada en SVG con 74dp de altura, contraste nítido y presencia protagonista.
 * - Título "Inicia sesión" en Plus Jakarta Sans (28sp) con filete rojo cívico y bajada editorial.
 * - Campos con alto contraste (fondo blanco puro sobre marfil, bordes suaves de 1.4px y foco firme en #253D59).
 * - Iconos oficiales Eye y EyeOff de Lucide integrados con área táctil de 48dp.
 * - Botón "Ingresar" protagonista con elevación sombreada y enlace secundario discreto.
 * - Distribución vertical balanceada (flexGrow: 1 con separación calibrada) que aprovecha la pantalla
 *   sin dejar vacíos desproporcionados ni amontonar elementos.
 */
export function AuthPanel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={BrandColors.fondoMarfil} />
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 16) + Spacing.md },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* BLOQUE EDITORIAL UNIFICADO Y CENTRADO: MARCA + SKYLINE + FORMULARIO + PIE */}
          <View style={styles.mainContent}>
            {/* 1. Encabezado de Marca Amplio */}
            <View style={styles.brandSection}>
              <View style={styles.brandRow}>
                {/* Isotipo Cívico Abstracto de Quito (Opción 3) */}
                <QuitoCivicIsotype size={48} />

                <View style={styles.brandTextGroup}>
                  <Text style={styles.brandTitle}>ActaQuito</Text>
                  <Text style={styles.brandSubtitle}>
                    CONTROL ELECTORAL PARTIDARIO · PICHINCHA
                  </Text>
                </View>
              </View>

              {/* 2. Arte Lineal Arquitectónico Quiteño Protagonista (SVG Nítido) */}
              <View style={styles.skylineWrapper}>
                <QuitoSkylineIllustration
                  height={74}
                  opacity={0.78}
                  color={BrandColors.azulPrincipal}
                />
              </View>
            </View>

            {/* 3. Título Editorial y Contexto */}
            <View style={styles.headingSection}>
              <Text accessibilityRole="header" style={styles.pageTitle}>
                {title}
              </Text>
              <View style={styles.accentRule} />
              <Text style={styles.pageDescription}>{description}</Text>
            </View>

            {/* 4. Formulario Integrado Directamente sobre Fondo Marfil */}
            <View style={styles.formContainer}>{children}</View>

            {/* 5. Pie Cívico Integrado de Cierre (vinculado al formulario con margen controlado) */}
            <View style={styles.footerSection}>
              <View style={styles.footerDivider} />
              <Text style={[styles.footerText, styles.wrapText]}>
                SISTEMA DE CONTROL ELECTORAL · CANTÓN QUITO
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/**
 * AuthMessage
 *
 * Alertas contextuales con iconos vectoriales y contraste WCAG AAA.
 */
export function AuthMessage({
  message,
  success = false,
}: {
  message?: string | null;
  success?: boolean;
}) {
  if (!message) return null;
  return (
    <Animated.View entering={FadeIn.duration(160).reduceMotion(ReduceMotion.System)}>
      <View style={[styles.messageBox, success ? styles.messageSuccess : styles.messageError]}>
        <EditorialLottie
          type={success ? 'exito' : 'error'}
          size={18}
          loop={false}
          accessibilityLabel={success ? 'Éxito' : 'Alerta'}
          style={styles.messageIcon}
        />
        <Text
          accessibilityRole={success ? 'text' : 'alert'}
          accessibilityLiveRegion="polite"
          style={[styles.messageText, success ? styles.messageTextSuccess : styles.messageTextError]}
        >
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

/**
 * AuthButton
 *
 * Jerarquía visual nítida:
 * - Principal ("Ingresar"): Botón protagonista en Azul Títulos (#253D59) con sombra multicapa.
 * - Secundario ("Olvidé mi contraseña"): Acción discreta tipo texto sin competir visualmente.
 */
export function AuthButton({
  label,
  busy,
  secondary,
  wrapLabel,
  disabled,
  onPress,
}: {
  label: string;
  busy?: boolean;
  secondary?: boolean;
  wrapLabel?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const locked = Boolean(busy || disabled);

  if (secondary) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: locked, busy }}
        disabled={locked}
        onPress={onPress}
        style={({ pressed }) => [
          styles.secondaryButton,
          (pressed || locked) && styles.secondaryMuted,
        ]}
      >
        <Text style={[styles.secondaryButtonText, wrapLabel && styles.wrapText]}>{label}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: locked, busy }}
      disabled={locked}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        (pressed || locked) && styles.primaryMuted,
      ]}
    >
      {busy && <AuthPending onDark />}
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

/**
 * AuthField
 *
 * Campo refinado integrado directamente sobre el fondo marfil:
 * - Contenedor blanco nítido (#FFFFFF) con alto contraste sobre fondo marfil (#F7F4EF).
 * - Altura accesible (54dp).
 * - Estados de foco elegantes (borde #253D59 de 2px).
 * - Iconos oficiales Eye y EyeOff de Lucide con trazado vectorial de 22dp y área táctil de 48dp.
 */
export function AuthField({
  label,
  error,
  password,
  ...input
}: TextInputProps & {
  label: string;
  error?: string;
  password?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputContainerFocused,
          Boolean(error) && styles.inputContainerError,
        ]}
      >
        <TextInput
          {...input}
          accessibilityLabel={label}
          accessibilityHint={error}
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor={BrandColors.textoMuted}
          secureTextEntry={Boolean(password && !visible)}
          onFocus={(e) => {
            setIsFocused(true);
            input.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            input.onBlur?.(e);
          }}
          style={styles.textInput}
        />
        {password && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            disabled={input.editable === false}
            style={styles.eyeButton}
            onPress={() => setVisible(!visible)}
            hitSlop={8}
          >
            {visible ? (
              <EyeOff size={22} color={BrandColors.azulPrincipal} strokeWidth={2} />
            ) : (
              <Eye size={22} color={BrandColors.azulPrincipal} strokeWidth={2} />
            )}
          </Pressable>
        )}
      </View>
      {error && (
        <Text accessibilityLiveRegion="polite" style={styles.fieldError}>
          {error}
        </Text>
      )}
    </View>
  );
}

/**
 * AuthProgress
 */
export function AuthProgress({ text }: { text: string }) {
  return (
    <View style={styles.progressRow} accessibilityLiveRegion="polite">
      <AuthPending />
      <Text style={styles.progressText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BrandColors.fondoMarfil,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: Spacing.lg,
  },
  mainContent: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },

  // 1. Encabezado de Marca
  brandSection: {
    marginBottom: Spacing.xs,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  monogram: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: BrandColors.azulSuperficie,
    borderWidth: 1.2,
    borderColor: BrandColors.azulBorde,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...Elevations.subtle,
  },
  monogramLetter: {
    fontSize: 26,
    fontFamily: FontFamilies.titleBold,
    color: BrandColors.azulTitulos,
    lineHeight: 30,
  },
  monogramAccent: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BrandColors.rojoQuito,
  },
  brandTextGroup: {
    flex: 1,
  },
  brandTitle: {
    fontSize: 24,
    fontFamily: FontFamilies.titleBold,
    color: BrandColors.azulTitulos,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 9.5,
    fontFamily: FontFamilies.bodyBold,
    color: BrandColors.textoSecundario,
    letterSpacing: 0.8,
    marginTop: 1,
  },
  skylineWrapper: {
    marginTop: 10,
    marginBottom: 6,
  },

  // 2. Título de Pantalla y Bajada
  headingSection: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  pageTitle: {
    fontSize: 28,
    fontFamily: FontFamilies.titleBold,
    color: BrandColors.azulTitulos,
    letterSpacing: -0.6,
  },
  accentRule: {
    width: 34,
    height: 3.5,
    backgroundColor: BrandColors.rojoQuito,
    borderRadius: 2,
    marginTop: 6,
    marginBottom: 8,
  },
  pageDescription: {
    fontSize: 14,
    fontFamily: FontFamilies.bodyRegular,
    color: BrandColors.textoSecundario,
    lineHeight: 21,
  },

  // 3. Formulario Directo en Lienzo
  formContainer: {
    gap: 16,
  },

  // 4. Campos de Entrada
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontFamily: FontFamilies.bodySemiBold,
    fontSize: 14,
    color: BrandColors.azulTitulos,
    letterSpacing: 0.1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 54,
    borderWidth: 1.4,
    borderColor: BrandColors.azulBorde,
    borderRadius: Radii.md,
    backgroundColor: BrandColors.blancoSuperficie,
    paddingHorizontal: Spacing.md,
    ...Elevations.subtle,
  },
  inputContainerFocused: {
    borderColor: BrandColors.azulTitulos,
    borderWidth: 2,
    backgroundColor: BrandColors.blancoSuperficie,
  },
  inputContainerError: {
    borderColor: BrandColors.rojoAlerta,
    backgroundColor: BrandColors.rojoAlertaLight,
  },
  textInput: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 15.5,
    fontFamily: FontFamilies.bodyRegular,
    color: BrandColors.textoPrincipal,
  },
  eyeButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  fieldError: {
    fontSize: 12,
    fontFamily: FontFamilies.bodyRegular,
    color: BrandColors.rojoAlerta,
    marginTop: 2,
    paddingLeft: 2,
  },

  // 5. Botones
  primaryButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    backgroundColor: BrandColors.azulTitulos,
    borderRadius: Radii.md,
    marginTop: 6,
    ...Elevations.card,
  },
  primaryMuted: {
    opacity: 0.78,
  },
  primaryButtonText: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 16,
    color: BrandColors.blancoSuperficie,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  secondaryButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    marginTop: -2,
  },
  secondaryMuted: {
    opacity: 0.6,
  },
  secondaryButtonText: {
    fontFamily: FontFamilies.bodySemiBold,
    fontSize: 14,
    color: BrandColors.azulPrincipal,
    textAlign: 'center',
    letterSpacing: 0.1,
  },

  // 6. Mensajes y Alertas
  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  messageIcon: {
    marginRight: 8,
  },
  messageText: {
    flex: 1,
    fontSize: 13,
    fontFamily: FontFamilies.bodyRegular,
    lineHeight: 18,
  },
  messageError: {
    backgroundColor: BrandColors.rojoAlertaLight,
    borderColor: BrandColors.rojoAlertaBorder,
  },
  messageTextError: {
    color: BrandColors.rojoAlerta,
  },
  messageSuccess: {
    backgroundColor: BrandColors.verdeExitoLight,
    borderColor: BrandColors.verdeExitoBorder,
  },
  messageTextSuccess: {
    color: BrandColors.verdeExito,
  },

  // 7. Pie Cívico
  footerSection: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    marginTop: 28,
    paddingTop: Spacing.sm,
    alignItems: 'center',
  },
  footerDivider: {
    width: 48,
    height: 1.5,
    backgroundColor: BrandColors.azulBorde,
    marginBottom: Spacing.xs,
    opacity: 0.7,
  },
  footerText: {
    fontSize: 10,
    fontFamily: FontFamilies.bodyBold,
    color: BrandColors.textoMuted,
    textAlign: 'center',
    letterSpacing: 0.8,
  },
  wrapText: {
    alignSelf: 'stretch',
    flexShrink: 1,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  progressText: {
    fontSize: 14,
    fontFamily: FontFamilies.bodyRegular,
    color: BrandColors.textoSecundario,
  },
});
