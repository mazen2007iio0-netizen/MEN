/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { MousePointer2, PenLine, Play, Mail, Presentation, Folder, Loader2, FileText, Image as ImageIcon, Gamepad2, Eraser, Bot, Send, User, X, Minus, Square, Grip, Star, Inbox, Archive, Trash2, RotateCcw } from 'lucide-react';
import { GoogleGenAI, Tool, Type, Modality } from "@google/genai";

// ==================== TYPES & INTERFACES ====================
export type AppId = 'home' | 'mail' | 'slides' | 'snake' | 'folder' | 'notepad' | 'menai';

export interface DesktopItem {
    id: string;
    name: string;
    type: 'app' | 'folder';
    icon: any;
    appId?: AppId;
    contents?: DesktopItem[];
    bgColor?: string;
    notepadInitialContent?: string;
}

export interface Point {
    x: number;
    y: number;
}

export type Stroke = Point[];

export interface Email {
    id: number;
    from: string;
    subject: string;
    preview: string;
    body: string;
    time: string;
    unread: boolean;
}

export interface OpenWindow {
    id: string;
    item: DesktopItem;
    zIndex: number;
    pos: { x: number, y: number };
    size?: { width: number, height: number };
}

// ==================== GEMINI CONFIGURATION ====================
export const MODEL_NAME = "gemini-3-flash-preview";

let aiClient: GoogleGenAI | null = null;
export const getAiClient = () => {
    if (!aiClient) {
        aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY || 'PLACEHOLDER_API_KEY' });
    }
    return aiClient;
};

export const HOME_TOOLS: Tool[] = [
    {
        functionDeclarations: [
            {
                name: 'delete_item',
                description: 'Call this function for EACH item that has an "X" drawn over it.',
                parameters: {
                    type: Type.OBJECT,
                    required: ['itemName'],
                    properties: {
                        itemName: { type: Type.STRING, description: 'The exact name of the item to delete.' },
                    },
                },
            },
            {
                name: 'explode_folder',
                description: 'Call this when user explodes a folder.',
                parameters: {
                    type: Type.OBJECT,
                    required: ['folderName'],
                    properties: {
                        folderName: { type: Type.STRING, description: 'The exact name of the folder.' },
                    },
                },
            },
            {
                name: 'explain_item',
                description: 'Call this when user draws "?" over an item.',
                parameters: {
                    type: Type.OBJECT,
                    required: ['itemName'],
                    properties: {
                        itemName: { type: Type.STRING, description: 'The name of the item.' },
                    },
                },
            },
            {
                name: 'change_background',
                description: 'Call this when user sketches a wallpaper.',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        sketch_description: { type: Type.STRING, description: 'Description of the sketch.' },
                    },
                },
            },
        ],
    }
];

export const MAIL_TOOLS: Tool[] = [
    {
        functionDeclarations: [
            {
                name: 'delete_email',
                description: 'Delete an email.',
                parameters: {
                    type: Type.OBJECT,
                    required: ['subject_text'],
                    properties: {
                        subject_text: { type: Type.STRING },
                        sender_text: { type: Type.STRING },
                    },
                },
            },
            {
                name: 'summarize_email',
                description: 'Summarize an email.',
                parameters: {
                    type: Type.OBJECT,
                    required: ['subject_text'],
                    properties: {
                        subject_text: { type: Type.STRING },
                        sender_text: { type: Type.STRING },
                    },
                },
            },
        ]
    }
];

export const SYSTEM_INSTRUCTION = `You are MEN OS Assistant, an intelligent assistant. The user interacts with the screen by drawing ink strokes. Interpret their intent accurately.`;

