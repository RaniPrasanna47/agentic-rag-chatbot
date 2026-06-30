import React, { useState, useRef } from "react";
import { DocumentFile, PineconeConfig } from "../types";
import { 
  FileText, UploadCloud, Database, Settings, RefreshCw, Check, 
  Trash2, LogOut, ChevronDown, ChevronUp, User, ShieldAlert,
  Loader2, Terminal, Info, ToggleLeft, ToggleRight
} from "lucide-react";

interface DocumentSidebarProps {
  documents: DocumentFile[];
  userId: string;
  userEmail: string | null;
  mode: "local" | "pinecone";
  setMode: (mode: "local" | "pinecone") => void;
  pineconeConfig: PineconeConfig;
  setPineconeConfig: (config: PineconeConfig) => void;
  onUploadSuccess: (fileName: string) => void;
  onToggleSelect: (fileName: string) => void;
  onDeleteDocument: (fileName: string) => void;
  onLogout: () => void;
}

export default function DocumentSidebar({
  documents,
  userId,
  userEmail,
  mode,
  setMode,
  pineconeConfig,
  setPineconeConfig,
  onUploadSuccess,
  onToggleSelect,
  onDeleteDocument,
  onLogout
}: DocumentSidebarProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [confirmDeleteFile, setConfirmDeleteFile] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  // Upload file to Express server API
  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setUploadError("");
    const formData = new FormData();
    formData.append("userId", userId);
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned non-JSON response (possibly restarting).");
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to upload file");
      }

      onUploadSuccess(data.fileName);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || "Error processing file upload.");
    } finally {
      setUploading(false);
    }
  };

  // Test Pinecone Connection
  const handleTestPinecone = async () => {
    if (!pineconeConfig.apiKey || !pineconeConfig.indexName) {
      setTestResult({
        success: false,
        message: "Please enter both Pinecone API Key and Index Name before testing."
      });
      return;
    }

    setTestingConnection(true);
    setTestResult(null);

    try {
      const response = await fetch("/api/test-pinecone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: pineconeConfig.apiKey,
          indexName: pineconeConfig.indexName
        })
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned non-JSON response (possibly restarting).");
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Connection test failed.");
      }

      setTestResult({
        success: data.success,
        message: data.message
      });

      if (data.success) {
        setPineconeConfig({ ...pineconeConfig, isVerified: true });
      }
    } catch (err: any) {
      console.error(err);
      setTestResult({
        success: false,
        message: err.message || "Failed to establish a connection with Pinecone."
      });
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div id="document-sidebar" className="w-80 bg-[#050507] border-r border-white/5 glass-panel flex flex-col h-full overflow-hidden select-none">
      
      {/* 1. Header with App Title */}
      <div className="p-6 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <span className="font-bold text-white text-md">Ω</span>
          </div>
          <div>
            <h1 className="text-md font-bold tracking-tight text-white leading-tight">GraphRAG Studio</h1>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">State Machine Engine</p>
          </div>
        </div>

        <button 
          onClick={onLogout}
          title="Log out"
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Drag-and-Drop Upload Section */}
      <div className="p-4 border-b border-white/5">
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-150 ${
            dragActive 
              ? "border-cyan-500 bg-cyan-500/5 shadow-[0_0_15px_rgba(6,182,212,0.15)]" 
              : "border-white/10 hover:border-white/20 bg-white/[0.02]"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            accept=".txt,.md,.pdf,.json,.csv"
            className="hidden"
          />

          {uploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="w-6 h-6 text-cyan-400 animate-spin mb-2" />
              <p className="text-xs font-medium text-slate-300">Processing file...</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Generating semantic chunks & vectors</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <UploadCloud className="w-6 h-6 text-slate-400 mb-2" />
              <p className="text-xs font-semibold text-slate-300">Drag & Drop Document</p>
              <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-wide">PDF, TXT, MD, CSV, JSON</p>
            </div>
          )}
        </div>

        {uploadError && (
          <div className="mt-3 bg-red-500/10 border border-red-500/20 text-red-300 text-[10px] p-2 rounded-lg leading-relaxed flex gap-1.5 items-start">
            <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-red-400" />
            <span>{uploadError}</span>
          </div>
        )}
      </div>

      {/* 3. Document List & Active Agents */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <div className="flex items-center justify-between mb-3 px-2">
            <h2 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Knowledge Base</h2>
            <span className="bg-white/5 text-slate-400 text-[9px] font-mono px-2 py-0.5 rounded-full border border-white/5">
              {documents.length}
            </span>
          </div>

          {documents.length === 0 ? (
            <div className="text-center py-6 px-4 bg-white/[0.01] rounded-xl border border-white/5">
              <FileText className="w-6 h-6 text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-400">No documents yet</p>
              <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">Upload files to begin semantic vector retrieval.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div 
                  key={doc.fileName}
                  className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                    doc.isSelected 
                      ? "bg-cyan-500/5 border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.05)]" 
                      : "bg-transparent border-transparent hover:bg-white/5"
                  }`}
                >
                  {/* File Details (Clickable to select) */}
                  <div 
                    onClick={() => onToggleSelect(doc.fileName)}
                    className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                  >
                    <div className={`p-1 rounded-lg transition-colors ${
                      doc.isSelected 
                        ? "text-cyan-400" 
                        : "text-slate-500"
                    }`}>
                      <FileText className="w-4 h-4" />
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-medium truncate ${doc.isSelected ? "text-cyan-100" : "text-slate-400"}`} title={doc.fileName}>
                        {doc.fileName}
                      </p>
                      <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                        {doc.chunksCount} chunks
                      </p>
                    </div>
                  </div>

                  {/* Controls (Checkbox & Delete) */}
                  <div className="flex items-center gap-2 ml-2">
                    {confirmDeleteFile === doc.fileName ? (
                      <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/25 px-2 py-0.5 rounded-lg">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteDocument(doc.fileName);
                            setConfirmDeleteFile(null);
                          }}
                          className="text-[9px] text-red-400 hover:text-red-300 font-bold uppercase cursor-pointer"
                        >
                          Delete
                        </button>
                        <span className="text-[9px] text-slate-700">|</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteFile(null);
                          }}
                          className="text-[9px] text-slate-400 hover:text-slate-300 font-medium cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        {doc.isSelected ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-400/20 text-cyan-400 border border-cyan-400/30 font-bold tracking-wider">
                            READY
                          </span>
                        ) : (
                          <button
                            onClick={() => onToggleSelect(doc.fileName)}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-slate-500 border border-white/5 hover:border-white/10 hover:text-slate-400 transition-colors"
                          >
                            LOAD
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteFile(doc.fileName);
                          }}
                          title="Delete document"
                          className="p-1 text-slate-600 hover:text-red-400 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Agents Live View */}
        <div>
          <h2 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-3 px-2">Active Agents</h2>
          <div className="space-y-3 px-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 status-glow animate-pulse"></div>
                <span className="text-slate-300">Retrieval & Search Node</span>
              </div>
              <span className="text-[8px] font-mono text-emerald-400 uppercase">Active</span>
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 status-glow animate-pulse"></div>
                <span className="text-slate-300">Self-Correction Node</span>
              </div>
              <span className="text-[8px] font-mono text-purple-400 uppercase">Idle</span>
            </div>

            <div className="flex items-center justify-between text-xs opacity-50">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-600"></div>
                <span className="text-slate-400">Synthesis Engine</span>
              </div>
              <span className="text-[8px] font-mono text-slate-500 uppercase">Standby</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Configuration Panel & Mode Selection */}
      <div className="border-t border-white/5 bg-black/20">
        {/* Toggle Mode */}
        <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
            <Database className="w-4 h-4 text-cyan-400" />
            <span>Storage Engine</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-400 uppercase">
              {mode === "pinecone" ? "Pinecone" : "Local DB"}
            </span>
            <button
              onClick={() => setMode(mode === "local" ? "pinecone" : "local")}
              className="text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              {mode === "pinecone" ? (
                <ToggleRight className="w-7 h-7 text-cyan-400" />
              ) : (
                <ToggleLeft className="w-7 h-7 text-slate-600" />
              )}
            </button>
          </div>
        </div>

        {/* Configuration settings fold */}
        <div className="border-b border-white/5">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="w-full px-5 py-2.5 flex items-center justify-between text-xs text-slate-400 hover:text-white hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-1.5 font-medium">
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              <span>Pinecone Credentials</span>
            </div>
            {showConfig ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showConfig && (
            <div className="p-4 space-y-3 bg-white/[0.01] border-t border-white/5 text-xs">
              <div className="bg-black/30 p-2.5 border border-white/5 rounded-lg text-[10px] text-slate-400 flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span>
                  Switch to Pinecone mode to use a cloud-hosted vector database. Standard mode uses high-speed in-memory vectors!
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wide font-mono">
                  Pinecone API Key
                </label>
                <input
                  type="password"
                  value={pineconeConfig.apiKey}
                  onChange={(e) => setPineconeConfig({ ...pineconeConfig, apiKey: e.target.value, isVerified: false })}
                  placeholder="Paste api key"
                  className="w-full bg-black/40 border border-white/10 text-slate-200 rounded px-2.5 py-1.5 font-mono text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wide font-mono">
                  Index Name
                </label>
                <input
                  type="text"
                  value={pineconeConfig.indexName}
                  onChange={(e) => setPineconeConfig({ ...pineconeConfig, indexName: e.target.value, isVerified: false })}
                  placeholder="e.g. index-name"
                  className="w-full bg-black/40 border border-white/10 text-slate-200 rounded px-2.5 py-1.5 font-mono text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button
                onClick={handleTestPinecone}
                disabled={testingConnection}
                className="w-full flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 active:bg-black text-slate-200 font-medium py-2 rounded text-[11px] cursor-pointer border border-white/5 transition-all"
              >
                {testingConnection ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Connecting...
                  </>
                ) : pineconeConfig.isVerified ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-400" />
                    Verified
                  </>
                ) : (
                  "Test Connection"
                )}
              </button>

              {testResult && (
                <p className={`text-[10px] leading-snug p-2 rounded ${
                  testResult.success 
                    ? "bg-green-500/10 text-green-400 border border-green-500/10" 
                    : "bg-red-500/10 text-red-400 border border-red-500/10"
                }`}>
                  {testResult.message}
                </p>
              )}
            </div>
          )}
        </div>

        {/* User Session Bar */}
        <div className="p-6 border-t border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center text-white font-bold text-sm bg-gradient-to-tr from-cyan-600 to-purple-600 shadow-lg shadow-cyan-500/10">
              {userEmail === "Guest User" ? "G" : (userEmail?.slice(0, 1).toUpperCase() || <User className="w-4 h-4" />)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {userEmail === "Guest User" ? "Guest User" : userEmail}
              </p>
              <p className="text-[10px] text-slate-500 uppercase tracking-tighter">
                ACTIVE SESSION
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
