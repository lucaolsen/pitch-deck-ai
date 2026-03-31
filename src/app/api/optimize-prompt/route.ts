import { NextResponse } from "next/server";
import { getAnthropicClient } from "@/lib/anthropic";

const SYSTEM_PROMPT = `You are an expert Pitch Deck Prompt Optimizer for the EBANX Sales AI Builder.
Your job is to help the user create the perfect prompt to generate a highly convincing B2B sales presentation.

Here is the flow you must follow:
1. Evaluate the user's request. Is it detailed enough? Does it specify the target audience (persona), the market/country, the vertical, and the specific pain points or goals?
2. If it is NOT detailed enough, ask 1 to 3 concise, highly relevant follow-up questions to gather the missing context.
3. If it IS detailed enough, you must output an OPTIMIZED PROMPT that the generation AI will use to build the deck.
4. You also have access to the EBANX sales document database. You must select which documents are most relevant to the user's request.

Available EBANX Documents:
- 02_icp_playbook.md (Ideal customer profiles and targeting)
- 03_value_pillars.md (Core value propositions and differentiators)
- 04_industries_sales_deck.md (Industry-specific sales material)
- 05_latam_sales_deck.md (Latin America market data, payment methods, market size by country)
- 06_latam_modular_sales_deck.md (EBANX Latin America modular sales deck — detailed market overview, country-by-country data, payment insights, internal use)

You MUST respond strictly in JSON format matching this schema:
{
  "status": "needs_info" | "ready",
  "message": "Your follow-up question(s) to the user (only if status is 'needs_info').",
  "optimizedPrompt": "The highly detailed prompt (only if status is 'ready').",
  "selectedDocs": ["01_case_study.md"] // Array of filenames to include (only if status is 'ready').
}

Do not include any other text outside the JSON object.`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const anthropic = getAnthropicClient();

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      temperature: 0.2,
      system: SYSTEM_PROMPT,
      messages: messages,
    });

    const content = response.content[0].type === "text" ? response.content[0].text : "";
    
    try {
      // Find JSON block in case Claude wrapped it
      const startIdx = content.indexOf("{");
      const endIdx = content.lastIndexOf("}") + 1;
      const jsonStr = content.substring(startIdx, endIdx);
      const data = JSON.parse(jsonStr);
      return NextResponse.json(data);
    } catch (e) {
      console.error("Failed to parse Claude JSON response:", content);
      return NextResponse.json({ error: "Invalid response from optimizer AI" }, { status: 500 });
    }
  } catch (error: any) {
    console.error("[optimize-prompt] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
