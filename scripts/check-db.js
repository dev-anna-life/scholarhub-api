const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.njiomdxbinfqzczlptfp:ScholarHub2026!Secure@aws-1-eu-west-1.pooler.supabase.com:5432/postgres'
});

async function main() {
  await client.connect();
  const res = await client.query('SELECT id, name, username, email FROM "User" WHERE id IN (\'cmtiv0zrm0000lsvoquuxye6h\', \'cmtiv109i0001lsvolgr717yz\', \'cmtiv10qk0002lsvoau95i8lv\', \'cmtiv114v0003lsvolm3vgkoj\', \'cmtiv11pk0004lsvo7qce9lrm\', \'cmtiv128q0005lsvo9gsyi4c4\', \'cmtiv12pl0006lsvoi5f4hncg\', \'cmtiv133e0007lsvoinr72ybg\', \'cmtiv13hs0008lsvopqjsfxml\', \'cmtiv13yz0009lsvo8j9ddgy7\')');
  console.log('Official Guild Accounts in DB:', res.rows);
  await client.end();
}

main().catch(console.error);
