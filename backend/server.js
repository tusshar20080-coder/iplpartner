import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import PaytmChecksum from 'paytmchecksum';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Config: ensure these match your Paytm Business Link IDs
const VIRAT_LINK_ID = process.env.VIRAT_LINK_ID || 'LI_VIRAT_EXAMPLE';
const DHONI_LINK_ID = process.env.DHONI_LINK_ID || 'LI_DHONI_EXAMPLE';
const MERCHANT_KEY = process.env.PAYTM_MERCHANT_KEY;

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('SUPABASE_URL and SUPABASE_ANON_KEY must be provided as environment variables.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/', (req, res) => {
  res.send('RCB vs CSK Leaderboard API is active');
});

/**
 * Leaderboard endpoint: returns the live count of successful transactions 
 * per side from Supabase.
 */
app.get('/api/leaderboard', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('match_stats')
      .select('virat_count, dhoni_count')
      .eq('id', 1)
      .single();

    if (error) throw error;

    const viratCount = data.virat_count || 0;
    const dhoniCount = data.dhoni_count || 0;
    const total = viratCount + dhoniCount;

    const viratPercentage = total > 0 ? Math.round((viratCount / total) * 100) : 0;
    const dhoniPercentage = total > 0 ? Math.round((dhoniCount / total) * 100) : 0;

    let leader = 'tie';
    if (viratCount > dhoniCount) leader = 'virat';
    else if (dhoniCount > viratCount) leader = 'dhoni';

    res.json({
      viratCount,
      dhoniCount,
      viratPercentage,
      dhoniPercentage,
      leader
    });
  } catch (e) {
    console.error('Error fetching stats:', e.message);
    res.status(500).json({ error: 'Failed to fetch leaderboard data' });
  }
});

/**
 * Webhook endpoint: processes successful Paytm transactions and 
 * increments the correct side's counter in Supabase.
 */
app.post('/webhook/paytm', async (req, res) => {
  const body = req.body;
  const receivedChecksum = body.CHECKSUMHASH;

  console.log('Received Webhook Payload:', body);

  // Optional: Verify checksum if MERCHANT_KEY is available
  if (MERCHANT_KEY && receivedChecksum) {
    const paytmParams = { ...body };
    delete paytmParams.CHECKSUMHASH;

    const isVerifySignature = PaytmChecksum.verifySignature(paytmParams, MERCHANT_KEY, receivedChecksum);
    if (!isVerifySignature) {
      console.warn('Checksum Mismatch! Possible tampering.');
      return res.status(401).send('Invalid Checksum');
    }
  }

  // Final confirmation logic: Check transaction status and link reference ID
  const status = body.STATUS || body.status;
  const linkRef = body.MERC_UNQ_REF || body.merc_unq_ref;

  if (status === 'TXN_SUCCESS' && linkRef) {
    try {
      let updateColumn = null;

      if (linkRef === VIRAT_LINK_ID) {
        updateColumn = 'virat_count';
      } else if (linkRef === DHONI_LINK_ID) {
        updateColumn = 'dhoni_count';
      }

      if (updateColumn) {
        // Increment the count for the identified side
        const { error } = await supabase.rpc('increment_count', {
          count_column: updateColumn
        });

        if (error) {
          // Fallback if RPC isn't set up: fetch, add, update (less atomic)
          console.log('RPC update failed, attempting manual update');
          const { data, error: fetchError } = await supabase.from('match_stats').select(updateColumn).eq('id', 1).single();
          if (!fetchError) {
            await supabase.from('match_stats').update({ [updateColumn]: data[updateColumn] + 1 }).eq('id', 1);
          }
        }
        console.log(`Successfully incremented ${updateColumn}`);
      } else {
        console.warn('Transaction received for unrecognized Link ID:', linkRef);
      }
    } catch (e) {
      console.error('Error updating stats via webhook:', e.message);
    }
  } else {
    console.warn(`Webhook received but ignored. Status: ${status}, LinkRef: ${linkRef}`);
  }

  // Always respond with 200 OK so Paytm stops retrying the webhook
  res.send('OK');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
