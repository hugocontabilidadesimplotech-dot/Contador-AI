import React, { useState, useEffect, useCallback } from 'react';
import { Transaction, AuditFinding as AuditFindingType, ProposedChange, Company } from '../types';
import { auditTrialBalance, proposeCorrections } from '../services/geminiService';
import ReportDownloadCard, { Report } from '../components/ReportDownloadCard';
import WrenchScrewdriverIcon from '../components/icons/WrenchScrewdriverIcon';

interface ReportsProps {
  selectedCompany: Company | null;
  processedTransactions: Transaction[];
  onEditTransaction: (transactionId: string) => void;
  setProcessedTransactions: (transactions: Transaction[]) => void;
}

interface TrialBalanceRow {
  account: string;
  debit: number;
  credit: number;
}

type ReportFlowState = 'idle' | 'auditing' | 'audit_complete' | 'proposing_corrections' | 'generating' | 'reports_ready';

const Reports: React.FC<ReportsProps> = ({ selectedCompany, processedTransactions, onEditTransaction, setProcessedTransactions }) => {
  const [trialBalance, setTrialBalance] = useState<TrialBalanceRow[]>([]);
  const [totals, setTotals] = useState({ debit: 0, credit: 0 });
  
  const [flowState, setFlowState] = useState<ReportFlowState>('idle');
  const [auditFindings, setAuditFindings] = useState<AuditFindingType[]>([]);
  const [proposedCorrections, setProposedCorrections] = useState<ProposedChange[]>([]);
  const [selectedCorrections, setSelectedCorrections] = useState<Set<string>>(new Set());
  const [generationProgress, setGenerationProgress] = useState(0);

  // Recalculate trial balance whenever transactions change
  useEffect(() => {
    if (processedTransactions.length > 0) {
      const balanceMap = new Map<string, { debit: number; credit: number }>();
      processedTransactions.forEach(tx => {
        const entry = balanceMap.get(tx.classification) || { debit: 0, credit: 0 };
        if (tx.value < 0) {
          entry.debit += Math.abs(tx.value);
        } else {
          entry.credit += tx.value;
        }
        balanceMap.set(tx.classification, entry);
      });

      const balanceData = Array.from(balanceMap.entries()).map(([account, values]) => ({
        account,
        ...values,
      })).sort((a,b) => a.account.localeCompare(b.account));
      
      const totalDebit = balanceData.reduce((sum, row) => sum + row.debit, 0);
      const totalCredit = balanceData.reduce((sum, row) => sum + row.credit, 0);
      
      setTrialBalance(balanceData);
      setTotals({ debit: totalDebit, credit: totalCredit });
      // Reset flow if data changes, forcing a new audit
      setFlowState('idle');
      setAuditFindings([]);
      setProposedCorrections([]);
      setSelectedCorrections(new Set());
    }
  }, [processedTransactions]);

  const handleRunAudit = useCallback(async () => {
    setFlowState('auditing');
    setAuditFindings([]);
    setProposedCorrections([]);
    try {
      const resultJson = await auditTrialBalance(processedTransactions, selectedCompany);
      const findings: AuditFindingType[] = JSON.parse(resultJson);
      setAuditFindings(findings);
    } catch (error) {
      console.error("Audit failed:", error);
      setAuditFindings([{ type: "error", message: "A auditoria da IA falhou. Verifique o console." }]);
    } finally {
      setFlowState('audit_complete');
    }
  }, [processedTransactions, selectedCompany]);

  const handleProposeCorrections = useCallback(async () => {
    const findingsWithIds = auditFindings.filter(f => f.transactionId);
    if (findingsWithIds.length === 0) return;
    
    setFlowState('proposing_corrections');
    setProposedCorrections([]);
    try {
        const resultJson = await proposeCorrections(processedTransactions, findingsWithIds, selectedCompany);
        const corrections: ProposedChange[] = JSON.parse(resultJson);
        setProposedCorrections(corrections);
        setSelectedCorrections(new Set(corrections.map(c => c.transactionId)));
    } catch (error) {
        console.error("Correction proposal failed:", error);
        alert("A IA não conseguiu propor correções. Tente o ajuste manual.");
        setFlowState('audit_complete'); // Go back on error
    }
  }, [processedTransactions, auditFindings, selectedCompany]);

    const handleApplyCorrections = () => {
        const updatedTransactions = processedTransactions.map(tx => {
            if (selectedCorrections.has(tx.id)) {
                const correction = proposedCorrections.find(c => c.transactionId === tx.id);
                if (correction) {
                    return { ...tx, ...correction.updates };
                }
            }
            return tx;
        });
        setProcessedTransactions(updatedTransactions);
        // The useEffect will handle resetting the flow state to 'idle'
    };

    const handleToggleCorrection = (transactionId: string) => {
        setSelectedCorrections(prev => {
            const newSet = new Set(prev);
            if (newSet.has(transactionId)) {
                newSet.delete(transactionId);
            } else {
                newSet.add(transactionId);
            }
            return newSet;
        });
    };

    const handleToggleAllCorrections = () => {
        if (selectedCorrections.size === proposedCorrections.length) {
            setSelectedCorrections(new Set());
        } else {
            setSelectedCorrections(new Set(proposedCorrections.map(c => c.transactionId)));
        }
    };

  const handleGenerateReports = () => {
    setFlowState('generating');
    setGenerationProgress(0);
    const interval = setInterval(() => {
        setGenerationProgress(prev => {
            if (prev >= 100) {
                clearInterval(interval);
                setFlowState('reports_ready');
                return 100;
            }
            return prev + 10;
        });
    }, 200);
  };
  
  const AuditFindingCard: React.FC<{ finding: AuditFindingType }> = ({ finding }) => {
    const colorClasses = {
      error: 'border-red-500 bg-red-50 text-red-800',
      warning: 'border-amber-500 bg-amber-50 text-amber-800',
      suggestion: 'border-blue-500 bg-blue-50 text-blue-800',
    };
    const icon = { error: '❗️', warning: '⚠️', suggestion: '💡' };
    return (
        <div className={`p-4 rounded-lg border-l-4 flex justify-between items-center ${colorClasses[finding.type]}`}>
            <p><span className="mr-2">{icon[finding.type]}</span>{finding.message}</p>
            {finding.transactionId && (
                <button 
                    onClick={() => onEditTransaction(finding.transactionId!)} 
                    className="text-xs font-semibold bg-white border border-slate-300 rounded-full px-3 py-1 hover:bg-slate-100 whitespace-nowrap"
                >
                    Ajustar Lançamento
                </button>
            )}
        </div>
    );
  };
  
  if (processedTransactions.length === 0) {
    return (
        <div>
            <h1 className="text-3xl font-bold text-slate-900">Relatórios e Fechamento</h1>
            <div className="mt-8 bg-white p-8 rounded-xl shadow-md text-center">
                <h2 className="text-xl font-semibold text-slate-800">Nenhum lançamento encontrado</h2>
                <p className="text-slate-500 mt-2">Vá para a aba 'Extratos' para processar um extrato bancário e iniciar o fechamento contábil.</p>
            </div>
        </div>
    );
  }

  const reportList: Report[] = [
    { title: "DRE - Demonstração do Resultado", description: "Visão dos lucros e perdas do período.", type: 'DRE' },
    { title: "Balanço Patrimonial", description: "Foto da saúde financeira da empresa.", type: 'BalanceSheet' },
    { title: "Livro Razão (Analítico)", description: "Detalhes de todas as movimentações por conta.", type: 'Transactions' },
    { title: "SPED ECD", description: "Escrituração Contábil Digital (.txt)", type: 'SPED_ECD' },
    { title: "SPED EFD", description: "Escrituração Fiscal Digital (.txt)", type: 'SPED_EFD' },
    { title: "SPED ECF", description: "Escrituração Contábil Fiscal (.txt)", type: 'SPED_ECF' },
  ];

  if (flowState === 'proposing_corrections') {
    return (
        <div className="space-y-6 animate-fade-in">
            <header>
                <h1 className="text-3xl font-bold text-slate-900">Validação de Ajustes da IA</h1>
                <p className="text-slate-600 mt-1">Selecione as correções que deseja aplicar em lote.</p>
            </header>
            
                <div className="bg-white p-4 rounded-xl shadow-md">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <input 
                                type="checkbox"
                                id="select-all-corrections"
                                checked={proposedCorrections.length > 0 && selectedCorrections.size === proposedCorrections.length}
                                onChange={handleToggleAllCorrections}
                                className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <label htmlFor="select-all-corrections" className="ml-3 font-medium text-slate-700 cursor-pointer">
                                {selectedCorrections.size === proposedCorrections.length ? "Desmarcar Todos" : "Marcar Todos"}
                            </label>
                        </div>
                        <span className="text-sm text-slate-500 font-medium">
                            {selectedCorrections.size} de {proposedCorrections.length} correções selecionadas
                        </span>
                    </div>
                </div>
                <div className="space-y-4">
                    {proposedCorrections.map(correction => {
                        const originalTx = processedTransactions.find(tx => tx.id === correction.transactionId);
                        if (!originalTx) return null;

                        const updatedTx = { ...originalTx, ...correction.updates };
                        const isSelected = selectedCorrections.has(correction.transactionId);
                        
                        return (
                            <div key={correction.transactionId} className={`bg-white p-5 rounded-xl shadow-md transition-opacity ${isSelected ? 'opacity-100' : 'opacity-50'}`}>
                                <div className="flex items-start">
                                    <input 
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => handleToggleCorrection(correction.transactionId)}
                                        className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mt-1"
                                    />
                                    <div className="ml-4 flex-1">
                                        <p className="text-sm text-indigo-700 bg-indigo-50 px-2 py-1 rounded-full inline-block font-semibold mb-3">
                                            💡 Justificativa da IA: <span className="font-normal">{correction.reason}</span>
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                                                <h4 className="font-bold text-red-800 mb-2">Antes</h4>
                                                <p className="text-sm"><strong>Descrição:</strong> {originalTx.description}</p>
                                                <p className="text-sm"><strong>Classificação:</strong> {originalTx.classification}</p>
                                                <p className="text-sm"><strong>Valor:</strong> <span className="font-mono">{originalTx.value.toFixed(2)}</span></p>
                                            </div>
                                            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                                <h4 className="font-bold text-green-800 mb-2">Depois</h4>
                                                <p className="text-sm"><strong>Descrição:</strong> {updatedTx.description}</p>
                                                <p className="text-sm"><strong>Classificação:</strong> <span className="bg-green-200 px-1 rounded">{updatedTx.classification}</span></p>
                                                <p className="text-sm"><strong>Valor:</strong> <span className="font-mono bg-green-200 px-1 rounded">{updatedTx.value.toFixed(2)}</span></p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
                <div className="bg-white p-4 rounded-xl shadow-md flex justify-end items-center space-x-4">
                    <button onClick={() => setFlowState('audit_complete')} className="bg-slate-500 text-white font-semibold py-2 px-6 rounded-lg hover:bg-slate-600">Cancelar</button>
                    <button onClick={handleApplyCorrections} disabled={selectedCorrections.size === 0} className="bg-green-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed">
                        Aplicar {selectedCorrections.size} Ajustes
                    </button>
                </div>
        </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
          <h1 className="text-3xl font-bold text-slate-900">Relatórios e Fechamento</h1>
          <p className="text-slate-600 mt-1">Siga os passos para revisar, auditar e gerar os relatórios finais da empresa.</p>
      </header>

      {/* Passo 1: Balancete */}
      <div className="bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-xl font-semibold mb-4">Passo 1: Balancete de Verificação</h2>
          <div className="overflow-x-auto">
              <table className="min-w-full">
                  <thead className="bg-slate-50">
                      <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Conta Contábil</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Débito (R$)</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Crédito (R$)</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                      {trialBalance.map(row => (
                          <tr key={row.account} className="hover:bg-slate-50">
                              <td className="px-4 py-3 text-sm text-slate-800">{row.account}</td>
                              <td className="px-4 py-3 text-sm text-right text-slate-600 font-mono">{row.debit.toFixed(2)}</td>
                              <td className="px-4 py-3 text-sm text-right text-slate-600 font-mono">{row.credit.toFixed(2)}</td>
                          </tr>
                      ))}
                  </tbody>
                  <tfoot className="bg-slate-100">
                      <tr className="font-bold">
                          <td className="px-4 py-3 text-sm">Totais</td>
                          <td className="px-4 py-3 text-sm text-right font-mono">{totals.debit.toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm text-right font-mono">{totals.credit.toFixed(2)}</td>
                      </tr>
                  </tfoot>
              </table>
          </div>
           <div className={`mt-4 border-t pt-4 flex justify-end items-center space-x-4 text-sm font-semibold ${Math.abs(totals.debit - totals.credit) > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
              <span>Partida Dobrada:</span>
              <span>{Math.abs(totals.debit - totals.credit) > 0.01 ? `Diferença de R$ ${(totals.debit - totals.credit).toFixed(2)}` : 'OK'}</span>
          </div>
      </div>
      
      {/* Passo 2: Auditoria */}
      <div className="bg-white p-6 rounded-xl shadow-md">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
            <h2 className="text-xl font-semibold">Passo 2: Auditoria Automática por IA</h2>
            <button onClick={handleRunAudit} disabled={flowState === 'auditing'} className="bg-slate-100 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-200 transition-colors disabled:bg-slate-50 disabled:cursor-wait whitespace-nowrap">
                {flowState === 'auditing' ? 'Auditando...' : 'Executar Auditoria'}
            </button>
          </div>
          {flowState === 'auditing' && <p className="text-center text-slate-600">Analisando lançamentos em busca de inconsistências...</p>}
          {flowState === 'audit_complete' && (
            <div className="space-y-3 animate-fade-in">
                {auditFindings.length === 0 ? (
                    <div className="p-4 rounded-lg bg-green-50 text-green-800 border-l-4 border-green-500">
                        <p><strong>✅ Auditoria concluída.</strong> Nenhum problema crítico encontrado! Você pode prosseguir para a geração dos relatórios.</p>
                    </div>
                ) : (
                    <>
                        {auditFindings.map((finding, index) => <AuditFindingCard key={index} finding={finding} />)}
                        <div className="mt-4 pt-4 border-t flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button onClick={handleProposeCorrections} className="w-full sm:w-auto flex items-center justify-center bg-indigo-600 text-white font-semibold py-2 px-5 rounded-lg hover:bg-indigo-700 transition-colors">
                                <WrenchScrewdriverIcon />
                                Corrigir com IA
                            </button>
                            <p className="text-sm text-slate-500">Ou ajuste cada lançamento manualmente.</p>
                        </div>
                    </>
                )}
            </div>
          )}
      </div>

      {/* Passo 3: Geração */}
      {flowState === 'audit_complete' && (
        <div className="bg-white p-6 rounded-xl shadow-md animate-fade-in">
          <h2 className="text-xl font-semibold mb-2">Passo 3: Geração de Relatórios Finais</h2>
          {auditFindings.length === 0 ? (
              <>
              <p className="text-slate-600 mb-4">O balancete foi aprovado pela auditoria. Clique abaixo para gerar os relatórios finais.</p>
              <button onClick={handleGenerateReports} className="w-full bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-700 transition-colors">
                  Disparar Geração Completa
              </button>
              </>
          ) : (
              <div className="p-4 rounded-lg bg-amber-50 text-amber-800 border-l-4 border-amber-500">
                  <p className="font-bold mb-2">Atenção: Foram encontradas pendências na auditoria.</p>
                  <p className="text-sm mb-4">Recomendamos corrigir os problemas apontados para garantir a precisão dos relatórios. Se preferir, você pode gerar os relatórios "como estão", ciente das inconsistências.</p>
                  <button onClick={handleGenerateReports} className="w-full bg-amber-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-amber-600 transition-colors">
                    Gerar Relatórios com Pendências
                  </button>
              </div>
          )}
        </div>
      )}

      {/* Progresso da Geração */}
      {flowState === 'generating' && (
          <div className="bg-white p-6 rounded-xl shadow-md animate-fade-in text-center">
              <h2 className="text-xl font-semibold mb-2">Gerando Relatórios...</h2>
              <p className="text-slate-600 mb-4">Aguarde enquanto preparamos todos os documentos para você.</p>
              <div className="w-full bg-slate-200 rounded-full h-2.5"><div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${generationProgress}%` }}></div></div>
          </div>
      )}
      
      {/* Download dos Relatórios */}
      {flowState === 'reports_ready' && (
        <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Geração Concluída</h2>
            <p className="text-slate-600 mb-4">Baixe os relatórios individualmente ou o pacote completo.</p>
             <div className="text-center mb-6">
                <button onClick={() => alert('Simulando download do arquivo Relatorios_Completos.zip')} className="bg-green-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-green-700 transition-transform hover:scale-105">
                    Baixar Pacote Completo (.zip)
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reportList.map(report => (
                    <ReportDownloadCard 
                        key={report.title}
                        report={report}
                        transactions={processedTransactions}
                    />
                ))}
            </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