// ==================== INITIAL DATA ====================
const INITIAL_DESKTOP_ITEMS: DesktopItem[] = [
    { id: 'menai', name: 'MEN AI', type: 'app', icon: Bot, appId: 'menai', bgColor: 'bg-gradient-to-br from-purple-500 to-indigo-800' },
    { id: 'mail', name: 'Mail', type: 'app', icon: Mail, appId: 'mail', bgColor: 'bg-gradient-to-br from-blue-400 to-blue-700' },
    { id: 'slides', name: 'Slides', type: 'app', icon: Presentation, appId: 'slides', bgColor: 'bg-gradient-to-br from-orange-400 to-orange-700' },
    { id: 'snake', name: 'Game', type: 'app', icon: Gamepad2, appId: 'snake', bgColor: 'bg-gradient-to-br from-emerald-500 to-emerald-800' },
    { 
        id: 'how_to_use', 
        name: 'how_to_use.txt', 
        type: 'app', 
        icon: FileText, 
        appId: 'notepad', 
        bgColor: 'bg-gradient-to-br from-pink-500 to-pink-700',
        notepadInitialContent: `MEN OS - GESTURE & AI GUIDE\n1. Draw "X" to delete items.\n2. Draw "?" to summarize text or folders.\n3. Open MEN AI for smart conversational assistance.` 
    },
    { id: 'docs', name: 'Documents', type: 'folder', icon: Folder, bgColor: 'bg-gradient-to-br from-sky-400 to-sky-700', contents: [
        { id: 'doc1', name: 'Report.docx', type: 'app', icon: FileText, bgColor: 'bg-gradient-to-br from-blue-500 to-blue-700' }
    ]}
];

const INITIAL_EMAILS: Email[] = [
    { id: 1, from: 'MEN OS Team', subject: 'Welcome to MEN OS!', preview: 'Your system is fully configured...', body: 'Welcome to your custom MEN OS environment. Enjoy seamless AI integration.', time: '10:45 AM', unread: true },
    { id: 2, from: 'Support', subject: 'System Update', preview: 'Performance enhancements available...', body: 'All subsystems are running smoothly.', time: 'Yesterday', unread: false }
];

// ==================== COMPONENTS ====================

