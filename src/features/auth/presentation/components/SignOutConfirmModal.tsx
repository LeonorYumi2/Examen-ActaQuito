import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
  ZoomOut,
  ReduceMotion,
} from 'react-native-reanimated';
import { LogOut, AlertTriangle } from 'lucide-react-native';
import {
  BrandColors,
  Elevations,
  FontFamilies,
  Radii,
  Spacing,
} from '@/constants/tokens';

export interface SignOutConfirmModalProps {
  visible: boolean;
  busy?: boolean;
  hasPendingActas?: boolean;
  pendingCount?: number;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * SignOutConfirmModal — CONFIRMACIÓN DE CIERRE DE SESIÓN EDITORIAL PREMIUM
 *
 * Características de diseño:
 * - Modal centrado con esquinas redondeadas elegantes (Radii.lg = 18dp).
 * - Fondo blanco cálido sobre overlay oscuro semitransparente con desenfoque tonal.
 * - Icono LogOut oficial de lucide-react-native en contenedor circular cívico.
 * - Título: "¿Deseas cerrar sesión?" en Plus Jakarta Sans Bold.
 * - Descripción institucional en Nunito Sans.
 * - Advertencia condicional de actas pendientes (RF-14, RNF-06) sin borrar datos offline.
 * - Botón secundario "Cancelar" y botón principal "Cerrar sesión" con feedback visual.
 * - Protección contra pulsaciones repetidas mientras busy = true.
 * - Animación sutil con Reanimated respetando ReduceMotion.System.
 * - Accesibilidad para lectores de pantalla y soporte nativo de botón Atrás en Android.
 */
export const SignOutConfirmModal: React.FC<SignOutConfirmModalProps> = ({
  visible,
  busy = false,
  hasPendingActas = false,
  pendingCount = 0,
  onCancel,
  onConfirm,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => {
        if (!busy) onCancel();
      }}
    >
      <View style={styles.overlay}>
        {/* Backdrop semitransparente táctil */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => {
            if (!busy) onCancel();
          }}
          accessibilityRole="button"
          accessibilityLabel="Cancelar y volver"
        />

        {/* Contenedor del Diálogo Animado */}
        <Animated.View
          entering={ZoomIn.duration(200).reduceMotion(ReduceMotion.System)}
          exiting={ZoomOut.duration(160).reduceMotion(ReduceMotion.System)}
          style={styles.dialogCard}
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
        >
          {/* Icono Cívico de Cierre */}
          <View style={[styles.iconCircle, hasPendingActas && styles.iconCircleWarning]}>
            {hasPendingActas ? (
              <AlertTriangle size={26} color={BrandColors.rojoAlerta} strokeWidth={2.2} />
            ) : (
              <LogOut size={26} color={BrandColors.azulTitulos} strokeWidth={2.2} />
            )}
          </View>

          {/* Título */}
          <Text style={styles.titleText}>¿Deseas cerrar sesión?</Text>

          {/* Advertencia si hay actas pendientes sin sincronizar */}
          {hasPendingActas && (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                Tienes {pendingCount > 0 ? `${pendingCount} ` : ''}
                actas pendientes de sincronizar en este dispositivo.
                Se conservarán cifradas localmente, pero no se enviarán al centro de cómputo hasta que vuelvas a ingresar con conexión.
              </Text>
            </View>
          )}

          {/* Descripción */}
          <Text style={styles.descriptionText}>
            Saldrás de tu cuenta de ActaQuito. Podrás ingresar nuevamente con tu correo y contraseña.
          </Text>

          {/* Botonera de Acción */}
          <View style={styles.buttonRow}>
            {/* Botón Secundario: Cancelar */}
            <Pressable
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.buttonPressed,
                busy && styles.buttonDisabled,
              ]}
              disabled={busy}
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel="Cancelar cierre de sesión"
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>

            {/* Botón Principal: Cerrar sesión */}
            <Pressable
              style={({ pressed }) => [
                styles.confirmButton,
                pressed && styles.buttonPressed,
                busy && styles.confirmButtonBusy,
              ]}
              disabled={busy}
              onPress={onConfirm}
              accessibilityRole="button"
              accessibilityLabel="Confirmar y cerrar sesión"
            >
              {busy ? (
                <View style={styles.busyContainer}>
                  <ActivityIndicator size="small" color={BrandColors.blancoSuperficie} />
                  <Text style={styles.confirmButtonText}>Cerrando…</Text>
                </View>
              ) : (
                <Text style={styles.confirmButtonText}>Cerrar sesión</Text>
              )}
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 42, 61, 0.65)', // Azul noche profundo semitransparente
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: BrandColors.blancoSuperficie,
    borderRadius: Radii.lg,
    borderWidth: 1.2,
    borderColor: BrandColors.azulBorde,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 22,
    alignItems: 'center',
    ...Elevations.floatingBar,
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: BrandColors.azulSuperficie,
    borderWidth: 1.2,
    borderColor: BrandColors.azulBorde,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...Elevations.subtle,
  },
  iconCircleWarning: {
    backgroundColor: BrandColors.rojoAlertaLight,
    borderColor: BrandColors.rojoAlertaBorder,
  },
  titleText: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 20,
    color: BrandColors.azulTitulos,
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  warningBox: {
    backgroundColor: BrandColors.rojoAlertaLight,
    borderWidth: 1,
    borderColor: BrandColors.rojoAlertaBorder,
    borderRadius: Radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    width: '100%',
  },
  warningText: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 12.5,
    color: BrandColors.rojoAlerta,
    lineHeight: 17,
    textAlign: 'center',
  },
  descriptionText: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 14,
    color: BrandColors.textoSecundario,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: Radii.md,
    borderWidth: 1.4,
    borderColor: BrandColors.azulBorde,
    backgroundColor: BrandColors.fondoMarfil,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  cancelButtonText: {
    fontFamily: FontFamilies.bodySemiBold,
    fontSize: 14.5,
    color: BrandColors.azulTitulos,
  },
  confirmButton: {
    flex: 1.2,
    minHeight: 48,
    borderRadius: Radii.md,
    backgroundColor: BrandColors.azulTitulos,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
    ...Elevations.subtle,
  },
  confirmButtonBusy: {
    opacity: 0.85,
  },
  confirmButtonText: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 14.5,
    color: BrandColors.blancoSuperficie,
    letterSpacing: 0.2,
  },
  busyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonPressed: {
    opacity: 0.78,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
