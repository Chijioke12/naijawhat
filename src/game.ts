// Using global Phaser from script tag to avoid bundling
declare const Phaser: any;

const SUITS = ['circle', 'triangle', 'cross', 'square', 'star'];
const COLORS: Record<string, number> = {
  circle: 0xe74c3c,
  triangle: 0x2ecc71,
  cross: 0x3498db,
  square: 0xe67e22,
  star: 0x9b59b6,
  whot: 0x111111
};

const r = new ((window as any).AudioContext || (window as any).webkitAudioContext)();

function playSound(e: string, settings: any) {
  if (!settings.sfx) return;
  d(e);
}

function d(e: string) {
  if (r.state === 'suspended') r.resume();
  const t = r.createOscillator(), n = r.createGain();
  t.connect(n);
  n.connect(r.destination);
  const o = r.currentTime;
  
  if (e === 'deal' || e === 'market') {
    t.type = 'sine';
    t.frequency.setValueAtTime(600, o);
    t.frequency.exponentialRampToValueAtTime(800, o + 0.1);
    n.gain.setValueAtTime(0.2, o);
    n.gain.exponentialRampToValueAtTime(0.01, o + 0.1);
    t.start(o);
    t.stop(o + 0.1);
  } else if (e === 'play' || e === 'hold' || e === 'suspend') {
    t.type = 'triangle';
    t.frequency.setValueAtTime(400, o);
    t.frequency.exponentialRampToValueAtTime(200, o + 0.15);
    n.gain.setValueAtTime(0.3, o);
    n.gain.exponentialRampToValueAtTime(0.01, o + 0.15);
    t.start(o);
    t.stop(o + 0.15);
  } else if (e === 'error' || e === 'lose') {
    t.type = 'sawtooth';
    t.frequency.setValueAtTime(150, o);
    t.frequency.exponentialRampToValueAtTime(100, o + 0.3);
    n.gain.setValueAtTime(0.2, o);
    n.gain.exponentialRampToValueAtTime(0.01, o + 0.3);
    t.start(o);
    t.stop(o + 0.3);
  } else if (e === 'pick2' || e === 'pick3' || e === 'win') {
    t.type = 'square';
    t.frequency.setValueAtTime(400, o);
    t.frequency.setValueAtTime(600, o + 0.1);
    n.gain.setValueAtTime(0.2, o);
    n.gain.exponentialRampToValueAtTime(0.01, o + 0.4);
    t.start(o);
    t.stop(o + 0.4);
  } else if (e === 'whot') {
    t.type = 'sine';
    t.frequency.setValueAtTime(800, o);
    t.frequency.exponentialRampToValueAtTime(1200, o + 0.5);
    n.gain.setValueAtTime(0.3, o);
    n.gain.exponentialRampToValueAtTime(0.01, o + 0.5);
    t.start(o);
    t.stop(o + 0.5);
  } else if (e === 'tick') {
    t.type = 'square';
    t.frequency.setValueAtTime(800, o);
    n.gain.setValueAtTime(0.1, o);
    n.gain.exponentialRampToValueAtTime(0.01, o + 0.05);
    t.start(o);
    t.stop(o + 0.05);
  }
}

export interface AppState {
  screen: 'MENU' | 'PLAYING' | 'HELP' | 'SETTINGS' | 'WHOT_CHOICE' | 'GAMEOVER';
  msg: string;
  msgColor: string;
  settings: {
    sfx: boolean;
    whotCard: boolean;
    pick3: boolean;
    suspend: boolean;
    emptyMarketEnds: boolean;
  };
  menuIndex: number;
  settingIndex: number;
  cpuScore: number;
  playerScore: number;
  skLeft: string;
  skCenter: string;
  skRight: string;
}

export class WhotGame {
  game: Phaser.Game;
  scene!: WhotScene;
  onStateChange!: (state: AppState) => void;
  
