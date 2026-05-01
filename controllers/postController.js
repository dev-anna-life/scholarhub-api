const mongoose = require("mongoose");
const Post = require("../models/Post");
const Notification = require("../models/Notification");
const User = require("../models/User");

const createPost = async (req, res) => {
  try {
    const { title, content, category } = req.body;
    if (!title || !content || !category) {
      return res
        .status(400)
        .json({ message: "Title, content and category are required" });
    }
    const post = await Post.create({
      author: req.user.id,
      title,
      content,
      category,
      status: "pending",
    });
    res
      .status(201)
      .json({ message: "Post submitted for review successfully", post });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getPosts = async (req, res) => {
  try {
    const posts = await Post.find({ status: "approved" })
      .populate("author", "name level school badge")
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getMyPosts = async (req, res) => {
  try {
    const posts = await Post.find({ author: req.user.id }).sort({
      createdAt: -1,
    });
    res.json(posts);
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
        await Notification.create({
          recipient: post.author,
          sender: userId,
          type: "like",
          post: post._id,
        });
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
    if (!text?.trim())
      return res.status(400).json({ message: "Comment text is required" });

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
      await Notification.create({
        recipient: post.author,
        sender: req.user.id,
        type: "comment",
        post: post._id,
      });
    }

    const user = await User.findById(req.user.id).select("name school level");
    res.status(201).json({ ...comment, author: user });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getComments = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate(
      "commentsData.author",
      "name school level badge",
    );
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json(post.commentsData || []);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  createPost,
  getPosts,
  getMyPosts,
  toggleLike,
  addComment,
  getComments,
};
