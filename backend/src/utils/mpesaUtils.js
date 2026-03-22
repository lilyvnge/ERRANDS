const axios = require('axios');
const crypto = require('crypto');
const moment = require('moment');

class MpesaService {
    constructor() {
        this.environment = process.env.MPESA_ENVIRONMENT || 'sandbox'; // 'sandbox' or 'production'
        this.consumerKey = process.env.MPESA_CONSUMER_KEY;
        this.consumerSecret = process.env.MPESA_CONSUMER_SECRET;
        this.businessShortCode = process.env.MPESA_SHORT_CODE;
        this.passkey = process.env.MPESA_PASSKEY;
        this.callbackUrl = process.env.MPESA_CALLBACK_URL;
        this.transactionType = process.env.MPESA_TRANSACTION_TYPE || 'CustomerPayBillOnline';

        this.baseUrl = this.environment === 'production'
        
            ? 'https://api.safaricom.co.ke' 
            : 'https://sandbox.safaricom.co.ke';
    }

    // Generate access token
    async generateAccessToken() {
        try {
            const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');

            const response = await axios.get(`${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, 
                
                {
                    headers: {
                        Authorization: `Basic ${auth}`
                    }
                }
            );

            return response.data.access_token;
        } catch (error) {
            console.error('Mpesa access token error:', error.response ? error.response.data : error.message);
            throw new Error('Failed to generate M-Pesa access token');
        }
    }

    // Generate password for STK Push
    generatePassword() {
        const timestamp = moment().format('YYYYMMDDHHmmss');
        const data = `${this.businessShortCode}${this.passkey}${timestamp}`;

        return {
            password: Buffer.from(data).toString('base64'),
            timestamp: timestamp
        };
    }

    // Initiate STK Push (Lipa na M-Pesa)
    async initiateStkPush(phoneNumber, amount, accountReference, transactionDesc) {
        try {
            const accessToken = await this.generateAccessToken();
            const { password, timestamp } = this.generatePassword();

            // Format phone number (2547XXXXXXXX)
            const formattedPhone = this.formatPhoneNumber(phoneNumber);

            const requestData = {
                BusinessShortCode: this.businessShortCode,
                Password: password,
                Timestamp: timestamp,
                TransactionType: this.transactionType,
                Amount: amount,
                PartyA: formattedPhone, 
                PartyB: this.businessShortCode,
                PhoneNumber: formattedPhone,
                CallBackURL: this.callbackUrl,
                AccountReference: accountReference,
                TransactionDesc: transactionDesc
            };

            const response = await axios.post(`${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
                requestData,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data;
        } catch (error) {
            console.error('Mpesa STK Push error:', error.response?.data || error.message);
            throw new Error('Failed to initiate M-Pesa STK Push');
        }
    }

    // Format phone number to 2547XXXXXXXX
    formatPhoneNumber(phone) {
        let cleaned = (phone || '').replace(/\D/g, '');

        // If number starts with 7 and is 9 digits e.g. 712345678 -> 254712345678
        if (cleaned.length === 9 && cleaned.startsWith('7')) {
            return '254' + cleaned;
        }

        // If number starts with 07 and is 10 digits -> convert to 2547XXXXXXXX
        if (cleaned.length === 10 && cleaned.startsWith('07')) {
            return '254' + cleaned.substring(1);
        }

        // If already in 2547XXXXXXXX format
        if (cleaned.startsWith('254')) {
            return cleaned;
        }

        // If starts with 0 fallback
        if (cleaned.startsWith('0')) {
            return '254' + cleaned.substring(1);
        }

        // Otherwise return as cleaned digits
        return cleaned;
    }

    // Check transaction status
    async checkTransactionStatus(checkoutRequestID) {
        try {
            const accessToken = await this.generateAccessToken();
            const { password, timestamp } = this.generatePassword();

            const requestData = {
                BusinessShortCode: this.businessShortCode,
                Password: password,
                Timestamp: timestamp,
                CheckoutRequestID: checkoutRequestID
            };

            const response = await axios.post(`${this.baseUrl}/mpesa/stkpushquery/v1/query`,
                requestData,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data;
        } catch (error) {
            console.error('Mpesa transaction status error:', error.response?.data || error.message);
            throw new Error('Failed to check M-Pesa transaction status');
        }
    }
}

module.exports = new MpesaService();