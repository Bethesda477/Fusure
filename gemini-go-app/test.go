// // --- File: main.go (Updated Go Code) ---

// package main

// import (
// 	"context"
// 	"fmt"
// 	"io"
// 	"log"
// 	"os"

// 	"github.com/google/generative-ai-go/genai"
// 	"github.com/joho/godotenv"
// 	"google.golang.org/api/option"
// )

// func main() {

// 	err := godotenv.Load()
// 	if err != nil {
// 		log.Fatalf("Error loading .env file: %v, err")
// 	}

// 	// 1. Create a context for the API call
// 	ctx := context.Background()

// 	// 2. The client will automatically pick up the GEMINI_API_KEY
// 	//    from your environment variables.
// 	client, err := genai.NewClient(ctx, option.WithAPIKey(os.Getenv("GEMINI_API_KEY")))
// 	if err != nil {
// 		log.Fatal(err)
// 	}
// 	defer client.Close()

// 	// --- CORRECTION 1: Get the GenerativeModel object first ---
// 	model := client.GenerativeModel("gemini-2.5-flash")

// 	prompt := "Write a short, fun poem about a Go Gopher learning about AI."

// 	// --- CORRECTION 2 & 3: Call GenerateContentStream directly on the model,
// 	//                       and use genai.Text() instead of the undefined functions. ---
// 	// The client.GenerativeModel returns a GenerativeModel struct that has the methods.
// 	// The content is passed as a slice of genai.Part, using the helper function genai.Text().
// 	iter := model.GenerateContentStream(ctx, genai.Text(prompt))

// 	fmt.Printf("--- Response from %s ---\n", "gemini-2.5-flash")

// 	// 4. Iterate through the stream and print the parts
// 	for {
// 		chunk, err := iter.Next() // Use the Next() method on the iterator
// 		if err == io.EOF {
// 			break // Stream finished
// 		}
// 		if err != nil {
// 			log.Fatal(err)
// 		}

// 		// Print the text part of the response chunk
// 		if len(chunk.Candidates) > 0 && chunk.Candidates[0].Content != nil {
// 			for _, part := range chunk.Candidates[0].Content.Parts {
// 				fmt.Print(part)
// 			}
// 		}
// 	}
// 	fmt.Println("\n--- End of response ---")
// }

// // -----------------------------------------------------------------------------