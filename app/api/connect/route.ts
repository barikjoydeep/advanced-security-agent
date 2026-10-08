import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { provider, apiKey, latchConfig } = body;

    if (!provider) {
      return NextResponse.json(
        {
          success: false,
          error: "AI provider is required.",
        },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "AI provider API key is required.",
        },
        { status: 400 }
      );
    }

    if (!latchConfig) {
      return NextResponse.json(
        {
          success: false,
          error: "Latch MCP configuration is required.",
        },
        { status: 400 }
      );
    }

    // Parse the MCP configuration.
    // We only validate its structure here.
    // Actual Latch MCP communication will be implemented next.
    let parsedLatchConfig;

    try {
      parsedLatchConfig =
        typeof latchConfig === "string"
          ? JSON.parse(latchConfig)
          : latchConfig;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid Latch MCP JSON configuration.",
        },
        { status: 400 }
      );
    }

    if (!parsedLatchConfig.mcpServers) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid Latch MCP configuration: mcpServers is missing.",
        },
        { status: 400 }
      );
    }

    /*
     * IMPORTANT:
     *
     * We are NOT executing the MCP configuration yet.
     *
     * The next stage will create the actual server-side
     * AI Agent → Latch MCP → Policy → Tool execution flow.
     *
     * We also deliberately do not return the API key or
     * Latch token to the browser.
     */

    return NextResponse.json({
      success: true,
      connected: true,
      provider,
      message: "Security configuration accepted.",
    });
  } catch (error) {
    console.error("Connect API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to process security connection.",
      },
      { status: 500 }
    );
  }
}