'use client';

import { useState, useRef, useEffect } from 'react';
import { experimental_useObject as useObject } from 'ai/react';
import { PDROutputSchema } from '@/lib/schema';
import { PDRReport } from '@/components/pdr-report';
import { Send, Sparkles, Building2, Search, ArrowUp, User, StopCircle } from 'lucide-react';
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
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    const { object, submit, isLoading, error, stop } = useObject({
        api: '/api/chat',
        schema: PDROutputSchema,
        onError: (err) => console.error('Error:', err),
    });

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [input]);

    // Scroll to bottom on new content
    useEffect(() => {
        if (activeQuery || history.length > 0) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [activeQuery, history, isLoading]);

    const filteredSuggestions = SUGGESTED_QUERIES.filter(q =>
        q.toLowerCase().includes(input.toLowerCase()) &&
        q.toLowerCase() !== input.toLowerCase()
    ).slice(0, 5);

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
        if (textareaRef.current) textareaRef.current.style.height = 'auto';

        submit({ messages: [{ role: 'user', content: finalInput }] });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const hasInteraction = history.length > 0 || isLoading || object || error;

    return (
        <main className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100">
            {/* Minimal Header */}
            <header className={clsx(
                "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
                hasInteraction ? "bg-white/80 backdrop-blur-xl border-b border-slate-200/50 supports-[backdrop-filter]:bg-white/60" : "bg-transparent"
            )}>
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <a href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity group">
                        <div className="bg-slate-900 group-hover:bg-indigo-600 transition-colors p-1.5 rounded-lg shadow-sm">
                            <Building2 className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-slate-900 text-lg tracking-tight">RentLease</span>
                    </a>
                </div>
            </header>

            <div className="flex-1 w-full max-w-3xl mx-auto px-4 md:px-0">

                {/* Initial Centered View */}
                {!hasInteraction && (
                    <div className="min-h-[85vh] flex flex-col items-center justify-center animate-in fade-in duration-700">
                        <div className="text-center mb-10 space-y-4">
                            <div className="inline-flex items-center justify-center p-2 bg-indigo-50 rounded-xl mb-4">
                                <Sparkles className="w-6 h-6 text-indigo-600" />
                            </div>
                            <h1 className="text-4xl md:text-6xl font-medium text-slate-900 tracking-tight leading-[1.1]">
                                Trusted answers for<br />
                                <span className="text-slate-400">rental conflicts.</span>
                            </h1>
                        </div>

                        <div className="w-full max-w-xl relative group z-20">
                            <form onSubmit={handleSubmit} className="relative transition-all duration-300 transform group-hover:-translate-y-1">
                                <div className="absolute inset-0 bg-indigo-500/5 rounded-3xl blur-xl transition-opacity opacity-0 group-hover:opacity-100" />
                                <div className="relative bg-white shadow-xl hover:shadow-2xl shadow-slate-200/50 rounded-3xl ring-1 ring-slate-200 transition-all focus-within:ring-2 focus-within:ring-indigo-500/20">
                                    <div className="absolute left-5 top-4 text-slate-400">
                                        <Search className="w-5 h-5" />
                                    </div>
                                    <textarea
                                        ref={textareaRef}
                                        value={input}
                                        onChange={(e) => {
                                            setInput(e.target.value);
                                            setShowSuggestions(true);
                                        }}
                                        onFocus={() => setShowSuggestions(true)}
                                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Describe your situation..."
                                        // FIXED: Added outline-none here
                                        className="w-full pl-14 pr-14 py-4 rounded-3xl bg-transparent border-0 text-slate-900 text-lg placeholder:text-slate-400 focus:ring-0 outline-none resize-none min-h-[64px] max-h-[200px]"
                                        rows={1}
                                    />
                                    <button
                                        type="submit"
                                        disabled={!input.trim()}
                                        className="absolute right-3 top-3 p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-300 text-white rounded-xl transition-all duration-200 shadow-sm"
                                    >
                                        <ArrowUp className="w-5 h-5" strokeWidth={2.5} />
                                    </button>
                                </div>

                                {/* Autocomplete */}
                                {showSuggestions && input.trim().length > 0 && filteredSuggestions.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-3 bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl ring-1 ring-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 p-1.5">
                                        {filteredSuggestions.map((suggestion, index) => (
                                            <button
                                                key={index}
                                                className="w-full text-left px-4 py-3 hover:bg-indigo-50 rounded-xl text-slate-700 text-sm md:text-base flex items-center gap-3 transition-colors group/item"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setInput(suggestion);
                                                    handleSubmit(e as any, suggestion);
                                                }}
                                            >
                                                <div className="p-1.5 bg-slate-100 group-hover/item:bg-white rounded-lg transition-colors">
                                                    <Search className="w-3.5 h-3.5 text-slate-400" />
                                                </div>
                                                {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </form>
                        </div>

                        {/* Quick Action Chips */}
                        <div className="mt-8 flex flex-wrap justify-center gap-2.5 max-w-2xl">
                            {[
                                "My tenant is withholding rent",
                                "Can I keep the security deposit?",
                                "Landlord entering without notice"
                            ].map((text) => (
                                <button
                                    key={text}
                                    onClick={() => {
                                        setInput(text);
                                        if (textareaRef.current) textareaRef.current.focus();
                                    }}
                                    className="px-4 py-2 bg-white/50 hover:bg-white border border-slate-200 hover:border-indigo-200 rounded-full text-sm text-slate-600 hover:text-indigo-600 transition-all shadow-sm hover:shadow-md cursor-pointer"
                                >
                                    {text}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Chat Interface */}
                {hasInteraction && (
                    <div className="pt-24 pb-48 w-full">
                        <div className="space-y-8 md:space-y-12">
                            {/* Archived History */}
                            {history.map((item, i) => (
                                <div key={i} className="group animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {/* User Message */}
                                    <div className="flex justify-end mb-6">
                                        <div className="max-w-[85%] md:max-w-[70%] bg-white border border-slate-100 rounded-[2rem] rounded-tr-sm px-6 py-4 shadow-sm">
                                            <p className="text-slate-800 text-lg leading-relaxed whitespace-pre-wrap">{item.query}</p>
                                        </div>
                                    </div>

                                    {/* AI Response */}
                                    <div className="flex gap-4 md:gap-6">
                                        <div className="flex-shrink-0 mt-1">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
                                                <Sparkles className="w-4 h-4 text-white" />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="prose prose-slate prose-lg max-w-none prose-headings:font-medium prose-p:leading-relaxed prose-a:text-indigo-600">
                                                <PDRReport data={item.data} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Active Stream */}
                            {(activeQuery || isLoading) && (
                                <div className="group animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {/* User Message */}
                                    <div className="flex justify-end mb-6">
                                        <div className="max-w-[85%] md:max-w-[70%] bg-slate-900 text-white rounded-[2rem] rounded-tr-sm px-6 py-4 shadow-lg shadow-slate-900/10">
                                            <p className="text-lg leading-relaxed whitespace-pre-wrap">{activeQuery}</p>
                                        </div>
                                    </div>

                                    {/* AI Stream */}
                                    <div className="flex gap-4 md:gap-6">
                                        <div className="flex-shrink-0 mt-1">
                                            <div className="w-8 h-8 rounded-full bg-white border border-indigo-100 flex items-center justify-center animate-pulse">
                                                <Sparkles className="w-4 h-4 text-indigo-600" />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            {object ? (
                                                <div className="prose prose-slate prose-lg max-w-none">
                                                    <PDRReport data={object} />
                                                </div>
                                            ) : (
                                                <div className="space-y-4 max-w-2xl">
                                                    <div className="flex items-center gap-2 text-indigo-600 text-sm font-medium animate-pulse">
                                                        <span>Analyzing case law</span>
                                                        <span className="flex gap-1">
                                                            <span className="w-1 h-1 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                                            <span className="w-1 h-1 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                                            <span className="w-1 h-1 bg-indigo-600 rounded-full animate-bounce"></span>
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                            {error && (
                                                <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 mt-4 text-sm font-medium">
                                                    Something went wrong. Please try again.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={bottomRef} />
                        </div>
                    </div>
                )}
            </div>

            {/* Sticky Bottom Input (Only on interaction) */}
            {hasInteraction && (
                <div className="fixed bottom-0 left-0 right-0 z-40">
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-slate-50/95 to-transparent h-full pointer-events-none" />
                    <div className="relative max-w-3xl mx-auto px-4 pb-6 pt-10">
                        <div className="relative group">
                            <form
                                onSubmit={handleSubmit}
                                className="relative bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] rounded-[26px] ring-1 ring-slate-200 transition-all duration-200 focus-within:shadow-[0_8px_30px_rgb(79,70,229,0.12)] focus-within:ring-indigo-500/30"
                            >
                                <textarea
                                    ref={textareaRef}
                                    value={input}
                                    onChange={(e) => {
                                        setInput(e.target.value);
                                        setShowSuggestions(true);
                                    }}
                                    onFocus={() => setShowSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask a follow-up question..."
                                    // FIXED: Added outline-none here
                                    className="w-full pl-5 pr-14 py-4 rounded-[26px] bg-transparent border-0 text-slate-900 text-base md:text-lg placeholder:text-slate-400 focus:ring-0 outline-none resize-none max-h-[160px] scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent"
                                    rows={1}
                                />
                                <div className="absolute right-2 top-[50%] -translate-y-1/2 flex items-center gap-2">
                                    {isLoading ? (
                                        <button
                                            type="button"
                                            onClick={() => stop()}
                                            className="p-2 bg-slate-900 hover:bg-slate-800 text-white rounded-full transition-all"
                                        >
                                            <StopCircle className="w-4 h-4" />
                                        </button>
                                    ) : (
                                        <button
                                            type="submit"
                                            disabled={!input.trim()}
                                            className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-300 text-white rounded-full transition-all duration-200 ease-out shadow-sm"
                                        >
                                            <ArrowUp className="w-5 h-5" strokeWidth={2.5} />
                                        </button>
                                    )}
                                </div>
                            </form>

                            {/* Mobile Suggestion Dropdown */}
                            {showSuggestions && input.trim().length > 0 && filteredSuggestions.length > 0 && (
                                <div className="absolute bottom-full left-0 right-0 mb-3 bg-white rounded-2xl shadow-xl ring-1 ring-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                                    {filteredSuggestions.map((suggestion, index) => (
                                        <button
                                            key={index}
                                            className="w-full text-left px-5 py-3 hover:bg-slate-50 text-slate-700 text-sm border-b last:border-0 border-slate-50 flex items-center gap-3"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setInput(suggestion);
                                                handleSubmit(e as any, suggestion);
                                            }}
                                        >
                                            <Search className="w-4 h-4 text-slate-400" />
                                            <span className="truncate">{suggestion}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="text-center mt-3">
                            <p className="text-[10px] md:text-xs text-slate-400 font-medium tracking-wide uppercase">
                                response are based on the real-life data
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}