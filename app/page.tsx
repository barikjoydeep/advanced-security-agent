"use client";

import { useState } from "react";

type Provider = "openai" | "groq";

type AgentTool = {
  name: string;
  description: string;
};

type Message = {
  role: "user" | "assistant";
  content: string;
};

type SecurityStatus =
  | "CHECKING"
  | "ALLOWED"
  | "DENIED"
  | "COMPLETED";

type SecurityEvent = {
  id: string;
  timestamp: string;
  status: SecurityStatus;
  action: string;
  detail: string;
  tool?: string;
};

export default function Home() {
  const [provider, setProvider] =
    useState<Provider>("groq");

  const [apiKey, setApiKey] =
    useState("");

  const [latchConfig, setLatchConfig] =
    useState("");

  const [connected, setConnected] =
    useState(false);

  const [connecting, setConnecting] =
    useState(false);

  const [sending, setSending] =
    useState(false);

  const [error, setError] =
    useState("");

  const [tools, setTools] =
    useState<AgentTool[]>([]);

  const [serverName, setServerName] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [securityEvents, setSecurityEvents] =
    useState<SecurityEvent[]>([]);

  const [securityStatus, setSecurityStatus] =
    useState<SecurityStatus>("CHECKING");

  // =========================================================
  // STATUS HELPERS
  // =========================================================

  const getStatusLabel = (
    status: SecurityStatus
  ): string => {
    switch (status) {
      case "CHECKING":
        return "CHECKING";

      case "ALLOWED":
        return "ALLOWED";

      case "DENIED":
        return "DENIED";

      case "COMPLETED":
        return "COMPLETED";
    }
  };

  const getStatusClass = (
    status: SecurityStatus
  ): string => {
    switch (status) {
      case "CHECKING":
        return "border-yellow-500/20 bg-yellow-500/10 text-yellow-300";

      case "ALLOWED":
        return "border-green-500/20 bg-green-500/10 text-green-300";

      case "DENIED":
        return "border-red-500/20 bg-red-500/10 text-red-300";

      case "COMPLETED":
        return "border-blue-500/20 bg-blue-500/10 text-blue-300";
    }
  };

  const getEventIcon = (
    status: SecurityStatus
  ): string => {
    switch (status) {
      case "CHECKING":
        return "•";

      case "ALLOWED":
        return "✓";

      case "DENIED":
        return "✕";

      case "COMPLETED":
        return "✓";
    }
  };

  // =========================================================
  // SECURITY EVENT FINDER
  // =========================================================

  const findEvent = (
    events: SecurityEvent[],
    text: string
  ) => {
    return events.find((event) =>
      event.action
        .toLowerCase()
        .includes(text.toLowerCase())
    );
  };

  // =========================================================
  // BUILD SECURITY TIMELINE
  // =========================================================

  const buildSecurityTimeline = (
    events: SecurityEvent[],
    question: string
  ): SecurityEvent[] => {
    const timeline: SecurityEvent[] = [];

    // =======================================================
    // QUESTION RECEIVED
    // =======================================================

    timeline.push({
      id:
        `question-${Date.now()}`,

      timestamp:
        new Date().toISOString(),

      status:
        "COMPLETED",

      action:
        "QUESTION RECEIVED",

      detail:
        `"${question}"`,
    });

    // =======================================================
    // LATCH AUTHORIZATION
    // =======================================================

    const conversationAllowed =
      findEvent(
        events,
        "conversation authorization allowed"
      );

    const conversationDenied =
      findEvent(
        events,
        "conversation authorization denied"
      );

    const conversationChecking =
      findEvent(
        events,
        "conversation authorization"
      );

    const latchAuthorization =
      conversationAllowed ??
      conversationDenied ??
      conversationChecking;

    if (
      latchAuthorization
    ) {
      timeline.push({
        id:
          `latch-authorization-${latchAuthorization.id}`,

        timestamp:
          latchAuthorization.timestamp ??
          new Date().toISOString(),

        status:
          conversationDenied
            ? "DENIED"
            : conversationAllowed
              ? "ALLOWED"
              : "CHECKING",

        action:
          "LATCH AUTHORIZATION",

        detail:
          conversationDenied
            ? "Latch denied the user message before AI processing."
            : conversationAllowed
              ? "Latch allowed the user message to proceed."
              : "Latch is verifying the user's message before AI processing.",

        tool:
          "latch_authorize",
      });
    }

    // =======================================================
    // STOP IF CONVERSATION DENIED
    // =======================================================

    if (
      conversationDenied
    ) {
      return timeline;
    }

    // =======================================================
    // PROTECTED OPERATION
    // =======================================================

    const protectedAllowed =
      findEvent(
        events,
        "protected operation allowed"
      );

    const protectedDenied =
      findEvent(
        events,
        "protected operation denied"
      );

    const protectedChecking =
      findEvent(
        events,
        "protected operation authorization"
      );

    const protectedEvent =
      protectedAllowed ??
      protectedDenied ??
      protectedChecking;

    if (
      protectedEvent
    ) {
      timeline.push({
        id:
          `protected-operation-${protectedEvent.id}`,

        timestamp:
          protectedEvent.timestamp ??
          new Date().toISOString(),

        status:
          protectedDenied
            ? "DENIED"
            : protectedAllowed
              ? "ALLOWED"
              : "CHECKING",

        action:
          "PROTECTED OPERATION",

        detail:
          protectedAllowed
            ? protectedAllowed.detail ||
              "Latch allowed the protected operation."
            : protectedDenied
              ? protectedDenied.detail ||
                "Latch denied the protected operation."
              : protectedChecking?.detail ||
                "Latch is evaluating the protected operation.",

        tool:
          "latch_authorize",
      });
    }

    // =======================================================
    // LATCH POLICY
    // =======================================================

    const policySource =
      protectedDenied ??
      protectedAllowed;

    if (
      policySource
    ) {
      timeline.push({
        id:
          `latch-policy-${policySource.id}`,

        timestamp:
          policySource.timestamp ??
          new Date().toISOString(),

        status:
          protectedDenied
            ? "DENIED"
            : "ALLOWED",

        action:
          "LATCH POLICY",

        detail:
          protectedDenied
            ? "The protected operation was denied by the configured Latch policy."
            : "The protected operation was allowed by the configured Latch policy.",

        tool:
          "latch_authorize",
      });
    }

    // =======================================================
    // STOP IF PROTECTED OPERATION DENIED
    // =======================================================

    if (
      protectedDenied
    ) {
      return timeline;
    }

    // =======================================================
    // LATCH PROXY
    // =======================================================

    const proxyCompleted =
      events.find(
        (event) =>
          event.action
            .toLowerCase()
            .includes("latch proxy") &&
          event.status ===
            "COMPLETED"
      );

    const proxyDenied =
      events.find(
        (event) =>
          event.action
            .toLowerCase()
            .includes("latch proxy") &&
          event.status ===
            "DENIED"
      );

    const proxyChecking =
      events.find(
        (event) =>
          event.action
            .toLowerCase()
            .includes("latch proxy") &&
          event.status ===
            "CHECKING"
      );

    const proxySource =
      proxyCompleted ??
      proxyDenied ??
      proxyChecking;

    if (
      proxySource
    ) {
      timeline.push({
        id:
          `latch-proxy-${proxySource.id}`,

        timestamp:
          proxySource.timestamp ??
          new Date().toISOString(),

        status:
          proxyDenied
            ? "DENIED"
            : proxyCompleted
              ? "COMPLETED"
              : "CHECKING",

        action:
          "LATCH PROXY",

        detail:
          proxyDenied
            ? "The Latch proxy rejected the protected operation."
            : proxyCompleted
              ? "The protected operation completed through the Latch proxy."
              : "The authorized operation is being executed through the Latch proxy.",

        tool:
          "latch_proxy",
      });
    }

    // =======================================================
    // AI RESPONSE
    // =======================================================

    const agentResponse =
      findEvent(
        events,
        "agent response"
      );

    if (
      agentResponse
    ) {
      timeline.push({
        id:
          `ai-response-${agentResponse.id}`,

        timestamp:
          agentResponse.timestamp ??
          new Date().toISOString(),

        status:
          agentResponse.status ===
            "DENIED"
            ? "DENIED"
            : "COMPLETED",

        action:
          "AI RESPONSE",

        detail:
          agentResponse.detail ||
          "The AI response was returned after the security checks.",

        tool:
          agentResponse.tool,
      });
    }

    return timeline;
  };

  // =========================================================
  // DYNAMIC SECURITY FLOW
  // =========================================================

  const getFlowState = (
    action: string
  ): SecurityStatus => {
    const event =
      securityEvents.find(
        (item) =>
          item.action ===
          action
      );

    if (
      event
    ) {
      return event.status;
    }

    // -------------------------------------------------------
    // If protected operation was denied,
    // proxy was NEVER executed.
    // -------------------------------------------------------

    if (
      action ===
        "LATCH PROXY" &&
      securityEvents.some(
        (event) =>
          event.action ===
            "PROTECTED OPERATION" &&
          event.status ===
            "DENIED"
      )
    ) {
      return "DENIED";
    }

    return "CHECKING";
  };

  const getFlowDetail = (
    action: string
  ): string => {
    const event =
      securityEvents.find(
        (item) =>
          item.action ===
          action
      );

    if (
      event
    ) {
      return event.detail;
    }

    if (
      action ===
        "LATCH PROXY" &&
      securityEvents.some(
        (event) =>
          event.action ===
            "PROTECTED OPERATION" &&
          event.status ===
            "DENIED"
      )
    ) {
      return "Not executed because the protected operation was denied by Latch.";
    }

    return "Waiting for the previous security step.";
  };

  // =========================================================
  // CONNECT LATCH
  // =========================================================

  const handleConnect = async () => {
    setConnecting(true);
    setConnected(false);
    setError("");
    setTools([]);
    setServerName("");
    setSecurityEvents([]);

    try {
      if (
        !apiKey.trim()
      ) {
        throw new Error(
          "Please enter your AI provider API key."
        );
      }

      if (
        !latchConfig.trim()
      ) {
        throw new Error(
          "Please paste your Latch Universal MCP configuration."
        );
      }

      try {
        JSON.parse(
          latchConfig
        );
      } catch {
        throw new Error(
          "Your Latch MCP configuration is not valid JSON."
        );
      }

      const response =
        await fetch(
          "/api/agent",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                action:
                  "connect",

                latchConfig,
              }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "Unable to connect to Latch MCP."
        );
      }

      setConnected(
        true
      );

      setTools(
        Array.isArray(
          data.tools
        )
          ? data.tools
          : []
      );

      setServerName(
        data.mcpServer ||
          "Latch"
      );

      setSecurityStatus(
        "ALLOWED"
      );

      setSecurityEvents([
        {
          id:
            `connection-${Date.now()}`,

          timestamp:
            new Date().toISOString(),

          status:
            "ALLOWED",

          action:
            "LATCH MCP CONNECTION",

          detail:
            "Connected successfully and discovered Latch tools.",
        },
      ]);
    } catch (err) {
      setConnected(
        false
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to Latch."
      );

      setSecurityStatus(
        "DENIED"
      );
    } finally {
      setConnecting(
        false
      );
    }
  };

  // =========================================================
  // SEND MESSAGE
  // =========================================================

  const handleSend = async () => {
    const userMessage =
      message.trim();

    if (
      !userMessage ||
      sending
    ) {
      return;
    }

    if (
      !connected
    ) {
      setError(
        "Please connect Latch MCP first."
      );

      return;
    }

    if (
      !apiKey.trim()
    ) {
      setError(
        "AI provider API key is required."
      );

      return;
    }

    if (
      !latchConfig.trim()
    ) {
      setError(
        "Latch MCP configuration is required."
      );

      return;
    }

    setSending(
      true
    );

    setError("");

    setSecurityStatus(
      "CHECKING"
    );

    setMessages(
      (previous) => [
        ...previous,

        {
          role:
            "user",

          content:
            userMessage,
        },
      ]
    );

    setMessage("");

    try {
      JSON.parse(
        latchConfig
      );

      const response =
        await fetch(
          "/api/agent",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                action:
                  "chat",

                provider,

                apiKey,

                latchConfig,

                message:
                  userMessage,
              }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "Agent request failed."
        );
      }

      // -----------------------------------------------------
      // IMPORTANT:
      // Only show AI response returned by backend.
      // -----------------------------------------------------

      setMessages(
        (previous) => [
          ...previous,

          {
            role:
              "assistant",

            content:
              data.response ||
              "The agent returned an empty response.",
          },
        ]
      );

      // -----------------------------------------------------
      // SECURITY EVENTS
      // -----------------------------------------------------

      if (
        data.security
      ) {
        const returnedStatus =
          data.security.status as
            | SecurityStatus
            | undefined;

        if (
          returnedStatus
        ) {
          setSecurityStatus(
            returnedStatus
          );
        }

        if (
          Array.isArray(
            data.security.events
          )
        ) {
          setSecurityEvents(
            buildSecurityTimeline(
              data.security.events,
              userMessage
            )
          );
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Agent request failed."
      );

      setSecurityStatus(
        "DENIED"
      );
    } finally {
      setSending(
        false
      );
    }
  };

  // =========================================================
  // CLEAR CHAT
  // =========================================================

  const handleClearChat = () => {
    setMessages(
      []
    );

    setSecurityEvents(
      []
    );

    setSecurityStatus(
      connected
        ? "ALLOWED"
        : "CHECKING"
    );

    setError("");
  };

  // =========================================================
  // SECURITY FLOW DATA
  // =========================================================

  const securityFlow = [
    {
      step:
        "Step 01",

      title:
        "Question Received",

      action:
        "QUESTION RECEIVED",

      description:
        "The user sends a natural language request.",
    },

    {
      step:
        "Step 02",

      title:
        "Latch Authorization",

      action:
        "LATCH AUTHORIZATION",

      description:
        "Latch verifies the request before protected processing.",
    },

    {
      step:
        "Step 03",

      title:
        "Protected Operation",

      action:
        "PROTECTED OPERATION",

      description:
        "The requested protected operation is evaluated by Latch.",
    },

    {
      step:
        "Step 04",

      title:
        "Latch Proxy",

      action:
        "LATCH PROXY",

      description:
        "Only an authorized operation is executed through the Latch proxy.",
    },

    {
      step:
        "Step 05",

      title:
        "ALLOW / DENY",

      action:
        "LATCH POLICY",

      description:
        "The final security decision determines whether execution continues.",
    },
  ];

  // =========================================================
  // UI
  // =========================================================

  return (
    <main className="min-h-screen bg-[#08090d] text-white">

      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">

        {/* ===================================================
            HEADER
        =================================================== */}

        <header className="mb-10">

          <div className="mb-4 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300">
            Advanced Security Layer
          </div>

          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
            Secure AI Agent
          </h1>

          <p className="mt-4 max-w-3xl text-lg leading-8 text-gray-400">
            A conversational AI agent where
            protected operations pass through
            your connected Latch security layer.
          </p>

        </header>

        {/* ===================================================
            ARCHITECTURE
        =================================================== */}

        <section className="mb-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6">

          <h2 className="mb-5 text-xl font-semibold">
            Agent Security Architecture
          </h2>

          <div className="grid gap-3 md:grid-cols-5">

            {[
              "User",
              "Security Layer",
              "AI Agent",
              "Latch MCP",
              "ALLOW / DENY",
            ].map(
              (item, index) => (

                <div
                  key={item}
                  className="flex items-center gap-3"
                >

                  <div className="flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-center">

                    <div className="text-sm font-medium">
                      {item}
                    </div>

                  </div>

                  {index < 4 && (
                    <span className="hidden text-gray-600 md:block">
                      →
                    </span>
                  )}

                </div>

              )
            )}

          </div>

        </section>

        {/* ===================================================
            CONFIGURATION
        =================================================== */}

        <section className="grid gap-6 lg:grid-cols-2">

          {/* AI PROVIDER */}

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">

            <h2 className="text-xl font-semibold">
              1. AI Provider
            </h2>

            <p className="mt-1 text-sm text-gray-400">
              Choose the AI provider used by
              your secure agent.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">

              <button
                type="button"
                onClick={() =>
                  setProvider(
                    "openai"
                  )
                }
                className={`rounded-2xl border px-4 py-4 text-left transition ${
                  provider ===
                  "openai"
                    ? "border-white bg-white text-black"
                    : "border-white/10 bg-black/20 text-gray-300 hover:border-white/30"
                }`}
              >

                <div className="font-semibold">
                  OpenAI
                </div>

                <div className="mt-1 text-xs opacity-60">
                  GPT models
                </div>

              </button>

              <button
                type="button"
                onClick={() =>
                  setProvider(
                    "groq"
                  )
                }
                className={`rounded-2xl border px-4 py-4 text-left transition ${
                  provider ===
                  "groq"
                    ? "border-white bg-white text-black"
                    : "border-white/10 bg-black/20 text-gray-300 hover:border-white/30"
                }`}
              >

                <div className="font-semibold">
                  Groq
                </div>

                <div className="mt-1 text-xs opacity-60">
                  Fast inference
                </div>

              </button>

            </div>

            <label className="mt-6 block text-sm font-medium text-gray-300">
              {provider ===
              "groq"
                ? "Groq API Key"
                : "OpenAI API Key"}
            </label>

            <input
              type="password"
              value={apiKey}
              onChange={(event) =>
                setApiKey(
                  event.target.value
                )
              }
              placeholder="Enter your API key"
              autoComplete="off"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-4 text-sm outline-none placeholder:text-gray-600 focus:border-white/30"
            />

          </div>

          {/* LATCH */}

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">

            <h2 className="text-xl font-semibold">
              2. Latch Security
            </h2>

            <p className="mt-1 text-sm text-gray-400">
              Connect your existing Latch
              Universal MCP configuration.
            </p>

            <label className="mt-6 block text-sm font-medium text-gray-300">
              Universal MCP Configuration
            </label>

            <textarea
              value={latchConfig}
              onChange={(event) =>
                setLatchConfig(
                  event.target.value
                )
              }
              placeholder="Paste your Latch Universal MCP JSON here..."
              className="mt-2 h-72 w-full resize-none rounded-2xl border border-white/10 bg-black/40 px-4 py-4 font-mono text-xs leading-6 outline-none placeholder:text-gray-700 focus:border-white/30"
            />

            <p className="mt-2 text-xs text-gray-600">
              Never share your Latch token publicly.
            </p>

          </div>

        </section>

        {/* ===================================================
            CONNECTION
        =================================================== */}

        <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6">

          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

            <div>

              <h2 className="text-xl font-semibold">
                Security Connection
              </h2>

              <p className="mt-1 text-sm text-gray-400">
                Connect the AI agent to your
                Latch MCP server.
              </p>

            </div>

            <button
              type="button"
              onClick={
                handleConnect
              }
              disabled={
                !apiKey.trim() ||
                !latchConfig.trim() ||
                connecting
              }
              className="rounded-2xl bg-white px-7 py-3 font-semibold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-30"
            >
              {connecting
                ? "Connecting..."
                : connected
                  ? "Latch Connected"
                  : "Connect Securely"}
            </button>

          </div>

          {error && (

            <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-4 text-sm text-red-300">

              <div className="font-semibold">
                Request failed
              </div>

              <div className="mt-1">
                {error}
              </div>

            </div>

          )}

          <div className="mt-6 border-t border-white/10 pt-5">

            <div className="flex items-center gap-3">

              <div
                className={`h-3 w-3 rounded-full ${
                  connected
                    ? "bg-green-400"
                    : connecting
                      ? "bg-yellow-400"
                      : "bg-gray-600"
                }`}
              />

              <span className="text-sm text-gray-400">

                {connected
                  ? `Latch MCP connected${
                      serverName
                        ? ` • ${serverName}`
                        : ""
                    }`
                  : connecting
                    ? "Connecting to Latch MCP..."
                    : "Waiting for connection"}

              </span>

            </div>

          </div>

        </section>

        {/* ===================================================
            TOOLS
        =================================================== */}

        {connected && (

          <section className="mt-6 rounded-3xl border border-green-500/20 bg-green-500/[0.03] p-6">

            <div className="mb-6">

              <div className="text-sm text-green-400">
                ● MCP Connected
              </div>

              <h2 className="mt-2 text-2xl font-semibold">
                Latch Tools Discovered
              </h2>

              <p className="mt-2 text-sm text-gray-400">
                Server:{" "}
                <span className="text-gray-300">
                  {serverName ||
                    "Latch"}
                </span>
              </p>

            </div>

            <div className="mb-5 rounded-2xl border border-white/10 bg-black/30 px-5 py-4">

              <div className="text-sm text-gray-500">
                Discovered tools
              </div>

              <div className="mt-1 text-3xl font-bold">
                {tools.length}
              </div>

            </div>

            {tools.length >
            0 ? (

              <div className="space-y-3">

                {tools.map(
                  (tool) => (

                    <div
                      key={
                        tool.name
                      }
                      className="rounded-2xl border border-white/10 bg-black/30 p-4"
                    >

                      <div className="font-mono text-sm text-green-300">
                        {
                          tool.name
                        }
                      </div>

                      {tool.description && (

                        <p className="mt-2 text-sm leading-6 text-gray-500">
                          {
                            tool.description
                          }
                        </p>

                      )}

                    </div>

                  )
                )}

              </div>

            ) : (

              <div className="rounded-2xl border border-white/10 bg-black/30 p-5 text-sm text-gray-500">
                Latch connected, but no tools
                were returned.
              </div>

            )}

          </section>

        )}

        {/* ===================================================
            SECURE AI AGENT
        =================================================== */}

        {connected && (

          <section className="mt-6 rounded-3xl border border-green-500/20 bg-white/[0.03] p-6">

            <div className="mb-6">

              <div className="text-sm text-green-400">
                ● Security Layer Ready
              </div>

              <h2 className="mt-2 text-2xl font-semibold">
                Secure AI Agent
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
                Talk naturally with the agent.
                Every request enters the security
                layer before protected processing.
              </p>

            </div>

            {/* CURRENT FLOW */}

            <div className="mb-6 rounded-2xl border border-white/10 bg-black/30 p-5">

              <div className="text-sm text-gray-500">
                Current flow
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">

                <span className="rounded-xl border border-white/10 px-3 py-2">
                  User
                </span>

                <span className="text-gray-600">
                  →
                </span>

                <span className="rounded-xl border border-white/10 px-3 py-2">
                  Security Layer
                </span>

                <span className="text-gray-600">
                  →
                </span>

                <span className="rounded-xl border border-white/10 px-3 py-2">
                  AI Agent
                </span>

                <span className="text-gray-600">
                  →
                </span>

                <span className="rounded-xl border border-green-500/20 bg-green-500/5 px-3 py-2 text-green-300">
                  Latch
                </span>

                <span className="text-gray-600">
                  →
                </span>

                <span className="rounded-xl border border-white/10 px-3 py-2">
                  Policy
                </span>

                <span className="text-gray-600">
                  →
                </span>

                <span className="rounded-xl border border-white/10 px-3 py-2">
                  ALLOW / DENY
                </span>

              </div>

            </div>

            {/* STATUS */}

            <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/30 p-5 md:flex-row md:items-center md:justify-between">

              <div>

                <div className="text-sm text-gray-500">
                  Security status
                </div>

                <div className="mt-1 text-sm text-gray-300">
                  Latch is the security boundary
                  for protected operations.
                </div>

              </div>

              <div
                className={`w-fit rounded-xl border px-4 py-2 text-xs font-semibold ${getStatusClass(
                  securityStatus
                )}`}
              >
                {getStatusLabel(
                  securityStatus
                )}
              </div>

            </div>

            {/* CHAT */}

            <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/30">

              <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 md:flex-row md:items-center md:justify-between">

                <div>

                  <div className="font-semibold">
                    Chat with Secure Agent
                  </div>

                  <div className="mt-1 text-xs text-gray-500">
                    Provider:{" "}
                    {provider} ·
                    Latch protected
                  </div>

                </div>

                {messages.length >
                  0 && (

                  <button
                    type="button"
                    onClick={
                      handleClearChat
                    }
                    className="w-fit rounded-xl border border-white/10 px-3 py-2 text-xs text-gray-400 transition hover:border-white/30 hover:text-white"
                  >
                    Clear Chat
                  </button>

                )}

              </div>

              <div className="min-h-[320px] space-y-4 p-5">

                {messages.length ===
                  0 && (

                  <div className="flex min-h-[280px] items-center justify-center">

                    <div className="max-w-lg text-center">

                      <div className="text-lg font-semibold text-gray-300">
                        Agent is ready
                      </div>

                      <p className="mt-3 text-sm leading-7 text-gray-500">
                        You can talk normally.
                        The agent decides when
                        Latch tools are needed.
                      </p>

                      <div className="mt-5 space-y-2 text-sm text-gray-400">

                        <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                          "hi"
                        </div>

                        <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                          "check available models"
                        </div>

                        <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                          "what permissions do I have?"
                        </div>

                        <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                          "delete a model"
                        </div>

                      </div>

                    </div>

                  </div>

                )}

                {messages.map(
                  (item, index) => (

                    <div
                      key={`${item.role}-${index}`}
                      className={`flex ${
                        item.role ===
                        "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >

                      <div
                        className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${
                          item.role ===
                          "user"
                            ? "bg-white text-black"
                            : "border border-green-500/20 bg-green-500/5 text-gray-200"
                        }`}
                      >
                        {
                          item.content
                        }
                      </div>

                    </div>

                  )
                )}

                {sending && (

                  <div className="flex justify-start">

                    <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 text-sm text-yellow-300">
                      Latch is checking the
                      request...
                    </div>

                  </div>

                )}

              </div>

              <div className="border-t border-white/10 p-4">

                <div className="flex flex-col gap-3 md:flex-row">

                  <input
                    type="text"
                    value={
                      message
                    }
                    onChange={(event) =>
                      setMessage(
                        event.target.value
                      )
                    }
                    onKeyDown={(event) => {

                      if (
                        event.key ===
                          "Enter" &&
                        !event.shiftKey
                      ) {

                        event.preventDefault();

                        handleSend();

                      }

                    }}
                    placeholder="Talk naturally with your secure AI agent..."
                    disabled={
                      sending
                    }
                    className="flex-1 rounded-2xl border border-white/10 bg-black/50 px-4 py-4 text-sm outline-none placeholder:text-gray-600 focus:border-green-500/30 disabled:opacity-50"
                  />

                  <button
                    type="button"
                    onClick={
                      handleSend
                    }
                    disabled={
                      !message.trim() ||
                      sending
                    }
                    className="rounded-2xl bg-white px-7 py-4 font-semibold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    {sending
                      ? "Running..."
                      : "Send"}
                  </button>

                </div>

                <div className="mt-3 text-xs text-gray-600">
                  Protected operations are
                  routed through Latch.
                </div>

              </div>

            </div>

          </section>

        )}

        {/* ===================================================
            ACTIVITY & AUTHORIZATION
        =================================================== */}

        {connected && (

          <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6">

            <div className="mb-5">

              <h2 className="text-xl font-semibold">
                Activity & Authorization
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Security decisions and agent
                activity from the current session.
              </p>

            </div>

            {securityEvents.length ===
              0 ? (

              <div className="rounded-2xl border border-white/10 bg-black/30 p-5 text-sm text-gray-600">
                No security events yet.
              </div>

            ) : (

              <div className="relative space-y-4">

                {securityEvents.map(
                  (event, index) => (

                    <div
                      key={
                        event.id
                      }
                      className="relative flex gap-4"
                    >

                      {index <
                        securityEvents.length -
                          1 && (

                        <div className="absolute left-5 top-11 h-[calc(100%+16px)] w-px bg-white/10" />

                      )}

                      <div
                        className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${getStatusClass(
                          event.status
                        )}`}
                      >
                        {
                          getEventIcon(
                            event.status
                          )
                        }
                      </div>

                      <div className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/30 p-4">

                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">

                          <div className="min-w-0">

                            <div className="font-medium uppercase tracking-wide text-gray-200">
                              {
                                event.action
                              }
                            </div>

                            <div className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-gray-500">
                              {
                                event.detail
                              }
                            </div>

                            {event.tool && (

                              <div className="mt-2 break-all font-mono text-xs text-gray-600">
                                Tool:{" "}
                                {
                                  event.tool
                                }
                              </div>

                            )}

                            <div className="mt-3 text-xs text-gray-700">
                              {new Date(
                                event.timestamp
                              ).toLocaleTimeString()}
                            </div>

                          </div>

                          <div
                            className={`w-fit shrink-0 rounded-xl border px-3 py-2 text-xs font-semibold ${getStatusClass(
                              event.status
                            )}`}
                          >
                            {
                              getStatusLabel(
                                event.status
                              )
                            }
                          </div>

                        </div>

                      </div>

                    </div>

                  )
                )}

              </div>

            )}

          </section>

        )}

        {/* ===================================================
            SECURITY FLOW
        =================================================== */}

        <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6">

          <div className="mb-5">

            <h2 className="text-xl font-semibold">
              Security Flow
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              The flow updates according to the
              actual Latch authorization result.
            </p>

          </div>

          <div className="grid gap-3 md:grid-cols-5">

            {securityFlow.map(
              (item) => {

                const status =
                  getFlowState(
                    item.action
                  );

                const detail =
                  getFlowDetail(
                    item.action
                  );

                const isNotExecuted =
                  item.action ===
                    "LATCH PROXY" &&
                  detail.startsWith(
                    "Not executed"
                  );

                return (

                  <div
                    key={
                      item.step
                    }
                    className={`rounded-2xl border p-4 transition ${
                      isNotExecuted
                        ? "border-white/10 bg-black/20"
                        : status ===
                            "DENIED"
                          ? "border-red-500/20 bg-red-500/[0.03]"
                          : status ===
                              "ALLOWED"
                            ? "border-green-500/20 bg-green-500/[0.03]"
                            : status ===
                                "COMPLETED"
                              ? "border-blue-500/20 bg-blue-500/[0.03]"
                              : "border-white/10 bg-black/30"
                    }`}
                  >

                    <div className="text-[10px] uppercase tracking-widest text-gray-600">
                      {
                        item.step
                      }
                    </div>

                    <div className="mt-2 font-semibold">
                      {
                        item.title
                      }
                    </div>

                    <p className="mt-2 min-h-[55px] text-xs leading-5 text-gray-500">
                      {
                        detail
                      }
                    </p>

                    <div
                      className={`mt-3 w-fit rounded-lg border px-2 py-1 text-[9px] font-semibold ${
                        isNotExecuted
                          ? "border-white/10 bg-white/5 text-gray-500"
                          : getStatusClass(
                              status
                            )
                      }`}
                    >
                      {isNotExecuted
                        ? "NOT EXECUTED"
                        : getStatusLabel(
                            status
                          )}
                    </div>

                  </div>

                );
              }
            )}

          </div>

        </section>

      </div>

    </main>
  );
}