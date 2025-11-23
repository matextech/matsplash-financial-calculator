import bcrypt from 'bcryptjs';
import knex from 'knex';

const db = knex({
  client: 'sqlite3',
  connection: {
    filename: './database.sqlite'
  },
  useNullAsDefault: true
});

async function testPins() {
  try {
    console.log('\n📊 Checking all users and their PINs...\n');
    
    const users = await db('users').select('id', 'name', 'email', 'role', 'pin_hash', 'pin_reset_required');
    
    for (const user of users) {
      console.log(`User: ${user.name} (${user.email})`);
      console.log(`  Role: ${user.role}`);
      console.log(`  PIN Reset Required: ${user.pin_reset_required}`);
      console.log(`  Has PIN Hash: ${user.pin_hash ? 'YES' : 'NO'}`);
      
      if (user.pin_hash && user.role !== 'director') {
        // Test if "1234" matches
        const matches = await bcrypt.compare('1234', user.pin_hash);
        console.log(`  PIN "1234" matches: ${matches ? '✅ YES' : '❌ NO'}`);
      }
      console.log('');
    }
    
    await db.destroy();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testPins();

