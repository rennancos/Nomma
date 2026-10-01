import type { AccountType, CategoryKind, PaymentMethod, TransactionType } from '@/types';

export const DEFAULT_CATEGORIES: Record<CategoryKind, string[]> = {
  INCOME: ['Salário', 'Freelance', 'Renda extra', 'Venda', 'Reembolso', 'Outros'],
  EXPENSE: [
    'Moradia', 'Alimentação', 'Delivery', 'Mercado', 'Transporte', 'Uber', 'Combustível', 'Internet',
    'Telefone', 'Streaming', 'Lazer', 'Viagens', 'Saúde', 'Educação', 'Cartão de crédito', 'Empréstimos',
    'Compras', 'Roupas', 'Assinaturas', 'Outros',
  ],
  INVESTMENT: [
    'Reserva de emergência', 'CDB', 'Tesouro Direto', 'Ações', 'ETF', 'FIIs', 'Criptomoedas', 'Poupança', 'Outros',
  ],
};

const slug = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');

/** Id estável das categorias padrão (usado por migrations e seed). */
export const defaultCategoryId = (kind: CategoryKind, name: string) => `cat-${kind.toLowerCase()}-${slug(name)}`;

export const DEFAULT_ACCOUNTS: { id: string; name: string; type: AccountType }[] = [
  { id: 'acc-main', name: 'Conta corrente', type: 'CHECKING' },
  { id: 'acc-wallet', name: 'Carteira', type: 'WALLET' },
  { id: 'acc-invest', name: 'Investimentos', type: 'INVESTMENT' },
];

export const TYPE_LABELS: Record<TransactionType, string> = {
  INCOME: 'Receita',
  EXPENSE: 'Despesa',
  INVESTMENT: 'Investimento',
  TRANSFER: 'Transferência',
};

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  CHECKING: 'Conta corrente',
  WALLET: 'Carteira / dinheiro',
  SAVINGS: 'Poupança',
  INVESTMENT: 'Investimentos',
};

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  PIX: 'Pix',
  DEBIT: 'Débito',
  CASH: 'Dinheiro',
  CREDIT: 'Crédito',
  BOLETO: 'Boleto',
  OTHER: 'Outro',
};

export const DEFAULT_PAYDAY = 5;
