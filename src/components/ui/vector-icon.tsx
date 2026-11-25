import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { BrandColors } from '@/constants/tokens';

export type VectorIconName =
  | 'chart'
  | 'shield-check'
  | 'map-pin'
  | 'refresh'
  | 'alert-triangle'
  | 'check-circle'
  | 'layers'
  | 'users'
  | 'table'
  | 'sun-geometric'
  | 'chevron-right'
  | 'radio'
  | 'eye'
  | 'eye-off';

export interface VectorIconProps {
  name: VectorIconName;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * VectorIcon
 *
 * Iconografía vectorial pura basada en primitivas geométricas de React Native.
 * No utiliza emojis ni depende de paquetes de fuentes externas que puedan fallar en Android.
 * Ofrece máxima nitidez y rendimiento en cualquier resolución de pantalla.
 */
export const VectorIcon: React.FC<VectorIconProps> = ({
  name,
  size = 20,
  color = BrandColors.azulKlein,
  style,
}) => {
  const s = size;

  switch (name) {
    case 'chart':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'flex-end', flexDirection: 'row', alignItems: 'flex-end' }, style]}>
          <View style={{ width: s * 0.22, height: s * 0.45, backgroundColor: color, borderRadius: 2, marginRight: 2 }} />
          <View style={{ width: s * 0.22, height: s * 0.9, backgroundColor: color, borderRadius: 2, marginRight: 2 }} />
          <View style={{ width: s * 0.22, height: s * 0.65, backgroundColor: color, borderRadius: 2 }} />
        </View>
      );

    case 'shield-check':
      return (
        <View style={[{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }, style]}>
          <View
            style={{
              width: s * 0.85,
              height: s * 0.95,
              borderWidth: 2,
              borderColor: color,
              borderTopLeftRadius: s * 0.4,
              borderTopRightRadius: s * 0.4,
              borderBottomLeftRadius: s * 0.4,
              borderBottomRightRadius: s * 0.4,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: s * 0.35,
                height: s * 0.2,
                borderBottomWidth: 2,
                borderLeftWidth: 2,
                borderColor: color,
                transform: [{ rotate: '-45deg' }],
                marginBottom: 2,
              }}
            />
          </View>
        </View>
      );

    case 'map-pin':
      return (
        <View style={[{ width: s, height: s, alignItems: 'center' }, style]}>
          <View
            style={{
              width: s * 0.7,
              height: s * 0.7,
              borderRadius: (s * 0.7) / 2,
              borderWidth: 2,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View style={{ width: s * 0.2, height: s * 0.2, borderRadius: s * 0.1, backgroundColor: color }} />
          </View>
          <View
            style={{
              width: 2,
              height: s * 0.3,
              backgroundColor: color,
              marginTop: -1,
            }}
          />
        </View>
      );

    case 'alert-triangle':
      return (
        <View style={[{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }, style]}>
          <View
            style={{
              width: 0,
              height: 0,
              backgroundColor: 'transparent',
              borderStyle: 'solid',
              borderLeftWidth: s * 0.45,
              borderRightWidth: s * 0.45,
              borderBottomWidth: s * 0.85,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: color,
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: 2,
                height: s * 0.28,
                backgroundColor: BrandColors.blancoCalido,
                marginTop: s * 0.3,
                borderRadius: 1,
              }}
            />
            <View
              style={{
                width: 2.5,
                height: 2.5,
                backgroundColor: BrandColors.blancoCalido,
                marginTop: 2,
                borderRadius: 1.5,
              }}
            />
          </View>
        </View>
      );

    case 'check-circle':
      return (
        <View
          style={[
            {
              width: s,
              height: s,
              borderRadius: s / 2,
              borderWidth: 2,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            },
            style,
          ]}
        >
          <View
            style={{
              width: s * 0.4,
              height: s * 0.22,
              borderBottomWidth: 2,
              borderLeftWidth: 2,
              borderColor: color,
              transform: [{ rotate: '-45deg' }],
              marginBottom: 2,
            }}
          />
        </View>
      );

    case 'refresh':
      return (
        <View
          style={[
            {
              width: s,
              height: s,
              borderRadius: s / 2,
              borderWidth: 2,
              borderColor: color,
              borderTopColor: 'transparent',
              alignItems: 'flex-end',
              justifyContent: 'flex-start',
            },
            style,
          ]}
        >
          <View
            style={{
              width: 0,
              height: 0,
              borderLeftWidth: 3,
              borderRightWidth: 3,
              borderBottomWidth: 5,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: color,
              transform: [{ rotate: '45deg' }],
              marginTop: -2,
              marginRight: -1,
            }}
          />
        </View>
      );

    case 'layers':
      return (
        <View style={[{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }, style]}>
          <View
            style={{
              width: s * 0.7,
              height: s * 0.35,
              borderWidth: 1.8,
              borderColor: color,
              transform: [{ rotate: '45deg' }],
              position: 'absolute',
              top: s * 0.15,
            }}
          />
          <View
            style={{
              width: s * 0.7,
              height: s * 0.35,
              borderWidth: 1.8,
              borderColor: color,
              transform: [{ rotate: '45deg' }],
              position: 'absolute',
              top: s * 0.4,
            }}
          />
        </View>
      );

    case 'table':
      return (
        <View
          style={[
            {
              width: s,
              height: s * 0.85,
              borderWidth: 1.8,
              borderColor: color,
              borderRadius: 3,
              flexDirection: 'column',
              justifyContent: 'space-evenly',
              padding: 1,
            },
            style,
          ]}
        >
          <View style={{ height: 1.5, backgroundColor: color }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', flex: 1, alignItems: 'center' }}>
            <View style={{ width: 1.5, height: '100%', backgroundColor: color }} />
            <View style={{ width: 1.5, height: '100%', backgroundColor: color }} />
          </View>
        </View>
      );

    case 'sun-geometric':
      // Emblema geométrico solar inspirado en los motivos del sol quiteño
      return (
        <View style={[{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }, style]}>
          <View
            style={{
              width: s * 0.5,
              height: s * 0.5,
              borderRadius: (s * 0.5) / 2,
              backgroundColor: color,
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: s * 0.72,
              height: s * 0.72,
              borderWidth: 1.5,
              borderColor: color,
              transform: [{ rotate: '45deg' }],
              borderRadius: 2,
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: s * 0.72,
              height: s * 0.72,
              borderWidth: 1.5,
              borderColor: color,
              borderRadius: 2,
            }}
          />
        </View>
      );

    case 'chevron-right':
      return (
        <View style={[{ width: s * 0.6, height: s, alignItems: 'center', justifyContent: 'center' }, style]}>
          <View
            style={{
              width: s * 0.4,
              height: s * 0.4,
              borderTopWidth: 2,
              borderRightWidth: 2,
              borderColor: color,
              transform: [{ rotate: '45deg' }],
            }}
          />
        </View>
      );

    case 'users':
      return (
        <View style={[{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }, style]}>
          <View style={{ width: s * 0.34, height: s * 0.34, borderRadius: (s * 0.34) / 2, borderWidth: 1.8, borderColor: color }} />
          <View
            style={{
              width: s * 0.7,
              height: s * 0.35,
              borderTopLeftRadius: s * 0.35,
              borderTopRightRadius: s * 0.35,
              borderWidth: 1.8,
              borderBottomWidth: 0,
              borderColor: color,
              marginTop: 1,
            }}
          />
        </View>
      );

    case 'eye':
      return (
        <View style={[{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }, style]}>
          {/* Párpado superior */}
          <View
            style={{
              position: 'absolute',
              width: s * 0.94,
              height: s * 0.44,
              borderTopLeftRadius: s * 0.47,
              borderTopRightRadius: s * 0.47,
              borderTopWidth: 1.8,
              borderLeftWidth: 1.4,
              borderRightWidth: 1.4,
              borderColor: color,
              top: s * 0.28,
            }}
          />
          {/* Párpado inferior */}
          <View
            style={{
              position: 'absolute',
              width: s * 0.94,
              height: s * 0.44,
              borderBottomLeftRadius: s * 0.47,
              borderBottomRightRadius: s * 0.47,
              borderBottomWidth: 1.8,
              borderLeftWidth: 1.4,
              borderRightWidth: 1.4,
              borderColor: color,
              bottom: s * 0.28,
            }}
          />
          {/* Iris / Pupila central */}
          <View
            style={{
              width: s * 0.36,
              height: s * 0.36,
              borderRadius: (s * 0.36) / 2,
              backgroundColor: color,
            }}
          />
        </View>
      );

    case 'eye-off':
      return (
        <View style={[{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }, style]}>
          {/* Párpado superior */}
          <View
            style={{
              position: 'absolute',
              width: s * 0.94,
              height: s * 0.44,
              borderTopLeftRadius: s * 0.47,
              borderTopRightRadius: s * 0.47,
              borderTopWidth: 1.8,
              borderLeftWidth: 1.4,
              borderRightWidth: 1.4,
              borderColor: color,
              top: s * 0.28,
            }}
          />
          {/* Párpado inferior */}
          <View
            style={{
              position: 'absolute',
              width: s * 0.94,
              height: s * 0.44,
              borderBottomLeftRadius: s * 0.47,
              borderBottomRightRadius: s * 0.47,
              borderBottomWidth: 1.8,
              borderLeftWidth: 1.4,
              borderRightWidth: 1.4,
              borderColor: color,
              bottom: s * 0.28,
            }}
          />
          {/* Iris / Pupila central */}
          <View
            style={{
              width: s * 0.36,
              height: s * 0.36,
              borderRadius: (s * 0.36) / 2,
              backgroundColor: color,
            }}
          />
          {/* Recorte de separación diagonal */}
          <View
            style={{
              position: 'absolute',
              width: s * 1.25,
              height: 4.5,
              backgroundColor: BrandColors.blancoSuperficie,
              transform: [{ rotate: '-45deg' }],
              borderRadius: 2,
            }}
          />
          {/* Línea diagonal tachada auténtica */}
          <View
            style={{
              position: 'absolute',
              width: s * 1.2,
              height: 2,
              backgroundColor: color,
              transform: [{ rotate: '-45deg' }],
              borderRadius: 1,
            }}
          />
        </View>
      );

    default:
      return <View style={[{ width: s, height: s, backgroundColor: color }, style]} />;
  }
};
