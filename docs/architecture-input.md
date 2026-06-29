# HR Gantt 数据输入接口架构文档

## 1. 设计目标

数据输入模块采用**适配器模式（Adapter Pattern）**，核心目标是：

- **统一接口**：无论数据来源是文件、API、剪贴板还是内存对象，对外暴露同一套加载接口
- **插件化扩展**：新数据源无需修改现有代码，只需注册新适配器
- **错误隔离**：单个适配器失败不影响其他适配器
- **零框架依赖**：纯 JavaScript，可在任何浏览器环境或 Node.js 中运行

---

## 2. 核心抽象

### 2.1 `DataInputAdapter` — 输入适配器基类

所有数据源必须继承此基类，并实现以下契约：

```typescript
abstract class DataInputAdapter {
    // 适配器唯一标识名（如 'json-file'、'api'）
    readonly name: string;

    // 人类可读描述
    readonly description: string;

    /**
     * 加载并返回标准化的数据
     * @returns {Promise<{people: Person[], tasks: Task[]}>}
     */
    abstract async load(): Promise<{ people: Person[]; tasks: Task[] }>;

    /**
     * 验证原始数据格式
     * @returns { valid: boolean; error?: string; data?: object }
     */
    validate(rawData: unknown): ValidationResult;
}
```

### 2.2 `DataInputManager` — 输入管理器

负责注册、发现和管理所有输入适配器，是外部应用与输入层交互的唯一入口：

```typescript
class DataInputManager {
    // 注册适配器
    register(adapter: DataInputAdapter): this;

    // 注销适配器
    unregister(name: string): this;

    // 获取适配器实例
    get(name: string): DataInputAdapter | undefined;

    // 列出所有已注册适配器
    list(): Array<{ name: string; description: string }>;

    // 通过指定适配器加载数据
    async load(name: string): Promise<{ people: Person[]; tasks: Task[] }>;
}
```

---

## 3. 数据模型

输入模块处理的数据统一为以下结构：

```typescript
interface Person {
    id: string;           // 唯一标识，如 'zhangsan'
    name: string;         // 显示名称，如 '张三'
    color: string;        // 十六进制颜色，如 '#4285f4'
    custom_class: string; // CSS 类名，如 'person-zhangsan'
}

interface Task {
    id: string;           // 唯一标识，如 'zhangsan_task_0'
    name: string;         // 任务名称
    start: Date;          // 开始日期
    end: Date;            // 结束日期
    duration: string;     // 持续时间，如 '5d'
    progress: number;     // 完成百分比，0-100
    person_id: string;    // 关联人员 ID
    person_name: string;  // 关联人员名称（冗余，便于显示）
    custom_class: string; // CSS 类名
    dependencies?: string; // 依赖任务 ID（可选）
}

interface InputData {
    people: Person[];
    tasks: Task[];
}
```

---

## 4. 内置适配器

| 适配器名称 | 用途 | 典型配置 |
|---|---|---|
| `json-object` | 程序代码直接注入 JavaScript 对象 | `setData(data)` |
| `json-file` | 用户通过 `<input type="file">` 上传 JSON 文件 | `setFile(file)` |
| `paste-json` | 用户从剪贴板粘贴 JSON 文本 | `setText(text)` |
| `api` | 从远程 HTTP API 拉取数据 | `configure(url, method, headers)` |
| `local-storage` | 从浏览器 `localStorage` 读取持久化数据 | `setKey(key)` |

---

## 5. 使用示例

### 5.1 外部应用程序化注入数据

场景：父页面通过 iframe 嵌入 Gantt，或 Chrome 扩展向页面注入数据。

```javascript
// 方式一：直接调用高层 API
await window.HRGanttApp.loadData({
    people: [
        { id: 'p1', name: '张三', color: '#4285f4' }
    ],
    tasks: [
        { id: 't1', name: '需求分析', person_id: 'p1', start: '2026-07-01', end: '2026-07-10' }
    ]
});

// 方式二：使用输入管理器（更灵活）
const manager = window.HRGanttApp.input;
const result = await manager.loadFromObject(data);
```

