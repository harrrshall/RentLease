import React from 'react';
import { AlertTriangle, CheckCircle, Gavel, DollarSign, Quote, Activity, ListChecks } from 'lucide-react';
import { PDROutput } from '@/lib/schema';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Map unknown string severities to known keys if possible, or use default
const getSeverityColor = (severity: string | undefined) => {
    const s = severity?.toLowerCase() || '';
    if (s.includes('critical')) return 'bg-red-50 text-red-700 ring-red-600/20';
    if (s.includes('high')) return 'bg-orange-50 text-orange-700 ring-orange-600/20';
    if (s.includes('medium')) return 'bg-yellow-50 text-yellow-700 ring-yellow-600/20';
    if (s.includes('low')) return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
    return 'bg-slate-50 text-slate-700 ring-slate-600/20';
};

const getRiskColor = (risk: string | undefined) => {
    const r = risk?.toLowerCase() || '';
    if (r.includes('high')) return 'text-red-600';
    if (r.includes('medium')) return 'text-amber-600';
    if (r.includes('low')) return 'text-emerald-600';
    return 'text-slate-600';
};

const getRiskBg = (risk: string | undefined) => {
    const r = risk?.toLowerCase() || '';
    if (r.includes('high')) return 'bg-red-500';
    if (r.includes('medium')) return 'bg-amber-500';
    if (r.includes('low')) return 'bg-emerald-500';
    return 'bg-slate-500';
};

export function DiagnosisCard({ data }: { data: DeepPartial<PDROutput['diagnosis']> }) {
    return (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200/60 p-6 mb-6 transition-all hover:shadow-md">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5 tracking-tight">
                    <Activity className="w-6 h-6 text-indigo-600" />
                    {data?.title || 'Analyzing dispute...'}
                </h2>
                {data?.severity && (
                    <span className={cn("px-4 py-1.5 rounded-full text-sm font-semibold ring-1 ring-inset", getSeverityColor(data.severity))}>
                        {data.severity} Severity
                    </span>
                )}
            </div>
            <p className="text-slate-600 text-lg leading-relaxed">{data?.summary}</p>
        </div>
    );
}

export function RiskMeter({ data }: { data: DeepPartial<PDROutput['riskAssessment']> }) {
    return (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200/60 p-6 mb-6 flex flex-col h-full">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-indigo-600" />
                Risk Assessment
            </h3>
            
            <div className="space-y-8 flex-grow">
                {/* Legal Risk */}
                <div>
                   <div className="flex justify-between items-center mb-2">
                       <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Legal Risk</span>
                       <span className={cn("text-sm font-bold", getRiskColor(data?.legalRisk))}>
                           {data?.legalRisk?.split('.')[0] || 'Assessing...'}
                       </span>
                   </div>
                   <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-2">
                       <div className={cn("h-full rounded-full transition-all duration-500", getRiskBg(data?.legalRisk))} style={{ width: '100%' }}></div>
                   </div>
                   <p className="text-sm text-slate-600 leading-relaxed">
                       {data?.legalRisk}
                   </p>
                </div>

                {/* Financial Risk */}
                <div>
                   <div className="flex justify-between items-center mb-2">
                       <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Financial Risk</span>
                       <span className={cn("text-sm font-bold", getRiskColor(data?.financialRisk))}>
                           {data?.financialRisk?.split('.')[0] || 'Assessing...'}
                       </span>
                   </div>
                   <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-2">
                       <div className={cn("h-full rounded-full transition-all duration-500", getRiskBg(data?.financialRisk))} style={{ width: '100%' }}></div>
                   </div>
                   <p className="text-sm text-slate-600 leading-relaxed">
                       {data?.financialRisk}
                   </p>
                </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                             <DollarSign className="w-5 h-5" />
                        </div>
                        <div>
                             <p className="text-xs font-medium text-slate-500 uppercase">Est. Financial Impact</p>
                             <p className="font-bold text-slate-900">{data?.financialImpactEstimate || 'Calculating...'}</p>
                        </div>
                    </div>
                     <div className="text-right">
                         <p className="text-xs font-medium text-slate-500 uppercase">Risk Score</p>
                         <p className="text-2xl font-bold text-slate-900">{data?.score || 0}<span className="text-sm text-slate-400 font-normal">/100</span></p>
                     </div>
                </div>
            </div>
        </div>
    );
}

