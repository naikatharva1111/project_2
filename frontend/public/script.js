const API_BASE = 'http://localhost:5000/api';
let currentUser = null; // Stores { _id, name, email, monthlyBudget, currency, ... }

// DOM Elements
// Modals
const authModal = document.getElementById('authModal');
const expenseModal = document.getElementById('expenseModal');
const userModal = document.getElementById('userModal');

// Auth Modal Elements
const authModalTitle = document.getElementById('authModalTitle');
const showLoginBtn = document.getElementById('showLoginBtn');
const showSignupBtn = document.getElementById('showSignupBtn');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const closeAuthModalBtn = document.getElementById('closeAuthModalBtn');

// User Profile Modal Elements
const userForm = document.getElementById('userForm');
const userNameInput = document.getElementById('userName');
const userEmailInput = document.getElementById('userEmail');
const userTypeSelect = document.getElementById('userType');
const userCurrencySelect = document.getElementById('userCurrency');
const monthlyBudgetSettingInput = document.getElementById('monthlyBudgetSetting');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const logoutFromUserModalBtn = document.getElementById('logoutFromUserModalBtn');
const closeUserModalBtn = document.getElementById('closeUserModalBtn');

// Expense Modal Elements
const addExpenseBtnFAB = document.getElementById('addExpenseBtnFAB');
const expenseForm = document.getElementById('expenseForm');
const closeExpenseModalBtn = document.getElementById('closeExpenseModalBtn');
const cancelExpenseModalBtn = document.getElementById('cancelExpenseModalBtn');
const expenseAmountInput = document.getElementById('expenseAmount');
const expenseDescriptionInput = document.getElementById('expenseDescription');
const expenseDateInput = document.getElementById('expenseDate');
const categorySelector = document.querySelector('.category-selector');

// Dashboard Display Elements
const dashboardMonthlyBudgetEl = document.querySelector('.stats-cards .stat-card:nth-child(1) .amount');
const dashboardTotalSpentEl = document.querySelector('.stats-cards .stat-card:nth-child(2) .amount');
const dashboardRemainingEl = document.querySelector('.stats-cards .stat-card:nth-child(3) .amount');
const expensesListEl = document.querySelector('.expenses-list');
const budgetProgressFill = document.querySelector('.progress-fill');
const budgetProgressSpentText = document.querySelector('.progress-details span:nth-child(1)');
const budgetProgressRemainingText = document.querySelector('.progress-details span:nth-child(2)');
const budgetProgressPercentageText = document.querySelector('.progress-header span');


// Chart instances
let spendingChartInstance = null;
let categoryChartInstance = null;
let monthlyComparisonChartInstance = null;
let allUserExpenses = []; // Cache for all user expenses for calendar

// User Profile Display Elements (Header & Sidebar)
const headerUserAvatar = document.querySelector('header .user-avatar');
const headerUserName = document.querySelector('header .user-profile span');
const sidebarUserAvatarLarge = document.querySelector('.sidebar .user-avatar.large');
const sidebarUserName = document.querySelector('.sidebar .user-info h3');
const sidebarUserRole = document.querySelector('.sidebar .user-info p'); // e.g., "Student"

// Utility Functions for Modals
function openModal(modalElement) {
    if (modalElement) modalElement.classList.add('active');
}
function closeModal(modalElement) {
    if (modalElement) modalElement.classList.remove('active');
}

// --- UI Update Functions ---
function updateUILayout() {
    if (currentUser) {
        const initials = currentUser.name ? currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'GU';
        if (headerUserAvatar) headerUserAvatar.textContent = initials;
        if (headerUserName) headerUserName.textContent = currentUser.name || 'User';
        if (sidebarUserAvatarLarge) sidebarUserAvatarLarge.textContent = initials;
        if (sidebarUserName) sidebarUserName.textContent = currentUser.name || 'User';
        if (sidebarUserRole) sidebarUserRole.textContent = currentUser.userType || 'Member'; // Assuming userType from profile

        // Hide auth modal if user is logged in
        closeModal(authModal);
    } else {
        if (headerUserAvatar) headerUserAvatar.textContent = 'GU';
        if (headerUserName) headerUserName.textContent = 'Guest User';
        if (sidebarUserAvatarLarge) sidebarUserAvatarLarge.textContent = 'GU';
        if (sidebarUserName) sidebarUserName.textContent = 'Guest User';
        if (sidebarUserRole) sidebarUserRole.textContent = 'Guest';
        openModal(authModal); // Show auth modal if no user
    }
}

