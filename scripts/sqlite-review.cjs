// Integration probe: real host SQLite, production TS repositories; not an Android test.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { randomUUID } = require('node:crypto');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const cache = new Map();
function load(file) {
  file = path.resolve(file);
  if (!path.extname(file)) file += '.ts';
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const localRequire = (id) => {
    if (id === 'expo-crypto') return { randomUUID };
    if (id === 'expo-file-system' || id === 'expo-sharing') return {};
    if (id.startsWith('@/')) return load(path.join(root, 'src', id.slice(2)));
    if (id.startsWith('.')) return load(path.resolve(path.dirname(file), id));
    return require(id);
  };
  new Function('require', 'module', 'exports', code)(localRequire, module, module.exports);
  return module.exports;
}
function adapter(raw) {
  const db = {
    execAsync: async (sql) => raw.exec(sql),
    runAsync: async (sql, ...args) => raw.prepare(sql).run(...args),
    getAllAsync: async (sql, ...args) => raw.prepare(sql).all(...args),
    getFirstAsync: async (sql, ...args) => raw.prepare(sql).get(...args) ?? null,
    withExclusiveTransactionAsync: async (fn) => {
      raw.exec('BEGIN IMMEDIATE');
      try { await fn(db); raw.exec('COMMIT'); }
      catch (e) { raw.exec('ROLLBACK'); throw e; }
    },
  };
  return db;
}
const migrations = load(path.join(root, 'src/database/migrations.ts'));
const txs = load(path.join(root, 'src/features/transactions/repository.ts'));
const cards = load(path.join(root, 'src/features/cards/repository.ts'));
const recurring = load(path.join(root, 'src/features/recurring/repository.ts'));
const seed = load(path.join(root, 'src/database/seed.ts'));
const backup = load(path.join(root, 'src/features/backup/export.ts'));
const input = (amount = 1000) => ({ type: 'INCOME', amount, description: 'QA', categoryId: null,
  accountId: 'acc-main', destinationAccountId: null, date: '2026-09-30', notes: null,
  paymentMethod: null, institution: null, recurringId: null });
