import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Mic, MicOff, Mail, Calendar, HardDrive, Table, Sparkles, ChevronDown, ChevronUp, Volume2, VolumeX, ThumbsUp, ThumbsDown } from 'lucide-react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'react-hot-toast';

const QUICK_ACTIONS = [
  { icon: Mail, label: '📧 Check Emails', message: 'Check my recent emails and summarize any important ones' },
  { icon: Calendar, label: '📅 Today\'s Events', message: 'What events do I have today?' },
  { icon: HardDrive, label: '📁 Recent Files', message: 'Show me my recent Drive files' },
  { icon: Table, label: '📊 Open Sheet', message: 'Read my Google Sheet and show the data' },
];

function TypewriterText({ text, onComplete }) {
  const [displayed, setDisplayed] = useState('');
  const indexRef = useRef(0);

  useEffect(() => {
    if (!text) return;
    setDisplayed('');
    indexRef.current = 0;

    const interval = setInterval(() => {
      indexRef.current++;
      setDisplayed(text.slice(0, indexRef.current));
      if (indexRef.current >= text.length) {
        clearInterval(interval);
        onComplete?.();
      }
    }, 15);

    return () => clearInterval(interval);
  }, [text]);

  return <span>{displayed}</span>;
}

// ─── Explainable AI Multi-Agent Log Component with Interactive SVG Workflow Graph ───
function AgentReasoning({ logs }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);

  if (!logs || !Array.isArray(logs) || logs.length === 0) return null;

  const hasGmail = logs.some((l) => l.agent.includes('Gmail'));
  const hasCalendar = logs.some((l) => l.agent.includes('Calendar'));
  const hasDrive = logs.some((l) => l.agent.includes('Drive'));

  return (
    <div className="mt-2 border-t border-cyan-500/10 pt-2 text-[10px]">
      <button 
        type="button" 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity text-cyan-400 font-semibold uppercase tracking-wider cursor-pointer"
      >
        <span>🤖 Multi-Agent Graph Thoughts ({logs.length})</span>
        {isOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
      </button>
      
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }} 
          animate={{ opacity: 1, height: 'auto' }} 
          className="mt-2 pl-1 border-l border-cyan-500/20"
        >
          {/* SVG Workflow Visualizer Graph */}
          <div className="glass-panel p-2 bg-black/60 border-cyan-500/10 mb-2 relative overflow-hidden rounded">
            <svg viewBox="0 0 340 120" className="w-full h-auto">
              <defs>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Pattern grid lines */}
              <rect width="340" height="120" fill="rgba(0,0,0,0.1)" />

              {/* Connections paths */}
              <line x1="25" y1="60" x2="115" y2="35" stroke="rgba(0, 212, 255, 0.4)" strokeWidth="1" strokeDasharray="3,3" />
              <line x1="115" y1="35" x2="135" y2="85" stroke={hasGmail ? '#00D4FF' : 'rgba(255,255,255,0.1)'} strokeWidth={hasGmail ? 1.5 : 0.8} />
              <line x1="115" y1="35" x2="180" y2="85" stroke={hasCalendar ? '#D946EF' : 'rgba(255,255,255,0.1)'} strokeWidth={hasCalendar ? 1.5 : 0.8} />
              <line x1="115" y1="35" x2="225" y2="85" stroke={hasDrive ? '#3B82F6' : 'rgba(255,255,255,0.1)'} strokeWidth={hasDrive ? 1.5 : 0.8} />
              <line x1="115" y1="35" x2="315" y2="60" stroke="rgba(0, 255, 136, 0.3)" strokeWidth="0.8" strokeDasharray="2,2" />

              <line x1="135" y1="85" x2="315" y2="60" stroke={hasGmail ? '#00D4FF' : 'rgba(255,255,255,0.1)'} strokeWidth={hasGmail ? 1 : 0.5} />
              <line x1="180" y1="85" x2="315" y2="60" stroke={hasCalendar ? '#D946EF' : 'rgba(255,255,255,0.1)'} strokeWidth={hasCalendar ? 1 : 0.5} />
              <line x1="225" y1="85" x2="315" y2="60" stroke={hasDrive ? '#3B82F6' : 'rgba(255,255,255,0.1)'} strokeWidth={hasDrive ? 1 : 0.5} />

              {/* Node Cards */}
              <circle cx="25" cy="60" r="9" fill="rgba(15,23,42,0.9)" stroke="#00D4FF" strokeWidth="1.2" filter="url(#glow)" />
              <text x="25" y="62" textAnchor="middle" fontSize="5" fill="#00D4FF" fontWeight="bold">USR</text>
              <text x="25" y="75" textAnchor="middle" fontSize="4.5" fill="rgba(255,255,255,0.4)">Input</text>

              <g className="cursor-pointer" onClick={() => {
                const execIdx = logs.findIndex(l => l.agent.includes('Executive'));
                if (execIdx !== -1) setSelectedIdx(execIdx);
              }}>
                <rect x="75" y="20" width="80" height="18" rx="2" fill="rgba(15,23,42,0.95)" stroke="var(--color-matrix-green)" strokeWidth="1.2" filter="url(#glow)" />
                <text x="115" y="31" textAnchor="middle" fontSize="5.5" fill="var(--color-matrix-green)" fontWeight="bold">◈ CENTRAL ROUTER</text>
              </g>

              <g className="cursor-pointer" onClick={() => {
                const gIdx = logs.findIndex(l => l.agent.includes('Gmail'));
                if (gIdx !== -1) setSelectedIdx(gIdx);
              }}>
                <circle cx="135" cy="85" r="9" fill="rgba(15,23,42,0.9)" stroke={hasGmail ? '#00D4FF' : 'rgba(255,255,255,0.15)'} strokeWidth="1.2" filter={hasGmail ? 'url(#glow)' : ''} />
                <text x="135" y="87" textAnchor="middle" fontSize="5" fill={hasGmail ? '#00D4FF' : 'rgba(255,255,255,0.3)'}>GMAIL</text>
                <text x="135" y="100" textAnchor="middle" fontSize="4" fill={hasGmail ? '#00D4FF' : 'rgba(255,255,255,0.3)'}>Gmail Agt</text>
              </g>

              <g className="cursor-pointer" onClick={() => {
                const cIdx = logs.findIndex(l => l.agent.includes('Calendar'));
                if (cIdx !== -1) setSelectedIdx(cIdx);
              }}>
                <circle cx="180" cy="85" r="9" fill="rgba(15,23,42,0.9)" stroke={hasCalendar ? '#D946EF' : 'rgba(255,255,255,0.15)'} strokeWidth="1.2" filter={hasCalendar ? 'url(#glow)' : ''} />
                <text x="180" y="87" textAnchor="middle" fontSize="5" fill={hasCalendar ? '#D946EF' : 'rgba(255,255,255,0.3)'}>CAL</text>
                <text x="180" y="100" textAnchor="middle" fontSize="4" fill={hasCalendar ? '#D946EF' : 'rgba(255,255,255,0.3)'}>Calendar Agt</text>
              </g>

              <g className="cursor-pointer" onClick={() => {
                const dIdx = logs.findIndex(l => l.agent.includes('Drive'));
                if (dIdx !== -1) setSelectedIdx(dIdx);
              }}>
                <circle cx="225" cy="85" r="9" fill="rgba(15,23,42,0.9)" stroke={hasDrive ? '#3B82F6' : 'rgba(255,255,255,0.15)'} strokeWidth="1.2" filter={hasDrive ? 'url(#glow)' : ''} />
                <text x="225" y="87" textAnchor="middle" fontSize="5" fill={hasDrive ? '#3B82F6' : 'rgba(255,255,255,0.3)'}>DRV</text>
                <text x="225" y="100" textAnchor="middle" fontSize="4" fill={hasDrive ? '#3B82F6' : 'rgba(255,255,255,0.3)'}>Drive Agt</text>
              </g>

              <circle cx="315" cy="60" r="9" fill="rgba(15,23,42,0.9)" stroke="var(--color-matrix-green)" strokeWidth="1.2" filter="url(#glow)" />
              <text x="315" y="62" textAnchor="middle" fontSize="5" fill="var(--color-matrix-green)" fontWeight="bold">RESP</text>
              <text x="315" y="75" textAnchor="middle" fontSize="4.5" fill="rgba(255,255,255,0.4)">Output</text>
            </svg>
          </div>

          {/* Interactive Selected Agent Thought details */}
          {logs[selectedIdx] && (() => {
            const currentLog = logs[selectedIdx];
            const agentName = currentLog.agent || 'Executive Assistant';
            let color = 'var(--color-matrix-green)';
            if (agentName.includes('Gmail')) color = '#00D4FF';
            if (agentName.includes('Calendar')) color = '#D946EF';
            if (agentName.includes('Drive')) color = '#3B82F6';

            const conf = Math.round((currentLog.confidence || 0.9) * 100);

            return (
              <motion.div 
                key={selectedIdx}
                initial={{ opacity: 0, y: 5 }} 
                animate={{ opacity: 1, y: 0 }}
                className="space-y-1 p-2 bg-slate-900/60 border border-cyan-500/10 rounded"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold uppercase tracking-wider" style={{ color, fontSize: '9px' }}>◈ {agentName}</span>
                  <span className="opacity-50 font-mono text-[8px]">{conf}% confidence</span>
                </div>
                <div className="text-slate-300 leading-normal pl-1" style={{ fontSize: '9px' }}>{currentLog.thought}</div>
                {currentLog.sources && Array.isArray(currentLog.sources) && currentLog.sources.length > 0 && (
                  <div className="opacity-40 font-mono text-[7px] pl-1">
                    Sources: {currentLog.sources.join(', ')}
                  </div>
                )}
                <div className="pt-1 pl-1 pr-1">
                  <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500" 
                      style={{ 
                        width: `${conf}%`, 
                        background: conf > 80 ? 'linear-gradient(90deg, #00D4FF, #10b981)' : 'linear-gradient(90deg, #f59e0b, #ef4444)' 
                      }} 
                    />
                  </div>
                </div>
              </motion.div>
            );
          })()}

          <div className="mt-2 flex justify-between items-center text-[8px] opacity-60">
            <span>💡 Click agent nodes in the graph to view thoughts</span>
            <button 
              type="button" 
              onClick={() => setSelectedIdx((prev) => (prev + 1) % logs.length)} 
              className="glow-btn px-1 py-0.5 text-[8px]"
            >
              Next Thought ➜
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Voice Recognition Hook ───
function useVoiceRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        setTranscript(finalTranscript || interimTranscript);
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error !== 'aborted') {
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return;
    setTranscript('');
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (err) {
      console.warn('Failed to start recognition:', err);
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !isListening) return;
    try {
      recognitionRef.current.stop();
    } catch {}
    setIsListening(false);
  }, [isListening]);

  return { isListening, transcript, isSupported, startListening, stopListening, setTranscript };
}

