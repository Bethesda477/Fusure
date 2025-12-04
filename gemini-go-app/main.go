package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/google/generative-ai-go/genai"
	"github.com/joho/godotenv"
	"google.golang.org/api/iterator"
	"google.golang.org/api/option"
)

// The model used for the chat.
const modelName = "gemini-2.5-flash"

// --- Request/Response Structures (No Change) ---

type Message struct {
	Role string `json:"role"`
	Text string `json:"text"`
}

type ChatRequest struct {
	History    []Message `json:"history"`
	NewMessage string    `json:"newMessage"`
}

// --- Handler Logic (Chat API - No Change) ---

func chatHandler(w http.ResponseWriter, r *http.Request) {
	// CORS handling, API key setup, Gemini client creation, and streaming logic
	// ... (This section remains unchanged, preserving your existing chat logic) ...

	// --- CORS PREFLIGHT HANDLING ---
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	// --- END CORS PREFLIGHT HANDLING ---

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	var req ChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		log.Printf("Decode error: %v", err)
		return
	}

	if len(req.History) == 0 {
		http.Error(w, "History must contain at least one message", http.StatusBadRequest)
		return
	}

	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		http.Error(w, "GEMINI_API_KEY environment variable not set", http.StatusInternalServerError)
		return
	}

	ctx := context.Background()
	client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		http.Error(w, "Failed to create Gemini client", http.StatusInternalServerError)
		return
	}
	defer client.Close()

	var history []*genai.Content
	for _, msg := range req.History {
		role := msg.Role
		if role == "assistant" {
			role = "model"
		}

		history = append(history, &genai.Content{
			Role: role,
			Parts: []genai.Part{
				genai.Text(msg.Text),
			},
		})
	}

	model := client.GenerativeModel(modelName)
	newSystemInstruction := `You are an expert Career and Personality Analyst specializing in education and career opportunities in Malaysia. Your primary goal is to guide the user toward suitable academic courses and career paths based on a comprehensive profile analysis.

You will achieve this by engaging the user in a structured, multi-turn interview process. Your initial response MUST be a set of 3-4 probing questions designed to uncover their:
1. Strengths and Weaknesses
2. Interests and Values
3. Risk Tolerance and hidden characters.

After several turns of conversation, you will use the collected data to provide a summary of your findings and suggest 3-5 specific courses and potential careers available in Malaysia that align with their analyzed profile. Always ask follow-up questions until you have enough data to make a comprehensive suggestion.`

	model.SystemInstruction = &genai.Content{Parts: []genai.Part{genai.Text(newSystemInstruction)}}
	chat := model.StartChat()
	chat.History = history
	iter := chat.SendMessageStream(ctx, genai.Text(req.NewMessage))

	for {
		resp, err := iter.Next()

		if err == iterator.Done {
			break
		}

		if err != nil {
			log.Printf("Stream error: %v", err)
			fmt.Fprintf(w, "data: [ERROR] Stream failed: %v\n\n", err)
			return
		}

		if resp != nil && len(resp.Candidates) > 0 {
			if len(resp.Candidates[0].Content.Parts) > 0 {
				if text, ok := resp.Candidates[0].Content.Parts[0].(genai.Text); ok {
					fmt.Fprintf(w, "data: %s\n\n", text)

					if f, ok := w.(http.Flusher); ok {
						f.Flush()
					}
				}
			}
		}
	}
}

// --- NEW Static File Handler ---

// Custom handler to serve all static files and set the default index file from Mproject.
func serveStaticFiles(w http.ResponseWriter, r *http.Request) {
	// **** CHANGE: Point the directory to the parent Mproject folder ****
	const baseDir = "Mproject"

	// If the request path is the root '/', serve the newhomePage.html
	if r.URL.Path == "/" {
		// IMPORTANT: Access the file within the 'Mproject' directory.
		http.ServeFile(w, r, filepath.Join(baseDir, "newhomePage.html"))
		return
	}

	// For all other files (like /courseBuddy.html, /chat.js, /styles.css, etc.)
	// We serve files directly from the Mproject folder.
	fs := http.FileServer(http.Dir(baseDir))

	// StripPrefix ensures a request for "/courseBuddy.html" correctly looks for "Mproject/courseBuddy.html".
	http.StripPrefix("/", fs).ServeHTTP(w, r)
}

// --- Main Function (Updated) ---

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: Could not find or load .env file. Relying on system environment variables.")
	}

	// NOTE: Ensure all HTML, CSS, and JS files are now directly under Mproject (not Mproject/assets).

	// 1. API Endpoint
	http.HandleFunc("/api/chat", chatHandler)

	// 2. Static File Server
	// This handler serves the root page and all static assets from the Mproject folder.
	http.HandleFunc("/", serveStaticFiles)

	port := "8080"
	log.Printf("Go API and Static Server listening on port %s...", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("Error starting server: %v", err)
	}
}
