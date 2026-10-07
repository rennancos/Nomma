import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FIREBASE_JWKS_URL, handleRequest, verifyFirebaseToken } from './assistant.mjs';

const PROJECT = 'nomma-test';
const { privateKey, publicKey } = await crypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...(await crypto.subtle.exportKey('jwk', publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' };

const b64 = (bytes) => Buffer.from(bytes).toString('base64url');
async function sign(claims = {}, header = {}) {
  const now = Math.floor(Date.now() / 1000);
  const h = b64(JSON.stringify({ alg: 'RS256', kid: 'k1', ...header }));
  const p = b64(JSON.stringify({ aud: PROJECT, iss: `https://securetoken.google.com/${PROJECT}`, sub: 'user-a', iat: now - 10, auth_time: now - 10, exp: now + 600, ...claims }));
  return `${h}.${p}.${b64(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, new TextEncoder().encode(`${h}.${p}`)))}`;
}

function limiter(max = Infinity) {
  const counts = new Map();
  return { limit: async ({ key }) => { counts.set(key, (counts.get(key) ?? 0) + 1); return { success: counts.get(key) <= max }; } };
}
const env = (extra = {}) => ({ FIREBASE_PROJECT_ID: PROJECT, OPENAI_API_KEY: 'server-secret', OPENAI_MODEL: 'configured-model', ASSISTANT_LIMITER: limiter(), ...extra });
const payload = { question: 'Resumo?', context: { period: '2026-10', filtered: false, facts: [], categories: [], limitations: 'Dados locais' } };

function fakeFetch(provider = {}) {
  const calls = [];
  const fn = async (url, options) => {
    calls.push({ url, options });
    if (url === FIREBASE_JWKS_URL) return new Response(JSON.stringify({ keys: [jwk] }), { headers: { 'cache-control': 'public, max-age=3600' } });
    const input = JSON.parse(JSON.parse(options.body).input);
    return Response.json({ status: 'completed', output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: `Resposta: ${input.question}` }] }], ...provider });
  };
  return { fn, calls, provider: () => calls.filter((c) => c.url.includes('openai')) };
}
async function call(fetchImpl, { token, body = payload, environment = env() } = {}) {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  const request = new Request('https://worker.example/assistant', {
    method: 'POST', body: text,
    headers: { authorization: `Bearer ${token ?? (await sign())}`, 'content-type': 'application/json', 'content-length': String(Buffer.byteLength(text)) },
  });
  const response = await handleRequest(request, environment, fetchImpl);
  return { status: response.status, headers: response.headers, body: await response.json() };
}

test('aceita token válido do Firebase e devolve só a resposta', async () => {
  const mock = fakeFetch();
  const result = await call(mock.fn);
  assert.equal(result.status, 200);
  assert.equal(result.body.answer, 'Resposta: Resumo?');
  assert.equal(result.headers.get('cache-control'), 'no-store');
});

test('rejeita tokens expirados, de outro projeto, adulterados ou com algoritmo/chave desconhecidos', async () => {
  const now = Math.floor(Date.now() / 1000);
  const valid = await sign();
  const [h, p, s] = valid.split('.');
  const tampered = `${h}.${b64(JSON.stringify({ ...JSON.parse(Buffer.from(p, 'base64url')), sub: 'user-b' }))}.${s}`;
  const bad = [
    await sign({ exp: now - 1 }),
    await sign({ aud: 'outro-projeto' }),
    await sign({ iss: 'https://securetoken.google.com/outro-projeto' }),
    await sign({ sub: '' }),
    await sign({ iat: now + 3600 }),
    await sign({ auth_time: now + 3600 }),
    await sign({}, { kid: 'desconhecida' }),
    await sign({}, { alg: 'none' }),
    tampered,
    'nao.e.jwt',
  ];
  for (const token of bad) {
    const mock = fakeFetch();
    assert.equal((await call(mock.fn, { token })).status, 401, token);
    assert.equal(mock.provider().length, 0);
  }
});

