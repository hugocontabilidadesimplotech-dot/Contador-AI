import { GoogleGenAI, Chat, Type, GroundingChunk } from '@google/genai';
import { Transaction, AuditFinding, Company } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- CHAT BOT SERVICE ---
let chatInstance: Chat | null = null;

const getChatInstance = (): Chat => {
  if (!chatInstance) {
    chatInstance = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: `Você é Sofia, uma assistente virtual de contabilidade para a plataforma ContadorAI. Seja amigável, prestativa e responda em português do Brasil.`,
      },
    });
  }
  return chatInstance;
};

export const streamChatResponse = async (message: string) => {
  const chat = getChatInstance();
  return chat.sendMessageStream({ message });
};


// --- IMAGE ANALYSIS SERVICE ---
export const analyzeContract = async (imageBase64: string, mimeType: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                {
                    text: `Você é um especialista em documentos legais brasileiros. Analise a imagem deste contrato social e extraia as seguintes informações em formato JSON: Razão Social, CNPJ, Data de Constituição, Capital Social, Endereço completo, Objeto Social (a descrição das atividades da empresa), CNAE principal, CNAEs secundários, a lista de Sócios com suas respectivas participações percentuais, e o(s) nome(s) do(s) Administrador(es) (quem assina pela empresa). Se alguma informação não estiver clara, use um valor nulo ou um array vazio.
                    
                    Exemplo de saída:
                    {
                      "razaoSocial": "...",
                      "cnpj": "...",
                      "dataConstituicao": "...",
                      "capitalSocial": "R$ 100.000,00",
                      "endereco": "...",
                      "objetoSocial": "Prestação de serviços de consultoria em tecnologia da informação.",
                      "cnae": { "principal": "...", "secundarios": ["...", "..."] },
                      "socios": [{ "nome": "Nome Sócio A", "participacao": "50%" }, { "nome": "Nome Sócio B", "participacao": "50%" }],
                      "administradores": ["Nome Sócio A"]
                    }`
                },
                {
                    inlineData: {
                        mimeType,
                        data: imageBase64,
                    },
                },
            ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              razaoSocial: { type: Type.STRING },
              cnpj: { type: Type.STRING },
              dataConstituicao: { type: Type.STRING },
              capitalSocial: { type: Type.STRING },
              endereco: { type: Type.STRING },
              objetoSocial: { type: Type.STRING, description: "A descrição textual completa das atividades da empresa." },
              cnae: { 
                type: Type.OBJECT,
                properties: {
                    principal: { type: Type.STRING },
                    secundarios: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
              },
              socios: { 
                type: Type.ARRAY, 
                items: { 
                    type: Type.OBJECT,
                    properties: {
                        nome: { type: Type.STRING },
                        participacao: { type: Type.STRING }
                    }
                } 
              },
              administradores: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Lista com os nomes dos administradores da empresa." }
            }
          }
        }
    });
    return response.text;
};