// 1. Draggable Window
export const DraggableWindow: React.FC<{
    id: string;
    title: string;
    icon?: any;
    onClose: () => void;
    children: React.ReactNode;
    initialPos?: { x: number; y: number };
    initialSize?: { width: number; height: number };
    zIndex: number;
    onFocus?: () => void;
    isActive?: boolean;
}> = ({ id, title, icon: Icon, onClose, children, initialPos = { x: 50, y: 50 }, initialSize = { width: 640, height: 480 }, zIndex, onFocus, isActive = false }) => {
    const [pos, setPos] = useState(initialPos);
    const [size, setSize] = useState(initialSize);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const preMaximizeState = useRef({ pos, size });
    const dragStartPos = useRef({ x: 0, y: 0 });
    const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 });

    const handleHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.target instanceof Element && e.target.closest('button')) return;
        if (onFocus) onFocus();
        if (isMaximized) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        setIsDragging(true);
        dragStartPos.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    };

    const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        if (onFocus) onFocus();
        setIsResizing(true);
        resizeStart.current = { x: e.clientX, y: e.clientY, width: size.width, height: size.height };
    };

    const toggleMaximize = () => {
        if (isMaximized) {
            setPos(preMaximizeState.current.pos);
            setSize(preMaximizeState.current.size);
        } else {
            preMaximizeState.current = { pos, size };
            setPos({ x: 0, y: 0 });
        }
        setIsMaximized(!isMaximized);
        if (onFocus) onFocus();
    };

    useEffect(() => {
        const handleGlobalPointerMove = (e: PointerEvent) => {
            if (!isDragging && !isResizing) return;
            e.preventDefault();
            if (isDragging) {
                setPos({ x: e.clientX - dragStartPos.current.x, y: e.clientY - dragStartPos.current.y });
            }
            if (isResizing) {
                setSize({
                    width: Math.max(300, resizeStart.current.width + (e.clientX - resizeStart.current.x)),
                    height: Math.max(200, resizeStart.current.height + (e.clientY - resizeStart.current.y))
                });
            }
        };
        const handleGlobalPointerUp = () => {
            setIsDragging(false);
            setIsResizing(false);
        };
        if (isDragging || isResizing) {
            window.addEventListener('pointermove', handleGlobalPointerMove, { passive: false });
            window.addEventListener('pointerup', handleGlobalPointerUp);
        }
        return () => {
            window.removeEventListener('pointermove', handleGlobalPointerMove);
            window.removeEventListener('pointerup', handleGlobalPointerUp);
        };
    }, [isDragging, isResizing]);

    return (
        <div
            style={!isMaximized ? { left: pos.x, top: pos.y, width: size.width, height: size.height, zIndex } : { zIndex }}
            className={`absolute flex flex-col bg-zinc-900 rounded-lg shadow-2xl border ${isActive ? 'border-purple-500 ring-1 ring-purple-500/50' : 'border-zinc-800'} overflow-hidden ${isMaximized ? 'inset-0 rounded-none m-0 h-full w-full' : ''} touch-none`}
            onPointerDown={() => { if (onFocus) onFocus(); }}
        >
            <div
                onDoubleClick={toggleMaximize}
                onPointerDown={handleHeaderPointerDown}
                className={`bg-zinc-800 border-b border-zinc-700 px-3 py-2 flex items-center justify-between select-none ${!isMaximized ? 'cursor-grab active:cursor-grabbing' : ''}`}
            >
                <div className="flex items-center gap-2 text-zinc-300 font-medium pointer-events-none">
                    {Icon && <Icon size={14} className="text-purple-400" />}
                    <span className="text-xs">{title}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <button className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white"><Minus size={12} /></button>
                    <button onClick={toggleMaximize} className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white"><Square size={10} /></button>
                    <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-1 hover:bg-red-500 rounded text-zinc-400 hover:text-white"><X size={14} /></button>
                </div>
            </div>
            <div className="flex-1 overflow-hidden relative bg-zinc-950">
                {children}
                {!isActive && <div className="absolute inset-0 bg-transparent" />}
            </div>
            {!isMaximized && (
                <div className="absolute bottom-0 right-0 w-8 h-8 cursor-nwse-resize flex items-center justify-center z-10 text-zinc-600" onPointerDown={handleResizePointerDown}>
                    <Grip size={14} className="-rotate-45 translate-x-1 translate-y-1"/>
                </div>
            )}
        </div>
    );
};

