/* ==========================================================================
   24 BATTLE ARENA - GAME ENGINE & LOGIC
   ========================================================================== */

class GameEngine {
    constructor(mode = 'singleplayer') {
        this.mode = mode; // 'singleplayer' or 'multiplayer'
        this.isGameOver = false;
        this.winner = null;

        // Player 1 (Bottom / Human)
        this.p1 = this.createPlayerState('Player 1', 'p1');

        // Player 2 (Top / Bot in Singleplayer, Player 2 in Local Multiplayer)
        this.p2 = this.createPlayerState(
            this.mode === 'singleplayer' ? 'Player 2 (Bot)' : 'Player 2', 
            'p2'
        );

        // Timer interval handles
        this.tickInterval = null;
        this.botAiTimer = 0;
        this.onStateChangeCallback = null;
    }

    /**
     * Create initial player state
     */
    createPlayerState(name, key) {
        return {
            key,
            name,
            hp: 100,
            maxHp: 100,
            shieldDuration: 0,
            isSwapActive: false,
            isEvaluating: false,
            cards: [
                this.generateRandomCard(),
                this.generateRandomCard(),
                this.generateRandomCard(),
                this.generateRandomCard()
            ],
            equationState: {
                num1: null,
                num1CardIndex: null,
                operator: null,
                operatorDisplay: null,
                num2: null,
                num2CardIndex: null,
                result: null,
                isSuccess24: false
            }
        };
    }

    /**
     * Generate a new random card (1-10) with 20% powerup chance
     */
    generateRandomCard() {
        const value = Math.floor(Math.random() * 9) + 1; // 1 to 9
        let powerup = null;

        // 20% chance for powerup
        if (Math.random() < 0.20) {
            const types = ['ATK', 'HP', 'DEF'];
            const type = types[Math.floor(Math.random() * types.length)];
            powerup = { type, value: 5 };
        }

        return {
            value,
            powerup,
            isRegenerating: false,
            regenTimeLeft: 0
        };
    }

    /**
     * Start the real-time game loop
     */
    start(onStateChange) {
        this.onStateChangeCallback = onStateChange;

        // Main game tick loop (runs every 100ms)
        this.tickInterval = setInterval(() => {
            this.gameTick(0.1);
        }, 100);

        this.notifyStateChange();
    }

