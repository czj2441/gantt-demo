import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:53658/hr-demo.html';

test.describe('HR Gantt Demo 页面测试', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    });

    test('页面标题和头部正确显示', async ({ page }) => {
        // 验证页面标题
        await expect(page).toHaveTitle('人力资源 Gantt 图 Demo');

        // 验证头部标题
        const header = page.locator('.page-header h1');
        await expect(header).toBeVisible();
        await expect(header).toHaveText('人力资源 Gantt 图 Demo');

        // 验证副标题
        const subtitle = page.locator('.page-header p');
        await expect(subtitle).toBeVisible();
        await expect(subtitle).toContainText('5 位成员');
    });

    test('单图模式 - 图例渲染正确', async ({ page }) => {
        const legend = page.locator('#legend-a');
        await expect(legend).toBeVisible();

        // 应有 5 个图例项
        const items = legend.locator('.legend-item');
        await expect(items).toHaveCount(5);

        // 验证每个人的名字都在图例中
        const names = ['张三', '李四', '王五', '赵六', '陈七'];
        for (const name of names) {
            await expect(legend).toContainText(name);
        }
    });

    test('单图模式 - Gantt 图表渲染', async ({ page }) => {
        // 验证单图容器存在
        const chart = page.locator('#hr-single');
        await expect(chart).toBeVisible();

        // 验证 SVG 元素已创建
        const svg = chart.locator('svg.gantt');
        await expect(svg).toBeVisible();

        // 验证有 30 个 bar-wrapper（5人 × 6任务）
        const bars = chart.locator('svg.gantt .bar-wrapper');
        const barCount = await bars.count();
        expect(barCount).toBe(30);
    });

    test('单图模式 - 人员颜色 class 正确应用', async ({ page }) => {
        const chart = page.locator('#hr-single svg.gantt');

        // 验证每种人员颜色 class 都有对应 bar
        const colorClasses = [
            { cls: 'person-zhangsan', expected: 6 },
            { cls: 'person-lisi', expected: 6 },
            { cls: 'person-wangwu', expected: 6 },
            { cls: 'person-zhaoliu', expected: 6 },
            { cls: 'person-chenqi', expected: 6 },
        ];

        for (const { cls, expected } of colorClasses) {
            const count = await chart.locator(`.bar-wrapper.${cls}`).count();
            expect(count).toBe(expected);
        }
    });

    test('多图模式 - 5 个独立图表渲染', async ({ page }) => {
        const grid = page.locator('#multi-chart-grid');
        await expect(grid).toBeVisible();

        // 应有 5 个卡片
        const cards = grid.locator('.person-chart-card');
        await expect(cards).toHaveCount(5);

        // 验证每个卡片都有头像、名称和 Gantt 图
        const names = ['张三', '李四', '王五', '赵六', '陈七'];
        for (let i = 0; i < names.length; i++) {
            const card = cards.nth(i);

            // 验证头像
            const avatar = card.locator('.person-avatar');
            await expect(avatar).toBeVisible();
            await expect(avatar).toHaveText(names[i].charAt(0));

            // 验证名称
            await expect(card.locator('h4')).toHaveText(names[i]);

            // 验证任务数
            await expect(card.locator('.task-count')).toHaveText('6 项任务');

            // 验证 Gantt 图表存在
            const svg = card.locator('svg.gantt');
            await expect(svg).toBeVisible();

            // 验证每个图表有 6 个 bar
            const bars = card.locator('.bar-wrapper');
            const barCount = await bars.count();
            expect(barCount).toBe(6);
        }
    });

    test('多图模式 - 每个图表的 bar 带有正确的颜色 class', async ({ page }) => {
        const cards = page.locator('#multi-chart-grid .person-chart-card');
        const expectedClasses = [
            'person-zhangsan',
            'person-lisi',
            'person-wangwu',
            'person-zhaoliu',
            'person-chenqi',
        ];

        for (let i = 0; i < expectedClasses.length; i++) {
            const card = cards.nth(i);
            const bars = card.locator(`.bar-wrapper.${expectedClasses[i]}`);
            const count = await bars.count();
            expect(count).toBe(6);
        }
    });

    test('单图模式和多图模式的区块标题都可见', async ({ page }) => {
        const sections = page.locator('.section');
        await expect(sections).toHaveCount(2);

        // 单图模式标题
        await expect(sections.nth(0).locator('.section-title')).toContainText('单图模式');
        await expect(sections.nth(0).locator('.badge')).toHaveText('推荐');

        // 多图模式标题
        await expect(sections.nth(1).locator('.section-title')).toContainText('多图模式');
    });

    // ============================================================
    // 新功能测试：周末高亮 + 时间范围切换
    // ============================================================

    test('工具栏：单图模式工具栏元素完整', async ({ page }) => {
        const toolbar = page.locator('.section').nth(0).locator('.toolbar');
        await expect(toolbar).toBeVisible();

        // 线性粒度滑块
        const slider = toolbar.locator('#zoom-slider-a');
        await expect(slider).toBeVisible();
        await expect(slider).toHaveAttribute('min', '0');
        await expect(slider).toHaveAttribute('max', '100');

        // 当前值显示
        const valueEl = toolbar.locator('#zoom-value-a');
        await expect(valueEl).toBeVisible();
        await expect(valueEl).toContainText('px');

        // 周末高亮开关
        const toggleLabel = toolbar.locator('label.switch-label');
        await expect(toggleLabel).toBeVisible();
        const toggle = toolbar.locator('#toggle-weekends-a');
        await expect(toggle).toBeAttached();
        await expect(toggle).toBeChecked();

        // "滚动到今天" 按钮
        const todayBtn = toolbar.locator('#scroll-today-a');
        await expect(todayBtn).toBeVisible();
        await expect(todayBtn).toHaveText('滚动到今天');
    });

    test('工具栏：多图模式工具栏元素完整', async ({ page }) => {
        const toolbar = page.locator('.section').nth(1).locator('.toolbar');
        await expect(toolbar).toBeVisible();

        // 线性粒度滑块
        const slider = toolbar.locator('#zoom-slider-b');
        await expect(slider).toBeVisible();

        // 当前值显示
        const valueEl = toolbar.locator('#zoom-value-b');
        await expect(valueEl).toBeVisible();
        await expect(valueEl).toContainText('px');

        // 周末高亮开关
        const toggle = toolbar.locator('#toggle-weekends-b');
        await expect(toggle).toBeChecked();
    });

    test('周末高亮：初始状态有周末高亮矩形', async ({ page }) => {
        // 单图模式图表应有周末高亮
        const svg = page.locator('#hr-single svg.gantt');
        const highlights = svg.locator('.holiday-highlight');
        const count = await highlights.count();
        expect(count).toBeGreaterThan(0);
    });

    test('周末高亮：单图模式关闭周末高亮后矩形消失', async ({ page }) => {
        const svg = page.locator('#hr-single svg.gantt');

        // 初始有周末高亮
        let highlights = svg.locator('.holiday-highlight');
        expect(await highlights.count()).toBeGreaterThan(0);

        // 关闭周末高亮（点击可见的 label 而非隐藏的 input）
        await page.locator('label[for="toggle-weekends-a"], label:has(#toggle-weekends-a)').first().click();
        await page.waitForTimeout(500);

        // 高亮应该消失
        highlights = svg.locator('.holiday-highlight');
        expect(await highlights.count()).toBe(0);

        // 重新开启
        await page.locator('label[for="toggle-weekends-a"], label:has(#toggle-weekends-a)').first().click();
        await page.waitForTimeout(500);

        // 高亮应该恢复
        highlights = svg.locator('.holiday-highlight');
        expect(await highlights.count()).toBeGreaterThan(0);
    });

    test('周末高亮：多图模式关闭周末高亮后所有子图表矩形消失', async ({ page }) => {
        const cards = page.locator('#multi-chart-grid .person-chart-card');

        // 初始第一张图有周末高亮
        let firstSvg = cards.nth(0).locator('svg.gantt');
        expect(await firstSvg.locator('.holiday-highlight').count()).toBeGreaterThan(0);

        // 关闭多图模式的周末高亮（点击可见的 label）
        await page.locator('label:has(#toggle-weekends-b)').first().click();
        await page.waitForTimeout(500);

        // 所有 5 张图的高亮都应消失
        for (let i = 0; i < 5; i++) {
            const svg = cards.nth(i).locator('svg.gantt');
            expect(await svg.locator('.holiday-highlight').count()).toBe(0);
        }
    });

    test('线性粒度：单图模式拖动滑块改变 column_width', async ({ page }) => {
        const slider = page.locator('#zoom-slider-a');
        const svg = page.locator('#hr-single svg.gantt');

        // 获取初始 CSS 变量值
        const initialWidth = await svg.evaluate((el) => {
            return getComputedStyle(el.closest('.gantt-container')).getPropertyValue('--gv-column-width').trim();
        });

        // 将滑块拖到最小（年视图级别）
        await slider.fill('0');
        await slider.dispatchEvent('input');
        await page.waitForTimeout(500);

        const smallWidth = await svg.evaluate((el) => {
            return getComputedStyle(el.closest('.gantt-container')).getPropertyValue('--gv-column-width').trim();
        });

        // 列宽应该变小
        expect(parseFloat(smallWidth)).toBeLessThan(parseFloat(initialWidth));

        // 图表仍然可见
        await expect(svg).toBeVisible();
    });

    test('线性粒度：拖动滑块时值显示同步更新', async ({ page }) => {
        const slider = page.locator('#zoom-slider-a');
        const valueEl = page.locator('#zoom-value-a');

        // 获取初始值
        const initialValue = await valueEl.textContent();
        expect(initialValue).toMatch(/\d+px/);

        // 将滑块拖到最小
        await slider.fill('0');
        await slider.dispatchEvent('input');
        await page.waitForTimeout(300);

        // 值显示应该更新为更小的值
        const smallValue = await valueEl.textContent();
        expect(smallValue).toMatch(/\d+px/);
        expect(parseInt(smallValue)).toBeLessThan(parseInt(initialValue));

        // 图表仍然可见
        await expect(page.locator('#hr-single svg.gantt')).toBeVisible();
    });

    test('线性粒度：多图模式拖动滑块影响所有子图表', async ({ page }) => {
        const slider = page.locator('#zoom-slider-b');
        const cards = page.locator('#multi-chart-grid .person-chart-card');

        // 将滑块拖到最小
        await slider.fill('0');
        await slider.dispatchEvent('input');
        await page.waitForTimeout(500);

        // 所有 5 张图都仍然可见
        for (let i = 0; i < 5; i++) {
            await expect(cards.nth(i).locator('svg.gantt')).toBeVisible();
        }
    });

    test('截图：全页面视觉对比', async ({ page }) => {
        // 全页面截图
        await page.screenshot({
            path: 'tests/screenshots/hr-demo-full.png',
            fullPage: true,
        });

        // 单图模式区域截图
        const planA = page.locator('.section').nth(0);
        await planA.screenshot({
            path: 'tests/screenshots/hr-demo-plan-a.png',
        });

        // 多图模式区域截图
        const planB = page.locator('.section').nth(1);
        await planB.screenshot({
            path: 'tests/screenshots/hr-demo-plan-b.png',
        });
    });

    test('日期显示：Day 视图每天显示日期和周几', async ({ page }) => {
        // 确保在 Day 粒度（滑块设为最大值以获得最详细的日视图）
        const slider = page.locator('#zoom-slider-a');
        await slider.fill('100');
        await slider.dispatchEvent('input');
        await page.waitForTimeout(300);

        // 获取所有下行文本元素（lower-text）
        const lowerTexts = page.locator('#hr-single .lower-text');
        const count = await lowerTexts.count();
        expect(count).toBeGreaterThan(0);

        // 检查是否包含周几文本
        const weekdayPattern = /周[一二三四五六日]/;
        let foundWeekday = false;
        for (let i = 0; i < Math.min(count, 20); i++) {
            const text = await lowerTexts.nth(i).textContent();
            if (weekdayPattern.test(text)) {
                foundWeekday = true;
                break;
            }
        }
        expect(foundWeekday).toBe(true);

        // 多图模式也验证
        const lowerTextsB = page.locator('#multi-chart-grid .lower-text').first();
        const textB = await lowerTextsB.textContent();
        // 要么包含日期数字，要么包含周几
        expect(textB.length).toBeGreaterThan(0);
    });

    // ============================================================
    // 新功能测试：任务表格 + 双向同步
    // ============================================================

    test('表格：正确渲染 30 行任务数据', async ({ page }) => {
        const tableBody = page.locator('#task-table-body-a');
        await expect(tableBody).toBeVisible();
        const rows = tableBody.locator('tr');
        await expect(rows).toHaveCount(30);

        // 验证表头
        const headers = page.locator('#task-table-a thead th');
        await expect(headers).toHaveCount(4);
        await expect(headers.nth(0)).toHaveText('任务名');
        await expect(headers.nth(1)).toHaveText('经办人');
        await expect(headers.nth(2)).toHaveText('开始时间');
        await expect(headers.nth(3)).toHaveText('结束时间');
    });

    test('表格：编辑任务名后同步到单图 Gantt', async ({ page }) => {
        const firstNameCell = page.locator('#task-table-body-a tr').first().locator('.cell-name');
        await firstNameCell.click();
        await firstNameCell.fill('新任务名测试');
        await firstNameCell.press('Enter');
        await page.waitForTimeout(200);

        // 验证单图 Gantt 中第一个 bar 的标签已更新
        const firstLabel = page.locator('#hr-single .bar-label').first();
        await expect(firstLabel).toHaveText('新任务名测试');
    });

    test('表格：编辑开始日期后同步到 Gantt 任务对象', async ({ page }) => {
        const firstRow = page.locator('#task-table-body-a tr').first();
        const startCell = firstRow.locator('.cell-start');

        await startCell.click();
        await startCell.fill('2026-08-15');
        await startCell.press('Enter');
        await page.waitForTimeout(300);

        // 通过 JS 验证 ganttA 中的任务日期已更新
        const taskStart = await page.evaluate(() => {
            const task = ganttA.tasks[0];
            return task.start.toISOString().split('T')[0];
        });
        expect(taskStart).toBe('2026-08-15');
    });

    test('页面中不存在旧的方案 A/B 字样', async ({ page }) => {
        const bodyText = await page.locator('body').textContent();
        expect(bodyText).not.toContain('方案 A');
        expect(bodyText).not.toContain('方案 B');
    });
});
