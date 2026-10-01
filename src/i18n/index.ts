import { en } from './locales/en';
import { ptBR } from './locales/pt-BR';

export const translations = { en, 'pt-BR': ptBR } as const;
type Messages = typeof en;
/** "secao.chave", derivado de en.ts: uma chave inexistente não compila. */
export type TranslationKey = { [S in keyof Messages]: `${S & string}.${keyof Messages[S] & string}` }[keyof Messages];
export type SupportedLocale = keyof typeof translations;

export function resolveLocale(locale?: string | null): SupportedLocale {
  if (typeof locale !== 'string' || locale.trim() === '') return 'en';
  try {
    // Android pode informar "pt_BR"; e há aparelhos que informam só o idioma ("pt").
    const normalized = Intl.getCanonicalLocales(locale.trim().replace(/_/g, '-'))[0]?.toLowerCase();
    return normalized === 'pt' || normalized?.startsWith('pt-') ? 'pt-BR' : 'en';
  } catch {
    return 'en';
  }
}

export function detectDeviceLocale(): SupportedLocale {
  try {
    return resolveLocale(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    return 'en';
  }
}

// O idioma do aparelho não muda com o app aberto: detecta uma vez.
let deviceLocale: SupportedLocale | undefined;

/**
 * Texto traduzido. `vars` preenche marcadores como `{pct}`. Sem `locale`, usa o idioma do aparelho.
 * Também aceita `t(chave, locale)`.
 */
export function t(key: TranslationKey, vars?: Record<string, string | number> | SupportedLocale, locale?: SupportedLocale): string {
  if (typeof vars === 'string') return t(key, undefined, vars);
  const lang = locale ?? (deviceLocale ??= detectDeviceLocale());
  const [section, entry] = key.split('.') as [keyof Messages, string];
  const pick = (m: Messages) => (m[section] as Record<string, string>)[entry];
  const text = pick(translations[lang]) ?? pick(en) ?? key;
  return vars ? text.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`)) : text;
}
