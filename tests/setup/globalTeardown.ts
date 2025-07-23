export default async function teardown() {
  console.log('🧹 Cleaning up test database...')
  
  // Any additional cleanup can be added here
  // The database will be reset before the next test run anyway
  
  console.log('✅ Test database cleanup complete!')
}