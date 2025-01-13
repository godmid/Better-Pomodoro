if (typeof window === 'undefined') {
    global.window = {};
}

class PomodoroTimer {
    constructor() {
        this.workTime = 25 * 60; // 25分钟
        this.breakTime = 5 * 60; // 5分钟
        this.timeLeft = this.workTime;
        this.isRunning = false;
        this.isWorkMode = true;
        this.timer = null;

        // 获取DOM元素
        this.timeDisplay = document.querySelector('.time-display');
        this.startButton = document.getElementById('start');
        this.pauseButton = document.getElementById('pause');
        this.resetButton = document.getElementById('reset');
        this.workModeButton = document.getElementById('work-mode');
        this.breakModeButton = document.getElementById('break-mode');
        this.progressCircle = document.querySelector('.progress-ring-circle');
        this.circumference = 2 * Math.PI * 45; // 圆的周长
        this.progressCircle.style.strokeDasharray = `${this.circumference} ${this.circumference}`;

        // 绑定事件
        this.startButton.addEventListener('click', () => this.start());
        this.pauseButton.addEventListener('click', () => this.pause());
        this.resetButton.addEventListener('click', () => this.reset());
        this.workModeButton.addEventListener('click', () => this.setWorkMode());
        this.breakModeButton.addEventListener('click', () => this.setBreakMode());

        this.updateDisplay();

        // 为按钮添加点击特效
        this.setupButtonEffects();

        // 添加便贴功能
        this.setupStickyNote();

        // 添加统计数据
        this.stats = {
            totalPomodoros: this.loadFromStorage('totalPomodoros') || 0,
            totalFocusTime: this.loadFromStorage('totalFocusTime') || 0,
            currentStreak: this.loadFromStorage('currentStreak') || 0,
            lastCompletedDate: this.loadFromStorage('lastCompletedDate') || null
        };

        // 更新统计显示
        this.updateStats();

        // 初始化成就系统
        this.achievements = {
            first_pomodoro: {
                id: 'first_pomodoro',
                title: '初次尝试',
                description: '完成第一个番茄钟',
                icon: '🌱',
                condition: () => this.stats.totalPomodoros >= 1,
                progress: () => Math.min(this.stats.totalPomodoros / 1 * 100, 100)
            },
            speed_runner: {
                id: 'speed_runner',
                title: '效率达人',
                description: '一天内完成5个番茄钟',
                icon: '⚡',
                condition: () => this.getDailyPomodoros() >= 5,
                progress: () => Math.min(this.getDailyPomodoros() / 5 * 100, 100)
            },
            persistent: {
                id: 'persistent',
                title: '坚持不懈',
                description: '连续使用7天',
                icon: '🔥',
                condition: () => this.stats.currentStreak >= 7,
                progress: () => Math.min(this.stats.currentStreak / 7 * 100, 100)
            },
            night_owl: {
                id: 'night_owl',
                title: '夜间专注',
                description: '在晚上10点后完成一个番茄钟',
                icon: '🦉',
                condition: () => {
                    const hour = new Date().getHours();
                    return hour >= 22 && this.stats.totalPomodoros > 0;
                },
                progress: () => this.isNightTime() ? 100 : 0
            },
            early_bird: {
                id: 'early_bird',
                title: '早起达人',
                description: '在早上6点前开始一个番茄钟',
                icon: '🌅',
                condition: () => {
                    const hour = new Date().getHours();
                    return hour < 6 && this.stats.totalPomodoros > 0;
                },
                progress: () => this.isEarlyMorning() ? 100 : 0
            },
            weekend_warrior: {
                id: 'weekend_warrior',
                title: '周末战士',
                description: '在周末完成10个番茄钟',
                icon: '🎯',
                condition: () => this.getWeekendPomodoros() >= 10,
                progress: () => Math.min(this.getWeekendPomodoros() / 10 * 100, 100)
            },
            marathon: {
                id: 'marathon',
                title: '马拉松',
                description: '连续完成4个番茄钟',
                icon: '🏃',
                condition: () => this.consecutivePomodoros >= 4,
                progress: () => Math.min(this.consecutivePomodoros / 4 * 100, 100)
            }
        };

        this.updateAchievements();

        // 初始化社交功能
        this.initializeSocialFeatures();

        // 添加脉冲动画
        const pulseStyle = document.createElement('style');
        pulseStyle.textContent = `
            @keyframes pulse {
                0% {
                    stroke-width: 5;
                    filter: drop-shadow(0 0 2px rgba(231, 76, 60, 0.5));
                }
                50% {
                    stroke-width: 7;
                    filter: drop-shadow(0 0 6px rgba(231, 76, 60, 0.8));
                }
                100% {
                    stroke-width: 5;
                    filter: drop-shadow(0 0 2px rgba(231, 76, 60, 0.5));
                }
            }
        `;
        document.head.appendChild(pulseStyle);

        // 初始化道具系统
        this.inventory = {
            coins: this.loadFromStorage('coins') || 0,
            items: {
                time_freeze: this.loadFromStorage('item_time_freeze') || 0,
                double_coins: this.loadFromStorage('item_double_coins') || 0,
                focus_shield: this.loadFromStorage('item_focus_shield') || 0,
                time_warp: this.loadFromStorage('item_time_warp') || 0
            },
            activeEffects: {
                doubleCoins: false,
                timeWarp: false,
                focusShield: false
            }
        };

        // 初始化商店
        this.initializeInventory();

        // 初始化主题
        this.initializeTheme();
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    updateDisplay() {
        this.timeDisplay.textContent = this.formatTime(this.timeLeft);
        this.updateProgress();
    }

    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.timer = setInterval(() => {
                this.timeLeft--;
                this.updateDisplay();

                if (this.timeLeft === 0) {
                    this.playAlarm();
                    this.pause();
                    this.timeLeft = this.isWorkMode ? this.workTime : this.breakTime;
                    this.updateDisplay();
                }
            }, 1000);
        }
    }

    pause() {
        this.isRunning = false;
        clearInterval(this.timer);
    }

    reset() {
        this.pause();
        this.timeLeft = this.isWorkMode ? this.workTime : this.breakTime;
        this.updateDisplay();
    }

    setWorkMode() {
        this.isWorkMode = true;
        this.workModeButton.classList.add('active');
        this.breakModeButton.classList.remove('active');
        this.timeLeft = this.workTime;
        this.updateDisplay();
        this.pause();
    }

    setBreakMode() {
        this.isWorkMode = false;
        this.workModeButton.classList.remove('active');
        this.breakModeButton.classList.add('active');
        this.timeLeft = this.breakTime;
        this.updateDisplay();
        this.pause();
    }

    playAlarm() {
        alert(this.isWorkMode ? '工作时间结束！' : '休息时间结束！');
        this.updateQuoteOnComplete();
        
        if (this.isWorkMode) {
            this.stats.totalPomodoros++;
            this.stats.totalFocusTime += 25;
            this.updateStreak();
            this.saveToStorage('totalPomodoros', this.stats.totalPomodoros);
            this.saveToStorage('totalFocusTime', this.stats.totalFocusTime);
            this.updateStats();
            
            // 检查里程碑
            this.checkMilestones();
            
            // 更新当天番茄钟数量
            this.updateDailyPomodoros();
            
            // 检查成就
            this.updateAchievements();

            this.earnReward();
        }
    }

    updateProgress() {
        const totalTime = this.isWorkMode ? this.workTime : this.breakTime;
        const progress = this.timeLeft / totalTime;
        const offset = this.circumference * (1 - progress);
        this.progressCircle.style.strokeDashoffset = offset;

        // 更新颜色
        if (progress > 0.6) {
            // 充足时间 - 绿色
            this.progressCircle.style.stroke = '#2ecc71';
        } else if (progress > 0.3) {
            // 一半时间 - 黄色
            this.progressCircle.style.stroke = '#f1c40f';
        } else {
            // 时间不足 - 红色
            this.progressCircle.style.stroke = '#e74c3c';
        }

        // 添加脉冲效果
        if (progress < 0.2) {
            this.progressCircle.style.animation = 'pulse 1s ease-in-out infinite';
        } else {
            this.progressCircle.style.animation = 'none';
        }
    }

    setupButtonEffects() {
        const buttons = document.querySelectorAll('.controls button');
        buttons.forEach(button => {
            button.addEventListener('click', (e) => this.createParticles(e));
        });
    }

    createParticles(e) {
        const button = e.currentTarget;
        const buttonRect = button.getBoundingClientRect();
        const particlesContainer = button.parentElement.querySelector('.particles');
        
        // 创建多个粒子
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            
            // 设置粒子的初始位置（相对于按钮中心）
            const x = buttonRect.width / 2;
            const y = buttonRect.height / 2;
            
            // 随机角度和距离
            const angle = Math.random() * Math.PI * 2;
            const velocity = 2 + Math.random() * 4;
            
            // 设置粒子样式
            particle.style.cssText = `
                left: ${x}px;
                top: ${y}px;
                background: ${this.getParticleColor(button.id)};
                width: ${3 + Math.random() * 3}px;
                height: ${3 + Math.random() * 3}px;
                opacity: 1;
                transform: translate(-50%, -50%);
                animation: particle-explosion 0.6s ease-out forwards;
            `;
            
            // 设置粒子运动方向
            particle.style.setProperty('--x', `${Math.cos(angle) * velocity * 50}px`);
            particle.style.setProperty('--y', `${Math.sin(angle) * velocity * 50}px`);
            
            particlesContainer.appendChild(particle);
            
            // 清理粒子
            setTimeout(() => {
                particle.remove();
            }, 600);
        }
    }

    getParticleColor(buttonId) {
        switch(buttonId) {
            case 'start':
                return '#2ecc71';
            case 'pause':
                return '#e74c3c';
            case 'reset':
                return '#3498db';
            default:
                return '#ffffff';
        }
    }

    setupStickyNote() {
        const quotes = [
            "专注当下，成就未来 🌟",
            "每个番茄钟都是进步的印记 🍅",
            "休息是为了走更远的路 ⭐",
            "坚持就是胜利的开始 💪",
            "小步前进，持续积累 🌱",
            "今天的努力是明天的礼物 🎁",
            "保持专注，保持热爱 ❤️",
            "你已经做得很棒了 ✨",
            "享受过程，收获成长 🌈",
            "每一分钟都是成长的机会 ⏰",
            "相信自己，你可以的 🌟",
            "工作与休息的平衡是智慧 ☯️",
            "一步一个脚印，稳步向前 👣",
            "保持节奏，保持热情 🔥",
            "今天的付出，明天的收获 🌾"
        ];

        const noteContent = document.querySelector('.note-content');
        const quoteElement = document.querySelector('.quote');

        // 随机获取一条鼓励语
        const getRandomQuote = () => {
            const randomIndex = Math.floor(Math.random() * quotes.length);
            return quotes[randomIndex];
        };

        // 更新便贴内容
        const updateQuote = () => {
            const newQuote = getRandomQuote();
            quoteElement.style.opacity = '0';
            
            setTimeout(() => {
                quoteElement.textContent = newQuote;
                quoteElement.style.opacity = '1';
            }, 200);
        };

        // 初始化便贴内容
        quoteElement.textContent = getRandomQuote();

        // 添加点击事件
        noteContent.addEventListener('click', () => {
            noteContent.style.transform = 'rotate(-2deg) scale(0.95)';
            setTimeout(() => {
                noteContent.style.transform = 'rotate(-2deg)';
                updateQuote();
            }, 200);
        });

        // 在每次完成一个番茄钟时更新鼓励语
        this.updateQuoteOnComplete = () => {
            updateQuote();
        };
    }

    // 保存数据到本地存储
    saveToStorage(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    // 从本地存储加载数据
    loadFromStorage(key) {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : null;
    }

    // 更新统计显示
    updateStats() {
        document.getElementById('total-pomodoros').textContent = this.stats.totalPomodoros;
        document.getElementById('total-focus-time').textContent = `${this.stats.totalFocusTime}分钟`;
        document.getElementById('current-streak').textContent = this.stats.currentStreak;
    }

    // 更新连续天数
    updateStreak() {
        const today = new Date().toDateString();
        if (this.stats.lastCompletedDate) {
            const lastDate = new Date(this.stats.lastCompletedDate);
            const dayDiff = Math.floor((new Date() - lastDate) / (1000 * 60 * 60 * 24));
            
            if (dayDiff === 1) {
                this.stats.currentStreak++;
                this.showAchievement('🔥 连续专注 ' + this.stats.currentStreak + ' 天！');
            } else if (dayDiff > 1) {
                this.stats.currentStreak = 1;
            }
        } else {
            this.stats.currentStreak = 1;
        }
        
        this.stats.lastCompletedDate = today;
        this.saveToStorage('currentStreak', this.stats.currentStreak);
        this.saveToStorage('lastCompletedDate', this.stats.lastCompletedDate);
    }

    // 显示成就横幅
    showAchievement(message) {
        const banner = document.getElementById('achievement-banner');
        banner.querySelector('.achievement-text').textContent = message;
        banner.classList.add('show');
        
        setTimeout(() => {
            banner.classList.remove('show');
        }, 3000);
    }

    // 检查是否达到里程碑
    checkMilestones() {
        const milestones = {
            1: '完成第一个番茄钟！',
            5: '完成5个番茄钟，继续加油！',
            10: '完成10个番茄钟，太棒了！',
            25: '完成25个番茄钟，你是专注力高手！',
            50: '完成50个番茄钟，令人印象深刻！',
            100: '完成100个番茄钟，你是专注力大师！'
        };

        if (milestones[this.stats.totalPomodoros]) {
            this.showAchievement('🏆 ' + milestones[this.stats.totalPomodoros]);
        }
    }

    // 获取当天完成的番茄钟数
    getDailyPomodoros() {
        const today = new Date().toDateString();
        return this.loadFromStorage(`daily_pomodoros_${today}`) || 0;
    }

    // 更新当天的番茄钟数
    updateDailyPomodoros() {
        const today = new Date().toDateString();
        const daily = this.getDailyPomodoros() + 1;
        this.saveToStorage(`daily_pomodoros_${today}`, daily);
        return daily;
    }

    // 检查并更新所有成就
    updateAchievements() {
        Object.values(this.achievements).forEach(achievement => {
            const card = document.querySelector(`[data-achievement="${achievement.id}"]`);
            if (!card) return;

            const progressBar = card.querySelector('.progress-bar');
            const progress = achievement.progress();
            progressBar.style.width = `${progress}%`;

            if (achievement.condition() && !card.classList.contains('unlocked')) {
                this.unlockAchievement(achievement, card);
            }
        });
    }

    // 解锁成就
    unlockAchievement(achievement, card) {
        card.classList.add('unlocked');
        card.classList.add('complete');
        
        // 显示成就解锁横幅
        this.showAchievement(`🎉 解锁成就：${achievement.title}`);
        
        // 保存成就状态
        this.saveToStorage(`achievement_${achievement.id}`, true);
        
        // 添加粒子效果
        this.createAchievementParticles(card);
        
        // 移除锁定图标
        setTimeout(() => {
            card.querySelector('.achievement-lock').style.display = 'none';
        }, 500);
    }

    // 成就解锁粒子效果
    createAchievementParticles(card) {
        const rect = card.getBoundingClientRect();
        const particles = 20;

        for (let i = 0; i < particles; i++) {
            const particle = document.createElement('div');
            particle.className = 'achievement-particle';
            particle.style.cssText = `
                position: fixed;
                left: ${rect.left + rect.width / 2}px;
                top: ${rect.top + rect.height / 2}px;
                width: 8px;
                height: 8px;
                background: #f1c40f;
                border-radius: 50%;
                pointer-events: none;
                z-index: 1000;
            `;

            document.body.appendChild(particle);

            const angle = (i / particles) * Math.PI * 2;
            const velocity = 2 + Math.random() * 2;
            const x = Math.cos(angle) * 100;
            const y = Math.sin(angle) * 100;

            particle.animate([
                { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
                { transform: `translate(${x}px, ${y}px) scale(0)`, opacity: 0 }
            ], {
                duration: 1000,
                easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                fill: 'forwards'
            });

            setTimeout(() => particle.remove(), 1000);
        }
    }

    initializeSocialFeatures() {
        // 初始化排行榜
        this.updateLeaderboard();
        
        // 初始化好友列表
        this.updateFriendsList();
        
        // 绑定添加好友按钮事件
        const addFriendBtn = document.getElementById('addFriendBtn');
        const modal = document.getElementById('addFriendModal');
        
        addFriendBtn.addEventListener('click', () => {
            modal.style.display = 'block';
        });
        
        // 绑定模态框按钮事件
        const cancelBtn = modal.querySelector('.cancel-btn');
        const confirmBtn = modal.querySelector('.confirm-btn');
        
        cancelBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        confirmBtn.addEventListener('click', () => {
            const friendCode = document.getElementById('friendCode').value;
            this.addFriend(friendCode);
            modal.style.display = 'none';
        });
    }

    updateLeaderboard() {
        const leaderboard = document.getElementById('leaderboard');
        const mockData = [
            { name: '用户A', pomodoros: 42, streak: 7 },
            { name: '用户B', pomodoros: 38, streak: 5 },
            { name: '用户C', pomodoros: 35, streak: 4 }
        ];

        leaderboard.innerHTML = mockData.map((user, index) => `
            <div class="leaderboard-item">
                <div class="rank rank-${index + 1}">${index + 1}</div>
                <div class="user-info">
                    <div class="user-name">${user.name}</div>
                    <div class="user-stats">
                        🍅 ${user.pomodoros} 个番茄钟 | 🔥 ${user.streak} 天连续
                    </div>
                </div>
            </div>
        `).join('');
    }

    updateFriendsList() {
        const friendsList = document.getElementById('friendsList');
        const mockFriends = [
            { name: '好友A', online: true, status: '专注中...' },
            { name: '好友B', online: false, status: '3小时前在线' }
        ];

        friendsList.innerHTML = mockFriends.map(friend => `
            <div class="friend-item">
                <div class="friend-avatar">${friend.name[0]}</div>
                <div class="user-info">
                    <div class="user-name">${friend.name}</div>
                    <div class="user-stats">${friend.status}</div>
                </div>
                <div class="friend-status ${friend.online ? 'status-online' : 'status-offline'}">
                    ${friend.online ? '在线' : '离线'}
                </div>
            </div>
        `).join('');
    }

    addFriend(friendCode) {
        // 这里添加好友的逻辑
        console.log('添加好友:', friendCode);
        // 实际应用中需要与后端API交互
        this.updateFriendsList();
    }

    // 辅助方法
    isNightTime() {
        const hour = new Date().getHours();
        return hour >= 22 || hour < 4;
    }

    isEarlyMorning() {
        const hour = new Date().getHours();
        return hour < 6;
    }

    getWeekendPomodoros() {
        const today = new Date();
        const isWeekend = today.getDay() === 0 || today.getDay() === 6;
        return isWeekend ? this.loadFromStorage('weekend_pomodoros') || 0 : 0;
    }

    // 初始化背包系统
    initializeInventory() {
        this.updateCoinsDisplay();
        this.updateItemAmounts();
        this.setupShop();
        this.setupItemButtons();
    }

    // 更新金币显示
    updateCoinsDisplay() {
        document.getElementById('coinAmount').textContent = this.inventory.coins;
    }

    // 更新道具数量显示
    updateItemAmounts() {
        Object.keys(this.inventory.items).forEach(itemId => {
            const slot = document.querySelector(`[data-item="${itemId}"]`);
            if (slot) {
                const amountSpan = slot.querySelector('.item-amount span');
                const useButton = slot.querySelector('.use-item-btn');
                amountSpan.textContent = this.inventory.items[itemId];
                useButton.disabled = this.inventory.items[itemId] <= 0;
            }
        });
    }

    // 设置商店功能
    setupShop() {
        const openShopBtn = document.getElementById('openShopBtn');
        const shopModal = document.getElementById('shopModal');
        const closeShopBtn = shopModal.querySelector('.close-shop-btn');

        openShopBtn.addEventListener('click', () => {
            shopModal.style.display = 'block';
            this.updateShopItems();
        });

        closeShopBtn.addEventListener('click', () => {
            shopModal.style.display = 'none';
        });
    }

    // 更新商店物品
    updateShopItems() {
        const shopItems = document.querySelector('.shop-items');
        const items = [
            {
                id: 'time_freeze',
                name: '时间冻结',
                icon: '⏱️',
                price: 100,
                description: '暂停5分钟计时，但保持专注状态'
            },
            {
                id: 'double_coins',
                name: '双倍奖励',
                icon: '💰',
                price: 150,
                description: '下一个番茄钟获得双倍番茄币'
            },
            {
                id: 'focus_shield',
                name: '专注护盾',
                icon: '🛡️',
                price: 200,
                description: '一次中断计时的豁免机会'
            },
            {
                id: 'time_warp',
                name: '时间加速',
                icon: '⚡',
                price: 250,
                description: '本次番茄钟时间流逝速度提升20%'
            }
        ];

        shopItems.innerHTML = items.map(item => `
            <div class="shop-item">
                <div class="item-icon">${item.icon}</div>
                <div class="item-info">
                    <h3>${item.name}</h3>
                    <p>${item.description}</p>
                    <button class="buy-item-btn" data-item="${item.id}" data-price="${item.price}">
                        购买 (${item.price} 🍅)
                    </button>
                </div>
            </div>
        `).join('');

        // 添加购买事件
        shopItems.querySelectorAll('.buy-item-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const itemId = btn.dataset.item;
                const price = parseInt(btn.dataset.price);
                this.buyItem(itemId, price);
            });
        });
    }

    // 购买道具
    buyItem(itemId, price) {
        if (this.inventory.coins >= price) {
            this.inventory.coins -= price;
            this.inventory.items[itemId]++;
            this.saveToStorage('coins', this.inventory.coins);
            this.saveToStorage(`item_${itemId}`, this.inventory.items[itemId]);
            this.updateCoinsDisplay();
            this.updateItemAmounts();
            this.showEffect('✨ 购买成功！');
        } else {
            this.showEffect('❌ 番茄币不足！');
        }
    }

    // 设置道具使用按钮
    setupItemButtons() {
        document.querySelectorAll('.use-item-btn').forEach(btn => {
            const itemSlot = btn.closest('.item-slot');
            const itemId = itemSlot.dataset.item;
            
            btn.addEventListener('click', () => this.useItem(itemId));
        });
    }

    // 使用道具
    useItem(itemId) {
        if (this.inventory.items[itemId] <= 0) return;

        this.inventory.items[itemId]--;
        this.saveToStorage(`item_${itemId}`, this.inventory.items[itemId]);

        switch (itemId) {
            case 'time_freeze':
                this.applyTimeFreeze();
                break;
            case 'double_coins':
                this.applyDoubleCoins();
                break;
            case 'focus_shield':
                this.applyFocusShield();
                break;
            case 'time_warp':
                this.applyTimeWarp();
                break;
        }

        this.updateItemAmounts();
    }

    // 道具效果实现
    applyTimeFreeze() {
        const currentTime = this.timeLeft;
        clearInterval(this.timer);
        this.showEffect('⏱️ 时间冻结！');
        
        setTimeout(() => {
            this.timeLeft = currentTime;
            if (this.isRunning) this.start();
            this.showEffect('⏱️ 时间恢复！');
        }, 5 * 60 * 1000);
    }

    applyDoubleCoins() {
        this.inventory.activeEffects.doubleCoins = true;
        this.showEffect('💰 双倍奖励已激活！');
    }

    applyFocusShield() {
        this.inventory.activeEffects.focusShield = true;
        this.showEffect('🛡️ 专注护盾已激活！');
    }

    applyTimeWarp() {
        this.inventory.activeEffects.timeWarp = true;
        this.showEffect('⚡ 时间加速已激活！');
        // 修改定时器间隔
        if (this.isRunning) {
            clearInterval(this.timer);
            this.timer = setInterval(() => {
                this.timeLeft--;
                this.updateDisplay();
                if (this.timeLeft === 0) {
                    this.playAlarm();
                    this.pause();
                    this.timeLeft = this.isWorkMode ? this.workTime : this.breakTime;
                    this.updateDisplay();
                }
            }, 800); // 加速20%
        }
    }

    // 显示效果
    showEffect(text) {
        const effect = document.createElement('div');
        effect.className = 'item-effect';
        effect.textContent = text;
        document.body.appendChild(effect);
        
        setTimeout(() => effect.remove(), 1000);
    }

    // 在完成番茄钟时获得奖励
    earnReward() {
        const baseCoins = 50;
        const coins = this.inventory.activeEffects.doubleCoins ? baseCoins * 2 : baseCoins;
        this.inventory.coins += coins;
        this.saveToStorage('coins', this.inventory.coins);
        this.updateCoinsDisplay();
        this.showEffect(`🍅 获得 ${coins} 番茄币！`);
        
        // 重置效果
        this.inventory.activeEffects.doubleCoins = false;
        this.inventory.activeEffects.timeWarp = false;
    }

    initializeTheme() {
        const themeToggle = document.getElementById('themeToggle');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const savedTheme = localStorage.getItem('theme');

        // 设置初始主题
        document.body.classList.add('theme-transition');
        if (savedTheme) {
            document.body.classList.add(savedTheme);
        } else {
            document.body.classList.add(prefersDark ? 'dark-theme' : 'light-theme');
        }

        // 主题切换事件
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('light-theme');
            document.body.classList.toggle('dark-theme');
            
            // 保存主题设置
            const currentTheme = document.body.classList.contains('dark-theme') ? 'dark-theme' : 'light-theme';
            localStorage.setItem('theme', currentTheme);

            // 显示主题切换效果
            this.showThemeTransition();
        });
    }

    showThemeTransition() {
        const effect = document.createElement('div');
        effect.className = 'theme-effect';
        document.body.appendChild(effect);
        
        setTimeout(() => effect.remove(), 1000);
    }
}

// 初始化番茄钟
const pomodoro = new PomodoroTimer(); 

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PomodoroTimer;
} 

// 添加粒子动画关键帧
const style = document.createElement('style');
style.textContent = `
    @keyframes particle-explosion {
        0% {
            transform: translate(-50%, -50%);
            opacity: 1;
        }
        100% {
            transform: translate(
                calc(-50% + var(--x)),
                calc(-50% + var(--y))
            );
            opacity: 0;
        }
    }
`;
document.head.appendChild(style); 