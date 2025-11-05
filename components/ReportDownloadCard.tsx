import React from 'react';
import { Transaction } from '../types';
import { 
    generateDREData, 
    arrayToCsv, 
    generateBalanceSheetData, 
    generateProfessionalPdfHtml,
    generateSpedFileContent
} from '../utils/helpers';
import DocumentArrowDownIcon from './icons/DocumentArrowDownIcon';

export interface Report {
    title: string;
    description: string;
    type: 'DRE' | 'BalanceSheet' | 'Transactions' | 'SPED_ECD' | 'SPED_EFD' | 'SPED_ECF';
}

interface ReportDownloadCardProps {
    report: Report;
    transactions: Transaction[];
}

const ReportDownloadCard: React.FC<ReportDownloadCardProps> = ({ report, transactions }) => {
    
    const handleDownload = (format: 'pdf' | 'csv' | 'txt') => {
        let reportData: any;
        let reportName = report.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();

        switch (report.type) {
            case "DRE":
                reportData = generateDREData(transactions);
                break;
            case "BalanceSheet":
                reportData = generateBalanceSheetData(transactions);
                break;
            case "Transactions":
                reportData = transactions.map(({ id, confidenceScore, needsReview, ...rest }) => rest);
                break;
            case "SPED_ECD":
            case "SPED_EFD":
            case "SPED_ECF":
                const spedContent = generateSpedFileContent(report.type.replace('SPED_', '') as 'ECD' | 'EFD' | 'ECF', transactions);
                 const spedBlob = new Blob([spedContent], { type: 'text/plain;charset=utf-8;' });
                const spedLink = document.createElement("a");
                spedLink.href = URL.createObjectURL(spedBlob);
                spedLink.download = `${report.type}_${new Date().toISOString().split('T')[0]}.txt`;
                document.body.appendChild(spedLink);
                spedLink.click();
                document.body.removeChild(spedLink);
                return; // Early exit for SPED
        }
        
        if (!reportData || (Array.isArray(reportData) && reportData.length === 0)) {
            alert("Não há dados para gerar este relatório.");
            return;
        }

        if (format === 'csv') {
            const csvContent = arrayToCsv(reportData);
            const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `${reportName}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else if (format === 'pdf') {
            // Fix: The `generateProfessionalPdfHtml` function expects the report type as a string, not a boolean.
            const htmlContent = generateProfessionalPdfHtml(report.title, report.description, reportData, report.type);
            const printWindow = window.open('', '_blank');
            printWindow?.document.write(htmlContent);
            printWindow?.document.close();
        }
    };

    const isSped = report.type.startsWith('SPED');

    return (
        <div className="bg-white p-5 rounded-xl shadow-md flex flex-col transition-transform hover:scale-105 hover:shadow-lg">
            <div className="flex items-center mb-3">
                <div className="bg-indigo-100 p-2 rounded-full mr-4">
                    <DocumentArrowDownIcon />
                </div>
                <h3 className="text-md font-bold text-slate-800 flex-1">{report.title}</h3>
            </div>
            <p className="text-sm text-slate-500 mb-4 flex-grow">{report.description}</p>
            <div className="border-t pt-4 mt-auto flex justify-center space-x-2">
                {isSped ? (
                    <button onClick={() => handleDownload('txt')} className="text-xs font-semibold text-white bg-slate-600 hover:bg-slate-700 rounded-full px-4 py-1.5 transition-colors">Download .TXT</button>
                ) : (
                    <>
                        <button onClick={() => handleDownload('pdf')} className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-full px-3 py-1 transition-colors">PDF</button>
                        <button onClick={() => handleDownload('csv')} className="text-xs font-semibold text-white bg-green-500 hover:bg-green-600 rounded-full px-3 py-1 transition-colors">Excel</button>
                    </>
                )}
            </div>
        </div>
    );
};

export default ReportDownloadCard;