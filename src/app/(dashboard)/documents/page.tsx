"use client";

import { useState, useEffect, useCallback } from "react";
import { Upload, FileText, Search, Loader2, Trash2, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Document = {
  id: string;
  title: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  status: string;
  summary: string | null;
  category: string | null;
  tags: string[];
  createdAt: string;
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING: "bg-yellow-50 text-yellow-700 border-yellow-200",
    PROCESSING: "bg-blue-50 text-blue-700 border-blue-200",
    COMPLETED: "bg-green-50 text-green-700 border-green-200",
    FAILED: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${colors[status] || ""}`}>
      {status.toLowerCase()}
    </span>
  );
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  const fetchDocuments = useCallback(async () => {
    const res = await fetch("/api/documents");
    if (res.ok) {
      const data = await res.json();
      setDocuments(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDocuments();
    const interval = setInterval(fetchDocuments, 5000);
    return () => clearInterval(interval);
  }, [fetchDocuments]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setUploading(true);
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      await fetch("/api/documents", { method: "POST", body: formData });
    }
    setUploading(false);
    fetchDocuments();
    e.target.value = "";
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    setSelectedDoc(null);
    fetchDocuments();
  };

  const filtered = documents.filter(
    (d) =>
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.fileName.toLowerCase().includes(search.toLowerCase()) ||
      (d.category || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen">
      {/* Document List */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-16 border-b border-[#e5e5e5] flex items-center justify-between px-6">
          <h1 className="text-lg font-semibold">Documents</h1>
          <label className="flex items-center gap-2 bg-[#0a0a0a] text-white px-4 py-2 rounded-md text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload
            <input type="file" className="hidden" multiple accept=".pdf,.txt,.md,.doc,.docx" onChange={handleUpload} />
          </label>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-[#e5e5e5]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#999]" />
            <input
              type="text"
              placeholder="Search documents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-[#fafafa] border border-[#e5e5e5] rounded-md focus:outline-none focus:ring-1 focus:ring-[#0a0a0a]"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-6 w-6 animate-spin text-[#999]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-[#999]">
              <FileText className="h-12 w-12 mb-4" />
              <p className="text-sm">No documents yet. Upload your first file.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#e5e5e5]">
              {filtered.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className={`w-full text-left px-6 py-4 hover:bg-[#fafafa] transition-colors ${
                    selectedDoc?.id === doc.id ? "bg-[#fafafa]" : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-[#666] mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{doc.title}</p>
                        <p className="text-xs text-[#999] mt-0.5">
                          {formatFileSize(doc.fileSize)} &middot;{" "}
                          {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={doc.status} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {selectedDoc && (
        <div className="w-[400px] border-l border-[#e5e5e5] flex flex-col bg-[#fafafa]">
          <div className="h-16 border-b border-[#e5e5e5] flex items-center justify-between px-6">
            <h2 className="text-sm font-semibold">Details</h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleDelete(selectedDoc.id)}
                className="p-2 text-[#999] hover:text-red-500 transition-colors"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setSelectedDoc(null)}
                className="p-2 text-[#999] hover:text-[#0a0a0a] transition-colors"
              >
                &times;
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div>
              <p className="text-xs text-[#999] mb-1">Title</p>
              <p className="text-sm font-medium">{selectedDoc.title}</p>
            </div>
            <div>
              <p className="text-xs text-[#999] mb-1">File</p>
              <p className="text-sm">{selectedDoc.fileName}</p>
            </div>
            <div>
              <p className="text-xs text-[#999] mb-1">Status</p>
              <StatusBadge status={selectedDoc.status} />
            </div>
            {selectedDoc.category && (
              <div>
                <p className="text-xs text-[#999] mb-1">Category</p>
                <p className="text-sm">{selectedDoc.category}</p>
              </div>
            )}
            {selectedDoc.tags.length > 0 && (
              <div>
                <p className="text-xs text-[#999] mb-1">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {selectedDoc.tags.map((tag) => (
                    <span key={tag} className="text-[11px] px-2 py-0.5 bg-[#e5e5e5] rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {selectedDoc.summary && (
              <div>
                <p className="text-xs text-[#999] mb-1">AI Summary</p>
                <p className="text-sm text-[#666] leading-relaxed">{selectedDoc.summary}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
