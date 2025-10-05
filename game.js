class GoldMinerGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.score = 0;
        this.level = 1;
        this.timeLeft = 60;
        this.targetScore = 500;
        this.isPlaying = false;
        this.isPaused = false;
        this.difficulty = 'normal'; // easy, normal, hard

        // 游戏对象
        this.hook = null;
        this.items = [];
        this.particles = [];

        // 游戏配置（根据难度调整）
        this.config = {
            hookSpeed: 3,
            hookMaxLength: 400,
            hookPullSpeed: 2,
            gravity: 0.1,
            rotationSpeed: 0.02
        };

        this.initializeEventListeners();
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // 显示难度选择
        this.showDifficultySelection();
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();

        // 保存游戏状态
        const currentScore = this.score;
        const currentLevel = this.level;
        const currentTimeLeft = this.timeLeft;

        // 响应式尺寸调整
        const maxWidth = Math.min(800, rect.width - 40);
        const aspectRatio = 600 / 800;
        const maxHeight = maxWidth * aspectRatio;

        this.canvas.style.width = maxWidth + 'px';
        this.canvas.style.height = maxHeight + 'px';

        // 保持内部尺寸不变以保证游戏逻辑一致性
        this.canvas.width = 800;
        this.canvas.height = 600;

        // 恢复游戏状态
        this.score = currentScore;
        this.level = currentLevel;
        this.timeLeft = currentTimeLeft;
    }

    initializeEventListeners() {
        // 按钮事件
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('restartBtn').addEventListener('click', () => this.restartGame());
        document.getElementById('playAgainBtn').addEventListener('click', () => {
            document.getElementById('gameOverModal').style.display = 'none';
            this.restartGame();
        });

        // 难度选择按钮
        document.getElementById('easyBtn').addEventListener('click', () => this.setDifficulty('easy'));
        document.getElementById('normalBtn').addEventListener('click', () => this.setDifficulty('normal'));
        document.getElementById('hardBtn').addEventListener('click', () => this.setDifficulty('hard'));

        // 开始游戏按钮（在难度选择界面）
        document.getElementById('startGameBtn').addEventListener('click', () => this.startGame());

        // 画布点击事件
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    }

    startGame() {
        this.isPlaying = true;
        this.isPaused = false;
        this.score = 0;
        this.level = 1;

        // 根据难度设置游戏参数
        this.applyDifficultySettings();

        // 更新UI
        this.updateUI();
        document.getElementById('startBtn').disabled = true;
        document.getElementById('pauseBtn').disabled = false;

        // 隐藏难度选择
        document.getElementById('difficultyModal').style.display = 'none';

        // 初始化游戏对象
        this.initializeGameObjects();

        // 开始游戏循环
        this.startGameLoop();
        this.startTimer();
    }

    initializeGameObjects() {
        // 初始化钩子
        this.hook = new Hook(this.canvas.width / 2, 150, this.config);

        // 生成物品
        this.generateItems();
    }

    generateItems() {
        this.items = [];
        const itemCount = 8 + this.level * 2;

        // 根据难度调整物品生成概率
        let goldChance, diamondChance, goldBlockChance, smallStoneChance, bigStoneChance;

        switch (this.difficulty) {
            case 'easy':
                goldChance = 0.4;
                diamondChance = 0.25;
                goldBlockChance = 0.2;
                smallStoneChance = 0.1;
                bigStoneChance = 0.05;
                break;
            case 'normal':
                goldChance = 0.35;
                diamondChance = 0.22;
                goldBlockChance = 0.18;
                smallStoneChance = 0.13;
                bigStoneChance = 0.12;
                break;
            case 'hard':
                goldChance = 0.2;
                diamondChance = 0.15;
                goldBlockChance = 0.15;
                smallStoneChance = 0.25;
                bigStoneChance = 0.25;
                break;
        }

        // 随着关卡提升，增加石头比例
        const levelMultiplier = 1 + (this.level - 1) * 0.05;
        smallStoneChance *= levelMultiplier;
        bigStoneChance *= levelMultiplier;

        for (let i = 0; i < itemCount; i++) {
            const x = Math.random() * (this.canvas.width - 100) + 50;
            const y = Math.random() * (this.canvas.height - 250) + 250;

            // 随机生成不同类型的物品
            const rand = Math.random();
            let type, value, size, color;

            if (rand < goldChance) {
                // 黄金
                type = 'gold';
                value = 50 + Math.random() * 100;
                size = 20 + Math.random() * 20;
                color = '#FFD700';
            } else if (rand < goldChance + diamondChance) {
                // 钻石
                type = 'diamond';
                value = 100 + Math.random() * 200;
                size = 15 + Math.random() * 15;
                color = '#00CED1';
            } else if (rand < goldChance + diamondChance + goldBlockChance) {
                // 金块
                type = 'goldBlock';
                value = 30 + Math.random() * 50;
                size = 25 + Math.random() * 25;
                color = '#FFA500';
            } else if (rand < goldChance + diamondChance + goldBlockChance + smallStoneChance) {
                // 小石头
                type = 'smallStone';
                value = 5;
                size = 20 + Math.random() * 10;
                color = '#808080';
            } else {
                // 大石头
                type = 'bigStone';
                value = 2;
                size = 35 + Math.random() * 15;
                color = '#696969';
            }

            this.items.push(new Item(x, y, size, type, value, color));
        }
    }

    handleCanvasClick(e) {
        if (!this.isPlaying || this.isPaused) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // 计算点击角度
        const centerX = this.canvas.width / 2;
        const centerY = 150;
        const angle = Math.atan2(y - centerY, x - centerX);

        // 发射钩子
        if (this.hook.state === 'idle') {
            this.hook.shoot(angle);
            // 播放射击音效
            if (window.soundManager) {
                window.soundManager.playSound('shoot');
            }
        }
    }

    startGameLoop() {
        const gameLoop = () => {
            if (!this.isPlaying) return;

            if (!this.isPaused) {
                this.update();
                this.render();
            }

            requestAnimationFrame(gameLoop);
        };

        gameLoop();
    }

    update() {
        // 更新钩子
        this.hook.update(this.canvas);

        // 检查碰撞（优化：只在必要时检查）
        if (this.hook.state === 'shooting' || this.hook.state === 'pulling') {
            this.checkCollisions();
        }

        // 更新粒子效果（优化：限制粒子数量）
        this.updateParticles();

        // 检查游戏状态
        this.checkGameStatus();
    }

    checkCollisions() {
        if (this.hook.state !== 'shooting' && this.hook.state !== 'pulling') return;

        const hookTip = this.hook.getTipPosition();

        // 优化：使用空间分区来减少碰撞检测次数
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];

            // 快速筛选：只检查在钩子附近的物品
            const dx = Math.abs(hookTip.x - item.x);
            const dy = Math.abs(hookTip.y - item.y);

            if (dx < item.size + 20 && dy < item.size + 20) {
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < item.size / 2 + 5) {
                    // 钩子抓住物品
                    this.hook.grab(item);
                    this.items.splice(i, 1);
                    break;
                }
            }
        }
    }

    updateParticles() {
        // 限制最大粒子数量以提高性能
        const maxParticles = 50;

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.update();

            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // 如果粒子过多，移除最老的粒子
        if (this.particles.length > maxParticles) {
            this.particles = this.particles.slice(-maxParticles);
        }
    }

    showDifficultySelection() {
        document.getElementById('difficultyModal').style.display = 'flex';
    }

    setDifficulty(difficulty) {
        this.difficulty = difficulty;

        // 更新难度选择按钮样式
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.classList.remove('selected');
        });

        const selectedBtn = document.getElementById(difficulty + 'Btn');
        selectedBtn.classList.add('selected');
    }

    applyDifficultySettings() {
        switch (this.difficulty) {
            case 'easy':
                this.timeLeft = 90;
                this.targetScore = 300;
                this.config.hookSpeed = 4;
                this.config.hookPullSpeed = 3;
                this.config.rotationSpeed = 0.03;
                break;
            case 'normal':
                this.timeLeft = 75; // increased time for balanced play
                this.targetScore = 400; // reduced target for balanced play
                this.config.hookSpeed = 3.2; // slightly faster hook
                this.config.hookPullSpeed = 2.3; // slightly faster pull
                this.config.rotationSpeed = 0.025; // slightly faster rotation
                break;
            case 'hard':
                this.timeLeft = 45;
                this.targetScore = 800;
                this.config.hookSpeed = 2.5;
                this.config.hookPullSpeed = 1.5;
                this.config.rotationSpeed = 0.015;
                break;
        }
    }

    checkGameStatus() {
        // 检查时间
        if (this.timeLeft <= 0) {
            this.endGame(false);
        }

        // 检查是否达到目标分数
        if (this.score >= this.targetScore) {
            this.nextLevel();
        }

        // 检查是否还有物品
        if (this.items.length === 0 && this.hook.state === 'idle') {
            this.generateItems();
        }
    }

    nextLevel() {
        this.level++;

        // 根据难度调整升级奖励
        let timeBonus, targetIncrease, speedIncrease;

        switch (this.difficulty) {
            case 'easy':
                timeBonus = 15;
                targetIncrease = 150;
                speedIncrease = 0.6;
                break;
            case 'normal':
                timeBonus = 10;
                targetIncrease = 200;
                speedIncrease = 0.5;
                break;
            case 'hard':
                timeBonus = 5;
                targetIncrease = 250;
                speedIncrease = 0.3;
                break;
        }

        this.timeLeft += timeBonus;
        this.targetScore += targetIncrease;
        this.config.hookSpeed += speedIncrease;

        // 生成新物品
        this.generateItems();

        // 显示升级效果
        this.createLevelUpEffect();
        this.updateUI();
    }

    createLevelUpEffect() {
        const text = `关卡 ${this.level}!`;
        const particles = [];

        for (let i = 0; i < 20; i++) {
            particles.push(new Particle(
                this.canvas.width / 2,
                this.canvas.height / 2,
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10,
                '#FFD700'
            ));
        }

        this.particles.push(...particles);

        // 播放升级音效
        if (window.soundManager) {
            window.soundManager.playSound('levelup');
        }
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            if (!this.isPaused && this.isPlaying) {
                this.timeLeft--;
                document.getElementById('timeDisplay').textContent = this.timeLeft;

                // 播放时间警告音效（最后10秒）
                if (window.soundManager && this.timeLeft <= 10 && this.timeLeft > 0) {
                    window.soundManager.playSound('tick');
                }

                if (this.timeLeft <= 0) {
                    this.endGame(false);
                }
            }
        }, 1000);
    }

    render() {
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制背景
        this.drawBackground();

        // 绘制物品（优化：使用更高效的绘制方法）
        this.ctx.save();
        this.items.forEach(item => item.draw(this.ctx));
        this.ctx.restore();

        // 绘制钩子
        this.hook.draw(this.ctx);

        // 绘制粒子效果（优化：批量绘制）
        if (this.particles.length > 0) {
            this.ctx.save();
            this.particles.forEach(particle => particle.draw(this.ctx));
            this.ctx.restore();
        }

        // 绘制游戏信息
        this.drawGameInfo();
    }

    drawBackground() {
        // 绘制天空
        const skyGradient = this.ctx.createLinearGradient(0, 0, 0, 200);
        skyGradient.addColorStop(0, '#87CEEB');
        skyGradient.addColorStop(1, '#B0E0E6');
        this.ctx.fillStyle = skyGradient;
        this.ctx.fillRect(0, 0, this.canvas.width, 200);

        // 绘制地面
        const groundGradient = this.ctx.createLinearGradient(0, 200, 0, this.canvas.height);
        groundGradient.addColorStop(0, '#8B7355');
        groundGradient.addColorStop(0.5, '#654321');
        groundGradient.addColorStop(1, '#4B3621');
        this.ctx.fillStyle = groundGradient;
        this.ctx.fillRect(0, 200, this.canvas.width, this.canvas.height - 200);

        // 绘制矿工
        this.drawMiner();
    }

    drawMiner() {
        const centerX = this.canvas.width / 2;
        const centerY = 150;

        // 矿工身体
        this.ctx.fillStyle = '#4169E1';
        this.ctx.fillRect(centerX - 20, centerY - 30, 40, 40);

        // 矿工头部
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY - 40, 15, 0, Math.PI * 2);
        this.ctx.fillStyle = '#FDBCB4';
        this.ctx.fill();

        // 安全帽
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY - 42, 18, Math.PI, 0);
        this.ctx.fillStyle = '#FFD700';
        this.ctx.fill();

        // 眼睛
        this.ctx.beginPath();
        this.ctx.arc(centerX - 5, centerY - 42, 2, 0, Math.PI * 2);
        this.ctx.arc(centerX + 5, centerY - 42, 2, 0, Math.PI * 2);
        this.ctx.fillStyle = '#000';
        this.ctx.fill();
    }

    drawGameInfo() {
        // 在画布上显示一些游戏信息
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';

        if (this.isPaused) {
            this.ctx.fillText('游戏暂停', this.canvas.width / 2, this.canvas.height / 2);
        }
    }

    updateUI() {
        document.getElementById('scoreDisplay').textContent = this.score;
        document.getElementById('targetDisplay').textContent = this.targetScore;
        document.getElementById('levelDisplay').textContent = this.level;
        document.getElementById('timeDisplay').textContent = this.timeLeft;
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        document.getElementById('pauseBtn').textContent = this.isPaused ? '继续' : '暂停';
    }

    restartGame() {
        // 清理当前游戏状态
        this.isPlaying = false;
        this.isPaused = false;
        clearInterval(this.timerInterval);

        // 重置游戏数据
        this.score = 0;
        this.level = 1;
        this.timeLeft = 60;
        this.targetScore = 500;
        this.hook = null;
        this.items = [];
        this.particles = [];

        // 重置UI
        this.updateUI();
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('pauseBtn').textContent = '暂停';

        // 隐藏游戏结束弹窗
        document.getElementById('gameOverModal').style.display = 'none';

        // 显示难度选择
        this.showDifficultySelection();
    }

    endGame(isWin) {
        // 防止重复调用
        if (!this.isPlaying && !isWin) return;

        this.isPlaying = false;
        clearInterval(this.timerInterval);

        // 播放游戏结束音效
        if (window.soundManager) {
            window.soundManager.playSound('gameover');
        }

        // 更新按钮状态
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;

        // 显示结果
        const modal = document.getElementById('gameOverModal');
        const title = document.getElementById('gameOverTitle');
        const message = document.getElementById('gameOverMessage');

        if (isWin) {
            title.textContent = '🎉 恭喜过关！';
            message.textContent = `你达到了目标分数！当前分数: ${this.score} | 达到关卡: ${this.level}`;
        } else {
            title.textContent = '⏰ 时间到！';
            message.textContent = `你的最终分数: ${this.score} | 达到关卡: ${this.level}`;
        }

        modal.style.display = 'flex';
    }

    addScore(points) {
        this.score += Math.floor(points);
        this.updateUI();

        // 创建得分特效
        this.createScoreEffect(points);
    }

    createScoreEffect(points) {
        const text = `+${Math.floor(points)}`;
        const particle = new ScoreParticle(
            this.canvas.width / 2,
            100,
            text,
            '#FFD700'
        );
        this.particles.push(particle);
    }
}

