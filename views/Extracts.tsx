import React, { useState, useCallback } from 'react';
import { processBankStatement } from '../services/geminiService';
import { Transaction, View, Company } from '../types';
import { fileToBase64 } from '../utils/helpers';
import InformationCircleIcon from '../components/icons/InformationCircleIcon';
import { ALL_ACCOUNTS } from '../constants';

interface ExtractsProps {
    selectedCompany: Company | null;
    setProcessedTransactions: (transactions: Transaction[]) => void;
    setCurrentView: (view: View) => void;
    onAddManualEntry: () => void;
}

// Fix: Defined the ViewState type to manage component states.
type ViewState = 'idle' | 'uploading' | 'processing' | 'editing';

const Extracts: React.FC<ExtractsProps> = ({ selectedCompany, setProcessedTransactions, setCurrentView, onAddManualEntry }) => {
    const [files, setFiles] = useState<File[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [viewState, setViewState] = useState<ViewState>('idle');
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [bankInfo, setBankInfo] = useState<{ name: string; finalBalance: number } | null>(null);


    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setFiles(Array.from(event.target.files));
            setViewState('uploading');
        }
    };

    const handleProcessClick = useCallback(async () => {
        if (files.length === 0) return;

        setViewState('processing');
        setStatusMessage(null);
        setTransactions([]);
        setBankInfo(null);
        
        try {
            let allTransactions: Transaction[] = [];
            let finalBankInfo: { name: string; finalBalance: number } | null = null;


            for (const file of files) {
                let content;
                if (file.type.startsWith('image/') || file.type === 'application/pdf') {
                    content = {
                        data: await fileToBase64(file),
                        mimeType: file.type
                    };
                } else { // Assume text for .csv, .ofx, etc.
                    content = {
                        data: await file.text(),
                        mimeType: 'text/plain'
                    };
                }

                const resultJson = await processBankStatement(content, selectedCompany);
                const parsedResult = JSON.parse(resultJson);

                if (parsedResult.transacoes && parsedResult.transacoes.length > 0) {
                     const processedTransactions = parsedResult.transacoes.map((tx: any, index: number) => ({
                        ...tx,
                        id: `${file.name}-${Date.now()}-${index}`
                    }));
                    allTransactions = [...allTransactions, ...processedTransactions];
                    if (parsedResult.banco && typeof parsedResult.saldoFinal === 'number') {
                        finalBankInfo = { name: parsedResult.banco, finalBalance: parsedResult.saldoFinal };
                    }
                }
            }
            
            if (allTransactions.length === 0) {
                 setStatusMessage("A IA não conseguiu extrair nenhuma transação dos documentos fornecidos. Tente arquivos mais nítidos ou com formato padrão.");
                 setViewState('uploading');
                 return;
            }
            
            setBankInfo(finalBankInfo);
            setStatusMessage(finalBankInfo?.name || (files.length > 1 ? 'Múltiplos Bancos' : 'Banco não identificado'));
            setTransactions(allTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
            setViewState('editing');

        } catch (err) {
            console.error(err);
            setStatusMessage('Falha ao processar os extratos. A IA pode não ter conseguido entender o formato ou ocorreu um erro inesperado.');
            setViewState('uploading');
        }
    }, [files, selectedCompany]);


    const handleTransactionChange = (id: string, field: keyof Transaction, value: string | number) => {
        setTransactions(prev => 
            prev.map(tx => tx.id === id ? { ...tx, [field]: value } : tx)
        );
    };

    const handleDeleteTransaction = (id: string) => {
        setTransactions(prev => prev.filter(tx => tx.id !== id));
    };

    const handleReset = () => {
        setFiles([]);
        setTransactions([]);
        setStatusMessage(null);
        setBankInfo(null);
        setViewState('idle');
    };
    
    const handleSaveAndNavigate = () => {
        let finalTransactions = [...transactions];
        if (bankInfo && bankInfo.finalBalance !== 0) {
            // LÓGICA DE ZERAMENTO EXPLÍCITA E CORRIGIDA:
            // Saldo POSITIVO (ativo) no extrato precisa de um DÉBITO no balancete. No sistema, débito é um valor NEGATIVO.
            // Saldo NEGATIVO (passivo) no extrato precisa de um CRÉDITO no balancete. No sistema, crédito é um valor POSITIVO.
            // Portanto, o valor da transação no sistema é o INVERSO do valor do saldo do extrato.
            let balanceValue = 0;
            if (bankInfo.finalBalance > 0) {
                // Saldo positivo, lançar a débito
                balanceValue = -Math.abs(bankInfo.finalBalance);
            } else {
                // Saldo negativo, lançar a crédito
                balanceValue = Math.abs(bankInfo.finalBalance);
            }
            
            const balanceTransaction: Transaction = {
                id: `balance-${Date.now()}`,
                date: transactions[transactions.length - 1]?.date || new Date().toISOString().split('T')[0],
                description: `Ajuste de Saldo Final - ${bankInfo.name}`,
                value: balanceValue,
                classification: 'Bancos Conta Movimento',
                confidenceScore: 1,
                needsReview: false,
            };
            finalTransactions.push(balanceTransaction);
        }
        setProcessedTransactions(finalTransactions);
        setCurrentView('reports');
    }
    
    if (!selectedCompany) {
        return (
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Processar Extratos Bancários</h1>
                <div className="mt-8 bg-white p-8 rounded-xl shadow-md text-center">
                    <h2 className="text-xl font-semibold text-slate-800">Nenhuma empresa selecionada</h2>
                    <p className="text-slate-500 mt-2">Vá para a aba 'Empresas' e clique em 'Gerenciar' para selecionar uma empresa antes de processar extratos.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-slate-900">Processar Extratos para: {selectedCompany.name}</h1>
                <p className="text-slate-600 mt-1">Faça o upload dos extratos em formato PDF, CSV ou OFX para a IA classificar as transações.</p>
            </header>

            {/* UPLOAD VIEW */}
            {(viewState === 'idle' || viewState === 'uploading') && (
                 <div className="bg-white p-6 rounded-xl shadow-md">
                    <h2 className="text-xl font-semibold mb-4">1. Upload de Arquivos</h2>
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-10 text-center">
                        <input id="file-upload" type="file" multiple accept=".pdf,.csv,.ofx,image/png,image/jpeg" onChange={handleFileChange} className="hidden" />
                        <label htmlFor="file-upload" className="cursor-pointer text-indigo-600 font-semibold">
                            Arraste extratos bancários aqui ou clique para selecionar
                        </label>
                        <p className="text-xs text-slate-500 mt-2">Suporte para PDF, CSV, OFX, PNG e JPG</p>
                    </div>

                    {files.length > 0 && (
                        <div className="mt-6">
                            <h3 className="font-semibold">Arquivos Carregados:</h3>
                            <ul className="list-disc list-inside mt-2 text-slate-700">
                                {files.map((file, i) => <li key={i}>{file.name}</li>)}
                            </ul>
                            <div className="mt-4 text-right">
                                <button onClick={handleProcessClick} className="bg-indigo-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-indigo-700 transition-colors">
                                    Processar {files.length} Extrato(s)
                                </button>
                            </div>
                        </div>
                    )}
                    {statusMessage && viewState === 'uploading' && <div className="mt-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-r-lg shadow" role="alert">{statusMessage}</div>}
                 </div>
            )}

            {/* PROCESSING VIEW */}
            {viewState === 'processing' && (
                <div className="text-center p-8 bg-white rounded-xl shadow-md">
                    <div className="inline-flex items-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                        <p className="ml-4 text-slate-600 text-lg">IA processando e classificando transações...</p>
                    </div>
                </div>
            )}

            {/* EDITING VIEW */}
            {viewState === 'editing' && (
                <div className="bg-white p-6 rounded-xl shadow-md animate-fade-in">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">
                            2. Revise e Edite as Transações 
                            {statusMessage && <span className="text-base font-normal text-slate-500"> - Banco: {statusMessage}</span>}
                        </h2>
                        <button onClick={onAddManualEntry} className="bg-slate-100 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-200 transition-colors text-sm">
                            + Adicionar Lançamento Manual
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                         <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Data</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Descrição</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Valor (R$)</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Classificação (Sugestão da IA)</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {transactions.map(tx => (
                                    <tr key={tx.id} className={`hover:bg-slate-50 ${tx.needsReview ? 'bg-amber-50' : ''}`}>
                                        <td><input type="date" value={tx.date} onChange={e => handleTransactionChange(tx.id, 'date', e.target.value)} className="w-full p-2 border-transparent focus:border-indigo-500 rounded focus:ring-0 bg-transparent"/></td>
                                        <td><input type="text" value={tx.description} onChange={e => handleTransactionChange(tx.id, 'description', e.target.value)} className="w-full p-2 border-transparent focus:border-indigo-500 rounded focus:ring-0 bg-transparent"/></td>
                                        <td className="text-right"><input type="number" step="0.01" value={tx.value} onChange={e => handleTransactionChange(tx.id, 'value', parseFloat(e.target.value))} className={`w-32 p-2 border-transparent focus:border-indigo-500 rounded focus:ring-0 bg-transparent text-right font-medium ${tx.value >= 0 ? 'text-green-600' : 'text-red-600'}`}/></td>
                                        <td className="relative group">
                                            <select value={tx.classification} onChange={e => handleTransactionChange(tx.id, 'classification', e.target.value)} className="w-full p-2 border-transparent focus:border-indigo-500 rounded focus:ring-0 bg-transparent pr-8">
                                                {!ALL_ACCOUNTS.includes(tx.classification) && (
                                                    <option key={tx.classification} value={tx.classification}>
                                                        {tx.classification}
                                                    </option>
                                                )}
                                                {ALL_ACCOUNTS.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                             {tx.needsReview && (
                                                <div className="absolute top-1/2 right-2 -translate-y-1/2 text-amber-500 cursor-help">
                                                    <InformationCircleIcon />
                                                    <div className="absolute bottom-full mb-2 right-0 w-48 bg-slate-800 text-white text-xs rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                                        Revisão recomendada.
                                                        <br />
                                                        Confiança da IA: {((tx.confidenceScore || 0) * 100).toFixed(0)}%
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                        <td className="text-center">
                                            <button onClick={() => handleDeleteTransaction(tx.id)} className="text-red-500 hover:text-red-700" title="Excluir Transação">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.033-2.134H8.033c-1.12 0-2.033.954-2.033 2.134v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-6 flex justify-between items-center">
                         <button onClick={handleReset} className="bg-slate-500 text-white font-semibold py-2 px-6 rounded-lg hover:bg-slate-600 transition-colors">
                            Desfazer e Recomeçar
                        </button>
                        <button onClick={handleSaveAndNavigate} className="bg-green-500 text-white font-semibold py-2 px-6 rounded-lg hover:bg-green-600 transition-colors">
                            Salvar e ir para Balancete
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Extracts;