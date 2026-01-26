import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import Stripe from 'stripe';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !STRIPE_SECRET_KEY) {
    console.error('❌ Missing credentials in .env');
    process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

async function testStripeWebhook() {
    const functionUrl = `${SUPABASE_URL}/functions/v1/stripe-webhook`;
    console.log(`🚀 Testing Stripe Webhook at: ${functionUrl}`);

    // 1. Create a Mock Event
    // In a real scenario, we would use stripe.webhooks.generateTestHeaderString
    // But since we can't easily sign it without the webhook secret matching the one in the Edge Function env,
    // we might fail signature verification if we don't have the same secret locally.

    // However, for this test, we assume the user will set the STRIPE_WEBHOOK_SECRET in Supabase.
    // We can try to trigger a real test event from Stripe CLI, but here we are writing a script.

    // NOTE: This script is best used to verify the ENDPOINT is reachable. 
    // Full verification requires the Stripe CLI: `stripe trigger payment_intent.succeeded`

    console.log('ℹ️ To fully verify, use the Stripe CLI:');
    console.log(`   stripe listen --forward-to ${functionUrl}`);
    console.log(`   stripe trigger customer.subscription.created`);

    // Let's just ping it to see if it's alive (it should return 400 due to missing signature)
    try {
        const response = await fetch(functionUrl, {
            method: 'POST',
            body: JSON.stringify({ livemode: false }),
        });

        if (response.status === 400) {
            console.log('✅ Endpoint is reachable (returned 400 as expected for missing signature).');
        } else {
            console.log(`⚠️ Endpoint returned ${response.status}. Check logs.`);
        }
    } catch (error) {
        console.error('❌ Error reaching endpoint:', error);
    }
}

testStripeWebhook();
