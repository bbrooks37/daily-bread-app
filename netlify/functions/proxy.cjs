// netlify/functions/proxy.cjs
// This file implements a Netlify Function that acts as a secure proxy
// for API.Bible requests. The API key is stored as an environment variable
// within Netlify, preventing its exposure in client-side code.

const fetch = require('node-fetch');

const API_BASE_URL = 'https://api.scripture.api.bible/v1';

exports.handler = async (event, context) => {
  const API_BIBLE_KEY = process.env.API_BIBLE_KEY;

  // Debugging: Log the API key presence
  console.log(`[Netlify Function Debug] API_BIBLE_KEY loaded: ${!!API_BIBLE_KEY}`);

  if (!API_BIBLE_KEY) {
    console.error("Netlify Function Error: API_BIBLE_KEY is not set in environment variables.");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Serverless function configuration error: API Key missing." }),
    };
  }

  // Debugging: Log the incoming event path details
  console.log(`[Netlify Function Debug] event.path: ${event.path}`);
  console.log(`[Netlify Function Debug] event.httpMethod: ${event.httpMethod}`);
  console.log(`[Netlify Function Debug] event.queryStringParameters: ${JSON.stringify(event.queryStringParameters)}`);

  // FIX: Directly remove the /api prefix from event.path, as per observed log.
  // If event.path is /api/bibles, apiPath should become /bibles.
  // Using replace with a regex to ensure it only matches at the start of the string.
  let apiPath = event.path.replace(/^\/api/, '');

  // Ensure apiPath starts with a slash if it's empty or doesn't already start with one
  // (e.g., if event.path was just '/api', apiPath would become '').
  if (!apiPath.startsWith('/')) {
      apiPath = `/${apiPath}`;
  }

  const queryString = new URLSearchParams(event.queryStringParameters).toString();
  const targetUrl = `${API_BASE_URL}${apiPath}${queryString ? `?${queryString}` : ''}`;

  console.log(`[Netlify Function] Proxying to: ${targetUrl}`); // Debugging: Log the final target URL

  try {
    const response = await fetch(targetUrl, {
      method: event.httpMethod,
      headers: {
        'api-key': API_BIBLE_KEY,
        'Content-Type': event.headers['content-type'] || 'application/json',
      },
      // Ensure body is handled correctly for non-GET/HEAD requests
      // Netlify Function event.body is already a string, so no need for JSON.stringify(JSON.parse(event.body))
      body: event.body && event.httpMethod !== 'GET' && event.httpMethod !== 'HEAD' ? event.body : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API_BIBLE_ERROR] Error from API.Bible (${response.status} ${response.statusText}): ${errorText}`);
      return {
        statusCode: response.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: errorText || "Error from external API" }),
      };
    }

    const data = await response.json();
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
