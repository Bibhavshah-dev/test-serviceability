import crypto from 'crypto';

/**
 * Generate HMAC signature for a payload
 * @param {Object|String} payload - Data to sign
 * @param {String} secret - HMAC secret key
 * @returns {String} HMAC signature in hex format
 */
export function generateHMAC(payload, secret) {
  const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');
}

/**
 * Verify HMAC signature
 * @param {Object|String} payload - Data that was signed
 * @param {String} signature - HMAC signature to verify
 * @param {String} secret - HMAC secret key
 * @returns {Boolean} True if signature is valid
 */
export function verifyHMAC(payload, signature, secret) {
  const expectedSignature = generateHMAC(payload, secret);
  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Middleware to verify HMAC on incoming requests
 * Expects X-HMAC-Signature header with the signature
 * and X-HMAC-Timestamp header with the timestamp
 */
export function verifyHMACMiddleware(secret) {
  return (req, res, next) => {
    // Skip HMAC verification for GET requests (no sensitive data sent)
    if (req.method === 'GET') {
      return next();
    }

    const signature = req.headers['x-hmac-signature'];
    const timestamp = req.headers['x-hmac-timestamp'];

    if (!signature || !timestamp) {
      console.warn('⚠️  HMAC verification failed: Missing signature or timestamp headers');
      return res.status(401).json({
        success: false,
        error: 'HMAC authentication required',
        message: 'Missing X-HMAC-Signature or X-HMAC-Timestamp header'
      });
    }

    // Check timestamp to prevent replay attacks (5 minute window)
    const requestTime = parseInt(timestamp, 10);
    const currentTime = Date.now();
    const timeDiff = Math.abs(currentTime - requestTime);
    const MAX_TIME_DIFF = 5 * 60 * 1000; // 5 minutes

    if (timeDiff > MAX_TIME_DIFF) {
      console.warn('⚠️  HMAC verification failed: Timestamp too old');
      return res.status(401).json({
        success: false,
        error: 'Request expired',
        message: 'Timestamp is too old or in the future'
      });
    }

    // Create payload to verify (body + timestamp)
    const payload = {
      body: req.body,
      timestamp: timestamp
    };

    try {
      const isValid = verifyHMAC(payload, signature, secret);

      if (!isValid) {
        console.warn('⚠️  HMAC verification failed: Invalid signature');
        return res.status(401).json({
          success: false,
          error: 'Invalid HMAC signature',
          message: 'Request signature verification failed'
        });
      }

      console.log('✅ HMAC verification successful');
      next();
    } catch (error) {
      console.error('❌ HMAC verification error:', error);
      return res.status(500).json({
        success: false,
        error: 'HMAC verification error',
        message: error.message
      });
    }
  };
}

/**
 * Add HMAC signature to response
 * @param {Object} data - Response data to sign
 * @param {String} secret - HMAC secret key
 * @returns {Object} Response with HMAC metadata
 */
export function signResponse(data, secret) {
  const timestamp = Date.now().toString();
  const payload = {
    data,
    timestamp
  };
  const signature = generateHMAC(payload, secret);

  return {
    data,
    hmac: {
      signature,
      timestamp
    }
  };
}

