const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error(`Webhook signature verification failed:`, err.message);
    res.status(400).json({ error: `Webhook Error: ${err.message}` });
    return;
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        console.log(`Payment successful for session: ${session.id}`);
        console.log(`Amount: $${session.amount_total / 100}`);
        console.log(`Customer: ${session.customer_details?.email || 'Unknown'}`);
        
        // Here you would typically:
        // 1. Send download links via email
        // 2. Update your database
        // 3. Generate secure download tokens
        // 4. Send confirmation emails
        
        // For now, we'll just log the successful payment
        await handleSuccessfulPayment(session);
        break;
        
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        console.log(`PaymentIntent succeeded: ${paymentIntent.id}`);
        break;
        
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.status(200).json({ received: true });
    
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

async function handleSuccessfulPayment(session) {
  try {
    // This is where you would implement your post-payment logic
    console.log('Processing successful payment:', {
      session_id: session.id,
      amount: session.amount_total / 100,
      currency: session.currency,
      customer_email: session.customer_details?.email,
      payment_status: session.payment_status,
      metadata: session.metadata
    });

    // Example: Send email with download links
    // await sendDownloadEmail(session.customer_details.email, session.id);
    
    // Example: Log to database
    // await logSaleToDatabase(session);
    
    return true;
  } catch (error) {
    console.error('Error handling successful payment:', error);
    throw error;
  }
}

// Configure raw body parsing for webhook signature verification
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}