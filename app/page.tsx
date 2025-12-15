'use client';

import { useState, useRef, useEffect } from 'react';
import { experimental_useObject as useObject } from 'ai/react';
import { PDROutputSchema } from '@/lib/schema';
import { PDRReport } from '@/components/pdr-report';
import { Send, Sparkles, Building2, Search, ArrowUp } from 'lucide-react';
import clsx from 'clsx';

const SUGGESTED_QUERIES = [
    "My tenant is not paying rent",
    "Landlord entering without notice",
    "Can I keep the security deposit?",
    "Tenant painted walls without permission",
    "Lease violation noise complaints",
    "Eviction process time frame",
    "Mold in apartment landlord responsibility",
    "Breaking lease early penalties",
    "Tenant rights rent increase",
    "Subletting without permission"
];

export default function Home() {
    const [input, setInput] = useState('');
    const [history, setHistory] = useState<{ query: string; data: any }[]>([]);
    const [activeQuery, setActiveQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Check if we haven't typed anything yet or if the input exactly matches a suggestion
    const filteredSuggestions = SUGGESTED_QUERIES.filter(q =>
        q.toLowerCase().includes(input.toLowerCase()) &&
        q.toLowerCase() !== input.toLowerCase()
    ).slice(0, 5);

    const { object, submit, isLoading, error } = useObject({
        api: '/api/chat',
        schema: PDROutputSchema,
        onError: (err) => console.error('Error:', err),
    });

    const handleSubmit = (e: React.FormEvent, overrideInput?: string) => {
        e.preventDefault();
        const finalInput = overrideInput || input;
        if (!finalInput.trim()) return;

        setShowSuggestions(false);

        if (object && activeQuery) {
            setHistory(prev => [...prev, { query: activeQuery, data: object }]);
        }

        setActiveQuery(finalInput);
        setInput('');
        submit({ messages: [{ role: 'user', content: finalInput }] });
    };

    const hasInteraction = history.length > 0 || isLoading || object || error;

    return (
        <main className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100">
            {/* Minimal Header */}
            <header className={clsx(
                "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
                hasInteraction ? "bg-white/80 backdrop-blur-md border-b border-slate-200/50" : "bg-transparent"
            )}>
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <div className="bg-slate-900 p-1.5 rounded-lg">
                            <Building2 className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-slate-900 text-lg tracking-tight">RentLease</span>
                    </a>
                </div>
            </header>

            <div className="max-w-3xl mx-auto px-4 w-full">

                {/* Centered Initial View */}
                {!hasInteraction && (
                    <div className="min-h-[80vh] flex flex-col items-center justify-center animate-in fade-in duration-700">
                        <h1 className="text-4xl md:text-5xl font-medium text-slate-900 mb-8 text-center tracking-tight leading-tight">
                            Expert resolutions for<br className="hidden md:block" /> Tenants and Landlords.
                        </h1>

                        <div className="w-full max-w-2xl relative group">
                            <form onSubmit={handleSubmit} className="relative shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl bg-white ring-1 ring-slate-200 z-50">
                                <div className="absolute left-4 top-4 text-slate-400">
                                    <Search className="w-6 h-6" />
                                </div>
                                <textarea
                                    value={input}
                                    onChange={(e) => {
                                        setInput(e.target.value);
                                        setShowSuggestions(true);
                                    }}
                                    onFocus={() => setShowSuggestions(true)}
                                    // onBlur delayed to allow click
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                    placeholder="Ask anything..."
                                    className="w-full pl-14 pr-14 py-4 rounded-2xl bg-transparent border-0 text-slate-900 text-lg placeholder:text-slate-400 focus:ring-0 resize-none min-h-[60px]"
                                    rows={1}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSubmit(e);
                                        }
                                    }}
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim()}
                                    className="absolute right-3 top-3 p-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all disabled:opacity-0 disabled:scale-95 duration-200"
                                >
                                    <ArrowUp className="w-5 h-5" />
                                </button>

                                {/* Autocomplete Dropdown */}
                                {showSuggestions && input.trim().length > 0 && filteredSuggestions.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl ring-1 ring-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                        {filteredSuggestions.map((suggestion, index) => (
                                            <button
                                                key={index}
                                                className="w-full text-left px-5 py-3 hover:bg-slate-50 text-slate-700 text-sm md:text-base flex items-center gap-3 transition-colors"
                                                onClick={(e) => {
                                                    e.preventDefault(); // Prevent blur from firing immediately or double submit
                                                    setInput(suggestion);
                                                    handleSubmit(e as any, suggestion);
                                                }}
                                            >
                                                <Search className="w-4 h-4 text-slate-400" />
                                                {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </form>
                        </div>

                        <div className="mt-8 flex flex-wrap justify-center gap-3">
                            <button
                                onClick={() => {
                                    const val = "My tenant is withholding rent.";
                                    setInput(val);
                                    // Optional: auto-submit or let user submit
                                }}
                                className="px-4 py-2 bg-white rounded-full text-sm font-medium text-slate-600 shadow-sm ring-1 ring-slate-200 hover:ring-indigo-300 hover:text-indigo-600 transition-all"
                            >
                                "Tenant withholding rent"
                            </button>
                            <button
                                onClick={() => {
                                    const val = "Can I keep the security deposit?";
                                    setInput(val);
                                }}
                                className="px-4 py-2 bg-white rounded-full text-sm font-medium text-slate-600 shadow-sm ring-1 ring-slate-200 hover:ring-indigo-300 hover:text-indigo-600 transition-all"
                            >
                                "Security deposit rules"
                            </button>
                            <button
                                onClick={() => {
                                    const val = "Landlord entering without notice";
                                    setInput(val);
                                }}
                                className="px-4 py-2 bg-white rounded-full text-sm font-medium text-slate-600 shadow-sm ring-1 ring-slate-200 hover:ring-indigo-300 hover:text-indigo-600 transition-all"
                            >
                                "Privacy violations"
                            </button>
                        </div>

                        {/* Footer in Initial View */}
                        <footer className="absolute bottom-8 w-full text-center">
                            <div className="flex justify-center gap-6 text-slate-400">
                                <a href="https://www.linkedin.com/in/harshalsinghcn/" target="_blank" rel="noopener noreferrer" className="hover:text-slate-600 transition-colors text-sm font-medium">LinkedIn</a>
                                <a href="https://www.reddit.com/user/Which_Pitch1288/" target="_blank" rel="noopener noreferrer" className="hover:text-slate-600 transition-colors text-sm font-medium">Reddit</a>
                            </div>
                        </footer>
                    </div>
                )}
                {/* Chat History View */}

                {hasInteraction && (
                    <div className="pt-24 pb-40 space-y-12">
                        {/* Archived History */}
                        {history.map((item, i) => (
                            <div key={i} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                                        <span className="font-semibold text-slate-600 text-xs">YOU</span>
                                    </div>
                                    <h2 className="text-2xl font-medium text-slate-900">{item.query}</h2>
                                </div>
                                <div className="pl-12 border-l-2 border-slate-100 ml-4">
                                    <PDRReport data={item.data} />
                                </div>
                            </div>
                        ))}

                        {/* Current Active Query & Stream */}
                        {(activeQuery || isLoading) && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                                        <span className="font-semibold text-slate-600 text-xs">YOU</span>
                                    </div>
                                    <h2 className="text-2xl font-medium text-slate-900">{activeQuery}</h2>
                                </div>
                                <div className="pl-0 md:pl-12">
                                    {object ? (
                                        <PDRReport data={object} />
                                    ) : (
                                        <div className="space-y-6 max-w-2xl">
                                            <div className="flex items-center gap-3 text-slate-500 animate-pulse">
                                                <Sparkles className="w-5 h-5" />
                                                <span className="text-sm font-medium">Analyzing case precedents...</span>
                                            </div>
                                            <div className="h-40 bg-white rounded-xl shadow-sm border border-slate-100 animate-pulse"></div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="h-32 bg-white rounded-xl shadow-sm border border-slate-100 animate-pulse"></div>
                                                <div className="h-32 bg-white rounded-xl shadow-sm border border-slate-100 animate-pulse"></div>
                                            </div>
                                        </div>
                                    )}
                                    {error && (
                                        <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 mt-4">
                                            Error: {error.message}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}


                {/* Fixed Footer Input (Only visible when interaction has started) */}

                {hasInteraction && (
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent pt-20 pb-safe z-40">
                        <div className="max-w-3xl mx-auto relative group">
                            <form onSubmit={handleSubmit} className="relative shadow-lg rounded-2xl bg-white ring-1 ring-slate-200 transition-shadow focus-within:ring-2 focus-within:ring-indigo-500/20">
                                <div className="absolute left-4 top-3.5 text-slate-400 font-bold">
                                    <Search className="w-5 h-5" />
                                </div>
                                <textarea
                                    value={input}
                                    onChange={(e) => {
                                        setInput(e.target.value);
                                        setShowSuggestions(true);
                                    }}
                                    onFocus={() => setShowSuggestions(true)}
                                    // onBlur delayed to allow click
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                    placeholder="Ask follow-up..."
                                    className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-transparent border-0 text-slate-900 text-base placeholder:text-slate-400 focus:ring-0 resize-none max-h-[120px]"
                                    rows={1}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSubmit(e);
                                        }
                                    }}
                                />
                                <button
                                    type="submit"
                                    disabled={isLoading || !input.trim()}
                                    className="absolute right-2 top-2 p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ArrowUp className="w-5 h-5" />
                                </button>

                                {/* Autocomplete Dropdown (Footer) */}
                                {showSuggestions && input.trim().length > 0 && filteredSuggestions.length > 0 && (
                                    <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-xl ring-1 ring-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                                        {filteredSuggestions.map((suggestion, index) => (
                                            <button
                                                key={index}
                                                className="w-full text-left px-5 py-3 hover:bg-slate-50 text-slate-700 text-sm md:text-base flex items-center gap-3 transition-colors"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setInput(suggestion);
                                                    handleSubmit(e as any, suggestion);
                                                }}
                                            >
                                                <Search className="w-4 h-4 text-slate-400" />
                                                {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </form>
                            <div className="text-center mt-2 flex items-center justify-center gap-4">
                                <span className="text-xs text-slate-400 font-medium">RentLease AI Agent</span>
                                <span className="text-slate-300">•</span>
                                <a href="https://linkedin.com" className="text-xs text-slate-400 hover:text-indigo-600 transition-colors">LinkedIn</a>
                                <a href="https://reddit.com" className="text-xs text-slate-400 hover:text-indigo-600 transition-colors">Reddit</a>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </main>
    );
}
