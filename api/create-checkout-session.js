// Debug logging
console.log('Environment check:', {
  hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
  keyStart: process.env.STRIPE_SECRET_KEY?.substring(0, 10) + '...',
  nodeEnv: process.env.NODE_ENV
});

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_debug');

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const { amount, product_name, success_url, cancel_url } = req.body;

    // Validate required fields
    if (!amount || !product_name || !success_url || !cancel_url) {
      res.status(400).json({ 
        error: 'Missing required fields: amount, product_name, success_url, cancel_url' 
      });
      return;
    }

    // Validate amount (should be in cents, minimum $5.00 = 500 cents)
    if (amount < 500) {
      res.status(400).json({ 
        error: 'Minimum amount is $5.00' 
      });
      return;
    }

    if (amount > 10000000) { // $100,000 max
      res.status(400).json({ 
        error: 'Maximum amount is $100,000.00' 
      });
      return;
    }

    // Create Checkout Sessions from body params.
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: product_name,
              description: 'High-quality digital music download (MP3 + WAV)',
              images: [], // Add album artwork URL here if available
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: success_url,
      cancel_url: cancel_url,
      payment_intent_data: {
        metadata: {
          product: 'digital_music',
          artist: 'Bump J',
          album: 'In Me Not On Me'
        }
      },
      customer_creation: 'always',
      phone_number_collection: {
        enabled: false,
      },
      billing_address_collection: 'auto',
      shipping_address_collection: null, // No shipping for digital products
    });

    console.log(`Created checkout session: ${session.id} for amount: $${amount/100}`);

    res.status(200).json({ 
      url: session.url,
      session_id: session.id 
    });

  } catch (error) {
    console.error('Stripe checkout session creation error:', error);
    
    res.status(500).json({ 
      error: 'Unable to create checkout session',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}