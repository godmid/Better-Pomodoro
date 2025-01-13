describe('PomodoroTimer', () => {
    let pomodoro;
    
    // 在每个测试前设置 DOM 环境
    beforeEach(() => {
        document.body.innerHTML = `
            <div class="container">
                <div class="time-display">25:00</div>
                <div class="controls">
                    <button id="start">开始</button>
                    <button id="pause">暂停</button>
                    <button id="reset">重置</button>
                </div>
                <div class="mode-switch">
                    <button id="work-mode" class="active">工作时间</button>
                    <button id="break-mode">休息时间</button>
                </div>
            </div>
        `;
        
        // 导入原始的 PomodoroTimer 类
        require('./script.js');
        pomodoro = new PomodoroTimer();
    });

    // 测试初始状态
    test('初始化状态正确', () => {
        expect(pomodoro.timeLeft).toBe(25 * 60);
        expect(pomodoro.isRunning).toBe(false);
        expect(pomodoro.isWorkMode).toBe(true);
        expect(document.querySelector('.time-display').textContent).toBe('25:00');
    });

    // 测试时间格式化
    test('时间格式化正确', () => {
        expect(pomodoro.formatTime(65)).toBe('01:05');
        expect(pomodoro.formatTime(3600)).toBe('60:00');
        expect(pomodoro.formatTime(0)).toBe('00:00');
    });

    // 测试模式切换
    test('工作模式和休息模式切换正确', () => {
        pomodoro.setBreakMode();
        expect(pomodoro.isWorkMode).toBe(false);
        expect(pomodoro.timeLeft).toBe(5 * 60);
        expect(document.querySelector('.time-display').textContent).toBe('05:00');

        pomodoro.setWorkMode();
        expect(pomodoro.isWorkMode).toBe(true);
        expect(pomodoro.timeLeft).toBe(25 * 60);
        expect(document.querySelector('.time-display').textContent).toBe('25:00');
    });

    // 测试计时器控制
    test('开始和暂停功能正确', () => {
        jest.useFakeTimers();
        
        pomodoro.start();
        expect(pomodoro.isRunning).toBe(true);
        
        // 前进3秒
        jest.advanceTimersByTime(3000);
        expect(pomodoro.timeLeft).toBe(25 * 60 - 3);
        
        pomodoro.pause();
        expect(pomodoro.isRunning).toBe(false);
        
        // 再前进3秒
        jest.advanceTimersByTime(3000);
        expect(pomodoro.timeLeft).toBe(25 * 60 - 3); // 时间应该停止了
        
        jest.useRealTimers();
    });

    // 测试重置功能
    test('重置功能正确', () => {
        pomodoro.timeLeft = 1000; // 手动设置一个不同的时间
        pomodoro.reset();
        expect(pomodoro.timeLeft).toBe(25 * 60);
        expect(document.querySelector('.time-display').textContent).toBe('25:00');
    });

    // 测试计时结束
    test('计时结束时的行为正确', () => {
        jest.useFakeTimers();
        const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});
        
        pomodoro.timeLeft = 2; // 设置剩余2秒
        pomodoro.start();
        
        jest.advanceTimersByTime(2000);
        
        expect(alertMock).toHaveBeenCalledWith('工作时间结束！');
        expect(pomodoro.isRunning).toBe(false);
        expect(pomodoro.timeLeft).toBe(25 * 60);
        
        alertMock.mockRestore();
        jest.useRealTimers();
    });
}); 