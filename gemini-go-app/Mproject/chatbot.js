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
const progressFill = document.querySelector(".progress-chat");
const progressPercentage = document.querySelector(".progress-percentage");
const analyzeButton = document.getElementById("analyze-btn");
const analysisReport = document.getElementById("analysis-report");
const reportContent = document.getElementById("report-content");

// Minimum rounds needed for analysis (AI can adjust this)
const MIN_ROUNDS_FOR_ANALYSIS = 6; // Each round = 1 user message + 1 bot response

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
    
    // Update progress after each conversation round
    updateProgress();
  } catch (error) {
    console.error("Chat API error:", error);
    streamingElement.textContent = `[ERROR: Failed to connect to chat API. Please check console/server logs. Is the Go server running on the correct port?]`;
  } finally {
    userInput.disabled = false;
    sendButton.disabled = false;
    userInput.focus();
  }
}

// Function to calculate and update progress
function updateProgress() {
  // Count user messages (each user message = 1 round)
  const userMessageCount = chatHistory.filter(msg => msg.role === "user").length;
  
  // Calculate progress percentage (capped at 100%)
  const progress = Math.min((userMessageCount / MIN_ROUNDS_FOR_ANALYSIS) * 100, 100);
  
  // Update progress bar
  if (progressFill) {
    progressFill.style.width = `${progress}%`;
  }
  
  // Update percentage text
  if (progressPercentage) {
    progressPercentage.textContent = `${Math.round(progress)}%`;
  }
  
  // Show analyze button when progress reaches 100%
  if (analyzeButton && progress >= 100) {
    analyzeButton.classList.add("show");
  } else if (analyzeButton) {
    analyzeButton.classList.remove("show");
  }
}

// Function to generate analysis report
async function generateAnalysisReport() {
  if (!analyzeButton || analyzeButton.disabled) return;
  
  // Disable button and show loading state
  analyzeButton.disabled = true;
  analyzeButton.innerHTML = '<span class="material-symbols-outlined">hourglass_empty</span><span>Generating Analysis Report...</span>';
  
  // Show report section
  if (analysisReport) {
    analysisReport.classList.add("show");
    reportContent.innerHTML = '<div class="report-loading"><span class="material-symbols-outlined">psychology</span><p> AI is analyzing your conversation and generating report...</p></div>';
    
    // Scroll to report section
    setTimeout(() => {
      analysisReport.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }
  
  try {
    // Prepare analysis request
    const payload = {
      history: chatHistory,
      analysisType: "comprehensive", // Request comprehensive analysis
    };
    
    // Send POST request to analysis endpoint
    const response = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    // Handle streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullReport = "";
    
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split("\n");
      
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          let text = line.substring(6).trim();
          text = text.replace(/\\n/g, "\n");
          fullReport += text;
          
          // Update report content in real-time
          if (reportContent) {
            reportContent.innerHTML = formatReport(fullReport);
          }
        }
      }
    }
    
    // Final report formatting
    if (reportContent) {
      reportContent.innerHTML = formatReport(fullReport);
    }
    
  } catch (error) {
    console.error("Analysis API error:", error);
    if (reportContent) {
      reportContent.innerHTML = `
        <div class="report-error">
          <span class="material-symbols-outlined">error</span>
          <p>Error generating analysis report. Please check server connection or try again later.</p>
          <p class="error-details">${error.message}</p>
        </div>
      `;
    }
  } finally {
    // Re-enable button
    if (analyzeButton) {
      analyzeButton.disabled = false;
      analyzeButton.innerHTML = '<span class="material-symbols-outlined">psychology</span><span>Generate Analysis Report</span>';
    }
  }
}

// Function to format the report text into structured HTML
function formatReport(reportText) {
  // Split report into sections based on common patterns
  const sections = {
    personality: "Personality Traits",
    strengths: "Strengths",
    weaknesses: "Weaknesses",
    opportunities: "Opportunities",
    passion: "Passion and Interest",
    softSkills: "Soft Skills",
  };
  
  // Create structured report HTML
  let html = '<div class="report-sections">';
  
  // If report is in markdown or structured format, parse it
  // Otherwise, display as formatted text
  const lines = reportText.split('\n');
  let currentSection = null;
  let currentContent = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check for section headers
    if (line.match(/^#{1,3}\s+(.+)/)) {
      // Save previous section
      if (currentSection) {
        html += createReportSection(currentSection, currentContent.join('\n'));
      }
      // Start new section
      currentSection = line.replace(/^#{1,3}\s+/, '').trim();
      currentContent = [];
    } else if (line) {
      currentContent.push(line);
    }
  }
  
  // Save last section
  if (currentSection) {
    html += createReportSection(currentSection, currentContent.join('\n'));
  }
  
  // If no sections found, display as plain text with formatting
  if (!currentSection && reportText) {
    html += `<div class="report-section">
      <div class="report-text">${formatTextWithLineBreaks(reportText)}</div>
    </div>`;
  }
  
  html += '</div>';
  return html;
}

// Helper function to create a report section
function createReportSection(title, content) {
  return `
    <div class="report-section">
      <h3 class="section-title">${title}</h3>
      <div class="report-text">${formatTextWithLineBreaks(content)}</div>
    </div>
  `;
}

// Helper function to format text with line breaks and lists
function formatTextWithLineBreaks(text) {
  // Convert markdown-style lists to HTML
  text = text.replace(/^[-*+]\s+(.+)$/gm, '<li>$1</li>');
  text = text.replace(/^(\d+)\.\s+(.+)$/gm, '<li>$2</li>');
  
  // Wrap consecutive list items in ul tags
  text = text.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
  
  // Convert line breaks to <br> or <p> tags
  const paragraphs = text.split(/\n\n+/);
  return paragraphs.map(p => {
    if (p.trim().startsWith('<ul>')) {
      return p;
    }
    return `<p>${p.replace(/\n/g, '<br>')}</p>`;
  }).join('');
}

// Initialize progress on page load
updateProgress();

// Mobile menu toggle
const mobileMenuToggle = document.getElementById("mobile-menu-toggle");
const mobileMenu = document.getElementById("mobile-menu");

if (mobileMenuToggle && mobileMenu) {
  mobileMenuToggle.addEventListener("click", () => {
    mobileMenu.classList.toggle("active");
    mobileMenuToggle.classList.toggle("active");
  });

  // Close menu when clicking outside
  document.addEventListener("click", (e) => {
    if (
      mobileMenu.classList.contains("active") &&
      !mobileMenu.contains(e.target) &&
      !mobileMenuToggle.contains(e.target)
    ) {
      mobileMenu.classList.remove("active");
      mobileMenuToggle.classList.remove("active");
    }
  });

  // Close menu when clicking on a link
  const mobileMenuLinks = mobileMenu.querySelectorAll("a");
  mobileMenuLinks.forEach((link) => {
    link.addEventListener("click", () => {
      mobileMenu.classList.remove("active");
      mobileMenuToggle.classList.remove("active");
    });
  });
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

if (analyzeButton) {
  analyzeButton.addEventListener("click", generateAnalysisReport);
}