    /**
     * Stop game loop
     */
    stop() {
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
        }
    }

    /**
     * Game loop tick (updates timers, shield durations, and Bot AI)
     */
    gameTick(dt) {
        if (this.isGameOver) return;

        let stateChanged = false;

        // Update regeneration timers & shields for both players
        [this.p1, this.p2].forEach(player => {
            // Update shield
            if (player.shieldDuration > 0) {
                player.shieldDuration = Math.max(0, player.shieldDuration - dt);
                stateChanged = true;
            }

            // Update card regeneration
            player.cards.forEach((card, index) => {
                if (card && card.isRegenerating) {
                    card.regenTimeLeft -= dt;
                    stateChanged = true;

                    if (card.regenTimeLeft <= 0) {
                        // Regeneration finished! Generate new card
                        player.cards[index] = this.generateRandomCard();
                    }
                }
            });
        });

        // Singleplayer Bot AI update (every 4.5 seconds)
        if (this.mode === 'singleplayer' && !this.p2.isEvaluating) {
            this.botAiTimer += dt;
            if (this.botAiTimer >= 4.5) {
                this.botAiTimer = 0;
                this.executeBotTurn();
                stateChanged = true;
            }
        }

        if (stateChanged) {
            this.notifyStateChange();
        }
    }

    /**
     * Handle Card Selection by Player
     */
    selectCard(playerKey, cardIndex) {
        if (this.isGameOver) return;
        const player = this[playerKey];
        if (!player || player.isEvaluating) return;

        const card = player.cards[cardIndex];
        if (!card || card.isRegenerating) return;

        // IF SWAP IS ACTIVE: Discard selected card
        if (player.isSwapActive) {
            player.isSwapActive = false;
            this.triggerCardRegen(player, cardIndex);
            this.clearEquation(playerKey);
            this.notifyStateChange();
            return;
        }

        const eq = player.equationState;

        // If num1 is not selected yet, or if player clicks another card before choosing operator
        if (eq.num1 === null || eq.operator === null) {
            eq.num1 = card.value;
            eq.num1CardIndex = cardIndex;
            eq.operator = null;
            eq.operatorDisplay = null;
            eq.num2 = null;
            eq.num2CardIndex = null;
            eq.result = null;
            this.notifyStateChange();
            return;
        }

        // If num1 & operator are set, set num2 (cannot be same card index)
        if (eq.num1 !== null && eq.operator !== null && eq.num2 === null) {
            if (eq.num1CardIndex === cardIndex) {
                // Clicked same card again: deselect
                this.clearEquation(playerKey);
                return;
            }

            eq.num2 = card.value;
            eq.num2CardIndex = cardIndex;

            // Evaluate equation!
            this.evaluateEquation(playerKey);
        }
    }

    /**
     * Handle Operator Selection
     */
    selectOperator(playerKey, opKey) {
        if (this.isGameOver) return;
        const player = this[playerKey];
        if (!player || player.isEvaluating) return;

        const eq = player.equationState;

        // Must have num1 selected first
        if (eq.num1 === null) return;

        const symbols = { '+': '+', '-': '-', '*': 'x', '/': '÷' };
        eq.operator = opKey;
        eq.operatorDisplay = symbols[opKey] || opKey;
        eq.num2 = null;
        eq.num2CardIndex = null;
        eq.result = null;

        this.notifyStateChange();
    }

    /**
     * Toggle SWAP mode
     */
    toggleSwap(playerKey) {
        if (this.isGameOver) return;
        const player = this[playerKey];
        if (!player || player.isEvaluating) return;

        player.isSwapActive = !player.isSwapActive;
        this.notifyStateChange();
    }

    /**
     * Clear Equation
     */
    clearEquation(playerKey) {
        const player = this[playerKey];
        if (!player || player.isEvaluating) return;

        player.equationState = {
            num1: null,
            num1CardIndex: null,
            operator: null,
            operatorDisplay: null,
            num2: null,
            num2CardIndex: null,
            result: null,
            isSuccess24: false
        };
        this.notifyStateChange();
    }

    /**
     * Evaluate Equation [num1] [op] [num2] = [result]
     */
    evaluateEquation(playerKey) {
        const player = this[playerKey];
        const eq = player.equationState;

        let res = null;
        const n1 = eq.num1;
        const n2 = eq.num2;

        switch (eq.operator) {
            case '+': res = n1 + n2; break;
            case '-': res = n1 - n2; break;
            case '*': res = n1 * n2; break;
            case '/': 
                if (n2 === 0) {
                    res = 'ERR';
                } else {
                    res = n1 / n2;
                }
                break;
        }

        if (res === 'ERR' || isNaN(res)) {
            // Invalid operation! Clear after quick flash
            eq.result = 'ERR';
            this.notifyStateChange();
            setTimeout(() => this.clearEquation(playerKey), 600);
            return;
        }

        // Format result cleanly (up to 2 decimal places if not integer)
        if (!Number.isInteger(res)) {
            res = parseFloat(res.toFixed(2));
        }

        eq.result = res;
        const is24 = (res === 24);
        eq.isSuccess24 = is24;
        player.isEvaluating = true;

        this.notifyStateChange();

        // 0.5 Second Delay so player can see computed result
        setTimeout(() => {
            if (this.isGameOver) return;

            const cardA = player.cards[eq.num1CardIndex];
            const cardB = player.cards[eq.num2CardIndex];

            // Powerup Combination Rule
            const mergedPowerup = this.combinePowerups(
                cardA ? cardA.powerup : null,
                cardB ? cardB.powerup : null
            );

            // Replace Card 1 with computed result
            player.cards[eq.num1CardIndex] = {
                value: res,
                powerup: mergedPowerup,
                isRegenerating: false,
                regenTimeLeft: 0
            };

            // Card 2 enters 2.5s regeneration
            this.triggerCardRegen(player, eq.num2CardIndex);

            // IF RESULT IS 24: Trigger Attack Event!
            if (is24) {
                this.executeAttackEvent(playerKey, eq.num1CardIndex);
            }

            // Clear equation display & unlock evaluation
            player.isEvaluating = false;
            this.clearEquation(playerKey);
            this.notifyStateChange();
        }, 500);
    }

    /**
     * Powerup Merging Logic
     */
    combinePowerups(p1, p2) {
        if (!p1 || !p2) return null; // If 1 card has no powerup, powerup disappears!
        if (p1.type !== p2.type) return null; // Different types: powerup disappears!

        const maxValues = { ATK: 25, HP: 25, DEF: 10 };
        const maxVal = maxValues[p1.type] || 25;
        const combinedVal = Math.min(p1.value + p2.value, maxVal);

        return {
            type: p1.type,
            value: combinedVal
        };
    }

    /**
     * Trigger Attack Event when 24 is formed!
     */
    executeAttackEvent(attackerKey, cardIndex) {
        const attacker = this[attackerKey];
        const defenderKey = attackerKey === 'p1' ? 'p2' : 'p1';
        const defender = this[defenderKey];

        const card24 = attacker.cards[cardIndex];
        const powerup = card24 ? card24.powerup : null;

        let baseDamage = 10;
        let bonusAtk = 0;
        let healAmount = 0;
        let shieldSeconds = 0;

        if (powerup) {
            if (powerup.type === 'ATK') bonusAtk = powerup.value;
            if (powerup.type === 'HP') healAmount = powerup.value;
            if (powerup.type === 'DEF') shieldSeconds = powerup.value;
        }

        const totalDamage = baseDamage + bonusAtk;

        // Apply Heal to Attacker
        if (healAmount > 0) {
            attacker.hp = Math.min(attacker.maxHp, attacker.hp + healAmount);
            if (Components.showDamageFeedback) {
                Components.showDamageFeedback(`+${healAmount} HP HEAL!`, 'heal');
            }
        }

        // Apply Defense Shield to Attacker
        if (shieldSeconds > 0) {
            attacker.shieldDuration = shieldSeconds;
            if (Components.showDamageFeedback) {
                Components.showDamageFeedback(`+${shieldSeconds}s SHIELD!`, 'blocked');
            }
        }

        // Apply Damage to Defender
        if (defender.shieldDuration > 0) {
            // Blocked by defender shield!
            if (Components.showDamageFeedback) {
                Components.showDamageFeedback('ATTACK BLOCKED!', 'blocked');
            }
        } else {
            defender.hp = Math.max(0, defender.hp - totalDamage);
            if (Components.showDamageFeedback) {
                Components.showDamageFeedback(`-${totalDamage} HP!`, 'damage');
            }

            // Check Win Condition
            if (defender.hp <= 0) {
                this.isGameOver = true;
                this.winner = attacker.name;
            }
        }

        // Card 24 was consumed in attack: set it to regenerate in 2.5s
        this.triggerCardRegen(attacker, cardIndex);
    }

    /**
     * Put a card slot into 2.5s regeneration timer
     */
    triggerCardRegen(player, cardIndex) {
        player.cards[cardIndex] = {
            value: 0,
            powerup: null,
            isRegenerating: true,
            regenTimeLeft: 2.5
        };
    }

    /**
     * BOT AI Logic (Singleplayer Mode)
     * Every 4.5s rolls:
     * 1. Create random result (50%)
     * 2. Create 24 if possible (25%)
     * 3. Discard bad card (25%)
     */
    executeBotTurn() {
        const bot = this.p2;
        if (bot.isEvaluating) return;

        // Get available non-regenerating card indices
        const validIndices = [];
        bot.cards.forEach((c, idx) => {
            if (c && !c.isRegenerating) validIndices.push(idx);
        });

        if (validIndices.length < 2) return; // Need at least 2 cards to combine

        const roll = Math.random();

        // Option 2: Try to create 24 (25% chance)
        if (roll >= 0.50 && roll < 0.75) {
            const foundPair = this.findPairFor24(bot.cards, validIndices);
            if (foundPair) {
                this.executeBotEquation(foundPair.i1, foundPair.op, foundPair.i2);
                return;
            }
        }

        // Option 3: Discard bad card (25% chance)
        if (roll >= 0.75) {
            // Find card > 24 or highest card
            let badIdx = validIndices[0];
            let maxVal = -Infinity;
            validIndices.forEach(idx => {
                const val = bot.cards[idx].value;
                if (val > maxVal) {
                    maxVal = val;
                    badIdx = idx;
                }
            });
            this.triggerCardRegen(bot, badIdx);
            return;
        }

        // Option 1: Create random result (50% chance or fallback)
        const i1 = validIndices[Math.floor(Math.random() * validIndices.length)];
        let i2 = validIndices[Math.floor(Math.random() * validIndices.length)];
        while (i1 === i2 && validIndices.length > 1) {
            i2 = validIndices[Math.floor(Math.random() * validIndices.length)];
        }
        const ops = ['+', '-', '*', '/'];
        const op = ops[Math.floor(Math.random() * ops.length)];

        this.executeBotEquation(i1, op, i2);
    }

    /**
     * Find if any 2 available bot cards can form 24
     */
    findPairFor24(cards, validIndices) {
        const ops = ['+', '-', '*', '/'];
        for (let i = 0; i < validIndices.length; i++) {
            for (let j = 0; j < validIndices.length; j++) {
                if (i === j) continue;
                const idx1 = validIndices[i];
                const idx2 = validIndices[j];
                const v1 = cards[idx1].value;
                const v2 = cards[idx2].value;

                for (let op of ops) {
                    let res = null;
                    if (op === '+') res = v1 + v2;
                    if (op === '-') res = v1 - v2;
                    if (op === '*') res = v1 * v2;
                    if (op === '/' && v2 !== 0) res = v1 / v2;

                    if (res === 24) {
                        return { i1: idx1, op, i2: idx2 };
                    }
                }
            }
        }
        return null;
    }

    /**
     * Helper to execute bot equation visually
     */
    executeBotEquation(idx1, opKey, idx2) {
        const bot = this.p2;
        bot.equationState.num1 = bot.cards[idx1].value;
        bot.equationState.num1CardIndex = idx1;
        bot.equationState.operator = opKey;
        const symbols = { '+': '+', '-': '-', '*': 'x', '/': '÷' };
        bot.equationState.operatorDisplay = symbols[opKey] || opKey;
        bot.equationState.num2 = bot.cards[idx2].value;
        bot.equationState.num2CardIndex = idx2;

        this.evaluateEquation('p2');
    }

    notifyStateChange() {
        if (this.onStateChangeCallback) {
            this.onStateChangeCallback(this);
        }
    }
}
