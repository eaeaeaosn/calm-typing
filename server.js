const express = require('express');
const session = require('cookie-session');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { db, initDatabase } = require('./database');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.deepseek.com"]
    }
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Trust proxy for Render deployment
  trustProxy: true
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-render-app.onrender.com'] // Replace with your Render URL
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session configuration - DISABLED for JWT-only authentication
// app.use(session({
//   secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
//   resave: false,
//   saveUninitialized: false,
//   cookie: {
//     secure: process.env.NODE_ENV === 'production',
//     httpOnly: true,
//     maxAge: 24 * 60 * 60 * 1000 // 24 hours
//   }
// }));

// Database initialization
initDatabase();


// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('🔐 JWT Auth Debug:');
  console.log('  - Auth header:', authHeader);
  console.log('  - Token:', token ? `${token.substring(0, 20)}...` : 'None');
  console.log('  - User-Agent:', req.headers['user-agent']);

  if (!token) {
    console.log('  ❌ No token provided');
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret', (err, user) => {
    if (err) {
      console.log('  ❌ Token verification failed:', err.message);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    console.log('  ✅ Token verified for user:', user.userId, user.username);
    req.user = user;
    next();
  });
};

// Guest authentication middleware
const authenticateGuest = (req, res, next) => {
  const guestId = req.headers['x-guest-id'];
  
  if (!guestId) {
    return res.status(401).json({ error: 'Guest session ID required' });
  }
  
  // Verify guest session exists
  const guestCheckQuery = process.env.NODE_ENV === 'production' 
    ? 'SELECT * FROM guest_sessions WHERE id = $1'
    : 'SELECT * FROM guest_sessions WHERE id = ?';
  
  db.get(guestCheckQuery, [guestId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(401).json({ error: 'Invalid guest session' });
    }
    req.guestId = guestId;
    next();
  });
};

// Serve static files
app.use(express.static(path.join(__dirname, '.')));

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Database test endpoint
app.get('/api/test-db', (req, res) => {
  db.get('SELECT NOW() as current_time', [], (err, result) => {
    if (err) {
      console.error('Database test error:', err);
      return res.status(500).json({ error: 'Database connection failed', details: err.message });
    }
    res.json({ 
      status: 'Database connected', 
      current_time: result.current_time,
      timestamp: new Date().toISOString()
    });
  });
});

// Helper function to format timestamps to St. Louis timezone
const formatStLouisTime = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

// Admin endpoint to view users (for development/testing)
app.get('/api/admin/users', (req, res) => {
  db.all('SELECT id, username, email, is_guest, created_at, last_login FROM users ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Format timestamps to St. Louis timezone
    const formattedRows = rows.map(row => ({
      ...row,
      created_at: formatStLouisTime(row.created_at),
      last_login: formatStLouisTime(row.last_login)
    }));
    
    res.json({ 
      users: formattedRows,
      total: rows.length,
      timestamp: new Date().toLocaleString('en-US', {
        timeZone: 'America/Chicago',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }),
      timezone: 'America/Chicago (St. Louis)'
    });
  });
});

// Admin endpoint to view guest sessions
app.get('/api/admin/guests', (req, res) => {
  db.all('SELECT id, created_at, last_activity FROM guest_sessions ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Format timestamps to St. Louis timezone
    const formattedRows = rows.map(row => ({
      ...row,
      created_at: formatStLouisTime(row.created_at),
      last_activity: formatStLouisTime(row.last_activity)
    }));
    
    res.json({ 
      guests: formattedRows,
      total: rows.length,
      timestamp: new Date().toLocaleString('en-US', {
        timeZone: 'America/Chicago',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }),
      timezone: 'America/Chicago (St. Louis)'
    });
  });
});