  constructor(parent: string | HTMLElement) {
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.CANVAS, // Force Canvas renderer which is hardware-accelerated/well-optimized on low-end Gecko (KaiOS)
      width: 240,
      height: 295,
      parent: parent,
      transparent: true,
      scene: WhotScene,
      fps: {
        target: 30, // 30 FPS target is perfect for a card game and reduces CPU load
        forceSetTimeOut: true
      },
      render: {
        antialias: true,
        pixelArt: false,
        roundPixels: true
      }
    };
    this.game = new Phaser.Game(config);
  }

  init(onStateChange: (state: AppState) => void) {
    this.onStateChange = onStateChange;
    // Wait for scene to be ready
    setTimeout(() => {
      this.scene = this.game.scene.getScene('WhotScene') as WhotScene;
      this.scene.onStateChange = this.onStateChange;
      this.scene.initGame();
    }, 100);
  }

  handleInput(action: string) {
    if (this.scene) {
      this.scene.handleInput(action);
    }
  }
}

class WhotScene extends Phaser.Scene {
  onStateChange!: (state: AppState) => void;
  
  // Game State
  screen: string = 'MENU';
  settings = { sfx: true, whotCard: true, pick3: true, suspend: true, emptyMarketEnds: false };
  menuIndex = 0;
  settingIndex = 0;
  skLeft = '';
  skCenter = '';
  skRight = '';
  playableGlows: Phaser.GameObjects.Graphics[] = [];
  msg = '';
  msgColor = '#fff';
  playerScore = 0;
  cpuScore = 0;
  
  deck: any[] = [];
  player: any[] = [];
  cpu: any[] = [];
  pile: any[] = [];
  
  selectedIndex = 0;
  whotChoiceIndex = 0;
  neededSuit: string | null = null;
  drawCount = 0;
  isPlayerTurn = false;
  
  cardImages: Map<string, Phaser.GameObjects.Image> = new Map();
  focusCursor!: Phaser.GameObjects.Graphics;
  deckText!: Phaser.GameObjects.Text;
  cpuText!: Phaser.GameObjects.Text;
  neededText!: Phaser.GameObjects.Text;
  neededShape!: Phaser.GameObjects.Graphics;
  whotOverlay!: Phaser.GameObjects.Container;
  whotShapes: Phaser.GameObjects.Graphics[] = [];

  constructor() {
    super({ key: 'WhotScene' });
  }

  preload() {
    this.load.on('loaderror', (fileObj: any) => {
      console.error('Error loading:', fileObj.key, fileObj.src);
    });
    this.load.on('filecomplete', (key: string) => {
      console.log('Loaded:', key);
    });

    // Use explicit relative paths for better reliability on KaiOS/OmniSD
    this.load.atlas('whot', './whot_spritesheet.png', './whot_atlas.json');
  }

  create() {
    this.cameras.main.setBackgroundColor('#1a5f35');
    this.deckText = this.add.text(43, 183, '', { font: 'bold 12px Arial', color: '#fdfaf0' }).setOrigin(0.5, 0);
    this.cpuText = this.add.text(120, 85, '', { font: 'bold 12px Arial', color: '#fff' }).setOrigin(0.5, 0);
    this.neededText = this.add.text(190, 135, '', { font: 'bold 12px Arial', color: '#fff', align: 'center' }).setOrigin(0.5, 1);
    this.neededShape = this.add.graphics();
    this.neededShape.setDepth(20);
    
    this.whotOverlay = this.add.container(0, 0);
    this.whotOverlay.setDepth(200);
    this.whotOverlay.setVisible(false);
    
    let bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.85);
    bg.fillRect(0, 0, 240, 295);
    this.whotOverlay.add(bg);
    
    this.whotOverlay.add(this.add.text(120, 80, 'I NEED...', { font: 'bold 16px Arial', color: '#f1c40f' }).setOrigin(0.5));
    
    const cx = 120, cy = 120, r = 50;
    SUITS.forEach((suit, i) => {
      const angle = Math.PI + i * (Math.PI / 4);
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      
      let g = this.add.graphics();
      this.drawShape(g, suit, px, py, 10, COLORS[suit]);
      this.whotShapes.push(g);
      this.whotOverlay.add(g);
    });

