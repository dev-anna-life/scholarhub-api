const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");

router.get("/conversations", protect, async (req, res) => {
  try {
    const userId = req.user.id;

    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }],
    })
      .populate("sender", "name school level badge")
      .populate("receiver", "name school level badge")
      .sort({ createdAt: -1 });

    const conversationMap = {};
    messages.forEach((msg) => {
      const other =
        msg.sender._id.toString() === userId ? msg.receiver : msg.sender;
      const otherId = other._id.toString();

      if (!conversationMap[otherId]) {
        conversationMap[otherId] = {
          user: other,
          lastMessage: msg,
          unread: 0,
        };
      }
      if (!msg.read && msg.receiver._id.toString() === userId) {
        conversationMap[otherId].unread++;
      }
    });

    res.json(Object.values(conversationMap));
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/:userId", protect, async (req, res) => {
  try {
    const myId = req.user.id;
    const otherId = req.params.userId;

    const messages = await Message.find({
      $or: [
        { sender: myId, receiver: otherId },
        { sender: otherId, receiver: myId },
      ],
    })
      .populate("sender", "name school level")
      .populate("receiver", "name school level")
      .sort({ createdAt: 1 });

    await Message.updateMany(
      { sender: otherId, receiver: myId, read: false },
      { read: true },
    );

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/send", protect, async (req, res) => {
  try {
    const { receiverId, text } = req.body;
    if (!receiverId || !text?.trim()) {
      return res
        .status(400)
        .json({ message: "Receiver and text are required" });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) return res.status(404).json({ message: "User not found" });

    const message = await Message.create({
      sender: req.user.id,
      receiver: receiverId,
      text: text.trim(),
    });

    const populated = await Message.findById(message._id)
      .populate("sender", "name school level")
      .populate("receiver", "name school level");

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/users/search", protect, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json([]);

    const users = await User.find({
      _id: { $ne: req.user.id },
      $or: [
        { name: { $regex: q, $options: "i" } },
        { school: { $regex: q, $options: "i" } },
      ],
    })
      .select("name school level badge")
      .limit(10);

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
