import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { verifyHMACMiddleware, signResponse } from './hmac-utils.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;
const HMAC_SECRET = process.env.HMAC_SECRET;

if (!HMAC_SECRET) {
  console.error('❌ ERROR: HMAC_SECRET not found in environment variables!');
  console.error('Please create a .env file with HMAC_SECRET defined.');
  process.exit(1);
}

const app = express();

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Apply HMAC verification middleware to protected routes
app.use('/api/check-serviceability', verifyHMACMiddleware(HMAC_SECRET));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Shopify App Backend with External API Integration' 
  });
});

// Endpoint to call external public API
app.get('/api/external-data', async (req, res) => {
  try {
    console.log('Fetching data from external API...');
    
    // Using JSONPlaceholder - a free fake REST API for testing
    const response = await fetch('https://jsonplaceholder.typicode.com/users/1');
    
    if (!response.ok) {
      throw new Error(`External API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('External API data received:', data);
    
    // Return the data with additional metadata and HMAC signature
    const responseData = {
      success: true,
      source: 'JSONPlaceholder API',
      endpoint: 'https://jsonplaceholder.typicode.com/users/1',
      timestamp: new Date().toISOString(),
      data: data
    };
    
    const signedResponse = signResponse(responseData, HMAC_SECRET);
    res.json(signedResponse);
    
  } catch (error) {
    console.error('Error calling external API:', error);
    const errorData = {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
    const signedResponse = signResponse(errorData, HMAC_SECRET);
    res.status(500).json(signedResponse);
  }
});

// Additional endpoint to fetch posts from external API
app.get('/api/external-posts', async (req, res) => {
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
      data: posts
    };
    
    const signedResponse = signResponse(responseData, HMAC_SECRET);
    res.json(signedResponse);
    
  } catch (error) {
    console.error('Error calling external API:', error);
    const errorData = {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
    const signedResponse = signResponse(errorData, HMAC_SECRET);
    res.status(500).json(signedResponse);
  }
});

// Serviceability check endpoint - Main use case!
app.post('/api/check-serviceability', async (req, res) => {
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
      timestamp: new Date().toISOString()
    };
    
    const signedResponse = signResponse(responseData, HMAC_SECRET);
    res.json(signedResponse);
    
  } catch (error) {
    console.error('Error checking serviceability:', error);
    const errorData = {
      serviceable: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
    const signedResponse = signResponse(errorData, HMAC_SECRET);
    res.status(500).json(signedResponse);
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`\n🔐 HMAC Authentication: ENABLED`);
  console.log(`\nAvailable endpoints:`);
  console.log(`  - GET  http://localhost:${PORT}/api/external-data (HMAC signed response)`);
  console.log(`  - GET  http://localhost:${PORT}/api/external-posts?limit=5 (HMAC signed response)`);
  console.log(`  - POST http://localhost:${PORT}/api/check-serviceability (HMAC required + signed response)`);
  console.log(`\n✅ Ready to check serviceability from Shopify checkout with HMAC security!\n`);
});