// 钩子类
class Hook {
    constructor(x, y, config) {
        this.x = x;
        this.y = y;
        this.config = config;
        this.angle = 0;
        this.length = 0;
        this.maxLength = config.hookMaxLength;
        this.state = 'idle'; // idle, shooting, pulling, grabbing
        this.grabbedItem = null;
        this.rotationDirection = 1;
    }

    update(canvas) {
        switch (this.state) {
            case 'idle':
                // 钩子旋转
                this.angle += this.config.rotationSpeed * this.rotationDirection;
                if (Math.abs(this.angle) > Math.PI / 3) {
                    this.rotationDirection *= -1;
                }
                break;

            case 'shooting':
                // 钩子发射
                this.length += this.config.hookSpeed;
                if (this.length >= this.maxLength) {
                    this.state = 'pulling';
                }
                break;

            case 'pulling':
                // 钩子收回
                const pullSpeed = this.grabbedItem ?
                    this.config.hookPullSpeed * (1 / this.grabbedItem.weight) :
                    this.config.hookPullSpeed * 2;

                this.length -= pullSpeed;
                if (this.length <= 0) {
                    this.length = 0;
                    this.state = 'idle';

                    // 处理抓到的物品
                    if (this.grabbedItem) {
                        this.handleGrabbedItem();
                    }
                }
                break;
        }
    }

