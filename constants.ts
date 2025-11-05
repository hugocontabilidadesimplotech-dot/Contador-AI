export const REVENUE_ACCOUNTS = [
    'Vendas de Produtos',
    'Vendas de Mercadorias',
    'Prestação de Serviços',
    'Receita de Assinaturas',
    'Juros Ativos (Rendimentos)',
    'Outras Receitas',
];

export const EXPENSE_ACCOUNTS = [
    'Custo das Mercadorias Vendidas (CMV)',
    'Salários e Ordenados',
    'Encargos Sociais',
    'Aluguel',
    'Energia Elétrica / Água',
    'Telefonia / Internet',
    'Propaganda e Marketing',
    'Material de Escritório',
    'Honorários Contábeis',
    'Impostos e Tributos',
    'Despesas Bancárias / IOF',
    'Juros Passivos (Empréstimos)',
    'Frete sobre Vendas',
    'Outras Despesas Operacionais',
];

export const EQUITY_ACCOUNTS = [
    'Bancos Conta Movimento',
    'Transferência Interna',
    'Compra de Ativo Imobilizado',
    'Pagamento de Fornecedores',
    'Pagamento de Empréstimos',
    'Aporte de Capital / Adiantamento',
    'Distribuição de Lucros / Retirada',
    'Ajustes e Estornos',
];

export const ALL_ACCOUNTS = [
    ...REVENUE_ACCOUNTS,
    ...EXPENSE_ACCOUNTS,
    ...EQUITY_ACCOUNTS,
].sort((a, b) => a.localeCompare(b));
