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
    await User.findByIdAndUpdate(post.author, { $inc: { coins: 50, monthlyCoins: 50 } });
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
    // --- Deduplicate conversations for same participant pair ---
    const allConvs = await Conversation.find({}).lean();
    const pairMap = {};
    for (const conv of allConvs) {
      const p = conv.participants || [];
      if (p.length < 2) continue;
      const sorted = p.map(id => id.toString()).sort().join('|');
      if (!pairMap[sorted]) pairMap[sorted] = [];
      pairMap[sorted].push(conv);
    }
    const dupIds = [];
    const keepMap = {};
    for (const [key, convs] of Object.entries(pairMap)) {
      if (convs.length > 1) {
        convs.sort((a, b) => new Date(b.updatedAt || b._id.getTimestamp()) - new Date(a.updatedAt || a._id.getTimestamp()));
        const keep = convs[0];
        const dups = convs.slice(1).map(c => c._id);
        keepMap[keep._id.toString()] = dups.map(id => id.toString());
        dupIds.push(...dups);
      }
    }
    for (const [keepId, dupIdArr] of Object.entries(keepMap)) {
      await Message.updateMany({ conversation: { $in: dupIdArr } }, { conversation: keepId });
      const latest = await Message.findOne({ conversation: keepId }).sort({ createdAt: -1 }).lean();
      if (latest) await Conversation.findByIdAndUpdate(keepId, { lastMessage: latest._id });
    }
    await Conversation.deleteMany({ _id: { $in: dupIds } });

    // --- Remove orphan conversations (deleted users) ---
    const orphanConvIds = [];
    for (const conv of allConvs) {
      if (!conv.participants || conv.participants.length === 0) {
        orphanConvIds.push(conv._id);
        continue;
      }
      const validUsers = await User.find({ _id: { $in: conv.participants } }).lean();
      if (validUsers.length < 2) orphanConvIds.push(conv._id);
    }
    const delOrphanConv = await Conversation.deleteMany({ _id: { $in: orphanConvIds } });
    const delOrphanMsg = await Message.deleteMany({ conversation: { $in: orphanConvIds } });

    // --- Remove messages with deleted senders ---
    const allUserIds = (await User.find({}).select('_id').lean()).map(u => u._id);
    const delBadMsg = await Message.deleteMany({
      $and: [
        { $or: [{ sender: { $nin: allUserIds } }, { receiver: { $nin: allUserIds } }] },
        { sender: { $ne: null }, receiver: { $ne: null } },
      ]
    });

    res.json({
      message: 'Cleanup done',
      deduplicatedConversations: dupIds.length,
      deletedConversations: delOrphanConv.deletedCount,
      deletedMessages: delOrphanMsg.deletedCount + delBadMsg.deletedCount,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { getPendingPosts, approvePost, rejectPost, getAllUsers, getStats, deleteUser, deleteAnyPost, cleanupChats };