// --- COMPANY SETTINGS ANALYSIS ---
export const determineCompanySettings = async (contractData: any): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro', // Using Pro for more complex reasoning
        contents: `Como um contador brasileiro sênior, analise os dados da empresa a seguir. Estes dados foram extraídos de um documento que pode ser um Contrato Social ou um CCMEI (Certificado da Condição de Microempreendedor Individual). Com base no CNAE, capital social, nome da empresa (que para MEI geralmente termina com o CPF), e outras informações, forneça uma análise completa em formato JSON com as seguintes chaves:
1.  **porteEmpresa**: Classifique o porte da empresa. É crucial que você identifique corretamente se é um **MEI (Microempreendedor Individual)**. Se não for MEI, classifique como Microempresa (ME), Empresa de Pequeno Porte (EPP), etc. "Empresário Individual" NÃO é um porte, é uma natureza jurídica.
2.  **naturezaJuridica**: Identifique a natureza jurídica (ex: Sociedade Limitada (LTDA), **Empresário Individual (EI)**, etc.). Para um MEI, a natureza jurídica correta é "Empresário Individual (EI)".
3.  **regimeTributario**: Determine o regime tributário. Se o porte for MEI, o regime DEVE ser **SIMEI**. Para outros portes, determine o regime mais vantajoso (Simples Nacional, Lucro Presumido ou Lucro Real), incluindo o anexo aplicável se for Simples Nacional.
4.  **obrigacoesMensais**: Liste as principais obrigações fiscais e acessórias mensais. Para MEI, a principal obrigação é o pagamento do DAS-MEI.
5.  **proximosPassos**: Forneça uma lista de 2 a 3 próximos passos acionáveis para a regularização e gestão contábil da empresa.

Dados da Empresa: ${JSON.stringify(contractData)}
`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    porteEmpresa: { type: Type.STRING, description: "Porte da empresa (MEI, ME, EPP, etc.)." },
                    naturezaJuridica: { type: Type.STRING, description: "Natureza jurídica da empresa (LTDA, EI, etc.)." },
                    regimeTributario: { type: Type.STRING, description: "Regime tributário sugerido e anexo, se aplicável." },
                    obrigacoesMensais: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Lista das principais obrigações mensais." },
                    proximosPassos: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Lista de próximos passos recomendados." }
                }
            },
            thinkingConfig: { thinkingBudget: 20000 } // Ample budget for analysis
        }
    });
    return response.text;
}

