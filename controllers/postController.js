const mongoose = require("mongoose");
const Post = require("../models/Post");
const Notification = require("../models/Notification");
const User = require("../models/User");

const createPost = async (req, res) => {
  try {
    const { title, content, category, image, video } = req.body;
    const finalCategory = category && category.trim() ? category.trim() : 'Sciences';
    if (!title || !content) {
      return res.status(400).json({ message: "Title and content are required" });
    }

    const FREE_LIMIT = 1500;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.status && user.status !== 'Current Student') {
      return res.status(403).json({ message: `${user.status === 'Graduate' ? 'Graduates' : 'Alumni'} cannot create posts` });
    }

    const badgeTiers = [
      { id: 'badge_extra_premium', limit: 500000, canUploadVideo: true },
      { id: 'badge_premium', limit: 12000 },
      { id: 'badge_basic', limit: 6000 },
    ];
    const subs = user.badgeSubscriptions || [];
    const active = subs.filter(s => new Date(s.expiresAt) > new Date());
    const highest = badgeTiers.find(t => active.some(s => s.id === t.id));
    const maxChars = highest ? highest.limit : FREE_LIMIT;

    if (content.length > maxChars) {
      return res.status(400).json({ message: `Post exceeds character limit for your tier. Upgrade to write more.` });
    }

    if (video && !highest?.canUploadVideo) {
      return res.status(403).json({ message: "Only Extra Premium badge holders can upload videos. Upgrade your badge." });
    }

    const post = await Post.create({
      author: req.user.id,
      title: title.trim(),
      content: content.trim(),
      category: finalCategory,
      image,
      video,
      status: "pending",
    });
    res.status(201).json({ message: "Post submitted for review successfully", post });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getPosts = async (req, res) => {
  try {
    const posts = await Post.find({ status: "approved" })
      .populate("author", "name level school badgeSubscriptions")
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getMyPosts = async (req, res) => {
  try {
    const posts = await Post.find({ author: req.user.id }).sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to delete this post" });
    }
    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const toggleLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    const userId = req.user.id;
    const alreadyLiked = post.likes.map((id) => id.toString()).includes(userId);
    if (alreadyLiked) {
      post.likes = post.likes.filter((id) => id.toString() !== userId);
    } else {
      post.likes.push(userId);
      if (post.author.toString() !== userId) {
        await Notification.create({ recipient: post.author, sender: userId, type: "like", post: post._id });
      }
    }
    await post.save();
    res.json({ likes: post.likes.length, liked: !alreadyLiked });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const addComment = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: "Comment text is required" });
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    const comment = {
      _id: new mongoose.Types.ObjectId(),
      author: req.user.id,
      text,
      createdAt: new Date(),
    };
    post.commentsData.push(comment);
    await post.save();
    if (post.author.toString() !== req.user.id) {
      await Notification.create({ recipient: post.author, sender: req.user.id, type: "comment", post: post._id });
    }
    const user = await User.findById(req.user.id).select("name school level");
    res.status(201).json({ ...comment, author: user });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getComments = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate("commentsData.author", "name school level badge");
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json(post.commentsData || []);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { createPost, getPosts, getMyPosts, deletePost, toggleLike, addComment, getComments };