export function DecisionTree({ options }: { options: DeepPartial<PDROutput['decisionTree']> }) {
    return (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200/60 p-6 mb-6">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2.5">
                <Gavel className="w-5 h-5 text-indigo-600" />
                Strategic Decision Map
            </h3>
            <div className="space-y-4">
                {options?.map((option, i) => (
                    <div 
                        key={i} // Using index as key to prevent duplicate key errors during streaming
                        className={cn(
                            "relative overflow-hidden p-5 rounded-xl border transition-all duration-300", 
                            option?.recommended 
                                ? "border-indigo-200 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-500/10" 
                                : "border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                        )}
                    >
                        {option?.recommended && (
                            <div className="absolute top-0 right-0 p-1.5 md:p-2 bg-indigo-600 rounded-bl-xl text-white shadow-sm">
                                <CheckCircle className="w-4 h-4 md:w-5 md:h-5" />
                            </div>
                        )}
                        
                        <div className="flex flex-col gap-2">
                             <div className="flex items-center gap-3 mb-1">
                                 <span className={cn("text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wide", 
                                     getSeverityColor(option?.riskLevel)
                                 )}>
                                     {option?.riskLevel || 'Unknown'} Risk
                                 </span>
                                 <h4 className="font-bold text-slate-900 text-lg">{option?.label}</h4>
                             </div>
                             <p className="text-slate-600 leading-relaxed text-sm md:text-base">{option?.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function RealityCheck({ data }: { data: DeepPartial<PDROutput['realityCheck']> }) {
    return (
        <div className="bg-slate-900 rounded-2xl shadow-xl overflow-hidden mb-6 flex flex-col h-full relative group">
            <div className="absolute top-0 right-0 p-8 opacity-10 transition-transform group-hover:scale-110 duration-700">
                <Quote className="w-32 h-32 text-white" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent"></div>
            
            <div className="p-8 relative z-10 flex flex-col h-full">
                <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Reality Check
                </h3>
                
                <div className="flex-grow flex items-center">
                    <blockquote className="text-xl md:text-2xl font-medium text-slate-100 italic leading-relaxed">
                        "{data?.quote}"
                    </blockquote>
                </div>
                
                <div className="mt-8 pt-6 border-t border-slate-800">
                    <p className="text-sm text-slate-400 font-medium">
                        Case Context: <span className="text-slate-300">{data?.context}</span>
                    </p>
                </div>
            </div>
        </div>
    );
}

export function PreMortem({ items }: { items: (string | undefined | null)[] | undefined }) {
    if (!items) return null;
    const filteredItems = items.filter((item): item is string => !!item);
    if (filteredItems.length === 0) return null;

    return (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200/60 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2.5">
                <ListChecks className="w-5 h-5 text-indigo-600" />
                Pre-Execution Checklist
            </h3>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredItems.map((item, i) => (
                    <li key={i} className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                        <div className="mt-0.5 min-w-[1.5rem] h-6 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
                            {i + 1}
                        </div>
                        <span className="text-slate-700 text-sm font-medium pt-0.5">{item}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export function PDRReport({ data }: { data: DeepPartial<PDROutput> }) {
    if (!data || !data.diagnosis) return null;
    
    return (
        <div className="max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-8 duration-700 pb-16">
            <DiagnosisCard data={data.diagnosis} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                 {data.riskAssessment && <RiskMeter data={data.riskAssessment} />}
                 {data.realityCheck && <RealityCheck data={data.realityCheck} />}
            </div>
            {data.decisionTree && <DecisionTree options={data.decisionTree} />}
            {data.preMortemChecklist && <PreMortem items={data.preMortemChecklist} />}
        </div>
    );
}