// --- BANK STATEMENT PROCESSING ---
export const processBankStatement = async (statementContent: { data: string, mimeType: string }, companyContext: Company | null): Promise<string> => {
    const masterPrompt = `
# 🚀 **MASTER PROMPT: IA DE PROCESSAMENTO DE EXTRATOS BANCÁRIOS v2.1**

Você é um sistema de IA contábil treinado para classificar transações bancárias e extrair dados essenciais para garantir balancetes equilibrados. Sua missão é analisar o extrato fornecido e retornar um JSON estruturado.

**DADOS DA EMPRESA (CLIENTE) PARA CONTEXTO:**
- **CNPJ/CPF Principal:** ${companyContext?.data.cnpj || 'Não informado'}
- **Contas e Vínculos Conhecidos (Contas, PIX, Nomes de Sócios, Empresas do Grupo):** ${companyContext?.accounts || 'Não informado'}

---

### **FASE 1: IDENTIFICAÇÃO DE TRANSAÇÕES INTERNAS (PRIORIDADE MÁXIMA)**
**REGRA MESTRA: NUNCA CLASSIFIQUE UMA TRANSAÇÃO INTERNA COMO RECEITA OU DESPESA.**
Antes de qualquer outra classificação, compare cada transação com os dados da empresa. Identifique como **"Transferência Interna"** se CUMPRIR QUALQUER UM DESTES CRITÉCIOS:
-   O remetente e o destinatário possuem o mesmo CPF/CNPJ principal da empresa.
-   A descrição contém termos inequívocos como "Transferência entre contas", "TBI", "Mesma Titularidade", "Estorno entre contas".
-   A descrição menciona nomes, contas ou CNPJs listados nos "Contas e Vínculos Conhecidos".
-   Existe uma entrada e uma saída de valor idêntico em um curto período de tempo (mesmo dia ou dias próximos), sugerindo uma ponte entre contas.

---

### **FASE 2: EXTRAÇÃO E LIMPEZA (PRÉ-PROCESSAMENTO)**
1.  **Foco em Lançamentos**: Ignore cabeçalhos, rodapés, resumos de saldo e qualquer texto que não seja uma linha de transação.
2.  **Padronização de Dados**:
    -   **Datas**: Converta para **YYYY-MM-DD**. Se o ano não for explícito, use o ano corrente.
    -   **Valores**: Normalize para formato numérico. Saídas (débitos) devem ser **negativas** (-123.45). Entradas (créditos) devem ser **positivas** (123.45). Remova "R$" e use ponto como separador decimal.
3.  **Agrupamento de Histórico**: Combine descrições que se estendem por várias linhas.

---

### **FASE 3: CLASSIFICAÇÃO CONTÁBIL (APENAS PARA TRANSAÇÕES **NÃO**-INTERNAS)**
Para cada transação que **NÃO FOI** classificada como "Transferência Interna", sugira a classificação contábil mais provável, usando **EXCLUSIVAMENTE** as contas do **Plano de Contas Padrão** abaixo. Use as **Regras de Classificação Automática** como seu guia principal.

#### **🏛️ ESTRUTURA PADRÃO DO PLANO DE CONTAS**
- **RECEITAS**: Vendas de Produtos, Vendas de Mercadorias, Prestação de Serviços, Receita de Assinaturas, Receita de Licenças, Juros Ativos, Descontos Obtidos, Outras Receitas.
- **DESPESAS**: Custo das Mercadorias Vendidas, Custo dos Serviços Prestados, Comissões sobre Vendas, Propaganda e Marketing, Frete sobre Vendas, Despesas com Entrega, Salários e Ordenados, Encargos Sociais, Aluguel, Energia Elétrica, Telefonia/Internet, Material de Escritório, Honorários Contábeis, Seguros, Juros Passivos, Despesas Bancárias, IOF, Descontos Concedidos, Impostos e Tributos.
- **INVESTIMENTOS/FINANCIAMENTOS**: Compra de Ativo Imobilizado, Aporte de Capital.
- **CONTAS TRANSITÓRIAS**: Ajustes e Estornos.

#### **🔧 CLASSIFICAÇÃO AUTOMÁTICA POR TIPO DE TRANSAÇÃO (EXEMPLOS)**
- "venda", "faturamento", "cliente", "recebimento" -> **Prestação de Serviços** ou **Vendas de Mercadorias**
- "salário", "pro labore" -> **Salários e Ordenados**
- "aluguel" -> **Aluguel**
- "luz", "energia" -> **Energia Elétrica**
- "telefone", "internet" -> **Telefonia/Internet**
- "honorários", "contabilidade" -> **Honorários Contábeis**
- "imposto", "DAS", "DARF", "GPS" -> **Impostos e Tributos**
- "tarifa", "manutencao" -> **Despesas Bancárias**
- "juros" -> **Juros Passivos** ou **Juros Ativos** (dependendo se é entrada ou saída)
- "compra equipamento", "máquina", "veículo" -> **Compra de Ativo Imobilizado**
- **/ESTORNO/i** -> **'Ajustes e Estornos'**. Esta é uma conta transitória para garantir que não seja classificada incorretamente como receita ou despesa operacional. Marque \\\`needsReview\\\` como \\\`true\\\`. A IA de auditoria irá verificar o impacto no balancete.

---

### **FASE 4: VALIDAÇÃO E CONFIANÇA**
Para cada transação extraída, adicione:
-   **confidenceScore**: Um número de 0.0 a 1.0 indicando sua confiança na CLASSIFICAÇÃO. Use 1.0 para regras óbvias (ex: 'PAGAMENTO DAS', 'Transferência Interna' confirmada). Para 'Ajustes e Estornos', use um score mais baixo, como 0.7, para forçar a revisão.
-   **needsReview**: Um booleano. Defina como **true** se a \`confidenceScore\` for menor que 0.85, se a descrição for muito vaga ('PIX QR CODE') ou se for um estorno. Caso contrário, **false**.

---

### **FASE 5: SAÍDA ESTRUTURADA E DADOS DE FECHAMENTO**
Retorne **APENAS o JSON** final. Não inclua texto explicativo.
-   **banco**: Identifique o nome do banco no extrato (ex: "Banco do Brasil", "SICOOB").
-   **saldoFinal**: CRÍTICO. Extraia o **SALDO FINAL** do extrato. Deve ser um número (positivo ou negativo). Se não encontrar, retorne 0.
-   **transacoes**: A lista de transações. Se não for possível extrair, retorne um array 'transacoes' vazio.
    `;

    const model_config = {
        model: 'gemini-2.5-flash',
        contents: { parts: [] as any[] },
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    banco: { type: Type.STRING, description: "Nome do banco identificado no extrato." },
                    saldoFinal: { type: Type.NUMBER, description: "O saldo final numérico extraído do extrato. Essencial para o balancete." },
                    transacoes: {
                        type: Type.ARRAY,
                        description: "Lista de transações extraídas.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                date: { type: Type.STRING, description: "Data no formato YYYY-MM-DD" },
                                description: { type: Type.STRING },
                                value: { type: Type.NUMBER },
                                classification: { type: Type.STRING, description: "Classificação contábil sugerida." },
                                confidenceScore: { type: Type.NUMBER, description: "Score de confiança da classificação (0.0 a 1.0)." },
                                needsReview: { type: Type.BOOLEAN, description: "True se a transação precisa de revisão manual." }
                            },
                            required: ["date", "description", "value", "classification", "confidenceScore", "needsReview"]
                        }
                    }
                },
                required: ["banco", "saldoFinal", "transacoes"]
            }
        }
    };
    
    model_config.contents.parts.push({ text: masterPrompt });

    if (statementContent.mimeType.startsWith('image/') || statementContent.mimeType === 'application/pdf') {
        model_config.contents.parts.push({
            inlineData: {
                mimeType: statementContent.mimeType,
                data: statementContent.data,
            },
        });
    } else {
        model_config.contents.parts.push({ text: `\n\n--- INÍCIO DO EXTRATO ---\n\n${statementContent.data}\n\n--- FIM DO EXTRATO ---` });
    }

    const response = await ai.models.generateContent(model_config);
    return response.text;
};


