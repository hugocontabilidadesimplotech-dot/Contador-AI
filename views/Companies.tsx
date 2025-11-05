import React, { useState, useCallback } from 'react';
import { analyzeContract, determineCompanySettings } from '../services/geminiService';
import { fileToBase64 } from '../utils/helpers';
import { Company, ExtractedData, SuggestedSettings } from '../types';

// Helper for CNPJ formatting
const formatCNPJ = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .slice(0, 18);
};

interface CompaniesProps {
  companies: Company[];
  onCompanyAdd: (company: Company) => void;
  onCompanyDelete: (companyId: number) => void;
  onManageCompany: (companyId: number) => void;
}

// --- Registration Form Component ---
const CompanyRegistrationForm: React.FC<{
    onCompanyAdd: (company: Company) => void;
    onCancel: () => void;
}> = ({ onCompanyAdd, onCancel }) => {
  const [companyName, setCompanyName] = useState('');
  const [accounts, setAccounts] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [suggestedSettings, setSuggestedSettings] = useState<SuggestedSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('O arquivo é muito grande. O limite é 10MB.');
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setExtractedData(null);
      setSuggestedSettings(null);
      setError(null);
    }
  };

  const handleAnalyzeClick = useCallback(async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setError(null);
    setExtractedData(null);
    setSuggestedSettings(null);

    try {
      const base64Image = await fileToBase64(selectedFile);
      const contractJson = await analyzeContract(base64Image, selectedFile.type);
      const contractData: ExtractedData = JSON.parse(contractJson);
      setExtractedData(contractData);
      
      if (contractData.razaoSocial) {
          setCompanyName(contractData.razaoSocial);
      }

      const settingsJson = await determineCompanySettings(contractData);
      const settingsData: SuggestedSettings = JSON.parse(settingsJson);
      setSuggestedSettings(settingsData);

    } catch (err) {
      console.error(err);
      setError('Falha ao analisar o contrato. A IA pode não ter conseguido ler o documento. Tente uma imagem mais nítida ou preencha manualmente.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile]);
  
  const handleConfirmRegistration = () => {
    if (!extractedData || !suggestedSettings || !companyName) {
        setError("Dados insuficientes para cadastrar a empresa. Certifique-se de que o nome da empresa foi preenchido e a análise da IA foi concluída.");
        return;
    }
    const newCompany: Company = {
        id: Date.now(),
        name: companyName,
        data: extractedData,
        settings: suggestedSettings,
        accounts: accounts,
    };
    onCompanyAdd(newCompany);
  };
  
  const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="text-md text-slate-800">{value || 'N/A'}</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
       <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold text-slate-900">Cadastrar Nova Empresa</h1>
            <p className="text-slate-600 mt-1">Preencha os dados ou use a IA para extrair do contrato social.</p>
        </div>
        <button onClick={onCancel} className="bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 transition-colors">
            &larr; Voltar para a Lista
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-xl font-semibold mb-4 border-b pb-2">1. Dados da Empresa</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <input type="text" placeholder="Nome da Empresa (Apelido)" value={companyName} onChange={e => setCompanyName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <input type="text" placeholder="CNPJ" value={extractedData?.cnpj || ''} readOnly className="w-full px-3 py-2 border border-slate-300 rounded-md bg-slate-100" />
        </div>
         <div className="mt-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Contas e Vínculos</label>
            <textarea 
                placeholder="Liste aqui contas bancárias, chaves PIX, CNPJs de empresas do grupo e nomes de sócios. Um item por linha. Esta informação é crucial para a IA identificar transferências internas corretamente."
                value={accounts} 
                onChange={e => setAccounts(e.target.value)} 
                className="w-full h-24 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" 
            />
        </div>
        <div className="mt-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Contrato Social ou CCMEI</label>
            <div className="flex items-center space-x-4">
                <input type="file" accept="image/png, image/jpeg, application/pdf" onChange={handleFileChange} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                <button onClick={handleAnalyzeClick} disabled={!selectedFile || isLoading} className="bg-indigo-600 text-white font-semibold py-2 px-5 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-indigo-300 disabled:cursor-not-allowed whitespace-nowrap">
                    {isLoading ? 'Analisando...' : 'Analisar com IA'}
                </button>
            </div>
        </div>
        {previewUrl && <img src={previewUrl} alt="Preview" className="mt-4 max-h-48 rounded-lg border shadow-sm" />}
      </div>
      
      {isLoading && (
        <div className="text-center p-8">
          <div className="inline-flex items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="ml-4 text-slate-600 text-lg">IA analisando o documento e configurando a empresa...</p>
          </div>
        </div>
      )}

      {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-r-lg shadow" role="alert">{error}</div>}

      {extractedData && suggestedSettings && (
        <div className="bg-white p-6 rounded-xl shadow-md animate-fade-in">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">2. Resumo da Análise da IA</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mt-4 p-4 bg-slate-50 rounded-lg">
            <h3 className="md:col-span-2 text-lg font-semibold text-indigo-700">Dados Extraídos do Documento</h3>
            <InfoRow label="Razão Social" value={extractedData.razaoSocial} />
            <InfoRow label="CNPJ" value={extractedData.cnpj} />
            <InfoRow label="Data de Constituição" value={extractedData.dataConstituicao} />
            <InfoRow label="Capital Social" value={extractedData.capitalSocial} />
            <div className="md:col-span-2"><InfoRow label="Endereço" value={extractedData.endereco} /></div>
            <div className="md:col-span-2"><InfoRow label="Objeto Social" value={extractedData.objetoSocial} /></div>
            <InfoRow label="CNAE Principal" value={extractedData.cnae?.principal} />
            <InfoRow label="Administrador(es)" value={extractedData.administradores?.join(', ')} />
            <div className="md:col-span-2"><InfoRow label="Sócios" value={extractedData.socios?.map(s => `${s.nome} (${s.participacao})`).join(', ')} /></div>
          </div>
          <div className="mt-6 p-4 bg-indigo-50 rounded-lg">
             <h3 className="text-lg font-semibold text-indigo-700 mb-4">Diagnóstico e Plano de Ação</h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                <InfoRow label="Porte da Empresa" value={<strong>{suggestedSettings.porteEmpresa}</strong>} />
                <InfoRow label="Natureza Jurídica" value={<strong>{suggestedSettings.naturezaJuridica}</strong>} />
                <InfoRow label="Regime Tributário" value={<strong>{suggestedSettings.regimeTributario}</strong>} />
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-4">
                <div>
                    <p className="text-sm font-medium text-slate-500">Obrigações Mensais Principais</p>
                    <ul className="list-disc list-inside text-md text-slate-800">{(suggestedSettings.obrigacoesMensais || []).map((o,i) => <li key={i}>{o}</li>)}</ul>
                </div>
                 <div>
                    <p className="text-sm font-medium text-slate-500">Próximos Passos Recomendados</p>
                    <ul className="list-disc list-inside text-md text-slate-800">{(suggestedSettings.proximosPassos || []).map((p,i) => <li key={i}>{p}</li>)}</ul>
                </div>
             </div>
          </div>
          <div className="mt-6 flex justify-end">
              <button onClick={handleConfirmRegistration} className="bg-green-500 text-white font-semibold py-2 px-6 rounded-lg hover:bg-green-600 transition-colors">
                  Confirmar Cadastro
              </button>
          </div>
        </div>
      )}
    </div>
  );
};


// --- Main Companies View ---
const Companies: React.FC<CompaniesProps> = ({ companies, onCompanyAdd, onCompanyDelete, onManageCompany }) => {
    const [view, setView] = useState<'list' | 'form'>('list');

    const handleCompanyAdded = (newCompany: Company) => {
        onCompanyAdd(newCompany);
        setView('list'); // Return to list view after adding
    };

    if (view === 'form') {
        return <CompanyRegistrationForm onCompanyAdd={handleCompanyAdded} onCancel={() => setView('list')} />;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Minhas Empresas</h1>
                    <p className="text-slate-600 mt-1">Gerencie as empresas cadastradas no seu sistema.</p>
                </div>
                <button onClick={() => setView('form')} className="bg-indigo-600 text-white font-semibold py-2 px-5 rounded-lg hover:bg-indigo-700 transition-colors">
                    + Cadastrar Nova Empresa
                </button>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nome (Apelido)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Razão Social</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">CNPJ</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Regime Tributário</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {companies.length > 0 ? (
                                companies.map(company => (
                                    <tr key={company.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">{company.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{company.data.razaoSocial}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{company.data.cnpj}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{company.settings.regimeTributario}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm space-x-4">
                                            <button onClick={() => onManageCompany(company.id)} className="text-indigo-600 hover:text-indigo-900 font-medium">Gerenciar</button>
                                            <button onClick={() => onCompanyDelete(company.id)} className="text-red-600 hover:text-red-900 font-medium">Excluir</button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="text-center py-8 text-slate-500 italic">
                                        Nenhuma empresa cadastrada. Clique em "Cadastrar Nova Empresa" para começar.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Companies;