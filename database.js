const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');

// Database configuration
const isProduction = process.env.NODE_ENV === 'production';
let db;

if (isProduction && process.env.DATABASE_URL) {
  // Production: Use PostgreSQL
  console.log('Using PostgreSQL database');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  db = {
    // Wrap PostgreSQL pool methods to match SQLite interface
    get: (query, params, callback) => {
      pool.query(query, params, (err, result) => {
        if (err) return callback(err);
        callback(null, result.rows[0] || null);
      });
    },
    
    all: (query, params, callback) => {
      pool.query(query, params, (err, result) => {
        if (err) return callback(err);
        callback(null, result.rows);
      });
    },
    
    run: (query, params, callback) => {
      pool.query(query, params, (err, result) => {
        if (err) return callback(err);
        callback(null, { lastID: result.insertId, changes: result.rowCount });
      });
    },
    
    exec: (query, callback) => {
      pool.query(query, (err, result) => {
        if (err) return callback(err);
        callback(null);
      });
    }
  };
} else {
  // Development: Use SQLite
  console.log('Using SQLite database');
  db = new sqlite3.Database('./database.sqlite');
}

// Initialize database tables
const initDatabase = () => {
  const createTables = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      is_guest BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS guest_sessions (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS typing_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      guest_id TEXT,
      text TEXT NOT NULL,
      wpm INTEGER,
      accuracy REAL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (guest_id) REFERENCES guest_sessions(id)
    );
    
    CREATE TABLE IF NOT EXISTS user_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      guest_id TEXT,
      settings TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (guest_id) REFERENCES guest_sessions(id)
    );
  `;

  if (isProduction) {
    // For PostgreSQL, we need to handle the schema differently
    const pgCreateTables = `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        is_guest BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS guest_sessions (
        id TEXT PRIMARY KEY,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS typing_history (
        id SERIAL PRIMARY KEY,
        user_id TEXT,
        guest_id TEXT,
        text TEXT NOT NULL,
        wpm INTEGER,
        accuracy REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (guest_id) REFERENCES guest_sessions(id)
      );
      
      CREATE TABLE IF NOT EXISTS user_settings (
        id SERIAL PRIMARY KEY,
        user_id TEXT,
        guest_id TEXT,
        settings TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (guest_id) REFERENCES guest_sessions(id)
      );
    `;
    
    db.exec(pgCreateTables, (err) => {
      if (err) {
        console.error('Error creating PostgreSQL tables:', err);
      } else {
        console.log('PostgreSQL database initialized');
      }
    });
  } else {
    db.exec(createTables, (err) => {
      if (err) {
        console.error('Error creating SQLite tables:', err);
      } else {
        console.log('SQLite database initialized');
      }
    });
  }
};

module.exports = { db, initDatabase };
