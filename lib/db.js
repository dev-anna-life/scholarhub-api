const dotenv = require('dotenv')
const path = require('path')
const mongoose = require('mongoose')

dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

const MONGODB_URI = process.env.MONGO_URI

if (!MONGODB_URI) {
  throw new Error('MONGO_URI is not defined in .env')
}

let cached = global.mongooseCache

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null }
}

async function dbConnect() {
  if (cached.conn) return cached.conn
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI)
  }
  cached.conn = await cached.promise
  return cached.conn
}

module.exports = dbConnect
