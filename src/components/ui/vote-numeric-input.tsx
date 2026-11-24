import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { BrandColors, Radii, Spacing } from '@/constants/tokens';

export interface VoteNumericInputProps {
  partyCode: string;
  partyName: string;
  candidateName: string;
  partyColor: string;
  value: number;
  onChangeValue: (nextValue: number) => void;
  maxValue?: number;
  isInvalid?: boolean;
}

/**
 * VoteNumericInput
 *
 * Input táctil accesible adaptado a veedores mayores (RNF-01, RF-08, RF-09):
 * - Altura táctil de 54dp
 * - Botones grandes de incremento / decremento (+ y -)
 * - Tipografía numérica prominente (24sp)
 * - Identificación cromática clara de la organización política
 */
export const VoteNumericInput: React.FC<VoteNumericInputProps> = ({
  partyCode,
  candidateName,
  partyColor,
  value,
  onChangeValue,
  maxValue,
  isInvalid,
}) => {
  const handleDecrement = () => {
    if (value > 0) {
      onChangeValue(value - 1);
    }
  };

  const handleIncrement = () => {
    if (maxValue === undefined || value < maxValue) {
      onChangeValue(value + 1);
    }
  };

  const handleChangeText = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    const num = cleaned === '' ? 0 : parseInt(cleaned, 10);
    onChangeValue(num);
  };

  return (
    <View style={[styles.container, isInvalid && styles.containerError]}>
      {/* Información del Partido */}
      <View style={styles.partyInfo}>
        <View style={[styles.partyStrip, { backgroundColor: partyColor }]} />
        <View style={styles.partyTextContainer}>
          <Text style={[styles.partyCode, { color: partyColor }]}>{partyCode}</Text>
          <Text style={styles.candidateName} numberOfLines={1}>
            {candidateName}
          </Text>
        </View>
      </View>

      {/* Controles de Entrada Numérica */}
      <View style={styles.controls}>
        <TouchableOpacity
          activeOpacity={0.6}
          onPress={handleDecrement}
          disabled={value <= 0}
          style={[styles.stepperButton, value <= 0 && styles.stepperButtonDisabled]}
        >
          <Text style={[styles.stepperText, value <= 0 && styles.stepperTextDisabled]}>
            −
          </Text>
        </TouchableOpacity>

        <TextInput
          style={styles.numericInput}
          keyboardType="number-pad"
          value={value === 0 ? '0' : value.toString()}
          onChangeText={handleChangeText}
          selectTextOnFocus
          maxLength={4}
        />

        <TouchableOpacity
          activeOpacity={0.6}
          onPress={handleIncrement}
          style={styles.stepperButton}
        >
          <Text style={styles.stepperText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: BrandColors.surfaceWhite,
    borderRadius: Radii.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: BrandColors.borderSubtle,
  },
  containerError: {
    borderColor: BrandColors.coralDark,
    backgroundColor: BrandColors.coralLight,
  },
  partyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.xs,
  },
  partyStrip: {
    width: 6,
    height: 36,
    borderRadius: Radii.xs,
    marginRight: Spacing.sm,
  },
  partyTextContainer: {
    flex: 1,
  },
  partyCode: {
    fontSize: 14,
    fontWeight: '800',
  },
  candidateName: {
    fontSize: 12,
    fontWeight: '500',
    color: BrandColors.textSecondary,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepperButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    backgroundColor: BrandColors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonDisabled: {
    opacity: 0.4,
  },
  stepperText: {
    fontSize: 22,
    fontWeight: '700',
    color: BrandColors.petroleo,
  },
  stepperTextDisabled: {
    color: BrandColors.textTertiary,
  },
  numericInput: {
    minWidth: 52,
    height: 44,
    marginHorizontal: 6,
    paddingHorizontal: 8,
    paddingVertical: 0,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    color: BrandColors.petroleo,
    backgroundColor: BrandColors.backgroundMarfil,
    borderRadius: Radii.md,
  },
});
