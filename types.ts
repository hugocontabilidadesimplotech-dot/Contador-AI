export type View = 'dashboard' | 'companies' | 'extracts' | 'reports' | 'invoices' | 'calculators' | 'ai-tools' | 'manual-entries';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
  maps?: {
    uri: string;
    title: string;
    placeAnswerSources?: {
      reviewSnippets: {
        uri: string;
        text: string;
      }[];
    }[];
  }
}

export type Transaction = {
    id: string;
    date: string;
    description: string;
    value: number;
    classification: string;
    confidenceScore?: number;
    needsReview?: boolean;
};

export interface AuditFinding {
    type: 'error' | 'warning' | 'suggestion';
    message: string;
    transactionId?: string;
}

export interface ProposedChange {
    transactionId: string;
    reason: string;
    updates: Partial<Omit<Transaction, 'id'>>;
}


export interface User {
    name: string;
    email?: string;
}

// --- Company Types ---

export interface ExtractedData {
  razaoSocial: string;
  cnpj: string;
  dataConstituicao: string;
  capitalSocial: string;
  endereco: string;
  objetoSocial?: string;
  administradores?: string[];
  cnae?: { principal: string; secundarios: string[] };
  socios?: { nome: string; participacao: string }[];
}

export interface SuggestedSettings {
    regimeTributario: string;
    porteEmpresa: string;
    naturezaJuridica: string;
    obrigacoesMensais: string[];
    proximosPassos: string[];
}

export interface Company {
    id: number;
    name: string;
    data: ExtractedData;
    settings: SuggestedSettings;
    accounts?: string; // Contas bancárias, chaves PIX, CNPJs do grupo, etc.
}