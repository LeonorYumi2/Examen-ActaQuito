import React, { useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Search, X } from 'lucide-react-native';
import { BrandColors, FontFamilies, Radii, Spacing } from '@/constants/tokens';

export interface CampoBusquedaProps {
  valor: string;
  alCambiar: (texto: string) => void;
  alLimpiar?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  mantenerFocoAlLimpiar?: boolean;
}

export const CampoBusqueda: React.FC<CampoBusquedaProps> = ({
  valor,
  alCambiar,
  alLimpiar,
  placeholder = 'Buscar…',
  autoFocus = false,
  style,
  inputStyle,
  accessibilityLabel = 'Buscar',
  mantenerFocoAlLimpiar = true,
}) => {
  const inputRef = useRef<TextInput | null>(null);

  const manejarLimpieza = () => {
    alCambiar('');
    alLimpiar?.();
    if (mantenerFocoAlLimpiar && inputRef.current) {
      inputRef.current.focus();
    }
  };

  const tieneTexto = Boolean(valor && valor.trim().length > 0);

  return (
    <View style={[styles.container, style]}>
      <Search
        size={16}
        color={BrandColors.textoSecundario}
        style={styles.searchIcon}
      />
      <TextInput
        ref={inputRef}
        style={[styles.input, inputStyle]}
        placeholder={placeholder}
        placeholderTextColor={BrandColors.textoMuted}
        value={valor}
        onChangeText={alCambiar}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
        accessibilityLabel={accessibilityLabel}
        returnKeyType="search"
      />
      {tieneTexto ? (
        <TouchableOpacity
          style={styles.clearButton}
          onPress={manejarLimpieza}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Limpiar búsqueda"
          accessibilityRole="button"
        >
          <X size={15} color={BrandColors.azulTitulos} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.blancoSuperficie,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: BrandColors.azulBorde,
    paddingHorizontal: Spacing.sm,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontFamily: FontFamilies.bodyRegular,
    fontSize: 13,
    color: BrandColors.textoPrincipal,
    paddingVertical: 0,
    height: '100%',
  },
  clearButton: {
    padding: 4,
    borderRadius: Radii.full,
    backgroundColor: BrandColors.superficieCalida,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
});
