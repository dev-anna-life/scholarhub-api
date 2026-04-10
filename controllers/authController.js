const User = require('../models/User')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { OAuth2Client } = require('google-auth-library')

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' })
}

const signup = async (req, res) => {
    try {
        const { name, email, phone, password, level, school, state, interests } = req.body

        const existingUser = await User.findOne({ email })
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' })
        }

        const hashedPassword = await bcrypt.hash(password, 12)

        const user = await User.create({
            name,
            email,
            phone,
            password: hashedPassword,
            level,
            school,
            state,
            interests,
            coins: 50
        })

        const token = generateToken(user._id)

        res.status(201).json({
            message: 'Account created successfully',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                level: user.level,
                coins: user.coins,
                badge: user.badge
            }
        })
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message })
    }
} 

const login = async (req, res) => {
    try {
        const { email, password } = req.body

        const user = await User.findOne({ email })
        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password '})
        }

        const isPasswordValid = await bcrypt.compare(password, user.password)
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid email or password '})
        }

        const token = generateToken(user._id)

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                level: user.level,
                coins: user.coins,
                badge: user.badge
            }
        })
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message })
    }
}

const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password')
        res.json(user)
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message })
    }
    }

    const googleLogin = async (req, res) => {
        try {
            const { credential } = req.body
            const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

            const ticket = await client.verifyIdToken({
                idToken: credential,
                audience: process.env.GOOGLE_CLIENT_ID
            })

            const { name, email, sub: googleId } = ticket.getPayload()

            let user = await User.findOne({ email })

            if (!user) {
                user = await User.create({
                    name,
                    email,
                    googleId,
                    coins: 50,
                    phone: '',
                })
            }

            const token = generateToken(user._id)

            res.json({
                message: 'Google login successful',
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    level: user.level,
                    coins: user.coins,
                    badge: user.badge,
                }
            })
        } catch (error) {
            res.status(500).json({ message: 'Google auth failed', error: error.message })
        }
    }

    module.exports = { signup, login, getMe, googleLogin }