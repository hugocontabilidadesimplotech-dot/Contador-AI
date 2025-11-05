import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { streamChatResponse } from '../services/geminiService';

const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Olá! Eu sou a Sofia, sua assistente virtual. Como posso ajudar?' },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const stream = await streamChatResponse(input);
      let modelResponse = '';
      setMessages(prev => [...prev, { role: 'model', text: '' }]);
      
      for await (const chunk of stream) {
        modelResponse += chunk.text;
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].text = modelResponse;
          return newMessages;
        });
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'model', text: 'Desculpe, ocorreu um erro. Tente novamente.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className={`fixed bottom-0 right-0 m-6 transition-all duration-300 ${isOpen ? 'w-full max-w-md h-3/4' : 'w-16 h-16'} z-50`}>
        <div className="bg-white rounded-xl shadow-2xl h-full flex flex-col">
          {isOpen ? (
            <>
              <header className="bg-indigo-600 text-white p-4 rounded-t-xl flex justify-between items-center">
                <h3 className="font-bold text-lg">Sofia - Assistente Virtual</h3>
                <button onClick={() => setIsOpen(false)} className="text-white hover:text-indigo-200">&times;</button>
              </header>
              <div className="flex-1 p-4 overflow-y-auto bg-slate-50">
                {messages.map((msg, index) => (
                  <div key={index} className={`flex my-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-3 rounded-lg max-w-xs ${msg.role === 'user' ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-800'}`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isLoading && <div className="flex justify-start"><div className="p-3 rounded-lg bg-slate-200 text-slate-800"><span className="animate-pulse">...</span></div></div>}
                <div ref={messagesEndRef} />
              </div>
              <footer className="p-4 border-t">
                <div className="flex">
                  <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleSend()}
                    className="flex-1 p-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Digite sua pergunta..."
                    disabled={isLoading}
                  />
                  <button onClick={handleSend} disabled={isLoading} className="bg-indigo-600 text-white p-2 rounded-r-md hover:bg-indigo-700 disabled:bg-indigo-300">
                    Enviar
                  </button>
                </div>
              </footer>
            </>
          ) : (
            <button onClick={() => setIsOpen(true)} className="w-16 h-16 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-transform hover:scale-110">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.76 9.76 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default ChatBot;
