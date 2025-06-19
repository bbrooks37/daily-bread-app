// netlify/functions/proxy.js
// This file implements a Netlify Function that acts as a secure proxy
// for API.Bible requests. The API key is stored as an environment variable
// within Netlify, preventing its exposure in client-side code.

// Require node-fetch for making HTTP requests in a Node.js environment.
// Netlify Functions run in Node.js.
const fetch = require('node-fetch');

// The API.Bible base URL
const API_BASE_URL = 'https://api.scripture.api.bible/v1';

// The Netlify Function handler function.
// It receives event (request details), context (lambda context), and callback.
exports.handler = async (event, context) => {
  // Retrieve API key from Netlify environment variables.
  // This is how you securely access secrets in Netlify Functions.
  const API_BIBLE_KEY = process.env.API_BIBLE_KEY;

  // Basic check for API key presence
  if (!API_BIBLE_KEY) {
    console.error("Netlify Function Error: API_BIBLE_KEY is not set in environment variables.");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Serverless function configuration error: API Key missing." }),
    };
  }

  // Extract the path from the request.
  // Netlify Functions map requests like /.netlify/functions/proxy/bibles
  // to this function. We want to extract 'bibles' or 'bibles/someId/books' etc.
  // The path will be something like '/.netlify/functions/proxy/bibles/...'
  const pathParts = event.path.split('/.netlify/functions/proxy');
  const apiPath = pathParts[1]; // Should give us '/bibles' or '/bibles/...'

  // Reconstruct the full URL to the external API.Bible service.
  // event.queryStringParameters contains the parsed query parameters.
  const queryString = new URLSearchParams(event.queryStringParameters).toString();
  const targetUrl = `${API_BASE_URL}${apiPath}${queryString ? `?${queryString}` : ''}`;

  console.log(`[Netlify Function] Proxying to: ${targetUrl}`);

  try {
    const response = await fetch(targetUrl, {
      method: event.httpMethod, // Forward the original HTTP method (GET, POST, etc.)
      headers: {
        'api-key': API_BIBLE_KEY, // Inject API key securely
        // Forward other relevant headers from the original request if necessary, e.g., Content-Type
        'Content-Type': event.headers['content-type'] || 'application/json',
      },
      // If the original request had a body (e.g., POST request), forward it.
      // Netlify Function's body is typically a string, so parse it if JSON.
      body: event.body && event.httpMethod !== 'GET' && event.httpMethod !== 'HEAD' ? JSON.stringify(JSON.parse(event.body)) : undefined,
    });

    // Check if the API.Bible response was successful
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API_BIBLE_ERROR] Error from API.Bible (${response.status} ${response.statusText}): ${errorText}`);
      // Return the error response from API.Bible directly to the client
      return {
        statusCode: response.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: errorText || "Error from external API" }),
      };
    }

    const data = await response.json();
    // Return the successful response from API.Bible to the client
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error('[Netlify Function Catch Error] Proxy request failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to proxy request via serverless function.' }),
    };
  }
};
