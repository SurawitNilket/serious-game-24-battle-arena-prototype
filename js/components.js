/* ==========================================================================
   24 BATTLE ARENA - REUSABLE UI COMPONENTS (SINGLEPLAYER VISUAL FIX)
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

        const valEl = document.createElement('span');
        valEl.className = 'card-value';
        valEl.textContent = card.value;
        cardEl.appendChild(valEl);

        if (card.powerup && card.powerup.value > 0) {
            const badgeEl = document.createElement('span');
            const type = card.powerup.type.toLowerCase();
            badgeEl.className = `powerup-badge ${type}`;
            badgeEl.textContent = `+${card.powerup.value} ${card.powerup.type}`;
            cardEl.appendChild(badgeEl);
        }

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
     * Create Equation Display element: [num1] [operator box] [num2] = [result]
     */
    createEquationDisplay(eqState, playerKey) {
        const container = document.createElement('div');
        container.className = 'equation-display';

        // Slot 1 (Num 1)
        const box1 = document.createElement('div');
        box1.className = `eq-box ${eqState.num1 !== null ? 'active' : ''}`;
        box1.textContent = eqState.num1 !== null ? eqState.num1 : '';

        // Operator Box (Small Box matching number boxes)
        const opBox = document.createElement('div');
        opBox.className = `eq-box operator-box ${eqState.operator ? 'active' : ''}`;
        opBox.textContent = eqState.operatorDisplay || '';

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
        if (eqState.result === 'ERR') {
            boxRes.classList.add('err-box');
        } else if (eqState.isSuccess24) {
            boxRes.classList.add('success-24');
        }
        boxRes.textContent = eqState.result !== null ? eqState.result : '';

        container.appendChild(box1);
        container.appendChild(opBox);
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
     * Create Player Status Component
     * Note: Flipped label below HP bar is rendered ONLY in Local Multiplayer mode!
     */
    createPlayerStatus(playerData, playerKey, isMultiplayer = false) {
        const container = document.createElement('div');
        container.className = `player-status-bar ${playerKey === 'p1' ? 'p1-status' : 'p2-status'}`;

        // Normal Header (Facing Player 1 / viewer)
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

        // Render Flipped Footer ONLY in Local Multiplayer mode!
        if (isMultiplayer) {
            const footerFlipped = document.createElement('div');
            footerFlipped.className = 'status-footer-flipped';

            const nameFlipped = document.createElement('span');
            nameFlipped.className = 'player-name';
            nameFlipped.textContent = playerData.name.toUpperCase();

            const hpFlipped = document.createElement('span');
            hpFlipped.className = 'hp-text';
            hpFlipped.textContent = `${Math.max(0, Math.ceil(playerData.hp))}/${playerData.maxHp}`;

            footerFlipped.appendChild(nameFlipped);
            footerFlipped.appendChild(hpFlipped);
            container.appendChild(footerFlipped);
        }

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

        // Action Hint Text
        const hintEl = document.createElement('div');
        hintEl.className = 'action-hint';
        hintEl.textContent = options.customHint || 'CREATE 24 TO ATTACK OPPONENT !';
        container.appendChild(hintEl);

        // Equation Display
        const eqEl = this.createEquationDisplay(playerState.equationState, playerKey);
        container.appendChild(eqEl);

        // Operators Row (Render ONLY if interactive / for human player)
        if (isInteractive) {
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
                    handlers.onSelectOperator
                );
                opsRow.appendChild(opBtn);
            });
            container.appendChild(opsRow);
        }

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

        // Controls Row (SWAP & CLEAR) - Render only if interactive
        if (isInteractive) {
            const ctrlRow = document.createElement('div');
            ctrlRow.className = 'controls-row';

            const swapBtn = this.createSwapButton(playerState.isSwapActive, handlers.onToggleSwap);
            const clearBtn = this.createClearButton(handlers.onClearEquation);

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
        backBtn.innerHTML = '&#10094;';
        this.attachFastTapListener(backBtn, onBackClick);
        hudContent.appendChild(backBtn);

        const isMultiplayer = (gameState.mode === 'multiplayer');

        // Player 2 / Bot Status Bar (Top of HUD)
        const p2Status = this.createPlayerStatus(gameState.p2, 'p2', isMultiplayer);
        hudContent.appendChild(p2Status);

        // Dedicated Center HUD Attack Message Zone
        const msgZone = document.createElement('div');
        msgZone.id = 'hud-message-zone';
        msgZone.className = 'hud-message-zone';
        hudContent.appendChild(msgZone);

        // Player 1 Status Bar (Bottom of HUD)
        const p1Status = this.createPlayerStatus(gameState.p1, 'p1', isMultiplayer);
        hudContent.appendChild(p1Status);

        container.appendChild(hudContent);
    },

    /**
     * Helper to attach fast, multi-touch responsive tap listener
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
     * Trigger center HUD attack/heal/shield message banner
     */
    showDamageFeedback(text, type = 'damage') {
        const msgZone = document.getElementById('hud-message-zone');
        if (!msgZone) return;

        msgZone.innerHTML = '';

        const banner = document.createElement('div');
        banner.className = `attack-msg-banner ${type}`;
        banner.textContent = text;
        msgZone.appendChild(banner);

        setTimeout(() => {
            if (banner.parentNode) {
                banner.parentNode.removeChild(banner);
            }
        }, 900);
    }
};
