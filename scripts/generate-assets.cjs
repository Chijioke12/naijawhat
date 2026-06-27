const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let createCanvas;
try {
  const canvas = require('canvas');
  createCanvas = canvas.createCanvas;
  console.log('Using node-canvas for asset generation.');
} catch (e) {
  console.log('node-canvas not found or failed to load. Falling back to ImageMagick.');
}

const targetPlatform = 'kaios';
const SUITS = {
  circle: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14],
  triangle: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14],
  cross: [1, 2, 3, 5, 7, 10, 11, 13, 14],
  square: [1, 2, 3, 5, 7, 10, 11, 13, 14],
  star: [1, 2, 3, 4, 5, 7, 8]
};

const COLORS = {
  circle: { base: '#c0392b', grad: '#e74c3c' },
  triangle: { base: '#27ae60', grad: '#2ecc71' },
  cross: { base: '#2980b9', grad: '#3498db' },
  square: { base: '#d35400', grad: '#e67e22' },
  star: { base: '#8e44ad', grad: '#9b59b6' },
  whot: { base: '#2c3e50', grad: '#34495e' },
  back: { base: '#1a2a6c', grad: '#b21f1f' }
};

// Target high-res dimensions for sharpness
const CARD_W = 46;
const CARD_H = 68;
const COLS = 10;
const ROWS = 6;

const drawRoundedRect = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

const drawSymbol = (ctx, suit, x, y, size, colors) => {
  ctx.save();
  ctx.translate(x, y);
  
  ctx.fillStyle = colors.base;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(2, size * 0.15);
  ctx.lineJoin = 'round';
  
  ctx.beginPath();
  if (suit === 'circle') {
    ctx.arc(0, 0, size, 0, Math.PI * 2);
  } else if (suit === 'triangle') {
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 1.1, size * 0.8);
    ctx.lineTo(-size * 1.1, size * 0.8);
  } else if (suit === 'square') {
    const s = size * 0.9;
    ctx.rect(-s, -s, s * 2, s * 2);
  } else if (suit === 'cross') {
    const w = size * 0.35;
    const s = size;
    ctx.moveTo(-w, -s); ctx.lineTo(w, -s); ctx.lineTo(w, -w); ctx.lineTo(s, -w);
    ctx.lineTo(s, w); ctx.lineTo(w, w); ctx.lineTo(w, s); ctx.lineTo(-w, s);
    ctx.lineTo(-w, w); ctx.lineTo(-s, w); ctx.lineTo(-s, -w); ctx.lineTo(-w, -w);
  } else if (suit === 'star') {
    for (let i = 0; i < 5; i++) {
      ctx.lineTo(
        Math.cos((18 + i * 72) * Math.PI / 180) * size * 1.1,
        -Math.sin((18 + i * 72) * Math.PI / 180) * size * 1.1
      );
      ctx.lineTo(
        Math.cos((54 + i * 72) * Math.PI / 180) * (size * 0.45),
        -Math.sin((54 + i * 72) * Math.PI / 180) * (size * 0.45)
      );
    }
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
};

// Use absolute paths to avoid issues when running from scripts/ directory
const publicDir = path.join(__dirname, '..', 'public');
const spritePath = path.join(publicDir, 'whot_spritesheet.png');
const atlasPath = path.join(publicDir, 'whot_atlas.json');

