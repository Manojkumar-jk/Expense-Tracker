const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');

// Load environment variables from .env file
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Environment variables for security
const SESSION_SECRET = process.env.SESSION_SECRET || 'your_secure_session_secret_change_in_production';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'personal_dashboard';

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(__dirname));

// Enhanced session configuration
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  },
  name: 'sessionId' // Change default session name
}));

// Input validation middleware
const validateInput = (req, res, next) => {
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return '';
    return str.trim().replace(/[<>]/g, '');
  };

  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeString(req.body[key]);
      }
    });
  }
  next();
};

// --- Auth Middleware ---
const authRequired = (req, res, next) => {
  if (req.session && req.session.userId) {
    next();
  } else {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    return res.redirect('/login.html');
  }
};

// Public paths that don't require authentication
const publicPaths = [
  '/login.html', 
  '/register.html', 
  '/api/login', 
  '/api/register', 
  '/style.css', 
  '/main.js',
  '/favicon.ico'
];

// Improved authentication middleware
app.use((req, res, next) => {
  const isPublicPath = publicPaths.includes(req.path) || 
                      req.path.startsWith('/api/') && 
                      (req.method === 'POST' && (req.path === '/api/login' || req.path === '/api/register'));
  
  if (isPublicPath) {
    return next();
  }
  
  if (!req.session.userId) {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    return res.redirect('/login.html');
  }
  
  next();
});

// --- Database Connection with Error Handling ---
const connection = mysql.createConnection({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  charset: 'utf8mb4',
  timeout: 60000
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    process.exit(1); // Exit if database connection fails
  }
  console.log('Connected to MySQL successfully!');
});

// Handle database connection errors
connection.on('error', (err) => {
  console.error('Database error:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('Database connection was closed. Reconnecting...');
    connection.connect();
  } else {
    throw err;
  }
});

