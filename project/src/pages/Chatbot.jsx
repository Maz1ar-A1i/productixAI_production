import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Bot, User, Sparkles, Lightbulb, ChevronRight } from 'lucide-react';
import { chatbotService, productivityService } from '../services/api';

const Chatbot = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: "Hello! I'm your productivity AI assistant. I can help you analyze your productivity data and answer questions about your performance. What would you like to know?"
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchRecords();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchRecords = async () => {
    try {
      const data = await productivityService.getRecords();
      setRecords(data);
    } catch (error) {
      console.error('Error fetching records:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || loading) return;

    const userMessage = { id: Date.now(), type: 'user', content: inputMessage };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);

    try {
      // Ensure records payload is always an array
      const recordsPayload = Array.isArray(records) ? records : [];

      const response = await chatbotService.sendMessage({
        records: recordsPayload,
        query: inputMessage
      });

      // Normalize response.content to string
      let botContent = '';
      if (typeof response.response === 'string') {
        botContent = response.response;
      } else if (response.response?.text) {
        botContent = response.response.text;
      } else {
        botContent = 'I could not process your request.';
      }

      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: botContent
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Chatbot error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: 'Sorry, I encountered an error. Please try again later.'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const quickQuestions = [
    'Which Batch was most productive?',
    'Which batch produced the worst outputs?',
    'How can I improve my productivity?',
    'Show me which Batch used most Electric units',
    'Show me worst performing Batch',
  ];

  const handleQuickQuestion = (question) => {
    setInputMessage(question);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 rounded-lg">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent flex items-center gap-3">
            <MessageCircle className="w-10 h-10 text-purple-400" />
            AI Productivity Assistant
          </h1>
          <p className="text-white/40 text-sm">Chat with AI about your productivity data and get personalized insights.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Questions & Info Panel */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/10 p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Lightbulb className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold text-white">Quick Questions</h3>
              </div>
              <div className="space-y-2">
                {quickQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickQuestion(question)}
                    className="w-full text-left p-3 flex items-center justify-between bg-white/5 hover:bg-white/10 border border-transparent hover:border-purple-500/20 rounded-lg text-white/70 hover:text-white text-sm transition-all duration-300"
                  >
                    <span>{question}</span>
                    <ChevronRight className="w-4 h-4 text-white/30" />
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/[0.02] backdrop-blur-xl rounded-2xl border border-blue-500/20 p-5">
              <h4 className="font-semibold text-white flex items-center gap-2 mb-2"><Sparkles size={18} className="text-blue-400" />Data Context</h4>
              <p className="text-blue-300 text-sm">
                <strong>{records.length}</strong> productivity records available for analysis.
              </p>
              <p className="text-white/50 text-xs mt-1">
                The AI will use this data to provide accurate insights.
              </p>
            </div>
          </div>

          {/* Chat Interface */}
          <div className="lg:col-span-2 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/10 h-[75vh] flex flex-col overflow-hidden">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {messages.map((message) => (
                <div key={message.id} className={`flex items-start gap-3 ${message.type === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${message.type === 'user' ? 'bg-blue-500/50' : 'bg-gradient-to-r from-purple-500 to-pink-500'}`}>
                    {message.type === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
                  </div>
                  <div className={`max-w-[80%] rounded-xl p-4 text-white ${message.type === 'user' ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-white/5 border border-white/10'}`}>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {typeof message.content === 'string' ? message.content : message.content?.text || ''}
                    </p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                    <Bot size={16} className="text-white" />
                  </div>
                  <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-white/80 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-2 h-2 bg-white/80 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-2 h-2 bg-white/80 rounded-full animate-bounce"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-white/10 p-4">
              <form onSubmit={handleSubmit} className="flex items-center gap-3">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask me anything about your productivity..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-white/40 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all duration-300"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !inputMessage.trim()}
                  className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300 hover:scale-[1.05] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <Send size={20} className="text-white" />
                </button>
              </form>
            </div>
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
      `}</style>
    </div>
  );
};

export default Chatbot;
