// Mproject/chatbot.js

// ----------------------------------------------------------------
// 1. **CONFIGURATION:** Change this URL when deploying to production!
//
// Local Development URL (Go server handles everything):
const API_BASE_URL = "";

// Production URL Example (If API is hosted separately, e.g., on a different domain):
// const API_BASE_URL = 'https://api.mywebsite.com';
// ----------------------------------------------------------------

// 2. Identify key HTML elements using their class names
const chatContainer = document.querySelector(".chat-messages");
const userInput = document.querySelector('.chat-input-area input[type="text"]');
const sendButton = document.querySelector(".chat-input-area .send-btn");

// Global array to store the conversation history, initialized with the static messages from the HTML
let chatHistory = [
  // Bot's initial welcome message
  {
    role: "model",
    text: "Hey there! I'm your AICourseBuddy. To help you find your ideal university course, I'd like to ask a few questions. First off, what subjects did you enjoy most in high school?",
  },
  // User's first example message
  {
    role: "user",
    text: "I really liked Math and Physics, but I was also pretty good at Art.",
  },
  // Bot's second example message
  {
    role: "model",
    // Note: The text here is a clean version of the HTML content, excluding the option buttons
    text: "That's an interesting mix! It shows you have both analytical and creative strengths. Which of these sounds more appealing to you?",
  },
];

// Function to create and append a new message bubble to the chat container
function appendMessage(role, text, isStreaming = false) {
  const isUser = role === "user";

  // Create the message row wrapper
  const row = document.createElement("div");
  row.classList.add("message-row", isUser ? "user-row" : "bot-row");

  // Avatar/Icon based on role
  const avatar = `<div class="avatar ${isUser ? "user-avatar" : "bot-avatar"}">
                        <span class="material-symbols-outlined">${
                          isUser ? "person" : "smart_toy"
                        }</span>
                    </div>`;

  // Message bubble content
  const bubbleContent = `
        <div class="message-bubble ${isUser ? "user-bubble" : "bot-bubble"}">
            <p class="msg-sender">${isUser ? "You" : "AICourseBuddy"}</p>
            <p class="msg-text">${text}</p>
        </div>`;

  // Assemble the row structure
  if (isUser) {
    row.innerHTML = bubbleContent + avatar;
  } else {
    row.innerHTML = avatar + bubbleContent;
  }

  chatContainer.appendChild(row);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  // Return the text element to update during streaming
  if (isStreaming) {
    return row.querySelector(".msg-text");
  }
}

// Function to handle sending the message and streaming the response
async function sendChatMessage() {
  const newMessageText = userInput.value.trim();
  if (!newMessageText) return;

  // 1. Clean up input and disable elements
  userInput.value = "";
  userInput.disabled = true;
  sendButton.disabled = true;

  // 2. Add the user message to history and UI
  chatHistory.push({ role: "user", text: newMessageText });
  appendMessage("user", newMessageText);

  // 3. Prepare the request payload
  const payload = {
    history: chatHistory,
    newMessage: newMessageText,
  };

  // 4. Remove the static option buttons from the previous bot message (if they exist)
  const lastBotBubble = document.querySelector(
    ".message-row.bot-row:last-child"
  );
  if (lastBotBubble) {
    const optionButtons = lastBotBubble.querySelector(".option-buttons");
    if (optionButtons) {
      optionButtons.remove();
    }
  }

  // Create placeholder for the streamed model response
  const streamingElement = appendMessage("model", "...", true);

  // 5. Send POST request and handle SSE streaming
  try {
    // *** DYNAMIC FETCH CALL ***
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    // Handle stream reading
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let currentModelText = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);

      // Process Server-Sent Events (SSE) format: "data: [text]\n\n"
      const lines = chunk.split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          let text = line.substring(6).trim();
          text = text.replace(/\\n/g, "\n");

          // Update UI and internal text buffer
          currentModelText += text;
          streamingElement.textContent = currentModelText;
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      }
    }

    // 6. Final cleanup and re-enable input
    chatHistory.push({ role: "model", text: currentModelText });
  } catch (error) {
    console.error("Chat API error:", error);
    streamingElement.textContent = `[ERROR: Failed to connect to chat API. Please check console/server logs. Is the Go server running on the correct port?]`;
  } finally {
    userInput.disabled = false;
    sendButton.disabled = false;
    userInput.focus();
  }
}

// Event listeners
if (sendButton) {
  sendButton.addEventListener("click", sendChatMessage);
}

if (userInput) {
  userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !sendButton.disabled) {
      sendChatMessage();
    }
  });
}
