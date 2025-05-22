const User = require('../models/User');

// @desc    Update user profile settings (e.g., monthlyBudget)
// @route   PUT /api/users/settings
// @access  Private
exports.updateUserSettings = async (req, res) => {
    try {
        const { monthlyBudget } = req.body;

        // Find the user by ID from the authenticated token
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (monthlyBudget !== undefined) {
            if (typeof monthlyBudget !== 'number' || monthlyBudget < 0) {
                return res.status(400).json({ error: 'Invalid monthly budget amount.' });
            }
            user.monthlyBudget = monthlyBudget;
        }

        // Add other settings updates here if needed in the future
        // e.g., if (name) user.name = name;

        const updatedUser = await user.save();

        // Return only necessary fields, excluding password
        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            monthlyBudget: updatedUser.monthlyBudget,
            currency: updatedUser.currency,
        });

    } catch (error) {
        console.error('Error updating user settings:', error);
        res.status(500).json({ error: 'Server error while updating settings.' });
    }
};

// @desc    Get current user details (including settings)
// @route   GET /api/users/me
// @access  Private
exports.getUserDetails = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password'); // Exclude password
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Error fetching user details:', error);
        res.status(500).json({ error: 'Server error while fetching user details.' });
    }
};