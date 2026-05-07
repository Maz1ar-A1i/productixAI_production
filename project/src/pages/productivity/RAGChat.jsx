import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Bot, User, Sparkles, AlertCircle } from "lucide-react";
import api from "../../services/api";

function formatMessage(text) {
  // Bold (**text**)
  let formatted = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  // Italic (*text*)
  formatted = formatted.replace(/\*(.*?)\*/g, "<em>$1</em>");
  // Line breaks
  formatted = formatted.replace(/\n/g, "<br />");
  return formatted;
}

const RAGChat = () => {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([
    { type: "bot", text: "Hello! Ask me anything about your productivity data, data records, or shift metrics." },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!query.trim()) return;

    const newMessages = [...messages, { type: "user", text: query }];
    setMessages(newMessages);
    setError("");
    setLoading(true);
    setQuery("");

    try {
      const res = await api.post("/rag_chat", {
        query,
        records: {},
      });

      const botResponse = res.data.answer || "No response from AI.";
      setMessages((prev) => [...prev, { type: "bot", text: botResponse }]);
    } catch (err) {
      console.error(err);
      setError("Failed to get AI response. Please try again.");
      setMessages((prev) => [...prev, { 
        type: "bot", 
        text: "Sorry, I encountered an error. Please try again." 
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !loading) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 rounded-lg">
      <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-3rem)]">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent flex items-center gap-3">
            <MessageSquare className="w-10 h-10 text-purple-400" />
            AI Assistant
          </h1>
          <p className="text-white/40 text-sm">
            Ask questions about your production data and get intelligent insights
          </p>
        </div>

        {/* Chat Container */}
        <div className="flex-1 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/10 flex flex-col overflow-hidden">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-3 animate-in fade-in duration-300 ${
                  msg.type === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.type === "bot" && (
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                )}
                
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                    msg.type === "user"
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                      : "bg-white/10 text-white border border-white/10"
                  }`}
                >
                  <p
  className="text-sm leading-relaxed whitespace-pre-wrap"
  dangerouslySetInnerHTML={{ __html: formatMessage(msg.text) }}
/>
                </div>

                {msg.type === "user" && (
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 justify-start animate-in fade-in duration-300">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="bg-white/10 text-white border border-white/10 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                    </div>
                    <span className="text-sm text-white/60">Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mx-6 mb-4 bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-2">
              <AlertCircle className="text-red-400 flex-shrink-0" size={16} />
              <span className="text-red-400 text-sm">{error}</span>
            </div>
          )}

          {/* Input Area */}
          <div className="border-t border-white/10 p-4">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  className="w-full bg-white/10 border border-white/10 rounded-xl py-3 px-4 pr-12 text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500/50 focus:bg-white/15 transition-all duration-300"
                  placeholder="Ask about categories, data records, shifts, or metrics..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyPress}
                  disabled={loading}
                />
                <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400/40" />
              </div>
              
              <button
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
                onClick={handleSend}
                disabled={loading || !query.trim()}
              >
                <Send className="w-5 h-5" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>
            
            <p className="text-white/30 text-xs mt-2 text-center">
              Press Enter to send • Shift + Enter for new line
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(168, 85, 247, 0.4);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(168, 85, 247, 0.6);
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default RAGChat;