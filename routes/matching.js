const { ObjectId } = require('mongodb');

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
// llama-3.3-70b-versatile was decommissioned by Groq on 2026-08-16.
// Using the current recommended replacement.
const MODEL = "openai/gpt-oss-120b";

const SYSTEM_PROMPT = `You are an AI analyst for VentureConnect, a platform that connects startup founders with each other and with collaborators.
Given a startup's profile and a founder's profile (the founder viewing/browsing that startup), evaluate how well they match as a potential networking, partnership, or collaboration fit.
Respond with ONLY valid JSON — no markdown, no code fences, no extra text — in exactly this shape:
{
  "score": <integer 0-100>,
  "summary": "<one short sentence verdict>",
  "reasons": ["<short reason 1>", "<short reason 2>", "<short reason 3>"]
}`;

async function getMatchFromGroq({ startup, founder }) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY is not configured on the server");

    const userPrompt = `STARTUP PROFILE:
Name: ${startup.name || "N/A"}
Industry: ${startup.industry || "N/A"}
Funding sought: ${startup.funding || "N/A"}
Description: ${startup.description || "N/A"}

FOUNDER PROFILE (viewer):
Name: ${founder.name || "N/A"}
Role: ${founder.role || "N/A"}
Bio: ${founder.bio || "N/A"}
Interests/Skills: ${Array.isArray(founder.skills) ? founder.skills.join(", ") : (founder.skills || "N/A")}

Evaluate how well this founder matches this startup as a networking or collaboration opportunity. Consider industry alignment, stage fit, and stated interests. Be honest — not every match should score high.`;

    const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: MODEL,
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: userPrompt },
            ],
            temperature: 0.4,
            max_tokens: 400,
            response_format: { type: "json_object" },
        }),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Groq API error: ${errText}`);
    }

    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content?.trim() || "{}";

    try {
        return JSON.parse(raw);
    } catch (e) {
        return { score: 0, summary: "Couldn't evaluate this match right now.", reasons: [] };
    }
}

function registerMatchingRoute(app, { startupCollection, usersCollection }) {
    // GET /api/ai/match-score/:startupId?founderEmail=someone@example.com
    app.get('/api/ai/match-score/:startupId', async (req, res) => {
        try {
            const { startupId } = req.params;
            const { founderEmail } = req.query;

            if (!founderEmail) {
                return res.status(400).json({ success: false, message: "founderEmail query param is required" });
            }
            if (!ObjectId.isValid(startupId)) {
                return res.status(400).json({ success: false, message: "Invalid startup ID" });
            }

            const startup = await startupCollection.findOne({ _id: new ObjectId(startupId) });
            if (!startup) {
                return res.status(404).json({ success: false, message: "Startup not found" });
            }

            const founder = await usersCollection.findOne({ email: founderEmail });
            if (!founder) {
                return res.status(404).json({ success: false, message: "Founder not found" });
            }
            if (founder.role !== "founder") {
                return res.status(403).json({ success: false, message: "Only founders can request a match score" });
            }

            const match = await getMatchFromGroq({ startup, founder });

            res.status(200).json({
                success: true,
                startupId,
                founderEmail,
                score: typeof match.score === "number" ? match.score : 0,
                summary: match.summary || "",
                reasons: Array.isArray(match.reasons) ? match.reasons : [],
            });
        } catch (error) {
            console.error("Match score error:", error);
            res.status(500).json({ success: false, message: "Failed to generate match score", error: error.message });
        }
    });
}

module.exports = { registerMatchingRoute };