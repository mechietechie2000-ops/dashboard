// routes/localLLM.js
const express = require('express');
const router = express.Router();
require('dotenv').config();
// import 'dotenv/config';

// const OLLAMA_URL = process.env.OLLAMA_URL || 'http://macmini.tail146023.ts.net:11434';
// macmini.tail146023.ts.net

const MACHINE_NAME = process.env.MACHINE_NAME;
const OLLAMA_PORT = process.env.OLLAMA_PORT || 11434;

const OLLAMA_URL = process.env.OLLAMA_URL || `http://${MACHINE_NAME}:${OLLAMA_PORT}`;


router.post('/chat', async (req, res) => {
 // const { message, model = 'llama3.1:8b' } = req.body;
  const { message, model = 'qwen2.5:7b' } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'message is required' });
  }

  try {
    const ollamaRes = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: message,
        stream: false, // set true later if you want streaming
      }),
    });

    if (!ollamaRes.ok) {
      throw new Error(`Ollama responded ${ollamaRes.status}`);
    }

    const data = await ollamaRes.json();
    res.json({ reply: data.response });
  } catch (err) {
    console.error('Local LLM error:', err);
    res.status(502).json({ error: 'Failed to reach local LLM server' });
  }
});

module.exports = router;