import { describe, expect, it } from '@jest/globals';
import { parseStatement, planImport } from '../statement';

describe('extrato OFX', () => {
  it('lê lançamentos em SGML (tags abertas) e XML (tags fechadas)', () => {
    const sgml = `OFXHEADER:100
<OFX><BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261105120000[-3:BRT]
<TRNAMT>-32.90
<FITID>2026110500001
<MEMO>PIX  ENVIADO   PADARIA &amp; CIA
</STMTTRN>
<STMTTRN><TRNTYPE>CREDIT</TRNTYPE><DTPOSTED>20261106</DTPOSTED><TRNAMT>5300,00</TRNAMT><FITID>X2</FITID><NAME>SALARIO</NAME></STMTTRN>
</BANKTRANLIST></OFX>`;
    expect(parseStatement(sgml)).toEqual([
      { fitId: '2026110500001', date: '2026-11-05', amount: -3290, description: 'PIX ENVIADO PADARIA & CIA' },
      { fitId: 'X2', date: '2026-11-06', amount: 530000, description: 'SALARIO' },
    ]);
  });

  it('ignora blocos sem data ou valor válidos e arquivos que não são extrato', () => {
    expect(parseStatement('<STMTTRN><DTPOSTED>20261340<TRNAMT>-10.00</STMTTRN><STMTTRN><DTPOSTED>20261105<TRNAMT>0.00</STMTTRN>')).toEqual([]);
    expect(parseStatement('{"app":"financas"}')).toEqual([]);
  });

  it('sem descrição usa um texto padrão', () => {
    expect(parseStatement('<STMTTRN><DTPOSTED>20261105<TRNAMT>+1.5<FITID>a')[0]).toEqual(
      { fitId: 'a', date: '2026-11-05', amount: 150, description: 'Lançamento importado' },
    );
  });
});

describe('extrato CSV', () => {
  it('acha as colunas pelo cabeçalho, com ; e vírgula decimal ou , e ponto decimal', () => {
    const br = 'Extrato da conta\nData;Histórico;Valor\n05/11/2026;"Mercado; filial 2";-1.234,56\n06/11/2026;Salário;R$ 5.300,00\nSaldo;;10,00';
    expect(parseStatement(br)).toEqual([
      { fitId: '', date: '2026-11-05', amount: -123456, description: 'Mercado; filial 2' },
      { fitId: '', date: '2026-11-06', amount: 530000, description: 'Salário' },
    ]);
    // Formato do extrato de conta do Nubank: descrição tem preferência sobre o identificador.
    expect(parseStatement('Data,Valor,Identificador,Descrição\n07/11/2026,-45.00,abc-123,Farmácia')).toEqual([
      { fitId: '', date: '2026-11-07', amount: -4500, description: 'Farmácia' },
    ]);
  });
});

describe('plano de importação', () => {
  const tx = (p: { id: string; amount: number; date: string } & Partial<Parameters<typeof planImport>[2][number]>) => ({
    type: 'EXPENSE' as const, categoryId: null, accountId: 'main', destinationAccountId: null, description: 'x', ...p,
  });
  const entry = (amount: number, date = '2026-11-05', description = 'Mercado', fitId = '1') => ({ fitId, date, amount, description });

  it('não repete o que já foi importado nem o que foi digitado à mão (até 1 dia de diferença)', () => {
    const first = planImport('main', [entry(-5000), entry(-5000)], []);
    expect(first.inserts.map((i) => i.id)).toEqual(['ofx-main-2026-11-05--5000-1-0', 'ofx-main-2026-11-05--5000-1-1']);

    const again = planImport('main', [entry(-5000), entry(-5000)], first.inserts.map((i) => tx({ ...i })));
    expect(again).toMatchObject({ inserts: [], repeated: 2, manual: 0 });

    // Um gasto digitado no dia 4 casa com um só dos dois lançamentos do extrato; receita de mesmo valor não casa.
    const manual = planImport('main', [entry(-5000), entry(-5000)], [
      tx({ id: 'm1', amount: 5000, date: '2026-11-04' }),
      tx({ id: 'm2', amount: 5000, date: '2026-11-05', type: 'INCOME' }),
      tx({ id: 'm3', amount: 5000, date: '2026-11-08' }),
    ]);
    expect(manual).toMatchObject({ manual: 1, repeated: 0 });
    expect(manual.inserts).toHaveLength(1);
  });

  it('reconhece o outro lado de uma transferência entre contas próprias e não duplica ao reimportar', () => {
    const saida = tx({ id: 'ofx-main-2026-11-05--20000-9-0', amount: 20000, date: '2026-11-05' });
    const plan = planImport('poup', [entry(20000, '2026-11-06', 'Transferência recebida')], [saida]);
    expect(plan).toMatchObject({ inserts: [], transfers: [{ id: saida.id, from: 'main', to: 'poup' }] });

    // Depois de convertida, a transferência conta como "já existe" nas duas contas.
    const converted = tx({ ...saida, type: 'TRANSFER', destinationAccountId: 'poup' });
    expect(planImport('poup', [entry(20000, '2026-11-06')], [converted])).toMatchObject({ inserts: [], transfers: [], manual: 1 });

    // Lado inverso: entrada importada antes, saída chegando agora.
    const entrada = tx({ id: 'ofx-poup-2026-11-06-20000-9-0', amount: 20000, date: '2026-11-06', type: 'INCOME', accountId: 'poup' });
    expect(planImport('main', [entry(-20000)], [entrada]).transfers).toEqual([{ id: entrada.id, from: 'main', to: 'poup' }]);

    // Lançamento já categorizado pelo usuário não é convertido.
    expect(planImport('poup', [entry(20000)], [tx({ ...saida, categoryId: 'c1' })]).transfers).toEqual([]);
  });

  it('usa a categoria da movimentação mais recente com a mesma descrição e tipo', () => {
    const history = [
      tx({ id: 'a', amount: 100, date: '2026-10-20', description: 'MERCADO', categoryId: 'cat-novo' }),
      tx({ id: 'b', amount: 100, date: '2026-09-20', description: 'Mercado', categoryId: 'cat-antigo' }),
      tx({ id: 'c', amount: 100, date: '2026-10-25', description: 'Mercado', categoryId: 'cat-receita', type: 'INCOME' }),
    ];
    const plan = planImport('main', [entry(-5000), entry(-700, '2026-11-05', 'Padaria', '2')], history);
    expect(plan.inserts.map((i) => i.categoryId)).toEqual(['cat-novo', null]);
  });
});
