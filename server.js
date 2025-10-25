const express = require('express');
const session = require('express-session');
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
  message: 'Too many requests from this IP, please try again later.'
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

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Database initialization
initDatabase();


// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
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
  db.get('SELECT * FROM guest_sessions WHERE id = ?', [guestId], (err, row) => {
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
    db.get('SELECT id FROM users WHERE username = ? OR email = ?', [username, email], async (err, row) => {
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

    db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, username], async (err, user) => {
      if (err) {
        console.error('Database error during login:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Update last login
      db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

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
  
  db.run('INSERT INTO guest_sessions (id) VALUES (?)', [guestId], function(err) {
    if (err) {
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
  
  db.get(
    'SELECT data_content FROM user_data WHERE user_id = ? AND data_type = ? ORDER BY updated_at DESC LIMIT 1',
    [userId, dataType],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (row) {
        res.json({ data: JSON.parse(row.data_content) });
      } else {
        res.json({ data: null });
      }
    }
  );
});

// Save user data
app.post('/api/user/data/:dataType', authenticateToken, (req, res) => {
  const { dataType } = req.params;
  const userId = req.user.userId;
  const dataContent = JSON.stringify(req.body);
  
  db.run(
    'INSERT OR REPLACE INTO user_data (user_id, data_type, data_content, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
    [userId, dataType, dataContent],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to save data' });
      }
      
      res.json({ message: 'Data saved successfully' });
    }
  );
});

// Guest data endpoints
app.get('/api/guest/data/:dataType', authenticateGuest, (req, res) => {
  const { dataType } = req.params;
  const guestId = req.guestId;
  
  db.get('SELECT data FROM guest_sessions WHERE id = ?', [guestId], (err, row) => {
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
  
  db.get('SELECT data FROM guest_sessions WHERE id = ?', [guestId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    let guestData = {};
    if (row && row.data) {
      guestData = JSON.parse(row.data);
    }
    
    guestData[dataType] = req.body;
    
    db.run(
      'UPDATE guest_sessions SET data = ?, last_activity = CURRENT_TIMESTAMP WHERE id = ?',
      [JSON.stringify(guestData), guestId],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to save guest data' });
        }
        
        res.json({ message: 'Guest data saved successfully' });
      }
    );
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
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Database connection closed');
    process.exit(0);
  });
});

module.exports = app;