test('sem configuração ou sem login não chama provedor', async () => {
  const mock = fakeFetch();
  assert.equal((await call(mock.fn, { environment: {} })).status, 503);
  assert.equal((await call(mock.fn, { environment: env({ ASSISTANT_LIMITER: undefined }) })).status, 503);
  const response = await handleRequest(new Request('https://worker.example/assistant', { method: 'POST', body: '{}', headers: { 'content-type': 'application/json' } }), env(), mock.fn);
  assert.equal(response.status, 401);
  assert.equal(mock.provider().length, 0);
});

test('rejeita identidade no corpo, transações extras e corpo excessivo', async () => {
  const mock = fakeFetch();
  assert.equal((await call(mock.fn, { body: { ...payload, userId: 'another-user' } })).status, 400);
  assert.equal((await call(mock.fn, { body: { ...payload, context: { ...payload.context, transactions: [] } } })).status, 400);
  assert.equal((await call(mock.fn, { body: 'x'.repeat(33000) })).status, 413);
  assert.equal((await call(mock.fn, { body: '{' })).status, 400);
  assert.equal(mock.provider().length, 0);
});

test('envia fatos separados das instruções, sem armazenamento, ferramentas ou token do usuário', async () => {
  const mock = fakeFetch();
  const token = await sign();
  await call(mock.fn, { token });
  const [providerCall] = mock.provider();
  const request = JSON.parse(providerCall.options.body);
  assert.equal(request.store, false);
  assert.equal(request.tools, undefined);
  assert.deepEqual(JSON.parse(request.input), payload);
  assert.ok(!providerCall.options.body.includes(token));
});

test('limita chamadas por usuário validado, não por dado do corpo', async () => {
  const mock = fakeFetch();
  const environment = env({ ASSISTANT_LIMITER: limiter(2) });
  const tokenA = await sign({ sub: 'user-a' });
  assert.equal((await call(mock.fn, { token: tokenA, environment })).status, 200);
  assert.equal((await call(mock.fn, { token: tokenA, environment })).status, 200);
  assert.equal((await call(mock.fn, { token: tokenA, environment })).status, 429);
  assert.equal((await call(mock.fn, { token: await sign({ sub: 'user-b' }), environment })).status, 200);
});

test('contextos de usuários distintos não se misturam', async () => {
  const mock = fakeFetch();
  await call(mock.fn, { token: await sign({ sub: 'user-a' }), body: { ...payload, question: 'Contexto A' } });
  const result = await call(mock.fn, { token: await sign({ sub: 'user-b' }), body: { ...payload, question: 'Contexto B' } });
  assert.equal(result.body.answer, 'Resposta: Contexto B');
  assert.ok(!mock.provider()[1].options.body.includes('Contexto A'));
});

test('recusa saídas incompletas e oculta falhas do provedor', async () => {
  assert.equal((await call(fakeFetch({ status: 'incomplete' }).fn)).status, 502);
  const failing = fakeFetch();
  const fn = async (url, options) => (url === FIREBASE_JWKS_URL ? failing.fn(url, options) : Promise.reject(Error('server-secret')));
  const result = await call(fn);
  assert.equal(result.status, 502);
  assert.ok(!JSON.stringify(result.body).includes('server-secret'));
});

test('verifyFirebaseToken usa as chaves em cache', async () => {
  const mock = fakeFetch();
  const later = Date.now() + 7200_000; // força cache vencido nesta chamada
  assert.equal(await verifyFirebaseToken(await sign({ exp: Math.floor(later / 1000) + 600 }), PROJECT, mock.fn, later), 'user-a');
  assert.equal(await verifyFirebaseToken(await sign({ exp: Math.floor(later / 1000) + 600 }), PROJECT, mock.fn, later + 1000), 'user-a');
  assert.equal(mock.calls.length, 1);
});
