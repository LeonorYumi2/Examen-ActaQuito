import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { LogOut, Wifi, WifiOff } from 'lucide-react-native';
import { BrandColors, Elevations, Radii, Spacing, FontFamilies } from '@/constants/tokens';
import { QuitoCivicIsotype } from './quito-civic-isotype';
import { SignOutConfirmModal } from '@/features/auth/presentation/components/SignOutConfirmModal';
import { useAuth } from '@/features/auth/presentation/auth-state';
import { authMessage, type Role } from '@/features/auth/domain/auth';

export interface InstitutionalHeaderProps {
  role: Role;
  roleLabel?: string;
  userName?: string;
  isOffline?: boolean;
}

const roleTitles: Record<Role, string> = {
  provincial: 'COORDINACIÓN PROVINCIAL',
  recinto: 'COORDINACIÓN DE RECINTO',
  veedor: 'VEEDURÍA ELECTORAL',
};

export const InstitutionalHeader: React.FC<InstitutionalHeaderProps> = ({
  role,
  roleLabel,
  userName,
  isOffline = false,
}) => {
  const signOut = useAuth((state) => state.signOut);
  const [modalVisible, setModalVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const title = roleLabel ?? roleTitles[role];

  async function handleConfirmSignOut() {
    setBusy(true);
    setError(undefined);
    try {
      await signOut();
      setModalVisible(false);
      router.replace('/auth/login');
    } catch (issue) {
      setError(authMessage(issue));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Top Banner Row */}
      <View style={styles.topRow}>
        <View style={styles.brandRow}>
          <QuitoCivicIsotype size={40} />
          <View style={styles.brandTextGroup}>
            <Text style={styles.systemTitle}>SISTEMA DE CONTROL ELECTORAL</Text>
            <Text style={styles.jurisdictionTitle}>CANTÓN QUITO · PICHINCHA</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
          accessibilityLabel="Cerrar sesión"
        >
          <LogOut size={18} color={BrandColors.azulTitulos} />
        </TouchableOpacity>
      </View>

      {/* Decorative Red Accent Line */}
      <View style={styles.civicLineContainer}>
        <View style={styles.civicLineRed} />
        <View style={styles.civicLineNeutral} />
      </View>

      {/* Profile & Status Row */}
      <View style={styles.bottomRow}>
        <View style={styles.profileGroup}>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{title}</Text>
          </View>
          {userName ? (
            <Text style={styles.userNameText} numberOfLines={1}>
              {userName}
            </Text>
          ) : null}
        </View>

        <View
          style={[
            styles.statusPill,
            isOffline ? styles.statusPillOffline : styles.statusPillOnline,
          ]}
        >
          {isOffline ? (
            <>
              <WifiOff size={12} color={BrandColors.rojoAlerta} style={styles.statusIcon} />
              <Text style={styles.statusTextOffline}>Desconectado</Text>
            </>
          ) : (
            <>
              <Wifi size={12} color={BrandColors.verdeExito} style={styles.statusIcon} />
              <Text style={styles.statusTextOnline}>En línea</Text>
            </>
          )}
        </View>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <SignOutConfirmModal
        visible={modalVisible}
        busy={busy}
        onCancel={() => {
          if (!busy) setModalVisible(false);
        }}
        onConfirm={() => {
          void handleConfirmSignOut();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: BrandColors.blancoSuperficie,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.azulBorde,
    ...Elevations.subtle,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  brandTextGroup: {
    flex: 1,
  },
  systemTitle: {
    fontFamily: FontFamilies.titleSemiBold,
    fontSize: 10,
    letterSpacing: 0.8,
    color: BrandColors.textoSecundario,
    textTransform: 'uppercase',
  },
  jurisdictionTitle: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 13,
    letterSpacing: 0.3,
    color: BrandColors.azulTitulos,
    marginTop: 1,
  },
  signOutButton: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    backgroundColor: BrandColors.azulSuperficie,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
  },
  civicLineContainer: {
    flexDirection: 'row',
    height: 2.5,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  civicLineRed: {
    width: 28,
    backgroundColor: BrandColors.rojoQuito,
  },
  civicLineNeutral: {
    flex: 1,
    backgroundColor: BrandColors.azulSuperficie,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  profileGroup: {
    flex: 1,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: BrandColors.azulSuperficie,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    marginBottom: 2,
  },
  roleBadgeText: {
    fontFamily: FontFamilies.titleBold,
    fontSize: 9.5,
    letterSpacing: 0.5,
    color: BrandColors.azulPrincipal,
  },
  userNameText: {
    fontFamily: FontFamilies.bodySemiBold,
    fontSize: 14,
    color: BrandColors.azulTitulos,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  statusPillOnline: {
    backgroundColor: BrandColors.verdeExitoLight,
    borderColor: BrandColors.verdeSobrioBorder,
  },
  statusPillOffline: {
    backgroundColor: BrandColors.rojoAlertaLight,
    borderColor: BrandColors.rojoAlertaBorder,
  },
  statusIcon: {
    marginRight: 4,
  },
  statusTextOnline: {
    fontFamily: FontFamilies.bodySemiBold,
    fontSize: 10.5,
    color: BrandColors.verdeExito,
  },
  statusTextOffline: {
    fontFamily: FontFamilies.bodySemiBold,
    fontSize: 10.5,
    color: BrandColors.rojoAlerta,
  },
  errorText: {
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 12,
    color: BrandColors.rojoAlerta,
    marginTop: Spacing.xs,
  },
});
