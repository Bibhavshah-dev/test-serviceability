import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 4000;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;
const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;

if (!SHOPIFY_API_SECRET || !SHOPIFY_API_KEY) {
  console.error('❌ ERROR: Missing Shopify app credentials in environment variables!');
  console.error('Please set SHOPIFY_API_SECRET and SHOPIFY_API_KEY in web/.env');
  process.exit(1);
}

const app = express();
app.use('/webhooks', express.raw({ type: '*/*' }));

function verifyShopifyWebhook(secret) {
  return (req, res, next) => {
    try {
      const hmacHeader = req.get("X-Shopify-Hmac-Sha256");
      if (!hmacHeader) {
        console.error("Missing HMAC header");
        return res.status(401).send("Unauthorized");
      }

      const rawBody = req.body;
      const generatedHash = crypto
        .createHmac("sha256", secret)
        .update(rawBody, "utf8")
        .digest("base64");

      const isValid = crypto.timingSafeEqual(
        Buffer.from(generatedHash),
        Buffer.from(hmacHeader)
      );

      if (!isValid) {
        console.error("Webhook HMAC validation failed");
        return res.status(401).send("Unauthorized");
      }

      req.body = JSON.parse(rawBody.toString("utf8"));
      next();

    } catch (error) {
      console.error("Error verifying webhook:", error);
      res.status(400).send("Invalid Webhook");
    }
  };
}

// Enhanced CORS for Shopify App Proxy through ngrok tunnel
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Additional CORS headers for App Proxy compatibility
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json());