function updateDashboardDisplay(expenses = [], monthlyBudget = 0) {
    const budget = (typeof monthlyBudget === 'number' && !isNaN(monthlyBudget)) ? monthlyBudget : 0;
    const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const remaining = budget - totalSpent;
    const percentSpent = budget > 0 ? Math.min((totalSpent / budget) * 100, 100) : 0;

    if (dashboardMonthlyBudgetEl) dashboardMonthlyBudgetEl.textContent = `₹${budget.toFixed(2)}`;
    if (dashboardTotalSpentEl) dashboardTotalSpentEl.textContent = `₹${totalSpent.toFixed(2)}`;
    if (dashboardRemainingEl) dashboardRemainingEl.textContent = `₹${remaining.toFixed(2)}`;

    if (budgetProgressFill) budgetProgressFill.style.width = `${percentSpent}%`;
    if (budgetProgressSpentText) budgetProgressSpentText.textContent = `₹${totalSpent.toFixed(2)} spent`;
    if (budgetProgressRemainingText) budgetProgressRemainingText.textContent = `₹${remaining.toFixed(2)} remaining`;
    if (budgetProgressPercentageText) budgetProgressPercentageText.textContent = `${Math.round(percentSpent)}% spent`;
    
    // Update stat card colors (optional, based on previous logic)
    const remainingCardAmountEl = document.querySelector('.stats-cards .stat-card:nth-child(3) .amount');
    if (remainingCardAmountEl) {
        const remainingCard = remainingCardAmountEl.closest('.stat-card');
        if (remainingCard) {
            if (remaining < 0) {
                remainingCard.style.setProperty('--card-accent-color', 'var(--color-danger)');
            } else if (budget > 0 && remaining < budget * 0.25) {
                remainingCard.style.setProperty('--card-accent-color', 'var(--color-warning)');
            } else {
                remainingCard.style.setProperty('--card-accent-color', 'var(--color-success)');
            }
        }
    }
}

function displayRecentExpenses(expenses = []) {
    if (!expensesListEl) return;
    expensesListEl.innerHTML = ''; // Clear existing items

    if (expenses.length === 0) {
        expensesListEl.innerHTML = '<li class="expense-item"><p>No expenses recorded yet.</p></li>';
        return;
    }

    const recentExpenses = expenses.slice(0, 4); // Display a few recent ones

    recentExpenses.forEach(expense => {
        const li = document.createElement('li');
        li.classList.add('expense-item');
        li.innerHTML = `
            <div class="expense-info">
                <div class="expense-icon">
                    <i class="${getCategoryIcon(expense.category)}"></i>
                </div>
                <div class="expense-details">
                    <h4>${expense.description}</h4>
                    <span class="expense-category">${expense.category.charAt(0).toUpperCase() + expense.category.slice(1)}</span>
                </div>
            </div>
            <div class="expense-amount">-₹${expense.amount.toFixed(2)}</div>
        `;
        expensesListEl.appendChild(li);
    });
}

function getCategoryIcon(category) {
    const cat = category ? category.toLowerCase() : 'other';
    switch (cat) {
        case 'food': return 'fas fa-utensils';
        case 'transport': return 'fas fa-bus';
        case 'rent': return 'fas fa-home';
        case 'shopping': return 'fas fa-shopping-bag';
        case 'education': return 'fas fa-book';
        case 'entertainment': return 'fas fa-gamepad';
        case 'health': return 'fas fa-heartbeat';
        default: return 'fas fa-ellipsis-h'; // 'other'
    }
}

