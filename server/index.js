// server/index.js
// This file sets up a simple Node.js Express server to proxy API.Bible requests,
// securing your API key by keeping it on the server-side.

// Load environment variables from .env file
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3001; // Server will run on port 3001

app.use(cors());
app.use(express.json());

const API_BIBLE_KEY = process.env.API_BIBLE_KEY;
const API_BASE_URL = 'https://api.scripture.api.bible/v1';

// Debugging: Log the API key when the server starts
console.log(`[SERVER_START] Loaded API_BIBLE_KEY: ${API_BIBLE_KEY ? '****** (key loaded)' : '!!! KEY NOT LOADED !!!'}`);

// Middleware to check for API key
app.use((req, res, next) => {
  if (!API_BIBLE_KEY) {
    console.error("[PROXY_ERROR] API_BIBLE_KEY is not set in environment variables.");
    return res.status(500).json({ error: "Server configuration error: API Key missing." });
  }
  next();
});

// Generic proxy endpoint for API.Bible
app.use('/api', async (req, res) => {
  const apiPath = req.originalUrl.substring('/api'.length);
  const targetUrl = `${API_BASE_URL}${apiPath}?${new URLSearchParams(req.query).toString()}`;
  console.log(`[PROXY_REQUEST] Proxying to: ${targetUrl}`); // Debugging: Log the target URL

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'api-key': API_BIBLE_KEY,
        'Content-Type': req.headers['content-type'] || 'application/json',
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API_BIBLE_ERROR] Error from API.Bible (${response.status} ${response.statusText}): ${errorText}`); // Debugging: More detailed error
      // Check for specific API.Bible error messages if possible
      if (response.status === 401 || response.status === 403) {
        return res.status(401).json({ error: "Unauthorized: API Key might be invalid or missing permissions." });
      }
      return res.status(response.status).send(errorText);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('[PROXY_CATCH_ERROR] Proxy request failed:', error); // Debugging: Catch all errors
    res.status(500).json({ error: 'Failed to proxy request to API.Bible' });
  }
});

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('Proxy server is healthy');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
  console.log(`Access it at http://localhost:${PORT}`);
});
