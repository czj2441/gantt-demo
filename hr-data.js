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

// ========== 外部数据导入 API ==========

// 当前活跃的人员列表（可被外部数据覆盖）
let _currentPeople = null;

/**
 * 设置当前人员列表（导入外部数据时调用）
 * @param {object[]} newPeople
 */
function setPeople(newPeople) {
    _currentPeople = newPeople;
}

/**
 * 获取当前活跃的人员列表
 * @returns {object[]}
 */
function getCurrentPeople() {
    return _currentPeople || getPeople();
}

/**
 * 校验并加载外部 JSON 数据
 * @param {object} data - { people: [...], tasks: [...] }
 * @returns {{ people: object[], tasks: object[] }}
 * @throws {Error} 数据格式不正确时抛出
 */
function loadExternalData(data) {
    if (!data || typeof data !== 'object') {
        throw new Error('数据格式错误：需要一个包含 people 和 tasks 的 JSON 对象');
    }
    if (!Array.isArray(data.people) || data.people.length === 0) {
        throw new Error('数据格式错误：people 必须是非空数组');
    }
    if (!Array.isArray(data.tasks) || data.tasks.length === 0) {
        throw new Error('数据格式错误：tasks 必须是非空数组');
    }

    // 校验并补全 people
    const colorPool = ['#4285f4', '#ea4335', '#34a853', '#fbbc04', '#9c27b0', '#ff6d00', '#00acc1', '#7c4dff'];
    const people = data.people.map(function (p, idx) {
        if (!p.id) throw new Error('人员缺少 id 字段（索引 ' + idx + '）');
        if (!p.name) throw new Error('人员缺少 name 字段（索引 ' + idx + '）');
        return {
            id: p.id,
            name: p.name,
            color: p.color || colorPool[idx % colorPool.length],
            custom_class: p.custom_class || ('person-' + p.id),
        };
    });

    // 校验并转换 tasks
    const tasks = data.tasks.map(function (t, idx) {
        if (!t.id) throw new Error('任务缺少 id 字段（索引 ' + idx + '）');
        if (!t.name) throw new Error('任务缺少 name 字段（索引 ' + idx + '）');
        if (!t.person_id) throw new Error('任务缺少 person_id 字段（索引 ' + idx + '）');

        var startDate = t.start instanceof Date ? t.start : new Date(t.start);
        if (isNaN(startDate.getTime())) {
            throw new Error('任务 ' + t.id + ' 的 start 日期无效：' + t.start);
        }
        // 归一化到本地午夜
        startDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

        var endDate;
        if (t.end) {
            endDate = t.end instanceof Date ? t.end : new Date(t.end);
            if (isNaN(endDate.getTime())) {
                throw new Error('任务 ' + t.id + ' 的 end 日期无效：' + t.end);
            }
            endDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
        } else if (t.duration) {
            var days = parseInt(t.duration);
            if (isNaN(days) || days <= 0) {
                throw new Error('任务 ' + t.id + ' 的 duration 无效：' + t.duration);
            }
            endDate = new Date(startDate.getTime() + (days - 1) * 86400000);
        } else {
            throw new Error('任务 ' + t.id + ' 缺少 end 或 duration 字段');
        }

        var durationDays = Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1;

        // 查找对应 person 的 custom_class
        var person = people.find(function (p) { return p.id === t.person_id; });

        return {
            id: t.id,
            name: t.name,
            start: startDate,
            end: endDate,
            duration: durationDays + 'd',
            progress: typeof t.progress === 'number' ? t.progress : 0,
            custom_class: person ? person.custom_class : (t.custom_class || ''),
            person_id: t.person_id,
            person_name: person ? person.name : (t.person_name || ''),
            dependencies: t.dependencies || '',
        };
    });

    // 覆盖内部状态
    _currentPeople = people;
    _allTasks = tasks;

    return { people: people, tasks: tasks };
}
