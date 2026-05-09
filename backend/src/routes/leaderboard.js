'use strict';

const router      = require('express').Router();
const authService = require('../services/authService');

// GET /api/leaderboard?limit=20
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const board = await authService.getLeaderboard(limit);
    res.json({ leaderboard: board });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

module.exports = router;
