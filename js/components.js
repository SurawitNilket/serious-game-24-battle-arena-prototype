/* ==========================================================================
   24 BATTLE ARENA - REUSABLE UI COMPONENTS
   ========================================================================== */

const Components = {
    /**
     * Create a Number Card element
     */
    createNumberCard(card, playerKey, cardIndex, onClick) {
        const cardEl = document.createElement('div');
        cardEl.className = 'num-card';
        cardEl.dataset.player = playerKey;
        cardEl.dataset.index = cardIndex;

        if (!card || card.isRegenerating) {
            cardEl.classList.add('regenerating');
            const timeLeft = card ? Math.ceil(card.regenTimeLeft || 2.5) : 2.5;
            cardEl.innerHTML = `<span class="regen-spinner">${timeLeft}s</span>`;
            return cardEl;
        }

        if (card.isSelected) {
            cardEl.classList.add('selected');
        }

        // Card number value
        const valEl = document.createElement('span');
        valEl.className = 'card-value';
        valEl.textContent = card.value;
        cardEl.appendChild(valEl);

        // Powerup badge if present
        if (card.powerup && card.powerup.value > 0) {
            const badgeEl = document.createElement('span');
            const type = card.powerup.type.toLowerCase();
            badgeEl.className = `powerup-badge ${type}`;
            badgeEl.textContent = `+${card.powerup.value} ${card.powerup.type}`;
            cardEl.appendChild(badgeEl);
        }

        // Attach touch/pointer responsive event listener
        this.attachFastTapListener(cardEl, () => onClick(cardIndex));

        return cardEl;
    },

    /**
     * Create an Operator Button element (+, -, x, ÷)
     */
    createOperatorButton(opSymbol, opKey, playerKey, isSelected, onClick) {
        const btn = document.createElement('div');
        btn.className = `operator-btn ${isSelected ? 'selected' : ''}`;
        btn.dataset.op = opKey;
        btn.textContent = opSymbol;

        this.attachFastTapListener(btn, () => onClick(opKey));
        return btn;
    },

    /**
     * Create Equation Display element: [num1] [op] [num2] = [result]
     */
    createEquationDisplay(eqState, playerKey) {
        const container = document.createElement('div');
        container.className = 'equation-display';

        // Slot 1 (Num 1)
        const box1 = document.createElement('div');
        box1.className = `eq-box ${eqState.num1 !== null ? 'active' : ''}`;
        box1.textContent = eqState.num1 !== null ? eqState.num1 : '';

        // Operator
        const opSign = document.createElement('div');
        opSign.className = 'eq-operator-sign';
        opSign.textContent = eqState.operatorDisplay || '';

        // Slot 2 (Num 2)
        const box2 = document.createElement('div');
        box2.className = `eq-box ${eqState.num2 !== null ? 'active' : ''}`;
        box2.textContent = eqState.num2 !== null ? eqState.num2 : '';

        // Equals sign
        const eqSign = document.createElement('div');
        eqSign.className = 'eq-equals-sign';
        eqSign.textContent = '=';

        // Result Slot
        const boxRes = document.createElement('div');
        boxRes.className = `eq-box result-box ${eqState.result !== null ? 'active' : ''}`;
        if (eqState.isSuccess24) {
            boxRes.classList.add('success-24');
        }
        boxRes.textContent = eqState.result !== null ? eqState.result : '';

        container.appendChild(box1);
        container.appendChild(opSign);
        container.appendChild(box2);
        container.appendChild(eqSign);
        container.appendChild(boxRes);

        return container;
    },

    /**
     * Create Swap Button
     */
    createSwapButton(isActive, onClick) {
        const btn = document.createElement('div');
        btn.className = `action-btn swap-btn ${isActive ? 'active' : ''}`;
        btn.textContent = 'SWAP';
        this.attachFastTapListener(btn, onClick);
        return btn;
    },

    /**
     * Create Clear Button
     */
    createClearButton(onClick) {
        const btn = document.createElement('div');
        btn.className = 'action-btn clear-btn';
        btn.textContent = 'CLEAR';
        this.attachFastTapListener(btn, onClick);
        return btn;
    },

    /**
     * Create Player Status Component (Name, HP Bar, Shield)
     */
    createPlayerStatus(playerData, playerKey, isOpponentHint = false) {
        const container = document.createElement('div');
        container.className = `player-status-bar ${playerKey === 'p1' ? 'p1-status' : 'p2-status'}`;

        const header = document.createElement('div');
        header.className = 'status-header';

        const nameEl = document.createElement('span');
        nameEl.className = 'player-name';
        nameEl.textContent = playerData.name.toUpperCase();

        const hpText = document.createElement('span');
        hpText.className = 'hp-text';
        hpText.textContent = `${Math.max(0, Math.ceil(playerData.hp))}/${playerData.maxHp}`;

        header.appendChild(nameEl);
        if (playerData.shieldDuration > 0) {
            const shieldEl = document.createElement('span');
            shieldEl.className = 'shield-indicator';
            shieldEl.textContent = `[SHIELD ${Math.ceil(playerData.shieldDuration)}s]`;
            header.appendChild(shieldEl);
        }
        header.appendChild(hpText);

        // HP Bar Fill
        const hpContainer = document.createElement('div');
        hpContainer.className = 'hp-bar-container';

        const hpFill = document.createElement('div');
        hpFill.className = 'hp-bar-fill';
        const percent = Math.max(0, (playerData.hp / playerData.maxHp) * 100);
        hpFill.style.width = `${percent}%`;

        hpContainer.appendChild(hpFill);
        container.appendChild(header);
        container.appendChild(hpContainer);

        return container;
    },

    /**
     * Full Player Panel Component Rendering
     */
    renderPlayerPanel(container, playerState, playerKey, handlers, options = {}) {
        container.innerHTML = '';
        if (options.isRotated) {
            container.classList.add('rotated');
        } else {
            container.classList.remove('rotated');
        }

        const isInteractive = options.isInteractive !== false;

        // If Singleplayer opponent, show status in panel as per reference screenshot Singleplayer.png
        if (options.showStatusInPanel) {
            const statusEl = this.createPlayerStatus(playerState, playerKey, true);
            container.appendChild(statusEl);
        }

        // Action Hint Text
        const hintEl = document.createElement('div');
        hintEl.className = 'action-hint';
        hintEl.textContent = options.customHint || 'CREATE 24 TO ATTACK OPPONENT !';
        container.appendChild(hintEl);

        // Equation Display
        const eqEl = this.createEquationDisplay(playerState.equationState, playerKey);
        container.appendChild(eqEl);

        // Operators Row
        const opsRow = document.createElement('div');
        opsRow.className = 'operators-row';
        const operators = [
            { key: '+', symbol: '+' },
            { key: '-', symbol: '-' },
            { key: '*', symbol: 'x' },
            { key: '/', symbol: '÷' }
        ];
        operators.forEach(op => {
            const isSelected = playerState.equationState.operator === op.key;
            const opBtn = this.createOperatorButton(
                op.symbol, op.key, playerKey, isSelected, 
                isInteractive ? handlers.onSelectOperator : () => {}
            );
            if (!isInteractive) opBtn.style.opacity = '0.6';
            opsRow.appendChild(opBtn);
        });
        container.appendChild(opsRow);

        // Cards Row
        const cardsRow = document.createElement('div');
        cardsRow.className = 'cards-row';
        playerState.cards.forEach((card, index) => {
            const isSelected = (playerState.equationState.num1CardIndex === index || 
                                playerState.equationState.num2CardIndex === index);
            const cardObj = card ? { ...card, isSelected } : null;
            const cardEl = this.createNumberCard(
                cardObj, playerKey, index, 
                isInteractive ? handlers.onSelectCard : () => {}
            );
            if (!isInteractive) cardEl.style.opacity = '0.7';
            cardsRow.appendChild(cardEl);
        });
        container.appendChild(cardsRow);

        // Controls Row (SWAP & CLEAR) - in Singleplayer Bot, controls are hidden or disabled
        if (isInteractive) {
            const ctrlRow = document.createElement('div');
            ctrlRow.className = 'controls-row';

            const swapBtn = this.createSwapButton(playerState.isSwapActive, handlers.onToggleSwap);
            const clearBtn = this.createClearButton(handlers.onClearEquation);

            // Match layout in Local Multiplayer screenshot: SWAP on left, CLEAR on right (or vice versa)
            ctrlRow.appendChild(swapBtn);
            ctrlRow.appendChild(clearBtn);
            container.appendChild(ctrlRow);
        }
    },

    /**
     * Shared Battle HUD Renderer
     */
    renderBattleHUD(container, gameState, onBackClick) {
        container.innerHTML = '';

        const hudContent = document.createElement('div');
        hudContent.className = 'hud-center-content';

        // Back Circle Button
        const backBtn = document.createElement('div');
        backBtn.className = 'btn-back-circle';
        backBtn.innerHTML = '&#10094;'; // Left angle bracket arrow '<'
        this.attachFastTapListener(backBtn, onBackClick);
        hudContent.appendChild(backBtn);

        // Player Status Bars inside HUD
        if (gameState.mode === 'multiplayer') {
            // Local Multiplayer: show status for both Player 2 and Player 1
            const p2Status = this.createPlayerStatus(gameState.p2, 'p2');
            const p1Status = this.createPlayerStatus(gameState.p1, 'p1');
            hudContent.appendChild(p2Status);
            hudContent.appendChild(p1Status);
        } else {
            // Singleplayer: status shown for P1 in HUD, while P2 status is above
            const p1Status = this.createPlayerStatus(gameState.p1, 'p1');
            hudContent.appendChild(p1Status);
        }

        container.appendChild(hudContent);

        // Floating Damage Feedback Overlay Zone
        const feedbackZone = document.createElement('div');
        feedbackZone.id = 'attack-feedback-zone';
        feedbackZone.className = 'attack-feedback-zone';
        container.appendChild(feedbackZone);
    },

    /**
     * Helper to attach fast, multi-touch responsive tap listener
     * Prevents multi-touch delay and accidental zoom/scroll on touchscreens.
     */
    attachFastTapListener(element, callback) {
        let touched = false;

        element.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            touched = true;
            callback(e);
        }, { passive: false });

        element.addEventListener('click', (e) => {
            if (touched) {
                touched = false;
                return;
            }
            callback(e);
        });
    },

    /**
     * Trigger floating damage/attack visual feedback
     */
    showDamageFeedback(text, type = 'damage') {
        const feedbackZone = document.getElementById('attack-feedback-zone');
        if (!feedbackZone) return;

        const dmgEl = document.createElement('div');
        dmgEl.className = `floating-dmg-text ${type}`;
        dmgEl.textContent = text;
        feedbackZone.appendChild(dmgEl);

        setTimeout(() => {
            if (dmgEl.parentNode) {
                dmgEl.parentNode.removeChild(dmgEl);
            }
        }, 900);
    }
};
