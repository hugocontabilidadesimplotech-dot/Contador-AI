import React from 'react';
import ArrowUpRightIcon from '../components/icons/ArrowUpRightIcon';
import ArrowDownRightIcon from '../components/icons/ArrowDownRightIcon';
import BellIcon from '../components/icons/BellIcon';
import UserCircleIcon from '../components/icons/UserCircleIcon';
import ChevronDownIcon from '../components/icons/ChevronDownIcon';
import CurrencyDollarIcon from '../components/icons/CurrencyDollarIcon';
import ChartBarIcon from '../components/icons/ChartBarIcon';
import ScaleIcon from '../components/icons/ScaleIcon';
import { User, Company, Transaction } from '../types';
import DocumentArrowDownIcon from '../components/icons/DocumentArrowDownIcon';
import PencilSquareIcon from '../components/icons/PencilSquareIcon';
import { REVENUE_ACCOUNTS, EXPENSE_ACCOUNTS } from '../constants';


interface DashboardProps {
    user: User | null;
    company: Company | null;
    processedTransactions: Transaction[];
    onEditTransaction: (transactionId: string) => void;
    onAddManualEntry: () => void;
}

const DashboardHeader: React.FC<{ user: User | null; company: Company | null; }> = ({ user, company }) => (
    <header className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
            <h1 className="text-3xl font-bold text-slate-900">
                {company ? `Dashboard: ${company.name}` : 'Dashboard Gerencial'}
            </h1>
            <p className="text-slate-600 mt-1">
                 {company ? `Visão geral da empresa ${company.data.razaoSocial}.` : 'Selecione uma empresa em "Gerenciar" para ver seus dados.'}
            </p>
        </div>
        <div className="flex items-center space-x-2 w-full md:w-auto">
            <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full">
                <BellIcon />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="flex items-center space-x-2 p-2 rounded-lg hover:bg-slate-100">
                <UserCircleIcon />
                <span className="hidden lg:inline text-sm font-medium text-slate-700">{user?.name || 'Usuário'}</span>
                <ChevronDownIcon />
            </div>
        </div>
    </header>
);

