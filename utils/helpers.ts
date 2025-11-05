import { Transaction } from '../types';
import { REVENUE_ACCOUNTS, EXPENSE_ACCOUNTS } from '../constants';


export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // remove "data:mime/type;base64," prefix
      resolve(result.split(',')[1]);
    };
    reader.onerror = error => reject(error);
  });
};

// --- Report Generation ---

// DRE (Demonstração do Resultado do Exercício)
export const generateDREData = (transactions: Transaction[]) => {

    let totalRevenue = 0;
    let totalExpenses = 0;
    
    transactions.forEach(tx => {
        if (tx.value > 0 && REVENUE_ACCOUNTS.includes(tx.classification)) {
            totalRevenue += tx.value;
        } else if (tx.value < 0 && EXPENSE_ACCOUNTS.includes(tx.classification)) {
            totalExpenses += Math.abs(tx.value);
        }
    });

    const netIncome = totalRevenue - totalExpenses;

    return {
        data: [
            { item: 'Receita Operacional Bruta', valor: `R$ ${totalRevenue.toFixed(2)}` },
            { item: '(-) Despesas Totais', valor: `R$ (${totalExpenses.toFixed(2)})` },
            { item: '(=) Resultado Líquido do Período', valor: `R$ ${netIncome.toFixed(2)}` },
        ],
        netIncome,
    };
};

// Balanço Patrimonial
export const generateBalanceSheetData = (transactions: Transaction[]) => {
    const assets = { circulante: 0, nao_circulante: 0 };
    const liabilities = { circulante: 0, nao_circulante: 0 };
    let equity = { capital: 0, lucros: 0 };

    // Lógica simplificada para demonstração
    let cash = 0;
    transactions.forEach(tx => {
        cash += tx.value;
    });
    assets.circulante = cash > 0 ? cash : 0; // Caixa e Equivalentes
    liabilities.circulante = cash < 0 ? Math.abs(cash) : 0; // Contas a Pagar / Cheque Especial

    // Valores fixos para uma estrutura mais realista
    assets.nao_circulante = 50000; // Imobilizado (Ex: Equipamentos)
    liabilities.circulante += 15000; // Fornecedores
    liabilities.nao_circulante = 20000; // Financiamentos de Longo Prazo

    const totalAssets = assets.circulante + assets.nao_circulante;
    const totalLiabilities = liabilities.circulante + liabilities.nao_circulante;

    const { netIncome } = generateDREData(transactions);
    equity.lucros = netIncome;

    // Capital Social é o item de balanceamento para fechar a equação A = P + PL
    equity.capital = totalAssets - totalLiabilities - equity.lucros;
    
    const totalEquity = equity.capital + equity.lucros;
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

    return {
        assets: [
            { group: 'ATIVO CIRCULANTE', items: [{ name: 'Caixa e Equivalentes', value: assets.circulante }] },
            { group: 'ATIVO NÃO CIRCULANTE', items: [{ name: 'Imobilizado', value: assets.nao_circulante }] }
        ],
        liabilities: [
            { group: 'PASSIVO CIRCULANTE', items: [{ name: 'Fornecedores e Obrigações', value: liabilities.circulante }] },
            { group: 'PASSIVO NÃO CIRCULANTE', items: [{ name: 'Financiamentos', value: liabilities.nao_circulante }] }
        ],
        equity: [
            { group: 'PATRIMÔNIO LÍQUIDO', items: [
                { name: 'Capital Social', value: equity.capital },
                { name: 'Resultado do Período', value: equity.lucros }
            ]}
        ],
        totals: {
            assets: totalAssets,
            liabilities: totalLiabilities,
            equity: totalEquity,
            liabilitiesAndEquity: totalLiabilitiesAndEquity
        }
    };
};

