# Cloudflare Tunnel Setup for Arduino WebSocket

This guide will help you expose your Arduino's WebSocket server securely using Cloudflare Tunnel, allowing your Vercel-deployed app to connect over HTTPS/WSS.

## Prerequisites

- A Cloudflare account (free tier works)
- Your Arduino running on `10.77.0.10:81`
- Node.js and npm installed

## Step 1: Install Wrangler (if not already installed)

```bash
npm install -g wrangler
# or use npx without global install
```

## Step 2: Authenticate with Cloudflare

```bash
npx wrangler login
```

This will open a browser window to log in to your Cloudflare account.

## Step 3: Create a Tunnel

```bash
npx wrangler tunnel create arduino-robot
```

Take note of the tunnel ID that's displayed (something like `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`).

## Step 4: Configure DNS Route

```bash
npx wrangler tunnel route dns arduino-robot robot.yourdomain.com
```

**Replace** `robot.yourdomain.com` with a subdomain of one of your Cloudflare domains.

## Step 5: Run the Tunnel

```bash
npx wrangler tunnel run --url ws://10.77.0.10:81 arduino-robot
```

Or if you prefer using the standalone cloudflared:

### Alternative: Using cloudflared directly

#### On Linux (Debian/Ubuntu):
```bash
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

#### On macOS:
```bash
brew install cloudflare/cloudflare/cloudflared
```

Then run:
```bash
cloudflared tunnel --url ws://10.77.0.10:81
```

This gives you a temporary URL, or create a permanent one with config files (see original steps).

## Step 7: Test the Connection

Your Arduino WebSocket is now available at:
```
wss://robot.yourdomain.com
```

You can test it in your browser console:
```javascript
const ws = new WebSocket('wss://robot.yourdomain.com');
ws.onopen = () => console.log('Connected!');
ws.onerror = (e) => console.error('Error:', e);
```

## Step 8: Update Your Next.js App

Update the Arduino IP in your app to use your Cloudflare tunnel URL:
- Instead of: `ws://10.77.0.10:81`
- Use: `wss://robot.yourdomain.com`

## Troubleshooting

1. **Connection refused**: Make sure your Arduino is running and accessible
2. **Tunnel not found**: Check that the tunnel name matches in config.yml
3. **DNS not resolving**: Wait a few minutes for DNS propagation
4. **WebSocket upgrade failed**: Ensure the service URL in config.yml is correct

## Notes

- The tunnel must be running whenever you want to access your Arduino remotely
- The free Cloudflare plan includes unlimited tunnels
- Your Arduino traffic will be encrypted end-to-end
- You can access your Arduino from anywhere in the world
