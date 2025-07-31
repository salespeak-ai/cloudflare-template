# Cloudflare Worker Template

A Cloudflare Worker that provides AI bot detection and proxy functionality. This worker detects various AI bots (ChatGPT, GPTBot, Google Extended, Bing Preview, Perplexity) and handles requests accordingly.

## Features

- **AI Bot Detection**: Detects ChatGPT, GPTBot, Google Extended, Bing Preview, and Perplexity bots
- **Proxy Functionality**: Routes requests to different origins based on bot detection
- **Event Tracking**: Sends events to external API when AI bots are detected
- **Fallback Handling**: Graceful fallback to original webserver when needed
- **Redirect Support**: Handles redirects from the original webserver

## Prerequisites

- Node.js 18+ installed
- Cloudflare account with Workers enabled
- Wrangler CLI installed globally

## Installation

1. **Install Wrangler CLI** (if not already installed):
   ```bash
   npm install -g wrangler
   ```

2. **Install project dependencies**:
   ```bash
   npm install
   ```

3. **Login to Cloudflare**:
   ```bash
   wrangler login
   ```

## Configuration

### Environment Variables

The worker uses several configuration constants that you may want to customize:

- `ORGANIZATION_ID`: Your organization identifier
- `ALT_ORIGIN`: Alternative origin for serving AI bot requests
- `EXTERNAL_API_URL`: API endpoint for event tracking

### Wrangler Configuration

Edit `wrangler.toml` to configure your deployment:

```toml
name = "your-worker-name"
main = "index.js"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

[env.production]
name = "your-worker-name-prod"

[env.staging]
name = "your-worker-name-staging"
```

## Development

### Local Development

Run the worker locally for development:

```bash
npm run dev
```

This will start a local development server at `http://localhost:8787`.

### Testing

You can test the bot detection by setting the `user-agent` query parameter:

```bash
# Test ChatGPT detection
curl "http://localhost:8787/?user-agent=chatgpt"

# Test with actual ChatGPT User-Agent
curl -H "User-Agent: ChatGPT-User/1.0" "http://localhost:8787/"
```

## Deployment

### Deploy to Staging

```bash
npm run deploy:staging
```

### Deploy to Production

```bash
npm run deploy:production
```

### View Logs

```bash
npm run tail
```

## How It Works

1. **Request Analysis**: The worker analyzes incoming requests for AI bot user agents
2. **Bot Detection**: Detects various AI bots using regex patterns
3. **Event Tracking**: For AI bots, sends events to external API
4. **Routing Logic**:
   - **Non-AI visitors**: Directly served from current webserver
   - **AI visitors**: First tries ALT_ORIGIN, falls back to current webserver
5. **Response Handling**: Returns appropriate responses with proper headers

## Bot Detection

The worker detects the following AI bots:

- **ChatGPT-User**: `ChatGPT-User/1.0`
- **GPTBot**: `GPTBot/1.0`
- **Google Extended**: `Google-Extended`
- **Bing Preview**: `bingpreview`
- **PerplexityBot**: `PerplexityBot`

## Customization

### Adding New Bot Detection

To add detection for a new AI bot, add a new regex pattern:

```javascript
const NEW_BOT_RE = /NewBotPattern/i;
```

Then update the detection logic:

```javascript
const isNewBot = NEW_BOT_RE.test(ua);
const isAIVisitor = isChatGPT || isGPTBot || /* ... */ || isNewBot;
```

### Modifying Event Payload

Edit the `postPayload` object in the main handler to customize the event data sent to your API.

## Troubleshooting

### Common Issues

1. **Deployment Fails**: Ensure you're logged in to Cloudflare and have proper permissions
2. **Local Development Issues**: Check that Node.js version is 18+ and Wrangler is properly installed
3. **Bot Detection Not Working**: Verify the user-agent patterns match your test cases

### Debugging

Use the console logs to debug issues:

```bash
npm run tail
```

The worker includes extensive logging with emojis for easy identification of different request types.

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For issues and questions, please check the Cloudflare Workers documentation or create an issue in this repository. 