    this.focusCursor = this.add.graphics();
    this.focusCursor.setDepth(1000);

    try {
      const saved = localStorage.getItem('naija_whot_settings_hd');
      if (saved) this.settings = { ...this.settings, ...JSON.parse(saved) };
    } catch (e) {}

    this.syncUI();
  }

  initGame() {
    this.setScreen('MENU');
  }

  syncUI() {
    if (!this.onStateChange) return;
    this.onStateChange({
      screen: this.screen as any,
      settings: this.settings,
      menuIndex: this.menuIndex,
      settingIndex: this.settingIndex,
      skLeft: this.skLeft,
      skCenter: this.skCenter,
      skRight: this.skRight,
      msg: this.msg,
      msgColor: this.msgColor,
      playerScore: this.playerScore,
      cpuScore: this.cpuScore
    });
  }

  setScreen(s: string) {
    this.screen = s;
    if (s === 'MENU') {
      this.skLeft = 'Exit'; this.skCenter = 'SELECT'; this.skRight = '';
    } else if (s === 'HELP') {
      this.skLeft = 'Back'; this.skCenter = ''; this.skRight = '';
    } else if (s === 'SETTINGS') {
      this.skLeft = 'Back'; this.skCenter = 'TOGGLE'; this.skRight = '';
    } else if (s === 'WHOT_CHOICE') {
      this.skLeft = ''; this.skCenter = 'SELECT'; this.skRight = '';
      this.whotChoiceIndex = 0;
    } else if (s === 'GAMEOVER') {
      this.skLeft = 'Menu'; this.skCenter = 'REPLAY'; this.skRight = '';
    }
    this.syncUI();
  }

  deal() {
    this.deck = [];
    this.player = [];
    this.cpu = [];
    this.pile = [];
    this.drawCount = 0;
    this.neededSuit = null;
    this.cardImages.forEach(c => c.destroy());
    this.cardImages.clear();

    const config = {
      circle: [1,2,3,4,5,7,8,10,11,12,13,14],
      triangle: [1,2,3,4,5,7,8,10,11,12,13,14],
      cross: [1,2,3,5,7,10,11,13,14],
      square: [1,2,3,5,7,10,11,13,14],
      star: [1,2,3,4,5,7,8]
    };
    
    let id = 0;
    Object.keys(config).forEach(suit => {
      (config as any)[suit].forEach((num: number) => {
        this.deck.push({ id: `c_${id++}`, suit, num, x: 20, y: 110, tx: 20, ty: 110 });
      });
    });
    
    if (this.settings.whotCard) {
      for (let i=0; i<5; i++) {
        this.deck.push({ id: `c_${id++}`, suit: 'whot', num: 20, x: 20, y: 110, tx: 20, ty: 110 });
      }
    }
    
    Phaser.Utils.Array.Shuffle(this.deck);
    
    for (let i=0; i<4; i++) {
      this.player.push(this.deck.pop());
      this.cpu.push(this.deck.pop());
    }
    
    let first = this.deck.pop();
    while (first.suit === 'whot' || [1,2,5,8,14].includes(first.num)) {
      this.deck.unshift(first);
      first = this.deck.pop();
    }
    this.pile.push(first);
    first.tx = 97;
    first.ty = 110;
    
    this.selectedIndex = 0;
    this.isPlayerTurn = true;
    playSound('deal', this.settings);
    this.setScreen('PLAYING');
    this.arrangeCards();
  }

  arrangeCards() {
    if (this.screen !== 'PLAYING' && this.screen !== 'WHOT_CHOICE' && this.screen !== 'CPU_TURN') return;

    const cpuSpacing = Math.min(25, 180 / Math.max(1, this.cpu.length));
    const cpuStart = 120 - (this.cpu.length - 1) * cpuSpacing / 2 - 23;
    this.cpu.forEach((c, i) => { c.tx = cpuStart + i * cpuSpacing; c.ty = 10; });

    const pSpacing = Math.min(35, 200 / Math.max(1, this.player.length));
    const pStart = 120 - (this.player.length - 1) * pSpacing / 2 - 22;
    this.player.forEach((c, i) => {
      c.tx = pStart + i * pSpacing;
      c.ty = (i === this.selectedIndex && this.isPlayerTurn) ? 195 : 210;
    });

    if (this.selectedIndex >= this.player.length) this.selectedIndex = Math.max(0, this.player.length - 1);
    
    if (this.drawCount > 0) {
      this.skCenter = 'DEFEND'; this.skRight = `DRAW ${this.drawCount}`; this.skLeft = 'Pause';
    } else {
      this.skCenter = 'PLAY'; this.skRight = 'MARKET'; this.skLeft = 'Pause';
    }
    this.syncUI();
  }

  canPlay(card: any) {
    if (this.pile.length === 0) return false;
    const top = this.pile[this.pile.length - 1];
    
    if (this.drawCount > 0) {
      if (top.num === 2 && card.num === 2) return true;
      if (this.settings.pick3 && top.num === 5 && card.num === 5) return true;
      return false;
    }
    
    if (card.suit === 'whot') return true;
    if (this.neededSuit) return card.suit === this.neededSuit;
    return card.suit === top.suit || card.num === top.num;
  }

  msgTimer: any = null;
  showSelectionHint() {
    const card = this.player[this.selectedIndex];
    if (!card) return;
    const isPlayable = this.canPlay(card);
    
    if (card.num === 1) this.showMsg('SPECIAL: HOLD ON', '#f1c40f');
    else if (card.num === 2) this.showMsg('SPECIAL: PICK TWO', '#f1c40f');
    else if (card.num === 5 && this.settings.pick3) this.showMsg('SPECIAL: PICK THREE', '#f1c40f');
    else if (card.num === 8 && this.settings.suspend) this.showMsg('SPECIAL: SUSPEND', '#f1c40f');
    else if (card.num === 14) this.showMsg('SPECIAL: GEN. MARKET', '#f1c40f');
    else if (card.suit === 'whot') this.showMsg('SPECIAL: WHOT! (20)', '#f1c40f');
    else if (isPlayable) this.showMsg('VALID MOVE', '#2ecc71');
  }

  showMsg(msg: string, color: string) {
    this.msg = msg;
    this.msgColor = color;
    this.syncUI();
    if (this.msgTimer) clearTimeout(this.msgTimer);
    this.msgTimer = setTimeout(() => {
      this.msg = '';
      this.syncUI();
    }, 1500);
  }

  refillMarket() {
    if (this.pile.length <= 1) return false;
    const top = this.pile.pop();
    this.deck = [...this.pile];
    this.pile = [top];
    this.deck.forEach(c => { c.x = 20; c.y = 110; c.tx = 20; c.ty = 110; });
    Phaser.Utils.Array.Shuffle(this.deck);
    this.showMsg('MARKET REFILLED!', '#2ecc71');
    return true;
  }

  calcScore(cards: any[]) {
    return cards.reduce((sum, c) => c.suit === 'whot' ? sum + 20 : (c.suit === 'star' ? sum + 2 * c.num : sum + c.num), 0);
  }

  gameOver(reason: string) {
    this.isPlayerTurn = false;
    let pScore = this.calcScore(this.player);
    let cScore = this.calcScore(this.cpu);
    
    if (reason === 'PLAYER') playSound('win', this.settings);
    else if (reason === 'CPU') playSound('lose', this.settings);
    else if (pScore <= cScore) playSound('win', this.settings);
    else playSound('lose', this.settings);
    
    this.playerScore = pScore;
    this.cpuScore = cScore;
    this.setScreen('GAMEOVER');
  }

  playTurn(isPlayer: boolean) {
    const hand = isPlayer ? this.player : this.cpu;
    const idx = isPlayer ? this.selectedIndex : hand.findIndex(c => this.canPlay(c));
    
    if (idx === -1) {
      if (this.drawCount > 0) {
        for (let i=0; i<this.drawCount; i++) {
          if (this.deck.length === 0) {
            if (this.settings.emptyMarketEnds) return this.gameOver('EMPTY');
            this.refillMarket();
          }
          if (this.deck.length > 0) hand.push(this.deck.pop());
        }
        this.drawCount = 0;
      } else {
        if (this.deck.length === 0) {
          if (this.settings.emptyMarketEnds) return this.gameOver('EMPTY');
          this.refillMarket();
        }
        if (this.deck.length > 0) hand.push(this.deck.pop());
      }
      playSound('deal', this.settings);
      this.showMsg(isPlayer ? 'YOU DRAW' : 'CPU DRAWS', '#f1c40f');
      this.isPlayerTurn = !isPlayer;
      this.arrangeCards();
      if (!this.isPlayerTurn) setTimeout(() => this.playTurn(false), 1200);
      return;
    }

    const card = hand[idx];
    if (isPlayer && !this.canPlay(card)) {
      playSound('error', this.settings);
      this.showMsg('INVALID MOVE!', '#e74c3c');
      return;
    }

    hand.splice(idx, 1);
    this.pile.push(card);
    card.tx = 97 + Math.random() * 4 - 2;
    card.ty = 110 + Math.random() * 4 - 2;
    this.neededSuit = null;

    if (hand.length === 0) {
      playSound('play', this.settings);
      return this.gameOver(isPlayer ? 'PLAYER' : 'CPU');
    }

    let hold = false;
    if (card.num === 1) { this.showMsg('HOLD ON!', '#f1c40f'); hold = true; playSound('hold', this.settings); }
    else if (card.num === 2) { this.showMsg('PICK TWO!', '#e74c3c'); this.drawCount += 2; playSound('pick2', this.settings); }
    else if (card.num === 5 && this.settings.pick3) { this.showMsg('PICK THREE!', '#e74c3c'); this.drawCount += 3; playSound('pick3', this.settings); }
    else if (card.num === 8 && this.settings.suspend) { this.showMsg('SUSPENSION!', '#f1c40f'); hold = true; playSound('suspend', this.settings); }
    else if (card.num === 14) { this.showMsg('GEN MARKET!', '#e74c3c'); this.drawCount += 1; playSound('market', this.settings); }
    else playSound('play', this.settings);

    if (card.suit === 'whot') {
      playSound('whot', this.settings);
      if (isPlayer) {
        this.setScreen('WHOT_CHOICE');
        this.arrangeCards();
        return;
      } else {
        const counts: any = { circle:0, triangle:0, cross:0, square:0, star:0 };
        this.cpu.forEach(c => { if (c.suit !== 'whot') counts[c.suit]++; });
        this.neededSuit = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
        this.showMsg(`CPU NEEDS ${this.neededSuit.toUpperCase()}`, this.getColorHex(this.neededSuit));
      }
    }

    this.arrangeCards();
    
    if (isPlayer) {
      if (!hold) {
        this.isPlayerTurn = false;
        setTimeout(() => this.playTurn(false), 1200);
      }
    } else {
      if (hold) {
        setTimeout(() => this.playTurn(false), 1200);
      } else {
        this.isPlayerTurn = true;
      }
    }
  }

  handleInput(action: string) {
    playSound('tick', this.settings);
    if (this.screen === 'MENU') {
      if (action === 'UP') this.menuIndex = (this.menuIndex - 1 + 3) % 3;
      else if (action === 'DOWN') this.menuIndex = (this.menuIndex + 1) % 3;
      else if (action === 'OK') {
        if (this.menuIndex === 0) {
          if (this.player.length === 0) this.deal();
          else this.setScreen('PLAYING');
        }
        else if (this.menuIndex === 1) this.setScreen('HELP');
        else if (this.menuIndex === 2) this.setScreen('SETTINGS');
      }
      this.syncUI();
    } else if (this.screen === 'HELP') {
      if (action === 'SOFT_LEFT' || action === 'OK') this.setScreen('MENU');
    } else if (this.screen === 'SETTINGS') {
      const keys = Object.keys(this.settings);
      if (action === 'UP') this.settingIndex = (this.settingIndex - 1 + keys.length) % keys.length;
      else if (action === 'DOWN') this.settingIndex = (this.settingIndex + 1) % keys.length;
      else if (action === 'OK') {
        const k = keys[this.settingIndex];
        (this.settings as any)[k] = !(this.settings as any)[k];
        localStorage.setItem('naija_whot_settings_hd', JSON.stringify(this.settings));
      }
      else if (action === 'SOFT_LEFT') this.setScreen('MENU');
      this.syncUI();
    } else if (this.screen === 'PLAYING') {
      if (!this.isPlayerTurn) return;
      if (action === 'LEFT') { this.selectedIndex = (this.selectedIndex - 1 + this.player.length) % this.player.length; this.arrangeCards(); this.showSelectionHint(); }
      else if (action === 'RIGHT') { this.selectedIndex = (this.selectedIndex + 1) % this.player.length; this.arrangeCards(); this.showSelectionHint(); }
      else if (action === 'UP' || action === 'DOWN') {
        const playableIndices = this.player.map((c, i) => this.canPlay(c) ? i : -1).filter(i => i !== -1);
        if (playableIndices.length > 0) {
          const currentPlayableIdx = playableIndices.indexOf(this.selectedIndex);
          if (currentPlayableIdx === -1) {
            // If not on a playable card, jump to the first one
            this.selectedIndex = playableIndices[0];
          } else {
            // Navigate through playable cards only
            if (action === 'UP') {
              this.selectedIndex = playableIndices[(currentPlayableIdx - 1 + playableIndices.length) % playableIndices.length];
            } else {
              this.selectedIndex = playableIndices[(currentPlayableIdx + 1) % playableIndices.length];
            }
          }
          this.arrangeCards();
          this.showSelectionHint();
        }
      }
      else if (action === 'OK') this.playTurn(true);
      else if (action === 'SOFT_RIGHT') {
        // Draw card
        if (this.deck.length === 0) {
          if (this.settings.emptyMarketEnds) return this.gameOver('EMPTY');
          this.refillMarket();
        }
        if (this.deck.length > 0) {
          if (this.drawCount > 0) {
            for (let i=0; i<this.drawCount; i++) {
              if (this.deck.length === 0) this.refillMarket();
              if (this.deck.length > 0) this.player.push(this.deck.pop());
            }
            this.drawCount = 0;
          } else {
            this.player.push(this.deck.pop());
          }
          playSound('deal', this.settings);
          this.showMsg('YOU DRAW', '#f1c40f');
          this.isPlayerTurn = false;
          this.arrangeCards();
          setTimeout(() => this.playTurn(false), 1200);
        }
      }
      else if (action === 'SOFT_LEFT') this.setScreen('MENU');
    } else if (this.screen === 'WHOT_CHOICE') {
      if (action === 'LEFT' || action === 'UP') this.whotChoiceIndex = (this.whotChoiceIndex - 1 + 5) % 5;
      else if (action === 'RIGHT' || action === 'DOWN') this.whotChoiceIndex = (this.whotChoiceIndex + 1) % 5;
      else if (action === 'OK') {
        this.neededSuit = SUITS[this.whotChoiceIndex];
        this.showMsg(`SUIT: ${this.neededSuit.toUpperCase()}`, this.getColorHex(this.neededSuit));
        this.setScreen('PLAYING');
        this.isPlayerTurn = false;
        this.arrangeCards();
        setTimeout(() => this.playTurn(false), 1200);
      }
    } else if (this.screen === 'GAMEOVER') {
      if (action === 'OK') { this.deal(); }
      else if (action === 'SOFT_LEFT') { this.player = []; this.setScreen('MENU'); }
    }
  }

  getColorHex(suit: string) {
    return '#' + COLORS[suit].toString(16).padStart(6, '0');
  }

  update() {
    const deckLen = this.deck.length;
    if (this.deckText.getData('len') !== deckLen) {
      this.deckText.setData('len', deckLen);
      if (deckLen > 0) {
        this.deckText.setText(deckLen.toString());
        this.deckText.setDepth(11);
      } else {
        this.deckText.setText('');
      }
    }

    if (deckLen > 0) {
      this.drawCardObj({ id: 'market', suit: 'whot', num: '', x: 20, y: 110 }, false, false, false, 10);
    } else {
      if (this.cardImages.has('market')) {
        this.cardImages.get('market')?.destroy();
        this.cardImages.delete('market');
      }
    }

    const cpuLen = this.cpu.length;
    if (this.cpuText.getData('len') !== cpuLen) {
      this.cpuText.setData('len', cpuLen);
      this.cpuText.setText(`CPU: ${cpuLen}`);
    }

    this.pile.forEach((card, i) => {
      card.x += 0.2 * (card.tx - card.x);
      card.y += 0.2 * (card.ty - card.y);
      if (i > this.pile.length - 4) this.drawCardObj(card, true, false, false, 20 + i);
      else {
        if (this.cardImages.has(card.id)) {
          this.cardImages.get(card.id)?.destroy();
          this.cardImages.delete(card.id);
        }
      }
    });

    this.cpu.forEach((card, i) => {
      card.x += 0.2 * (card.tx - card.x);
      card.y += 0.2 * (card.ty - card.y);
      this.drawCardObj(card, false, false, false, 50 + i);
    });

    this.focusCursor.clear();
    if (!this.playableGlows) this.playableGlows = [];
    this.playableGlows.forEach(g => g.clear());

    this.player.forEach((card, i) => {
      card.x += 0.2 * (card.tx - card.x);
      card.y += 0.2 * (card.ty - card.y);
      let isSel = i === this.selectedIndex && this.isPlayerTurn && this.screen === 'PLAYING';
      let isPlayable = this.screen === 'PLAYING' && this.canPlay(card);
      this.drawCardObj(card, true, isSel, isPlayable, 100 + i);

      if (isSel) {
        this.focusCursor.setDepth(100 + i + 0.5);
        this.focusCursor.lineStyle(3, 0xf1c40f, 1);
        const pulse = 0.5 + 0.5 * Math.sin(this.time.now / 150);
        this.focusCursor.alpha = 0.8 + 0.2 * pulse;
        
        // Selection border adjusted for smaller cards (46px wide)
        // Tighter inset border to avoid covering adjacent cards
        this.focusCursor.strokeRoundedRect(card.x + 1, card.y - 8, 44, 68, 4);
      } else if (isPlayable && this.isPlayerTurn && this.screen === 'PLAYING') {
        // Individual playable indicator with depth management to prevent overlap
        if (!this.playableGlows[i]) {
          this.playableGlows[i] = this.add.graphics();
        }
        const g = this.playableGlows[i];
        g.setDepth(100 + i + 0.1); // Slightly above the card but below the selection
        g.lineStyle(2, 0x2ecc71, 0.7);
        // More inset to stay clearly within the card face
        g.strokeRoundedRect(card.x + 4, card.y + 4, 38, 60, 4);
      }
    });

    if (!this.isPlayerTurn || this.screen !== 'PLAYING') {
      this.focusCursor.clear();
      if (this.playableGlows) this.playableGlows.forEach(g => g.clear());
    }

    const neededKey = `${this.neededSuit}_${this.screen}`;
    if (this.neededText.getData('neededKey') !== neededKey) {
      this.neededText.setData('neededKey', neededKey);
      this.neededShape.clear();
      if (this.neededSuit && this.screen !== 'WHOT_CHOICE') {
        this.neededText.setText(`I NEED:`);
        this.neededText.setColor('#fff');
        this.drawShape(this.neededShape, this.neededSuit, 190, 150, 12, COLORS[this.neededSuit]);
      } else {
        this.neededText.setText('');
      }
    }

    if (this.screen === 'WHOT_CHOICE') {
      this.whotOverlay.setVisible(true);
      const cx = 120, cy = 120, r = 50;
      SUITS.forEach((suit, i) => {
        const angle = Math.PI + i * (Math.PI / 4);
        const px = cx + Math.cos(angle) * r;
        const py = cy + Math.sin(angle) * r;
        const isSel = i === this.whotChoiceIndex;
        const size = isSel ? 16 : 10;
        let g = this.whotShapes[i];
        
        if (g.getData('size') !== size || g.getData('isSel') !== isSel) {
          g.setData('size', size);
          g.setData('isSel', isSel);
          g.clear();
          if (isSel) {
            g.fillStyle(0xf1c40f, 0.2);
            g.fillCircle(px, py, 20);
            g.lineStyle(2, 0xf1c40f);
            g.strokeCircle(px, py, 20);
          }
          this.drawShape(g, suit, px, py, size, COLORS[suit]);
        }
      });
    } else {
      this.whotOverlay.setVisible(false);
    }
  }

  drawCardObj(card: any, faceUp: boolean, isSelected: boolean, isPlayable: boolean, depth: number) {
    let img = this.cardImages.get(card.id);
    let frameName = 'back';
    if (faceUp) {
      if (card.suit === 'whot') {
        frameName = 'whot_20_1';
      } else {
        frameName = `${card.suit}_${card.num}`;
      }
    }
    
    // selected card pops up visually
    const displayY = isSelected ? card.y - 8 : card.y;
    
    if (!img) {
      img = this.add.image(card.x, displayY, 'whot', frameName).setOrigin(0, 0);
      this.cardImages.set(card.id, img);
    } else {
      if (img.frame.name !== frameName) {
        img.setTexture('whot', frameName);
      }
      img.setPosition(card.x, displayY);
    }
    img.setDepth(depth);
    
    // Scale logic
    let baseScale = 1.0;
    
    if (depth >= 100) {
      if (isSelected) {
        img.setTint(0xffffff);
        baseScale = 1.05; // Slightly larger when selected
      } else {
        if (isPlayable && this.isPlayerTurn && this.screen === 'PLAYING') {
          // Playable highlight: Slight green tint and subtle pulse
          const glow = 0.5 + 0.3 * Math.sin(this.time.now / 200);
          baseScale = 1.0 + glow * 0.03;
          img.setTint(0xccffcc); // Subtle green tint for playable cards
          
          // Optionally add a more distinct indicator if needed, but tint + scale pulse is usually enough
        } else if (!isPlayable && this.isPlayerTurn && this.screen === 'PLAYING') {
          // Dim non-playable cards more clearly
          img.setTint(0x666666);
        } else {
          img.setTint(0xffffff);
        }
      }
    } else {
      img.clearTint();
      baseScale = 0.95; // CPU and other background cards
    }
    img.setScale(baseScale);
  }

  drawShape(g: Phaser.GameObjects.Graphics, shape: string, x: number, y: number, size: number, color: number) {
    g.fillStyle(color);
    g.lineStyle(3, color);
    g.beginPath();

    if (shape === 'circle') {
      g.fillCircle(x, y, size);
      g.strokeCircle(x, y, size);
    } else if (shape === 'triangle') {
      g.moveTo(x, y - size);
      g.lineTo(x + size, y + size);
      g.lineTo(x - size, y + size);
      g.closePath();
      g.fillPath();
      g.strokePath();
    } else if (shape === 'square') {
      g.fillRect(x - size, y - size, size * 2, size * 2);
      g.strokeRect(x - size, y - size, size * 2, size * 2);
    } else if (shape === 'cross') {
      g.moveTo(x, y - 1.2 * size);
      g.lineTo(x, y + 1.2 * size);
      g.moveTo(x - 1.2 * size, y);
      g.lineTo(x + 1.2 * size, y);
      g.strokePath();
    } else if (shape === 'star') {
      for (let t = 0; t < 5; t++) {
        g.lineTo(x + Math.cos((18 + 72 * t) * Math.PI / 180) * size, y - Math.sin((18 + 72 * t) * Math.PI / 180) * size);
        g.lineTo(x + Math.cos((54 + 72 * t) * Math.PI / 180) * (size / 2), y - Math.sin((54 + 72 * t) * Math.PI / 180) * (size / 2));
      }
      g.closePath();
      g.fillPath();
      g.strokePath();
    }
  }
}