const StatCard: React.FC<{ title: string; value: string; change: string; isPositive: boolean; icon: React.ReactNode; color: string; }> = ({ title, value, change, isPositive, icon, color }) => (
    <div className={`bg-white p-5 rounded-xl shadow-md border-t-4 ${color}`}>
        <div className="flex justify-between items-start">
            <div>
                <p className="text-sm font-medium text-slate-500">{title}</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
            </div>
            <div className="p-2 bg-slate-100 rounded-full">{icon}</div>
        </div>
        <div className="flex items-center text-xs mt-3">
            <span className={`flex items-center font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? <ArrowUpRightIcon /> : <ArrowDownRightIcon />}
                {change}
            </span>
            <span className="text-slate-500 ml-1">vs. mês anterior</span>
        </div>
    </div>
);


const Dashboard: React.FC<DashboardProps> = ({ user, company, processedTransactions, onEditTransaction, onAddManualEntry }) => {

    if (!company) {
        return (
            <div className="space-y-6">
                <DashboardHeader user={user} company={null} />
                <div className="mt-8 bg-white p-8 rounded-xl shadow-md text-center">
                    <h2 className="text-xl font-semibold text-slate-800">Nenhuma empresa selecionada</h2>
                    <p className="text-slate-500 mt-2">Vá para a aba 'Empresas' e clique em 'Gerenciar' para ver os dados de uma empresa específica.</p>
                </div>
            </div>
        );
    }

    // --- Dynamic Data Calculation ---
    let totalRevenue = 0;
    let totalExpenses = 0;

    (processedTransactions || []).forEach(tx => {
        if (REVENUE_ACCOUNTS.includes(tx.classification) && tx.value > 0) {
            totalRevenue += tx.value;
        } else if (EXPENSE_ACCOUNTS.includes(tx.classification) && tx.value < 0) {
            totalExpenses += Math.abs(tx.value);
        }
    });

    const netResult = totalRevenue - totalExpenses;

    // FIX: Replaced reduce with a more type-safe version using a generic argument to prevent type inference issues.
    const groupedTransactions = (processedTransactions || []).reduce<Record<string, Transaction[]>>((acc, tx) => {
        const key = tx.classification;
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(tx);
        return acc;
    }, {});

    const totalDebit = (processedTransactions || []).reduce((sum, tx) => sum + (tx.value < 0 ? Math.abs(tx.value) : 0), 0);
    const totalCredit = (processedTransactions || []).reduce((sum, tx) => sum + (tx.value > 0 ? tx.value : 0), 0);
    const difference = totalDebit - totalCredit;
    const isBalanced = Math.abs(difference) < 0.01;

    const handleDownloadPdf = () => {
        const formatValue = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const today = new Date().toLocaleDateString('pt-BR');

        const tableRowsByGroup = Object.entries(groupedTransactions).map(([classification, txs]) => {
            const groupDebit = txs.reduce((sum, tx) => sum + (tx.value < 0 ? Math.abs(tx.value) : 0), 0);
            const groupCredit = txs.reduce((sum, tx) => sum + (tx.value > 0 ? tx.value : 0), 0);

            const individualRows = txs.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(tx => `
                <tr class="transaction-row">
                    <td>${new Date(tx.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
                    <td>${tx.description}</td>
                    <td class="currency">${tx.value < 0 ? formatValue(Math.abs(tx.value)) : ''}</td>
                    <td class="currency">${tx.value > 0 ? formatValue(tx.value) : ''}</td>
                </tr>
            `).join('');

            return `
                <tbody>
                    <tr class="group-header"><th colspan="4">${classification}</th></tr>
                    ${individualRows}
                    <tr class="group-total">
                        <td colspan="2">Total do Grupo</td>
                        <td class="currency">${formatValue(groupDebit)}</td>
                        <td class="currency">${formatValue(groupCredit)}</td>
                    </tr>
                </tbody>
            `;
        }).join('');

        const htmlContent = `
            <html>
                <head>
                    <title>Balancete Detalhado - ${company?.name}</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; margin: 0; padding: 2.5em; color: #333; }
                        .header { text-align: center; border-bottom: 3px double #ddd; padding-bottom: 1em; margin-bottom: 1em; }
                        .header h1 { font-size: 1.8em; margin: 0; color: #1a202c; }
                        .header p { margin: 0.2em 0; color: #718096; font-size: 0.9em; }
                        .report-title { text-align: center; margin-bottom: 2em; }
                        table { width: 100%; border-collapse: collapse; font-size: 0.9em; }
                        th, td { border: 1px solid #e2e8f0; padding: 0.75em; text-align: left; }
                        .main-thead th { background-color: #f7fafc; font-weight: 600; color: #4a5568; }
                        .currency { text-align: right; font-family: monospace; }
                        .group-header th { background-color: #edf2f7; font-size: 1.1em; padding-top: 1em; margin-top: 1em; border-top: 2px solid #a0aec0; }
                        .transaction-row td { font-size: 0.9em; color: #555; }
                        .group-total td { font-weight: bold; background-color: #f7fafc; }
                        .grand-total-row td { font-weight: bold; font-size: 1.1em; background-color: #e2e8f0; border-top: 3px double #a0aec0; }
                        .footer { text-align: center; margin-top: 3em; padding-top: 1.5em; border-top: 1px solid #ddd; font-size: 0.8em; color: #718096; }
                        .signature-line { margin-top: 4em; display: inline-block; border-top: 1px solid #333; padding: 0 5em; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>${company?.name || 'Empresa'}</h1>
                        <p>${company?.data.razaoSocial || ''}</p>
                        <p>CNPJ: ${company?.data.cnpj || ''}</p>
                    </div>
                    <div class="report-title">
                        <h2>Balancete de Verificação Detalhado</h2>
                        <p>Data de Geração: ${today}</p>
                    </div>
                    <table>
                        <thead class="main-thead">
                            <tr>
                                <th>Data</th>
                                <th>Descrição</th>
                                <th class="currency">Débito</th>
                                <th class="currency">Crédito</th>
                            </tr>
                        </thead>
                        ${tableRowsByGroup}
                        <tfoot>
                            <tr class="grand-total-row">
                                <td colspan="2">TOTAIS GERAIS</td>
                                <td class="currency">${formatValue(totalDebit)}</td>
                                <td class="currency">${formatValue(totalCredit)}</td>
                            </tr>
                        </tfoot>
                    </table>
                    <p style="text-align: center; margin-top: 2em; font-weight: bold; ${isBalanced ? 'color: green;' : 'color: red;'}">
                        Verificação Partida Dobrada: ${isBalanced ? 'OK' : `Diferença de ${formatValue(difference)}`}
                    </p>
                    <div class="footer">
                        <div class="signature-line">Contador Responsável (CRC: 1SP999999/O-0)</div>
                        <p style="margin-top: 2em;">Página 1 de 1</p>
                    </div>
                    <script>
                        setTimeout(() => { window.print(); window.close(); }, 250);
                    </script>
                </body>
            </html>
        `;
        const printWindow = window.open('', '_blank');
        printWindow?.document.write(htmlContent);
        printWindow?.document.close();
    };
    
    return (
        <div className="space-y-6">
            <DashboardHeader user={user} company={company}/>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Faturamento" value={`R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} change="0.0%" isPositive={true} icon={<CurrencyDollarIcon />} color="border-green-500" />
                <StatCard title="Despesas" value={`R$ ${totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} change="0.0%" isPositive={false} icon={<ChartBarIcon />} color="border-red-500" />
                <StatCard title="Resultado Líquido" value={`R$ ${netResult.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} change="0.0%" isPositive={netResult >= 0} icon={<ScaleIcon />} color="border-blue-500" />
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                    <h3 className="text-xl font-semibold text-slate-800 mb-2 sm:mb-0">Balancete Detalhado</h3>
                    <div className="flex items-center space-x-2">
                        <button onClick={onAddManualEntry} className="flex items-center bg-slate-100 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-200 transition-colors">
                            <PencilSquareIcon />
                            <span className="ml-2">Adicionar Lançamento Manual</span>
                        </button>
                        <button onClick={handleDownloadPdf} disabled={processedTransactions.length === 0} className="flex items-center bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-indigo-300">
                            <DocumentArrowDownIcon />
                            <span className="ml-2">Baixar PDF para Auditoria</span>
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    {Object.keys(groupedTransactions).sort().map(classification => {
                        const txs = groupedTransactions[classification];
                        const groupDebit = txs.reduce((sum, tx) => sum + (tx.value < 0 ? Math.abs(tx.value) : 0), 0);
                        const groupCredit = txs.reduce((sum, tx) => sum + (tx.value > 0 ? tx.value : 0), 0);
                        
                        return (
                            <details key={classification} className="bg-slate-50 rounded-lg border border-slate-200 open:shadow-lg open:bg-white" open>
                                <summary className="p-3 cursor-pointer flex justify-between items-center font-semibold text-slate-700 hover:bg-slate-100 rounded-t-lg">
                                    <span className="flex-1">{classification}</span>
                                    <span className="w-32 text-right font-mono text-red-600 pr-4">{groupDebit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    <span className="w-32 text-right font-mono text-green-600">{groupCredit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </summary>
                                <div className="border-t border-slate-200">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-slate-100">
                                            <tr>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Data</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Descrição</th>
                                                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase">Débito</th>
                                                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase">Crédito</th>
                                                <th className="px-3 py-2 text-center text-xs font-medium text-slate-500 uppercase">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {txs.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(tx => (
                                                <tr key={tx.id} className="hover:bg-slate-50">
                                                    <td className="px-3 py-2 whitespace-nowrap">{new Date(tx.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
                                                    <td className="px-3 py-2">{tx.description}</td>
                                                    <td className="px-3 py-2 text-right font-mono text-slate-600">{tx.value < 0 ? Math.abs(tx.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '-'}</td>
                                                    <td className="px-3 py-2 text-right font-mono text-slate-600">{tx.value > 0 ? tx.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '-'}</td>
                                                    <td className="px-3 py-2 text-center">
                                                        <button onClick={() => onEditTransaction(tx.id)} className="text-indigo-600 hover:text-indigo-900" title="Editar Lançamento">
                                                            <PencilSquareIcon />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </details>
                        )
                    })}
                </div>

                <div className="mt-4 border-t-2 border-slate-300 pt-3">
                    <div className="flex justify-end items-center font-bold text-base">
                        <span className="w-auto px-3 py-2 text-left text-slate-800">TOTAIS</span>
                        <span className="w-32 text-right font-mono text-red-700 pr-4">{totalDebit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        <span className="w-32 text-right font-mono text-green-700">{totalCredit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>

                <div className={`mt-4 border-t pt-4 flex justify-end items-center space-x-4 text-sm font-semibold ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                    <span>Partida Dobrada:</span>
                    <span>{isBalanced ? 'OK' : `Diferença de R$ ${difference.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}</span>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
