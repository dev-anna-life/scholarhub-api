const Post = require("../models/Post");
const User = require("../models/User");

const getPendingPosts = async (req, res) => {
  try {
    const posts = await Post.find({ status: "pending" })
      .populate("author", "name email level school badge")
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const approvePost = async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { status: "approved" },
      { new: true },
    );
    if (!post) return res.status(404).json({ message: "Post not found" });
    await User.findByIdAndUpdate(post.author, { $inc: { coins: 50 } });
    res.json({ message: "Post approved! Author earned 50 coins", post });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const rejectPost = async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { status: "rejected" },
      { new: true },
    );
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json({ message: "Post rejected", post });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = (await User.find().select("-password")).toSorted({
      coins: -1,
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalPosts = await Post.countDocuments();
    const pendingPosts = await Post.countDocuments({ status: "pending" });
    const approvedPosts = await Post.countDocuments({ status: "approved" });
    const rejectedPosts = await Post.countDocuments({ status: "rejected" });

    res.json({
      totalUsers,
      totalPosts,
      pendingPosts,
      approvedPosts,
      rejectedPosts,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { getPendingPosts, approvePost, rejectPost, getAllUsers, getStats };