// --- TRIAL BALANCE AUDIT ---
export const auditTrialBalance = async (transactions: Transaction[], companyContext: Company | null): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: `Como um auditor contábil sênior, seu objetivo principal é garantir o equilíbrio da partida dobrada e a precisão das classificações. Analise a lista de transações e retorne um relatório JSON de "findings".

**CONTEXTO DA EMPRESA (PARA IDENTIFICAR TRANSAÇÕES INTERNAS):**
- **CNPJ/CPF Principal:** ${companyContext?.data.cnpj || 'Não informado'}
- **Contas e Vínculos Conhecidos:** ${companyContext?.accounts || 'Não informado'}

**PONTOS CRÍTICOS DE VERIFICAÇÃO:**
1.  **Partida Dobrada (ERRO CRÍTICO)**: Calcule a soma de todos os valores das transações (débitos são negativos, créditos são positivos).
    -   Se o total **NÃO FOR ZERO** (ou muito próximo), reporte um **'error'**. A mensagem DEVE incluir a diferença exata.
    -   Na mensagem, sugira a causa mais provável: "A causa mais comum é uma transferência interna classificada incorretamente como receita ou despesa. Verifique transações de/para as contas da empresa."
2.  **Possíveis Transferências Internas Mal Classificadas (SUGESTÃO)**: Mesmo que a partida dobrada esteja correta, procure por transações classificadas como 'Receita' ou 'Despesa' que pareçam internas com base na descrição e nos dados da empresa. Se encontrar, crie uma **'suggestion'**.
3.  **Transações Duplicadas (AVISO)**: Encontre transações com data, valor e descrição muito similares. Se encontrar, crie um **'warning'**.
4.  **Conformidade com Plano de Contas (SUGESTÃO)**: A classificação não condiz com a descrição? (Ex: Histórico 'Pagto Fornecedor' classificado como 'Receita de Vendas', ou um 'Aluguel' classificado como 'Despesas Operacionais' genérico em vez da conta específica 'Aluguel'). Crie uma **'suggestion'** para reclassificar para a conta mais apropriada.
5.  **Análise de Estornos (SUGESTÃO)**: Procure por transações classificadas como **'Ajustes e Estornos'**. Para cada uma, tente encontrar a transação original (com valor oposto e descrição similar).
    - Se encontrar a original, crie uma **'suggestion'** para o estorno, sugerindo: "Este estorno parece reverter a transação '\${original_transaction_description}'. Para anular o efeito, reclassifique este lançamento para a mesma conta da original ('\${original_transaction_classification}')".
    - Se não encontrar a original, crie uma **'warning'** para o estorno: "Este estorno precisa ser analisado. Verifique qual lançamento original ele está revertendo e ajuste a classificação de ambos, se necessário."

Para cada problema (finding), inclua:
-   **type**: 'error', 'warning', ou 'suggestion'.
-   **message**: A descrição clara do problema.
-   **transactionId**: O ID da transação problemática, SE APLICÁVEL.

**DADOS PARA ANÁLISE:**
- Transações: ${JSON.stringify(transactions, null, 2)}

Responda **APENAS** com o array JSON de findings.
`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        type: { type: Type.STRING, description: "Pode ser 'error', 'warning', ou 'suggestion'." },
                        message: { type: Type.STRING, description: "A mensagem descrevendo o problema encontrado." },
                        transactionId: { type: Type.STRING, description: "O ID da transação relacionada, se houver." },
                    },
                    required: ["type", "message"]
                }
            },
            thinkingConfig: { thinkingBudget: 32768 } // Max budget for deep analysis
        }
    });
    return response.text;
};


