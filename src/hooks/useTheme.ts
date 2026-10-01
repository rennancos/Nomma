import { useColorScheme } from 'react-native';
import { palettes } from '@/constants/theme';
import { useFinanceStore } from '@/stores/financeStore';

/** Cores do tema ativo: preferência salva nas configurações ou a do sistema. */
export function useTheme() {
  const system = useColorScheme();
  const pref = useFinanceStore((s) => s.data?.settings.theme ?? 'system');
  const scheme = pref === 'system' ? (system === 'dark' ? 'dark' : 'light') : pref;
  return { colors: palettes[scheme], scheme };
}
