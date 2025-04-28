// A simple token estimator based on GPT tokenization rules
// This is an approximation - for production, consider using a proper tokenizer like tiktoken
export function estimateTokenCount(text: string): number {
  // GPT models tokenize roughly by word pieces, averaging ~4 characters per token
  // This is a simplified estimation
  return Math.ceil(text.length / 4)
}

// Calculate tokens for a full conversation
export function estimateConversationTokens(messages: Array<{ role: string; content: string }>): number {
  // Base tokens for the conversation format
  let totalTokens = 0

  // Add tokens for each message
  for (const message of messages) {
    // Each message has a small overhead for role specification
    const roleTokens = 3
    const contentTokens = estimateTokenCount(message.content)
    totalTokens += roleTokens + contentTokens
  }

  // Add some overhead for the conversation format
  totalTokens += 10

  return totalTokens
}

// Function to truncate conversation history while preserving important context
export function truncateConversation(
  messages: Array<{ role: string; content: string }>,
  maxTokens = 4000, // Default max tokens for most models
  preserveSystemMessages = true,
): Array<{ role: string; content: string }> {
  // If we're under the limit, no need to truncate
  const currentTokens = estimateConversationTokens(messages)
  if (currentTokens <= maxTokens) {
    return messages
  }

  // Make a copy to avoid mutating the original
  let truncatedMessages = [...messages]

  // Separate system messages if we need to preserve them
  const systemMessages = preserveSystemMessages ? truncatedMessages.filter((m) => m.role === "system") : []

  // Remove system messages from the array if we're preserving them separately
  if (preserveSystemMessages) {
    truncatedMessages = truncatedMessages.filter((m) => m.role !== "system")
  }

  // Keep removing older messages (from the middle) until we're under the token limit
  // We want to keep the most recent context, but also some of the earliest messages for context
  while (
    estimateConversationTokens([...systemMessages, ...truncatedMessages]) > maxTokens &&
    truncatedMessages.length > 2
  ) {
    // Keep the first message for context and remove the second oldest message
    // This preserves the most recent messages and the initial context
    truncatedMessages.splice(1, 1)
  }

  // If we still exceed the limit and have more than 2 messages, start removing from the beginning
  while (
    estimateConversationTokens([...systemMessages, ...truncatedMessages]) > maxTokens &&
    truncatedMessages.length > 2
  ) {
    truncatedMessages.shift()
  }

  // Combine system messages with truncated conversation
  return [...systemMessages, ...truncatedMessages]
}