    shoot(angle) {
        this.angle = angle;
        this.state = 'shooting';
        this.length = 0;
    }

    grab(item) {
        this.grabbedItem = item;
        this.state = 'pulling';

        // 播放抓取音效
        if (window.soundManager) {
            window.soundManager.playSound('grab');
        }
    }

    handleGrabbedItem() {
        if (this.grabbedItem) {
            // 添加分数
            const game = window.game;
            if (game) {
                game.addScore(this.grabbedItem.value);
            }

            // 播放物品特定音效
            if (window.soundManager) {
                switch (this.grabbedItem.type) {
                    case 'gold':
                    case 'goldBlock':
                    case 'diamond':
                        window.soundManager.playSound('gold');
                        break;
                    case 'smallStone':
                    case 'bigStone':
                        window.soundManager.playSound('stone');
                        break;
                }
            }

            // 创建抓取特效
            this.createGrabEffect();

            this.grabbedItem = null;
        }
    }

    createGrabEffect() {
        // 创建抓取成功的粒子效果
        const game = window.game;
        if (game && this.grabbedItem) {
            const tipPos = this.getTipPosition();
            for (let i = 0; i < 10; i++) {
                const particle = new Particle(
                    tipPos.x,
                    tipPos.y,
                    (Math.random() - 0.5) * 5,
                    (Math.random() - 0.5) * 5,
                    this.grabbedItem.color
                );
                game.particles.push(particle);
            }
        }
    }

