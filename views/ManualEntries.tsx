import React, { useState, useEffect } from 'react';
import { Transaction } from '../types';
import { ALL_ACCOUNTS } from '../constants';


interface ManualEntriesProps {
    transactionToEdit: Transaction | null;
    onSave: (transaction: Transaction) => void;
    onCancel: () => void;
}

const ManualEntries: React.FC<ManualEntriesProps> = ({ transactionToEdit, onSave, onCancel }) => {
    const [entry, setEntry] = useState<Omit<Transaction, 'id' | 'confidenceScore' | 'needsReview'>>({
        date: new Date().toISOString().split('T')[0],
        description: '',
        value: 0,
        classification: ALL_ACCOUNTS[0],
    });
    const [isCredit, setIsCredit] = useState(false);

    useEffect(() => {
        if (transactionToEdit) {
            setEntry({
                date: transactionToEdit.date,
                description: transactionToEdit.description,
                value: Math.abs(transactionToEdit.value),
                classification: transactionToEdit.classification,
            });
            setIsCredit(transactionToEdit.value > 0);
        } else {
            // Reset form for new entry
            setEntry({
                date: new Date().toISOString().split('T')[0],
                description: '',
                value: 0,
                classification: ALL_ACCOUNTS.find(a => a.startsWith('Prestação')) || ALL_ACCOUNTS[0],
            });
            setIsCredit(false);
        }
    }, [transactionToEdit]);
    
    const isFormValid = entry.date && entry.description && entry.value > 0 && entry.classification;

    const handleInputChange = (field: keyof typeof entry, value: string | number) => {
        setEntry(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid) return;

        const finalValue = isCredit ? entry.value : -entry.value;

        const finalTransaction: Transaction = {
            id: transactionToEdit?.id || `manual-${Date.now()}`,
            ...entry,
            value: finalValue,
        };
        onSave(finalTransaction);
    };

    return (
        <div className="space-y-8">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">{transactionToEdit ? 'Editar Lançamento' : 'Novo Lançamento Manual'}</h1>
                    <p className="text-slate-600 mt-1">{transactionToEdit ? 'Ajuste os detalhes da transação abaixo.' : 'Insira um novo lançamento que não veio do extrato.'}</p>
                </div>
                 <button onClick={onCancel} className="bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 transition-colors">
                    &larr; Voltar para Relatórios
                </button>
            </header>

            {/* Entry Form */}
            <div className="bg-white p-6 rounded-xl shadow-md">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Data</label>
                            <input type="date" value={entry.date} onChange={e => handleInputChange('date', e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Classificação Contábil</label>
                             <select value={entry.classification} onChange={e => handleInputChange('classification', e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                                {ALL_ACCOUNTS.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>
                     <div>
                         <label className="block text-sm font-medium text-slate-700">Descrição / Histórico</label>
                        <input type="text" placeholder="Ex: Compra de material de escritório" value={entry.description} onChange={e => handleInputChange('description', e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Valor (R$)</label>
                            <input type="number" step="0.01" min="0.01" placeholder="100.00" value={entry.value > 0 ? entry.value : ''} onChange={e => handleInputChange('value', parseFloat(e.target.value))} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700">Tipo de Lançamento</label>
                            <div className="mt-2 flex space-x-4">
                                <label className="flex items-center">
                                    <input type="radio" checked={!isCredit} onChange={() => setIsCredit(false)} name="entry-type" className="h-4 w-4 text-indigo-600 border-slate-300 focus:ring-indigo-500" />
                                    <span className="ml-2 text-sm text-slate-700">Débito (Saída)</span>
                                </label>
                                 <label className="flex items-center">
                                    <input type="radio" checked={isCredit} onChange={() => setIsCredit(true)} name="entry-type" className="h-4 w-4 text-indigo-600 border-slate-300 focus:ring-indigo-500" />
                                    <span className="ml-2 text-sm text-slate-700">Crédito (Entrada)</span>
                                </label>
                            </div>
                        </div>
                    </div>
                    <div className="text-right pt-2 space-x-3">
                        <button type="button" onClick={onCancel} className="bg-slate-500 text-white font-semibold py-2 px-6 rounded-lg hover:bg-slate-600 transition-colors">Cancelar</button>
                        <button type="submit" disabled={!isFormValid} className="bg-indigo-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-indigo-300 disabled:cursor-not-allowed">
                            {transactionToEdit ? 'Salvar Alterações' : 'Adicionar Lançamento'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ManualEntries;