const generateWithCanvas = () => {
  const canvas = createCanvas(CARD_W * COLS, CARD_H * ROWS);
  const ctx = canvas.getContext('2d');
  const frames = [];
  let col = 0;
  let row = 0;

  const addFrame = (name) => {
    const x = col * CARD_W;
    const y = row * CARD_H;
    frames.push({
      filename: name,
      frame: { x, y, w: CARD_W, h: CARD_H },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: CARD_W, h: CARD_H },
      sourceSize: { w: CARD_W, h: CARD_H }
    });
    col++;
    if (col >= COLS) { col = 0; row++; }
    return { x, y };
  };

  const drawCard = (suit, num, isBack, index) => {
    let name = isBack ? 'back' : (suit === 'whot' ? `whot_${num}` : `${suit}_${num}`);
    if (index !== undefined) name = `${name}_${index}`;
    
    const { x, y } = addFrame(name);
    const w = CARD_W - 4;
    const h = CARD_H - 4;
    const cx = x + 2;
    const cy = y + 2;

    ctx.save();
    drawRoundedRect(ctx, cx, cy, w, h, 6);
    ctx.fillStyle = isBack ? COLORS.back.base : '#ffffff';
    ctx.fill();
    ctx.strokeStyle = isBack ? '#f1c40f' : '#dddddd';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (isBack) {
      ctx.fillStyle = '#f1c40f';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 8px Arial';
      ctx.fillText('WHOT!', cx + w / 2, cy + h / 2);
    } else {
      ctx.fillStyle = COLORS[suit].base;
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(num.toString(), cx + 8, cy + 4);
      
      ctx.save();
      ctx.translate(cx + w - 8, cy + h - 4);
      ctx.rotate(Math.PI);
      ctx.fillText(num.toString(), 0, 0);
      ctx.restore();

      if (suit === 'whot') {
        ctx.fillStyle = '#111';
        ctx.font = 'bold 8px Arial';
        ctx.fillText('WHOT', cx + w / 2, cy + h / 2 - 4);
        ctx.fillText('20', cx + w / 2, cy + h / 2 + 6);
      } else {
        drawSymbol(ctx, suit, cx + w / 2, cy + h / 2, 12, COLORS[suit]);
        if (suit === 'star') {
           ctx.font = 'bold 8px Arial';
           ctx.fillText(`(${num * 2})`, cx + w / 2, cy + h / 2 + 14);
        }
      }
    }
    ctx.restore();
  };

  drawCard(null, null, true);
  for (let i = 1; i <= 5; i++) drawCard('whot', 20, false, i);
  for (const suit in SUITS) {
    for (const num of SUITS[suit]) drawCard(suit, num, false);
  }

  const atlas = {
    textures: [{
      image: "whot_spritesheet.png",
      format: "RGBA8888",
      size: { w: canvas.width, h: canvas.height },
      scale: 1,
      frames
    }]
  };

  const out = fs.createWriteStream(spritePath);
  canvas.createPNGStream().pipe(out);
  fs.writeFileSync(atlasPath, JSON.stringify(atlas, null, 2));
};

const generateWithImageMagick = () => {
  console.log('Generating assets using ImageMagick...');
  
  const frames = [];
  let col = 0, row = 0;

  const addFrame = (name) => {
    const x = col * CARD_W, y = row * CARD_H;
    frames.push({
      filename: name,
      frame: { x, y, w: CARD_W, h: CARD_H },
      rotated: false, trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: CARD_W, h: CARD_H },
      sourceSize: { w: CARD_W, h: CARD_H }
    });
    col++; if (col >= COLS) { col = 0; row++; }
    return { x, y };
  };

  // Create empty spritesheet
  execSync(`convert -size ${CARD_W * COLS}x${CARD_H * ROWS} xc:none "${spritePath}"`);

  const drawCard = (suit, num, isBack, index) => {
    let name = isBack ? 'back' : (suit === 'whot' ? `whot_${num}` : `${suit}_${num}`);
    if (index !== undefined) name = `${name}_${index}`;
    const { x, y } = addFrame(name);
    
    const bgColor = isBack ? COLORS.back.base : 'white';
    const borderColor = isBack ? '#f1c40f' : '#dddddd';
    const textColor = isBack ? '#f1c40f' : (suit ? COLORS[suit].base : 'black');
    
    // Draw base card
    let cmd = `convert "${spritePath}" -fill "${bgColor}" -stroke "${borderColor}" -strokewidth 2 ` +
              `-draw "roundrectangle ${x+4},${y+4} ${x+CARD_W-4},${y+CARD_H-4} 16,16" `;
    
    if (isBack) {
      cmd += `-fill "${textColor}" -stroke none -font Arial-Bold -pointsize 32 -gravity North -draw "text ${x},${y+CARD_H/2-16} 'WHOT!'" `;
    } else {
      cmd += `-fill "${textColor}" -stroke none -font Arial-Bold -pointsize 48 -draw "text ${x+16},${y+60} '${num}'" `;
      if (suit === 'whot') {
        cmd += `-pointsize 48 -draw "text ${x+CARD_W/2-60},${y+CARD_H/2} 'WHOT'" ` +
               `-pointsize 40 -draw "text ${x+CARD_W/2-25},${y+CARD_H/2+40} '20'" `;
      } else {
        // Simple shape representation for IM fallback
        cmd += `-pointsize 32 -draw "text ${x+CARD_W/2-20},${y+CARD_H/2} '${suit[0].toUpperCase()}'" `;
      }
    }
    execSync(cmd + ` "${spritePath}"`);
  };

  drawCard(null, null, true);
  for (let i = 1; i <= 5; i++) drawCard('whot', 20, false, i);
  for (const suit in SUITS) {
    for (const num of SUITS[suit]) drawCard(suit, num, false);
  }

  const atlas = {
    textures: [{
      image: "whot_spritesheet.png",
      format: "RGBA8888",
      size: { w: CARD_W * COLS, h: CARD_H * ROWS },
      scale: 1,
      frames
    }]
  };
  fs.writeFileSync(atlasPath, JSON.stringify(atlas, null, 2));
};

