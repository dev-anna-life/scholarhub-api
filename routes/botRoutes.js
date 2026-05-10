const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { GoogleGenerativeAI } = require("@google/generative-ai");

console.log("GEMINI KEY LOADED:", process.env.GEMINI_API_KEY ? "YES" : "NO");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash-lite",
  systemInstruction: `
You are ScholarHub AI, a smart and concise study assistant for African students.

Rules:
- Give direct and clear answers
- Keep explanations short unless the student asks for details
- Avoid excessive excitement or motivational talk
- Avoid too many headings and bullet points
- Write naturally like ChatGPT
- Use simple language students understand
- Explain step-by-step only when necessary
- Avoid repeating the question
- Keep formatting clean and modern
- Use examples only when helpful
- Never sound overly dramatic or childish
- Keep answers under 120 words unless more detail is requested
- Use short paragraphs
- Avoid long introductions
`,
});

router.post("/chat", protect, async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: "Messages array is required" });
    }

    let history = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    while (history.length && history[0].role !== "user") {
      history.shift();
    }

    const lastMessage = history[history.length - 1]?.parts[0]?.text || "";
    const chatHistory = history.slice(0, -1);

    const chat = model.startChat({ history: chatHistory });
    const result = await chat.sendMessage(lastMessage);
    const text = result.response.text();

    res.json({ reply: text });
  } catch (error) {
    console.error("Gemini error:", error.message);
    res.status(500).json({ message: "AI error", error: error.message });
  }
});

module.exports = router;
