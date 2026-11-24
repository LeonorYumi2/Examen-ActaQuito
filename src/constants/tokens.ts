/**
 * ActaQuito - Design Tokens
 * 
 * Dirección Visual Aprobada: EDITORIAL PREMIUM + GUIDED EXPERIENCE
 *
 * Paleta Oficial Editorial Premium:
 * - Azul Grisáceo Principal: #405C79 (Fondo de barra flotante, acentos estructurales, sobriedad institucional)
 * - Azul Títulos Profundo: #253D59 (Tipografía protagonista, encabezados editoriales, alto contraste)
 * - Azul Superficie Tonal: #EBF1F7 (Fondos de chips, portal badges, superficies secundarias)
 * - Azul Borde Suave: #C9D8E6 (Filetes y delimitaciones discretas)
 *
 * - Fondo Marfil Cálido: #F7F4EF (Fondo base de lectura diurna, calidez de papel editorial)
 * - Blanco Superficie: #FFFFFF (Tarjetas principales, hojas de contenido)
 * - Superficie Cálida Secundaria: #EFECE6 (Contenedores neutros de apoyo)
 *
 * - Gris Azulado de Apoyo: #8BA0B3 (Divisores, arte lineal arquitectónico, leyendas secundarias)
 * - Texto Principal: #253D59 (Lectura de títulos y números protagonistas)
 * - Texto Secundario: #5C6A78 (Subtítulos, descripciones y metadatos)
 * - Texto Muted: #8E9CA9 (Notas al pie y marcas de agua)
 *
 * - Rojo Quito: #C83349 (Únicamente acentos gráficos/ornamentales discretos: filete de 2.5px, detalles cívicos selectos)
 * - Rojo Alerta Crítica: #A61E35 (Reservado estrictamente para discrepancias, errores y fuera de rango GPS)
 * - Verde Éxito: #2E7D46 (Mesas completas, sincronización en línea)
 * - Verde Éxito Suave: #EBF5EE
 *
 * Colores Oficiales de Organizaciones Políticas (S-02 - inalterados):
 * - MFC (Movimiento Futuro Claro): #1769AA
 * - ARP (Alianza Renovación Pichincha): #169B62
 * - MUC (Movimiento Unidad Ciudadana): #E87932
 * - FDP (Frente Democrático Popular): #8054B8
 * - MNE (Movimiento Nueva Esperanza): #D84A52
 */

export const BrandColors = {
  // Paleta Editorial Premium
  azulPrincipal: '#405C79',
  azulTitulos: '#253D59',
  azulSuperficie: '#EBF1F7',
  azulBorde: '#C9D8E6',

  fondoMarfil: '#F7F4EF',
  blancoSuperficie: '#FFFFFF',
  superficieCalida: '#EFECE6',

  grisAzulado: '#8BA0B3',
  grisAzuladoLight: '#D8E2EB',
  textoPrincipal: '#253D59',
  textoSecundario: '#5C6A78',
  textoMuted: '#8E9CA9',

  rojoQuito: '#C83349',
  rojoQuitoSubtle: '#FCECEF',
  rojoQuitoLight: '#FCECEF',
  rojoQuitoBorder: '#F5B7C0',

  rojoAlerta: '#A61E35',
  rojoAlertaLight: '#FDF0F2',
  rojoAlertaBorder: '#F7A7B7',

  verdeExito: '#2E7D46',
  verdeExitoLight: '#EBF5EE',
  verdeExitoBorder: '#BFE0C8',
  verdeSobrioBorder: '#BFE0C8',

  borderSubtle: '#C9D8E6',

  // Alias retrocompatibles
  azulSecundario: '#405C79',
  azulSuave: '#EBF1F7',
  azulSuaveBorder: '#C9D8E6',
  azulSuaveLight: '#F2F6FA',
  blancoCalido: '#F7F4EF',
  blancoCalidoCard: '#FFFFFF',
  blancoCalidoSubtle: '#EFECE6',
  blancoCalidoHover: '#E7E3DC',
  rojoIntenso: '#A61E35',
  rojoIntensoLight: '#FDF0F2',
  verdeSobrio: '#2E7D46',
  verdeSobrioLight: '#EBF5EE',

  azulKlein: '#253D59',
  azulFrancia: '#405C79',
  azulCielo: '#EBF1F7',
  azulCieloLight: '#F2F6FA',
  azulCieloBorder: '#C9D8E6',
  azafran: '#C83349',
  carmesi: '#A61E35',
  backgroundMarfil: '#F7F4EF',
  surfaceWhite: '#FFFFFF',
  surfaceSubtle: '#EFECE6',
  petroleo: '#253D59',
  turquesa: '#405C79',
  celesteSuave: '#EBF1F7',
  coralAcento: '#C83349',
  coralLight: '#FCECEF',
  coralDark: '#A61E35',

  // Textos y Contraste
  textPrimary: '#253D59',
  textSecondary: '#5C6A78',
  textTertiary: '#8E9CA9',
  textOnBlue: '#FFFFFF',
  textOnRed: '#FFFFFF',
  textOnKlein: '#FFFFFF',
  textOnAzafran: '#FFFFFF',
  textOnFrancia: '#FFFFFF',

  // Organizaciones Políticas (S-02)
  mfc: '#1769AA',
  arp: '#169B62',
  muc: '#E87932',
  fdp: '#8054B8',
  mne: '#D84A52',
} as const;

