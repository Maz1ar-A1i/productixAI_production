import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, ArrowRight, Share2, FileText, X } from 'lucide-react';

// Waveform component
const Waveform = ({ active }) => (
  <div className="flex items-end justify-center gap-1" style={{ height: 72 }}>
    {Array.from({ length: 9 }, (_, i) => (
      <div
        key={i}
        className={active ? "wave-bar" : ""}
        style={{
          width: 5,
          height: active ? undefined : 8,
          borderRadius: 3,
          background: active ? undefined : 'var(--border)',
          transition: 'background 0.3s ease',
        }}
      />
    ))}
  </div>
);

// Typing effect for AI response
function useTyping(text, speed = 18) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    setDisplayed('');
    if (!text) return;
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(timer);
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);
  return displayed;
}

const DEMO_RESPONSES = [
  {
    query: "What needs my attention today?",
    response: "3 urgent actions detected this morning.\n\nFirst: Revenue is down 14% — I recommend calling your top 5 leads within the next 2 hours.\n\nSecond: Product A inventory hits stockout in 1.2 days — a reorder of 800 units has been queued.\n\nThird: Machine C efficiency dropped to 67% — reassigning Operator A should recover ~80 units this shift.\n\nTotal potential impact: ₨135,000 recovery. Shall I handle the inventory reorder automatically?",
    actions: [
      { label: "Start with sales", icon: "💼" },
      { label: "Queue inventory reorder", icon: "📦" },
      { label: "Alert shift supervisor", icon: "🏭" },
    ],
  },
  {
    query: "How is production performing?",
    response: "Production this week: 87% of target.\n\nMachine A: 94% efficiency — excellent.\nMachine B: 81% — on target.\nMachine C: 67% — below threshold.\n\nShift 2 is 120 units behind. The gap is recoverable if you reassign Operator A now.\n\nOverall trend: Production has improved 8% month-over-month. Your team is on track for the quarterly target.",
    actions: [
      { label: "Reassign operator", icon: "👷" },
      { label: "View batch report", icon: "📊" },
    ],
  },
  {
    query: "Show me my financial summary",
    response: "Finance snapshot as of today:\n\nRevenue: ₨284,000 (yesterday: ₨330,000 — down 14%)\nOPEX: ₨1.24M this month (budget: ₨1.14M — over by 9%)\nProfit margin: 22.4% (target: 26%)\n\nMajor cost drivers: Fuel costs up 31%, Energy up 12%.\n\nI recommend switching to grid power during off-peak hours (11pm–5am). Potential saving: ₨80,000 this month.",
    actions: [
      { label: "Optimize energy usage", icon: "⚡" },
      { label: "Review vendor contracts", icon: "📋" },
    ],
  },
];

