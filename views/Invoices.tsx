import React, { useState, useCallback } from 'react';
import { analyzeInvoice } from '../services/geminiService';
import { Transaction } from '../types';
import ShieldCheckIcon from '../components/icons/ShieldCheckIcon';

interface InvoicesProps {
  processedTransactions: Transaction[];
}

type InvoiceViewState = 'idle' | 'processing' | 'results';

interface AnalysisResult {
    invoiceData: { cnpj: string; date: string; value: number; description: string; };
    reconciliation: { status: 'Encontrado' | 'Não Encontrado'; message: string; };
    taxAnalysis: { baseValue: number; combinedRate: string; ibsValue: number; cbsValue: number; totalTax: number; explanation: string; };
    complianceReport: { status: string; recommendation: string; };
}

const Invoices: React.FC<InvoicesProps> = ({ processedTransactions }) => {
    const [viewState, setViewState] = useState<InvoiceViewState>('idle');
    const [activeTab, setActiveTab] = useState<'entrada' | 'saida'>('entrada');
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleAnalyzeClick = useCallback(async () => {
        setViewState('processing');
        setError(null);
        setAnalysisResult(null);

        if (processedTransactions.length === 0) {
            setError("Não há transações bancárias para cruzar. Processe um extrato primeiro.");
            setViewState('idle');
            return;
        }

        try {
            const resultJson = await analyzeInvoice(processedTransactions);
            const result: AnalysisResult = JSON.parse(resultJson);
            setAnalysisResult(result);
            setViewState('results');
        } catch (err) {
            console.error(err);
            setError("A IA não conseguiu analisar a nota fiscal. Verifique o console para mais detalhes.");
            setViewState('idle');
        }
    }, [processedTransactions]);

    const handleReset = () => {
        setViewState('idle');
        setAnalysisResult(null);
        setError(null);
    };

    const InfoCard: React.FC<{ label: string; value: string | React.ReactNode; className?: string }> = ({ label, value, className }) => (
        <div className={`bg-slate-50 p-4 rounded-lg ${className}`}>
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <div className="text-md font-semibold text-slate-800 mt-1">{value}</div>
        </div>
    );

    return (
    <div className="space-y-8">
        <header>
            <h1 className="text-3xl font-bold text-slate-900">Análise de Notas Fiscais</h1>
            <p className="text-slate-600 mt-1">Envie uma nota fiscal para análise de conformidade com a Reforma Tributária e conciliação bancária.</p>
        </header>

        {viewState === 'idle' && (
            <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="border-b border-slate-200">
                    <nav className="-mb-px flex space-x-6">
                        <button onClick={() => setActiveTab('entrada')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'entrada' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                            Notas de Entrada
                        </button>
                        <button onClick={() => setActiveTab('saida')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'saida' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                            Notas de Saída
                        </button>
                    </nav>
                </div>
                <div className="mt-6 border-2 border-dashed border-slate-300 rounded-lg p-10 text-center">
                    <p className="font-semibold text-slate-700">ARRASTE NOTAS FISCAIS AQUI (XML, PDF)</p>
                    <p className="text-sm text-slate-500 mt-2">ou</p>
                    <button className="mt-4 bg-indigo-50 text-indigo-700 font-semibold py-2 px-5 rounded-lg hover:bg-indigo-100 transition-colors">
                        Selecione os Arquivos
                    </button>
                </div>
                <div className="mt-6 text-center">
                    <p className="text-sm text-slate-500 mb-2">(Para fins de demonstração, usaremos uma nota fiscal simulada)</p>
                    <button onClick={handleAnalyzeClick} className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-indigo-700 transition-transform hover:scale-105">
                        Analisar Nota Fiscal (Simulação)
                    </button>
                </div>
                {error && <div className="mt-4 text-center text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>}
            </div>
        )}

        {viewState === 'processing' && (
            <div className="text-center p-8 bg-white rounded-xl shadow-md">
                <div className="inline-flex items-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    <p className="ml-4 text-slate-600 text-lg">IA analisando a nota fiscal...</p>
                </div>
                <p className="text-slate-500 mt-4">Estamos cruzando dados, analisando a Reforma Tributária e preparando seu relatório.</p>
            </div>
        )}

        {viewState === 'results' && analysisResult && (
            <div className="space-y-6 animate-fade-in">
                {/* Compliance Report Card */}
                <div className={`p-6 rounded-xl shadow-md flex items-start space-x-4 ${analysisResult.complianceReport.status === 'Regular' ? 'bg-green-50' : 'bg-amber-50'}`}>
                    <div className={`${analysisResult.complianceReport.status === 'Regular' ? 'text-green-600' : 'text-amber-600'}`}>
                        <ShieldCheckIcon />
                    </div>
                    <div>
                        <h2 className={`text-xl font-bold ${analysisResult.complianceReport.status === 'Regular' ? 'text-green-800' : 'text-amber-800'}`}>
                            Status: {analysisResult.complianceReport.status}
                        </h2>
                        <p className={`mt-1 ${analysisResult.complianceReport.status === 'Regular' ? 'text-green-700' : 'text-amber-700'}`}>
                           <strong>Recomendação da IA:</strong> {analysisResult.complianceReport.recommendation}
                        </p>
                    </div>
                </div>

                {/* Reconciliation & Tax Analysis */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-md">
                        <h3 className="font-bold text-lg mb-4">Conciliação Bancária</h3>
                        <InfoCard 
                            label="Status" 
                            value={
                                <span className={`font-bold ${analysisResult.reconciliation.status === 'Encontrado' ? 'text-green-600' : 'text-red-600'}`}>
                                    {analysisResult.reconciliation.status}
                                </span>
                            } 
                        />
                        <p className="text-sm text-slate-600 mt-3">{analysisResult.reconciliation.message}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-md">
                         <h3 className="font-bold text-lg mb-4">Dados da Nota Fiscal (Simulado)</h3>
                         <div className="grid grid-cols-2 gap-4">
                            <InfoCard label="CNPJ do Emitente" value={analysisResult.invoiceData.cnpj} />
                            <InfoCard label="Data de Emissão" value={analysisResult.invoiceData.date} />
                            <InfoCard label="Valor Total (R$)" value={analysisResult.invoiceData.value.toFixed(2)} />
                            <InfoCard label="Descrição" value={analysisResult.invoiceData.description} />
                         </div>
                    </div>
                </div>

                {/* Tax Reform Analysis */}
                 <div className="bg-white p-6 rounded-xl shadow-md">
                    <h3 className="font-bold text-lg mb-4">Análise da Reforma Tributária</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <InfoCard label="Base de Cálculo (R$)" value={analysisResult.taxAnalysis.baseValue.toFixed(2)} />
                        <InfoCard label="Alíquota Combinada" value={analysisResult.taxAnalysis.combinedRate} />
                        <InfoCard label="Total IBS + CBS (R$)" value={analysisResult.taxAnalysis.totalTax.toFixed(2)} className="bg-indigo-50"/>
                    </div>
                    <div>
                        <h4 className="font-semibold text-slate-700">Explicação da IA:</h4>
                        <p className="text-sm text-slate-600 mt-2 bg-slate-50 p-4 rounded-lg">{analysisResult.taxAnalysis.explanation}</p>
                    </div>
                </div>
                
                <div className="text-center">
                    <button onClick={handleReset} className="bg-slate-500 text-white font-semibold py-2 px-6 rounded-lg hover:bg-slate-600 transition-colors">
                        Analisar Outra Nota
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};

export default Invoices;