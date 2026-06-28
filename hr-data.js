/**
 * HR Gantt Demo - 数据生成模块
 * 5 个人，每人 6 个任务，共 30 个任务
 * 任务时间范围：1-20 天随机
 */

// ========== 人员定义 ==========
const HR_PEOPLE = [
    {
        id: 'zhangsan',
        name: '张三',
        color: '#4285f4',
        custom_class: 'person-zhangsan',
    },
    {
        id: 'lisi',
        name: '李四',
        color: '#ea4335',
        custom_class: 'person-lisi',
    },
    {
        id: 'wangwu',
        name: '王五',
        color: '#34a853',
        custom_class: 'person-wangwu',
    },
    {
        id: 'zhaoliu',
        name: '赵六',
        color: '#fbbc04',
        custom_class: 'person-zhaoliu',
    },
    {
        id: 'chenqi',
        name: '陈七',
        color: '#9c27b0',
        custom_class: 'person-chenqi',
    },
];

// ========== 任务名称池 ==========
const TASK_NAME_POOL = [
    '需求分析',
    '方案设计',
    '代码开发',
    '单元测试',
    '集成测试',
    '文档编写',
    '代码审查',
    '性能优化',
    '部署上线',
    '用户培训',
    '技术调研',
    '数据迁移',
    '接口联调',
    '安全审计',
    'Bug 修复',
    '产品评审',
    '迭代规划',
    '客户沟通',
    '系统监控',
    '运维支持',
    '架构设计',
    '原型设计',
    '压力测试',
    '环境搭建',
    '版本发布',
    '需求评审',
    '数据库设计',
    'API 开发',
    '前端开发',
    '后端开发',
];

// ========== 工具函数 ==========

/**
 * 生成 [min, max] 范围内的随机整数
 */
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 从数组中随机选取一个元素
 */
function randomPick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * 打乱数组（Fisher-Yates 洗牌算法）
 */
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/**
 * 获取今天的零点时间戳（UTC 毫秒）
 */
function getTodayBase() {
    const now = new Date();
    return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * 根据基准天数偏移生成 Date 对象（归一化为本地时区午夜 00:00，避免时间分量导致 bar 错位）
 */
function daysSince(base, dx) {
    const d = new Date(base);
    d.setDate(d.getDate() + dx);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// ========== 任务生成 ==========

let _allTasks = null;
let _todayBase = null;

/**
 * 为指定人员生成 6 个任务
 * @param {object} person - 人员信息对象
 * @param {number} todayBase - 今日基准时间戳
 * @param {string[]} usedTaskNames - 已使用的任务名称集合
 * @returns {object[]} 任务数组
 */
function generatePersonTasks(person, todayBase, usedTaskNames) {
    const tasks = [];
    let currentDay = randomInt(-5, 2); // 起始偏移量（相对今天）

    for (let i = 0; i < 6; i++) {
        // 选择一个未使用的任务名
        let taskName;
        do {
            taskName = randomPick(TASK_NAME_POOL);
        } while (usedTaskNames.has(taskName) && usedTaskNames.size < TASK_NAME_POOL.length);
        usedTaskNames.add(taskName);

        const duration = randomInt(1, 20);
        const taskId = `${person.id}_task_${i}`;

        const task = {
            id: taskId,
            name: `[${person.name}] ${taskName}`,
            start: daysSince(todayBase, currentDay),
            duration: `${duration}d`,
            progress: randomInt(0, 100),
            custom_class: person.custom_class,
            person_id: person.id,
            person_name: person.name,
        };

        // 第一个任务没有依赖，后续任务部分设置依赖
        if (i > 0 && Math.random() > 0.4) {
            // 连续任务：依赖前一个任务
            task.dependencies = tasks[i - 1].id;
            // 部分连续任务紧接前一个，部分有间隔
            if (Math.random() > 0.5) {
                // 有间隔：1-5 天
                currentDay += duration + randomInt(1, 5);
            } else {
                // 紧接前一个任务
                currentDay += duration;
            }
        } else {
            // 不连续：随机间隔
            currentDay += duration + randomInt(2, 8);
        }

        // 随机标记重要任务
        if (Math.random() > 0.7) {
            task.important = true;
        }

        tasks.push(task);
    }

    return tasks;
}

/**
 * 生成所有 HR 任务数据
 */
function generateHRTasks() {
    _todayBase = getTodayBase();
    _allTasks = [];
    const usedTaskNames = new Set();

    for (const person of HR_PEOPLE) {
        const personTasks = generatePersonTasks(person, _todayBase, usedTaskNames);
        _allTasks.push(...personTasks);
    }
}

// ========== 导出 API ==========

/**
 * 获取所有人员信息
 * @returns {object[]}
 */
function getPeople() {
    return [...HR_PEOPLE];
}

/**
 * 获取所有人的全部任务
 * @returns {object[]}
 */
function getAllTasks() {
    if (!_allTasks) generateHRTasks();
    return [..._allTasks];
}

/**
 * 获取指定人员的任务
 * @param {string} personId - 人员 ID
 * @returns {object[]}
 */
function getPersonTasks(personId) {
    if (!_allTasks) generateHRTasks();
    return _allTasks.filter((t) => t.person_id === personId);
}
