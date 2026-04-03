/**
 * Simple script to test the backend webhook logic locally.
 * Ensure your backend is running with 'node server.js' before executing this.
 */

const axios = require('axios');

const TEST_PAYLOAD_VIRAT = {
  STATUS: 'TXN_SUCCESS',
  MERC_UNQ_REF: 'LI_VIRAT_EXAMPLE', // Ensure this matches your backend config
  TXNID: 'mock_txn_12345'
};

const TEST_PAYLOAD_DHONI = {
  STATUS: 'TXN_SUCCESS',
  MERC_UNQ_REF: 'LI_DHONI_EXAMPLE', // Ensure this matches your backend config
  TXNID: 'mock_txn_67890'
};

async function testWebhook() {
  try {
    console.log('Testing Virat side increment...');
    await axios.post('http://localhost:3000/webhook/paytm', TEST_PAYLOAD_VIRAT);
    console.log('Success.');

    console.log('Testing Dhoni side increment...');
    await axios.post('http://localhost:3000/webhook/paytm', TEST_PAYLOAD_DHONI);
    console.log('Success.');

    console.log('Fetching leaderboard results...');
    const response = await axios.get('http://localhost:3000/api/leaderboard');
    console.log('Current Counts:', response.data);
  } catch (err) {
    console.error('Test Failed:', err.message);
  }
}

testWebhook();
