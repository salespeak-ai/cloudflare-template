const ORGANIZATION_ID = "87996776-2ccf-4198-bd8a-3aa7c5a6986c";
const ALT_ORIGIN     = `https://salespeak-public-serving.s3.amazonaws.com/${ORGANIZATION_ID}`;
const CHATGPT_UA_RE  = /ChatGPT-User\/1\.0/i;
const GPTBOT_UA_RE        = /GPTBot\/1\.0/i;
const GOOGLE_EXTENDED_RE  = /Google-Extended/i;
const BING_PREVIEW_RE     = /bingpreview/i;
const PERPLEXITY_UA_RE = /PerplexityBot/i;

export default {
  async fetch(request) {
    const ua      = request.headers.get("user-agent") || "";
    const url     = new URL(request.url);
    const qsAgent = url.searchParams.get("user-agent")?.toLowerCase();
    const isChatGPT = CHATGPT_UA_RE.test(ua) || qsAgent === "chatgpt";
    const isGPTBot         = GPTBOT_UA_RE.test(ua);
    const isGoogleExtended = GOOGLE_EXTENDED_RE.test(ua);
    const isBingPreview    = BING_PREVIEW_RE.test(ua);
    const isPerplexity     = PERPLEXITY_UA_RE.test(ua);

    const isAIVisitor = isChatGPT || isGPTBot || isGoogleExtended || isBingPreview || isPerplexity;

    // Extract the current webserver origin from the request
    const currentWebserverOrigin = url.origin;
    
    const requestId = crypto.randomUUID();
    const EXTERNAL_API_URL =  "https://22i9zfydr3.execute-api.us-west-2.amazonaws.com/prod/event_stream"; 
    const userAgent = ua || "unknown";
    console.log("📱 User-Agent:", ua);
    console.log("🌐 Current webserver origin:", currentWebserverOrigin);

    if (isAIVisitor) {
      const botType = isChatGPT ? "ChatGPT-User"
              : isGPTBot ? "GPTBot"
              : isGoogleExtended ? "Google-Extended"
              : isBingPreview ? "BingPreview"
              : isPerplexity ? "PerplexityBot"
              : "Unknown";
      console.log(botType);
      const postPayload = {
        data: {
          launcher: "proxy",
          url: url.toString(),
          bot_type: botType 
        },
        event_type: "chatgpt_user_agent",
        url: url.toString(),
        user_id: requestId,
        campaign_id: "00000000-0000-0000-0000-000000000000",
        organization_id: ORGANIZATION_ID
      };

      const headers = {
        "Content-Type": "application/json",
        "User-Agent": "PostmanRuntime/7.32.2"
      };

      fetch(EXTERNAL_API_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(postPayload)
      })
      .then(resp => console.log(`📤 Event POST status: ${resp.status}`))
      .catch(err => console.error("❌ Failed to POST event:", err));
    }

    /* ─────────────────────────────────────────────── Non-ChatGPT ─────── */
    if (!isAIVisitor) {
      console.log("🟡 Non-ChatGPT → Current webserver", url.pathname + url.search);
      return fetchWithHost(currentWebserverOrigin, url, request, /*fixHost=*/true);
    }

    /* ─────────────────────────────────────────── Try ALT_ORIGIN ─────── */
    const altResp = await fetchWithHost(
      ALT_ORIGIN, url, request, /*fixHost=*/false, /*logURL=*/true
    );
    console.log("🔵 ALT status", altResp.status, "for", url.pathname + url.search);

    if (altResp.ok) {
      console.log("🔵 ALT served OK – returning ALT response");
      return altResp;
    }

    /* ───────────────────────────────────────── Fallback → Current webserver ───── */
    console.log("🟠 ALT miss – fetching Current webserver for", url.pathname);
    let wfResp = await fetchWithHost(currentWebserverOrigin, url, request, /*fixHost=*/true);

    /* Follow a single redirect (Current webserver → canonical slash) */
    if (wfResp.status >= 300 && wfResp.status < 400) {
      const loc = wfResp.headers.get("location");
      if (loc) {
        console.log("↪️  Current webserver redirect →", loc);
        const canonURL = new URL(loc, currentWebserverOrigin);
        wfResp = await fetchWithHost(canonURL.origin, canonURL, request, true);
      }
    }

    console.log("🟠 Current webserver fallback – returning unmodified response for", url.pathname);
    return wfResp;
  }
};

/* ───────────────────────────── Helper ─────────────────────────────── */
async function fetchWithHost(origin, originalURL, req,
                             fixHost = false, logURL = false) {
  const proxied = new URL(origin + originalURL.pathname + originalURL.search);
  if (logURL) console.log("➡️  ALT_ORIGIN fetch →", proxied.toString());

  const init = {
    method:  req.method,
    headers: new Headers(req.headers),
    body:    req.body,
    redirect:"manual"          // stay in control of redirects
  };
  if (fixHost) init.headers.set("host", origin.replace("https://", ""));
  return fetch(proxied, init);
} 