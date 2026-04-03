# RCB vs CSK Fan Website Setup Guide

This project consists of a **Node.js backend** (on Render) and a **static frontend** (on Vercel). It uses **Supabase** for transaction persistence and **Paytm Business** for payment processing.

## 1. Supabase Setup (Storage)

1. Create a new project in [Supabase](https://supabase.com/).
2. Go to the **SQL Editor** and run the following commands:

```sql
-- Create the match_stats table
CREATE TABLE match_stats (
  id INT PRIMARY KEY,
  virat_count BIGINT DEFAULT 0,
  dhoni_count BIGINT DEFAULT 0
);

-- Initialize the table with a single row
INSERT INTO match_stats (id, virat_count, dhoni_count) VALUES (1, 0, 0);

-- Create an RPC function for atomic increments (Optional but recommended)
CREATE OR REPLACE FUNCTION increment_count(count_column TEXT)
RETURNS void AS $$
BEGIN
  IF count_column = 'virat_count' THEN
    UPDATE match_stats SET virat_count = virat_count + 1 WHERE id = 1;
  ELSIF count_column = 'dhoni_count' THEN
    UPDATE match_stats SET dhoni_count = dhoni_count + 1 WHERE id = 1;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

3. Note down your **Project URL** and **Anon Key** from the Supabase Dashboard (Settings -> API).

## 2. Paytm Business Setup (Payments)

1. Log in to your [Paytm Business Dashboard](https://business.paytm.com/dashboard).
2. **Create Virat side Payment Link**:
   - Go to **Payment Links** -> **Create New**.
   - Title: "Support Virat / RCB".
   - Amount: Leave flexible.
   - Save and note the **Link ID** (e.g., `LI_12345`).
3. **Create Dhoni side Payment Link**:
   - Repeat for Dhoni. Note the **Link ID** (e.g., `LI_67890`).
4. **Configure Webhook**:
   - Go to **API Keys** / **Webhooks**.
   - Set the Webhook URL to: `https://your-backend-on-render.com/webhook/paytm`
   - Select the events: **Transaction Success**.
5. Note your **Merchant Key** for checksum validation.

## 3. Backend Deployment (Render)

1. Create a new **Web Service** on [Render](https://render.com/).
2. Connect your repository and select the `backend` folder as the root.
3. Build Command: `npm install`
4. Start Command: `node server.js`
5. Add the following **Environment Variables**:
   - `SUPABASE_URL`: (Your URL)
   - `SUPABASE_ANON_KEY`: (Your Key)
   - `VIRAT_LINK_ID`: (e.g., LI_12345)
   - `DHONI_LINK_ID`: (e.g., LI_67890)
   - `PAYTM_MERCHANT_KEY`: (Optional but recommended)
   - `PORT`: 3000

## 4. Frontend Deployment (Vercel)

1. Create a new project on [Vercel](https://vercel.com/dashboard).
2. Connect your repository and select the `frontend` folder as the root.
3. **Wait!** Before deploying, edit the `API_URL` variable in `index.html` (line 300 approx) to match your live Render URL:
   ```javascript
   const API_URL = 'https://your-backend-on-render.com/api/leaderboard';
   ```
4. Deploy the static site.

## 5. Summary of URLs

- **Leaderboard URL**: `https://your-vercel-app.vercel.app`
- **Posters**: Should contain the Virat/Dhoni Payment Link QRs and a QR linking to the Leaderboard URL.

---

## 6. Repo Readiness Checklist
- [x] Backend code in `backend/server.js`
- [x] Frontend code in `frontend/index.html`
- [x] Root `.gitignore` for clean pushes
- [x] Support Posters generated in `.gemini/` assets
- [ ] Database initialized in Supabase
- [ ] Render / Vercel projects created

## 👋 Note on Shifting Providers
If you decide to shift from Paytm to another provider (e.g., PhonePe, Razorpay), you only need to:
1. Update the `POST /webhook/paytm` endpoint in `server.js` to match the new provider's JSON structure.
2. Ensure you're mapping their unique transaction ID to the `increment_count` logic.
3. Replace the QR codes in `frontend/index.html`.

Everything else—the real-time leaderboard, theme switching, and global persistence—remains exactly the same.