/**
 * Familias Tipográficas:
 * Plus Jakarta Sans para titulares, números escultóricos y énfasis editorial.
 * Nunito Sans para cuerpo de lectura, tablas, etiquetas y campos de entrada.
 */
export const FontFamilies = {
  titleBold: 'PlusJakartaSans_700Bold',
  titleSemiBold: 'PlusJakartaSans_600SemiBold',
  titleExtraBold: 'PlusJakartaSans_800ExtraBold',
  bodyRegular: 'NunitoSans_400Regular',
  bodySemiBold: 'NunitoSans_600SemiBold',
  bodyBold: 'NunitoSans_700Bold',
} as const;

export const Typography = {
  sculpturalHero: {
    fontSize: 52,
    lineHeight: 56,
    fontFamily: FontFamilies.titleExtraBold,
    letterSpacing: -1.5,
    color: BrandColors.azulTitulos,
  },
  displayLarge: {
    fontSize: 32,
    lineHeight: 38,
    fontFamily: FontFamilies.titleBold,
    letterSpacing: -0.8,
    color: BrandColors.azulTitulos,
  },
  titleMedium: {
    fontSize: 20,
    lineHeight: 26,
    fontFamily: FontFamilies.titleSemiBold,
    letterSpacing: -0.3,
    color: BrandColors.azulTitulos,
  },
  titleSmall: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: FontFamilies.titleSemiBold,
    letterSpacing: -0.1,
    color: BrandColors.azulTitulos,
  },
  portalTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontFamily: FontFamilies.titleSemiBold,
    letterSpacing: -0.2,
    color: BrandColors.azulTitulos,
  },
  bodyLarge: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: FontFamilies.bodyRegular,
    color: BrandColors.textoSecundario,
  },
  bodyMedium: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamilies.bodyRegular,
    color: BrandColors.textoSecundario,
  },
  bodySmall: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamilies.bodyRegular,
    color: BrandColors.textoMuted,
  },
  labelCaps: {
    fontSize: 10,
    lineHeight: 14,
    fontFamily: FontFamilies.bodyBold,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    color: BrandColors.textoMuted,
  },
  tagLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: FontFamilies.bodySemiBold,
    letterSpacing: 0.2,
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const Radii = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 28,
  full: 9999,
  asymCardA: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 28,
    borderBottomLeftRadius: 16,
  },
  asymCardB: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 28,
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 28,
  },
  asymHero: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 28,
  },
} as const;

export const Elevations = {
  none: {},
  subtle: {
    shadowColor: '#253D59',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  card: {
    shadowColor: '#253D59',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  hero: {
    shadowColor: '#253D59',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },
  floatingBar: {
    shadowColor: '#172433',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 8,
  },
} as const;

export const PoliticalParties = {
  MFC: {
    code: 'MFC',
    name: 'Movimiento Futuro Claro',
    color: BrandColors.mfc,
    candidates: {
      alcaldia: 'Dra. María Elena Carrión',
      prefectura: 'Ing. Carlos Mantilla',
    },
  },
  ARP: {
    code: 'ARP',
    name: 'Alianza Renovación Pichincha',
    color: BrandColors.arp,
    candidates: {
      alcaldia: 'Ab. Santiago Morales',
      prefectura: 'Dra. Patricia Alvear',
    },
  },
  MUC: {
    code: 'MUC',
    name: 'Movimiento Unidad Ciudadana',
    color: BrandColors.muc,
    candidates: {
      alcaldia: 'Arq. Fausto Benítez',
      prefectura: 'Econ. Lucía Guarderas',
    },
  },
  FDP: {
    code: 'FDP',
    name: 'Frente Democrático Popular',
    color: BrandColors.fdp,
    candidates: {
      alcaldia: 'Lic. Rodrigo Terán',
      prefectura: 'Ing. Marcelo Cárdenas',
    },
  },
  MNE: {
    code: 'MNE',
    name: 'Movimiento Nueva Esperanza',
    color: BrandColors.mne,
    candidates: {
      alcaldia: 'Dra. Sofía Viteri',
      prefectura: 'Ab. Fernando Jaramillo',
    },
  },
} as const;

export const StatusTokens = {
  draft: {
    color: BrandColors.textoSecundario,
    background: BrandColors.superficieCalida,
    border: BrandColors.azulBorde,
    label: 'Borrador',
  },
  pending: {
    color: BrandColors.azulPrincipal,
    background: BrandColors.azulSuperficie,
    border: BrandColors.azulBorde,
    label: 'Pendiente',
  },
  success: {
    color: BrandColors.verdeExito,
    background: BrandColors.verdeExitoLight,
    border: BrandColors.verdeExitoBorder,
    label: 'Transmitida',
  },
  error: {
    color: BrandColors.rojoAlerta,
    background: BrandColors.rojoAlertaLight,
    border: BrandColors.rojoAlertaBorder,
    label: 'Alerta GPS',
  },
} as const;

export type PoliticalPartyCode = keyof typeof PoliticalParties;
