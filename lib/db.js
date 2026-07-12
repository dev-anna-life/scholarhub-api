const prisma = require('./prisma')

async function dbConnect() {
  await prisma.$connect()
  return prisma
}

module.exports = dbConnect
