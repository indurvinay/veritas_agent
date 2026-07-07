import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import * as gmailAgent from '../agents/gmailAgent.js';
import * as driveAgent from '../agents/driveAgent.js';
import * as calendarAgent from '../agents/calendarAgent.js';
import { isDemo } from '../auth/googleAuth.js';
import { mockEmails, mockFiles, mockEvents } from '../utils/mockStore.js';

const router = Router();

// GET /api/search — Global search across Gmail, Drive, and Calendar
router.get('/', async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length === 0) {
    return res.status(400).json({ error: 'Missing search query parameter: q' });
  }

  const query = q.trim().toLowerCase();

  try {
    if (isDemo()) {
      // Mock Search
      const emails = mockEmails.filter(
        (e) =>
          (e.subject || '').toLowerCase().includes(query) ||
          (e.snippet || '').toLowerCase().includes(query) ||
          (e.body || '').toLowerCase().includes(query)
      );

      const files = mockFiles.filter(
        (f) =>
          (f.name || '').toLowerCase().includes(query)
      );

      const events = mockEvents.filter(
        (ev) =>
          (ev.summary || '').toLowerCase().includes(query) ||
          (ev.description || '').toLowerCase().includes(query)
      );

      return res.json({
        success: true,
        results: {
          emails: emails.slice(0, 5),
          files: files.slice(0, 5),
          events: events.slice(0, 5),
        },
        counts: {
          emails: emails.length,
          files: files.length,
          events: events.length,
        },
      });
    }

    // Real API Search (using Promise.allSettled for maximum stability)
    const [emailsResult, filesResult, eventsResult] = await Promise.allSettled([
      // Gmail search: List last 30 emails and search locally (standard Gmail API queries are slow; local filter is fast)
      gmailAgent.fetchEmails(30).then((emails) =>
        emails.filter(
          (e) =>
            (e.subject || '').toLowerCase().includes(query) ||
            (e.snippet || '').toLowerCase().includes(query) ||
            (e.body || '').toLowerCase().includes(query)
        )
      ),
      // Drive search: call Google Drive query
      driveAgent.searchFiles(query),
      // Calendar search: List upcoming 30 events and search locally
      calendarAgent.getUpcomingEvents(30).then((events) =>
        events.filter(
          (ev) =>
            (ev.summary || '').toLowerCase().includes(query) ||
            (ev.description || '').toLowerCase().includes(query)
        )
      ),
    ]);

    const emails = emailsResult.status === 'fulfilled' ? emailsResult.value : [];
    const files = filesResult.status === 'fulfilled' ? filesResult.value : [];
    const events = eventsResult.status === 'fulfilled' ? eventsResult.value : [];

    res.json({
      success: true,
      results: {
        emails: emails.slice(0, 5),
        files: files.slice(0, 5),
        events: events.slice(0, 5),
      },
      counts: {
        emails: emails.length,
        files: files.length,
        events: events.length,
      },
    });
  } catch (err) {
    console.error('Global search error:', err.message);
    res.status(500).json({ error: 'Global search failed', details: err.message });
  }
});

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// POST /api/search/rag — Knowledge Base RAG retrieval
router.post('/rag', async (req, res) => {
  const { q } = req.body;
  if (!q || q.trim().length === 0) {
    return res.status(400).json({ error: 'Missing search query parameter: q' });
  }

  const query = q.trim().toLowerCase();
  const queryWords = query.split(/\s+/);

  try {
    let emails = [];
    let files = [];
    let events = [];

    // 1. Retrieve raw data matches
    if (isDemo()) {
      emails = mockEmails.filter(
        (e) =>
          (e.subject || '').toLowerCase().includes(query) ||
          (e.snippet || '').toLowerCase().includes(query) ||
          (e.body || '').toLowerCase().includes(query)
      );
      files = mockFiles.filter((f) => (f.name || '').toLowerCase().includes(query));
      events = mockEvents.filter(
        (ev) =>
          (ev.summary || '').toLowerCase().includes(query) ||
          (ev.description || '').toLowerCase().includes(query)
      );
    } else {
      const [emailsResult, filesResult, eventsResult] = await Promise.allSettled([
        gmailAgent.fetchEmails(30).then((list) =>
          list.filter(
            (e) =>
              (e.subject || '').toLowerCase().includes(query) ||
              (e.snippet || '').toLowerCase().includes(query) ||
              (e.body || '').toLowerCase().includes(query)
          )
        ),
        driveAgent.searchFiles(query),
        calendarAgent.getUpcomingEvents(30).then((list) =>
          list.filter(
            (ev) =>
              (ev.summary || '').toLowerCase().includes(query) ||
              (ev.description || '').toLowerCase().includes(query)
          )
        ),
      ]);
      emails = emailsResult.status === 'fulfilled' ? emailsResult.value : [];
      files = filesResult.status === 'fulfilled' ? filesResult.value : [];
      events = eventsResult.status === 'fulfilled' ? eventsResult.value : [];
    }

    // 2. Format documents and calculate similarity scores
    const items = [];

    emails.forEach((e, idx) => {
      const text = `${e.subject} ${e.snippet} ${e.body || ''}`.toLowerCase();
      let matchCount = 0;
      queryWords.forEach((word) => {
        if (text.includes(word)) matchCount++;
      });
      const score = Math.round((matchCount / queryWords.length) * 100);
      items.push({
        id: `email-${idx}`,
        type: 'Email',
        title: e.subject || 'No Subject',
        snippet: e.snippet || 'No preview available',
        source: e.from || 'Unknown Sender',
        score: Math.max(score, 45),
        metadata: { date: e.date }
      });
    });

    files.forEach((f, idx) => {
      const text = (f.name || '').toLowerCase();
      let matchCount = 0;
      queryWords.forEach((word) => {
        if (text.includes(word)) matchCount++;
      });
      const score = Math.round((matchCount / queryWords.length) * 100);
      items.push({
        id: `file-${idx}`,
        type: 'File',
        title: f.name || 'Untitled Document',
        snippet: `Google Drive file (${f.mimeType || 'unknown type'})`,
        source: 'Google Drive',
        score: Math.max(score, 50),
        metadata: { size: f.size }
      });
    });

    events.forEach((ev, idx) => {
      const text = `${ev.summary} ${ev.description || ''}`.toLowerCase();
      let matchCount = 0;
      queryWords.forEach((word) => {
        if (text.includes(word)) matchCount++;
      });
      const score = Math.round((matchCount / queryWords.length) * 100);
      items.push({
        id: `event-${idx}`,
        type: 'Event',
        title: ev.summary || 'Untitled Event',
        snippet: ev.description || 'No description',
        source: 'Google Calendar',
        score: Math.max(score, 40),
        metadata: { start: ev.start }
      });
    });

    items.sort((a, b) => b.score - a.score);
    const topItems = items.slice(0, 6);

    // 3. Construct RAG Context
    let contextText = '';
    topItems.forEach((item, index) => {
      contextText += `[Doc ${index + 1}] Type: ${item.type} | Title: ${item.title} | Content: ${item.snippet} | Source: ${item.source}\n`;
    });

    let synthesizedAnswer = 'Sir, I could not retrieve any relevant matching documents inside your workspace to synthesize an answer.';

    if (topItems.length > 0) {
      try {
        const response = await ai.models.generateContent({
          model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
          contents: `You are Veritas AI, an advanced personal assistant. You are performing an AI Knowledge Retrieval (RAG) search.
Below are the retrieved workspace context matches for the query '${q}':
${contextText}

Synthesize a brief conversational answer (max 120 words) answering the query based on the context.
Reference/cite the documents where appropriate (e.g. "[Doc 1]", "[Doc 2]").
If the context does not contain enough info, state what you found but note that details are sparse. Do not make up info.`,
        });
        synthesizedAnswer = response.text || 'Sir, I compiled the workspace matches but could not generate a summary.';
      } catch (genErr) {
        console.error('RAG synthesis generation error:', genErr.message);
        synthesizedAnswer = 'Sir, I successfully retrieved matching workspace documents but my synthesis engine encountered an issue.';
      }
    }

    res.json({
      success: true,
      answer: synthesizedAnswer,
      results: topItems,
    });

  } catch (err) {
    console.error('RAG search error:', err.message);
    res.status(500).json({ error: 'RAG search failed', details: err.message });
  }
});

export default router;
