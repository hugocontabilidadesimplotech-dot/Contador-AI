import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './views/Dashboard';
import Companies from './views/Companies';
import Extracts from './views/Extracts';
import AITools from './views/AITools';
import Reports from './views/Reports';
import Invoices from './views/Invoices';
import Calculators from './views/Calculators';
import ManualEntries from './views/ManualEntries';
import ChatBot from './components/ChatBot';
import Login from './views/Login';
import { View, Transaction, User, Company } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [processedTransactions, setProcessedTransactions] = useState<Transaction[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);

  const handleLoginSuccess = (userData: User) => {
    setUser(userData);
    setCurrentView('dashboard'); // Reset to dashboard on login
  };

  const handleLogout = () => {
    setUser(null);
    setCompanies([]); // Clear company data on logout
    setProcessedTransactions([]);
    setSelectedCompany(null);
  };
  
  const handleAddCompany = (newCompany: Company) => {
    setCompanies(prevCompanies => [...prevCompanies, newCompany]);
    alert(`Empresa "${newCompany.name}" cadastrada com sucesso!`);
  };

  const handleDeleteCompany = (companyId: number) => {
    if (window.confirm("Tem certeza que deseja excluir esta empresa? Esta ação não pode ser desfeita.")) {
        const updatedCompanies = companies.filter(company => company.id !== companyId);
        setCompanies(updatedCompanies);
        if (selectedCompany?.id === companyId) {
            setSelectedCompany(null);
            setProcessedTransactions([]); // Clear transactions if the selected company is deleted
        }
    }
  };
  
  const handleManageCompany = (companyId: number) => {
    const company = companies.find(c => c.id === companyId);
    if (company) {
      setSelectedCompany(company);
      // It's often better to clear transactions when switching companies
      // unless you have a system to associate transactions with companies.
      setProcessedTransactions([]); 
      setCurrentView('dashboard');
    }
  };
  
  const handleEditTransaction = (transactionId: string) => {
    const transaction = processedTransactions.find(tx => tx.id === transactionId);
    if (transaction) {
      setTransactionToEdit(transaction);
      setCurrentView('manual-entries');
    }
  };

  const handleSaveTransaction = (updatedTransaction: Transaction) => {
    setProcessedTransactions(prev => {
      const exists = prev.some(tx => tx.id === updatedTransaction.id);
      if (exists) {
        // Update existing transaction
        return prev.map(tx => tx.id === updatedTransaction.id ? updatedTransaction : tx);
      }
      // Add new transaction
      return [...prev, updatedTransaction];
    });
    setTransactionToEdit(null);
    setCurrentView('reports'); // Go back to reports to re-audit
  };

  const handleAddManualTransaction = () => {
      setTransactionToEdit(null); // Clear any existing edit state
      setCurrentView('manual-entries');
  };


  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard user={user} company={selectedCompany} processedTransactions={processedTransactions} onEditTransaction={handleEditTransaction} onAddManualEntry={handleAddManualTransaction} />;
      case 'companies':
        return <Companies 
                    companies={companies} 
                    onCompanyAdd={handleAddCompany} 
                    onCompanyDelete={handleDeleteCompany}
                    onManageCompany={handleManageCompany}
                />;
      case 'extracts':
        return <Extracts 
                    selectedCompany={selectedCompany} 
                    setProcessedTransactions={setProcessedTransactions} 
                    setCurrentView={setCurrentView} 
                    onAddManualEntry={handleAddManualTransaction} 
                />;
      case 'reports':
        return <Reports 
                    selectedCompany={selectedCompany}
                    processedTransactions={processedTransactions} 
                    onEditTransaction={handleEditTransaction} 
                    setProcessedTransactions={setProcessedTransactions} 
                />;
      case 'invoices':
        return <Invoices processedTransactions={processedTransactions} />;
      case 'manual-entries':
        return <ManualEntries transactionToEdit={transactionToEdit} onSave={handleSaveTransaction} onCancel={() => { setTransactionToEdit(null); setCurrentView('reports'); }} />;
      case 'calculators':
        return <Calculators />;
      case 'ai-tools':
        return <AITools />;
      default:
        return <Dashboard user={user} company={selectedCompany} processedTransactions={processedTransactions} onEditTransaction={handleEditTransaction} onAddManualEntry={handleAddManualTransaction} />;
    }
  };

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen bg-slate-100 text-slate-800">
      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        onLogout={handleLogout} 
        companies={companies}
      />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
        {renderView()}
      </main>
      <ChatBot />
    </div>
  );
};

export default App;