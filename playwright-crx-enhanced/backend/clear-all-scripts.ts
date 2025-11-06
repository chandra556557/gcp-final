import db from './src/db';
import * as dotenv from 'dotenv';

dotenv.config();

async function clearAllScripts() {
  console.log('🗑️  Starting cleanup of all scripts...\n');

  try {
    // Start transaction
    await db.query('BEGIN');

    // Delete in order to respect foreign key constraints
    console.log('1. Deleting TestSteps...');
    const testStepsResult = await db.query('DELETE FROM "TestStep"');
    console.log(`   ✓ Deleted ${testStepsResult.rowCount} test steps`);

    console.log('2. Deleting TestRuns...');
    const testRunsResult = await db.query('DELETE FROM "TestRun"');
    console.log(`   ✓ Deleted ${testRunsResult.rowCount} test runs`);

    console.log('3. Deleting SelfHealingLocators...');
    const healingResult = await db.query('DELETE FROM "SelfHealingLocator"');
    console.log(`   ✓ Deleted ${healingResult.rowCount} healing locators`);

    console.log('4. Deleting Variables...');
    const variablesResult = await db.query('DELETE FROM "Variable"');
    console.log(`   ✓ Deleted ${variablesResult.rowCount} variables`);

    console.log('5. Deleting Breakpoints...');
    const breakpointsResult = await db.query('DELETE FROM "Breakpoint"');
    console.log(`   ✓ Deleted ${breakpointsResult.rowCount} breakpoints`);

    console.log('6. Deleting Scripts...');
    const scriptsResult = await db.query('DELETE FROM "Script"');
    console.log(`   ✓ Deleted ${scriptsResult.rowCount} scripts`);

    // Commit transaction
    await db.query('COMMIT');

    console.log('\n✅ All scripts and related data deleted successfully!');
    console.log(`   Total scripts deleted: ${scriptsResult.rowCount}`);
  } catch (error: any) {
    // Rollback on error
    await db.query('ROLLBACK');
    console.error('\n❌ Error deleting scripts:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await db.end();
  }
}

// Run the cleanup
clearAllScripts()
  .then(() => {
    console.log('\n✨ Cleanup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

