const mongoose = require("mongoose")

const commentSchema = new mongoose.Schema({
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
})

const postSchema = new mongoose.Schema({
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    category: { type: String, required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    commentsData: [commentSchema],
    trending: { type: Boolean, default: false },
}, { timestamps: true })

module.exports = mongoose.model("Post", postSchema)