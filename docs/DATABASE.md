# Banco de dados

SQLite local (`financas.db`), criado por `src/database/migrations.ts`.

- Migrations numeradas, controladas por `PRAGMA user_version`. Nunca editar uma migration publicada; adicionar outra ao final.
- `PRAGMA foreign_keys = ON` a cada abertura; `journal_mode = WAL`.
- Valores monetários: `INTEGER` em centavos (R$ 1.294,35 → `129435`). Nunca float.
- Datas de negócio: `TEXT 'yyyy-MM-dd'`. Carimbos `created_at`/`updated_at`: ISO 8601 completo.
- Ids: UUID (`TEXT`). Categorias e contas padrão usam ids fixos (`cat-expense-alimentacao`, `acc-main`).
- Booleanos: `INTEGER 0/1` com `CHECK`.

## Tabelas (versão 1)

### accounts
| coluna | tipo | regra |
| --- | --- | --- |
| id | TEXT PK | |
| name | TEXT | 1–60 caracteres |
| type | TEXT | CHECKING, WALLET, SAVINGS, INVESTMENT |
| initial_balance | INTEGER | centavos, pode ser negativo |
| archived | INTEGER | 0/1 |

Padrão: Conta corrente (`acc-main`), Carteira (`acc-wallet`), Investimentos (`acc-invest`).

### categories
`id, name, kind (INCOME|EXPENSE|INVESTMENT), is_default, archived` — `UNIQUE(name, kind)`.
Categorias nunca são apagadas, só arquivadas (preserva histórico). Categorias de INVESTMENT são o "tipo" do aporte (CDB, Tesouro...).

### transactions
| coluna | regra |
| --- | --- |
| type | INCOME, EXPENSE, INVESTMENT, TRANSFER |
| amount | INTEGER > 0 (o sinal vem do tipo) |
| category_id | FK categories, opcional |
| account_id | FK accounts, obrigatório (origem) |
| destination_account_id | obrigatório em TRANSFER; opcional em INVESTMENT; proibido em INCOME/EXPENSE; ≠ origem |
| date | `yyyy-MM-dd` (CHECK por GLOB) |
| notes, payment_method, institution | opcionais |
| recurring_id | FK recurring_transactions, `ON DELETE SET NULL` |

Índices: `date`, `account_id`, `category_id`, `recurring_id`.

### recurring_transactions
`type (INCOME|EXPENSE), description, amount, category_id, account_id, day_of_month (1–31), start_date, auto_post, active`.
Uma ocorrência do mês está "paga" quando existe transação com `recurring_id` = recorrência e data no mês.

### credit_cards
`name, bank, limit_amount, closing_day (1–31), due_day (1–31), archived`.

### installment_purchases
Compra parcelada. `credit_card_id` preenchido = compra no cartão (à vista = 1 parcela); nulo = carnê, boleto, empréstimo.
`total_amount, installment_count (1–120), purchase_date, category_id`. `ON DELETE CASCADE` a partir do cartão.

### installments
`purchase_id (CASCADE), number, amount, due_date, transaction_id`. `UNIQUE(purchase_id, number)`.
Parcela paga = `transaction_id` aponta para a despesa real. Excluir essa despesa volta a parcela a pendente (`SET NULL`).

### financial_goals
`name, target_amount > 0, current_amount >= 0, deadline (opcional)`.

### budgets
`category_id UNIQUE (CASCADE), limit_amount > 0` — limite mensal que vale para todos os meses.

### settings
Chave/valor: `userName`, `theme` (system|light|dark), `payday` (1–31).

## Relacionamentos

```
accounts 1─* transactions (account_id, destination_account_id)
categories 1─* transactions, recurring_transactions, installment_purchases, budgets(1─1)
recurring_transactions 1─* transactions (recurring_id)
credit_cards 1─* installment_purchases 1─* installments *─1 transactions (quando paga)
```

## Diferenças em relação às tabelas sugeridas

| Sugerida | Decisão |
| --- | --- |
| `credit_card_transactions` | `installment_purchases` com `credit_card_id` opcional: um único modelo para compras no cartão e parcelamentos fora dele. |
| `investments` | Aporte é uma `transaction` do tipo INVESTMENT (tipo = categoria, instituição = `institution`, conta de investimento = destino). Evita duplicar valores. |
| `monthly_closures` | O fechamento é calculado sob demanda a partir das transações (tela Análises). Guardar cópia criaria dados que podem divergir. |
| `users` | Ainda não existe; ver "Preparado para o futuro" em ARCHITECTURE.md. |

## Dados demonstrativos

`src/database/seed.ts` — todos os ids começam com `demo-`. Carregar/remover em Mais → Configurações.
Remoção = `DELETE ... WHERE id LIKE 'demo-%'` em cada tabela.