    getTipPosition() {
        return {
            x: this.x + Math.cos(this.angle) * this.length,
            y: this.y + Math.sin(this.angle) * this.length
        };
    }

    draw(ctx) {
        const tipPos = this.getTipPosition();

        // 绘制钩子线
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(tipPos.x, tipPos.y);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 3;
        ctx.stroke();

        // 绘制钩子
        ctx.save();
        ctx.translate(tipPos.x, tipPos.y);
        ctx.rotate(this.angle);

        // 钩子形状
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#666';
        ctx.fill();

        // 钩子尖端
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(15, -5);
        ctx.lineTo(15, 5);
        ctx.closePath();
        ctx.fillStyle = '#444';
        ctx.fill();

        ctx.restore();

        // 绘制抓到的物品
        if (this.grabbedItem) {
            this.grabbedItem.x = tipPos.x;
            this.grabbedItem.y = tipPos.y + 10;
            this.grabbedItem.draw(ctx);
        }
    }
}

// 物品类
class Item {
    constructor(x, y, size, type, value, color) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.type = type;
        this.value = value;
        this.color = color;
        this.weight = this.calculateWeight();
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.05;
    }

    calculateWeight() {
        switch (this.type) {
            case 'gold': return 1;
            case 'diamond': return 0.5;
            case 'goldBlock': return 1.5;
            case 'smallStone': return 3;
            case 'bigStone': return 5;
            default: return 1;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        this.rotation += this.rotationSpeed;

        switch (this.type) {
            case 'gold':
                this.drawGold(ctx);
                break;
            case 'diamond':
                this.drawDiamond(ctx);
                break;
            case 'goldBlock':
                this.drawGoldBlock(ctx);
                break;
            case 'smallStone':
            case 'bigStone':
                this.drawStone(ctx);
                break;
        }

        ctx.restore();
    }

    drawGold(ctx) {
        // 绘制金块
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);

        // 添加光泽
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(-this.size/2, -this.size/2, this.size/3, this.size);
    }

    drawDiamond(ctx) {
        // 绘制钻石
        ctx.beginPath();
        ctx.moveTo(0, -this.size/2);
        ctx.lineTo(this.size/3, 0);
        ctx.lineTo(0, this.size/2);
        ctx.lineTo(-this.size/3, 0);
        ctx.closePath();
        ctx.fillStyle = this.color;
        ctx.fill();

        // 添加光泽
        ctx.beginPath();
        ctx.moveTo(0, -this.size/2);
        ctx.lineTo(this.size/4, -this.size/4);
        ctx.lineTo(0, 0);
        ctx.lineTo(-this.size/4, -this.size/4);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fill();
    }

    drawGoldBlock(ctx) {
        // 绘制大方块
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);

        // 添加边框
        ctx.strokeStyle = '#FF8C00';
        ctx.lineWidth = 2;
        ctx.strokeRect(-this.size/2, -this.size/2, this.size, this.size);
    }

    drawStone(ctx) {
        // 绘制石头
        ctx.beginPath();
        ctx.arc(0, 0, this.size/2, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();

        // 添加纹理
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.arc(-this.size/4, -this.size/4, this.size/6, 0, Math.PI * 2);
        ctx.fill();
    }
}

// 粒子类
class Particle {
    constructor(x, y, vx, vy, color) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.life = 1;
        this.decay = 0.02;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.1; // 重力
        this.life -= this.decay;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// 分数粒子类
class ScoreParticle extends Particle {
    constructor(x, y, text, color) {
        super(x, y, 0, -2, color);
        this.text = text;
        this.decay = 0.01;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

// 初始化游戏
let game;
window.addEventListener('DOMContentLoaded', () => {
    game = new GoldMinerGame();
    window.game = game;
});