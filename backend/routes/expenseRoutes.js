const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { createExpense, getExpenses } = require('../controllers/expenseController');

router.post('/', auth, createExpense);
router.get('/', auth, getExpenses);

module.exports = router;