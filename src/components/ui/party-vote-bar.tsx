import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BrandColors, Radii, Spacing } from '@/constants/tokens';

export interface PartyVoteBarProps {
  code: string;
  name: string;
  candidate: string;
  color: string;
  votes: number;
  percentage: number;
  totalValidVotes?: number;
}

/**
 * PartyVoteBar
 *
 * Barra de progreso para resultados preliminares (RF-16, S-02, S-06).
 * Mantiene intactos los colores de las 5 organizaciones políticas.
 * Tipografía refinada con texto elegante #1F2A3A y azul principal #2F4C7E.
 */
export const PartyVoteBar: React.FC<PartyVoteBarProps> = ({
  code,
  candidate,
  color,
  votes,
  percentage,
}) => {
  const clampedPercent = Math.min(Math.max(percentage, 0), 100);

  return (
    <View style={styles.container}>
      {/* Fila de encabezado del candidato */}
      <View style={styles.headerRow}>
        <View style={styles.partyBadgeContainer}>
          <View style={[styles.colorIndicator, { backgroundColor: color }]} />
          <Text style={styles.partyCode}>{code}</Text>
          <Text style={styles.candidateName} numberOfLines={1}>
            {candidate}
          </Text>
        </View>

        <View style={styles.numbersContainer}>
          <Text style={styles.percentageText}>{clampedPercent.toFixed(1)}%</Text>
          <Text style={styles.votesText}>({votes.toLocaleString()} votos)</Text>
        </View>
      </View>

      {/* Barra de progreso */}
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              backgroundColor: color,
              width: `${clampedPercent}%`,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  partyBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.xs,
  },
  colorIndicator: {
    width: 10,
    height: 10,
    borderRadius: Radii.xs,
    marginRight: 6,
  },
  partyCode: {
    fontSize: 12,
    fontWeight: '800',
    color: BrandColors.azulPrincipal,
    marginRight: 6,
  },
  candidateName: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.textPrimary,
    flexShrink: 1,
  },
  numbersContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '800',
    color: BrandColors.azulPrincipal,
    marginRight: 4,
  },
  votesText: {
    fontSize: 11,
    color: BrandColors.textSecondary,
  },
  track: {
    height: 8,
    borderRadius: Radii.full,
    backgroundColor: BrandColors.blancoCalidoSubtle,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radii.full,
  },
});
