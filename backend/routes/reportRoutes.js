import { Router } from 'express';
import * as gmailAgent from '../agents/gmailAgent.js';
import * as calendarAgent from '../agents/calendarAgent.js';
import * as driveAgent from '../agents/driveAgent.js';
import * as memoryStore from '../memory/memoryStore.js';
import { isDemo } from '../auth/googleAuth.js';
import { mockEmails, mockFiles, mockEvents } from '../utils/mockStore.js';

const router = Router();

// GET /api/report/generate — Download custom HTML report
router.get('/generate', async (req, res) => {
  try {
    let emails = [];
    let files = [];
    let events = [];
    let facts = [];
    let actions = [];

    // 1. Gather Workspace data based on mode
    if (isDemo()) {
      emails = mockEmails.slice(0, 10);
      files = mockFiles.slice(0, 10);
      events = mockEvents.slice(0, 10);
    } else {
      try {
        emails = await gmailAgent.listEmails(10);
      } catch (err) {
        console.warn('Report: gmail list failed, fallback empty', err.message);
      }
      try {
        files = await driveAgent.listFiles(10);
      } catch (err) {
        console.warn('Report: drive list failed, fallback empty', err.message);
      }
      try {
        events = await calendarAgent.listEvents(10);
      } catch (err) {
        console.warn('Report: calendar list failed, fallback empty', err.message);
      }
    }

    try {
      facts = await memoryStore.getProfileFacts();
      actions = await memoryStore.getActions(10);
    } catch (err) {
      console.warn('Report: memory read failed', err.message);
    }

    // 2. Compute basic analytics
    const totalUnread = emails.filter(e => e.labelIds && e.labelIds.includes('UNREAD')).length;
    const spamCount = emails.filter(e => e.tag === 'SPAM').length;
    const realCount = emails.filter(e => e.tag === 'REAL').length;
    const jobCount = emails.filter(e => e.tag === 'JOB').length;

    // 3. Compile report date
    const reportDate = new Date().toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // 4. Generate the beautiful HTML layout with high-end cyberpunk-print styles
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Veritas AI — Workspace Executive Briefing</title>
  <style>
    :root {
      --bg-color: #030d16;
      --text-color: #e0f2fe;
      --accent-color: #00d4ff;
      --card-bg: rgba(3, 21, 37, 0.7);
      --border-color: rgba(0, 212, 255, 0.15);
      --danger-color: #ef4444;
      --success-color: #10b981;
    }

    body {
      background-color: var(--bg-color);
      color: var(--text-color);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 40px;
      line-height: 1.6;
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
    }

    header {
      border-bottom: 2px solid var(--accent-color);
      padding-bottom: 20px;
      margin-bottom: 40px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }

    .title-area h1 {
      margin: 0;
      font-size: 28px;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: var(--accent-color);
      text-shadow: 0 0 10px rgba(0, 212, 255, 0.3);
    }

    .title-area p {
      margin: 5px 0 0 0;
      font-size: 13px;
      opacity: 0.6;
    }

    .date-area {
      font-size: 12px;
      opacity: 0.8;
      text-align: right;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin-bottom: 40px;
    }

    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }

    .stat-card h3 {
      margin: 0;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      opacity: 0.7;
    }

    .stat-card .value {
      font-size: 32px;
      font-weight: bold;
      color: var(--accent-color);
      margin-top: 10px;
    }

    .section-title {
      font-size: 16px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: var(--accent-color);
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 8px;
      margin-top: 40px;
      margin-bottom: 20px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      background: var(--card-bg);
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }

    th, td {
      padding: 12px 15px;
      text-align: left;
      font-size: 12px;
    }

    th {
      background-color: rgba(0, 212, 255, 0.1);
      color: var(--accent-color);
      text-transform: uppercase;
      letter-spacing: 1px;
      border-bottom: 1px solid var(--border-color);
    }

    tr:not(:last-child) td {
      border-bottom: 1px solid rgba(0, 212, 255, 0.05);
    }

    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: bold;
    }

    .badge-real { background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); }
    .badge-job { background: rgba(0, 212, 255, 0.15); color: #00d4ff; border: 1px solid rgba(0, 212, 255, 0.3); }
    .badge-promo { background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); }
    .badge-spam { background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); }

    .fact-list {
      list-style-type: none;
      padding: 0;
      margin: 0;
    }

    .fact-list li {
      padding: 10px 15px;
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      margin-bottom: 10px;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .fact-list li::before {
      content: "◈";
      color: var(--accent-color);
    }

    /* Print Stylesheet for PDF rendering */
    @media print {
      body {
        background-color: #ffffff;
        color: #000000;
        padding: 20px;
      }
      .container {
        max-width: 100%;
      }
      header {
        border-bottom: 2px solid #000000;
      }
      .title-area h1 {
        color: #000000;
        text-shadow: none;
      }
      .stat-card {
        background: #ffffff;
        border: 1px solid #000000;
        color: #000000;
        box-shadow: none;
      }
      .stat-card .value {
        color: #000000;
      }
      .section-title {
        color: #000000;
        border-bottom: 1px solid #000000;
      }
      table {
        background: #ffffff;
        color: #000000;
        box-shadow: none;
        border: 1px solid #000000;
      }
      th {
        background-color: #f3f4f6;
        color: #000000;
        border-bottom: 1px solid #000000;
      }
      .badge {
        border: 1px solid #000000 !important;
        background: transparent !important;
        color: #000000 !important;
      }
      .fact-list li {
        background: #ffffff;
        border: 1px solid #000000;
        color: #000000;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="title-area">
        <h1>Veritas AI Briefing</h1>
        <p>Unified Workspace Intel Report</p>
      </div>
      <div class="date-area">
        <strong>Generated On:</strong><br>
        ${reportDate}
      </div>
    </header>

    <div class="stats-grid">
      <div class="stat-card">
        <h3>Unread Email Priority</h3>
        <div class="value">${totalUnread}</div>
      </div>
      <div class="stat-card">
        <h3>Career / Job Opportunities</h3>
        <div class="value">${jobCount}</div>
      </div>
      <div class="stat-card">
        <h3>Inbox Spam Filtered</h3>
        <div class="value">${spamCount}</div>
      </div>
      <div class="stat-card">
        <h3>Personal Messages</h3>
        <div class="value">${realCount}</div>
      </div>
    </div>

    <!-- Calendar Events Section -->
    <div class="section-title">📅 Upcoming Schedule & Agenda</div>
    <table>
      <thead>
        <tr>
          <th>Summary</th>
          <th>Start Time</th>
          <th>End Time</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        ${events.length === 0 
          ? '<tr><td colspan="4" style="text-align:center;">No upcoming schedule bookings detected.</td></tr>'
          : events.map(e => `
            <tr>
              <td><strong>${e.summary || 'No Title'}</strong></td>
              <td>${e.start ? new Date(e.start.dateTime || e.start.date).toLocaleString() : '—'}</td>
              <td>${e.end ? new Date(e.end.dateTime || e.end.date).toLocaleString() : '—'}</td>
              <td>${e.description || '—'}</td>
            </tr>
          `).join('')
        }
      </tbody>
    </table>

    <!-- Gmail Emails Section -->
    <div class="section-title">✉️ Prioritized Workspace Correspondence</div>
    <table>
      <thead>
        <tr>
          <th>Sender</th>
          <th>Subject</th>
          <th>Classification</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        ${emails.length === 0 
          ? '<tr><td colspan="4" style="text-align:center;">No recent inbox communications found.</td></tr>'
          : emails.map(e => {
              const tagClass = `badge badge-${(e.tag || 'real').toLowerCase()}`;
              return `
                <tr>
                  <td>${e.from || 'Unknown'}</td>
                  <td><strong>${e.subject || 'No Subject'}</strong></td>
                  <td><span class="${tagClass}">${e.tag || 'REAL'}</span></td>
                  <td>${e.date ? new Date(e.date).toLocaleDateString() : '—'}</td>
                </tr>
              `;
            }).join('')
        }
      </tbody>
    </table>

    <!-- Stored facts section -->
    <div class="section-title">🧠 Stored Memory Profile Facts</div>
    ${facts.length === 0 
      ? '<p style="font-size:12px; opacity:0.6;">No profile facts have been recorded in the brain yet.</p>'
      : `<ul class="fact-list">
          ${facts.map(f => `<li>${f.fact || f}</li>`).join('')}
         </ul>`
    }

    <!-- Stored recent activities section -->
    <div class="section-title">⚙️ Recent Workspace Agent Actions Executed</div>
    <table>
      <thead>
        <tr>
          <th>Action Type</th>
          <th>Details</th>
          <th>Timestamp</th>
        </tr>
      </thead>
      <tbody>
        ${actions.length === 0 
          ? '<tr><td colspan="3" style="text-align:center;">No recent transactions logged in database.</td></tr>'
          : actions.map(a => `
            <tr>
              <td><span style="font-family: monospace; color: var(--accent-color);">${a.action || a.type}</span></td>
              <td>${a.details || a.message}</td>
              <td>${new Date(a.timestamp).toLocaleString()}</td>
            </tr>
          `).join('')
        }
      </tbody>
    </table>
  </div>
</body>
</html>`;

    res.setHeader('Content-Disposition', 'attachment; filename="Veritas_AI_Executive_Briefing.html"');
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    console.error('Report generation error:', err.message);
    res.status(500).json({ error: 'Failed to generate report', details: err.message });
  }
});

export default router;
