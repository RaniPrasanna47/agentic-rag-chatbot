import React, { useState, useRef, useEffect } from "react";
import { Message, AgentThought } from "../types";
import { 
  Send, Sparkles, BookOpen, AlertCircle, RefreshCw, CheckCircle2, 
  HelpCircle, ChevronRight, ChevronDown, Bot, User, Clock, 
  FileText, ExternalLink, Lightbulb, Loader2, Menu, MessageSquare
} from "lucide-react";

interface ChatWindowProps {
  messages: Message[];
  activeDocuments: string[];
  onSendMessage: (text: string) => void;
  loading: boolean;
  activeThoughts: AgentThought[];
  onToggleSidebar?: () => void;
  onToggleHistory?: () => void;
}

// Simple powerful markdown/text renderer to avoid third-party NPM issues
function MarkdownContent({ text }: { text: string }) {
  if (!text) return null;

  // Split content by paragraphs or blocks
  const lines = text.split("\n");
  
  return (
    <div className="space-y-2 text-slate-300 leading-relaxed text-sm">
      {lines.map((line, idx) => {
        let content = line;
        
        // 1. Handle Headings
        if (content.startsWith("### ")) {
          return (
            <h4 key={idx} className="text-sm font-bold text-slate-100 mt-4 mb-2 tracking-tight">
              {content.replace("### ", "")}
            </h4>
          );
        }
        if (content.startsWith("## ")) {
          return (
            <h3 key={idx} className="text-md font-bold text-white mt-5 mb-2 tracking-tight border-b border-slate-800 pb-1">
              {content.replace("## ", "")}
            </h3>
          );
        }

        // 2. Handle Bullet Lists
        if (content.startsWith("- ") || content.startsWith("* ")) {
          const itemText = content.replace(/^[-*]\s+/, "");
          return (
            <ul key={idx} className="list-disc list-inside pl-2 space-y-1">
              <li className="text-slate-300">
                {parseInlineFormatting(itemText)}
              </li>
            </ul>
          );
        }

        // 3. Handle Numbered Lists
        const numMatch = content.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <ol key={idx} className="list-decimal list-inside pl-2 space-y-1">
              <li className="text-slate-300">
                {parseInlineFormatting(numMatch[2])}
              </li>
            </ol>
          );
        }

        // 4. Handle Empty Line
        if (content.trim().length === 0) {
          return <div key={idx} className="h-2"></div>;
        }

        // 5. Default Paragraph
        return (
          <p key={idx} className="text-slate-300">
            {parseInlineFormatting(content)}
          </p>
        );
      })}
    </div>
  );
}

