import React from 'react';
import { View, Company } from '../types';
import DashboardIcon from './icons/DashboardIcon';
import CompaniesIcon from './icons/CompaniesIcon';
import ExtractsIcon from './icons/ExtractsIcon';
import ReportsIcon from './icons/ReportsIcon';
import InvoicesIcon from './icons/InvoicesIcon';
import CalculatorsIcon from './icons/CalculatorsIcon';
import PencilSquareIcon from './icons/PencilSquareIcon';
import ArrowLeftOnRectangleIcon from './icons/ArrowLeftOnRectangleIcon';


interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  onLogout: () => void;
  companies: Company[];
}

const NavItem: React.FC<{
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, icon, isActive, onClick }) => (
  <li>
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={`flex items-center p-2 rounded-lg transition-colors duration-200 ${
        isActive ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-100 hover:bg-slate-700'
      }`}
    >
      {icon}
      <span className="ml-3">{label}</span>
    </a>
  </li>
);

const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, onLogout, companies }) => {
  const navItems = [
    { view: 'dashboard' as View, label: 'Dashboard', icon: <DashboardIcon /> },
    { view: 'companies' as View, label: 'Empresas', icon: <CompaniesIcon /> },
    { view: 'extracts' as View, label: 'Extratos', icon: <ExtractsIcon /> },
    { view: 'reports' as View, label: 'Relatórios', icon: <ReportsIcon /> },
    { view: 'invoices' as View, label: 'Notas Fiscais', icon: <InvoicesIcon /> },
    { view: 'manual-entries' as View, label: 'Lançamentos', icon: <PencilSquareIcon /> },
    { view: 'calculators' as View, label: 'Calculadoras', icon: <CalculatorsIcon /> },
  ];

  return (
    <aside className="w-64 bg-slate-800 text-white flex flex-col p-4">
      <div className="text-3xl font-bold mb-8 text-center">
        Simpl<span className="text-indigo-400">ö</span>s
      </div>
      <nav className="flex-1">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <NavItem
              key={item.view}
              label={item.label}
              icon={item.icon}
              isActive={currentView === item.view}
              onClick={() => setCurrentView(item.view)}
            />
          ))}
        </ul>
        <hr className="my-6 border-slate-600" />
         <div>
          <h3 className="px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Minhas Empresas</h3>
          <ul className="mt-2 space-y-1">
            {companies.length > 0 ? companies.map(company => (
              <li key={company.id} className="group rounded-lg hover:bg-slate-700">
                <a href="#" onClick={e => e.preventDefault()} className="flex items-center p-2 text-sm text-slate-300 flex-grow">
                  <span className="w-6 text-center">🏢</span>
                  <span className="ml-3 truncate">{company.name}</span>
                </a>
              </li>
            )) : (
              <li className="px-2 py-1 text-sm text-slate-400 italic">Nenhuma empresa cadastrada.</li>
            )}
          </ul>
        </div>
      </nav>
      <div className="mt-auto">
        <ul className="space-y-2 pt-4 border-t border-slate-700">
          <li>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onLogout();
              }}
              className="flex items-center p-2 rounded-lg text-slate-100 hover:bg-slate-700"
            >
              <ArrowLeftOnRectangleIcon />
              <span className="ml-3">Sair</span>
            </a>
          </li>
        </ul>
      </div>
      <div className="mt-4 pt-4 border-t border-slate-700">
        <div className="flex items-center justify-center text-xs text-slate-300">
            <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
            <span>Sistema conectado - Tempo real</span>
        </div>
        <div className="mt-4 text-center text-xs text-slate-400">
            <p>&copy; 2024 Simplös Contabilidade</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;