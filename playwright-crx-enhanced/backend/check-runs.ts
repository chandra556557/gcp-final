import pool from './src/db';

async function checkTestRuns() {
  const { rows: runs } = await pool.query(
    `SELECT tr.id, tr.status, tr."executionReportUrl", tr."startedAt", s.name AS script_name
     FROM "TestRun" tr JOIN "Script" s ON s.id = tr."scriptId"
     ORDER BY tr."startedAt" DESC
     LIMIT 5`
  );

  console.log('\n=== TEST RUNS IN DATABASE ===\n');
  console.log(`Total test runs found: ${runs.length}\n`);

  runs.forEach((run: any, index: number) => {
    console.log(`${index + 1}. Test Run ID: ${run.id}`);
    console.log(`   Script: ${run.script_name}`);
    console.log(`   Status: ${run.status}`);
    console.log(`   Execution Report URL: ${run.executionReportUrl || 'NOT SET'}`);
    console.log(`   Started: ${run.startedAt}`);
    console.log('');
  });
}

checkTestRuns().catch(console.error);

