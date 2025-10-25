// Database debugging script
// Run with: node debug-database.js

const { db, initDatabase } = require('./database');

async function debugDatabase() {
    console.log('🔍 Database Debug Information\n');
    
    // Check if we're in production or development
    const isProduction = process.env.NODE_ENV === 'production';
    console.log(`Environment: ${isProduction ? 'Production (PostgreSQL)' : 'Development (SQLite)'}`);
    console.log(`Database URL: ${process.env.DATABASE_URL || 'Not set'}\n`);
    
    try {
        // Test basic connection
        console.log('1. Testing database connection...');
        const testQuery = isProduction ? 'SELECT NOW() as current_time' : 'SELECT datetime("now") as current_time';
        
        db.get(testQuery, [], (err, result) => {
            if (err) {
                console.error('❌ Database connection failed:', err.message);
                return;
            }
            console.log('✅ Database connected successfully');
            console.log(`   Current time: ${result.current_time}\n`);
            
            // Check if user_passages table exists
            console.log('2. Checking user_passages table...');
            const checkTableQuery = isProduction 
                ? `SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'user_passages'
                ) as table_exists`
                : `SELECT name FROM sqlite_master WHERE type='table' AND name='user_passages'`;
            
            db.get(checkTableQuery, [], (err, result) => {
                if (err) {
                    console.error('❌ Error checking table:', err.message);
                    return;
                }
                
                const tableExists = isProduction ? result.table_exists : !!result;
                console.log(`   Table exists: ${tableExists ? '✅ Yes' : '❌ No'}\n`);
                
                if (tableExists) {
                    // Check table structure
                    console.log('3. Checking table structure...');
                    const structureQuery = isProduction
                        ? `SELECT column_name, data_type, is_nullable 
                           FROM information_schema.columns 
                           WHERE table_name = 'user_passages' 
                           ORDER BY ordinal_position`
                        : `PRAGMA table_info(user_passages)`;
                    
                    db.all(structureQuery, [], (err, columns) => {
                        if (err) {
                            console.error('❌ Error getting table structure:', err.message);
                            return;
                        }
                        
                        console.log('   Table columns:');
                        columns.forEach(col => {
                            const name = isProduction ? col.column_name : col.name;
                            const type = isProduction ? col.data_type : col.type;
                            const nullable = isProduction ? col.is_nullable : !col.notnull;
                            console.log(`     - ${name}: ${type} ${nullable ? '(nullable)' : '(not null)'}`);
                        });
                        console.log();
                        
                        // Check for existing data
                        console.log('4. Checking existing data...');
                        const countQuery = 'SELECT COUNT(*) as count FROM user_passages';
                        db.get(countQuery, [], (err, result) => {
                            if (err) {
                                console.error('❌ Error counting records:', err.message);
                                return;
                            }
                            
                            console.log(`   Total passages: ${result.count}`);
                            
                            if (result.count > 0) {
                                // Show sample data
                                console.log('\n5. Sample data:');
                                const sampleQuery = 'SELECT id, title, content, word_count, created_at FROM user_passages ORDER BY created_at DESC LIMIT 3';
                                db.all(sampleQuery, [], (err, rows) => {
                                    if (err) {
                                        console.error('❌ Error getting sample data:', err.message);
                                        return;
                                    }
                                    
                                    rows.forEach((row, index) => {
                                        console.log(`   ${index + 1}. ID: ${row.id}`);
                                        console.log(`      Title: ${row.title}`);
                                        console.log(`      Content: ${row.content.substring(0, 50)}...`);
                                        console.log(`      Words: ${row.word_count}`);
                                        console.log(`      Created: ${row.created_at}`);
                                        console.log();
                                    });
                                });
                            } else {
                                console.log('   No passages found in database.\n');
                            }
                        });
                    });
                } else {
                    console.log('❌ user_passages table does not exist. The database may not have been initialized properly.');
                    console.log('   Try restarting the server to initialize the database.\n');
                }
            });
        });
        
    } catch (error) {
        console.error('❌ Database debug failed:', error.message);
    }
}

// Run the debug
debugDatabase();