export default function ChatPanel() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => uuidv4());
  const [typingComplete, setTypingComplete] = useState({});
  const [isMuted, setIsMuted] = useState(false);
  const [ratings, setRatings] = useState({});
  const [voices, setVoices] = useState([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState('');

  useEffect(() => {
    if (!window.speechSynthesis) return;
    const updateVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      const englishVoices = allVoices.filter(v => v.lang.startsWith('en'));
      setVoices(englishVoices);
      if (englishVoices.length > 0 && !selectedVoiceName) {
        const defaultVoice = englishVoices.find(v => v.name.includes('Google') || v.name.includes('Natural')) || englishVoices[0];
        setSelectedVoiceName(defaultVoice.name);
      }
    };
    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
  }, [selectedVoiceName]);
  const messagesEndRef = useRef(null);
  const voiceSendTimerRef = useRef(null);

  const {
    isListening,
    transcript,
    isSupported,
    startListening,
    stopListening,
    setTranscript,
  } = useVoiceRecognition();

  const speakText = (text) => {
    if (isMuted || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const cleanSpeak = text.replace(/◈/g, '').replace(/✅/g, '').replace(/✉️/g, ''); // Strip symbols for clean speech
      const utterance = new SpeechSynthesisUtterance(cleanSpeak);
      utterance.rate = 1.05;
      utterance.pitch = 0.95;
      
      const matchedVoice = voices.find(v => v.name === selectedVoiceName);
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }
      
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis failed:', e);
    }
  };

  const handleRateMessage = async (msgContent, rating) => {
    const current = ratings[msgContent];
    const targetRating = current === rating ? null : rating;
    setRatings((prev) => ({ ...prev, [msgContent]: targetRating }));
    
    if (targetRating) {
      try {
        await axios.post('/api/chat/feedback', {
          sessionId,
          content: msgContent,
          rating: targetRating,
        });
      } catch (err) {
        console.warn('Failed to submit rating', err.message);
      }
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Sync voice transcript to input field in real-time
  useEffect(() => {
    if (isListening && transcript) {
      setInput(transcript);
    }
  }, [transcript, isListening]);

  // Auto-send after voice stops (user finished speaking)
  useEffect(() => {
    if (!isListening && transcript.trim()) {
      voiceSendTimerRef.current = setTimeout(() => {
        sendMessage(transcript.trim(), true);
        setTranscript('');
      }, 600);
    }
    return () => {
      if (voiceSendTimerRef.current) clearTimeout(voiceSendTimerRef.current);
    };
  }, [isListening, transcript]);

  // Listen for Dashboard diagnostic action triggers
  useEffect(() => {
    const handleActionTrigger = (e) => {
      if (e.detail) {
        sendMessage(e.detail, false);
      }
    };
    window.addEventListener('veritas-chat-trigger', handleActionTrigger);
    return () => window.removeEventListener('veritas-chat-trigger', handleActionTrigger);
  }, [sessionId]);

  const sendMessage = async (text, isVoice = false) => {
    if (!text.trim()) return;

    const userMsg = { id: uuidv4(), role: 'user', content: text, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await axios.post('/api/chat/message', { message: text, sessionId });

      const assistantMsg = {
        id: uuidv4(),
        role: 'assistant',
        content: data.response,
        action: data.action,
        reasoning: data.reasoning,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Talk back if voice input was used
      if (isVoice) {
        speakText(data.response);
      }
    } catch (err) {
      const errorMsg = {
        id: uuidv4(),
        role: 'assistant',
        content: 'I apologize, sir. I encountered an error processing your request. Systems may require authentication.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
    setLoading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input, false);
  };

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div
      className="glass-panel flex flex-col mr-2 mb-2"
      style={{
        width: '380px',
        flexShrink: 0,
        borderRadius: '8px',
        borderLeft: '1px solid rgba(0, 212, 255, 0.1)',
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(0,212,255,0.1)' }}>
        <Sparkles size={16} style={{ color: 'var(--color-jarvis-cyan)' }} />
        <span className="text-xs tracking-widest font-semibold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-jarvis-cyan)' }}>
          VERITAS AI CHAT
        </span>
        <div className="flex-1" />
        {voices.length > 0 && (
          <select
            value={selectedVoiceName}
            onChange={(e) => setSelectedVoiceName(e.target.value)}
            className="px-1.5 py-0.5 text-[8px] mr-1 bg-slate-950 border border-cyan-500/20 text-cyan-400 cursor-pointer rounded outline-none"
            style={{ maxWidth: '80px', fontFamily: 'var(--font-mono)' }}
            title="Select Veritas voice profile"
          >
            {voices.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name.replace(/Microsoft|Google|Natural/g, '').trim().slice(0, 12)}
              </option>
            ))}
          </select>
        )}
        <button 
          type="button"
          onClick={() => {
            const nextMuted = !isMuted;
            setIsMuted(nextMuted);
            if (nextMuted && window.speechSynthesis) {
              window.speechSynthesis.cancel();
            }
            toast.success(nextMuted ? 'Muted speech synthesis' : 'Speech synthesis enabled');
          }}
          className="glow-btn p-1 mr-1 flex items-center justify-center cursor-pointer"
          style={{ width: '22px', height: '22px' }}
          title={isMuted ? 'Unmute Veritas voice' : 'Mute Veritas voice'}
        >
          {isMuted ? <VolumeX size={10} style={{ color: '#FF4444' }} /> : <Volume2 size={10} style={{ color: 'var(--color-jarvis-cyan)' }} />}
        </button>
        {isListening && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-[10px] tracking-wider"
            style={{ color: '#FF4444', fontFamily: 'var(--font-heading)' }}
          >
            ● LISTENING
          </motion.span>
        )}
        <div className="w-2 h-2 rounded-full pulse-dot" style={{ background: isListening ? '#FF4444' : 'var(--color-matrix-green)' }} />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 0 }}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full opacity-30">
            <Sparkles size={28} style={{ color: 'var(--color-jarvis-cyan)' }} className="mb-3" />
            <p className="text-xs text-center" style={{ color: 'var(--color-text-secondary)' }}>
              How can I assist you today?
            </p>
            {isSupported && (
              <p className="text-[10px] text-center mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                🎙️ Click the mic to speak
              </p>
            )}
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className="max-w-[85%] px-3 py-2 rounded-lg text-xs leading-relaxed"
                style={{
                  background: msg.role === 'user'
                    ? 'rgba(0, 212, 255, 0.1)'
                    : 'rgba(0, 10, 20, 0.6)',
                  border: `1px solid ${msg.role === 'user' ? 'rgba(0,212,255,0.2)' : 'rgba(0,212,255,0.08)'}`,
                  color: msg.role === 'user' ? 'var(--color-text-primary)' : 'var(--color-jarvis-cyan)',
                }}
              >
                {msg.role === 'assistant' && !typingComplete[msg.id] ? (
                  <TypewriterText
                    text={msg.content}
                    onComplete={() => setTypingComplete((prev) => ({ ...prev, [msg.id]: true }))}
                  />
                ) : (
                  msg.content
                )}

                {/* Agent Reasoning Chain */}
                {msg.role === 'assistant' && msg.reasoning && (
                  <AgentReasoning logs={msg.reasoning} />
                )}

                {/* RLHF Feedback Buttons */}
                {msg.role === 'assistant' && (
                  <div className="mt-2 flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity border-t border-cyan-500/5 pt-1.5">
                    <button 
                      type="button" 
                      onClick={() => handleRateMessage(msg.content, 'like')}
                      className="cursor-pointer hover:text-green-400 transition-colors"
                      title="Good response"
                    >
                      <ThumbsUp size={10} style={{ color: ratings[msg.content] === 'like' ? '#10b981' : undefined }} />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleRateMessage(msg.content, 'dislike')}
                      className="cursor-pointer hover:text-red-400 transition-colors"
                      title="Bad response"
                    >
                      <ThumbsDown size={10} style={{ color: ratings[msg.content] === 'dislike' ? '#ef4444' : undefined }} />
                    </button>
                  </div>
                )}

                {/* Action Badge */}
                {msg.action && (
                  <div className="mt-2 px-2 py-1 rounded text-[10px] flex items-center gap-1" style={{ background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.2)', color: 'var(--color-matrix-green)' }}>
                    {msg.action.message}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing Indicator */}
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="px-3 py-2 rounded-lg" style={{ background: 'rgba(0,10,20,0.6)', border: '1px solid rgba(0,212,255,0.08)' }}>
              <div className="flex items-center gap-1">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="px-3 py-2 flex flex-wrap gap-1.5" style={{ borderTop: '1px solid rgba(0,212,255,0.05)' }}>
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            onClick={() => sendMessage(action.message)}
            className="glow-btn text-[9px] px-2 py-1"
            disabled={loading}
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Voice Waveform Indicator */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-2 flex items-center justify-center gap-1"
            style={{ borderTop: '1px solid rgba(255, 68, 68, 0.2)', background: 'rgba(255, 68, 68, 0.03)' }}
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <motion.div
                key={i}
                className="rounded-full"
                style={{
                  width: '3px',
                  background: '#FF4444',
                }}
                animate={{
                  height: [8, 20 + Math.random() * 12, 8],
                }}
                transition={{
                  duration: 0.5 + Math.random() * 0.3,
                  repeat: Infinity,
                  delay: i * 0.1,
                  ease: 'easeInOut',
                }}
              />
            ))}
            <span className="text-[10px] ml-2 tracking-wider" style={{ color: '#FF4444', fontFamily: 'var(--font-heading)' }}>
              Speak now...
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 flex gap-2" style={{ borderTop: '1px solid rgba(0,212,255,0.1)' }}>
        <input
          className="jarvis-input flex-1"
          placeholder={isListening ? '🎙️ Listening...' : 'Talk to Veritas AI...'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading || isListening}
        />
        <button type="submit" className="glow-btn glow-btn-primary p-2" disabled={loading || !input.trim() || isListening}>
          <Send size={16} />
        </button>
        <motion.button
          type="button"
          className="glow-btn p-2"
          onClick={handleVoiceToggle}
          disabled={!isSupported || loading}
          whileTap={{ scale: 0.9 }}
          style={{
            borderColor: isListening ? '#FF4444' : undefined,
            color: isListening ? '#FF4444' : undefined,
            background: isListening ? 'rgba(255, 68, 68, 0.1)' : undefined,
            boxShadow: isListening ? '0 0 20px rgba(255, 68, 68, 0.3)' : undefined,
            opacity: isSupported ? 1 : 0.3,
          }}
          title={!isSupported ? 'Voice input not supported in this browser' : isListening ? 'Stop listening' : 'Start voice input'}
        >
          {isListening ? (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <MicOff size={16} />
            </motion.div>
          ) : (
            <Mic size={16} />
          )}
        </motion.button>
      </form>
    </div>
  );
}
