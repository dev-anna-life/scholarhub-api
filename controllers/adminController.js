const Post = require("../models/Post");
const User = require("../models/User");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const Notification = require("../models/Notification");
const SOS = require("../models/SOS");

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
    const users = await User.find().select("-password").sort({
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

const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    await Post.deleteMany({ author: userId });
    await Message.deleteMany({ sender: userId });
    await Conversation.deleteMany({ participants: userId });
    await Notification.deleteMany({ $or: [{ user: userId }, { fromUser: userId }] });
    await SOS.deleteMany({ student: userId });
    await User.updateMany(
      { $or: [{ followers: userId }, { following: userId }] },
      { $pull: { followers: userId, following: userId } },
    );
    await User.findByIdAndDelete(userId);

    res.json({ message: `User "${user.name}" and all associated data deleted` });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const deleteAnyPost = async (req, res) => {
  try {
    const post = await Post.findByIdAndDelete(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json({ message: "Post deleted by admin" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const cleanupChats = async (req, res) => {
  try {
    const allConvs = await Conversation.find({}).lean();
    const badConvIds = [];
    for (const conv of allConvs) {
      if (!conv.participants || conv.participants.length === 0) {
        badConvIds.push(conv._id);
        continue;
      }
      const validUsers = await User.find({ _id: { $in: conv.participants } }).lean();
      if (validUsers.length < 2) badConvIds.push(conv._id);
    }
    const delConv = await Conversation.deleteMany({ _id: { $in: badConvIds } });
    const delMsg1 = await Message.deleteMany({ conversation: { $in: badConvIds } });
    const allUserIds = (await User.find({}).select('_id').lean()).map(u => u._id);
    const delMsg2 = await Message.deleteMany({
      $and: [
        { $or: [{ sender: { $nin: allUserIds } }, { receiver: { $nin: allUserIds } }] },
        { sender: { $ne: null }, receiver: { $ne: null } },
      ]
    });
    res.json({
      message: 'Chat cleanup done',
      deletedConversations: delConv.deletedCount,
      deletedMessages: delMsg1.deletedCount + delMsg2.deletedCount,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { getPendingPosts, approvePost, rejectPost, getAllUsers, getStats, deleteUser, deleteAnyPost, cleanupChats };
