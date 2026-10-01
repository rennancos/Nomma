import type { TransactionType } from '@/types';

// Tokens de design. Componentes nunca usam cores literais: sempre `colors.<token>`.

const light = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',
  border: '#E2E8F0',
  text: '#0F172A',
  textMuted: '#475569',
  primary: '#3B82F6',
  primarySoft: '#EFF6FF',
  onPrimary: '#FFFFFF',
  income: '#10B981',
  expense: '#EF4444',
  investment: '#8B5CF6',
  transfer: '#6366F1',
  warning: '#F59E0B',
  warningSoft: '#FEF3C7',
  danger: '#EF4444',
  overlay: 'rgba(15, 23, 42, 0.45)',
};

export type Colors = typeof light;

const dark: Colors = {
  background: '#020617',
  surface: '#0F172A',
  surfaceAlt: '#1E293B',
  border: '#334155',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  primary: '#3B82F6',
  primarySoft: '#172554',
  onPrimary: '#FFFFFF',
  income: '#34D399',
  expense: '#F87171',
  investment: '#A78BFA',
  transfer: '#818CF8',
  warning: '#FBBF24',
  warningSoft: '#451A03',
  danger: '#F87171',
  overlay: 'rgba(0, 0, 0, 0.6)',
};

export const palettes = { light, dark };

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;
export const fontSize = { caption: 12, small: 13, body: 15, subtitle: 17, title: 22, hero: 34 } as const;

/**
 * Marca Nomma na tela de abertura: fixa, igual em tema claro e escuro (docs/NOMMA_LAUNCH_SCREEN.md).
 * `deep` precisa ser o mesmo valor do splash nativo (app.json -> expo-splash-screen.backgroundColor) para a troca não piscar.
 */
export const brand = {
  deep: '#0D1E32',
  text: '#E0F2FE',
  glow: '#7DD3FC',
  loadingActive: '#67E8F9',
  loadingInactive: '#1E3A52',
  loadingTrack: '#16304A',
} as const;

export const typeColor =(c: Colors, type: TransactionType): string =>
  ({ INCOME: c.income, EXPENSE: c.expense, INVESTMENT: c.investment, TRANSFER: c.transfer })[type];
