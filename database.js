const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');

// Database configuration
const isProduction = process.env.NODE_ENV === 'production';
let db;

if (isProduction && process.env.DATABASE_URL) {
  // Production: Use PostgreSQL
  console.log('Using PostgreSQL database');
  console.log('Database URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  // Test the connection
  pool.query('SELECT NOW()', (err, result) => {
    if (err) {
      console.error('PostgreSQL connection error:', err);
    } else {
      console.log('PostgreSQL connected successfully:', result.rows[0]);
    }
  });
  
  db = {
    // Wrap PostgreSQL pool methods to match SQLite interface
    get: (query, params, callback) => {
      pool.query(query, params, (err, result) => {
        if (err) {
          console.error('PostgreSQL get error:', err);
          return callback(err);
        }
        callback(null, result.rows[0] || null);
      });
    },
    
    all: (query, params, callback) => {
      pool.query(query, params, (err, result) => {
        if (err) {
          console.error('PostgreSQL all error:', err);
          return callback(err);
        }
        callback(null, result.rows);
      });
    },
    
    run: (query, params, callback) => {
      pool.query(query, params, (err, result) => {
        if (err) {
          console.error('PostgreSQL run error:', err);
          if (callback) return callback(err);
          return;
        }
        // For PostgreSQL, we need to get the last inserted ID differently
        const lastID = result.rows && result.rows[0] ? result.rows[0].id : null;
        const changes = result.rowCount || 0;
        if (callback) callback(null, { lastID: lastID, changes: changes });
      });
    },
    
    exec: (query, callback) => {
      pool.query(query, (err, result) => {
        if (err) {
          console.error('PostgreSQL exec error:', err);
          if (callback) return callback(err);
          return;
        }
        if (callback) callback(null);
      });
    },
    
    end: (callback) => {
      pool.end((err) => {
        if (err) {
          console.error('PostgreSQL pool end error:', err);
          if (callback) return callback(err);
          return;
        }
        console.log('PostgreSQL pool ended');
        if (callback) callback(null);
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
      data TEXT,
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
    // For PostgreSQL, create tables one by one
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        is_guest BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      );
    `;
    
    const createGuestSessionsTable = `
      CREATE TABLE IF NOT EXISTS guest_sessions (
        id TEXT PRIMARY KEY,
        data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    const createTypingHistoryTable = `
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
    `;
    
    const createUserDataTable = `
      CREATE TABLE IF NOT EXISTS user_data (
        id SERIAL PRIMARY KEY,
        user_id TEXT,
        data_type TEXT NOT NULL,
        data_content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, data_type)
      );
    `;
    
    const createUserSettingsTable = `
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
    
    // Create tables sequentially
    db.exec(createUsersTable, (err) => {
      if (err) {
        console.error('Error creating users table:', err);
        return;
      }
      console.log('Users table created');
      
      db.exec(createGuestSessionsTable, (err) => {
        if (err) {
          console.error('Error creating guest_sessions table:', err);
          return;
        }
        console.log('Guest sessions table created');
        
        db.exec(createTypingHistoryTable, (err) => {
          if (err) {
            console.error('Error creating typing_history table:', err);
            return;
          }
          console.log('Typing history table created');
          
          db.exec(createUserDataTable, (err) => {
            if (err) {
              console.error('Error creating user_data table:', err);
              return;
            }
            console.log('User data table created');
            
            db.exec(createUserSettingsTable, (err) => {
              if (err) {
                console.error('Error creating user_settings table:', err);
                return;
              }
              console.log('User settings table created');
              
              // Add missing data column to guest_sessions if it doesn't exist
              db.exec('ALTER TABLE guest_sessions ADD COLUMN IF NOT EXISTS data TEXT', (err) => {
                if (err) {
                  console.error('Error adding data column to guest_sessions:', err);
                } else {
                  console.log('Data column added to guest_sessions table');
                }
                
                // Add unique constraint to user_data (PostgreSQL doesn't support IF NOT EXISTS for constraints)
                db.exec('ALTER TABLE user_data ADD CONSTRAINT user_data_user_id_data_type_key UNIQUE (user_id, data_type)', (err) => {
                  if (err) {
                    // If constraint already exists, that's fine - just log it
                    if (err.code === '42710') { // duplicate_object error code
                      console.log('Unique constraint already exists on user_data table');
                    } else {
                      console.error('Error adding unique constraint to user_data:', err);
                    }
                  } else {
                    console.log('Unique constraint added to user_data table');
                  }
                  console.log('PostgreSQL database initialized successfully');
                });
              });
            });
          });
        });
      });
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
