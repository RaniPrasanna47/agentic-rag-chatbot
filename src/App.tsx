import React, { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { 
  collection, query, orderBy, onSnapshot, addDoc, deleteDoc, 
  doc, setDoc, getDocs, updateDoc 
} from "firebase/firestore";
import { auth, db } from "./firebaseConfig";
import { DocumentFile, ChatSession, Message, PineconeConfig, AgentThought } from "./types";
import DocumentSidebar from "./components/DocumentSidebar";
import ChatWindow from "./components/ChatWindow";
import AuthModal from "./components/AuthModal";
import { 
  Plus, MessageSquare, Trash2, FolderSync, Database, BrainCircuit,
  Settings, HelpCircle, Loader2, RefreshCw, Layers
} from "lucide-react";


enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function App() {
  const [user, setUser] = useState<{ uid: string; email: string | null } | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  
  // Data States
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  
  // App Config States
  const [mode, setMode] = useState<"local" | "pinecone">("local");
  const [pineconeConfig, setPineconeConfig] = useState<PineconeConfig>({
    apiKey: "",
    indexName: "",
    environment: "",
    isVerified: false
  });
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [refreshingDocs, setRefreshingDocs] = useState(false);
  const [activeThoughts, setActiveThoughts] = useState<AgentThought[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // 1. Listen for Auth State changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        // Clear local guest id if logging in with real account to prevent collision
        localStorage.removeItem("rag_local_guest_id");
        setUser({
          uid: currentUser.uid,
          email: currentUser.email || "Guest User"
        });
      } else {
        const localGuestId = localStorage.getItem("rag_local_guest_id");
        if (localGuestId) {
          setUser({
            uid: localGuestId,
            email: "Local Guest Operator"
          });
        } else {
          setUser(null);
          setDocuments([]);
          setSessions([]);
          setCurrentSessionId(null);
          setMessages([]);
        }
      }
      setAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  // Load Pinecone config from localStorage on start
  useEffect(() => {
    try {
      const stored = localStorage.getItem("rag_pinecone_config");
      const storedMode = localStorage.getItem("rag_storage_mode");
      if (stored) {
        setPineconeConfig(JSON.parse(stored));
      }
      if (storedMode === "pinecone" || storedMode === "local") {
        setMode(storedMode as "local" | "pinecone");
      }
    } catch (err) {
      console.error("Error reading localStorage:", err);
    }
  }, []);

  // Save Pinecone config & mode changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("rag_pinecone_config", JSON.stringify(pineconeConfig));
      localStorage.setItem("rag_storage_mode", mode);
    } catch (err) {
      console.error("Error writing localStorage:", err);
    }
  }, [pineconeConfig, mode]);

  // 2. Fetch/Listen user documents from local server
  const fetchDocuments = async () => {
    if (!user) return;
    setRefreshingDocs(true);
    try {
      const response = await fetch(`/api/documents?userId=${user.uid}`);
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned non-JSON response (possibly restarting).");
      }
      const data = await response.json();
      if (response.ok && data.documents) {
        // Retain selection if previously selected
        const updatedDocs = data.documents.map((newDoc: any) => {
          const prev = documents.find(d => d.fileName === newDoc.fileName);
          return {
            ...newDoc,
            isSelected: prev ? !!prev.isSelected : true // default to select on upload/load
          };
        });
        setDocuments(updatedDocs);
      }
    } catch (err) {
      console.error("Error fetching documents:", err);
    } finally {
      setRefreshingDocs(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDocuments();
    }
  }, [user]);

  // 3. Listen to User Sessions (Local Storage for Guest, Firestore for Auth Users)
  useEffect(() => {
    if (!user) return;

    if (user.uid.startsWith("guest_")) {
      const loadLocalSessions = () => {
        try {
          const key = `rag_sessions_${user.uid}`;
          const stored = localStorage.getItem(key);
          const fetchedSessions: ChatSession[] = stored ? JSON.parse(stored) : [];
          setSessions(fetchedSessions);
          if (fetchedSessions.length > 0 && !currentSessionId) {
            setCurrentSessionId(fetchedSessions[0].id);
          }
        } catch (err) {
          console.error("Error loading local sessions:", err);
        }
      };
      loadLocalSessions();
      window.addEventListener("storage", loadLocalSessions);
      return () => window.removeEventListener("storage", loadLocalSessions);
    }

    const sessionsRef = collection(db, "users", user.uid, "sessions");
    const q = query(sessionsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedSessions: ChatSession[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetchedSessions.push({
          id: docSnap.id,
          title: data.title || "Untitled Session",
          createdAt: data.createdAt || new Date().toISOString(),
          selectedDocuments: data.selectedDocuments || []
        });
      });
      setSessions(fetchedSessions);

      // Set default current session if none active
      if (fetchedSessions.length > 0 && !currentSessionId) {
        setCurrentSessionId(fetchedSessions[0].id);
      }
    }, (error) => {
      console.error("Sessions onSnapshot error (handled):", error);
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/sessions`);
    });

    return () => unsubscribe();
  }, [user, currentSessionId]);

  // 4. Listen to Messages for Current Session
  useEffect(() => {
    if (!user || !currentSessionId) {
      setMessages([]);
      return;
    }

    if (user.uid.startsWith("guest_")) {
      const loadLocalMessages = () => {
        try {
          const key = `rag_messages_${user.uid}_${currentSessionId}`;
          const stored = localStorage.getItem(key);
          setMessages(stored ? JSON.parse(stored) : []);
        } catch (err) {
          console.error("Error loading local messages:", err);
        }
      };
      loadLocalMessages();
      window.addEventListener("storage", loadLocalMessages);
      return () => window.removeEventListener("storage", loadLocalMessages);
    }

    const messagesRef = collection(db, "users", user.uid, "sessions", currentSessionId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages: Message[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetchedMessages.push({
          id: docSnap.id,
          role: data.role,
          content: data.content,
          timestamp: data.timestamp,
          thoughts: data.thoughts || [],
          selectedFiles: data.selectedFiles || []
        });
      });
      setMessages(fetchedMessages);
    }, (error) => {
      console.error("Messages onSnapshot error (handled):", error);
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/sessions/${currentSessionId}/messages`);
    });

    return () => unsubscribe();
  }, [user, currentSessionId]);

  // Create a new chat session
  const handleCreateSession = async () => {
    if (!user) return;
    const selectedNames = documents.filter(d => d.isSelected).map(d => d.fileName);
    const newSessionId = "session_" + Math.random().toString(36).substring(2, 9);
    const newSession: ChatSession = {
      id: newSessionId,
      title: `Chat Session ${sessions.length + 1}`,
      createdAt: new Date().toISOString(),
      selectedDocuments: selectedNames
    };

    if (user.uid.startsWith("guest_")) {
      const key = `rag_sessions_${user.uid}`;
      const updatedSessions = [newSession, ...sessions];
      localStorage.setItem(key, JSON.stringify(updatedSessions));
      setSessions(updatedSessions);
      setCurrentSessionId(newSessionId);
      return;
    }

    try {
      const sessionsRef = collection(db, "users", user.uid, "sessions");
      const newSessionDoc = await addDoc(sessionsRef, {
        title: newSession.title,
        createdAt: newSession.createdAt,
        selectedDocuments: newSession.selectedDocuments
      });

      setCurrentSessionId(newSessionDoc.id);
    } catch (err) {
      console.error("Error creating session:", err);
      handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/sessions`);
    }
  };

  // Delete a chat session
  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    if (user.uid.startsWith("guest_")) {
      const key = `rag_sessions_${user.uid}`;
      const updatedSessions = sessions.filter(s => s.id !== sessionId);
      localStorage.setItem(key, JSON.stringify(updatedSessions));
      setSessions(updatedSessions);
      localStorage.removeItem(`rag_messages_${user.uid}_${sessionId}`);
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
      }
      return;
    }

    try {
      const sessionDocRef = doc(db, "users", user.uid, "sessions", sessionId);
      await deleteDoc(sessionDocRef);
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
      }
    } catch (err) {
      console.error("Error deleting session:", err);
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/sessions/${sessionId}`);
    }
  };

  // Toggle document selection checkbox
  const handleToggleSelectDoc = (fileName: string) => {
    const updatedDocs = documents.map(doc => {
      if (doc.fileName === fileName) {
        return { ...doc, isSelected: !doc.isSelected };
      }
      return doc;
    });
    setDocuments(updatedDocs);

    if (user && currentSessionId) {
      const activeNames = updatedDocs.filter(d => d.isSelected).map(d => d.fileName);
      if (user.uid.startsWith("guest_")) {
        const key = `rag_sessions_${user.uid}`;
        const updatedSessions = sessions.map(s => {
          if (s.id === currentSessionId) {
            return { ...s, selectedDocuments: activeNames };
          }
          return s;
        });
        localStorage.setItem(key, JSON.stringify(updatedSessions));
        setSessions(updatedSessions);
      } else {
        const sessionDocRef = doc(db, "users", user.uid, "sessions", currentSessionId);
        updateDoc(sessionDocRef, { selectedDocuments: activeNames }).catch(err => {
          console.error("Error updating session documents:", err);
          handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/sessions/${currentSessionId}`);
        });
      }
    }
  };

  // Delete document
  const handleDeleteDocument = async (fileName: string) => {
    if (!user) return;

    try {
      const response = await fetch("/api/delete-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid, fileName })
      });

      if (response.ok) {
        // Refetch documents
        fetchDocuments();
      }
    } catch (err) {
      console.error("Error deleting document:", err);
    }
  };

  // Upload complete handler
  const handleUploadSuccess = (fileName: string) => {
    fetchDocuments();
  };

  // Send Chat message (Triggers RAG pipeline)
  const handleSendMessage = async (text: string) => {
    if (!user) return;

    let activeSessionId = currentSessionId;

    if (!activeSessionId) {
      // Create session first!
      const selectedNames = documents.filter(d => d.isSelected).map(d => d.fileName);
      const newSessionId = "session_" + Math.random().toString(36).substring(2, 9);
      const newSession: ChatSession = {
        id: newSessionId,
        title: text.length > 25 ? text.substring(0, 25) + "..." : text,
        createdAt: new Date().toISOString(),
        selectedDocuments: selectedNames
      };

      if (user.uid.startsWith("guest_")) {
        const updated = [newSession, ...sessions];
        localStorage.setItem(`rag_sessions_${user.uid}`, JSON.stringify(updated));
        setSessions(updated);
        setCurrentSessionId(newSessionId);
        activeSessionId = newSessionId;
      } else {
        try {
          const sessionsRef = collection(db, "users", user.uid, "sessions");
          const newDoc = await addDoc(sessionsRef, {
            title: newSession.title,
            createdAt: newSession.createdAt,
            selectedDocuments: newSession.selectedDocuments
          });
          setCurrentSessionId(newDoc.id);
          activeSessionId = newDoc.id;
        } catch (err) {
          console.error("Error creating auto session in Firestore:", err);
          handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/sessions`);
          return;
        }
      }
    }

    const selectedFileNames = documents.filter(d => d.isSelected).map(d => d.fileName);

    // 1. Add User Message (optimistic update)
    const userMsgId = "msg_" + Math.random().toString(36).substring(2, 9);
    const userMsgData = {
      id: userMsgId,
      role: "user" as const,
      content: text,
      timestamp: new Date().toISOString(),
      selectedFiles: selectedFileNames,
      thoughts: []
    };

    if (user.uid.startsWith("guest_")) {
      const key = `rag_messages_${user.uid}_${activeSessionId}`;
      const updatedMsgs = [...messages, userMsgData];
      localStorage.setItem(key, JSON.stringify(updatedMsgs));
      setMessages(updatedMsgs);
    } else {
      try {
        const messagesRef = collection(db, "users", user.uid, "sessions", activeSessionId, "messages");
        await addDoc(messagesRef, {
          role: userMsgData.role,
          content: userMsgData.content,
          timestamp: userMsgData.timestamp,
          selectedFiles: userMsgData.selectedFiles
        });
      } catch (err) {
        console.error("Error writing user message to Firestore:", err);
        handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/sessions/${activeSessionId}/messages`);
      }
    }

    // 2. Set agent state in loader
    setLoading(true);
    setActiveThoughts([
      {
        title: "Self-Querying & Router",
        status: "running",
        description: "Initializing LangGraph orchestration node. Analyzing user intent..."
      }
    ]);

    try {
      // Sequence visual thought loader to make it feel super alive and engaging
      const timer1 = setTimeout(() => {
        setActiveThoughts(prev => [
          { ...prev[0], status: "success", description: "Optimized semantic queries formulate." },
          { title: "Vector Store Retrieval", status: "running", description: "Analyzing vector similarity scores in database..." }
        ]);
      }, 1000);

      const timer2 = setTimeout(() => {
        setActiveThoughts(prev => [
          ...prev.slice(0, 1),
          { title: "Vector Store Retrieval", status: "success", description: "Successfully loaded matching nodes." },
          { title: "Chunk Relevance Grading", status: "running", description: "Grading retrieved chunks for relevance to your query..." }
        ]);
      }, 2500);

      const timer3 = setTimeout(() => {
        setActiveThoughts(prev => [
          ...prev.slice(0, 2),
          { title: "Chunk Relevance Grading", status: "success", description: "Identified relevant document excerpts." },
          { title: "Answer Synthesis", status: "running", description: "Fusing context notes and history to compile response..." }
        ]);
      }, 4200);

      // Call API
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationHistory: messages.map(m => ({ role: m.role, content: m.content })),
          selectedDocuments: selectedFileNames,
          userId: user.uid,
          mode,
          pineconeConfig: {
            apiKey: pineconeConfig.apiKey,
            indexName: pineconeConfig.indexName
          }
        })
      });

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned non-JSON response (possibly restarting).");
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "RAG engine pipeline error.");
      }

      // Add assistant response
      const assistantMsgId = "msg_" + Math.random().toString(36).substring(2, 9);
      const assistantMsgData = {
        role: "assistant" as const,
        content: data.answer,
        timestamp: new Date().toISOString(),
        thoughts: data.thoughts || [],
        selectedFiles: data.selectedFiles || []
      };

      if (user.uid.startsWith("guest_")) {
        const key = `rag_messages_${user.uid}_${activeSessionId}`;
        const storedMsgsKey = localStorage.getItem(key);
        const currentMsgs = storedMsgsKey ? JSON.parse(storedMsgsKey) : [];
        const updatedMsgs = [...currentMsgs, { id: assistantMsgId, ...assistantMsgData }];
        localStorage.setItem(key, JSON.stringify(updatedMsgs));
        setMessages(updatedMsgs);
      } else {
        try {
          const messagesRef = collection(db, "users", user.uid, "sessions", activeSessionId, "messages");
          await addDoc(messagesRef, assistantMsgData);
        } catch (err) {
          console.error("Error writing assistant message to Firestore:", err);
          handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/sessions/${activeSessionId}/messages`);
        }
      }

    } catch (err: any) {
      console.error(err);
      const errorMsgId = "msg_" + Math.random().toString(36).substring(2, 9);
      const errorMsgData = {
        role: "assistant" as const,
        content: `Error: ${err.message || "An issue occurred while processing the Agentic RAG pipeline."}`,
        timestamp: new Date().toISOString(),
        thoughts: [{
          title: "System Exception",
          status: "error" as const,
          description: err.message || "Failed to contact RAG API endpoints."
        }],
        selectedFiles: []
      };

      if (user.uid.startsWith("guest_")) {
        const key = `rag_messages_${user.uid}_${activeSessionId}`;
        const storedMsgsKey = localStorage.getItem(key);
        const currentMsgs = storedMsgsKey ? JSON.parse(storedMsgsKey) : [];
        const updatedMsgs = [...currentMsgs, { id: errorMsgId, ...errorMsgData }];
        localStorage.setItem(key, JSON.stringify(updatedMsgs));
        setMessages(updatedMsgs);
      } else {
        try {
          const messagesRef = collection(db, "users", user.uid, "sessions", activeSessionId, "messages");
          await addDoc(messagesRef, errorMsgData);
        } catch (err) {
          console.error("Error writing error message to Firestore:", err);
          handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/sessions/${activeSessionId}/messages`);
        }
      }
    } finally {
      setLoading(false);
      setActiveThoughts([]);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("rag_local_guest_id");
    signOut(auth).catch(err => console.error("Error signing out:", err));
    setUser(null);
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#050507] flex flex-col items-center justify-center select-none">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-4" />
        <span className="text-xs text-slate-500 font-mono uppercase tracking-widest font-bold">
          Booting GraphRAG Engine...
        </span>
      </div>
    );
  }

  // If user is not authenticated, render auth modal
  if (!user) {
    return <AuthModal onSuccess={(uid, email) => {
      setUser({ uid, email });
    }} />;
  }

  const selectedFileNames = documents.filter(d => d.isSelected).map(d => d.fileName);

  return (
    <div className="flex h-screen bg-[#050507] text-slate-300 overflow-hidden font-sans relative">
      
      {/* Left Sidebar Backdrops (for mobile) */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {historyOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setHistoryOpen(false)}
        />
      )}

      {/* 1. Document Sidebar (Left Panel) */}
      <div className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <DocumentSidebar
          documents={documents}
          userId={user.uid}
          userEmail={user.email}
          mode={mode}
          setMode={setMode}
          pineconeConfig={pineconeConfig}
          setPineconeConfig={setPineconeConfig}
          onUploadSuccess={handleUploadSuccess}
          onToggleSelect={handleToggleSelectDoc}
          onDeleteDocument={handleDeleteDocument}
          onLogout={handleLogout}
        />
      </div>

      {/* 2. Session List Rail (Middle Panel) */}
      <div 
        id="session-rail" 
        className={`fixed inset-y-0 left-0 z-35 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 w-64 bg-[#050507] border-r border-white/5 glass-panel flex flex-col h-full select-none ${
          historyOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 border-b border-white/5">
          <button
            onClick={() => {
              handleCreateSession();
              setHistoryOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/20 rounded-xl transition-all group cursor-pointer text-xs font-semibold text-slate-200 hover:text-white"
          >
            <Plus className="w-4 h-4 text-cyan-400" />
            New Chat Session
          </button>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <span className="block px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
            History Threads
          </span>

          {sessions.length === 0 ? (
            <div className="text-center py-8 px-3 text-slate-600">
              <MessageSquare className="w-5 h-5 mx-auto mb-1.5 opacity-30" />
              <p className="text-[11px] leading-relaxed">No sessions found</p>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => {
                  setCurrentSessionId(session.id);
                  setHistoryOpen(false);
                }}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                  currentSessionId === session.id
                    ? "bg-white/5 border border-white/10 text-white font-medium shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.02] border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <MessageSquare className={`w-4 h-4 transition-colors flex-shrink-0 ${
                    currentSessionId === session.id ? "text-cyan-400" : "text-slate-500 group-hover:text-cyan-400"
                  }`} />
                  <span className="truncate leading-none">{session.title}</span>
                </div>

                <button
                  onClick={(e) => handleDeleteSession(session.id, e)}
                  title="Delete Session"
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-all rounded cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Status Indicators bottom */}
        <div className="p-4 bg-black/20 border-t border-white/5 text-[10px] text-slate-500 font-mono space-y-2 leading-relaxed">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">STORAGE MODE:</span>
            <span className="text-cyan-400 uppercase font-bold">{mode}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600">LLM BACKBONE:</span>
            <span className="text-slate-400 font-bold">gemini-2.5-flash</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600">EMBEDDING V:</span>
            <span className="text-slate-400 font-bold">text-embedding-004</span>
          </div>
        </div>
      </div>

      {/* 3. Main Chat Area (Right Panel) */}
      <ChatWindow
        messages={messages}
        activeDocuments={selectedFileNames}
        onSendMessage={handleSendMessage}
        loading={loading}
        activeThoughts={activeThoughts}
        onToggleSidebar={() => {
          setSidebarOpen(!sidebarOpen);
          setHistoryOpen(false);
        }}
        onToggleHistory={() => {
          setHistoryOpen(!historyOpen);
          setSidebarOpen(false);
        }}
      />

    </div>
  );
}
