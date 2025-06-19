// server/index.js
// This file sets up a simple Node.js Express server to proxy API.Bible requests,
// securing your API key by keeping it on the server-side.

// Load environment variables from .env file
require('dotenv').config();
const express = require('express');
const cors = require('cors');
// node-fetch is used for making HTTP requests in Node.js,
// similar to the browser's native fetch API.
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3001; // Server will run on port 3001

// Enable CORS for all origins. In production, you might want to restrict this
// to only your frontend's domain (e.g., cors({ origin: 'http://localhost:5173' }))
app.use(cors());
app.use(express.json()); // Enable JSON body parsing for POST requests if needed (not directly used here but good practice)

// Retrieve API key from environment variables (from .env file)
const API_BIBLE_KEY = process.env.API_BIBLE_KEY;
const API_BASE_URL = 'https://api.scripture.api.bible/v1';

// Middleware to check for API key
app.use((req, res, next) => {
  if (!API_BIBLE_KEY) {
    console.error("API_BIBLE_KEY is not set in environment variables.");
    return res.status(500).json({ error: "Server configuration error: API Key missing." });
  }
  next();
});

// Generic proxy endpoint for API.Bible
// It will forward all requests to API.Bible, adding the API key securely.
// FIX: Using app.use('/api', ...) to handle all requests starting with /api
// This is a more robust way to capture arbitrary paths for proxying.
app.use('/api', async (req, res) => {
  // req.originalUrl contains the full URL path before routing (e.g., /api/bibles)
  // We need to remove the /api prefix to get the path for the external API
  const apiPath = req.originalUrl.substring('/api'.length); // Extracts '/bibles' or '/bibles/xyz/books' etc.

  // Reconstruct the full URL to the external API.Bible service
  // Note: req.query already contains parsed query parameters from the original request
  const targetUrl = `${API_BASE_URL}${apiPath}?${new URLSearchParams(req.query).toString()}`;
  console.log(`Proxying request to: ${targetUrl}`);

  try {
    const response = await fetch(targetUrl, {
      method: req.method, // Forward the original HTTP method (GET, POST, etc.)
      headers: {
        'api-key': API_BIBLE_KEY, // Inject API key securely on the server
        'Content-Type': req.headers['content-type'] || 'application/json',
        // Copy other relevant headers from the incoming request if needed
      },
      // If handling POST/PUT/PATCH, you would forward the request body here
      // For now, we only expect GET, but adding for completeness:
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });

    // Check if the API.Bible response was successful
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error from API.Bible (${response.status}): ${errorText}`);
      // Forward API.Bible's error status and message directly to the frontend
      return res.status(response.status).send(errorText);
    }

    const data = await response.json();
    res.json(data); // Send API.Bible's successful response back to the frontend
  } catch (error) {
    console.error('Proxy request failed:', error);
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