let failed = 0;
async function check(name, fn) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'financas-qa-'));
  const file = path.join(temp, 'qa.sqlite');
  let raw = new DatabaseSync(file);
  const db = adapter(raw);
  try { await migrations.migrate(db); await fn(db, () => {
    raw.close(); raw = new DatabaseSync(file); return adapter(raw);
  }); console.log(`PASS ${name}`); }
  catch (e) { failed++; console.error(`FAIL ${name}: ${e.message}`); }
  finally {
    raw.close();
    assert.equal(path.dirname(path.resolve(temp)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(temp).startsWith('financas-qa-'));
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
(async () => {
  await check('migration banco limpo e segunda execução preserva dados', async (db) => {
    await txs.insertTransaction(db, input()); await migrations.migrate(db);
    assert.equal((await txs.listTransactions(db)).length, 1);
    assert.equal((await db.getFirstAsync('PRAGMA user_version')).user_version, migrations.SCHEMA_VERSION);
  });
  await check('CRUD e persistência após fechar/reabrir SQLite no host', async (db, reopen) => {
    const id = await txs.insertTransaction(db, input());
    const expenseId = await txs.insertTransaction(db, { ...input(300), type: 'EXPENSE' });
    db = reopen(); await migrations.migrate(db);
    assert.equal((await txs.listTransactions(db)).length, 2);
    await txs.updateTransaction(db, id, input(2000));
    assert.equal((await txs.listTransactions(db)).find(t => t.id === id).amount, 2000);
    await txs.deleteTransaction(db, expenseId);
    assert.equal((await txs.listTransactions(db)).length, 1);
  });
  await check('FK e rollback de compra inválida', async (db) => {
    await assert.rejects(txs.insertTransaction(db, { ...input(), accountId: 'inexistente' }));
    await assert.rejects(cards.createPurchase(db, { description: 'QA', creditCardId: null,
      categoryId: null, totalAmount: 1, installmentCount: 2, purchaseDate: '2026-09-30' }, null));
    assert.equal((await cards.listPurchases(db)).length, 0);
  });
  await check('seed e remoção preservam transação do usuário', async (db) => {
    const id = await txs.insertTransaction(db, input());
    await seed.seedDemoData(db, '2026-09-30');
    assert.equal(await seed.hasDemoData(db), true);
    await seed.removeDemoData(db);
    assert.deepEqual((await txs.listTransactions(db)).map(t => t.id), [id]);
  });
  await check('rejeita centavos fracionários', async (db) => {
    await assert.rejects(txs.insertTransaction(db, input(1.5)));
  });
  await check('backup JSON mantém centavos e acentos', async (db) => {
    await txs.insertTransaction(db, { ...input(5320), description: 'Salário ação' });
    const result = JSON.parse(await backup.buildJsonBackup(db));
    assert.equal(result.tables.transactions[0].amount, 5320);
    assert.equal(result.tables.transactions[0].description, 'Salário ação');
  });
  await check('CSV neutraliza fórmulas e escapa retorno de carro', async () => {
    const result = backup.buildTransactionsCsv([{ ...input(5320), type: 'EXPENSE',
      description: '=1+1', notes: 'linha\rseguinte' }], [], []);
    assert.ok(result.includes(";'=1+1;"));
    assert.ok(result.includes(';"linha\rseguinte"'));
    assert.ok(result.includes(';-53,20;'));
  });
  await check('pagamento repetido com snapshot antigo não duplica despesa', async (db) => {
    await cards.createPurchase(db, { description: 'QA', creditCardId: null,
      categoryId: null, totalAmount: 100, installmentCount: 1, purchaseDate: '2026-09-30' }, null);
    const items = await cards.listInstallments(db);
    await cards.payInstallments(db, items, 'acc-main', '2026-09-30');
    await cards.payInstallments(db, items, 'acc-main', '2026-09-30');
    assert.equal((await txs.listTransactions(db)).length, 1);
  });
  await check('recorrência lançada duas vezes é idempotente', async (db) => {
    await recurring.saveRecurring(db, { type: 'INCOME', description: 'QA', amount: 100,
      categoryId: null, accountId: 'acc-main', dayOfMonth: 5, startDate: '2026-01-01', autoPost: 1, active: 1 });
    const [r] = await recurring.listRecurrings(db);
    await recurring.postOccurrence(db, r, '2026-09', '2026-09-30');
    await recurring.postOccurrence(db, r, '2026-09', '2026-09-30');
    assert.equal((await txs.listTransactions(db)).length, 1);
  });
  await check('backup exportado restaura todas as tabelas após apagar os dados', async (db, reopen) => {
    await seed.seedDemoData(db, '2026-09-30');
    const [item] = await cards.listInstallments(db);
    await cards.payInstallments(db, [item], 'acc-main', '2026-09-30'); // parcela paga: FK parcela -> transação
    const json = await backup.buildJsonBackup(db);
    await seed.removeDemoData(db);
    await txs.insertTransaction(db, input(777));
    await backup.restoreJsonBackup(db, json);
    db = reopen();
    assert.deepEqual(JSON.parse(await backup.buildJsonBackup(db)).tables, JSON.parse(json).tables);
  });
  await check('backup inválido é recusado sem alterar os dados', async (db) => {
    await txs.insertTransaction(db, input(123));
    const valid = JSON.parse(await backup.buildJsonBackup(db));
    const bad = [
      'não é json',
      JSON.stringify({ app: 'outro', schemaVersion: 1, tables: {} }),
      JSON.stringify({ ...valid, schemaVersion: 99 }),
      JSON.stringify({ ...valid, tables: { ...valid.tables, settings: undefined } }),
      JSON.stringify({ ...valid, tables: { ...valid.tables, transactions: [{ ...valid.tables.transactions[0], 'id) VALUES (1); --': 1 }] } }),
      JSON.stringify({ ...valid, tables: { ...valid.tables, transactions: [{ ...valid.tables.transactions[0], amount: -5 }] } }),
    ];
    for (const content of bad) {
      await assert.rejects(backup.restoreJsonBackup(db, content));
      const [tx] = await txs.listTransactions(db);
      assert.equal(tx.amount, 123);
    }
  });
  process.exitCode = failed ? 1 : 0;
})();
