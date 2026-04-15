"use client";

import { useChat } from "@ai-sdk/react";
import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Square, ArrowDown, FileText, Loader2, Plus, MessageSquare, Trash2 } from "lucide-react";

const TOOL_LABELS: Record<string, string> = {
  search_documents: "Searching documents",
  list_documents: "Fetching documents",
  get_document: "Loading document",
  get_analytics: "Analyzing collection",
  remember: "Saving to memory",
  recall_memory: "Recalling from memory",
};

type Conversation = { id: string; title: string; updatedAt: string };

function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-1.5 h-5 text-xs">
      <span className="text-[#999] animate-pulse">Thinking...</span>
    </div>
  );
}

function ToolCallBadge({ toolName, state }: { toolName: string; state: string }) {
  const label = TOOL_LABELS[toolName] || toolName;
  const isDone = state === "result";
  return (
    <div className="inline-flex items-center gap-1.5 border bg-white border-[#e6e6e6] px-2 py-1 text-[11px] leading-none text-[#999]">
      {isDone ? <span className="text-green-600">&#10003;</span> : <Loader2 className="h-3 w-3 animate-spin text-[#999]" />}
      <span>{label}</span>
    </div>
  );
}

/**
 * Streamdown-style markdown renderer.
 * Renders markdown incrementally with proper styling for tables, links, code, etc.
 */
function StreamdownRenderer({ content, isAnimating }: { content: string; isAnimating: boolean }) {
  // Parse markdown to HTML with proper styling
  const html = renderMarkdown(content);

  return (
    <div
      className={`
        text-sm text-[#666] leading-relaxed space-y-3
        [&>*:first-child]:mt-0 [&>*:last-child]:mb-0
        [&_strong]:font-medium [&_strong]:text-[#0a0a0a]
        [&_em]:italic
        [&_code]:px-1 [&_code]:py-0.5 [&_code]:bg-[#f5f5f5] [&_code]:text-[13px] [&_code]:text-[#0a0a0a]
        [&_pre]:p-3 [&_pre]:bg-[#f5f5f5] [&_pre]:text-[13px] [&_pre]:overflow-x-auto
        [&_h1]:text-lg [&_h1]:text-[#0a0a0a] [&_h1]:font-semibold [&_h1]:mt-6 [&_h1]:mb-2
        [&_h2]:text-base [&_h2]:text-[#0a0a0a] [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2
        [&_h3]:text-sm [&_h3]:text-[#0a0a0a] [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1.5
        [&_ul]:space-y-1 [&_ul]:pl-4 [&_li]:list-disc [&_li]:marker:text-[#666]
        [&_ol]:space-y-1 [&_ol]:pl-4 [&_ol]:list-decimal
        [&_table]:w-full [&_table]:text-sm
        [&_thead]:border-b [&_thead]:border-[#e5e5e5]
        [&_th]:h-10 [&_th]:px-4 [&_th]:text-left [&_th]:align-middle [&_th]:text-[#666] [&_th]:font-medium [&_th]:whitespace-nowrap
        [&_tbody_tr]:border-b [&_tbody_tr]:border-[#e5e5e5] [&_tbody_tr:last-child]:border-0
        [&_td]:px-4 [&_td]:py-2 [&_td]:align-middle [&_td]:whitespace-nowrap [&_td]:text-[#666]
        [&_a]:text-[#0a0a0a] [&_a]:border-b [&_a]:border-dashed [&_a]:border-[#666] [&_a]:cursor-pointer [&_a:hover]:text-[#333]
        [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-[#666]
        [&_blockquote]:border-l-2 [&_blockquote]:border-[#e5e5e5] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-[#999]
        ${isAnimating ? "animate-fade-in" : ""}
      `}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function renderMarkdown(text: string): string {
  let html = text;

  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');

  // Tables
  html = html.replace(/\|(.+)\|\n\|[-| :]+\|\n((?:\|.+\|\n?)*)/g, (match, header, body) => {
    const headers = header.split("|").map((h: string) => h.trim()).filter(Boolean);
    const rows = body.trim().split("\n").map((row: string) =>
      row.split("|").map((c: string) => c.trim()).filter(Boolean)
    );
    return `<table><thead><tr>${headers.map((h: string) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((row: string[]) => `<tr>${row.map((c: string) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  });

  // Headers
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Links (including entity links)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Lists
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>");

  // Paragraphs (lines not already wrapped)
  html = html.replace(/^(?!<[hultpboa])(.*\S.*)$/gm, "<p>$1</p>");

  // Clean up
  html = html.replace(/\n{2,}/g, "");

  return html;
}

export default function ChatPage() {
  const [chatId, setChatId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);

  const { messages, input, handleInputChange, handleSubmit, isLoading, stop, setMessages } = useChat({
    api: "/api/chat",
    body: { chatId },
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const isStreaming = isLoading;

  // Load conversations
  useEffect(() => {
    fetch("/api/conversations").then(r => r.json()).then(setConversations).catch(() => {});
  }, [chatId]);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (isAtBottom) scrollToBottom();
  }, [messages, isAtBottom, scrollToBottom]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setIsAtBottom(scrollHeight - scrollTop - clientHeight < 50);
  }, []);

  const createNewChat = async () => {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New conversation" }),
    });
    const chat = await res.json();
    setChatId(chat.id);
    setMessages([]);
  };

  const loadChat = async (id: string) => {
    setChatId(id);
    const res = await fetch(`/api/conversations/${id}`);
    const chat = await res.json();
    if (chat.messages) {
      setMessages(chat.messages.map((m: { id: string; role: string; content: string }) => ({
        id: m.id,
        role: m.role,
        content: m.content,
      })));
    }
  };

  const deleteChat = async (id: string) => {
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    if (chatId === id) {
      setChatId(null);
      setMessages([]);
    }
    setConversations(prev => prev.filter(c => c.id !== id));
  };

  // Auto-create chat on first message if none exists
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    if (!chatId) {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: input.slice(0, 50) }),
      });
      const chat = await res.json();
      setChatId(chat.id);
    }

    handleSubmit(e);
  };

  const suggestions = [
    "What documents do I have?",
    "Summarize my most recent document",
    "Show me analytics about my collection",
    "Search for contracts in my documents",
  ];

  return (
    <div className="flex h-screen">
      {/* Conversation Sidebar */}
      {showSidebar && (
        <div className="w-[260px] border-r border-[#e5e5e5] flex flex-col bg-[#fafafa]">
          <div className="h-16 border-b border-[#e5e5e5] flex items-center justify-between px-4">
            <span className="text-sm font-semibold">Conversations</span>
            <button onClick={createNewChat} className="p-1.5 hover:bg-[#e5e5e5] rounded-md transition-colors" title="New chat">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto hide-scrollbar">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#f0f0f0] transition-colors group ${chatId === conv.id ? "bg-[#f0f0f0]" : ""}`}
              >
                <button onClick={() => loadChat(conv.id)} className="flex items-center gap-2 flex-1 text-left min-w-0">
                  <MessageSquare className="h-3.5 w-3.5 text-[#999] shrink-0" />
                  <span className="text-xs truncate">{conv.title}</span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteChat(conv.id); }}
                  className="p-1 text-[#ccc] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="h-16 border-b border-[#e5e5e5] flex items-center px-6 gap-3">
          <button onClick={() => setShowSidebar(!showSidebar)} className="p-1.5 hover:bg-[#f0f0f0] rounded-md">
            <MessageSquare className="h-4 w-4 text-[#666]" />
          </button>
          <h1 className="text-lg font-semibold">AI Chat</h1>
        </div>

        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto hide-scrollbar">
          <div className="max-w-[680px] mx-auto w-full pt-8 pb-32 px-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[60vh]">
                <FileText className="h-12 w-12 text-[#ccc] mb-4" />
                <h2 className="text-xl font-semibold mb-2">How can I help you?</h2>
                <p className="text-sm text-[#999] mb-8">Ask me anything about your documents</p>
                <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        handleInputChange({ target: { value: s } } as React.ChangeEvent<HTMLInputElement>);
                        setTimeout(() => document.querySelector<HTMLFormElement>("form")?.requestSubmit(), 50);
                      }}
                      className="text-left text-xs text-[#666] px-3 py-2 border border-[#e5e5e5] rounded-lg hover:bg-[#fafafa] transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, idx) => {
                  if (message.role === "user") {
                    return (
                      <div key={message.id} className="flex justify-end">
                        <div className="max-w-[85%] text-sm bg-[#f5f5f5] px-4 py-2 rounded-2xl rounded-br-none">
                          {message.content}
                        </div>
                      </div>
                    );
                  }

                  const toolInvocations = message.toolInvocations || [];
                  const isLast = idx === messages.length - 1;

                  return (
                    <div key={message.id} className="flex justify-start">
                      <div className="w-full">
                        {toolInvocations.map((inv: { toolCallId: string; toolName: string; state: string }) => (
                          <div key={inv.toolCallId} className="mb-2">
                            <ToolCallBadge toolName={inv.toolName} state={inv.state} />
                          </div>
                        ))}
                        {message.content && (
                          <StreamdownRenderer
                            content={message.content}
                            isAnimating={isLast && isStreaming}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}

                {isStreaming && messages[messages.length - 1]?.role === "user" && (
                  <div className="flex justify-start">
                    <ThinkingIndicator />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {!isAtBottom && (
          <button onClick={scrollToBottom} className="absolute bottom-28 left-1/2 -translate-x-1/2 p-2 bg-white border border-[#e5e5e5] rounded-full shadow-sm hover:bg-[#fafafa]">
            <ArrowDown className="h-4 w-4" />
          </button>
        )}

        <div className="fixed bottom-0 right-0 bg-gradient-to-t from-white via-white to-transparent pt-8 pb-4 z-40 px-4" style={{ left: showSidebar ? "calc(70px + 260px)" : "70px" }}>
          <div className="max-w-[680px] mx-auto w-full">
            <form onSubmit={handleFormSubmit}>
              <div className="relative bg-[rgba(247,247,247,0.85)] backdrop-blur-lg border border-[#e5e5e5] rounded-xl">
                <input
                  value={input}
                  onChange={handleInputChange}
                  placeholder={messages.length > 0 ? "Reply..." : "Ask about your documents..."}
                  className="w-full px-4 py-3 pr-12 text-sm bg-transparent focus:outline-none"
                  autoFocus
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  {isStreaming ? (
                    <button type="button" onClick={stop} className="p-1.5 text-[#999] hover:text-[#0a0a0a]">
                      <Square className="h-4 w-4" />
                    </button>
                  ) : (
                    <button type="submit" disabled={!input.trim()} className="p-1.5 text-[#999] hover:text-[#0a0a0a] disabled:opacity-30">
                      <Send className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