### 5.2 从远程 API 拉取数据

场景：Gantt 图与项目管理系统集成，定时或按需从后端同步最新任务数据。

```javascript
const result = await window.HRGanttApp.loadFromApi(
    'https://pm.example.com/api/v1/tasks',
    {
        method: 'GET',
        headers: { 'Authorization': 'Bearer xxx' }
    }
);
```

### 5.3 响应用户文件上传

场景：用户点击"导入 JSON 文件"按钮，选择本地文件后加载。

```javascript
const fileInput = document.getElementById('file-import');

fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    const result = await window.HRGanttApp.input.loadFromFile(file);
    // result.people 和 result.tasks 可直接用于重建 Gantt
});
```

---

## 6. 自定义适配器

当内置适配器无法满足需求时，可通过继承 `DataInputAdapter` 实现自定义适配器。

### 6.1 典型扩展场景

- **WebSocket 实时数据源**：后端通过 WebSocket 推送任务更新
- **数据库直连**：Electron / Tauri 桌面应用中直接读取本地 SQLite
- **第三方 SaaS 集成**：如 Jira、Trello、Notion API 数据转换
- **Excel/CSV 导入**：解析 `.xlsx` 或 `.csv` 文件

### 6.2 自定义适配器接口契约

```typescript
class MyCustomAdapter extends DataInputAdapter {
    get name() {
        return 'my-custom-source';
    }

    get description() {
        return '从自定义数据源加载';
    }

    // 可选：配置参数
    configure(options: MyOptions): this {
        this.options = options;
        return this;
    }

    // 必须实现
    async load(): Promise<InputData> {
        // 1. 从源获取原始数据
        const rawData = await this.fetchFromSource();

        // 2. 基类提供的统一验证
        const validation = this.validate(rawData);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        // 3. 基类提供的标准化转换（或自行转换）
        return this._normalize(validation.data);
    }
}
```

### 6.3 注册与使用

```javascript
const adapter = new MyCustomAdapter({ /* 配置 */ });

// 注册到全局输入管理器
window.HRGanttApp.registerInput(adapter);

// 像内置适配器一样使用
const result = await window.HRGanttApp.input.load('my-custom-source');
```

---

## 7. 错误处理策略

输入模块采用**分层错误处理**：

| 层级 | 错误类型 | 处理方式 |
|---|---|---|
| 数据获取层 | 网络超时、文件读取失败、Storage 无数据 | 向上抛出，由调用方捕获 |
| 格式验证层 | JSON 解析失败、缺少必要字段 | `validate()` 返回 `{ valid: false, error: '...' }` |
| 数据转换层 | 日期格式无效、颜色值非法 | `loadExternalData()` 抛出详细错误信息 |
| 适配器管理层 | 未找到指定适配器 | `DataInputManager.load()` 抛出 `未找到输入适配器: xxx` |

推荐调用模式：

```javascript
try {
    const result = await window.HRGanttApp.input.loadFromFile(file);
} catch (err) {
    // 错误信息格式统一为：[adapter-name] 具体错误描述
    console.error('导入失败:', err.message);
}
```

---

## 8. 与变更输出模块的联动

数据输入不是孤立的。当通过输入接口成功加载新数据后，系统会自动向 `ChangeStream` 发布一个 `batch-import` 变更事件，使所有已注册的输出适配器（如远程 API 推送、本地审计日志）都能感知到数据变更：

```javascript
// 输入成功 → 自动触发输出
changeStream.publish('batch-import', '', {
    sourceType: 'json-file',
    peopleCount: result.people.length,
    taskCount: result.tasks.length,
});
```

这使得**输入**与**输出**形成完整闭环，外部应用既可向 Gantt 推送数据，也可监听 Gantt 的数据变化。
