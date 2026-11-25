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
import { UserCheck, Mail, Shield, MapPin, Phone, Hash } from 'lucide-react-native';
import {
  BrandColors,
  Elevations,
  FontFamilies,
  Radii,
  Spacing,
} from '@/constants/tokens';

export interface ConfirmarInvitacionModalProps {
  visible: boolean;
  busy?: boolean;
  rolLabel: string;
  datos: {
    cedula: string;
    nombres: string;
    apellidos: string;
    telefono: string;
    correo: string;
    asignacionTexto?: string;
  };
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmarInvitacionModal: React.FC<ConfirmarInvitacionModalProps> = ({
  visible,
  busy = false,
  rolLabel,
  datos,
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
        {/* Backdrop animado con desvanecimiento */}
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={styles.backdrop}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              if (!busy) onCancel();
            }}
          />
        </Animated.View>

        {/* Tarjeta del diálogo centrada */}
        <Animated.View
          entering={ZoomIn.duration(220).reduceMotion(ReduceMotion.System)}
          exiting={ZoomOut.duration(160).reduceMotion(ReduceMotion.System)}
          style={styles.card}
          accessible
          accessibilityViewIsModal
        >
          {/* Icono de cabecera */}
          <View style={styles.iconCircle}>
            <UserCheck size={24} color={BrandColors.azulTitulos} />
          </View>

          {/* Título y Rol */}
          <Text style={styles.title}>¿Confirmar envío de invitación?</Text>
          <View style={styles.roleChip}>
            <Shield size={11} color={BrandColors.azulPrincipal} />
            <Text style={styles.roleChipText}>{rolLabel.toUpperCase()}</Text>
          </View>

          {/* Ficha de datos de la persona */}
          <View style={styles.summaryContainer}>
            <Text style={styles.nameText}>
              {datos.nombres} {datos.apellidos}
            </Text>

            <View style={styles.dataRow}>
              <Hash size={12} color={BrandColors.textoSecundario} />
              <Text style={styles.dataLabel}>Cédula:</Text>
              <Text style={styles.dataValue}>{datos.cedula}</Text>
            </View>

            <View style={styles.dataRow}>
              <Mail size={12} color={BrandColors.textoSecundario} />
              <Text style={styles.dataLabel}>Correo:</Text>
              <Text style={styles.dataValue} numberOfLines={1}>
                {datos.correo}
              </Text>
            </View>

            <View style={styles.dataRow}>
              <Phone size={12} color={BrandColors.textoSecundario} />
              <Text style={styles.dataLabel}>Teléfono:</Text>
              <Text style={styles.dataValue}>{datos.telefono}</Text>
            </View>

            {datos.asignacionTexto ? (
              <View style={[styles.dataRow, styles.dataRowHighlight]}>
                <MapPin size={12} color={BrandColors.azulPrincipal} />
                <Text style={styles.dataLabel}>Asignación:</Text>
                <Text style={styles.dataValueHighlight} numberOfLines={1}>
                  {datos.asignacionTexto}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Nota de seguridad conforme a ADR-02 */}
          <Text style={styles.noticeText}>
            Se enviará un correo con un enlace de activación seguro. El titular definirá su propia
            contraseña en su primer ingreso; nadie más la conocerá.
          </Text>

          {/* Botones de acción */}
          <View style={styles.actionsContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.cancelButtonPressed,
              ]}
              onPress={onCancel}
              disabled={busy}
              accessibilityRole="button"
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.confirmButton,
                pressed && styles.confirmButtonPressed,
                busy && styles.confirmButtonDisabled,
              ]}
              onPress={onConfirm}
              disabled={busy}
              accessibilityRole="button"
            >
              {busy ? (
                <View style={styles.busyRow}>
                  <ActivityIndicator size="small" color={BrandColors.blancoSuperficie} />
                  <Text style={styles.confirmButtonText}>Enviando…</Text>
                </View>
              ) : (
                <Text style={styles.confirmButtonText}>Enviar invitación</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(37, 61, 89, 0.55)',
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: BrandColors.blancoSuperficie,
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    ...Elevations.hero,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: BrandColors.azulSuperficie,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
  },
  title: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 16,
    color: BrandColors.azulTitulos,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BrandColors.azulSuperficie,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.sm,
    marginTop: 6,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
  },
  roleChipText: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 10,
    color: BrandColors.azulPrincipal,
    letterSpacing: 0.5,
  },
  summaryContainer: {
    width: '100%',
    backgroundColor: BrandColors.superficieCalida,
    borderRadius: Radii.md,
    padding: Spacing.sm + 2,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    marginBottom: Spacing.sm,
    gap: 4,
  },
  nameText: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 14,
    color: BrandColors.azulTitulos,
    marginBottom: 4,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dataRowHighlight: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: BrandColors.azulBorde,
  },
  dataLabel: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 11.5,
    color: BrandColors.textoSecundario,
  },
  dataValue: {
    fontFamily: FontFamilies.bodySemiBold,
    fontSize: 11.5,
    color: BrandColors.textoPrincipal,
    flex: 1,
  },
  dataValueHighlight: {
    fontFamily: FontFamilies.titleSemiBold,
    fontSize: 11.5,
    color: BrandColors.azulPrincipal,
    flex: 1,
  },
  noticeText: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 11,
    color: BrandColors.textoSecundario,
    textAlign: 'center',
    lineHeight: 15,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.xs,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    height: 42,
    borderRadius: Radii.md,
    backgroundColor: BrandColors.azulSuperficie,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
  },
  cancelButtonPressed: {
    backgroundColor: BrandColors.superficieCalida,
  },
  cancelButtonText: {
    fontFamily: FontFamilies.titleSemiBold,
    fontSize: 13,
    color: BrandColors.azulTitulos,
  },
  confirmButton: {
    flex: 1.3,
    height: 42,
    borderRadius: Radii.md,
    backgroundColor: BrandColors.azulTitulos,
    alignItems: 'center',
    justifyContent: 'center',
    ...Elevations.subtle,
  },
  confirmButtonPressed: {
    opacity: 0.85,
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 13,
    color: BrandColors.blancoSuperficie,
  },
  busyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
