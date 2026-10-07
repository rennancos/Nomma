import { expect, jest, test } from '@jest/globals';

jest.mock('expo-sqlite', () => ({}));
jest.mock('expo-sqlite/kv-store', () => ({}));
// eslint-disable-next-line import/first
import { LOCAL_DB, userDbName } from '../profiles';

test('cada usuário tem um arquivo próprio, diferente do perfil local', () => {
  const a = userDbName('AbC123');
  expect(a).toBe('nomma-u-AbC123.db');
  expect(userDbName('abc123')).not.toBe(a); // uid diferencia maiúsculas
  expect(a).not.toBe(LOCAL_DB);
});

test('uids com caracteres especiais viram nomes seguros e sem colisão', () => {
  const odd = userDbName("../x'; DROP");
  expect(odd).toMatch(/^nomma-h-[0-9a-f-]+\.db$/);
  expect(userDbName('a-b')).not.toBe(userDbName('a_b'));
  // Um uid alfanumérico nunca coincide com a forma hex (prefixos distintos).
  expect(userDbName('2d')).not.toBe(userDbName('-'));
});
