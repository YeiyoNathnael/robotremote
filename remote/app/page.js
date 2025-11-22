'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  // Use environment variable or fallback to manual input
  const defaultUrl = process.env.NEXT_PUBLIC_ARDUINO_WS_URL || '';
  const [wsUrl, setWsUrl] = useState(defaultUrl);
  const [isConnected, setIsConnected] = useState(false);
  const [useManualUrl, setUseManualUrl] = useState(!defaultUrl);

  useEffect(() => {
    /* Config */
    const DEAD_ZONE = 20;

    /* DOM */
    const joystick = document.getElementById('joystick');
    const thumb = document.getElementById('thumb');
    const speedSlider = document.getElementById('speedSlider');
    const stopBtn = document.getElementById('stopBtn');
    const statusEl = document.getElementById('status');

    let ws;
    let dragging = false;
    let lastDir = "";

    /* Build websocket address */
    function buildWsUrl() {
      // If manual URL mode and URL doesn't include protocol, add ws://
      if (useManualUrl && wsUrl && !wsUrl.startsWith('ws://') && !wsUrl.startsWith('wss://')) {
        return `ws://${wsUrl}:81`;
      }
      return wsUrl;
    }

    /* Connect websocket */
    function connectWS() {
      const url = buildWsUrl();
      statusEl.textContent = `WS: ${url}`;
      try {
        ws = new WebSocket(url);
      } catch (e) {
        statusEl.textContent = 'WS: error';
        console.error(e);
        setIsConnected(false);
        return;
      }

      ws.onopen = () => {
        statusEl.textContent = 'WS: connected';
        setIsConnected(true);
      };
      ws.onclose = () => {
        statusEl.textContent = 'WS: closed';
        setIsConnected(false);
        setTimeout(connectWS, 1000);
      };
      ws.onerror = (e) => {
        statusEl.textContent = 'WS: error';
        setIsConnected(false);
      };
      ws.onmessage = (ev) => {
        // optional: handle status messages from Arduino
      };
    }

    /* send commands */
    function sendMove(dir) {
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      const speed = parseInt(speedSlider.value) || 150;
      const msg = `move:${dir}:${speed}`;
      if (msg === lastSentMsg()) return;
      ws.send(msg);
      lastDir = dir;
    }
    function sendStop() {
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      ws.send('stop');
      lastDir = "";
    }
    function lastSentMsg() {
      const speed = parseInt(speedSlider.value) || 150;
      return lastDir ? `move:${lastDir}:${speed}` : 'stop';
    }

    /* Direction detection */
    function getDirection(x, y) {
      const rect = joystick.getBoundingClientRect();
      const cx = rect.left + rect.width/2;
      const cy = rect.top + rect.height/2;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < DEAD_ZONE) return "none";
      if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
      return dy < 0 ? "forward" : "backward";
    }

    /* Thumb move */
    function moveThumb(x, y) {
      const rect = joystick.getBoundingClientRect();
      const cx = rect.width/2;
      const cy = rect.height/2;
      const localX = x - rect.left;
      const localY = y - rect.top;
      const dx = localX - cx;
      const dy = localY - cy;
      const radius = rect.width/2 - 30;
      const dist = Math.min(Math.sqrt(dx*dx + dy*dy), radius);
      const angle = Math.atan2(dy, dx);
      const left = cx + dist * Math.cos(angle);
      const top = cy + dist * Math.sin(angle);
      thumb.style.left = left + 'px';
      thumb.style.top = top + 'px';
    }
    function resetThumb() {
      thumb.style.left = '50%';
      thumb.style.top = '50%';
    }

    /* Pointer handlers */
    function pointerStart(clientX, clientY) {
      dragging = true;
      const dir = getDirection(clientX, clientY);
      if (dir !== "none") sendMove(dir);
      moveThumb(clientX, clientY);
    }
    function pointerMove(clientX, clientY) {
      if (!dragging) return;
      const dir = getDirection(clientX, clientY);
      if (dir === "none") {
        sendStop();
      } else {
        if (dir !== lastDir) sendMove(dir);
      }
      moveThumb(clientX, clientY);
    }
    function pointerEnd() {
      dragging = false;
      resetThumb();
      sendStop();
    }

    /* Event wiring */
    if (window.PointerEvent) {
      joystick.addEventListener('pointerdown', e => { e.preventDefault(); joystick.setPointerCapture(e.pointerId); pointerStart(e.clientX, e.clientY); });
      joystick.addEventListener('pointermove', e => { e.preventDefault(); pointerMove(e.clientX, e.clientY); });
      joystick.addEventListener('pointerup', e => { e.preventDefault(); joystick.releasePointerCapture(e.pointerId); pointerEnd(); });
      joystick.addEventListener('pointercancel', e => { e.preventDefault(); pointerEnd(); });
    } else {
      joystick.addEventListener('touchstart', e => { e.preventDefault(); const t = e.touches[0]; pointerStart(t.clientX, t.clientY); }, {passive:false});
      joystick.addEventListener('touchmove', e => { e.preventDefault(); const t = e.touches[0]; pointerMove(t.clientX, t.clientY); }, {passive:false});
      joystick.addEventListener('touchend', e => { e.preventDefault(); pointerEnd(); }, {passive:false});
      joystick.addEventListener('mousedown', e => { e.preventDefault(); pointerStart(e.clientX, e.clientY); });
      window.addEventListener('mousemove', e => { if (dragging) pointerMove(e.clientX, e.clientY); });
      window.addEventListener('mouseup', e => { if (dragging) pointerEnd(); });
    }

    stopBtn.addEventListener('touchstart', e => { e.preventDefault(); sendStop(); }, {passive:false});
    stopBtn.addEventListener('click', () => sendStop());

    speedSlider.addEventListener('input', () => {
      if (lastDir !== "") {
        sendMove(lastDir);
      }
    });

    document.body.addEventListener('touchmove', function(e) { if (dragging) e.preventDefault(); }, { passive:false });

    connectWS();

    return () => {
      if (ws) ws.close();
    };
  }, [wsUrl, useManualUrl]);

  return (
    <>
      <style jsx global>{`
        html,body{margin:0;padding:0;height:100%;width:100%;background:#0f1113;color:#fff;font-family:Arial,Helvetica,sans-serif;user-select:none; -webkit-user-select:none; overflow:hidden;}
        .container{display:grid;grid-template-columns:35% 15% 50%;height:100vh;gap:10px;padding:10px;box-sizing:border-box;}
        .left{display:flex;justify-content:center;align-items:center;}
        .speed-slider{writing-mode:bt-lr;-webkit-appearance:slider-vertical;width:120px;height:90%;padding:18px;touch-action:none;}
        .center{display:flex;justify-content:center;align-items:center;}
        .stop-btn{width:130px;height:130px;border-radius:50%;background:linear-gradient(180deg,#ff486d 0%,#c32a4a 100%);border:none;font-size:24px;color:#fff;box-shadow:0 8px 20px rgba(195,42,74,0.45);}
        .stop-btn:active{transform:scale(0.96);}
        .right{display:flex;justify-content:center;align-items:center;}
        .joystick{position:relative;width:90%;height:90%;background:rgba(255,255,255,0.02);border-radius:50%;touch-action:none;-webkit-tap-highlight-color:transparent;}
        .thumb{position:absolute;width:60px;height:60px;background:#3db3ff;border-radius:50%;transform:translate(-50%,-50%);top:50%;left:50%;transition:left 0s,top 0s;}
        .arrow-label{position:absolute;font-size:24px;color:#fff;pointer-events:none;opacity:0.85;}
        .arrow-label.up{top:6%;left:50%;transform:translateX(-50%);}
        .arrow-label.down{bottom:6%;left:50%;transform:translateX(-50%);}
        .arrow-label.left{left:6%;top:50%;transform:translateY(-50%);}
        .arrow-label.right{right:6%;top:50%;transform:translateY(-50%);}
        .info{position:absolute;left:8px;top:8px;font-size:12px;opacity:0.8;color:#ccc;}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:30px;height:30px;background:#3db3ff;border-radius:50%;border:2px solid #0f1113;}
        .status { position: absolute; right: 8px; top: 8px; font-size:12px; opacity:0.9; color:#cfc; }
        .ip-config { position: absolute; left: 50%; top: 8px; transform: translateX(-50%); display: flex; gap: 8px; align-items: center; z-index: 100; }
        .ip-input { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); color: #fff; padding: 6px 10px; border-radius: 4px; font-size: 12px; width: 140px; }
        .connect-btn { background: #3db3ff; border: none; color: #fff; padding: 6px 12px; border-radius: 4px; font-size: 12px; cursor: pointer; }
        .connect-btn:hover { background: #2a9de6; }
        .connect-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .warning { position: absolute; left: 50%; top: 50px; transform: translateX(-50%); background: rgba(255,200,0,0.15); border: 1px solid rgba(255,200,0,0.5); padding: 12px 20px; border-radius: 6px; font-size: 13px; color: #ffc800; text-align: center; max-width: 80%; }
      `}</style>
      
      <div className="info">Dead zone: 20px • {defaultUrl ? `URL: ${defaultUrl}` : 'Manual mode'}</div>
      <div className="status" id="status">WS: connecting…</div>

      {useManualUrl && (
        <div className="ip-config">
          <input 
            type="text" 
            className="ip-input" 
            value={wsUrl}
            onChange={(e) => setWsUrl(e.target.value)}
            placeholder="ws://10.77.0.10:81 or wss://robot.yourdomain.com"
            disabled={isConnected}
            style={{width: '280px'}}
          />
          <button 
            className="connect-btn"
            onClick={() => setWsUrl(wsUrl)}
            disabled={isConnected}
          >
            {isConnected ? 'Connected' : 'Connect'}
          </button>
        </div>
      )}

      {typeof window !== 'undefined' && window.location.protocol === 'https:' && wsUrl.startsWith('ws://') && (
        <div className="warning">
          ⚠️ HTTPS sites cannot connect to insecure WebSocket (ws://). 
          Use wss:// (Cloudflare Tunnel) or open via HTTP.
        </div>
      )}

      <div className="container">
        <div className="left">
          <input id="speedSlider" className="speed-slider" type="range" min="0" max="255" defaultValue="150" />
        </div>

        <div className="center">
          <button id="stopBtn" className="stop-btn">STOP</button>
        </div>

        <div className="right">
          <div id="joystick" className="joystick" role="application" aria-label="Joystick">
            <div id="thumb" className="thumb"></div>
            <div className="arrow-label up">&#9650;</div>
            <div className="arrow-label down">&#9660;</div>
            <div className="arrow-label left">&#9664;</div>
            <div className="arrow-label right">&#9654;</div>
          </div>
        </div>
      </div>
    </>
  );
}
