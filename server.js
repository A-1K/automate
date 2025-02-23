import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// ✅ Securely load environment variables
const msalConfig = {
    auth: {
        clientId: process.env.MS_CLIENT_ID,  // 🔒 Changed variable name to match .env
        authority: "https://login.microsoftonline.com/common",
        redirectUri: process.env.REDIRECT_URI || "https://automate-k0it.onrender.com//auth/callback"
    }
};

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// ✅ API to expose safe environment variables to frontend
app.get("/env", (req, res) => {
    res.json({
        VITE_MS_CLIENT_ID: process.env.VITE_MS_CLIENT_ID,
        VITE_REDIRECT_URI: process.env.VITE_REDIRECT_URI
    });
});

// ✅ Serve main HTML file
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "signin.html"));
});

// ✅ Summarization API
app.post("/summarize", async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "No text provided." });

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama3-8b-8192",
                messages: [
                    { role: "system", content: "You are an AI that summarizes text. Summarize the following email in a few sentences. Just respond with the summary, nothing like here's the summary etc" },
                    { role: "user", content: text }
                ],
                temperature: 0.5
            })
        });

        const data = await response.json();

        // ✅ Fix: Ensure response is properly handled
        if (!data || !data.choices || !data.choices.length) {
            throw new Error("Invalid response from Groq API.");
        }

        const summary = data.choices[0]?.message?.content?.trim() || "Could not summarize.";
        res.json({ summary });

    } catch (error) {
        console.error("Groq API Error:", error);
        res.status(500).json({ error: "Failed to summarize. Please try again later." });
    }
});


// ✅ Start the server
app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});