export default function VoiceInterface() {
  const [listening, setListening] = useState(false);
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState(null);
  const [thinking, setThinking] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState(null);
  const [actions, setActions] = useState([]);
  const navigate = useNavigate();
  const typedResponse = useTyping(response, 12);

  const handleSpeak = () => {
    if (listening) {
      setListening(false);
      // Pick a demo response
      const demo = DEMO_RESPONSES[Math.floor(Math.random() * DEMO_RESPONSES.length)];
      setQuery(demo.query);
      setSelectedDemo(demo);
      setThinking(true);
      setResponse(null);
      setActions([]);
      setTimeout(() => {
        setThinking(false);
        setResponse(demo.response);
        setActions(demo.actions);
      }, 1400);
    } else {
      setListening(true);
      setQuery('');
      setResponse(null);
      setActions([]);
      // Auto stop after 3s (simulate speech end)
      setTimeout(() => {
        setListening(false);
        const demo = DEMO_RESPONSES[Math.floor(Math.random() * DEMO_RESPONSES.length)];
        setQuery(demo.query);
        setSelectedDemo(demo);
        setThinking(true);
        setTimeout(() => {
          setThinking(false);
          setResponse(demo.response);
          setActions(demo.actions);
        }, 1400);
      }, 3000);
    }
  };

  const handleTextQuery = (demoQuery) => {
    const demo = DEMO_RESPONSES.find(d => d.query === demoQuery) || DEMO_RESPONSES[0];
    setQuery(demo.query);
    setSelectedDemo(demo);
    setThinking(true);
    setResponse(null);
    setActions([]);
    setTimeout(() => {
      setThinking(false);
      setResponse(demo.response);
      setActions(demo.actions);
    }, 1000);
  };

  return (
    <div
      className="flex flex-col h-screen"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Header */}
      <div
        className="flex-shrink-0 px-6 py-4 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
      >
        <div>
          <h1 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Voice Co-Pilot</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Ask anything about your business
          </p>
        </div>
        <button
          onClick={() => navigate('/feed')}
          className="btn-ghost px-3 py-2"
          style={{ fontSize: 13 }}
        >
          <X size={14} /> Close
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6">

        {/* Waveform + Mic Button */}
        <div className="flex flex-col items-center gap-6 py-4">
          <Waveform active={listening} />

          <button
            onClick={handleSpeak}
            className="relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90"
            style={{
              background: listening ? 'var(--danger)' : 'var(--accent)',
              color: '#000',
              boxShadow: listening
                ? '0 0 0 12px rgba(239,68,68,0.15), 0 0 0 24px rgba(239,68,68,0.07)'
                : '0 0 0 10px var(--accent-dim)',
            }}
          >
            {listening ? <MicOff size={28} /> : <Mic size={28} />}
          </button>

          <div className="text-center">
            <p className="text-sm font-semibold" style={{ color: listening ? 'var(--danger)' : 'var(--text-secondary)' }}>
              {listening ? '🔴 Listening...' : '🎙 Tap to speak'}
            </p>
            {listening && (
              <p className="text-xs mt-1 animate-fade-up" style={{ color: 'var(--text-muted)' }}>
                Tap again to stop
              </p>
            )}
          </div>
        </div>

        {/* Quick questions */}
        {!query && !listening && (
          <div className="animate-fade-up">
            <div className="section-title mb-3">Try asking:</div>
            <div className="flex flex-col gap-2">
              {DEMO_RESPONSES.map(d => (
                <button
                  key={d.query}
                  onClick={() => handleTextQuery(d.query)}
                  className="glass-card px-4 py-3 text-left flex items-center justify-between group hover:border-accent transition-all duration-200"
                  style={{ fontSize: 13 }}
                >
                  <span style={{ color: 'var(--text-secondary)' }}>"{d.query}"</span>
                  <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} className="group-hover:text-accent" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* User Query */}
        {query && (
          <div className="animate-fade-up">
            <div className="flex justify-end">
              <div
                className="px-4 py-2.5 rounded-xl max-w-xs text-sm"
                style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(0,212,170,0.2)' }}
              >
                🎙 "{query}"
              </div>
            </div>
          </div>
        )}

        {/* Thinking */}
        {thinking && (
          <div className="animate-fade-up flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-dim)' }}>
              <span style={{ fontSize: 14 }}>🤖</span>
            </div>
            <div className="flex gap-1.5 items-center">
              {[0, 0.15, 0.3].map(delay => (
                <div
                  key={delay}
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{ background: 'var(--accent)', animationDelay: `${delay}s` }}
                />
              ))}
              <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>Analyzing...</span>
            </div>
          </div>
        )}

        {/* AI Response */}
        {response && (
          <div className="animate-fade-up flex gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1" style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)' }}>
              <span style={{ fontSize: 14 }}>🤖</span>
            </div>
            <div className="flex-1">
              <div
                className="glass-card p-4 text-sm leading-relaxed"
                style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}
              >
                {typedResponse}
              </div>

              {/* Action chips */}
              {actions.length > 0 && typedResponse.length >= response.length * 0.8 && (
                <div className="mt-3 flex flex-wrap gap-2 animate-fade-up">
                  {actions.map((a, i) => (
                    <button
                      key={i}
                      onClick={() => navigate('/feed')}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-xs transition-all duration-200 hover:scale-105"
                      style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(0,212,170,0.2)' }}
                    >
                      <span>{a.icon}</span> {a.label}
                    </button>
                  ))}
                  <button
                    onClick={() => navigate('/feed')}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-xs"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                  >
                    <FileText size={12} /> Convert to actions
                  </button>
                  <button
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-xs"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                  >
                    <Share2 size={12} /> Share
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