// --- AI CORRECTION PROPOSAL ---
export const proposeCorrections = async (transactions: Transaction[], findings: AuditFinding[], companyContext: Company | null): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: `Como um auditor contábil sênior, seu objetivo é propor correções para os problemas (findings) que **GARANTAM O EQUILÍBRIO DA PARTIDA DOBRADA** e aumentem a precisão da classificação contábil. Retorne um array JSON com propostas de correção para cada "finding" que tenha um "transactionId".

**CONTEXTO DA EMPRESA:**
- **CNPJ/CPF Principal:** ${companyContext?.data.cnpj || 'Não informado'}
- **Contas e Vínculos Conhecidos:** ${companyContext?.accounts || 'Não informado'}

**INSTRUÇÕES PARA CORREÇÃO:**
1.  **Priorize o Equilíbrio**: Se um finding aponta um desequilíbrio, sua principal suspeita deve ser uma transferência interna mal classificada. A correção mais importante é reclassificar a transação para **"Transferência Interna"**. Isso resolve o problema, pois afeta apenas contas de ativo, sem impactar o resultado.
2.  **Aumente a Precisão**: Se um finding sugere uma classificação mais específica (ex: 'Aluguel' em vez de 'Despesas Operacionais'), proponha essa mudança.
3.  **Seja Explícito**: Para cada correção, forneça:
    -   **transactionId**: O ID da transação.
    -   **reason**: Uma explicação concisa. (Ex: "Reclassificando para 'Transferência Interna' para corrigir o desequilíbrio da partida dobrada.")
    -   **updates**: Um objeto com APENAS os campos a serem alterados. Foque em 'classification'.

**DADOS PARA ANÁLISE:**
- Transações: ${JSON.stringify(transactions, null, 2)}
- Problemas Encontrados: ${JSON.stringify(findings, null, 2)}

Responda **APENAS** com um array JSON de objetos de correção. Se nenhum ajuste for necessário para os findings com IDs, retorne um array vazio.

Exemplo de saída:
[
  {
    "transactionId": "some-file-name-1629829-5",
    "reason": "O histórico 'Pagto Fornecedor' não condiz com a classificação 'Receita de Vendas'. Reclassificando para 'Pagamento de Fornecedores'.",
    "updates": {
      "classification": "Pagamento de Fornecedores"
    }
  }
]
`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        transactionId: { type: Type.STRING },
                        reason: { type: Type.STRING },
                        updates: {
                            type: Type.OBJECT,
                            properties: {
                                date: { type: Type.STRING },
                                description: { type: Type.STRING },
                                value: { type: Type.NUMBER },
                                classification: { type: Type.STRING }
                            }
                        }
                    },
                    required: ["transactionId", "reason", "updates"]
                }
            },
            thinkingConfig: { thinkingBudget: 32768 }
        }
    });
    return response.text;
};


