const fs = require('fs');
const { createCanvas } = require('canvas');

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
  
  const grad = ctx.createLinearGradient(-size, -size, size, size);
  grad.addColorStop(0, colors.grad);
  grad.addColorStop(1, colors.base);
  ctx.fillStyle = grad;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1, size * 0.15);
  ctx.lineJoin = 'round';
  
  ctx.beginPath();
  if (suit === 'circle') {
    ctx.arc(0, 0, size, 0, Math.PI * 2);
  } else if (suit === 'triangle') {
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 1.1, size * 0.8);
    ctx.lineTo(-size * 1.1, size * 0.8);
  } else if (suit === 'square') {
    const r = size * 0.2;
    const s = size * 0.9;
    ctx.moveTo(-s + r, -s);
    ctx.lineTo(s - r, -s);
    ctx.quadraticCurveTo(s, -s, s, -s + r);
    ctx.lineTo(s, s - r);
    ctx.quadraticCurveTo(s, s, s - r, s);
    ctx.lineTo(-s + r, s);
    ctx.quadraticCurveTo(-s, s, -s, s - r);
    ctx.lineTo(-s, -s + r);
    ctx.quadraticCurveTo(-s, -s, -s + r, -s);
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

const generateSpriteSheet = () => {
  // Use exact target dimensions for sharpness
  const CARD_W = 46;
  const CARD_H = 68;
  const COLS = 10;
  const ROWS = 6;
  
  const canvas = createCanvas(CARD_W * COLS, CARD_H * ROWS);
  const ctx = canvas.getContext('2d');
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);

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

  const drawCardBase = (x, y, isBack) => {
    const w = CARD_W - 2;
    const h = CARD_H - 2;
    const cx = x + 1;
    const cy = y + 1;

    ctx.save();
    drawRoundedRect(ctx, cx, cy, w, h, 4);
    
    if (isBack) {
      ctx.fillStyle = COLORS.back.base;
    } else {
      ctx.fillStyle = '#ffffff';
    }
    
    ctx.fill();
    ctx.strokeStyle = isBack ? '#f1c40f' : '#dddddd';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (isBack) {
      ctx.fillStyle = '#f1c40f';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 10px Arial';
      ctx.fillText('WHOT!', cx + w / 2, cy + h / 2);
    }

    ctx.restore();
    return { cx, cy, w, h };
  };

  const drawCard = (suit, num, index) => {
    let name = suit === 'whot' ? `whot_${num}` : `${suit}_${num}`;
    if (index !== undefined) {
      name = `${name}_${index}`;
    }
    const { x, y } = addFrame(name);
    const { cx, cy, w, h } = drawCardBase(x, y, false);
    const colors = COLORS[suit];

    ctx.save();
    
    ctx.fillStyle = colors.base;
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(num.toString(), cx + 8, cy + 4);
    
    // Draw inverted number at bottom
    ctx.save();
    ctx.translate(cx + w - 8, cy + h - 4);
    ctx.rotate(Math.PI);
    ctx.fillText(num.toString(), 0, 0);
    ctx.restore();

    if (suit === 'whot') {
      ctx.fillStyle = '#111';
      ctx.font = 'bold 12px Arial';
      ctx.fillText('WHOT', cx + w / 2, cy + h / 2 - 5);
      ctx.font = 'bold 10px Arial';
      ctx.fillText('20', cx + w / 2, cy + h / 2 + 8);
    } else {
      drawSymbol(ctx, suit, cx + w / 2, cy + h / 2, 10, colors);
      if (suit === 'star') {
         ctx.fillStyle = colors.base;
         ctx.font = 'bold 8px Arial';
         ctx.fillText(`(${num * 2})`, cx + w / 2, cy + h / 2 + 14);
      }
    }
    ctx.restore();
  };

  const bpos = addFrame('back');
  drawCardBase(bpos.x, bpos.y, true);

  for (let i = 1; i <= 5; i++) {
    drawCard('whot', 20, i);
  }

  for (const suit in SUITS) {
    for (const num of SUITS[suit]) {
      drawCard(suit, num);
    }
  }

  const atlas = {
    textures: [
      {
        image: "whot_spritesheet.png",
        format: "RGBA8888",
        size: { w: canvas.width, h: canvas.height },
        scale: 1,
        frames
      }
    ]
  };

  const out = fs.createWriteStream("public/whot_spritesheet.png");
  const stream = canvas.createPNGStream();
  stream.pipe(out);
  out.on('finish', () => console.log('whot_spritesheet.png was created.'));

  fs.writeFileSync("public/whot_atlas.json", JSON.stringify(atlas, null, 2));
  console.log('whot_atlas.json was created.');
};

console.log('Generating Whot assets for ' + targetPlatform + ' platform...');
generateSpriteSheet();
