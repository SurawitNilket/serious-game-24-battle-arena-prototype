/* ==========================================================================
   24 BATTLE ARENA - GAME ENGINE & LOGIC (ENHANCED BOT 24 SOLVER)
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

        this.tickInterval = null;
        this.botAiTimer = 0;
        this.botNextActionDelay = this.getRandomBotDelay(); // 2.0 to 6.0 seconds
        this.onStateChangeCallback = null;
    }

    /**
     * Get random Bot action delay between 2 and 6 seconds
     */
    getRandomBotDelay() {
        return 2.0 + Math.random() * 4.0;
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
     * Generate a new random card (1-9) with 30% powerup chance (val: 10)
     */
    generateRandomCard() {
        const value = Math.floor(Math.random() * 9) + 1; // 1 to 9
        let powerup = null;

        if (Math.random() < 0.30) {
            const types = ['ATK', 'HP', 'DEF'];
            const type = types[Math.floor(Math.random() * types.length)];
            powerup = { type, value: 10 };
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
     * Game loop tick
     */
    gameTick(dt) {
        if (this.isGameOver) return;

        let stateChanged = false;

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
                        player.cards[index] = this.generateRandomCard();
                    }
                }
            });
        });

        // Singleplayer Bot AI tick (rolls random delay between 2 and 6 seconds)
        if (this.mode === 'singleplayer' && !this.p2.isEvaluating) {
            this.botAiTimer += dt;
            if (this.botAiTimer >= this.botNextActionDelay) {
                this.botAiTimer = 0;
                this.botNextActionDelay = this.getRandomBotDelay();
                this.executeBotTurn();
                stateChanged = true;
            }
        }

        if (stateChanged) {
            this.notifyStateChange();
        }
    }

    /**
     * Handle Card Selection
     */
    selectCard(playerKey, cardIndex) {
        if (this.isGameOver) return;
        const player = this[playerKey];
        if (!player || player.isEvaluating) return;

        const card = player.cards[cardIndex];
        if (!card || card.isRegenerating) return;

        if (player.isSwapActive) {
            player.isSwapActive = false;
            this.triggerCardRegen(player, cardIndex);
            this.clearEquation(playerKey);
            this.notifyStateChange();
            return;
        }

        const eq = player.equationState;

        if (eq.num1 === null || eq.operator === null) {
            eq.num1 = Number(card.value);
            eq.num1CardIndex = cardIndex;
            eq.operator = null;
            eq.operatorDisplay = null;
            eq.num2 = null;
            eq.num2CardIndex = null;
            eq.result = null;
            this.notifyStateChange();
            return;
        }

        if (eq.num1 !== null && eq.operator !== null && eq.num2 === null) {
            if (eq.num1CardIndex === cardIndex) {
                this.clearEquation(playerKey);
                return;
            }

            eq.num2 = Number(card.value);
            eq.num2CardIndex = cardIndex;

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
        const n1 = Number(eq.num1);
        const n2 = Number(eq.num2);

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

        // NON-INTEGER DECIMALS DISCARD:
        if (res === 'ERR' || isNaN(res) || !Number.isInteger(res)) {
            eq.result = 'ERR';
            this.notifyStateChange();
            setTimeout(() => this.clearEquation(playerKey), 600);
            return;
        }

        eq.result = res;
        const is24 = (res === 24);
        eq.isSuccess24 = is24;
        player.isEvaluating = true;

        this.notifyStateChange();

        // 0.5 Second Delay for display
        setTimeout(() => {
            if (this.isGameOver) return;

            const cardA = player.cards[eq.num1CardIndex];
            const cardB = player.cards[eq.num2CardIndex];

            const usedPowerups = [];
            if (cardA && cardA.powerup) usedPowerups.push(cardA.powerup);
            if (cardB && cardB.powerup) usedPowerups.push(cardB.powerup);

            const mergedPowerup = this.combinePowerups(
                cardA ? cardA.powerup : null,
                cardB ? cardB.powerup : null
            );

            // Replace Card 1 with result
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
                this.executeAttackEvent(playerKey, eq.num1CardIndex, usedPowerups);
            }

            player.isEvaluating = false;
            this.clearEquation(playerKey);
            this.notifyStateChange();
        }, 500);
    }

    /**
     * Powerup Merging Logic (Max Value: 30 for ATK, HP, DEF)
     */
    combinePowerups(p1, p2) {
        if (!p1 || !p2) return null;
        if (p1.type !== p2.type) return null;

        const maxValues = { ATK: 30, HP: 30, DEF: 30 };
        const maxVal = maxValues[p1.type] || 30;
        const combinedVal = Math.min(p1.value + p2.value, maxVal);

        return {
            type: p1.type,
            value: combinedVal
        };
    }

    /**
     * Trigger Attack Event when 24 is formed!
     */
    executeAttackEvent(attackerKey, cardIndex, usedPowerups = []) {
        const attacker = this[attackerKey];
        const defenderKey = attackerKey === 'p1' ? 'p2' : 'p1';
        const defender = this[defenderKey];

        let baseDamage = 10;
        let bonusAtk = 0;
        let healAmount = 0;
        let shieldSeconds = 0;

        usedPowerups.forEach(p => {
            if (p.type === 'ATK') bonusAtk += p.value;
            if (p.type === 'HP') healAmount += p.value;
            if (p.type === 'DEF') shieldSeconds += p.value;
        });

        const rawDamage = baseDamage + bonusAtk;

        // Apply Heal
        if (healAmount > 0) {
            attacker.hp = Math.min(attacker.maxHp, attacker.hp + healAmount);
            if (Components.showDamageFeedback) {
                Components.showDamageFeedback(`⚡ 24 ATTACK! +${healAmount} HP HEAL!`, 'heal');
            }
        }

        // Apply Shield to Attacker
        if (shieldSeconds > 0) {
            attacker.shieldDuration = Math.min(15, attacker.shieldDuration + shieldSeconds);
            if (Components.showDamageFeedback) {
                Components.showDamageFeedback(`⚡ 24 ATTACK! +${shieldSeconds}s SHIELD!`, 'blocked');
            }
        }

        // Apply Damage to Defender (With DEF 50% Damage Reduction!)
        let finalDamage = rawDamage;
        let isShieldReduced = false;

        if (defender.shieldDuration > 0) {
            finalDamage = Math.ceil(rawDamage * 0.5);
            isShieldReduced = true;
        }

        defender.hp = Math.max(0, defender.hp - finalDamage);

        if (Components.showDamageFeedback && healAmount === 0 && shieldSeconds === 0) {
            if (isShieldReduced) {
                Components.showDamageFeedback(`⚡ 24 ATTACK! -${finalDamage} HP (50% SHIELD REDUCTION!)`, 'damage');
            } else {
                Components.showDamageFeedback(`⚡ 24 ATTACK! -${finalDamage} HP!`, 'damage');
            }
        }

        if (defender.hp <= 0) {
            this.isGameOver = true;
            this.winner = attacker.name;
        }

        // Card 24 dissolves into 2.5s regeneration
        this.triggerCardRegen(attacker, cardIndex);
    }

    /**
     * Put card slot into 2.5s regeneration
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
     * BOT AI Logic Execution
     */
    executeBotTurn() {
        const bot = this.p2;
        if (bot.isEvaluating) return;

        const validIndices = [];
        bot.cards.forEach((c, idx) => {
            if (c && !c.isRegenerating && c.value !== null && c.value !== undefined) {
                validIndices.push(idx);
            }
        });

        if (validIndices.length < 2) return;

        // 1. COMPREHENSIVE 24 SOLVER: RUN ALL 1-STEP, 2-STEP, AND 3-STEP COMBINATIONS
        const move24 = this.findBotBestMove(bot.cards, validIndices);
        if (move24) {
            this.executeBotEquation(move24.i1, move24.op, move24.i2);
            return;
        }

        // 2. IF NO WAY TO MAKE 24:
        // 30% DISCARD vs 70% RANDOM CALCULATION
        const roll = Math.random();

        if (roll < 0.30) {
            // DISCARD (30% CHANCE)
            let badIdx = validIndices[0];
            let maxVal = -Infinity;
            validIndices.forEach(idx => {
                const val = Number(bot.cards[idx].value);
                if (val > maxVal) {
                    maxVal = val;
                    badIdx = idx;
                }
            });
            this.triggerCardRegen(bot, badIdx);
            return;
        } else {
            // MAKE RANDOM RESULT (70% CHANCE)
            for (let attempt = 0; attempt < 10; attempt++) {
                const i1 = validIndices[Math.floor(Math.random() * validIndices.length)];
                let i2 = validIndices[Math.floor(Math.random() * validIndices.length)];
                while (i1 === i2 && validIndices.length > 1) {
                    i2 = validIndices[Math.floor(Math.random() * validIndices.length)];
                }
                const ops = ['+', '-', '*', '/'];
                const op = ops[Math.floor(Math.random() * ops.length)];
                
                const v1 = Number(bot.cards[i1].value);
                const v2 = Number(bot.cards[i2].value);
                let res = null;
                if (op === '+') res = v1 + v2;
                if (op === '-') res = v1 - v2;
                if (op === '*') res = v1 * v2;
                if (op === '/' && v2 !== 0) res = v1 / v2;

                if (res !== null && Number.isInteger(res) && res > 0 && res <= 48) {
                    this.executeBotEquation(i1, op, i2);
                    return;
                }
            }

            // Fallback: Discard largest card
            let badIdx = validIndices[0];
            let maxVal = -Infinity;
            validIndices.forEach(idx => {
                const val = Number(bot.cards[idx].value);
                if (val > maxVal) {
                    maxVal = val;
                    badIdx = idx;
                }
            });
            this.triggerCardRegen(bot, badIdx);
        }
    }

    /**
     * Smart 24 Solver for Bot:
     * Recursively evaluates 1-step, 2-step, and 3-step calculation trees across all holding cards.
     * Returns the exact step { i1, op, i2 } to execute toward 24, or null if 24 is impossible.
     */
    findBotBestMove(cards, validIndices) {
        if (validIndices.length < 2) return null;

        const availableNumbers = validIndices.map(idx => ({
            index: idx,
            value: Number(cards[idx].value)
        }));

        const ops = ['+', '-', '*', '/'];

        // 1. Direct 1-step 24 check (highest priority!)
        for (let i = 0; i < availableNumbers.length; i++) {
            for (let j = 0; j < availableNumbers.length; j++) {
                if (i === j) continue;
                const v1 = availableNumbers[i].value;
                const v2 = availableNumbers[j].value;

                for (let op of ops) {
                    let res = null;
                    if (op === '+') res = v1 + v2;
                    if (op === '-') res = v1 - v2;
                    if (op === '*') res = v1 * v2;
                    if (op === '/' && v2 !== 0) res = v1 / v2;

                    if (res === 24) {
                        return { 
                            i1: availableNumbers[i].index, 
                            op, 
                            i2: availableNumbers[j].index 
                        };
                    }
                }
            }
        }

        // 2. Multi-step recursive search to see if any 2-step or 3-step sequence leads to 24
        function searchTree(nums) {
            if (nums.length <= 1) return false;

            for (let i = 0; i < nums.length; i++) {
                for (let j = 0; j < nums.length; j++) {
                    if (i === j) continue;
                    const a = nums[i].value;
                    const b = nums[j].value;

                    for (let op of ops) {
                        let res = null;
                        if (op === '+') res = a + b;
                        if (op === '-') res = a - b;
                        if (op === '*') res = a * b;
                        if (op === '/' && b !== 0) res = a / b;

                        if (res === null || !Number.isInteger(res) || res < -50 || res > 100) continue;

                        if (nums.length === 2 && res === 24) {
                            return true;
                        }

                        const nextNums = [];
                        for (let k = 0; k < nums.length; k++) {
                            if (k !== i && k !== j) nextNums.push(nums[k]);
                        }
                        nextNums.push({ index: nums[i].index, value: res });

                        if (nums.length > 2 && searchTree(nextNums)) {
                            return true;
                        }
                    }
                }
            }
            return false;
        }

        // Test every initial pair to see if it leads to 24 down the decision tree
        for (let i = 0; i < availableNumbers.length; i++) {
            for (let j = 0; j < availableNumbers.length; j++) {
                if (i === j) continue;
                const v1 = availableNumbers[i].value;
                const v2 = availableNumbers[j].value;

                for (let op of ops) {
                    let res = null;
                    if (op === '+') res = v1 + v2;
                    if (op === '-') res = v1 - v2;
                    if (op === '*') res = v1 * v2;
                    if (op === '/' && v2 !== 0) res = v1 / v2;

                    if (res === null || !Number.isInteger(res) || res < -50 || res > 100) continue;

                    const nextNums = [];
                    for (let k = 0; k < availableNumbers.length; k++) {
                        if (k !== i && k !== j) nextNums.push(availableNumbers[k]);
                    }
                    nextNums.push({ index: availableNumbers[i].index, value: res });

                    if (searchTree(nextNums)) {
                        return {
                            i1: availableNumbers[i].index,
                            op,
                            i2: availableNumbers[j].index
                        };
                    }
                }
            }
        }

        return null;
    }

    executeBotEquation(idx1, opKey, idx2) {
        const bot = this.p2;
        bot.equationState.num1 = Number(bot.cards[idx1].value);
        bot.equationState.num1CardIndex = idx1;
        bot.equationState.operator = opKey;
        const symbols = { '+': '+', '-': '-', '*': 'x', '/': '÷' };
        bot.equationState.operatorDisplay = symbols[opKey] || opKey;
        bot.equationState.num2 = Number(bot.cards[idx2].value);
        bot.equationState.num2CardIndex = idx2;

        this.evaluateEquation('p2');
    }

    notifyStateChange() {
        if (this.onStateChangeCallback) {
            this.onStateChangeCallback(this);
        }
    }
}
