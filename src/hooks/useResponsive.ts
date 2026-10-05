import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '@/constants/theme';

// Layout pela largura útil da janela (não pelo modelo do aparelho): funciona em celular, tablet,
// paisagem, tela dividida e janelas redimensionadas. Faixas das classes de janela do Material:
// compacta < 600 dp (celulares), média 600–839 dp (tablets pequenos, celulares em paisagem), expandida ≥ 840 dp.

export const BREAKPOINTS = { medium: 600, expanded: 840 } as const;

/** Largura máxima do conteúdo, para nada ficar esticado em telas grandes. */
export const MAX_WIDTH = {
  /** formulários: campos e botões com largura confortável */
  form: 640,
  /** listas de lançamentos */
  list: 760,
  /** painéis com colunas (Início, Análises) */
  content: 1080,
} as const;
export type ContentSize = keyof typeof MAX_WIDTH;

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Em paisagem, barra de navegação e recorte da câmera ficam nas laterais.
  const usable = width - insets.left - insets.right;
  const medium = usable >= BREAKPOINTS.medium;
  const expanded = usable >= BREAKPOINTS.expanded;
  return {
    width: usable,
    medium,
    expanded,
    landscape: width > height,
    /** margem lateral da tela */
    gutter: medium ? spacing.xl : spacing.lg,
    insets,
  };
}

/**
 * Estilo do contêiner de rolagem (contentContainerStyle): margens laterais, áreas seguras laterais
 * e largura máxima centralizada.
 */
export function useContentStyle(size: ContentSize = 'content') {
  const { gutter, insets } = useResponsive();
  return {
    paddingLeft: gutter + insets.left,
    paddingRight: gutter + insets.right,
    width: '100%' as const,
    maxWidth: MAX_WIDTH[size] + gutter * 2 + insets.left + insets.right,
    alignSelf: 'center' as const,
  };
}
