import { describe, expect, it } from '@jest/globals';
import { detectDeviceLocale, resolveLocale, t, translations } from '../index';

describe('branding translations', () => {
  it.each([
    ['pt-BR', 'Seu dinheiro, em um só lugar.'],
    ['pt-PT', 'Seu dinheiro, em um só lugar.'],
    ['pt', 'Seu dinheiro, em um só lugar.'],
    ['pt_BR', 'Seu dinheiro, em um só lugar.'],
    ['en-US', 'Your money, in one place.'],
    ['en-GB', 'Your money, in one place.'],
    ['fr-FR', 'Your money, in one place.'],
  ])('resolves %s', (deviceLocale, expectedSlogan) => {
    const locale = resolveLocale(deviceLocale);
    expect(t('branding.name', locale)).toBe('Nomma');
    expect(t('branding.slogan', locale)).toBe(expectedSlogan);
  });

  it.each([undefined, null, '', 'not a locale'])('falls back safely for locale %s', (deviceLocale) => {
    const locale = resolveLocale(deviceLocale);
    expect(locale).toBe('en');
    expect(t('branding.slogan', locale)).toBe('Your money, in one place.');
  });

  it('detects a supported runtime locale', () => {
    expect(['en', 'pt-BR']).toContain(detectDeviceLocale());
  });
});

describe('textos com valores', () => {
  it('preenche os marcadores nos dois idiomas', () => {
    expect(t('analytics.vsPrevious', { arrow: '↓', pct: '8%' }, 'pt-BR')).toBe('↓ 8% vs. período anterior');
    expect(t('analytics.ofIncome', { pct: '35,8%' }, 'en')).toBe('35,8% of income');
  });
  it('marcador sem valor fica visível (não some em silêncio)', () => {
    expect(t('analytics.ofIncome', {}, 'pt-BR')).toBe('{pct} da renda');
  });
  it('pt-BR tem exatamente as mesmas chaves do inglês', () => {
    const keys = (o: object): string[] => Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' ? keys(v).map((s) => `${k}.${s}`) : [k])).sort();
    expect(keys(translations['pt-BR'])).toEqual(keys(translations.en));
  });
});
