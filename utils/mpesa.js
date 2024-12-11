const axios = require('axios');
require('dotenv').config();

// M-Pesa Configuration
const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET;
const PASSKEY = process.env.MPESA_PASSKEY;
const SHORTCODE = process.env.MPESA_SHORTCODE;
const BASE_URL = 'https://sandbox.safaricom.co.ke';

// Get OAuth token
async function getOAuthToken() {
    try {
        const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
        const response = await axios({
            url: `${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
            method: 'GET',
            headers: {
                'Authorization': `Basic ${auth}`
            }
        });

        return response.data.access_token;
    } catch (error) {
        console.error('OAuth Token Error:', error.response?.data || error.message);
        throw new Error('Failed to get access token');
    }
}

// Generate timestamp
function generateTimestamp() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}${hour}${minutes}${seconds}`;
}

// Generate password
function generatePassword(timestamp) {
    return Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString('base64');
}

// Format phone number
function formatPhoneNumber(phoneNumber) {
    // Remove any spaces, dashes, or other characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Remove leading zeros, +254, or 254
    cleaned = cleaned.replace(/^(0|\+254|254)/, '');
    
    // Add 254 prefix
    return `254${cleaned}`;
}

// Initiate STK Push
async function initiateSTKPush(phoneNumber, amount, eventId) {
    try {
        const token = await getOAuthToken();
        const timestamp = generateTimestamp();
        const password = generatePassword(timestamp);
        const formattedPhone = formatPhoneNumber(phoneNumber);

        console.log('Initiating STK Push with:', {
            phone: formattedPhone,
            amount: amount,
            timestamp: timestamp
        });

        const requestBody = {
            BusinessShortCode: SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: Math.ceil(amount),
            PartyA: formattedPhone,
            PartyB: SHORTCODE,
            PhoneNumber: formattedPhone,
            CallBackURL: `${process.env.BASE_URL}/events/mpesa/callback`,
            AccountReference: `Event-${eventId}`,
            TransactionDesc: 'Event Payment'
        };

        console.log('STK Push Request:', requestBody);

        const response = await axios({
            method: 'post',
            url: `${BASE_URL}/mpesa/stkpush/v1/processrequest`,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            data: requestBody
        });

        console.log('STK Push Response:', response.data);

        if (response.data.ResponseCode === '0') {
            return {
                success: true,
                data: {
                    CheckoutRequestID: response.data.CheckoutRequestID,
                    MerchantRequestID: response.data.MerchantRequestID,
                    ResponseCode: response.data.ResponseCode,
                    ResponseDescription: response.data.ResponseDescription,
                    CustomerMessage: response.data.CustomerMessage
                }
            };
        } else {
            throw new Error(response.data.ResponseDescription || 'STK push failed');
        }
    } catch (error) {
        console.error('STK Push Error:', {
            error: error.response?.data || error.message,
            stack: error.stack
        });
        
        return {
            success: false,
            error: error.response?.data || error.message,
            message: 'Failed to initiate payment. Please try again.'
        };
    }
}

// Query STK Push Status
async function verifyTransaction(checkoutRequestID) {
    try {
        const token = await getOAuthToken();
        const timestamp = generateTimestamp();
        const password = generatePassword(timestamp);

        const requestBody = {
            BusinessShortCode: SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            CheckoutRequestID: checkoutRequestID
        };

        console.log('Verify Transaction Request:', requestBody);

        const response = await axios({
            method: 'post',
            url: `${BASE_URL}/mpesa/stkpushquery/v1/query`,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            data: requestBody
        });

        console.log('Verify Transaction Response:', response.data);

        return {
            success: true,
            data: {
                ResultCode: response.data.ResultCode,
                ResultDesc: response.data.ResultDesc,
                CheckoutRequestID: checkoutRequestID,
                ResponseCode: response.data.ResponseCode,
                ResponseDescription: response.data.ResponseDescription
            }
        };
    } catch (error) {
        console.error('Transaction Verification Error:', {
            error: error.response?.data || error.message,
            stack: error.stack
        });
        
        return {
            success: false,
            error: error.response?.data || error.message,
            message: 'Failed to verify transaction status'
        };
    }
}

module.exports = {
    initiateSTKPush,
    verifyTransaction
}; 