// --- API Call Functions ---
async function fetchUserDetails() {
    const token = localStorage.getItem('token');
    if (!token) {
        currentUser = null;
        updateUILayout();
        updateDashboardDisplay([], 0);
        openModal(authModal);
        return false;
    }
    try {
        const res = await fetch(`${API_BASE}/users/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
            localStorage.removeItem('token');
            currentUser = null;
            const errorData = await res.json().catch(() => ({ error: 'Session expired or invalid.' }));
            throw new Error(errorData.error);
        }
        currentUser = await res.json();
        updateUILayout();
        await fetchExpenses(); // Fetch expenses after user details are loaded
        allUserExpenses = await fetchExpenses(true); // Populate cache for calendar/analytics
        populateUserProfileForm(); // Populate profile form
        return true;
    } catch (err) {
        alert(err.message || 'Could not fetch user details. Please log in again.');
        localStorage.removeItem('token');
        currentUser = null;
        updateUILayout();
        updateDashboardDisplay([], 0);
        openModal(authModal);
        return false;
    }
}

async function fetchExpenses(forCalendar = false) { // Added forCalendar flag
    const token = localStorage.getItem('token');
    if (!token || !currentUser) {
        if (!forCalendar) { // Only update dashboard if not a calendar-specific fetch
            displayRecentExpenses([]);
            updateDashboardDisplay([], currentUser ? currentUser.monthlyBudget : 0);
        }
        return forCalendar ? [] : undefined; // Return empty array for calendar, undefined otherwise
    }
    try {
        const res = await fetch(`${API_BASE}/expenses`, { // This fetches ALL expenses for the user
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ error: 'Failed to fetch expenses.' }));
            if (res.status === 401 || res.status === 403) handleAuthError(errorData.error);
            else throw new Error(errorData.error);
            return forCalendar ? [] : undefined;
        }
        const expenses = await res.json();
        if (!forCalendar) {
            displayRecentExpenses(expenses);
            updateDashboardDisplay(expenses, currentUser.monthlyBudget);
        }
        return expenses; // Return all expenses
    } catch (err) {
        console.error('Fetch expenses error:', err);
        if (!forCalendar) alert(err.message || 'Could not fetch expenses.');
        return forCalendar ? [] : undefined;
    }
}

function handleAuthError(errorMessage) {
    alert(errorMessage || 'Authentication error. Please log in again.');
    localStorage.removeItem('token');
    currentUser = null;
    updateUILayout();
    updateDashboardDisplay([], 0);
    openModal(authModal);
    // Ensure login form is shown
    if (loginForm) loginForm.classList.remove('hidden');
    if (signupForm) signupForm.classList.add('hidden');
    if (authModalTitle) authModalTitle.textContent = 'Login';
}

// --- Authentication Logic ---
async function handleLogin(email, password) {
    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed.');
        
        localStorage.setItem('token', data.token);
        currentUser = data.user; // Backend should return the full user object including monthlyBudget
        updateUILayout();
        await fetchExpenses();
        allUserExpenses = await fetchExpenses(true); // Populate cache for calendar/analytics
        populateUserProfileForm();
        closeModal(authModal);
    } catch (err) {
        alert(err.message);
    }
}

async function handleSignup(name, email, password) {
    try {
        const res = await fetch(`${API_BASE}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Signup failed.');

        localStorage.setItem('token', data.token);
        currentUser = data.user; // Backend should return the full user object
        updateUILayout();
        await fetchExpenses(); // Load initial (empty) expenses
        allUserExpenses = await fetchExpenses(true); // Populate cache for calendar/analytics
        populateUserProfileForm(); // Populate profile with new user data
        closeModal(authModal);
         // Optionally, open user profile modal for new users to complete profile
        openModal(userModal);
    } catch (err) {
        alert(err.message);
    }
}

function handleLogout() {
    localStorage.removeItem('token');
    currentUser = null;
    updateUILayout();
    displayRecentExpenses([]);
    updateDashboardDisplay([], 0);
    if (loginForm) loginForm.reset();
    if (signupForm) signupForm.reset();
    openModal(authModal); // Show login/signup options
    // Default to login view in auth modal
    if (loginForm) loginForm.classList.remove('hidden');
    if (signupForm) signupForm.classList.add('hidden');
    if (authModalTitle) authModalTitle.textContent = 'Login';
    // Reset sidebar active state and show dashboard
    document.querySelectorAll('.sidebar-menu a').forEach(l => l.classList.remove('active'));
    const dashboardLink = document.querySelector('.sidebar-menu a[href="#dashboard"]');
    if (dashboardLink) dashboardLink.classList.add('active');
    document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
    const dashboardSection = document.querySelector('.dashboard-section');
    if (dashboardSection) dashboardSection.classList.remove('hidden');
}

// --- User Profile / Settings Logic ---
function populateUserProfileForm() {
    if (currentUser && userForm) {
        if (userNameInput) userNameInput.value = currentUser.name || '';
        if (userEmailInput) userEmailInput.value = currentUser.email || ''; // Usually readonly
        if (userTypeSelect) userTypeSelect.value = currentUser.userType || 'student'; // Assuming 'userType' field
        if (userCurrencySelect) userCurrencySelect.value = currentUser.currency || '₹';
        if (monthlyBudgetSettingInput) monthlyBudgetSettingInput.value = currentUser.monthlyBudget || '';
    }
}

async function handleSaveProfile() {
    if (!currentUser) {
        alert('You must be logged in.');
        return;
    }
    const token = localStorage.getItem('token');
    const updatedSettings = {
        name: userNameInput ? userNameInput.value : currentUser.name,
        monthlyBudget: monthlyBudgetSettingInput ? parseFloat(monthlyBudgetSettingInput.value) : currentUser.monthlyBudget,
        userType: userTypeSelect ? userTypeSelect.value : currentUser.userType,
        currency: userCurrencySelect ? userCurrencySelect.value : currentUser.currency,
    };

    if (isNaN(updatedSettings.monthlyBudget) || updatedSettings.monthlyBudget < 0) {
        alert('Please enter a valid monthly budget.');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/users/settings`, { // Assuming PUT /api/users/settings updates all these
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updatedSettings)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save profile.');
        
        currentUser = { ...currentUser, ...data }; // Merge updated fields
        updateUILayout();
        await fetchExpenses(); // To update dashboard summary with new budget
        allUserExpenses = await fetchExpenses(true); // Update cache for calendar/analytics
        populateUserProfileForm(); // Re-populate with confirmed data
        alert('Profile saved successfully!');
        closeModal(userModal);
    } catch (err) {
        alert(err.message);
    }
}


// --- Expense Logic ---
async function handleAddExpense(e) {
    e.preventDefault();
    if (!currentUser) {
        alert('Please log in to add an expense.');
        openModal(authModal);
        return;
    }
    const token = localStorage.getItem('token');
    const amount = parseFloat(expenseAmountInput.value);
    const description = expenseDescriptionInput.value;
    const selectedCategoryOption = categorySelector ? categorySelector.querySelector('.category-option.selected') : null;
    const category = selectedCategoryOption ? selectedCategoryOption.dataset.category : 'other';
    const date = expenseDateInput.value ? new Date(expenseDateInput.value).toISOString() : new Date().toISOString();

    if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid amount.');
        return;
    }
    if (!description.trim()) {
        alert('Please enter a description.');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/expenses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ amount, description, category, date })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to add expense.');
        
        await fetchExpenses(); // Reload expenses to show the new one and update summary
        allUserExpenses = await fetchExpenses(true); // Update cache for calendar/analytics
        closeModal(expenseModal);
        if (expenseForm) expenseForm.reset();
    } catch (err) {
        alert(err.message);
    }
}


// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    // Initial check for user
    fetchUserDetails();

    // Auth Modal: Show Login/Signup Forms
    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', () => {
            if (loginForm) loginForm.classList.remove('hidden');
            if (signupForm) signupForm.classList.add('hidden');
            if (authModalTitle) authModalTitle.textContent = 'Login';
        });
    }
    if (showSignupBtn) {
        showSignupBtn.addEventListener('click', () => {
            if (loginForm) loginForm.classList.add('hidden');
            if (signupForm) signupForm.classList.remove('hidden');
            if (authModalTitle) authModalTitle.textContent = 'Sign Up';
        });
    }

    // Auth Modal: Form Submissions
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            handleLogin(email, password);
        });
    }
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('signupName').value;
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            handleSignup(name, email, password);
        });
    }
    
    // Auth Modal: Close Button
    if (closeAuthModalBtn) closeAuthModalBtn.addEventListener('click', () => closeModal(authModal));


    // User Profile (Avatar Click to Open User Modal)
    if (headerUserAvatar) { // Assuming clicking avatar opens user profile modal
        headerUserAvatar.addEventListener('click', () => {
            if (currentUser) {
                populateUserProfileForm();
                openModal(userModal);
            } else {
                openModal(authModal); // If no user, open auth modal
            }
        });
    }
     if (sidebarUserAvatarLarge) { 
        sidebarUserAvatarLarge.addEventListener('click', () => {
            if (currentUser) {
                populateUserProfileForm();
                openModal(userModal);
            } else {
                openModal(authModal);
            }
        });
    }


    // User Profile Modal: Save and Logout
    if (userForm) {
      userForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleSaveProfile();
      });
    }
    if (logoutFromUserModalBtn) logoutFromUserModalBtn.addEventListener('click', () => {
        closeModal(userModal); // Close profile modal first
        handleLogout();
    });
    if (closeUserModalBtn) closeUserModalBtn.addEventListener('click', () => closeModal(userModal));


    // Expense Modal: Open, Close, Submit, Category
    if (addExpenseBtnFAB) addExpenseBtnFAB.addEventListener('click', () => openModal(expenseModal));
    if (closeExpenseModalBtn) closeExpenseModalBtn.addEventListener('click', () => closeModal(expenseModal));
    if (cancelExpenseModalBtn) cancelExpenseModalBtn.addEventListener('click', () => closeModal(expenseModal));
    if (expenseForm) expenseForm.addEventListener('submit', handleAddExpense);

    if (categorySelector) {
        categorySelector.querySelectorAll('.category-option').forEach(option => {
            option.addEventListener('click', () => {
                categorySelector.querySelectorAll('.category-option').forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
            });

async function initializeCalendar(calendarEl) {
    // allUserExpenses should be populated by now
    if (!allUserExpenses || allUserExpenses.length === 0) {
        // Optionally, display a message in the calendarEl
        if (calendarEl) calendarEl.innerHTML = '<p>No expense data available to display on calendar.</p>';
        return; // Exit if no data
    }

    const expenseDates = allUserExpenses.map(exp => exp.date.split('T')[0]); // Get YYYY-MM-DD

    calendarEl._flatpickrInstance = flatpickr(calendarEl, {
        inline: true,
        dateFormat: "Y-m-d",
        onDayCreate: function(dObj, dStr, fp, dayElem) {
            // dStr is "YYYY-MM-DD"
            // Flatpickr's dateObj is already a JS Date object for the current day being rendered.
            // We need to format it to YYYY-MM-DD for comparison.
            const currentDayStr = dayElem.dateObj.getFullYear() + "-" + 
                                String(dayElem.dateObj.getMonth() + 1).padStart(2, '0') + "-" + 
                                String(dayElem.dateObj.getDate()).padStart(2, '0');
            if (expenseDates.includes(currentDayStr)) {
                dayElem.innerHTML += "<span class='event-dot'></span>"; // Add a dot for expenses
            }
        },
        onChange: function(selectedDates, dateStr, instance) {
            if (selectedDates.length > 0) {
                const selectedDateStr = selectedDates[0].getFullYear() + "-" + 
                                      String(selectedDates[0].getMonth() + 1).padStart(2, '0') + "-" + 
                                      String(selectedDates[0].getDate()).padStart(2, '0');
                const expensesOnSelectedDate = allUserExpenses.filter(
                    exp => exp.date.split('T')[0] === selectedDateStr
                );
                const calendarExpenseDisplay = document.getElementById('calendarExpenseDisplay');
                if (calendarExpenseDisplay) {
                    calendarExpenseDisplay.innerHTML = ''; // Clear previous
                    if (expensesOnSelectedDate.length > 0) {
                        const ul = document.createElement('ul');
                        expensesOnSelectedDate.forEach(exp => {
                            const li = document.createElement('li');
                            li.textContent = `${exp.description}: ₹${exp.amount.toFixed(2)} (${exp.category})`;
                            ul.appendChild(li);
                        });
                        calendarExpenseDisplay.appendChild(ul);
                    } else {
                        calendarExpenseDisplay.textContent = 'No expenses for this day.';
                    }
                }
            }
        }
    });
}

        });
    }
    
    // Initialize expense date to today
    if(expenseDateInput) expenseDateInput.valueAsDate = new Date();


    // Sidebar Navigation
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.addEventListener('click', (e) => {
            // The logout button in the new HTML is in userModal, not sidebar.
            // If a general sidebar logout is ever re-added, its ID needs to be handled here.
            // For now, all sidebar links are for section navigation.
            e.preventDefault();
            document.querySelectorAll('.sidebar-menu a').forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            const targetSectionClass = link.getAttribute('href').substring(1) + '-section';
            document.querySelectorAll('.content-section').forEach(section => {
                section.classList.toggle('hidden', !section.classList.contains(targetSectionClass));
            });

            if (targetSectionClass === 'settings-section') {
                // The new HTML has settings as a placeholder.
                // If it were to contain the budget form, we'd populate it.
                // For now, user settings (like budget) are in userModal.
                // If user clicks settings in sidebar, maybe open userModal?
                // openModal(userModal); // Or handle settings section differently
                populateUserProfileForm(); // If settings section has its own form elements
            }
            // Initialize Analytics Charts if it's the analytics section
            if (targetSectionClass === 'analytics-section') {
                renderAnalyticsCharts(); // renderAnalyticsCharts will handle if allUserExpenses is empty
            }
             // Initialize Flatpickr for calendar if it's the calendar section
            if (targetSectionClass === 'calendar-section' && typeof flatpickr !== 'undefined') {
                const calendarEl = document.getElementById('calendar');
                if (calendarEl) {
                    if (calendarEl._flatpickrInstance) {
                        calendarEl._flatpickrInstance.destroy();
                        calendarEl._flatpickrInstance = null;
                    }
                    initializeCalendar(calendarEl); // Always re-initialize with fresh data
                }
            }
        });
    });
     // Default to dashboard view
    const dashboardLink = document.querySelector('.sidebar-menu a[href="#dashboard"]');
    if (dashboardLink) dashboardLink.click();

    // Initialize Flatpickr for expense date input
    if (typeof flatpickr !== 'undefined' && expenseDateInput) {
        flatpickr(expenseDateInput, {
            dateFormat: "Y-m-d",
            defaultDate: "today"
        });
    }

    // Analytics Time Range Selector
    const timeRangeSelector = document.getElementById('timeRange');
    if (timeRangeSelector) {
        timeRangeSelector.addEventListener('change', () => {
            if (document.querySelector('.analytics-section').classList.contains('hidden') === false) {
                renderAnalyticsCharts(); // renderAnalyticsCharts will handle if allUserExpenses is empty
            }
        });
    }
});

function getDaysArray(start, end) {
    let arr = [];
    for(let dt = new Date(start); dt <= new Date(end); dt.setDate(dt.getDate()+1)){
        arr.push(new Date(dt).toISOString().split('T')[0]);
    }
    return arr;
}


function renderAnalyticsCharts() {
    if (!allUserExpenses) {
        console.log("Expenses data not available for charts.");
        return;
    }

    const timeRangeDays = parseInt(document.getElementById('timeRange')?.value || '30');
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - (timeRangeDays -1)); // -1 because we include endDate

    const filteredExpenses = allUserExpenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate >= startDate && expDate <= endDate;
    });

    // 1. Spending Trends (Line Chart)
    const spendingTrendData = {};
    const dateLabels = getDaysArray(startDate, endDate);

    dateLabels.forEach(date => spendingTrendData[date] = 0); // Initialize all days in range with 0

    filteredExpenses.forEach(exp => {
        const date = new Date(exp.date).toISOString().split('T')[0];
        if (spendingTrendData.hasOwnProperty(date)) {
            spendingTrendData[date] += exp.amount;
        }
    });
    
    const spendingChartCtx = document.getElementById('spendingChart')?.getContext('2d');
    if (spendingChartCtx) {
        if (spendingChartInstance) spendingChartInstance.destroy();
        spendingChartInstance = new Chart(spendingChartCtx, {
            type: 'line',
            data: {
                labels: dateLabels.map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
                datasets: [{
                    label: 'Daily Spending',
                    data: Object.values(spendingTrendData),
                    borderColor: 'var(--primary)',
                    tension: 0.1,
                    fill: false
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    // 2. Category Breakdown (Doughnut Chart)
    const categoryData = {};
    filteredExpenses.forEach(exp => {
        categoryData[exp.category] = (categoryData[exp.category] || 0) + exp.amount;
    });
    const categoryChartCtx = document.getElementById('categoryChart')?.getContext('2d');
    if (categoryChartCtx) {
        if (categoryChartInstance) categoryChartInstance.destroy();
        categoryChartInstance = new Chart(categoryChartCtx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(categoryData),
                datasets: [{
                    data: Object.values(categoryData),
                    backgroundColor: ['#4a6bff', '#ff6b6b', '#ffc107', '#28a745', '#6f42c1', '#fd7e14', '#20c997'] // Add more colors
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    // 3. Monthly Comparison (Bar Chart - Simplified to current period's category spending)
    // For a true monthly comparison, you'd need to group by month over time.
    // This simplified version shows category spending for the selected period.
    const monthlyCompChartCtx = document.getElementById('monthlyComparisonChart')?.getContext('2d');
    if (monthlyCompChartCtx) {
        if (monthlyComparisonChartInstance) monthlyComparisonChartInstance.destroy();
        monthlyComparisonChartInstance = new Chart(monthlyCompChartCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(categoryData), // Same as category breakdown for this simplified version
                datasets: [{
                    label: `Spending by Category (Last ${timeRangeDays} Days)`,
                    data: Object.values(categoryData),
                    backgroundColor: '#66bb6a' // Example color
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y' }
        });
    }
}