// --- INVOICE ANALYSIS ---
export const analyzeInvoice = async (transactions: Transaction[]): Promise<string> => {
    // Dummy invoice data for simulation purposes
    const dummyInvoice = {
        cnpjEmitente: "12.345.678/0001-99",
        dataEmissao: "2024-07-05",
        valorTotal: 8500.00,
        tipo: "saida", // 'entrada' ou 'saida'
        cnae: "6201-5/01", // Desenvolvimento de programas de computador
        descricao: "Desenvolvimento de módulo de e-commerce"
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: `Você é um contador sênior especialista na Reforma Tributária Brasileira. Analise a nota fiscal (simulada) e o extrato bancário do usuário. Realize as seguintes tarefas e retorne um relatório em JSON:
1.  **Conciliação Bancária**: Verifique se existe uma transação no extrato que corresponda ao valor e data da nota fiscal.
2.  **Análise da Reforma Tributária**:
    - Calcule o valor dos novos impostos (IBS e CBS) com base no valor total da nota.
    - Assuma uma alíquota combinada de 26.5% para a análise.
    - Explique o cálculo e o impacto para o usuário.
3.  **Relatório de Conformidade**:
    - Forneça um status geral ('Regular' ou 'Irregular com pendências').
    - Dê uma recomendação clara e acionável para o usuário.

Dados da Nota Fiscal (Simulada): ${JSON.stringify(dummyInvoice)}
Extrato Bancário (Transações): ${JSON.stringify(transactions)}
`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    invoiceData: {
                        type: Type.OBJECT,
                        properties: {
                            cnpj: { type: Type.STRING },
                            date: { type: Type.STRING },
                            value: { type: Type.NUMBER },
                            description: { type: Type.STRING }
                        }
                    },
                    reconciliation: {
                        type: Type.OBJECT,
                        properties: {
                            status: { type: Type.STRING, description: "'Encontrado' ou 'Não Encontrado'" },
                            message: { type: Type.STRING }
                        }
                    },
                    taxAnalysis: {
                        type: Type.OBJECT,
                        properties: {
                            baseValue: { type: Type.NUMBER },
                            combinedRate: { type: Type.STRING },
                            ibsValue: { type: Type.NUMBER },
                            cbsValue: { type: Type.NUMBER },
                            totalTax: { type: Type.NUMBER },
                            explanation: { type: Type.STRING }
                        }
                    },
                    complianceReport: {
                        type: Type.OBJECT,
                        properties: {
                            status: { type: Type.STRING },
                            recommendation: { type: Type.STRING }
                        }
                    }
                }
            },
            thinkingConfig: { thinkingBudget: 20000 }
        }
    });
    return response.text;
};


// --- SEARCH GROUNDING ---
export const searchLegislation = async (query: string): Promise<{ text: string, sources: GroundingChunk[] }> => {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Com base nas informações mais recentes da web, responda à seguinte pergunta sobre legislação tributária brasileira: ${query}`,
        config: {
            tools: [{googleSearch: {}}],
        },
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    return { text: response.text, sources };
};

// --- MAPS GROUNDING ---
export const findNearbyAccountants = async (lat: number, lon: number): Promise<{ text: string, sources: GroundingChunk[] }> => {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "Encontre os melhores escritórios de contabilidade perto da minha localização atual e forneça um breve resumo de cada um.",
        config: {
            tools: [{googleMaps: {}}],
            toolConfig: {
                retrievalConfig: {
                    latLng: {
                        latitude: lat,
                        longitude: lon
                    }
                }
            }
        },
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    return { text: response.text, sources };
};