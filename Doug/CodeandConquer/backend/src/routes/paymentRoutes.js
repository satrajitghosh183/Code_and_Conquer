import express from 'express';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Supabase with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Create Checkout Session
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { userId, email, priceId } = req.body;

    if (!userId || !email || !priceId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if customer already exists in Stripe
    let customer;
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (existingCustomer?.stripe_customer_id) {
      // Use existing customer
      customer = await stripe.customers.retrieve(existingCustomer.stripe_customer_id);
    } else {
      // Create new Stripe customer
      customer = await stripe.customers.create({
        email: email,
        metadata: {
          supabase_user_id: userId,
        },
      });

      // Save customer ID to database
      await supabase
        .from('customers')
        .insert({
          user_id: userId,
          stripe_customer_id: customer.id,
        });
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard?success=true`,
      cancel_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard?canceled=true`,
      metadata: {
        user_id: userId,
      },
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ message: error.message });
  }
});

// Cancel Subscription
router.post('/cancel-subscription', async (req, res) => {
  try {
    const { subscriptionId, userId } = req.body;

    if (!subscriptionId || !userId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Verify the subscription belongs to the user
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('stripe_subscription_id', subscriptionId)
      .single();

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    // Cancel the subscription in Stripe
    const deletedSubscription = await stripe.subscriptions.cancel(subscriptionId);

    res.json({ subscription: deletedSubscription });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({ message: error.message });
  }
});

// Create Customer Portal Session
router.post('/create-portal-session', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'Missing user ID' });
    }

    // Get customer ID from database
    const { data: customer } = await supabase
      .from('customers')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (!customer?.stripe_customer_id) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.stripe_customer_id,
      return_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ message: error.message });
  }
});

// Stripe Webhook Handler (must use raw body)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('Checkout session completed:', session.id);
        
        // Retrieve the subscription
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        
        // Update database
        await supabase
          .from('subscriptions')
          .upsert({
            user_id: session.metadata.user_id,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: session.customer,
            status: subscription.status,
            price_id: subscription.items.data[0].price.id,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          });
        
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        console.log('Subscription updated:', subscription.id);
        
        // Get user_id from customer metadata
        const customer = await stripe.customers.retrieve(subscription.customer);
        const userId = customer.metadata.supabase_user_id;
        
        // Update database
        await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: subscription.customer,
            status: subscription.status,
            price_id: subscription.items.data[0].price.id,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          });
        
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        console.log('Subscription deleted:', subscription.id);
        
        // Update database to mark subscription as canceled
        await supabase
          .from('subscriptions')
          .update({ 
            status: 'canceled',
            canceled_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);
        
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        console.log('Invoice payment succeeded:', invoice.id);
        
        // Optionally update payment history
        if (invoice.subscription) {
          await supabase
            .from('subscriptions')
            .update({ 
              status: 'active',
              current_period_start: new Date(invoice.lines.data[0].period.start * 1000).toISOString(),
              current_period_end: new Date(invoice.lines.data[0].period.end * 1000).toISOString(),
            })
            .eq('stripe_subscription_id', invoice.subscription);
        }
        
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.log('Invoice payment failed:', invoice.id);
        
        // Update subscription status
        if (invoice.subscription) {
          await supabase
            .from('subscriptions')
            .update({ status: 'past_due' })
            .eq('stripe_subscription_id', invoice.subscription);
        }
        
        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