// User registration
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const checkQuery = process.env.NODE_ENV === 'production' 
      ? 'SELECT id FROM users WHERE username = $1 OR email = $2'
      : 'SELECT id FROM users WHERE username = ? OR email = ?';
    
    db.get(checkQuery, [username, email], async (err, row) => {
      if (err) {
        console.error('Database error during user check:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (row) {
        return res.status(409).json({ error: 'Username or email already exists' });
      }

      // Hash password and create user
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      
      // Generate a unique ID for the user
      const userId = uuidv4();
      
      // Use a different approach for PostgreSQL
      const insertQuery = process.env.NODE_ENV === 'production' 
        ? 'INSERT INTO users (id, username, email, password_hash) VALUES ($1, $2, $3, $4)'
        : 'INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)';
      
      const insertParams = process.env.NODE_ENV === 'production'
        ? [userId, username, email, passwordHash]
        : [userId, username, email, passwordHash];
      
      db.run(insertQuery, insertParams, function(err) {
        if (err) {
          console.error('Database error during user creation:', err);
          return res.status(500).json({ error: 'Failed to create user' });
        }
        
        const token = jwt.sign(
          { userId: userId, username, email },
          process.env.JWT_SECRET || 'your-jwt-secret',
          { expiresIn: '24h' }
        );
        
        res.json({ 
          message: 'User created successfully',
          token,
          user: { id: userId, username, email }
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// User login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const loginQuery = process.env.NODE_ENV === 'production' 
      ? 'SELECT * FROM users WHERE username = $1 OR email = $1'
      : 'SELECT * FROM users WHERE username = ? OR email = ?';
    
    db.get(loginQuery, [username, username], async (err, user) => {
      if (err) {
        console.error('Database error during login:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      console.log('Login attempt for:', username);
      console.log('Query result:', user ? 'User found' : 'No user found');
      console.log('User data:', user ? { id: user.id, username: user.username, email: user.email } : 'None');
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Update last login
      const updateQuery = process.env.NODE_ENV === 'production' 
        ? 'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1'
        : 'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?';
      
      db.run(updateQuery, [user.id]);

      const token = jwt.sign(
        { userId: user.id, username: user.username, email: user.email },
        process.env.JWT_SECRET || 'your-jwt-secret',
        { expiresIn: '24h' }
      );
      
      res.json({ 
        message: 'Login successful',
        token,
        user: { id: user.id, username: user.username, email: user.email }
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create guest session
app.post('/api/auth/guest', (req, res) => {
  const guestId = uuidv4();
  
  const insertQuery = process.env.NODE_ENV === 'production' 
    ? 'INSERT INTO guest_sessions (id) VALUES ($1)'
    : 'INSERT INTO guest_sessions (id) VALUES (?)';
  
  db.run(insertQuery, [guestId], function(err) {
    if (err) {
      console.error('Guest session creation error:', err);
      return res.status(500).json({ error: 'Failed to create guest session' });
    }
    
    res.json({ 
      message: 'Guest session created',
      guestId,
      expiresIn: '24h'
    });
  });
});

// Get user data
app.get('/api/user/data/:dataType', authenticateToken, (req, res) => {
  const { dataType } = req.params;
  const userId = req.user.userId;
  
  console.log('📖 Loading user data:');
  console.log('  - User ID:', userId);
  console.log('  - Data type:', dataType);
  
  const selectQuery = process.env.NODE_ENV === 'production' 
    ? 'SELECT data_content FROM user_data WHERE user_id = $1 AND data_type = $2 ORDER BY updated_at DESC LIMIT 1'
    : 'SELECT data_content FROM user_data WHERE user_id = ? AND data_type = ? ORDER BY updated_at DESC LIMIT 1';
  
  db.get(selectQuery, [userId, dataType], (err, row) => {
    if (err) {
      console.error('❌ User data retrieval error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (row) {
      console.log('✅ User data found for user:', userId);
      res.json({ data: JSON.parse(row.data_content) });
    } else {
      console.log('ℹ️ No data found for user:', userId);
      res.json({ data: null });
    }
  });
});

// Save user data
app.post('/api/user/data/:dataType', authenticateToken, (req, res) => {
  const { dataType } = req.params;
  const userId = req.user.userId;
  const dataContent = JSON.stringify(req.body);
  
  console.log('💾 Saving user data:');
  console.log('  - User ID:', userId);
  console.log('  - Data type:', dataType);
  console.log('  - Data content length:', dataContent.length);
  
  const insertQuery = process.env.NODE_ENV === 'production' 
    ? 'INSERT INTO user_data (user_id, data_type, data_content, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) ON CONFLICT (user_id, data_type) DO UPDATE SET data_content = EXCLUDED.data_content, updated_at = CURRENT_TIMESTAMP'
    : 'INSERT OR REPLACE INTO user_data (user_id, data_type, data_content, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)';
  
  db.run(insertQuery, [userId, dataType, dataContent], function(err) {
    if (err) {
      console.error('❌ User data save error:', err);
      return res.status(500).json({ error: 'Failed to save data' });
    }
    
    console.log('✅ User data saved successfully for user:', userId);
    res.json({ message: 'Data saved successfully' });
  });
});

// Guest data endpoints
app.get('/api/guest/data/:dataType', authenticateGuest, (req, res) => {
  const { dataType } = req.params;
  const guestId = req.guestId;
  
  const guestDataQuery = process.env.NODE_ENV === 'production' 
  ? 'SELECT data FROM guest_sessions WHERE id = $1'
  : 'SELECT data FROM guest_sessions WHERE id = ?';

db.get(guestDataQuery, [guestId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (row && row.data) {
      const guestData = JSON.parse(row.data);
      res.json({ data: guestData[dataType] || null });
    } else {
      res.json({ data: null });
    }
  });
});

app.post('/api/guest/data/:dataType', authenticateGuest, (req, res) => {
  const { dataType } = req.params;
  const guestId = req.guestId;
  
  const guestDataQuery = process.env.NODE_ENV === 'production' 
  ? 'SELECT data FROM guest_sessions WHERE id = $1'
  : 'SELECT data FROM guest_sessions WHERE id = ?';

db.get(guestDataQuery, [guestId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    let guestData = {};
    if (row && row.data) {
      guestData = JSON.parse(row.data);
    }
    
    guestData[dataType] = req.body;
    
    const updateQuery = process.env.NODE_ENV === 'production' 
      ? 'UPDATE guest_sessions SET data = $1, last_activity = CURRENT_TIMESTAMP WHERE id = $2'
      : 'UPDATE guest_sessions SET data = ?, last_activity = CURRENT_TIMESTAMP WHERE id = ?';
    
    db.run(updateQuery, [JSON.stringify(guestData), guestId], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to save guest data' });
        }
        
        res.json({ message: 'Guest data saved successfully' });
      }
    );
  });
});

// User history endpoints
app.get('/api/user/history', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  
  const selectQuery = process.env.NODE_ENV === 'production' 
    ? 'SELECT * FROM typing_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100'
    : 'SELECT * FROM typing_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 100';
  
  db.all(selectQuery, [userId], (err, rows) => {
    if (err) {
      console.error('User history retrieval error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Format the history data
    const history = rows.map(row => ({
      id: row.id,
      text: row.text,
      timestamp: row.created_at,
      wordCount: row.text.split(' ').length,
      wpm: row.wpm,
      accuracy: row.accuracy
    }));
    
    res.json({ history });
  });
});

app.post('/api/user/history', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { text, timestamp, wordCount } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }
  
  const insertQuery = process.env.NODE_ENV === 'production' 
    ? 'INSERT INTO typing_history (user_id, text, created_at) VALUES ($1, $2, $3)'
    : 'INSERT INTO typing_history (user_id, text, created_at) VALUES (?, ?, ?)';
  
  const createdAt = timestamp || new Date().toISOString();
  
  db.run(insertQuery, [userId, text, createdAt], function(err) {
    if (err) {
      console.error('User history save error:', err);
      return res.status(500).json({ error: 'Failed to save history' });
    }
    
    res.json({ 
      message: 'History saved successfully',
      id: this.lastID
    });
  });
});

// Guest history endpoints
app.get('/api/guest/history', authenticateGuest, (req, res) => {
  const guestId = req.guestId;
  
  const selectQuery = process.env.NODE_ENV === 'production' 
    ? 'SELECT * FROM typing_history WHERE guest_id = $1 ORDER BY created_at DESC LIMIT 100'
    : 'SELECT * FROM typing_history WHERE guest_id = ? ORDER BY created_at DESC LIMIT 100';
  
  db.all(selectQuery, [guestId], (err, rows) => {
    if (err) {
      console.error('Guest history retrieval error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Format the history data
    const history = rows.map(row => ({
      id: row.id,
      text: row.text,
      timestamp: row.created_at,
      wordCount: row.text.split(' ').length,
      wpm: row.wpm,
      accuracy: row.accuracy
    }));
    
    res.json({ history });
  });
});

app.post('/api/guest/history', authenticateGuest, (req, res) => {
  const guestId = req.guestId;
  const { text, timestamp, wordCount } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }
  
  const insertQuery = process.env.NODE_ENV === 'production' 
    ? 'INSERT INTO typing_history (guest_id, text, created_at) VALUES ($1, $2, $3)'
    : 'INSERT INTO typing_history (guest_id, text, created_at) VALUES (?, ?, ?)';
  
  const createdAt = timestamp || new Date().toISOString();
  
  db.run(insertQuery, [guestId, text, createdAt], function(err) {
    if (err) {
      console.error('Guest history save error:', err);
      return res.status(500).json({ error: 'Failed to save history' });
    }
    
    res.json({ 
      message: 'History saved successfully',
      id: this.lastID
    });
  });
});

// Authentication is now handled by the modal in index.html
// No separate auth.html file needed

// Serve the main application
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  if (process.env.NODE_ENV === 'production') {
    // PostgreSQL - end the pool
    db.end(() => {
      console.log('PostgreSQL pool closed');
      process.exit(0);
    });
  } else {
    // SQLite - close the database
    db.close((err) => {
      if (err) {
        console.error(err.message);
      }
      console.log('SQLite database connection closed');
      process.exit(0);
    });
  }
});

module.exports = app;