// Database query wrapper with error handling
const dbQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    connection.query(query, params, (err, results) => {
      if (err) {
        console.error('Database query error:', err);
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
};

// --- Registration Endpoint with Validation ---
app.post('/api/register', validateInput, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Input validation
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    if (username.length < 3 || username.length > 50) {
      return res.status(400).json({ error: 'Username must be between 3 and 50 characters' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    // Check if username already exists
    const existingUser = await dbQuery('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    const hash = await bcrypt.hash(password, 12);
    const result = await dbQuery('INSERT INTO users (username, password) VALUES (?, ?)', [username, hash]);
    
    res.json({ success: true, message: 'User registered successfully' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Login Endpoint with Validation ---
app.post('/api/login', validateInput, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const results = await dbQuery('SELECT * FROM users WHERE username = ?', [username]);
    if (results.length === 0) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }
    
    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }
    
    req.session.userId = user.id;
    req.session.username = user.username;
    
    res.json({ success: true, message: 'Login successful' });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Logout Endpoint ---
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true, message: 'Logout successful' });
  });
});

// --- Create default user 'prajwal' with password '1234' if not exists ---
(async () => {
  try {
    const username = 'prajwal';
    const password = '1234';
    const existingUser = await dbQuery('SELECT * FROM users WHERE username = ?', [username]);
    if (existingUser.length === 0) {
      const hash = await bcrypt.hash(password, 12);
      await dbQuery('INSERT INTO users (username, password) VALUES (?, ?)', [username, hash]);
      console.log("Default user 'prajwal' created with password '1234'");
    }
  } catch (err) {
    console.error('Error creating default user:', err);
  }
})();

// --- Daily Routine with Error Handling ---
app.get('/api/routines', authRequired, async (req, res) => {
  try {
    // Try to order by created field, fallback to id if it doesn't exist
    let routines;
    try {
      routines = await dbQuery('SELECT * FROM daily_routine WHERE user_id = ? ORDER BY created DESC', [req.session.userId]);
    } catch (err) {
      // Fallback if created field doesn't exist
      routines = await dbQuery('SELECT * FROM daily_routine WHERE user_id = ? ORDER BY id DESC', [req.session.userId]);
    }
    res.json({ routines });
  } catch (err) {
    console.error('Error fetching routines:', err);
    res.status(500).json({ error: 'Failed to fetch routines' });
  }
});

app.post('/api/routines', authRequired, validateInput, async (req, res) => {
  try {
    const { task, time } = req.body;
    
    if (!task || task.trim().length === 0) {
      return res.status(400).json({ error: 'Task is required' });
    }
    
    const result = await dbQuery(
      'INSERT INTO daily_routine (task, completed, time, user_id) VALUES (?, ?, ?, ?)', 
      [task.trim(), false, time || null, req.session.userId]
    );
    
    res.json({ 
      id: result.insertId, 
      task: task.trim(), 
      completed: false, 
      time: time || null 
    });
  } catch (err) {
    console.error('Error creating routine:', err);
    res.status(500).json({ error: 'Failed to create routine' });
  }
});

app.put('/api/routines/:id', authRequired, validateInput, async (req, res) => {
  try {
    const { task, completed, time } = req.body;
    const routineId = parseInt(req.params.id);
    
    if (!task || task.trim().length === 0) {
      return res.status(400).json({ error: 'Task is required' });
    }
    
    const result = await dbQuery(
      'UPDATE daily_routine SET task=?, completed=?, time=? WHERE id=? AND user_id=?', 
      [task.trim(), completed, time || null, routineId, req.session.userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Routine not found' });
    }
    
    res.json({ success: true, message: 'Routine updated successfully' });
  } catch (err) {
    console.error('Error updating routine:', err);
    res.status(500).json({ error: 'Failed to update routine' });
  }
});

app.delete('/api/routines/:id', authRequired, async (req, res) => {
  try {
    const routineId = parseInt(req.params.id);
    const result = await dbQuery(
      'DELETE FROM daily_routine WHERE id=? AND user_id=?', 
      [routineId, req.session.userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Routine not found' });
    }
    
    res.json({ success: true, message: 'Routine deleted successfully' });
  } catch (err) {
    console.error('Error deleting routine:', err);
    res.status(500).json({ error: 'Failed to delete routine' });
  }
});

// --- Expenses with Error Handling ---
app.get('/api/expenses', authRequired, async (req, res) => {
  try {
    const expenses = await dbQuery('SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC', [req.session.userId]);
    const currentSpent = expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
    
    // Get user's monthly budget from budget table or use default
    let monthlyBudget = 500; // Default budget
    try {
      const budgetResult = await dbQuery('SELECT monthly_budget FROM user_budgets WHERE user_id = ?', [req.session.userId]);
      if (budgetResult.length > 0) {
        monthlyBudget = parseFloat(budgetResult[0].monthly_budget);
      }
    } catch (err) {
      console.log('Using default budget for user:', req.session.userId);
    }
    
    res.json({ expenses, currentSpent, monthlyBudget });
  } catch (err) {
    console.error('Error fetching expenses:', err);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

app.post('/api/expenses', authRequired, validateInput, async (req, res) => {
  try {
    const { description, amount, date, category } = req.body;
    
    if (!description || description.trim().length === 0) {
      return res.status(400).json({ error: 'Description is required' });
    }
    
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }
    
    const result = await dbQuery(
      'INSERT INTO expenses (description, amount, date, category, user_id) VALUES (?, ?, ?, ?, ?)', 
      [description.trim(), parseFloat(amount), date || new Date().toISOString().split('T')[0], category || 'General', req.session.userId]
    );
    
    res.json({ 
      id: result.insertId, 
      description: description.trim(), 
      amount: parseFloat(amount), 
      date: date || new Date().toISOString().split('T')[0], 
      category: category || 'General' 
    });
  } catch (err) {
    console.error('Error creating expense:', err);
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

app.put('/api/expenses/:id', authRequired, validateInput, async (req, res) => {
  try {
    const { description, amount, date, category } = req.body;
    const expenseId = parseInt(req.params.id);
    
    if (!description || description.trim().length === 0) {
      return res.status(400).json({ error: 'Description is required' });
    }
    
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }
    
    const result = await dbQuery(
      'UPDATE expenses SET description=?, amount=?, date=?, category=? WHERE id=? AND user_id=?', 
      [description.trim(), parseFloat(amount), date, category || 'General', expenseId, req.session.userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    
    res.json({ success: true, message: 'Expense updated successfully' });
  } catch (err) {
    console.error('Error updating expense:', err);
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

app.delete('/api/expenses/:id', authRequired, async (req, res) => {
  try {
    const expenseId = parseInt(req.params.id);
    const result = await dbQuery(
      'DELETE FROM expenses WHERE id=? AND user_id=?', 
      [expenseId, req.session.userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    
    res.json({ success: true, message: 'Expense deleted successfully' });
  } catch (err) {
    console.error('Error deleting expense:', err);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

// --- Budget Management ---
app.get('/api/budget', authRequired, async (req, res) => {
  try {
    const budgetResult = await dbQuery('SELECT monthly_budget FROM user_budgets WHERE user_id = ?', [req.session.userId]);
    const monthlyBudget = budgetResult.length > 0 ? parseFloat(budgetResult[0].monthly_budget) : 500;
    res.json({ monthlyBudget });
  } catch (err) {
    console.error('Error fetching budget:', err);
    res.status(500).json({ error: 'Failed to fetch budget' });
  }
});

app.put('/api/budget', authRequired, validateInput, async (req, res) => {
  try {
    const { monthlyBudget } = req.body;
    
    if (!monthlyBudget || isNaN(parseFloat(monthlyBudget)) || parseFloat(monthlyBudget) <= 0) {
      return res.status(400).json({ error: 'Valid monthly budget is required' });
    }
    
    // Try to update existing budget, if not exists then insert
    const result = await dbQuery(
      'INSERT INTO user_budgets (user_id, monthly_budget) VALUES (?, ?) ON DUPLICATE KEY UPDATE monthly_budget = ?',
      [req.session.userId, parseFloat(monthlyBudget), parseFloat(monthlyBudget)]
    );
    
    res.json({ success: true, message: 'Budget updated successfully', monthlyBudget: parseFloat(monthlyBudget) });
  } catch (err) {
    console.error('Error updating budget:', err);
    res.status(500).json({ error: 'Failed to update budget' });
  }
});

// --- Notes with Error Handling ---
app.get('/api/notes', authRequired, async (req, res) => {
  try {
    const notes = await dbQuery('SELECT * FROM notes WHERE user_id = ? ORDER BY created DESC', [req.session.userId]);
    res.json({ notes });
  } catch (err) {
    console.error('Error fetching notes:', err);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

app.post('/api/notes', authRequired, validateInput, async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Note content is required' });
    }
    
    const result = await dbQuery(
      'INSERT INTO notes (content, user_id) VALUES (?, ?)', 
      [content.trim(), req.session.userId]
    );
    
    res.json({ id: result.insertId, content: content.trim() });
  } catch (err) {
    console.error('Error creating note:', err);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

app.put('/api/notes/:id', authRequired, validateInput, async (req, res) => {
  try {
    const { content } = req.body;
    const noteId = parseInt(req.params.id);
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Note content is required' });
    }
    
    const result = await dbQuery(
      'UPDATE notes SET content=? WHERE id=? AND user_id=?', 
      [content.trim(), noteId, req.session.userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    res.json({ success: true, message: 'Note updated successfully' });
  } catch (err) {
    console.error('Error updating note:', err);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

app.delete('/api/notes/:id', authRequired, async (req, res) => {
  try {
    const noteId = parseInt(req.params.id);
    const result = await dbQuery(
      'DELETE FROM notes WHERE id=? AND user_id=?', 
      [noteId, req.session.userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    res.json({ success: true, message: 'Note deleted successfully' });
  } catch (err) {
    console.error('Error deleting note:', err);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// --- Todos with Error Handling ---
app.get('/api/todos', authRequired, async (req, res) => {
  try {
    const todos = await dbQuery('SELECT * FROM todos WHERE user_id = ? ORDER BY created DESC', [req.session.userId]);
    res.json({ todos });
  } catch (err) {
    console.error('Error fetching todos:', err);
    res.status(500).json({ error: 'Failed to fetch todos' });
  }
});

app.post('/api/todos', authRequired, validateInput, async (req, res) => {
  try {
    const { task } = req.body;
    
    if (!task || task.trim().length === 0) {
      return res.status(400).json({ error: 'Task is required' });
    }
    
    const result = await dbQuery(
      'INSERT INTO todos (task, completed, user_id) VALUES (?, ?, ?)', 
      [task.trim(), false, req.session.userId]
    );
    
    res.json({ id: result.insertId, task: task.trim(), completed: false });
  } catch (err) {
    console.error('Error creating todo:', err);
    res.status(500).json({ error: 'Failed to create todo' });
  }
});

app.put('/api/todos/:id', authRequired, validateInput, async (req, res) => {
  try {
    const { task, completed } = req.body;
    const todoId = parseInt(req.params.id);
    
    if (!task || task.trim().length === 0) {
      return res.status(400).json({ error: 'Task is required' });
    }
    
    const result = await dbQuery(
      'UPDATE todos SET task=?, completed=? WHERE id=? AND user_id=?', 
      [task.trim(), completed, todoId, req.session.userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    
    res.json({ success: true, message: 'Todo updated successfully' });
  } catch (err) {
    console.error('Error updating todo:', err);
    res.status(500).json({ error: 'Failed to update todo' });
  }
});

app.delete('/api/todos/:id', authRequired, async (req, res) => {
  try {
    const todoId = parseInt(req.params.id);
    const result = await dbQuery(
      'DELETE FROM todos WHERE id=? AND user_id=?', 
      [todoId, req.session.userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    
    res.json({ success: true, message: 'Todo deleted successfully' });
  } catch (err) {
    console.error('Error deleting todo:', err);
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

// --- Split Bills with Error Handling ---
app.get('/api/bills', authRequired, async (req, res) => {
  try {
    const bills = await dbQuery('SELECT * FROM split_bills WHERE user_id = ? ORDER BY date DESC', [req.session.userId]);
    const formattedBills = bills.map(bill => ({
      ...bill,
      totalAmount: parseFloat(bill.total_amount),
      splitBetween: bill.split_between,
      amountPerPerson: parseFloat(bill.amount_per_person),
      friends: bill.friends ? JSON.parse(bill.friends) : []
    }));
    res.json({ bills: formattedBills });
  } catch (err) {
    console.error('Error fetching bills:', err);
    res.status(500).json({ error: 'Failed to fetch bills' });
  }
});

app.post('/api/bills', authRequired, validateInput, async (req, res) => {
  try {
    const { description, totalAmount, splitBetween, date, friends } = req.body;
    
    if (!description || description.trim().length === 0) {
      return res.status(400).json({ error: 'Description is required' });
    }
    
    if (!totalAmount || isNaN(parseFloat(totalAmount)) || parseFloat(totalAmount) <= 0) {
      return res.status(400).json({ error: 'Valid total amount is required' });
    }
    
    if (!splitBetween || !Number.isInteger(splitBetween) || splitBetween <= 0) {
      return res.status(400).json({ error: 'Valid split count is required' });
    }
    
    const amountPerPerson = totalAmount / splitBetween;
    
    const result = await dbQuery(
      'INSERT INTO split_bills (description, total_amount, split_between, amount_per_person, date, friends, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [description.trim(), parseFloat(totalAmount), splitBetween, amountPerPerson, date || new Date().toISOString().split('T')[0], JSON.stringify(friends || []), req.session.userId]
    );
    
    res.json({
      id: result.insertId,
      description: description.trim(),
      totalAmount: parseFloat(totalAmount),
      splitBetween,
      amountPerPerson,
      date: date || new Date().toISOString().split('T')[0],
      friends: friends || []
    });
  } catch (err) {
    console.error('Error creating bill:', err);
    res.status(500).json({ error: 'Failed to create bill' });
  }
});

app.delete('/api/bills/:id', authRequired, async (req, res) => {
  try {
    const billId = parseInt(req.params.id);
    const result = await dbQuery(
      'DELETE FROM split_bills WHERE id=? AND user_id=?', 
      [billId, req.session.userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    
    res.json({ success: true, message: 'Bill deleted successfully' });
  } catch (err) {
    console.error('Error deleting bill:', err);
    res.status(500).json({ error: 'Failed to delete bill' });
  }
});

// --- Meal Planner with Error Handling ---
app.get('/api/meals', authRequired, async (req, res) => {
  try {
    const meals = await dbQuery('SELECT * FROM meals WHERE user_id = ? ORDER BY day ASC', [req.session.userId]);
    const weeklyMeals = {};
    meals.forEach(row => {
      if (!weeklyMeals[row.day]) weeklyMeals[row.day] = {};
      weeklyMeals[row.day][row.meal_type] = row.meal;
    });
    res.json({ weeklyMeals });
  } catch (err) {
    console.error('Error fetching meals:', err);
    res.status(500).json({ error: 'Failed to fetch meals' });
  }
});

app.put('/api/meals', authRequired, validateInput, async (req, res) => {
  try {
    const { weeklyMeals } = req.body;
    
    if (!weeklyMeals || typeof weeklyMeals !== 'object') {
      return res.status(400).json({ error: 'Invalid weeklyMeals format' });
    }
    
    const day = Object.keys(weeklyMeals)[0];
    const mealTypes = Object.keys(weeklyMeals[day]);
    const mealType = mealTypes[0];
    const meal = weeklyMeals[day][mealType];
    
    if (!day || !mealType || !meal) {
      return res.status(400).json({ error: 'Day, meal type, and meal are required' });
    }
    
    const result = await dbQuery(
      'INSERT INTO meals (day, meal_type, meal, user_id) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE meal=?',
      [day, mealType, meal.trim(), req.session.userId, meal.trim()]
    );
    
    res.json({ success: true, message: 'Meal updated successfully' });
  } catch (err) {
    console.error('Error updating meal:', err);
    res.status(500).json({ error: 'Failed to update meal' });
  }
});

// --- Error handling middleware ---
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// --- 404 handler ---
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'API endpoint not found' });
  } else {
    res.status(404).sendFile(path.join(__dirname, 'login.html'));
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  connection.end((err) => {
    if (err) {
      console.error('Error closing database connection:', err);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log('Environment:', process.env.NODE_ENV || 'development');
}); 