import CryptoJS from 'crypto-js';

// IMPORTANT: In production, this should come from a secure configuration
// For Shopify extensions, you might want to pass this from your backend
// or use Shopify's app settings API
const HMAC_SECRET = 'dummy-hmac-secret-key-for-development-only-replace-in-production';

/**
 * Generate HMAC signature for a payload
 * @param {Object|String} payload - Data to sign
 * @returns {String} HMAC signature in hex format
 */
export function generateHMAC(payload) {
  const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return CryptoJS.HmacSHA256(data, HMAC_SECRET).toString(CryptoJS.enc.Hex);
}

/**
 * Verify HMAC signature from server response
 * @param {Object} response - Response data from server
 * @returns {Object} Verification result with isValid and data
 */
export function verifyHMACResponse(response) {
  if (!response || !response.hmac || !response.data) {
    return {
      isValid: false,
      error: 'Missing HMAC data in response',
      data: null
    };
  }

  const { signature, timestamp } = response.hmac;
  const { data } = response;

  if (!signature || !timestamp) {
    return {
      isValid: false,
      error: 'Invalid HMAC structure',
      data: null
    };
  }

  // Check timestamp to prevent replay attacks (5 minute window)
  const requestTime = parseInt(timestamp, 10);
  const currentTime = Date.now();
  const timeDiff = Math.abs(currentTime - requestTime);
  const MAX_TIME_DIFF = 5 * 60 * 1000; // 5 minutes

  if (timeDiff > MAX_TIME_DIFF) {
    return {
      isValid: false,
      error: 'Response timestamp is too old or in the future',
      data: null
    };
  }

  // Recreate the payload that was signed
  const payload = {
    data,
    timestamp
  };

  // Calculate expected signature
  const expectedSignature = generateHMAC(payload);

  // Verify signature
  if (signature !== expectedSignature) {
    return {
      isValid: false,
      error: 'HMAC signature verification failed',
      data: null
    };
  }

  return {
    isValid: true,
    data,
    error: null
  };
}

/**
 * Create signed request payload for POST requests
 * @param {Object} requestData - Data to send in the request
 * @returns {Object} Object with body, headers containing HMAC signature
 */
export function createSignedRequest(requestData) {
  const timestamp = Date.now().toString();
  const payload = {
    body: requestData,
    timestamp
  };

  const signature = generateHMAC(payload);

  return {
    body: requestData,
    headers: {
      'Content-Type': 'application/json',
      'X-HMAC-Signature': signature,
      'X-HMAC-Timestamp': timestamp
    }
  };
}

/**
 * Fetch with HMAC verification
 * @param {String} url - URL to fetch
 * @param {Object} options - Fetch options (optional)
 * @returns {Promise} Promise resolving to verified data
 */
export async function fetchWithHMAC(url, options = {}) {
  try {
    // If it's a POST request with body, sign it
    if (options.method === 'POST' && options.body) {
      const bodyData = typeof options.body === 'string' 
        ? JSON.parse(options.body) 
        : options.body;
      
      const signedRequest = createSignedRequest(bodyData);
      options.body = JSON.stringify(signedRequest.body);
      options.headers = {
        ...options.headers,
        ...signedRequest.headers
      };
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();

    // Verify HMAC signature
    const verification = verifyHMACResponse(responseData);

    if (!verification.isValid) {
      throw new Error(`HMAC verification failed: ${verification.error}`);
    }

    return verification.data;
  } catch (error) {
    console.error('Fetch with HMAC error:', error);
    throw error;
  }
}