// 2. Ink Layer for Gestures
export const InkLayer: React.FC<{
    active: boolean;
    strokes: Stroke[];
    setStrokes: React.Dispatch<React.SetStateAction<Stroke[]>>;
    isProcessing: boolean;
}> = ({ active, strokes, setStrokes, isProcessing }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const currentStroke = useRef<Stroke>([]);

    const drawSingleStroke = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
        if (stroke.length < 2) return;
        const path = new Path2D();
        path.moveTo(stroke[0].x, stroke[0].y);
        for (let i = 1; i < stroke.length; i++) {
            path.lineTo(stroke[i].x, stroke[i].y);
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 7;
        ctx.strokeStyle = '#c084fc'; // Purple glow for MEN OS
        ctx.stroke(path);
    };

    const renderCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        strokes.forEach(stroke => drawSingleStroke(ctx, stroke));
        if (isDrawing && currentStroke.current.length > 0) {
            drawSingleStroke(ctx, currentStroke.current);
        }
    }, [strokes, isDrawing]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const resize = () => {
            const parent = canvas.parentElement;
            if (parent) {
                canvas.width = parent.clientWidth;
                canvas.height = parent.clientHeight;
                renderCanvas();
            }
        };
        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, [renderCanvas]);

    useEffect(() => {
        if (!isProcessing) renderCanvas();
    }, [strokes, renderCanvas, isProcessing]);

    const getPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
        const rect = canvasRef.current!.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!active || isProcessing) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        setIsDrawing(true);
        currentStroke.current = [getPoint(e)];
        renderCanvas();
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!active || !isDrawing || isProcessing) return;
        currentStroke.current.push(getPoint(e));
        renderCanvas();
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!active || !isDrawing || isProcessing) return;
        setIsDrawing(false);
        e.currentTarget.releasePointerCapture(e.pointerId);
        if (currentStroke.current.length > 0) {
            setStrokes(prev => [...prev, [...currentStroke.current]]);
        }
        currentStroke.current = [];
    };

    return (
        <canvas
            ref={canvasRef}
            className={`absolute inset-0 z-[2000] touch-none ${active && !isProcessing ? 'cursor-crosshair' : 'pointer-events-none'}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
        />
    );
};

// 3. MEN AI App Component
export const MenAiApp: React.FC = () => {
    const [messages, setMessages] = useState<{ sender: 'user' | 'ai', text: string }[]>([
        { sender: 'ai', text: 'أهلاً بك في MEN AI داخل بيئة MEN OS. كيف يمكنني خدمتك اليوم؟' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
        setLoading(true);

        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: MODEL_NAME,
                contents: userMsg,
            });
            setMessages(prev => [...prev, { sender: 'ai', text: response.text || 'لم يتم استلام رد.' }]);
        } catch (err) {
            console.error(err);
            setMessages(prev => [...prev, { sender: 'ai', text: 'عذراً، حدث خطأ أثناء الاتصال بالذكاء الاصطناعي.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full w-full bg-zinc-950 text-zinc-100 flex flex-col">
            <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center gap-2">
                <Bot className="text-purple-400" size={20} />
                <span className="font-bold text-sm">MEN AI Assistant</span>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.map((m, idx) => (
                    <div key={idx} className={`flex items-start gap-3 ${m.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.sender === 'user' ? 'bg-purple-600' : 'bg-zinc-800 text-purple-400'}`}>
                            {m.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
                        </div>
                        <div className={`p-3 rounded-2xl max-w-[80%] text-sm ${m.sender === 'user' ? 'bg-purple-600 text-white' : 'bg-zinc-900 text-zinc-200 border border-zinc-800'}`}>
                            {m.text}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex items-center gap-2 text-purple-400 text-sm animate-pulse">
                        <Bot size={16} />
                        <span>جارٍ التفكير...</span>
                    </div>
                )}
            </div>
            <form onSubmit={handleSend} className="p-3 bg-zinc-900 border-t border-zinc-800 flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="اسأل MEN AI..."
                    className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                />
                <button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl transition-colors flex items-center justify-center">
                    <Send size={16} />
                </button>
            </form>
        </div>
    );
};

// 4. Other App Views (HomeScreen, FolderView, MailApp, NotepadApp, SlidesApp, SnakeGame)
export const HomeScreen: React.FC<{ items: (DesktopItem | null)[], onLaunch: (item: DesktopItem) => void }> = ({ items, onLaunch }) => (
    <div className="h-full w-full p-8 grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-6 content-start justify-items-center overflow-y-auto">
        {items.map((item, index) => {
            if (!item) return <div key={`gap-${index}`} className="w-28 h-[7rem]" />;
            return (
                <button
                    key={item.id}
                    onClick={() => onLaunch(item)}
                    className="flex flex-col items-center justify-start gap-3 p-2 w-28 rounded-xl hover:bg-white/10 transition-colors group"
                >
                    <div className={`relative w-20 h-20 ${item.bgColor || 'bg-zinc-700'} rounded-[22px] flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform border-t border-white/10 overflow-hidden`}>
                        <item.icon className="w-10 h-10 text-white relative z-10" />
                    </div>
                    <span className="text-sm text-white font-medium text-center truncate w-full px-1 drop-shadow">{item.name}</span>
                </button>
            );
        })}
    </div>
);

export const FolderView: React.FC<{ folder: DesktopItem }> = ({ folder }) => (
    <div className="h-full w-full bg-zinc-900 flex flex-col text-zinc-200 p-4 overflow-y-auto">
        <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-3">Contents ({folder.contents?.length || 0})</h3>
        <div className="grid grid-cols-4 gap-2">
            {folder.contents?.map(item => (
                <div key={item.id} className="flex flex-col items-center gap-1.5 p-2 hover:bg-zinc-800 rounded-lg cursor-pointer">
                    <div className={`w-12 h-12 ${item.bgColor} rounded-xl flex items-center justify-center text-white shadow`}>
                        <item.icon size={24} />
                    </div>
                    <span className="text-xs text-center truncate w-full text-zinc-300">{item.name}</span>
                </div>
            ))}
        </div>
    </div>
);

export const MailApp: React.FC<{ emails: Email[] }> = ({ emails }) => (
    <div className="h-full w-full bg-zinc-950 flex text-zinc-200">
        <div className="w-48 border-r border-zinc-800 p-4">
            <div className="font-bold text-lg flex items-center gap-2 text-purple-400 mb-4"><Mail size={20} /> Mail</div>
            <div className="space-y-1 text-sm text-zinc-400"><div className="p-2 bg-purple-500/20 text-purple-300 rounded">Inbox ({emails.length})</div></div>
        </div>
        <div className="flex-1 p-4 overflow-y-auto space-y-2">
            {emails.map(e => (
                <div key={e.id} className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg">
                    <div className="font-bold text-white text-sm">{e.from}</div>
                    <div className="text-purple-300 text-xs">{e.subject}</div>
                    <div className="text-zinc-400 text-xs mt-1">{e.preview}</div>
                </div>
            ))}
        </div>
    </div>
);

export const NotepadApp: React.FC<{ initialContent?: string }> = ({ initialContent = '' }) => (
    <div className="h-full w-full bg-zinc-900 text-zinc-300 flex flex-col">
        <textarea className="flex-1 w-full p-4 resize-none border-none focus:outline-none font-mono text-sm bg-transparent" defaultValue={initialContent} />
    </div>
);

export const SlidesApp: React.FC = () => (
    <div className="h-full w-full bg-zinc-900 p-4 text-zinc-300 flex flex-col items-center justify-center">
        <Presentation size={48} className="text-purple-400 mb-2" />
        <p>MEN OS Slides Studio</p>
    </div>
);

export const SnakeGame: React.FC = () => (
    <div className="h-full w-full bg-zinc-950 flex flex-col items-center justify-center text-white">
        <Gamepad2 size={48} className="text-purple-400 mb-2 animate-bounce" />
        <p className="font-mono text-lg">MEN Arcade Active</p>
    </div>
);

// ==================== MAIN APP COMPONENT ====================
export const App: React.FC = () => {
    const [openWindows, setOpenWindows] = useState<OpenWindow[]>([]);
    const [focusedId, setFocusedId] = useState<string | null>(null);
    const [nextZIndex, setNextZIndex] = useState(100);
    const [inkMode, setInkMode] = useState(false);
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const [desktopItems, setDesktopItems] = useState<(DesktopItem | null)[]>(INITIAL_DESKTOP_ITEMS);
    const [emails] = useState<Email[]>(INITIAL_EMAILS);
    const [isProcessing, setIsProcessing] = useState(false);
    const [toast, setToast] = useState<{ title?: string; message: React.ReactNode } | null>(null);
    const [wallpaperUrl, setWallpaperUrl] = useState<string | null>(null);

    const showToast = (message: React.ReactNode, title?: string) => {
        setToast({ message, title });
        setTimeout(() => setToast(null), 6000);
    };

    const handleLaunch = (item: DesktopItem) => {
        if (inkMode) return;
        if (openWindows.find(w => w.id === item.id)) {
            setFocusedId(item.id);
            return;
        }
        setOpenWindows(prev => [...prev, {
            id: item.id,
            item,
            zIndex: nextZIndex,
            pos: { x: 80 + (prev.length * 30), y: 60 + (prev.length * 30) },
            size: { width: 640, height: 480 }
        }]);
        setNextZIndex(prev => prev + 1);
        setFocusedId(item.id);
    };

    const closeWindow = (id: string) => {
        setOpenWindows(prev => prev.filter(w => w.id !== id));
        if (focusedId === id) setFocusedId(null);
    };

    return (
        <div className="h-full w-full bg-black text-zinc-100 font-sans overflow-hidden relative">
            {/* Top Bar / MEN OS Branding */}
            <div className="absolute top-4 left-6 z-[2500] flex items-center gap-2 pointer-events-none">
                <div className="w-3 h-3 rounded-full bg-purple-500 animate-pulse" />
                <span className="font-black tracking-widest text-lg bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-300">MEN OS</span>
            </div>

            {/* Floating Control Capsule */}
            <div id="control-bar" className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center p-3 bg-zinc-950/80 backdrop-blur-2xl border border-purple-500/30 shadow-2xl rounded-full z-[3000]">
                <div className="flex items-center gap-3">
                    <button onClick={() => setInkMode(false)} className={`p-3 rounded-full transition-all ${!inkMode ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-400'}`} title="Cursor Mode">
                        <MousePointer2 size={20} />
                    </button>
                    <button onClick={() => setInkMode(true)} className={`p-3 rounded-full transition-all ${inkMode ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-400'}`} title="Ink Mode">
                        <PenLine size={20} />
                    </button>
                </div>
                {inkMode && (
                    <div className="flex items-center gap-2 ml-3 pl-3 border-l border-zinc-700">
                        <button onClick={() => setStrokes([])} disabled={strokes.length === 0} className="p-3 rounded-full bg-zinc-800 text-zinc-400 hover:text-red-400"><Eraser size={20} /></button>
                    </div>
                )}
            </div>

            {/* Desktop Background */}
            <div 
                className="h-full w-full relative overflow-hidden bg-zinc-900 transition-all duration-1000"
                style={{
                    backgroundImage: wallpaperUrl ? `url(${wallpaperUrl})` : 'radial-gradient(circle at 50% 120%, rgba(147, 51, 234, 0.2) 0%, transparent 60%)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                }}
                onMouseDown={() => setFocusedId(null)}
            >
                <HomeScreen items={desktopItems} onLaunch={handleLaunch} />

                {openWindows.map(win => {
                    let content = null;
                    if (win.item.appId === 'menai') content = <MenAiApp />;
                    else if (win.item.type === 'folder') content = <FolderView folder={win.item} />;
                    else if (win.item.appId === 'mail') content = <MailApp emails={emails} />;
                    else if (win.item.appId === 'slides') content = <SlidesApp />;
                    else if (win.item.appId === 'snake') content = <SnakeGame />;
                    else if (win.item.appId === 'notepad') content = <NotepadApp initialContent={win.item.notepadInitialContent} />;
                    
                    return (
                        <DraggableWindow
                            key={win.id}
                            id={win.id}
                            title={win.item.name}
                            icon={win.item.icon}
                            initialPos={win.pos}
                            initialSize={win.size}
                            zIndex={win.zIndex}
                            isActive={focusedId === win.id}
                            onClose={() => closeWindow(win.id)}
                            onFocus={() => setFocusedId(win.id)}
                        >
                            {content}
                        </DraggableWindow>
                    );
                })}

                <InkLayer active={inkMode} strokes={strokes} setStrokes={setStrokes} isProcessing={isProcessing} />

                {toast && (
                    <div className="absolute bottom-36 left-1/2 -translate-x-1/2 bg-zinc-900/95 backdrop-blur-xl text-white px-6 py-4 rounded-2xl shadow-2xl z-[9999] border border-purple-500/40">
                        {toast.message}
                    </div>
                )}
            </div>
        </div>
    );
};

// ==================== INITIALIZE REACT ROOT ====================
const rootElement = document.getElementById('root');
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
}
