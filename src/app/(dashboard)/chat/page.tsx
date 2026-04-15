"use client";

import { useChat } from "@ai-sdk/react";
import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Square, ArrowDown, FileText, Loader2 } from "lucide-react";

const TOOL_LABELS: Record<string, string> = {
  search_documents: "Searching documents",
  list_documents: "Fetching documents",
  get_document: "Loading document",
  get_analytics: "Analyzing collection",
};

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

function formatMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br />");
}

export default function ChatPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, stop } = useChat({
    api: "/api/chat",
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

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

  const suggestions = [
    "What documents do I have?",
    "Summarize my most recent document",
    "Show me analytics about my collection",
    "Search for contracts in my documents",
  ];

  return (
    <div className="flex flex-col h-screen">
      <div className="h-16 border-b border-[#e5e5e5] flex items-center px-6">
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
              {messages.map((message) => {
                if (message.role === "user") {
                  return (
                    <div key={message.id} className="flex justify-end">
                      <div className="max-w-[85%] text-sm bg-[#f5f5f5] px-4 py-2 rounded-2xl rounded-br-none">
                        {message.content}
                      </div>
                    </div>
                  );
                }

                // Assistant message
                const toolInvocations = message.toolInvocations || [];

                return (
                  <div key={message.id} className="flex justify-start">
                    <div className="w-full">
                      {toolInvocations.map((inv: { toolCallId: string; toolName: string; state: string }) => (
                        <div key={inv.toolCallId} className="mb-2">
                          <ToolCallBadge toolName={inv.toolName} state={inv.state} />
                        </div>
                      ))}
                      {message.content && (
                        <div
                          className="text-sm text-[#666] leading-relaxed [&_strong]:text-[#0a0a0a] [&_code]:bg-[#f5f5f5] [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[13px]"
                          dangerouslySetInnerHTML={{ __html: formatMarkdown(message.content) }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}

              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex justify-start">
                  <ThinkingIndicator />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {!isAtBottom && (
        <button onClick={scrollToBottom} className="absolute bottom-28 left-1/2 -translate-x-1/2 ml-[35px] p-2 bg-white border border-[#e5e5e5] rounded-full shadow-sm hover:bg-[#fafafa]">
          <ArrowDown className="h-4 w-4" />
        </button>
      )}

      <div className="fixed bottom-0 left-[70px] right-0 bg-gradient-to-t from-white via-white to-transparent pt-8 pb-4 z-40 px-4">
        <div className="max-w-[680px] mx-auto w-full">
          <form onSubmit={handleSubmit}>
            <div className="relative bg-[rgba(247,247,247,0.85)] backdrop-blur-lg border border-[#e5e5e5] rounded-xl">
              <input
                value={input}
                onChange={handleInputChange}
                placeholder={messages.length > 0 ? "Reply..." : "Ask about your documents..."}
                className="w-full px-4 py-3 pr-12 text-sm bg-transparent focus:outline-none"
                autoFocus
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                {isLoading ? (
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
  );
}
