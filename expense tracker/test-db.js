const mysql = require('mysql2');

// Database connection
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'personal_dashboard'
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL successfully!');
  
  // Test daily_routine table
  testDailyRoutineTable();
});

async function testDailyRoutineTable() {
  try {
    // Check if table exists
    const [tables] = await connection.promise().query('SHOW TABLES LIKE "daily_routine"');
    if (tables.length === 0) {
      console.log('❌ daily_routine table does not exist!');
      return;
    }
    console.log('✅ daily_routine table exists');
    
    // Check table structure
    const [columns] = await connection.promise().query('DESCRIBE daily_routine');
    console.log('\n📋 Table structure:');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
    });
    
    // Check if table has data
    const [rows] = await connection.promise().query('SELECT COUNT(*) as count FROM daily_routine');
    console.log(`\n📊 Table has ${rows[0].count} rows`);
    
    // Try to insert a test record
    console.log('\n🧪 Testing insert...');
    const [result] = await connection.promise().query(
      'INSERT INTO daily_routine (task, completed, time, user_id) VALUES (?, ?, ?, ?)',
      ['Test routine', false, '09:00', 1]
    );
    console.log(`✅ Insert successful, ID: ${result.insertId}`);
    
    // Clean up test record
    await connection.promise().query('DELETE FROM daily_routine WHERE id = ?', [result.insertId]);
    console.log('🧹 Test record cleaned up');
    
  } catch (err) {
    console.error('❌ Error testing table:', err);
  } finally {
    connection.end();
  }
}
