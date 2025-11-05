import React, { useState, useEffect, useCallback, useRef } from 'react';
import { searchLegislation, findNearbyAccountants } from '../services/geminiService';
import { GroundingChunk } from '../types';
import useGeolocation from '../hooks/useGeolocation';

const AITools: React.FC = () => {
  // --- Transcription State ---
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const handleToggleRecording = () => {
      if (isRecording) {
          mediaRecorderRef.current?.stop();
          setIsRecording(false);
      } else {
          navigator.mediaDevices.getUserMedia({ audio: true })
              .then(stream => {
                  mediaRecorderRef.current = new MediaRecorder(stream);
                  mediaRecorderRef.current.start();
                  // Simulate transcription as we don't have direct API access for this in the browser
                  mediaRecorderRef.current.ondataavailable = () => {
                    setTranscription('Simulação: "Lançar despesa de R$ 300,00 para material de escritório na conta de Despesas Administrativas." (Esta é uma simulação, a transcrição real requer uma API de speech-to-text.)');
                  };
                  setIsRecording(true);
                  setTranscription('Gravando...');
              })
              .catch(err => console.error('Error accessing microphone:', err));
      }
  };


  // --- Search Grounding State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<{ text: string; sources: GroundingChunk[] } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchError(null);
    setSearchResult(null);
    try {
      const result = await searchLegislation(searchQuery);
      setSearchResult(result);
    } catch (err) {
      console.error(err);
      setSearchError('Falha ao pesquisar. Verifique o console.');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  // --- Maps Grounding State ---
  const [mapsResult, setMapsResult] = useState<{ text: string; sources: GroundingChunk[] } | null>(null);
  const [isFinding, setIsFinding] = useState(false);
  const [mapsError, setMapsError] = useState<string | null>(null);
  const location = useGeolocation();
  
  const handleFindAccountants = useCallback(async () => {
    if (location.latitude && location.longitude) {
        setIsFinding(true);
        setMapsError(null);
        setMapsResult(null);
        try {
            const result = await findNearbyAccountants(location.latitude, location.longitude);
            setMapsResult(result);
        } catch (err) {
            console.error(err);
            setMapsError('Falha ao buscar contadores. Verifique o console.');
        } finally {
            setIsFinding(false);
        }
    } else {
        setMapsError(location.error || 'Não foi possível obter a sua localização.');
    }
  }, [location]);


  return (
    <div className="space-y-8">
        <header>
            <h1 className="text-3xl font-bold text-slate-900">Ferramentas de IA</h1>
            <p className="text-slate-600 mt-1">Explore funcionalidades avançadas com Gemini.</p>
        </header>

        {/* Audio Transcription */}
        <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-semibold mb-2">Notas por Voz (Transcrição)</h2>
            <p className="text-slate-600 mb-4">Grave um áudio para transcrever um lançamento contábil. (Requer permissão de microfone).</p>
            <button onClick={handleToggleRecording} className={`font-semibold py-2 px-6 rounded-lg transition-colors text-white ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'}`}>
                {isRecording ? 'Parar Gravação' : 'Iniciar Gravação'}
            </button>
            {transcription && <p className="mt-4 bg-slate-50 p-4 rounded-lg text-slate-800">{transcription}</p>}
        </div>

        {/* Search Grounding */}
        <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-semibold mb-2">Pesquisa de Legislação (Search Grounding)</h2>
            <p className="text-slate-600 mb-4">Faça uma pergunta sobre legislação tributária para obter respostas atualizadas com fontes da web.</p>
            <div className="flex space-x-2">
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Ex: Qual o prazo do IRPF 2024?" className="flex-1 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                <button onClick={handleSearch} disabled={isSearching} className="bg-indigo-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300">
                    {isSearching ? 'Buscando...' : 'Pesquisar'}
                </button>
            </div>
            {isSearching && <div className="mt-4 text-center">Buscando informações atualizadas...</div>}
            {searchError && <div className="mt-4 text-red-600">{searchError}</div>}
            {searchResult && (
                <div className="mt-4 space-y-4">
                    <div className="bg-slate-50 p-4 rounded-lg whitespace-pre-wrap font-sans">{searchResult.text}</div>
                    <div>
                        <h3 className="font-semibold">Fontes:</h3>
                        <ul className="list-disc list-inside text-sm">
                            {searchResult.sources.map((source, index) => source.web && (
                                <li key={index}><a href={source.web.uri} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">{source.web.title}</a></li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
        
        {/* Maps Grounding */}
        <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-semibold mb-2">Encontrar Contadores (Maps Grounding)</h2>
            <p className="text-slate-600 mb-4">Encontre escritórios de contabilidade próximos à sua localização. (Requer permissão de geolocalização).</p>
            <button onClick={handleFindAccountants} disabled={isFinding || location.loading} className="bg-green-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-green-700 disabled:bg-green-300">
                {location.loading ? 'Obtendo Localização...' : isFinding ? 'Buscando...' : 'Encontrar Próximos'}
            </button>
            {isFinding && <div className="mt-4 text-center">Buscando locais...</div>}
            {mapsError && <div className="mt-4 text-red-600">{mapsError}</div>}
            {mapsResult && (
                <div className="mt-4 space-y-4">
                    <div className="bg-slate-50 p-4 rounded-lg whitespace-pre-wrap font-sans">{mapsResult.text}</div>
                     <div>
                        <h3 className="font-semibold">Locais Encontrados:</h3>
                        <ul className="list-disc list-inside text-sm">
                            {mapsResult.sources.map((source, index) => source.maps && (
                                <li key={index}><a href={source.maps.uri} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">{source.maps.title}</a></li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default AITools;
