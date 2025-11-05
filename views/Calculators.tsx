import React, { useState } from 'react';
import CalendarDaysIcon from '../components/icons/CalendarDaysIcon';
import BookOpenIcon from '../components/icons/BookOpenIcon';
import CalculatorsIcon from '../components/icons/CalculatorsIcon';

const CalculatorCard: React.FC<{ title: string; inputs: string[]; description: string }> = ({ title, inputs, description }) => {
    const handleCalculate = () => {
        alert(`Simulando cálculo para ${title}. Em uma aplicação real, aqui seria exibido o resultado com base nos valores inseridos.`);
    };

    return (
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col">
            <h4 className="font-bold text-slate-800">{title}</h4>
            <p className="text-xs text-slate-500 mb-3 flex-grow">{description}</p>
            <div className="space-y-2">
                {inputs.map(input => (
                    <input key={input} type="text" placeholder={input} className="w-full text-sm px-2 py-1 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                ))}
            </div>
            <button onClick={handleCalculate} className="mt-3 w-full bg-indigo-500 text-white font-semibold text-sm py-1.5 rounded-md hover:bg-indigo-600 transition-colors">
                Calcular
            </button>
        </div>
    );
};

const FAQItem: React.FC<{ question: string; answer: string; isOpen: boolean; onClick: () => void }> = ({ question, answer, isOpen, onClick }) => (
    <div className="border-b border-slate-200">
        <button onClick={onClick} className="w-full text-left flex justify-between items-center p-4 hover:bg-slate-50">
            <span className="font-medium text-slate-800">{question}</span>
            <span className={`transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-slate-500"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
            </span>
        </button>
        {isOpen && (
            <div className="p-4 pt-0 text-slate-600">
                <p>{answer}</p>
            </div>
        )}
    </div>
);

const Calculators: React.FC = () => {
    const [openFaq, setOpenFaq] = useState<number | null>(0);
    
    const taxCalculators = [
        { title: 'IBS (Reforma Tributária)', inputs: ['Setor de Atividade', 'Valor da Operação (R$)', 'Localização'], description: 'Calcule o novo Imposto sobre Bens e Serviços.' },
        { title: 'CBS (Reforma Tributária)', inputs: ['Valor da Operação (R$)', 'Alíquota (%)'], description: 'Calcule a Contribuição sobre Bens e Serviços.' },
        { title: 'Simples Nacional (DAS)', inputs: ['Anexo (Ex: I, III, IV)', 'Faturamento Anual (R$)'], description: 'Estime o valor do Documento de Arrecadação.' },
        { title: 'Lucro Presumido', inputs: ['Receita do Trimestre (R$)', 'Atividade'], description: 'Calcule o IRPJ e a CSLL trimestral.' },
        { title: 'Lucro Real', inputs: ['Receitas', 'Despesas Dedutíveis'], description: 'Cálculo completo do IRPJ e CSLL.' },
        { title: 'Fator R', inputs: ['Folha de Salários (12m)', 'Receita Bruta (12m)'], description: 'Verifique o enquadramento no Anexo III ou V.' },
    ];
    
    const faqs = [
        { q: 'O que muda com a Reforma Tributária (IBS e CBS)?', a: 'A Reforma unifica cinco tributos (PIS, Cofins, IPI, ICMS e ISS) em dois novos: a CBS (federal) e o IBS (estadual/municipal). O objetivo é simplificar o sistema, com uma base de cálculo ampla e poucas exceções, além de adotar o princípio do destino, onde o imposto é devido no local de consumo.' },
        { q: 'Como saber se minha empresa pode optar pelo Simples Nacional?', a: 'Podem optar pelo Simples Nacional as microempresas (ME) e empresas de pequeno porte (EPP) que não se enquadrem em nenhuma das vedações legais. O principal critério é o limite de faturamento anual, que atualmente é de R$ 4,8 milhões. Algumas atividades, como as de natureza financeira, são vedadas.' },
        { q: 'Qual a diferença entre Lucro Presumido e Lucro Real?', a: 'No Lucro Presumido, o imposto é calculado sobre uma margem de lucro pré-fixada por lei, que varia conforme a atividade. É mais simples. No Lucro Real, o imposto incide sobre o lucro contábil real da empresa, apurado após ajustes (adições e exclusões). É mais complexo, porém pode ser mais vantajoso para empresas com margens de lucro baixas ou prejuízo.' },
    ];

    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
    const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const leadingEmptyDays = Array.from({ length: (firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1) });
    const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const events: { [key: number]: { title: string, color: 'red' | 'orange' } } = {};

    return (
    <div className="space-y-8">
        <header>
            <h1 className="text-3xl font-bold text-slate-900">Ferramentas Especializadas</h1>
            <p className="text-slate-600 mt-1">Seu centro de utilidades para cálculos, prazos e conhecimento contábil.</p>
        </header>

        {/* Calculadoras Tributárias */}
        <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex items-center mb-4">
                <div className="bg-indigo-100 p-2 rounded-full mr-3"><CalculatorsIcon /></div>
                <h2 className="text-xl font-semibold text-slate-800">Calculadoras Tributárias</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {taxCalculators.map(calc => <CalculatorCard key={calc.title} {...calc} />)}
            </div>
        </div>

        {/* Calendário Fiscal e Base de Conhecimento */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Calendário Fiscal */}
            <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="flex items-center mb-4">
                    <div className="bg-green-100 p-2 rounded-full mr-3"><CalendarDaysIcon /></div>
                    <h2 className="text-xl font-semibold text-slate-800">Calendário Fiscal</h2>
                </div>
                <div className="text-center font-bold mb-3">{today.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500 mb-2">
                    {weekDays.map(day => <div key={day}>{day}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {leadingEmptyDays.map((_, i) => <div key={`empty-${i}`} className="h-10"></div>)}
                    {monthDays.map(day => (
                        <div key={day} className={`h-10 flex items-center justify-center rounded-full relative ${day === today.getDate() ? 'bg-indigo-600 text-white font-bold' : 'text-slate-700'} ${events[day] ? 'font-semibold' : ''}`}>
                            {day}
                            {events[day] && <div className={`absolute -bottom-1 w-1.5 h-1.5 rounded-full ${events[day].color === 'red' ? 'bg-red-500' : 'bg-amber-500'}`}></div>}
                        </div>
                    ))}
                </div>
                <div className="flex items-center justify-center space-x-4 text-xs mt-4 border-t pt-3">
                    <div className="flex items-center"><span className="w-2 h-2 bg-red-500 rounded-full mr-1.5"></span>Vencimento Crítico</div>
                    <div className="flex items-center"><span className="w-2 h-2 bg-amber-500 rounded-full mr-1.5"></span>Alerta Próximo</div>
                </div>
                 <div className="mt-4 text-center">
                    <a href="#" className="text-sm text-indigo-600 hover:underline font-medium">Ver calendário completo e links oficiais</a>
                </div>
            </div>

            {/* Base de Conhecimento */}
            <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="flex items-center mb-4">
                    <div className="bg-blue-100 p-2 rounded-full mr-3"><BookOpenIcon /></div>
                    <h2 className="text-xl font-semibold text-slate-800">Base de Conhecimento</h2>
                </div>
                <div className="space-y-3 mb-4">
                    <a href="#" className="block text-indigo-600 hover:underline">➔ Acessar Legislação Atualizada</a>
                    <a href="#" className="block text-indigo-600 hover:underline">➔ Baixar Modelos de Documentos</a>
                    <a href="#" className="block text-indigo-600 hover:underline">➔ Assistir Tutoriais em Vídeo</a>
                </div>
                <h3 className="font-semibold text-slate-700 mt-4 border-t pt-4">Perguntas Frequentes (FAQ)</h3>
                <div className="mt-2 rounded-lg border border-slate-200">
                    {faqs.map((faq, index) => (
                        <FAQItem 
                            key={index} 
                            question={faq.q} 
                            answer={faq.a} 
                            isOpen={openFaq === index} 
                            onClick={() => setOpenFaq(openFaq === index ? null : index)} 
                        />
                    ))}
                </div>
            </div>
        </div>
    </div>
  );
};

export default Calculators;