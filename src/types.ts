export interface AgentThought {
  title: string;
  status: "success" | "running" | "warning" | "error";
  description: string;
  metadata?: {
    details?: string[];
  };
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  thoughts?: AgentThought[];
  selectedFiles?: string[];
}

export interface DocumentFile {
  fileName: string;
  createdAt: string;
  chunksCount: number;
  isSelected?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  selectedDocuments: string[];
}

export interface PineconeConfig {
  apiKey: string;
  indexName: string;
  environment: string;
  isVerified: boolean;
}
