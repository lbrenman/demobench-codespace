const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../../db/client');
const router = express.Router();

// Accept both application/json and application/x-www-form-urlencoded
// (the OAuth 2.0 spec uses form-urlencoded; Postman and many clients default to it)
router.use(express.urlencoded({ extended: false }));

/**
 * POST /oauth/token — Client Credentials Flow
 *
 * Accepts both JSON and form-urlencoded bodies:
 *   Content-Type: application/json
 *     { "grant_type": "client_credentials", "client_id": "...", "client_secret": "..." }
 *   Content-Type: application/x-www-form-urlencoded
 *     grant_type=client_credentials&client_id=...&client_secret=...
 *
 * Returns: { access_token, token_type: "Bearer", expires_in }
 */
router.post('/token', async (req, res) => {
  const { grant_type, client_id, client_secret } = req.body;

  if (grant_type !== 'client_credentials') {
    return res.status(400).json({
      error: 'unsupported_grant_type',
      error_description: 'Only "client_credentials" grant type is supported'
    });
  }

  if (!client_id || !client_secret) {
    return res.status(400).json({
      error: 'invalid_request',
      error_description: 'client_id and client_secret are required'
    });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM oauth_clients WHERE client_id = $1 AND active = true',
      [client_id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'invalid_client',
        error_description: 'Client not found or inactive'
      });
    }

    const client = result.rows[0];
    const valid = await bcrypt.compare(client_secret, client.client_secret);

    if (!valid) {
      return res.status(401).json({
        error: 'invalid_client',
        error_description: 'Invalid client credentials'
      });
    }

    const secret = process.env.OAUTH_JWT_SECRET || 'change-this-to-a-random-secret';
    const ttl = parseInt(process.env.OAUTH_TOKEN_TTL || '3600', 10);

    const token = jwt.sign(
      {
        sub: client.client_id,
        client_name: client.client_name,
        scopes: client.scopes,
        iss: 'multi-api-mock-server'
      },
      secret,
      { expiresIn: ttl }
    );

    res.json({
      access_token: token,
      token_type: 'Bearer',
      expires_in: ttl
    });
  } catch (err) {
    console.error('OAuth token error:', err);
    res.status(500).json({
      error: 'server_error',
      error_description: 'Failed to issue token'
    });
  }
});

/**
 * GET /oauth/clients — List registered clients (admin convenience, no auth)
 */
router.get('/clients', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, client_id, client_name, scopes, active, created_at FROM oauth_clients ORDER BY id'
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error('OAuth clients list error:', err);
    res.status(500).json({ error: 'Failed to list clients' });
  }
});

module.exports = router;
