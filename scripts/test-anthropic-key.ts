import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

async function testKey() {
  console.log("\n=== Testing Anthropic API Key ===\n");

  const apiKey = process.env.ANTHROPIC_API_KEY;
  console.log(`API Key present: ${!!apiKey}`);
  console.log(`API Key starts with: ${apiKey?.substring(0, 20)}...`);
  console.log(`API Key length: ${apiKey?.length}\n`);

  try {
    const anthropic = new Anthropic({ apiKey });

    console.log("Attempting to call Claude API...\n");
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20241022",
      max_tokens: 100,
      messages: [{ role: "user", content: "Say 'API key works!'" }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    console.log("✅ SUCCESS! API Response:", text);
    console.log("\nAPI key is valid and working!");
  } catch (error: any) {
    console.log("❌ ERROR! API call failed:");
    console.log(error.message);
    console.log("\nThe API key is invalid or has been revoked.");
  }

  process.exit(0);
}

testKey().catch(console.error);
