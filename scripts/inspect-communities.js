require('dotenv').config()
const prisma = require('../lib/prisma')

async function main() {
  const comms = await prisma.community.findMany()
  console.log(`Total Communities: ${comms.length}`)
  console.table(comms.map(c => ({ id: c.id, name: c.name, type: c.type, school: c.school, faculty: c.faculty, department: c.department })))
}

main().then(() => prisma.$disconnect()).catch(console.error)