// Helper to format Bold and Inline Code
function parseInlineFormatting(text: string) {
  // Regex to match **bold** and `code`
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="text-white font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={index} className="bg-slate-950 px-1.5 py-0.5 rounded font-mono text-xs text-cyan-400 border border-slate-800">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export default function ChatWindow({
  messages,
  activeDocuments,
  onSendMessage,
  loading,
  activeThoughts,
  onToggleSidebar,
  onToggleHistory
}: ChatWindowProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [expandedThoughtIndex, setExpandedThoughtIndex] = useState<number | null>(null);

  // Auto-scroll to bottom on new messages or loading states
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, activeThoughts]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    onSendMessage(input.trim());
    setInput("");
  };

  const handleSuggestionClick = (promptText: string) => {
    if (loading) return;
    onSendMessage(promptText);
  };

  // Helper to render active thought logs status icons
  const renderStatusIcon = (status: "success" | "running" | "warning" | "error") => {
    switch (status) {
      case "running":
        return <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />;
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case "warning":
        return <AlertCircle className="w-4 h-4 text-yellow-400 animate-pulse" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-400" />;
    }
  };

  const suggestions = [
    "Summarize this document in 3 paragraphs",
    "What are the core concepts or takeaways?",
    "Generate 5 exam questions about this content",
    "Find detailed mentions of terms or metrics"
  ];

  return (
    <div id="chat-window" className="flex-1 flex flex-col h-full bg-[#0a0a0f] overflow-hidden relative">
      
      {/* 1. Header with Model Pill and Latency */}
      <header className="h-16 flex items-center justify-between px-4 md:px-8 border-b border-white/5 glass-panel z-10">
        <div className="flex items-center gap-2 md:gap-6">
          {/* Mobile Sidebar Toggle (Knowledge Base) */}
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all cursor-pointer mr-1"
              title="Toggle Knowledge Base"
            >
              <FileText className="w-5 h-5 text-cyan-400" />
            </button>
          )}

          {/* Mobile History Toggle (Threads) */}
          {onToggleHistory && (
            <button
              onClick={onToggleHistory}
              className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all cursor-pointer mr-1"
              title="Toggle Chat History"
            >
              <MessageSquare className="w-5 h-5 text-purple-400" />
            </button>
          )}

          <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10 max-sm:hidden">
            <span className="w-2 h-2 rounded-full bg-purple-500 status-glow animate-pulse"></span>
            <span className="text-xs font-mono text-purple-300">Gemini 2.5 Flash</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
            <span className="text-xs text-slate-400 max-sm:hidden">Context: </span>
            <span className="text-xs font-mono text-cyan-400">
              {activeDocuments.length === 0 
                ? "Global Session" 
                : `${activeDocuments.length} loaded`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {activeDocuments.length > 0 ? (
            <div className="flex items-center gap-2 text-xs text-slate-300 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 status-glow animate-pulse"></span>
              <span className="text-cyan-400 max-sm:hidden">Agentic Active</span>
            </div>
          ) : (
            <span className="text-xs text-slate-500 font-mono max-sm:hidden">Idle Session</span>
          )}
          <div className="h-8 w-px bg-white/10 mx-1 md:mx-2 max-sm:hidden"></div>
          <span className="text-xs font-bold font-mono text-emerald-400 status-glow px-2 py-0.5 md:px-2.5 md:py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25">ONLINE</span>
        </div>
      </header>

      {/* 2. Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-4 md:py-8 space-y-4 md:space-y-8">
        
        {messages.length === 0 && !loading && (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto py-12 select-none">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 mb-6">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">Agentic Document Intelligence</h3>
            <p className="text-sm text-slate-400 mt-2 max-w-lg leading-relaxed">
              Upload documents in the sidebar. My self-querying agents will parse, semantic chunk, and generate grounded answers using a state machine trace graph.
            </p>

            <div className="mt-10 w-full max-w-xl space-y-4">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest justify-center">
                <Lightbulb className="w-4 h-4 text-yellow-500" />
                <span>Suggested operations</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                {suggestions.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(p)}
                    className="p-3.5 bg-white/[0.02] border border-white/5 hover:border-cyan-500/30 text-xs text-slate-300 rounded-xl cursor-pointer hover:bg-white/[0.05] transition-all text-left"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* List of Messages */}
        <div className="max-w-3xl w-full mx-auto space-y-8">
          {messages.map((msg) => (
            <div key={msg.id} className="space-y-4">
              
              {/* Thought log (rendered above the assistant bubble if present) */}
              {msg.role === "assistant" && msg.thoughts && msg.thoughts.length > 0 && (
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-3 shadow-xl">
                  <div className="flex items-center gap-2 text-[10px] font-mono text-purple-400 uppercase tracking-widest border-b border-white/5 pb-2">
                    <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                    <span>Thinking Process (State Machine Trace)</span>
                  </div>
                  
                  <div className="space-y-2">
                    {msg.thoughts.map((thought, tIdx) => (
                      <div key={tIdx} className="text-xs bg-black/40 rounded border border-white/5 overflow-hidden">
                        <button
                          onClick={() => setExpandedThoughtIndex(expandedThoughtIndex === tIdx ? null : tIdx)}
                          className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
                        >
                          <div className="flex items-center gap-2.5 font-medium text-slate-200">
                            {renderStatusIcon(thought.status)}
                            <span>{thought.title}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {expandedThoughtIndex === tIdx ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </span>
                        </button>

                        {expandedThoughtIndex === tIdx && (
                          <div className="px-3.5 pb-3.5 pt-1 text-[11px] text-slate-400 border-t border-white/5 leading-relaxed font-mono space-y-2">
                            <p className="text-slate-300">{thought.description}</p>
                            {thought.metadata?.details && thought.metadata.details.length > 0 && (
                              <div className="bg-black/60 p-2.5 rounded border border-white/5 mt-2 space-y-1.5 text-[10px] max-h-48 overflow-y-auto">
                                {thought.metadata.details.map((detail, dIdx) => (
                                  <div key={dIdx} className="leading-normal">{detail}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Main Message Bubble */}
              <div className={`flex gap-4 ${msg.role === "user" ? "justify-start" : ""}`}>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 text-xs ${
                  msg.role === "user" 
                    ? "bg-slate-800 text-slate-300 font-bold" 
                    : "bg-gradient-to-br from-cyan-500 to-purple-600 text-white font-bold"
                }`}>
                  {msg.role === "user" ? "US" : "AI"}
                </div>

                {/* Text Area */}
                <div className="space-y-2 flex-1 min-w-0">
                  <div className={`rounded-2xl p-5 shadow-xl border ${
                    msg.role === "user"
                      ? "bg-white/[0.01] border-white/5 text-slate-100"
                      : "bg-white/[0.03] border border-white/10 text-slate-200"
                  }`}>
                    <MarkdownContent text={msg.content} />
                  </div>
                  
                  {/* Meta details */}
                  <div className="flex items-center gap-2 text-[9px] text-slate-500 font-mono px-1.5">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {msg.selectedFiles && msg.selectedFiles.length > 0 && (
                      <>
                        <span>•</span>
                        <FileText className="w-3 h-3 text-cyan-500" />
                        <span className="truncate max-w-xs text-cyan-500/80">{msg.selectedFiles.join(", ")}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

            </div>
          ))}

          {/* Active streaming / agent execution placeholder */}
          {loading && (
            <div className="space-y-4">
              
              {/* Live thought steppers log */}
              {activeThoughts.length > 0 && (
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-3 shadow-xl">
                  <div className="flex items-center gap-2 text-[10px] font-mono text-purple-400 uppercase tracking-widest border-b border-white/5 pb-2">
                    <RefreshCw className="w-3.5 h-3.5 text-purple-400 animate-spin" />
                    <span>Agent trace running (Graph orchestration)</span>
                  </div>
                  
                  <div className="space-y-2">
                    {activeThoughts.map((thought, tIdx) => (
                      <div key={tIdx} className="text-xs bg-black/40 rounded border border-white/5">
                        <div className="px-3.5 py-2.5 flex items-center justify-between text-left">
                          <div className="flex items-center gap-2.5 font-medium text-slate-200">
                            {renderStatusIcon(thought.status)}
                            <span>{thought.title}</span>
                          </div>
                        </div>
                        <div className="px-3.5 pb-3.5 pt-0 text-[11px] text-slate-400 font-mono">
                          {thought.description}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Loading bubble */}
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded bg-gradient-to-br from-cyan-500 to-purple-600 text-white flex items-center justify-center animate-pulse flex-shrink-0 text-xs font-bold">
                  AI
                </div>
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 flex items-center gap-3 text-slate-400 text-xs shadow-xl flex-1 max-w-xl">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                  <span>Agent is synthesizing response...</span>
                </div>
              </div>

            </div>
          )}
        </div>

        <div ref={messagesEndRef} />
      </div>

      {/* 3. Input Controls Bar */}
      <footer className="p-4 md:p-6 bg-gradient-to-t from-black to-transparent">
        <div className="max-w-3xl mx-auto relative">
          <div className="absolute inset-0 bg-cyan-500/5 blur-xl rounded-full"></div>
          
          <form onSubmit={handleSubmit} className="relative flex items-center bg-[#1a1b26]/90 border border-white/10 rounded-2xl p-2 shadow-2xl">
            <div className="p-3 text-slate-500" title="Selected system context">
              <BookOpen className="w-5 h-5 text-slate-500" />
            </div>
            
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              placeholder={activeDocuments.length === 0 ? "Select/Upload a file first to ask..." : "Ask your document agents..."}
              className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-sm text-white px-2 py-3 placeholder-slate-600 disabled:opacity-50"
            />
            
            <div className="flex items-center gap-2 pr-2">
              <div className="hidden sm:block text-[9px] font-mono text-slate-500 px-2 border border-white/5 rounded">⌘ + ⏎</div>
              <button
                type="submit"
                disabled={loading || !input.trim() || activeDocuments.length === 0}
                className="w-10 h-10 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl flex items-center justify-center shadow-lg transition-all shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </footer>

    </div>
  );
}
