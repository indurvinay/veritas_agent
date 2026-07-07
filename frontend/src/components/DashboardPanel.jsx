import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Mail, Table, Activity, Sparkles, RefreshCw, BarChart2, PieChart, Info, FileText } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

export default function DashboardPanel() {
  const [generatingInsight, setGeneratingInsight] = useState(false);
  const [aiInsight, setAiInsight] = useState('');

  const handleDownloadReport = () => {
    toast.success('Compiling workspace metrics...');
    window.open('/api/report/generate', '_blank');
  };

  // 1. Fetch Gmail data
  const { data: gmailData, isLoading: loadingGmail, refetch: refetchGmail } = useQuery({
    queryKey: ['dashboardGmail'],
    queryFn: () => axios.get('/api/gmail/emails?max=50').then((r) => r.data),
    refetchOnWindowFocus: false,
  });

  // 2. Fetch Sheets data
  const { data: sheetsData, isLoading: loadingSheets, refetch: refetchSheets } = useQuery({
    queryKey: ['dashboardSheets'],
    queryFn: () => axios.get('/api/sheets/data').then((r) => r.data),
    refetchOnWindowFocus: false,
  });

  // 3. Fetch Activity Actions
  const { data: actionsData, isLoading: loadingActions, refetch: refetchActions } = useQuery({
    queryKey: ['dashboardActions'],
    queryFn: () => axios.get('/api/chat/actions?limit=50').then((r) => r.data),
    refetchOnWindowFocus: false,
  });

  // 4. Fetch Unread Gmail Count
  const { data: unreadData, isLoading: loadingUnread, refetch: refetchUnread } = useQuery({
    queryKey: ['dashboardUnread'],
    queryFn: () => axios.get('/api/gmail/unread').then((r) => r.data),
    refetchOnWindowFocus: false,
  });

  const handleRefreshAll = () => {
    refetchGmail();
    refetchSheets();
    refetchActions();
    refetchUnread();
    toast.success('Dashboard metrics refreshed!');
  };

  // Compile calculations
  const emails = gmailData?.emails || [];
  const totalEmails = emails.length;
  const unreadCount = unreadData?.unreadCount || 0;
  const sheetRows = sheetsData?.totalRows || 0;
  const totalActions = actionsData?.actions?.length || 0;

  // Calculate Gmail Category (Tag) counts
  const categoryStats = useMemo(() => {
    const stats = { JOB: 0, REAL: 0, PROMO: 0, SPAM: 0 };
    emails.forEach((e) => {
      const tag = e.tag || 'REAL';
      if (stats[tag] !== undefined) {
        stats[tag]++;
      } else {
        stats.REAL++; // fallback
      }
    });
    return stats;
  }, [emails]);

  // Calculate Top Senders
  const topSenders = useMemo(() => {
    const counts = {};
    emails.forEach((e) => {
      let from = e.from || 'Unknown';
      // Clean up sender format "Name <email>" to just "Name" or "email"
      if (from.includes('<')) {
        from = from.split('<')[0].trim();
      }
      counts[from] = (counts[from] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // top 5 senders
  }, [emails]);

  // Generate AI Insight via Gemini chat endpoint
  const generateAiInsight = async () => {
    setGeneratingInsight(true);
    setAiInsight('');
    const prompt = `Perform a high-level workspaces diagnostic briefing as Veritas AI.
Here is the user's workspace diagnostics summary:
- Inbox Size: ${totalEmails} recent emails
- Unread Mail Count: ${unreadCount} unread
- Google Sheet log rows: ${sheetRows} database entries
- Total Veritas AI Agent actions logged: ${totalActions}

Category distribution of emails:
- Job/Career inquiries: ${categoryStats.JOB}
- Real/Personal: ${categoryStats.REAL}
- Promotional/Newsletters: ${categoryStats.PROMO}
- Spam/Phishing: ${categoryStats.SPAM}

Top active senders:
${topSenders.map((s) => `- ${s.name}: ${s.count} emails`).join('\n')}

Based on these diagnostics, write a professional, concise Veritas AI summary of the user's inbox health, call out any potential highlights (e.g. lots of job opportunities or spam warning), and give a smart productivity recommendation. Call the user "sir" or "ma'am". Do not include any HTML or markdown formatting, just clean text.`;

    try {
      const { data } = await axios.post('/api/chat/message', { message: prompt });
      setAiInsight(data.response);
    } catch {
      setAiInsight('I apologize, sir. Connection to my core diagnostics processor was interrupted.');
    }
    setGeneratingInsight(false);
  };

  const maxSenderCount = useMemo(() => {
    return Math.max(...topSenders.map((s) => s.count), 1);
  }, [topSenders]);

  const suggestionCards = useMemo(() => {
    if (!aiInsight) return [];
    
    const lines = aiInsight.split('\n');
    const cards = [];
    
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('-') || trimmed.startsWith('*') || /^\d+\./.test(trimmed)) {
        const text = trimmed.replace(/^[-*\s]+|^\d+\.\s*/, '');
        if (text.length > 10) {
          let actionLabel = 'Consult AI';
          let actionCmd = `Execute plan for: ${text}`;
          let icon = '🤖';

          const lower = text.toLowerCase();
          if (lower.includes('email') || lower.includes('reply') || lower.includes('inbox') || lower.includes('draft')) {
            actionLabel = 'Compose Reply';
            actionCmd = 'Check unread emails and draft a priority response';
            icon = '✉️';
          } else if (lower.includes('schedule') || lower.includes('calendar') || lower.includes('meeting') || lower.includes('event')) {
            actionLabel = 'Open Calendar';
            actionCmd = 'List my calendar events for this week and check for conflicts';
            icon = '📅';
          } else if (lower.includes('file') || lower.includes('drive') || lower.includes('document')) {
            actionLabel = 'Check Files';
            actionCmd = 'List my Google Drive files and check for recent modifications';
            icon = '📁';
          } else if (lower.includes('sheet') || lower.includes('database') || lower.includes('log')) {
            actionLabel = 'View Sheets';
            actionCmd = 'Read my Google Sheet and check log counts';
            icon = '📊';
          }

          cards.push({ text, actionLabel, actionCmd, icon });
        }
      }
    });

    if (cards.length === 0 && aiInsight.length > 50) {
      cards.push({
        text: "Inbox health advisor: Filter promotions and clean spam records.",
        actionLabel: "Analyze Emails",
        actionCmd: "Check recent emails and check spam ratings",
        icon: "✉️"
      });
      cards.push({
        text: "Schedule coordinator: Check for calendar synchronization conflicts.",
        actionLabel: "Audit Calendar",
        actionCmd: "List today's events and report availability",
        icon: "📅"
      });
    }

    return cards.slice(0, 3);
  }, [aiInsight]);

  const handleTriggerAction = (cmd) => {
    toast.success('Routing command to Veritas AI...');
    window.dispatchEvent(new CustomEvent('veritas-chat-trigger', { detail: cmd }));
  };

  const isLoading = loadingGmail || loadingSheets || loadingActions || loadingUnread;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20 }}
      className="h-full flex flex-col gap-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center bg-cyan-950/20 border border-cyan-500/30"
            style={{ boxShadow: '0 0 12px rgba(0, 212, 255, 0.2)' }}
          >
            <Sparkles size={16} style={{ color: 'var(--color-jarvis-cyan)' }} />
          </div>
          <h2 className="text-lg tracking-widest font-semibold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-jarvis-cyan)' }}>
            DIAGNOSTICS & ANALYTICS
          </h2>
        </div>
        <div className="flex gap-2">
          <button 
            type="button"
            className="glow-btn text-[10px] flex items-center gap-1 cursor-pointer" 
            onClick={handleDownloadReport}
          >
            <FileText size={13} /> Generate Report
          </button>
          <button 
            type="button"
            className="glow-btn text-[10px] flex items-center gap-1 cursor-pointer" 
            onClick={handleRefreshAll} 
            disabled={isLoading}
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} /> Refresh All
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Unread Mail */}
        <div className="glass-panel p-4 flex items-center gap-4 relative overflow-hidden">
          <div className="p-3 rounded-lg bg-red-950/20 border border-red-500/30" style={{ color: '#EA433B' }}>
            <Mail size={20} />
          </div>
          <div>
            <p className="text-[10px] tracking-wider opacity-40 uppercase" style={{ fontFamily: 'var(--font-heading)' }}>Unread Emails</p>
            <p className="text-xl font-bold" style={{ color: '#FF3A3A' }}>{unreadCount}</p>
          </div>
          <div className="absolute right-2 bottom-2 text-[8px] opacity-25" style={{ fontFamily: 'var(--font-heading)' }}>GMAIL</div>
        </div>

        {/* Card 2: Total Emails */}
        <div className="glass-panel p-4 flex items-center gap-4 relative overflow-hidden">
          <div className="p-3 rounded-lg bg-yellow-950/20 border border-yellow-500/30" style={{ color: '#FBBC05' }}>
            <Mail size={20} />
          </div>
          <div>
            <p className="text-[10px] tracking-wider opacity-40 uppercase" style={{ fontFamily: 'var(--font-heading)' }}>Total Loaded</p>
            <p className="text-xl font-bold">{totalEmails}</p>
          </div>
          <div className="absolute right-2 bottom-2 text-[8px] opacity-25" style={{ fontFamily: 'var(--font-heading)' }}>RECENT</div>
        </div>

        {/* Card 3: Sheets Rows */}
        <div className="glass-panel p-4 flex items-center gap-4 relative overflow-hidden">
          <div className="p-3 rounded-lg bg-green-950/20 border border-green-500/30" style={{ color: '#34A853' }}>
            <Table size={20} />
          </div>
          <div>
            <p className="text-[10px] tracking-wider opacity-40 uppercase" style={{ fontFamily: 'var(--font-heading)' }}>Sheet Logs</p>
            <p className="text-xl font-bold" style={{ color: '#00FF88' }}>{sheetRows}</p>
          </div>
          <div className="absolute right-2 bottom-2 text-[8px] opacity-25" style={{ fontFamily: 'var(--font-heading)' }}>DATABASE</div>
        </div>

        {/* Card 4: Action Log Count */}
        <div className="glass-panel p-4 flex items-center gap-4 relative overflow-hidden">
          <div className="p-3 rounded-lg bg-purple-950/20 border border-purple-500/30" style={{ color: '#7B2FFF' }}>
            <Activity size={20} />
          </div>
          <div>
            <p className="text-[10px] tracking-wider opacity-40 uppercase" style={{ fontFamily: 'var(--font-heading)' }}>Agent Actions</p>
            <p className="text-xl font-bold" style={{ color: '#B080FF' }}>{totalActions}</p>
          </div>
          <div className="absolute right-2 bottom-2 text-[8px] opacity-25" style={{ fontFamily: 'var(--font-heading)' }}>MEM_STORE</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chart 1: Gmail Category Distribution (SVG Donut Chart) */}
        <div className="glass-panel p-5 flex flex-col">
          <h3 className="text-xs tracking-widest mb-4 flex items-center gap-2 font-semibold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-jarvis-cyan)' }}>
            <PieChart size={14} /> EMAIL CATEGORIES
          </h3>
          <div className="flex-1 flex items-center justify-around gap-4 py-4">
            {/* SVG Donut */}
            <div className="relative w-32 h-32">
              <svg width="100%" height="100%" viewBox="0 0 42 42" className="donut-chart">
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="rgba(0,212,255,0.05)" strokeWidth="4" />
                {/* Job Segment */}
                {totalEmails > 0 && (
                  <circle
                    cx="21"
                    cy="21"
                    r="15.915"
                    fill="transparent"
                    stroke="#7B2FFF"
                    strokeWidth="4"
                    strokeDasharray={`${(categoryStats.JOB / totalEmails) * 100} ${100 - (categoryStats.JOB / totalEmails) * 100}`}
                    strokeDashoffset="25"
                  />
                )}
                {/* Real Segment */}
                {totalEmails > 0 && (
                  <circle
                    cx="21"
                    cy="21"
                    r="15.915"
                    fill="transparent"
                    stroke="#00FF88"
                    strokeWidth="4"
                    strokeDasharray={`${(categoryStats.REAL / totalEmails) * 100} ${100 - (categoryStats.REAL / totalEmails) * 100}`}
                    strokeDashoffset={25 - (categoryStats.JOB / totalEmails) * 100}
                  />
                )}
                {/* Promo Segment */}
                {totalEmails > 0 && (
                  <circle
                    cx="21"
                    cy="21"
                    r="15.915"
                    fill="transparent"
                    stroke="#FFD700"
                    strokeWidth="4"
                    strokeDasharray={`${(categoryStats.PROMO / totalEmails) * 100} ${100 - (categoryStats.PROMO / totalEmails) * 100}`}
                    strokeDashoffset={25 - ((categoryStats.JOB + categoryStats.REAL) / totalEmails) * 100}
                  />
                )}
                {/* Spam Segment */}
                {totalEmails > 0 && (
                  <circle
                    cx="21"
                    cy="21"
                    r="15.915"
                    fill="transparent"
                    stroke="#FF3A3A"
                    strokeWidth="4"
                    strokeDasharray={`${(categoryStats.SPAM / totalEmails) * 100} ${100 - (categoryStats.SPAM / totalEmails) * 100}`}
                    strokeDashoffset={25 - ((categoryStats.JOB + categoryStats.REAL + categoryStats.PROMO) / totalEmails) * 100}
                  />
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-lg font-bold" style={{ color: 'var(--color-jarvis-cyan)' }}>{totalEmails}</span>
                <span className="text-[8px] opacity-40">EMAILS</span>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-2 text-[10px]">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#7B2FFF' }} />
                <span className="opacity-70">Job / Career ({categoryStats.JOB})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#00FF88' }} />
                <span className="opacity-70">Personal / Real ({categoryStats.REAL})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#FFD700' }} />
                <span className="opacity-70">Promotions ({categoryStats.PROMO})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#FF3A3A' }} />
                <span className="opacity-70">Spam ({categoryStats.SPAM})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chart 2: Top Senders (SVG Bar Chart) */}
        <div className="glass-panel p-5 flex flex-col">
          <h3 className="text-xs tracking-widest mb-4 flex items-center gap-2 font-semibold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-jarvis-cyan)' }}>
            <BarChart2 size={14} /> ACTIVE SENDERS
          </h3>
          <div className="flex-1 flex flex-col gap-3.5 justify-center">
            {topSenders.length === 0 ? (
              <p className="text-xs opacity-40 text-center py-8">No sender data available</p>
            ) : (
              topSenders.map((sender, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="truncate max-w-[80%] font-medium" style={{ color: 'var(--color-text-primary)' }}>{sender.name}</span>
                    <span className="opacity-50 font-semibold">{sender.count} mails</span>
                  </div>
                  {/* SVG Bar */}
                  <div className="h-2 w-full rounded bg-cyan-950/20 border border-cyan-500/10 overflow-hidden relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(sender.count / maxSenderCount) * 100}%` }}
                      transition={{ duration: 0.8, delay: idx * 0.1 }}
                      className="h-full rounded"
                      style={{
                        background: 'linear-gradient(90deg, var(--color-jarvis-cyan), var(--color-jarvis-purple))',
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* AI Diagnostic Insights Card */}
      <div className="glass-panel p-5 relative overflow-hidden">
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-20 text-[8px]" style={{ fontFamily: 'var(--font-heading)' }}>
          <Info size={10} /> AI ANALYSIS MODULE
        </div>
        <div className="flex items-center gap-3 mb-4">
          <Sparkles size={16} style={{ color: 'var(--color-jarvis-cyan)' }} />
          <h3 className="text-xs tracking-widest font-semibold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-jarvis-cyan)' }}>
            VERITAS AI WORKSPACE INSIGHTS
          </h3>
        </div>

        {aiInsight ? (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="text-xs leading-relaxed mb-4 glass-panel p-3 bg-cyan-950/5"
              style={{ color: 'var(--color-text-secondary)', border: '1px dashed rgba(0, 212, 255, 0.15)' }}
            >
              {aiInsight}
            </motion.div>

            {/* Actionable Suggestion Cards */}
            {suggestionCards.length > 0 && (
              <div className="mb-4 space-y-2">
                <p className="text-[9px] uppercase tracking-widest text-cyan-400 font-semibold mb-2">⚡ Actionable AI Recommendations</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {suggestionCards.map((card, idx) => (
                    <div 
                      key={idx} 
                      className="glass-panel p-3 bg-black/40 border-cyan-500/10 flex flex-col justify-between gap-2"
                      style={{ fontSize: '10px' }}
                    >
                      <div className="flex gap-2">
                        <span className="text-sm">{card.icon}</span>
                        <span className="text-slate-300 leading-normal">{card.text}</span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => handleTriggerAction(card.actionCmd)}
                        className="glow-btn glow-btn-primary py-1 text-[9px] w-full cursor-pointer text-center"
                      >
                        {card.actionLabel}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-xs opacity-50 mb-4">
            Sir, click below to initialize a full diagnostic scan of your workspace data. I will generate a comprehensive briefing, alert you of any issues, and suggest optimization strategies.
          </p>
        )}

        <button
          className="glow-btn glow-btn-primary text-xs py-2 px-4 flex items-center gap-2"
          onClick={generateAiInsight}
          disabled={generatingInsight || isLoading}
        >
          <Sparkles size={14} className={generatingInsight ? 'animate-pulse' : ''} />
          {generatingInsight ? 'Analyzing Subsystems...' : '⚡ Generate AI Workspace Insight'}
        </button>
      </div>
    </motion.div>
  );
}
