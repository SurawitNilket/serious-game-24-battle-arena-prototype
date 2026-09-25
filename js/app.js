/* ==========================================================================
   24 BATTLE ARENA - MAIN APP CONTROLLER (UPDATED & FIXED)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const menuScreen = document.getElementById('menu-screen');
    const gameScreen = document.getElementById('game-screen');
    const gameOverModal = document.getElementById('game-over-modal');
    
    const btnSingleplayer = document.getElementById('btn-singleplayer');
    const btnMultiplayer = document.getElementById('btn-multiplayer');
    const btnRematch = document.getElementById('btn-rematch');
    const btnMainMenu = document.getElementById('btn-main-menu');
    
    const p1Zone = document.getElementById('player1-zone');
    const p2Zone = document.getElementById('player2-zone');
    const battleHud = document.getElementById('battle-hud');
    const winnerTitle = document.getElementById('winner-title');
    const winnerDesc = document.getElementById('winner-desc');

    let currentGameEngine = null;
    let currentMode = 'singleplayer';

    // GUARANTEE GAME OVER MODAL IS HIDDEN AT BROWSER START
    hideGameOverModal();

    function hideGameOverModal() {
        if (gameOverModal) {
            gameOverModal.classList.add('hidden');
            gameOverModal.style.display = 'none';
        }
    }

    function showGameOverModal(winnerName) {
        if (gameOverModal) {
            winnerTitle.textContent = 'VICTORY!';
            winnerDesc.textContent = `${winnerName} HAS WON THE BATTLE!`;
            gameOverModal.classList.remove('hidden');
            gameOverModal.style.display = 'flex';
        }
    }

    /**
     * Start Game in specified mode ('singleplayer' | 'multiplayer')
     */
    function startGame(mode) {
        currentMode = mode;

        // Hide Menu & Game Over Modal, Show Game Arena
        menuScreen.classList.remove('active');
        menuScreen.classList.add('hidden');
        hideGameOverModal();

        gameScreen.classList.remove('hidden');
        gameScreen.classList.add('active');

        // Stop existing engine if running
        if (currentGameEngine) {
            currentGameEngine.stop();
        }

        // Initialize Engine
        currentGameEngine = new GameEngine(mode);

        // Start Engine & bind render update callback
        currentGameEngine.start((engineState) => {
            renderGameUI(engineState);
        });
    }

    /**
     * Render Game UI according to mode & engine state
     */
    function renderGameUI(engine) {
        // Render Player 1 (Bottom Panel - Cyan Theme)
        Components.renderPlayerPanel(
            p1Zone,
            engine.p1,
            'p1',
            {
                onSelectCard: (index) => engine.selectCard('p1', index),
                onSelectOperator: (opKey) => engine.selectOperator('p1', opKey),
                onToggleSwap: () => engine.toggleSwap('p1'),
                onClearEquation: () => engine.clearEquation('p1')
            },
            {
                isRotated: false,
                isInteractive: true,
                customHint: 'CREATE 24 TO ATTACK OPPONENT !'
            }
        );

        // Render Player 2 (Top Panel - Red Theme)
        const isMultiplayer = (engine.mode === 'multiplayer');
        Components.renderPlayerPanel(
            p2Zone,
            engine.p2,
            'p2',
            {
                onSelectCard: (index) => engine.selectCard('p2', index),
                onSelectOperator: (opKey) => engine.selectOperator('p2', opKey),
                onToggleSwap: () => engine.toggleSwap('p2'),
                onClearEquation: () => engine.clearEquation('p2')
            },
            {
                isRotated: isMultiplayer, // 180-degree rotation in Local Multiplayer
                isInteractive: isMultiplayer, // Hide operators & disable controls for Bot in Singleplayer
                customHint: isMultiplayer ? 'CREATE 24 TO ATTACK OPPONENT !' : 'BOT OPPONENT'
            }
        );

        // Render Center Shared Battle HUD
        Components.renderBattleHUD(battleHud, engine, () => {
            returnToMenu();
        });

        // Check Game Over State
        if (engine.isGameOver) {
            showGameOverModal(engine.winner);
        }
    }

    /**
     * Return to Main Menu
     */
    function returnToMenu() {
        if (currentGameEngine) {
            currentGameEngine.stop();
            currentGameEngine = null;
        }

        gameScreen.classList.remove('active');
        gameScreen.classList.add('hidden');
        hideGameOverModal();

        menuScreen.classList.remove('hidden');
        menuScreen.classList.add('active');
    }

    // Attach Menu Navigation Event Handlers
    Components.attachFastTapListener(btnSingleplayer, () => startGame('singleplayer'));
    Components.attachFastTapListener(btnMultiplayer, () => startGame('multiplayer'));
    Components.attachFastTapListener(btnRematch, () => startGame(currentMode));
    Components.attachFastTapListener(btnMainMenu, () => returnToMenu());
});
