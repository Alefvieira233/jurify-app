import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testWebhook() {
    const functionUrl = `${SUPABASE_URL}/functions/v1/whatsapp-webhook`;
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'jurify_secret_token';

    console.log(`🚀 Testing WhatsApp Webhook at: ${functionUrl}`);

    // 1. Test GET (Verification)
    console.log('\n1️⃣ Testing Webhook Verification (GET)...');
    try {
        const challenge = '123456789';
        const verifyUrl = `${functionUrl}?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=${challenge}`;

        const response = await fetch(verifyUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });

        if (response.ok) {
            const text = await response.text();
            if (text === challenge) {
                console.log('✅ Verification Successful! Challenge matched.');
            } else {
                console.error('❌ Verification Failed: Challenge mismatch.', text);
            }
        } else {
            console.error('❌ Verification Failed:', response.status, response.statusText);
        }
    } catch (error) {
        console.error('❌ Error testing verification:', error);
    }

    // 2. Test POST (Incoming Message)
    console.log('\n2️⃣ Testing Incoming Message (POST)...');
    try {
        const payload = {
            object: 'whatsapp_business_account',
            entry: [{
                id: '123456789',
                changes: [{
                    value: {
                        messaging_product: 'whatsapp',
                        metadata: {
                            display_phone_number: '15550000000',
                            phone_number_id: '100000000000000'
                        },
                        messages: [{
                            from: '5511999999999',
                            id: 'wamid.test',
                            timestamp: Date.now().toString(),
                            text: {
                                body: 'Olá, gostaria de saber mais sobre o Jurify.'
                            },
                            type: 'text'
                        }]
                    },
                    field: 'messages'
                }]
            }]
        };

        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            console.log('✅ Message Processed Successfully!');
            console.log('👉 Check your Supabase tables (whatsapp_messages) for the new message.');
        } else {
            const errorText = await response.text();
            console.error('❌ Message Processing Failed:', response.status, errorText);
        }

    } catch (error) {
        console.error('❌ Error testing message:', error);
    }
}

testWebhook();
