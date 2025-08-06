const ORGANIZATION_ID = "XXXX6776-2ccf-4198-bd8a-3aa7c5a6986c";
const ALT_ORIGIN     = `https://salespeak-public-serving.s3.amazonaws.com/${ORGANIZATION_ID}`;
const CHATGPT_UA_RE  = /ChatGPT-User\/1\.0/i;
const GPTBOT_UA_RE   = /GPTBot\/1\.0/i;
const GOOGLE_EXTENDED_RE  = /Google-Extended/i;
const BING_PREVIEW_RE     = /bingpreview/i;
const PERPLEXITY_UA_RE    = /PerplexityBot/i;

// ✅ Claude-specific user agent patterns
const CLAUDE_USER_RE  = /Claude-User/i;
const CLAUDE_WEB_RE   = /Claude-Web/i;
const CLAUDE_BOT_RE   = /ClaudeBot/i;

export default {
  async fetch(request) {
    const ua      = request.headers.get("user-agent") || "";
    const url     = new URL(request.url);
    const qsAgent = url.searchParams.get("user-agent")?.toLowerCase();
    
    const isChatGPT        = CHATGPT_UA_RE.test(ua) || qsAgent === "chatgpt";
    const isGPTBot         = GPTBOT_UA_RE.test(ua);
    const isGoogleExtended = GOOGLE_EXTENDED_RE.test(ua);
    const isBingPreview    = BING_PREVIEW_RE.test(ua);
    const isPerplexity     = PERPLEXITY_UA_RE.test(ua);
    
    const isClaudeUser     = CLAUDE_USER_RE.test(ua);
    const isClaudeWeb      = CLAUDE_WEB_RE.test(ua);
    const isClaudeBot      = CLAUDE_BOT_RE.test(ua);

    const isAIVisitor = isChatGPT || isGPTBot || isGoogleExtended || isBingPreview || isPerplexity || isClaudeUser || isClaudeWeb || isClaudeBot;

    const currentWebserverOrigin = url.origin;
    const requestId = crypto.randomUUID();
    const EXTERNAL_API_URL = "https://22i9zfydr3.execute-api.us-west-2.amazonaws.com/prod/event_stream";

    console.log("📱 User-Agent:", ua);
    console.log("🌐 Current webserver origin:", currentWebserverOrigin);

    // Log AI visits asynchronously
    if (isAIVisitor) {
      const botType = isChatGPT ? "ChatGPT-User"
        : isGPTBot ? "GPTBot"
        : isGoogleExtended ? "Google-Extended"
        : isBingPreview ? "BingPreview"
        : isPerplexity ? "PerplexityBot"
        : isClaudeUser ? "Claude-User"
        : isClaudeWeb ? "Claude-Web"
        : isClaudeBot ? "ClaudeBot"
        : "Unknown";

      console.log(botType);

      const postPayload = {
        data: { launcher: "proxy", url: url.toString(), bot_type: botType },
        event_type: "chatgpt_user_agent",
        url: url.toString(),
        user_id: requestId,
        campaign_id: "00000000-0000-0000-0000-000000000000",
        organization_id: ORGANIZATION_ID
      };

      fetch(EXTERNAL_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "PostmanRuntime/7.32.2"
        },
        body: JSON.stringify(postPayload)
      }).catch(err => console.error("❌ Failed to POST event:", err));
    }

    let response;

    /* ─────────── Non-AI visitors: Normal caching ─────────── */
    if (!isAIVisitor) {
      console.log("🟡 Non-ChatGPT → Current webserver", url.pathname + url.search);
      response = await fetchWithHost(currentWebserverOrigin, url, request, true, false);
    } else {
      /* ─────────── AI visitors: ALT_ORIGIN with cache bypass ─────────── */
      const altResp = await fetchWithHost(ALT_ORIGIN, url, request, false, true, true);
      console.log("🔵 ALT status", altResp.status, "for", url.pathname + url.search);

      if (altResp.ok) {
        response = altResp;
      } else {
        console.log("🟠 ALT miss – fetching Current webserver for", url.pathname);
        response = await fetchWithHost(currentWebserverOrigin, url, request, true, false, true);

        // Follow single redirect if needed
        if (response.status >= 300 && response.status < 400) {
          const loc = response.headers.get("location");
          if (loc) {
            console.log("↪️  Current webserver redirect →", loc);
            const canonURL = new URL(loc, currentWebserverOrigin);
            response = await fetchWithHost(canonURL.origin, canonURL, request, true, false, true);
          }
        }
      }
    }

    /* ✅ Add Vary: User-Agent to all responses */
    const newHeaders = new Headers(response.headers);
    newHeaders.set("Vary", "User-Agent");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  }
};

/* ─────────── Helper Function ─────────── */
async function fetchWithHost(origin, originalURL, req, fixHost = false, logURL = false, bypassCache = false) {
  const proxied = new URL(origin + originalURL.pathname + originalURL.search);
  if (logURL) console.log("➡️  Fetching →", proxied.toString());

  const init = {
    method:  req.method,
    headers: new Headers(req.headers),
    body:    req.body,
    redirect:"manual",
    cf: bypassCache ? { cacheTtl: 0, cacheEverything: false } : undefined
  };
  if (fixHost) init.headers.set("host", origin.replace("https://", ""));
  return fetch(proxied, init);
}