// Professional PDF HTML Generation
export const generateProfessionalPdfHtml = (title: string, description: string, data: any, reportType: string): string => {
    const today = new Date().toLocaleDateString('pt-BR');
    const formatValue = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    let tableHtml: string;

    if (reportType === 'BalanceSheet') {
        const { assets, liabilities, equity, totals } = data as ReturnType<typeof generateBalanceSheetData>;
        
        tableHtml = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 2em;">
                <div style="width: 48%;">
                    <table class="balance-sheet">
                        ${assets.map(g => `
                            <tr><th colspan="2">${g.group}</th></tr>
                            ${g.items.map(i => `<tr><td>${i.name}</td><td class="currency">${formatValue(i.value)}</td></tr>`).join('')}
                        `).join('')}
                        <tr class="total-row"><td>TOTAL DO ATIVO</td><td class="currency">${formatValue(totals.assets)}</td></tr>
                    </table>
                </div>
                <div style="width: 48%;">
                    <table class="balance-sheet">
                        ${liabilities.map(g => `
                            <tr><th colspan="2">${g.group}</th></tr>
                            ${g.items.map(i => `<tr><td>${i.name}</td><td class="currency">${formatValue(i.value)}</td></tr>`).join('')}
                        `).join('')}
                        <tr class="total-row"><td>TOTAL DO PASSIVO</td><td class="currency">${formatValue(totals.liabilities)}</td></tr>

                        ${equity.map(g => `
                             <tr><th colspan="2" style="padding-top: 1.5em;">${g.group}</th></tr>
                             ${g.items.map(i => `<tr><td>${i.name}</td><td class="currency">${formatValue(i.value)}</td></tr>`).join('')}
                        `).join('')}
                        <tr class="total-row"><td>TOTAL DO PATRIMÔNIO LÍQUIDO</td><td class="currency">${formatValue(totals.equity)}</td></tr>
                        
                        <tr class="grand-total-row"><td>TOTAL PASSIVO + PL</td><td class="currency">${formatValue(totals.liabilitiesAndEquity)}</td></tr>
                    </table>
                </div>
            </div>
            <p style="text-align: center; margin-top: 2em; font-weight: bold; ${Math.abs(totals.assets - totals.liabilitiesAndEquity) > 0.01 ? 'color: red;' : 'color: green;'}">
                Verificação: Ativo (${formatValue(totals.assets)}) ${Math.abs(totals.assets - totals.liabilitiesAndEquity) < 0.01 ? '=' : '≠'} Passivo + PL (${formatValue(totals.liabilitiesAndEquity)})
            </p>
        `;
    } else {
        const reportData = Array.isArray(data) ? data : data.data;
        if (!reportData || reportData.length === 0) return '<h1>Relatório Vazio</h1><p>Não há dados para exibir.</p>';
        const headers = Object.keys(reportData[0] || {});
        tableHtml = `
            <table>
                <thead>
                    <tr>${headers.map(h => `<th>${h.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</th>`).join('')}</tr>
                </thead>
                <tbody>
                    ${reportData.map(row => `<tr>${headers.map(h => `<td>${row[h]}</td>`).join('')}</tr>`).join('')}
                </tbody>
            </table>
        `;
    }

    return `
        <html>
            <head>
                <title>${title}</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; margin: 0; padding: 2.5em; color: #333; }
                    .header { text-align: center; border-bottom: 3px double #ddd; padding-bottom: 1em; margin-bottom: 1em; }
                    .header h1 { font-size: 1.8em; margin: 0; color: #1a202c; }
                    .header p { margin: 0.2em 0; color: #718096; font-size: 0.9em; }
                    .report-title { text-align: center; margin-bottom: 2em; }
                    .report-title h2 { font-size: 1.5em; margin-bottom: 0.2em; }
                    .report-title p { color: #555; margin-top: 0; }
                    table { width: 100%; border-collapse: collapse; font-size: 0.9em; }
                    th, td { border: 1px solid #e2e8f0; padding: 0.75em; text-align: left; }
                    th { background-color: #f7fafc; font-weight: 600; color: #4a5568; }
                    tr:nth-child(even) { background-color: #fdfdff; }
                    .footer { text-align: center; margin-top: 3em; padding-top: 1.5em; border-top: 1px solid #ddd; font-size: 0.8em; color: #718096; }
                    .signature-line { margin-top: 4em; display: inline-block; border-top: 1px solid #333; padding: 0 5em; }
                    .currency { text-align: right; }
                    .balance-sheet th { background-color: #edf2f7; }
                    .total-row td { font-weight: bold; background-color: #f7fafc; border-top: 2px solid #cbd5e0; }
                    .grand-total-row td { font-weight: bold; font-size: 1.1em; background-color: #e2e8f0; border-top: 2px solid #a0aec0; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Simplö<span style="color: #667eea;">s</span> Contabilidade</h1>
                    <p>CNPJ: 99.999.999/0001-99 | CRC-SP: 2SP999999/O-9</p>
                    <p>Av. Paulista, 1000 - São Paulo, SP | contato@simplos.com</p>
                </div>
                <div class="report-title">
                    <h2>${title}</h2>
                    <p>Data de Geração: ${today}</p>
                </div>
                ${tableHtml}
                <div class="footer">
                    <div class="signature-line">Contador Responsável (CRC: 1SP999999/O-0)</div>
                    <p style="margin-top: 2em;">Página 1 de 1</p>
                </div>
                <script>
                    setTimeout(() => {
                        window.print();
                        window.close();
                    }, 250);
                </script>
            </body>
        </html>
    `;
};


// SPED File Content Generation
export const generateSpedFileContent = (type: 'ECD' | 'EFD' | 'ECF', transactions: Transaction[]): string => {
    const today = new Date();
    const period = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
    let content = `|0000|LE${type}|${today.toLocaleDateString('pt-BR')}|...|1|\n`;
    content += `|0001|0|\n`; // Abertura do Bloco 0
    content += `|0005|Dados Complementares do Estabelecimento|\n`;
    content += `|0990|Encerramento do Bloco 0|\n`;
    
    if (type === 'ECD') {
        content += `|I001|0|\n`; // Abertura do Bloco I
        transactions.forEach((tx, i) => {
            content += `|I200|Lançamento Contábil ${i+1}|\n`;
            content += `|I250|Partida do Lançamento: ${tx.description}|\n`;
        });
        content += `|I990|Encerramento do Bloco I|\n`;
    }
    
    content += `|9001|0|\n`; // Abertura do Bloco 9
    content += `|9999|Encerramento do Arquivo Digital|\n`;
    return content;
};

// CSV Conversion
// Fix: Changed `data` parameter type from `any[]` to `any` to correctly handle objects with a `data` property.
export const arrayToCsv = (data: any): string => {
    if (data.length === 0) return '';
    const reportData = Array.isArray(data) ? data : data.data;
    if (!reportData || reportData.length === 0) return '';

    const headers = Object.keys(reportData[0]);
    const csvRows = [
        headers.join(','), // header row
        ...reportData.map(row => 
            headers.map(fieldName => {
                let value = row[fieldName] === null || row[fieldName] === undefined ? '' : row[fieldName];
                if (typeof value === 'string') {
                    // Escape quotes and wrap in quotes if it contains commas or newlines
                    value = value.replace(/"/g, '""');
                    if (value.includes(',') || value.includes('\n') || value.includes('\r')) {
                        value = `"${value}"`;
                    }
                }
                return value;
            }).join(',')
        )
    ];
    return csvRows.join('\r\n');
};