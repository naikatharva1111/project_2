const Expense = require('../models/Expense');

exports.createExpense = async (req, res) => {
  try {
    const expense = new Expense({
      ...req.body,
      user: req.user._id
    });
    await expense.save();
    res.status(201).json(expense);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find({ user: req.user._id }).sort('-date');
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};