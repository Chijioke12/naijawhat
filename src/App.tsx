import { h, Component } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { WhotGame, AppState } from './game';

export default function App() {
  const gameRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<AppState>({
    screen: 'MENU',
    msg: '',
    msgColor: '#fff',
    settings: { sfx: true, whotCard: true, pick3: true, suspend: true, emptyMarketEnds: false },
    menuIndex: 0,
    settingIndex: 0,
    cpuScore: 0,
    playerScore: 0,
    skLeft: 'Exit',
    skCenter: 'SELECT',
    skRight: ''
  });

  const gameInstance = useRef<WhotGame | null>(null);
  const settingsListRef = useRef<HTMLDivElement>(null);

  const { screen, msg, msgColor, settings, menuIndex, settingIndex, cpuScore, playerScore, skLeft, skCenter, skRight } = gameState;

  useEffect(() => {
    if (screen === 'SETTINGS' && settingsListRef.current) {
      const activeItem = settingsListRef.current.querySelector('.setting-item.active') as HTMLElement;
      if (activeItem) {
        const container = settingsListRef.current;
        const elementTop = activeItem.offsetTop;
        const elementHeight = activeItem.offsetHeight;
        const containerHeight = container.clientHeight;

        // Manual scroll calculation for center alignment
        const targetScrollPos = elementTop - (containerHeight / 2) + (elementHeight / 2);
        container.scrollTop = targetScrollPos;
      }
    }
  }, [settingIndex, screen]);

  useEffect(() => {
    if (gameRef.current && !gameInstance.current) {
      gameInstance.current = new WhotGame(gameRef.current);
      gameInstance.current.init((newState: AppState) => {
        setGameState(newState);
      });
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const keyMap: Record<string, string> = {
        ArrowLeft: 'LEFT', '4': 'LEFT',
        ArrowRight: 'RIGHT', '6': 'RIGHT',
        ArrowUp: 'UP', '2': 'UP',
        ArrowDown: 'DOWN', '8': 'DOWN',
        Enter: 'OK', Accept: 'OK', Select: 'OK', '5': 'OK',
        SoftLeft: 'SOFT_LEFT', q: 'SOFT_LEFT', Q: 'SOFT_LEFT',
        SoftRight: 'SOFT_RIGHT', e: 'SOFT_RIGHT', E: 'SOFT_RIGHT',
      };
      const action = keyMap[e.key];
      if (action) {
        e.preventDefault();
        gameInstance.current?.handleInput(action);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleAction = (action: string) => {
    gameInstance.current?.handleInput(action);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div className="device-container">
        <div id="game-container" ref={gameRef} style={{ width: '240px', height: '295px' }} />

        <div className={`screen-overlay ${screen === 'MENU' ? '' : 'hidden'}`}>
          <div className="title">NAIJA WHOT</div>
          <div className="subtitle">HD REMASTER</div>
          <div className="menu-list">
            {['PLAY GAME', 'HOW TO PLAY', 'SETTINGS'].map((item, i) => (
              <div key={item} className={`menu-item ${menuIndex === i ? 'active' : ''}`}>{item}</div>
            ))}
          </div>
        </div>

        <div className={`screen-overlay ${screen === 'HELP' ? '' : 'hidden'}`}>
          <div className="title">HOW TO PLAY</div>
          <div className="help-content">
            Play a card with the same suit or number as the top card.
            <h3>Special Cards:</h3>
            <b>1</b>: Hold On (Play again)<br/>
            <b>2</b>: Pick Two<br/>
            <b>5</b>: Pick Three<br/>
            <b>8</b>: Suspension<br/>
            <b>14</b>: Gen. Market<br/>
            <b>20 (WHOT)</b>: Ask for any suit.
          </div>
        </div>

        <div className={`screen-overlay ${screen === 'SETTINGS' ? '' : 'hidden'}`}>
          <div className="title">SETTINGS</div>
          <div className="menu-list scrollable" ref={settingsListRef}>
            {[
              { key: 'sfx', label: 'Sound FX' },
              { key: 'whotCard', label: 'Whot Card (20)' },
              { key: 'pick3', label: 'Pick Three (5)' },
              { key: 'suspend', label: 'Suspend (8)' },
              { key: 'emptyMarketEnds', label: 'Empty Market Ends Game' },
            ].map((item, i) => (
              <div key={item.key} className={`setting-item ${settingIndex === i ? 'active' : ''}`}>
                <span>{item.label}</span>
                <span className={`toggle-box ${(settings as any)[item.key] ? '' : 'toggle-off'}`}>
                  {(settings as any)[item.key] ? 'ON' : 'OFF'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className={`screen-overlay ${screen === 'GAMEOVER' ? '' : 'hidden'}`} style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div className="title" style={{ color: playerScore > cpuScore ? '#2ecc71' : '#e74c3c' }}>
            {playerScore === cpuScore ? 'TIE!' : (playerScore < cpuScore ? 'YOU WIN!' : 'CPU WINS!')}
          </div>
          <div className="subtitle">
            {`Your Score: ${playerScore}`}<br/>
            {`CPU Score: ${cpuScore}`}
          </div>
        </div>

        <div className="msg-banner" style={{ opacity: msg ? 1 : 0, color: msgColor || '#fff' }}>
          {msg}
        </div>

        <div className="softkeys">
          <div className="sk left" onPointerDown={() => handleAction('SOFT_LEFT')}>{skLeft}</div>
          <div className="sk" onPointerDown={() => handleAction('OK')}>{skCenter}</div>
          <div className="sk right" onPointerDown={() => handleAction('SOFT_RIGHT')}>{skRight}</div>
        </div>
      </div>

      {import.meta.env.DEV && (
        <div className="gamepad">
          <div className="btn btn-up" onPointerDown={(e) => { e.preventDefault(); handleAction('UP'); }}>▲</div>
          <div className="btn btn-left" onPointerDown={(e) => { e.preventDefault(); handleAction('LEFT'); }}>◀</div>
          <div className="btn btn-ok" onPointerDown={(e) => { e.preventDefault(); handleAction('OK'); }}>OK</div>
          <div className="btn btn-right" onPointerDown={(e) => { e.preventDefault(); handleAction('RIGHT'); }}>▶</div>
          <div className="btn btn-down" onPointerDown={(e) => { e.preventDefault(); handleAction('DOWN'); }}>▼</div>
        </div>
      )}
    </div>
  );
}