// App Proxy signature verification
function verifyAppProxy(req) {
  const { signature, ...rest } = req.query || {};
  if (!signature) return false;
  const sorted = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${rest[k]}`)
    .join('');
  const expected = crypto
    .createHmac('sha256', SHOPIFY_API_SECRET)
    .update(sorted)
    .digest('hex');
  return signature === expected;
}

app.use('/proxy', (req, res, next) => {
  console.log('\n====================================');
  console.log('📥 APP PROXY REQUEST RECEIVED');
  console.log('====================================');
  console.log('Method:', req.method);
  console.log('Path:', req.path);
  console.log('Full URL:', req.url);
  console.log('\n🔍 Query Parameters:');
  console.log(JSON.stringify(req.query, null, 2));
  console.log('\n📨 Headers:');
  console.log('  Origin:', req.get('origin') || 'none');
  console.log('  Referer:', req.get('referer') || 'none');
  console.log('  User-Agent:', req.get('user-agent') || 'none');
  console.log('====================================\n');

  if (!verifyAppProxy(req)) {
    console.warn('❌ App Proxy signature verification FAILED');
    console.warn('   Signature received:', req.query?.signature);
    console.warn('   Shop param:', req.query?.shop);
    console.warn('   Timestamp:', req.query?.timestamp);

    // Return detailed error for debugging
    return res.status(401).json({
      success: false,
      error: 'Invalid app proxy signature',
      debug: {
        receivedShop: req.query?.shop,
        receivedSignature: req.query?.signature,
        hasTimestamp: !!req.query?.timestamp,
        allParams: Object.keys(req.query)
      }
    });
  }

  req.shopDomain = req.query?.shop;
  console.log(`✅ App Proxy signature VERIFIED for shop: ${req.shopDomain}\n`);
  next();
});

app.post(
  "/webhooks",
  verifyShopifyWebhook(process.env.SHOPIFY_API_SECRET),
  (req, res) => {
    console.log("Verified webhook:", req.body);
    res.status(200).send("OK");
  }
);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Shopify App Backend with External API Integration (App Proxy Only)'
  });
});

// TEMPORARY: Dev-only endpoint (bypasses signature verification for testing)
// ⚠️ REMOVE BEFORE PRODUCTION!
app.get('/dev/external-data', async (req, res) => {
  try {
    console.log('⚠️ DEV ENDPOINT CALLED (no auth) - REMOVE IN PRODUCTION!');

    const response = await fetch('https://jsonplaceholder.typicode.com/users/1');

    if (!response.ok) {
      throw new Error(`External API responded with status: ${response.status}`);
    }

    const data = await response.json();

    res.json({
      success: true,
      source: 'JSONPlaceholder API',
      endpoint: 'https://jsonplaceholder.typicode.com/users/1',
      timestamp: new Date().toISOString(),
      warning: '⚠️ DEV MODE - No authentication!',
      data: data
    });

  } catch (error) {
    console.error('Error calling external API:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// TEMPORARY: Dev-only serviceability endpoint (no auth for testing)
// ⚠️ REMOVE BEFORE PRODUCTION!
app.post('/dev/check-serviceability', async (req, res) => {
  try {
    const { postalCode, city, address1, address2, province, country, shop } = req.body;
    console.log('\n====================================');
    console.log('🧪 DEV SERVICEABILITY CHECK (NO AUTH)');
    console.log('====================================');
    console.log('⚠️ NO AUTHENTICATION - DEV MODE ONLY!');
    console.log('Shop:', shop || 'not provided');
    console.log('Postal Code:', postalCode);
    console.log('City:', city);
    console.log('Address:', address1, address2);
    console.log('Province:', province);
    console.log('Country:', country);
    console.log('====================================\n');

    const accessToken = await loginToWMS();
    console.log("accessToken", accessToken);
    const requestBody = {
      postalCode: postalCode,
      city: city,
      address1: address1,
      address2: address2,
      province: province,
      country: country
    };


    // // Mock serviceability logic - replace with actual API call
    // const serviceablePincodes = ['110001', '110002', '400001', '560001', '92998', '92998-3874'];
    // const isServiceable = serviceablePincodes.some(pin => postalCode?.includes(pin));

    const isServiceable = await fetch(`https://dev-api-wms.delhivery.com/wms-dev/platform/serviceability/AUTOCLIENT`, {
      method: 'POST',
      headers: {
        'fc-uuid': 'daaf0742ee084d13886eaaf7e0a19dee',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const result = {
      serviceable: isServiceable,
      message: isServiceable
        ? 'Delivery available to this location'
        : 'Delivery not available to this location',
      postalCode,
      city,
      shop: shop || 'unknown',
      timestamp: new Date().toISOString(),
      warning: '⚠️ DEV MODE - No authentication!'
    };

    console.log('📦 Serviceability Result:', result);
    console.log('✅ Sending response to extension...\n');

    res.json(result);

  } catch (error) {
    console.error('❌ Error checking serviceability:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

async function loginToWMS() {
  const username = "autouser";
  const password = "Delhivery@12345";
  try {

    const response = await fetch(`https://dev-api-wms.delhivery.com/wms-dev/auth/user/authenticate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password })
    })
    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status}`);
    }
    const data = await response.json();
    return data.data.access_token;
  } catch (error) {
    console.error('Login to WMS failed:', error);
    throw error;
  }
}

// Endpoint to call external public API (via App Proxy)
app.get('/proxy/external-data', async (req, res) => {
  try {
    console.log('Fetching data from external API...');

    // Using JSONPlaceholder - a free fake REST API for testing
    const response = await fetch('https://jsonplaceholder.typicode.com/users/1');

    if (!response.ok) {
      throw new Error(`External API responded with status: ${response.status}`);
    }

    const data = await response.json();

    console.log('External API data received:', data);

    // Return the data with additional metadata
    const responseData = {
      success: true,
      source: 'JSONPlaceholder API',
      endpoint: 'https://jsonplaceholder.typicode.com/users/1',
      timestamp: new Date().toISOString(),
      data: data,
      shop: req.shopDomain
    };
    res.json(responseData);

  } catch (error) {
    console.error('Error calling external API:', error);
    const errorData = {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
    res.status(500).json(errorData);
  }
});

// Additional endpoint to fetch posts from external API
app.get('/proxy/external-posts', async (req, res) => {
  try {
    console.log('Fetching posts from external API...');

    // Get query parameter for limit (default to 5)
    const limit = req.query.limit || 5;

    const response = await fetch(`https://jsonplaceholder.typicode.com/posts?_limit=${limit}`);

    if (!response.ok) {
      throw new Error(`External API responded with status: ${response.status}`);
    }

    const posts = await response.json();

    console.log(`Fetched ${posts.length} posts from external API`);

    const responseData = {
      success: true,
      source: 'JSONPlaceholder API',
      endpoint: `https://jsonplaceholder.typicode.com/posts?_limit=${limit}`,
      timestamp: new Date().toISOString(),
      count: posts.length,
      data: posts,
      shop: req.shopDomain
    };
    res.json(responseData);

  } catch (error) {
    console.error('Error calling external API:', error);
    const errorData = {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
    res.status(500).json(errorData);
  }
});

// Serviceability check endpoint - Main use case!
// Returns data that the extension will write to cart metafields

// GET handler - accepts query parameters
app.get('/proxy/check-serviceability', async (req, res) => {
  try {
    const { postalCode, city, address1, address2, province, country } = req.query;

    console.log('=================================');
    console.log('Checking serviceability (GET):');
    console.log({
      postalCode,
      city,
      address1,
      address2,
      province,
      country
    });
    console.log('=================================');

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // DEMO LOGIC: Allow all except postal codes starting with "999"
    const isServiceable = !postalCode?.startsWith('999');

    console.log(`Result: ${isServiceable ? '✅ SERVICEABLE' : '❌ NOT SERVICEABLE'}`);

    const responseData = {
      serviceable: isServiceable,
      message: isServiceable
        ? 'Delivery available to this location'
        : 'Delivery not available to this location',
      postalCode,
      city,
      timestamp: new Date().toISOString(),
      shop: req.shopDomain
    };
    res.json(responseData);

  } catch (error) {
    console.error('Error checking serviceability:', error);
    const errorData = {
      serviceable: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
    res.status(500).json(errorData);
  }
});

// POST handler - accepts JSON body
app.post('/proxy/check-serviceability', async (req, res) => {
  try {
    const { postalCode, city, address1, address2, province, country } = req.body;

    console.log('=================================');
    console.log('Checking serviceability for:');
    console.log({
      postalCode,
      city,
      address1,
      address2,
      province,
      country
    });
    console.log('=================================');

    // FOR NOW: Simple logic - you'll replace this with actual API call
    // Example: Block specific postal codes, or call your logistics API

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // DEMO LOGIC: Allow all except postal codes starting with "999"
    const isServiceable = !postalCode?.startsWith('999');

    // TODO: Replace with actual external API call
    // const response = await fetch('https://your-logistics-api.com/check', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.LOGISTICS_API_KEY}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({ postalCode, city })
    // });
    // const result = await response.json();
    // const isServiceable = result.serviceable;

    console.log(`Result: ${isServiceable ? '✅ SERVICEABLE' : '❌ NOT SERVICEABLE'}`);

    const responseData = {
      serviceable: isServiceable,
      message: isServiceable
        ? 'Delivery available to this location'
        : 'Delivery not available to this location',
      postalCode,
      city,
      timestamp: new Date().toISOString(),
      shop: req.shopDomain
    };
    res.json(responseData);

  } catch (error) {
    console.error('Error checking serviceability:', error);
    const errorData = {
      serviceable: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
    res.status(500).json(errorData);
  }
});

app.listen(PORT, () => {
  console.log('\n====================================');
  console.log('🚀 SERVER STARTED');
  console.log('====================================');
  console.log(`Port: ${PORT}`);
  console.log(`URL: http://localhost:${PORT}`);
  console.log('====================================\n');

  console.log('🔐 PRODUCTION ENDPOINTS (App Proxy - Authenticated):');
  console.log('   Call via: https://<shop>.myshopify.com/apps/serviceability/...');
  console.log(`   • GET  /proxy/external-data`);
  console.log(`   • GET  /proxy/external-posts?limit=5`);
  console.log(`   • POST /proxy/check-serviceability`);
  console.log('   ✅ Requires valid Shopify signature\n');

  console.log('⚠️  DEV ENDPOINTS (Direct - No Auth):');
  console.log('   Call directly for testing:');
  console.log(`   • GET  http://localhost:${PORT}/dev/external-data`);
  console.log(`   • POST http://localhost:${PORT}/dev/check-serviceability`);
  console.log('   ❌ NO AUTHENTICATION - Remove before production!\n');

  console.log('📋 Status: Ready to receive requests');
  console.log('====================================\n');
});


