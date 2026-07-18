import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { generateTutorResponseStream } from '@/modules/generation/geminiService';

interface Message {
    id: string;
    role: 'user' | 'model';
    parts: string;
}

interface AiTutorProps {
    context: {
        subject: string;
        topic: string;
        grade: string;
        content: string;
    };
    studentName: string;
}

const AiTutor: React.FC<AiTutorProps> = ({ context, studentName }) => {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'model',
            parts: `Hi ${studentName}! I'm your AI Tutor. I can help you with this ${context.topic} assignment. Ask me anything!`
        }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isTyping) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            parts: input
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsTyping(true);

        try {
            const responseStream = generateTutorResponseStream({
                studentQuery: userMessage.parts,
                chatHistory: messages,
                context
            });

            const botMessageId = (Date.now() + 1).toString();
            setMessages(prev => [
                ...prev,
                { id: botMessageId, role: 'model', parts: '' }
            ]);

            let fullResponse = '';
            for await (const chunk of responseStream) {
                fullResponse += chunk;
                setMessages(prev =>
                    prev.map(msg =>
                        msg.id === botMessageId ? { ...msg, parts: fullResponse } : msg
                    )
                );
            }
        } catch (error) {
            console.error('Error getting tutor response:', error);
            setMessages(prev => [
                ...prev,
                {
                    id: Date.now().toString(),
                    role: 'model',
                    parts: 'Sorry, I had trouble connecting to my brain. Please try asking again!'
                }
            ]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="flex flex-col h-[600px] bg-white dark:bg-slate-800 rounded-2xl border-2 border-black shadow-neo overflow-hidden">
            {/* Header */}
            <div className="bg-brand-blue p-4 flex items-center gap-3 border-b-2 border-black">
                <div className="size-10 bg-white rounded-full border-2 border-black flex items-center justify-center">
                    <span className="material-symbols-outlined text-brand-blue">smart_toy</span>
                </div>
                <div>
                    <h3 className="font-bold text-white font-display">AI Tutor</h3>
                    <p className="text-xs text-white/80">Helping with {context.topic}</p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[80%] rounded-2xl p-4 border-2 border-black shadow-neo-sm ${msg.role === 'user'
                                    ? 'bg-brand-yellow text-black rounded-tr-none'
                                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none'
                                }`}
                        >
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown>{msg.parts}</ReactMarkdown>
                            </div>
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="flex justify-start">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border-2 border-black rounded-tl-none shadow-neo-sm">
                            <div className="flex gap-1">
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75" />
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150" />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 bg-white dark:bg-slate-800 border-t-2 border-black">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a question..."
                        className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-300 dark:border-slate-600 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 outline-none bg-slate-50 dark:bg-slate-900 transition-colors"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isTyping}
                        className="bg-brand-blue text-white p-3 rounded-xl border-2 border-black shadow-neo-sm hover:translate-y-0.5 hover:shadow-none transition-all disabled:opacity-50 disabled:translate-y-0 disabled:shadow-neo-sm"
                    >
                        <span className="material-symbols-outlined">send</span>
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AiTutor;