const generateAudio = () => {
  console.log('Generating audio assets using FFmpeg...');
  const audioFiles = [
    { name: 'deal', f0: 600, f1: 800, d: 0.1, type: 'sine' },
    { name: 'market', f0: 600, f1: 800, d: 0.1, type: 'sine' },
    { name: 'play', f0: 400, f1: 200, d: 0.15, type: 'triangle' },
    { name: 'hold', f0: 400, f1: 200, d: 0.15, type: 'triangle' },
    { name: 'suspend', f0: 400, f1: 200, d: 0.15, type: 'triangle' },
    { name: 'error', f0: 150, f1: 100, d: 0.3, type: 'sawtooth' },
    { name: 'lose', f0: 150, f1: 100, d: 0.3, type: 'sawtooth' },
    { name: 'pick2', f0: 400, f1: 600, d: 0.4, type: 'square' },
    { name: 'pick3', f0: 400, f1: 600, d: 0.4, type: 'square' },
    { name: 'win', f0: 400, f1: 600, d: 0.4, type: 'square' },
    { name: 'whot', f0: 800, f1: 1200, d: 0.5, type: 'sine' },
    { name: 'tick', f0: 800, f1: 800, d: 0.05, type: 'square' }
  ];

  audioFiles.forEach(a => {
    const outPath = path.join(publicDir, `${a.name}.ogg`);
    let expr = '';
    // Basic frequency sweep expression: sin(2*pi*(f0 + (f1-f0)/2/d*t)*t)
    const sweep = `2*PI*(${a.f0}+(${a.f1}-${a.f0})/2/${a.d}*t)*t`;
    
    if (a.type === 'sine') {
      expr = `sin(${sweep})`;
    } else if (a.type === 'triangle') {
      expr = `2/PI*asin(sin(${sweep}))`;
    } else if (a.type === 'sawtooth') {
      expr = `2*(t*(${a.f0}+(${a.f1}-${a.f0})/2*t)-floor(t*(${a.f0}+(${a.f1}-${a.f0})/2*t)+0.5))`;
    } else if (a.type === 'square') {
      expr = `'gt(sin(${sweep}),0)*2-1'`;
    }

    try {
      // Use aevalsrc to generate the waveform and pipe to ogg
      // We use -ar 44100 for standard sample rate
      const cmd = `ffmpeg -y -f lavfi -i "aevalsrc=${expr}:d=${a.d}" -c:a libvorbis "${outPath}"`;
      execSync(cmd, { stdio: 'ignore' });
    } catch (e) {
      console.error(`Failed to generate ${a.name}.ogg:`, e.message);
    }
  });
};

if (createCanvas) {
  generateWithCanvas();
} else {
  try {
    generateWithImageMagick();
  } catch (e) {
    console.error('ImageMagick failed:', e.message);
    console.log('Generating fallback blank spritesheet.');
    // Minimal fallback to prevent crash
    const atlas = { textures: [{ image: "whot_spritesheet.png", format: "RGBA8888", size: { w: 1, h: 1 }, scale: 1, frames: [] }] };
    fs.writeFileSync(atlasPath, JSON.stringify(atlas, null, 2));
    fs.writeFileSync(spritePath, "");
  }
}

generateAudio();
