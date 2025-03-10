import mongoose, { Schema } from "mongoose"

// Message Schema
const MessageSchema = new Schema({
  id: String,
  role: {
    type: String,
    enum: ["user", "assistant"],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Number,
    default: Date.now,
  },
})

// Chat Session Schema
const ChatSessionSchema = new Schema({
  id: String,
  name: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    required: true,
    index: true,
  },
  messages: [MessageSchema],
  lastUpdated: {
    type: Number,
    default: Date.now,
  },
})

// Export models
export const ChatSession = mongoose.models.ChatSession || mongoose.model("ChatSession", ChatSessionSchema)

