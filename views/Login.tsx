import React, { useState } from 'react';
import GoogleIcon from '../components/icons/GoogleIcon';
import { User } from '../types';

interface LoginProps {
    onLoginSuccess: (user: User) => void;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
    const [isLoginView, setIsLoginView] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [emailError, setEmailError] = useState('');

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newEmail = e.target.value;
        setEmail(newEmail);
        if (newEmail && !emailRegex.test(newEmail)) {
            setEmailError('Por favor, insira um email válido.');
        } else {
            setEmailError('');
        }
    };
    
    const simulateApiCall = (user: User) => {
        setIsLoading(true);
        setTimeout(() => {
            onLoginSuccess(user);
            setIsLoading(false);
        }, 1000); // 1 second delay
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (emailError) return;
        const user = isLoginView ? { name: 'Usuário' } : { name: name || 'Novo Usuário' };
        simulateApiCall(user);
    };

    const handleGoogleLogin = () => {
        simulateApiCall({ name: 'Usuário Google' });
    }
    
    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-xl">
                <div className="text-center">
                    <h1 className="text-4xl font-bold mb-2">
                        Simpl<span className="text-indigo-600">ö</span>s
                    </h1>
                    <h2 className="text-2xl font-bold text-slate-800">
                        {isLoginView ? 'Acesse sua conta' : 'Crie sua conta'}
                    </h2>
                    <p className="text-slate-500 mt-1">
                        {isLoginView ? 'Bem-vindo de volta!' : 'Comece a simplificar sua contabilidade.'}
                    </p>
                </div>

                <button 
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="w-full flex justify-center items-center py-2.5 px-4 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:cursor-not-allowed"
                >
                    <GoogleIcon />
                    <span className="ml-2">Entrar com o Google</span>
                </button>
                
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-slate-500">OU</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLoginView && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Nome</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} required className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Email</label>
                        <input type="email" value={email} onChange={handleEmailChange} required className={`mt-1 w-full px-3 py-2 border ${emailError ? 'border-red-500' : 'border-slate-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`} />
                        {emailError && <p className="mt-1 text-xs text-red-600">{emailError}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Senha</label>
                        <input type="password" required className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>

                     {isLoginView && (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded" />
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-900">Lembrar-me</label>
                            </div>
                            <div className="text-sm">
                                <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500">Esqueceu a senha?</a>
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading || !!emailError}
                        className="w-full py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Aguarde...' : (isLoginView ? 'Entrar' : 'Cadastrar')}
                    </button>
                </form>

                <p className="text-sm text-center text-slate-500">
                    {isLoginView ? 'Não tem uma conta?' : 'Já tem uma conta?'}
                    <button onClick={() => setIsLoginView(!isLoginView)} disabled={isLoading} className="font-medium text-indigo-600 hover:text-indigo-500 ml-1 disabled:text-slate-400">
                        {isLoginView ? 'Cadastre-se' : 'Faça login'}
                    </button>
                </p>
            </div>
        </div>
    );
};

export default Login;