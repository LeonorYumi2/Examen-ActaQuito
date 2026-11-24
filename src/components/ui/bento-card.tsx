import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { BrandColors, Radii, Spacing, Elevations } from '@/constants/tokens';
import { VectorIcon, VectorIconName } from './vector-icon';

export interface BentoCardProps {
  title?: string;
  subtitle?: string;
  badgeText?: string;
  badgeVariant?: 'rojo' | 'azul' | 'verde' | 'suave' | 'neutral' | 'carmesi' | 'azafran' | 'francia' | 'turquesa' | 'cielo' | 'celeste' | 'klein' | 'petroleo' | 'coral';
  variant?: 'surface' | 'azul' | 'suave' | 'rojo' | 'cielo' | 'azafran' | 'carmesi' | 'celeste' | 'coral' | 'klein' | 'petroleo';
  asymmetric?: 'none' | 'cardA' | 'cardB' | 'hero';
  iconName?: VectorIconName;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/**
 * BentoCard (Refinamiento Sobrio Quiteño)
 *
 * Contenedor asimétrico Bento UI con principios de Material 3 Expressive.
 * Soporta radios variables, elevación sutil y la nueva paleta Azul Elegante + Rojo Quito.
 */
export const BentoCard: React.FC<BentoCardProps> = ({
  title,
  subtitle,
  badgeText,
  badgeVariant = 'neutral',
  variant = 'surface',
  asymmetric = 'none',
  iconName,
  style,
  children,
}) => {
  const getBackgroundColor = () => {
    switch (variant) {
      case 'suave':
      case 'cielo':
      case 'celeste':
        return BrandColors.azulSuaveLight;
      case 'rojo':
      case 'azafran':
      case 'carmesi':
      case 'coral':
        return BrandColors.rojoQuitoLight;
      case 'azul':
      case 'klein':
      case 'petroleo':
        return BrandColors.azulPrincipal;
      default:
        return BrandColors.blancoCalidoCard;
    }
  };

  const getBorderColor = () => {
    switch (variant) {
      case 'suave':
      case 'cielo':
      case 'celeste':
        return BrandColors.azulSuaveBorder;
      case 'rojo':
      case 'azafran':
      case 'carmesi':
      case 'coral':
        return BrandColors.rojoQuitoBorder;
      case 'azul':
      case 'klein':
      case 'petroleo':
        return BrandColors.azulSecundario;
      default:
        return BrandColors.borderSubtle;
    }
  };

  const getAsymmetricRadius = () => {
    switch (asymmetric) {
      case 'cardA':
        return Radii.asymCardA;
      case 'cardB':
        return Radii.asymCardB;
      case 'hero':
        return Radii.asymHero;
      default:
        return { borderRadius: Radii.xl };
    }
  };

  const isDark = variant === 'azul' || variant === 'klein' || variant === 'petroleo';

  return (
    <View
      style={[
        styles.card,
        getAsymmetricRadius(),
        isDark ? Elevations.hero : Elevations.card,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
        },
        style,
      ]}
    >
      {(title || badgeText || iconName) && (
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            {iconName && (
              <View style={[styles.iconWrapper, isDark && styles.iconWrapperDark]}>
                <VectorIcon
                  name={iconName}
                  size={16}
                  color={isDark ? BrandColors.blancoCalido : BrandColors.azulPrincipal}
                />
              </View>
            )}
            <View style={{ flex: 1 }}>
              {title && (
                <Text
                  style={[
                    styles.title,
                    { color: isDark ? BrandColors.blancoCalido : BrandColors.textPrimary },
                  ]}
                >
                  {title}
                </Text>
              )}
              {subtitle && (
                <Text
                  style={[
                    styles.subtitle,
                    { color: isDark ? BrandColors.azulSuave : BrandColors.textSecondary },
                  ]}
                >
                  {subtitle}
                </Text>
              )}
            </View>
          </View>

          {badgeText && (
            <View style={[styles.badge, getBadgeStyle(badgeVariant)]}>
              <Text style={[styles.badgeText, getBadgeTextStyle(badgeVariant)]}>
                {badgeText}
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.content}>{children}</View>
    </View>
  );
};

const getBadgeStyle = (variant: BentoCardProps['badgeVariant']) => {
  switch (variant) {
    case 'rojo':
    case 'carmesi':
    case 'coral':
      return { backgroundColor: BrandColors.rojoQuitoLight, borderColor: BrandColors.rojoQuitoBorder, borderWidth: 1 };
    case 'azafran':
      return { backgroundColor: BrandColors.rojoQuitoLight, borderColor: BrandColors.rojoQuitoBorder, borderWidth: 1 };
    case 'verde':
      return { backgroundColor: BrandColors.verdeSobrioLight, borderColor: BrandColors.verdeSobrioBorder, borderWidth: 1 };
    case 'azul':
    case 'francia':
    case 'turquesa':
      return { backgroundColor: BrandColors.azulSuave, borderColor: BrandColors.azulSuaveBorder, borderWidth: 1 };
    case 'suave':
    case 'cielo':
    case 'celeste':
      return { backgroundColor: BrandColors.azulSuaveLight, borderColor: BrandColors.azulSuaveBorder, borderWidth: 1 };
    case 'klein':
    case 'petroleo':
      return { backgroundColor: BrandColors.azulSecundario };
    default:
      return { backgroundColor: BrandColors.blancoCalidoSubtle, borderColor: BrandColors.borderSubtle, borderWidth: 1 };
  }
};

const getBadgeTextStyle = (variant: BentoCardProps['badgeVariant']) => {
  switch (variant) {
    case 'rojo':
    case 'carmesi':
    case 'coral':
    case 'azafran':
      return { color: BrandColors.rojoQuito };
    case 'verde':
      return { color: BrandColors.verdeSobrio };
    case 'azul':
    case 'francia':
    case 'turquesa':
      return { color: BrandColors.azulPrincipal };
    case 'suave':
    case 'cielo':
    case 'celeste':
      return { color: BrandColors.azulSecundario };
    case 'klein':
    case 'petroleo':
      return { color: BrandColors.blancoCalido };
    default:
      return { color: BrandColors.textSecondary };
  }
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.2,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.xs,
  },
  iconWrapper: {
    marginRight: Spacing.xs,
    padding: 6,
    borderRadius: Radii.sm,
    backgroundColor: BrandColors.blancoCalidoSubtle,
  },
  iconWrapperDark: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.full,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  content: {
    marginTop: 2,
  },
});
