/**
 * ============================================================
 * HR Gantt - 变更数据输出模块 (Change Data Output Module)
 * ============================================================
 * 提供统一的、可插拔的变更数据输出接口，支持多种输出目标：
 *   - 回调函数（供外部应用实时监听）
 *   - 事件总线（发布订阅，支持多消费者）
 *   - 远程 API 推送（实时同步到服务器）
 *   - localStorage 持久化（本地审计日志）
 *   - 控制台日志（调试）
 *   - 自定义适配器扩展
 *
 * 设计原则：
 *   1. 事件标准化：所有变更统一封装为 ChangeEvent
 *   2. 多播支持：一个变更可同时输出到多个目标
 *   3. 错误隔离：单个输出适配器失败不影响其他适配器
 *   4. 零依赖：纯 JavaScript，不依赖框架
 * ============================================================
 */

// ==================== 变更事件模型 ====================

/**
 * 变更事件
 * 所有数据变更（编辑、拖拽、导入）都封装为标准化事件
 */
class ChangeEvent {
    /**
     * @param {string} type      - 变更类型，如 'task-name' | 'task-start' | 'task-end' | 'task-progress' | 'batch-import' | 'data-reset'
     * @param {string} taskId    - 任务唯一标识（批量事件可为空字符串）
     * @param {object} payload   - 变更内容 { oldValue, newValue, ... }
     * @param {object} meta      - 元数据 { timestamp, source, sessionId, ... }
     */
    constructor(type, taskId, payload, meta) {
        this.type = type;
        this.taskId = taskId || '';
        this.payload = payload || {};
        this.meta = Object.assign({
            timestamp: Date.now(),
            source: 'unknown',
            sessionId: ChangeEvent._sessionId,
        }, meta || {});
    }

    /** 生成唯一会话 ID（页面级） */
    static get _sessionId() {
        if (!ChangeEvent.__sessionId) {
            ChangeEvent.__sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        }
        return ChangeEvent.__sessionId;
    }

    /** 序列化为纯 JSON 对象（便于网络传输和存储） */
    toJSON() {
        return {
            type: this.type,
            taskId: this.taskId,
            payload: this.payload,
            meta: this.meta,
        };
    }

    /** 反序列化 */
    static fromJSON(json) {
        return new ChangeEvent(json.type, json.taskId, json.payload, json.meta);
    }
}

// ==================== 基类接口 ====================

/**
 * 变更输出适配器基类
 * 所有变更数据消费端必须继承此类
 */
class ChangeOutputAdapter {
    constructor(options) {
        this.options = options || {};
        this._name = this.options.name || this.constructor.adapterName || 'unknown';
    }

    /** 适配器唯一标识名 */
    get name() {
        return this._name;
    }

    /** 适配器描述 */
    get description() {
        return '';
    }

    /**
     * 初始化（可选，子类可覆盖）
     */
    async init() { }

    /**
     * 销毁（可选，子类可覆盖）
     */
    async destroy() { }

    /**
     * 输出变更事件（子类必须实现）
     * @param {ChangeEvent} event
     * @returns {Promise<void>}
     */
    async emit(event) {
        throw new Error('[' + this.name + '] 必须实现 emit() 方法');
    }
}

// ==================== 具体适配器实现 ====================

/**
 * 回调函数输出适配器
 * 用途：供外部应用传入回调函数，实时接收变更事件
 */
class CallbackOutputAdapter extends ChangeOutputAdapter {
    static get adapterName() { return 'callback'; }

    get description() {
        return '通过回调函数输出变更事件，最简单的集成方式';
    }

    constructor(options) {
        super(options);
        this.callback = (options && options.callback) || function () {};
    }

    /** 设置回调函数 */
    setCallback(cb) {
        if (typeof cb !== 'function') throw new Error('callback 必须是函数');
        this.callback = cb;
        return this;
    }

    async emit(event) {
        this.callback(event.toJSON());
    }
}

/**
 * 事件总线输出适配器（发布订阅模式）
 * 用途：支持多订阅者，不同模块可独立监听特定类型的变更
 */
class EventBusOutputAdapter extends ChangeOutputAdapter {
    static get adapterName() { return 'event-bus'; }

    get description() {
        return '通过事件总线输出变更事件，支持按类型订阅和通配订阅';
    }

    constructor(options) {
        super(options);
        this._listeners = new Map(); // type -> Set<callback>
    }

    /**
     * 订阅变更事件
     * @param {string|Function} typeOrCallback - 事件类型（如 'task-name'）或通配回调
     * @param {Function} [callback]            - 回调函数（typeOrCallback 为字符串时必填）
     * @returns {Function} 取消订阅函数
     */
    on(typeOrCallback, callback) {
        if (typeof typeOrCallback === 'function') {
            // on(callback) 形式 → 通配订阅
            this._addListener('*', typeOrCallback);
            var self = this;
            return function () { self._removeListener('*', typeOrCallback); };
        }
        this._addListener(typeOrCallback, callback);
        var self = this;
        return function () { self._removeListener(typeOrCallback, callback); };
    }

    /**
     * 订阅一次后自动取消
     */
    once(type, callback) {
        var self = this;
        var wrapper = function (evt) {
            self._removeListener(type, wrapper);
            callback(evt);
        };
        this._addListener(type, wrapper);
        return function () { self._removeListener(type, wrapper); };
    }

    _addListener(type, callback) {
        if (!this._listeners.has(type)) {
            this._listeners.set(type, new Set());
        }
        this._listeners.get(type).add(callback);
    }

    _removeListener(type, callback) {
        var set = this._listeners.get(type);
        if (set) set.delete(callback);
    }

    async emit(event) {
        var data = event.toJSON();
        // 触发特定类型监听器
        var specific = this._listeners.get(event.type);
        if (specific) {
            specific.forEach(function (cb) {
                try { cb(data); } catch (e) { console.error('[EventBus] 监听器错误:', e); }
            });
        }
        // 触发通配监听器
        var wildcard = this._listeners.get('*');
        if (wildcard) {
            wildcard.forEach(function (cb) {
                try { cb(data); } catch (e) { console.error('[EventBus] 通配监听器错误:', e); }
            });
        }
    }
}

/**
 * 远程 API 推送输出适配器
 * 用途：将变更实时推送到远程服务器（支持批量缓冲）
 */
class ApiPushOutputAdapter extends ChangeOutputAdapter {
    static get adapterName() { return 'api-push'; }

    get description() {
        return '将变更事件推送到远程 API，支持实时/批量两种模式';
    }

    constructor(options) {
        super(options);
        this.url = (options && options.url) || '';
        this.method = (options && options.method) || 'POST';
        this.headers = (options && options.headers) || {};
        this.batchSize = (options && options.batchSize) || 1;       // 1 = 实时推送
        this.batchInterval = (options && options.batchInterval) || 5000; // 批量间隔 ms
        this._buffer = [];
        this._timer = null;
    }

    /** 配置推送参数 */
    configure(url, method, headers) {
        if (url) this.url = url;
        if (method) this.method = method;
        if (headers) this.headers = headers;
        return this;
    }

    async init() {
        if (this.batchSize > 1) {
            var self = this;
            this._timer = setInterval(function () { self._flush(); }, this.batchInterval);
        }
    }

    async destroy() {
        if (this._timer) {
            clearInterval(this._timer);
            this._timer = null;
        }
        await this._flush();
    }

    async emit(event) {
        if (this.batchSize <= 1) {
            await this._send([event.toJSON()]);
        } else {
            this._buffer.push(event.toJSON());
            if (this._buffer.length >= this.batchSize) {
                await this._flush();
            }
        }
    }

    async _flush() {
        if (this._buffer.length === 0) return;
        var batch = this._buffer.splice(0, this._buffer.length);
        await this._send(batch);
    }

    async _send(events) {
        if (!this.url) {
            console.warn('[api-push] URL 未配置，跳过推送');
            return;
        }
        try {
            var response = await fetch(this.url, {
                method: this.method,
                headers: Object.assign({ 'Content-Type': 'application/json' }, this.headers),
                body: JSON.stringify({ events: events, count: events.length }),
            });
            if (!response.ok) {
                console.error('[api-push] 推送失败:', response.status, await response.text());
            }
        } catch (err) {
            console.error('[api-push] 推送异常:', err);
        }
    }
}

/**
 * localStorage 持久化输出适配器
 * 用途：将变更事件保存到浏览器本地存储（离线审计日志）
 */
class LocalStorageOutputAdapter extends ChangeOutputAdapter {
    static get adapterName() { return 'local-storage'; }

    get description() {
        return '将变更事件持久化到 localStorage，可离线回放和审计';
    }

    constructor(options) {
        super(options);
        this.key = (options && options.key) || 'hr-gantt-changes';
        this.maxEvents = (options && options.maxEvents) || 1000;
    }

    setKey(key) {
        this.key = key;
        return this;
    }

    async emit(event) {
        var stored = [];
        try {
            stored = JSON.parse(localStorage.getItem(this.key) || '[]');
        } catch (e) { stored = []; }
        stored.push(event.toJSON());
        if (stored.length > this.maxEvents) {
            stored.splice(0, stored.length - this.maxEvents);
        }
        localStorage.setItem(this.key, JSON.stringify(stored));
    }

    /** 获取所有存储的变更事件 */
    getStoredEvents() {
        try {
            return JSON.parse(localStorage.getItem(this.key) || '[]');
        } catch (e) { return []; }
    }

    /** 清空存储 */
    clear() {
        localStorage.removeItem(this.key);
    }
}

/**
 * 控制台日志输出适配器
 * 用途：开发调试时观察变更事件流
 */
class ConsoleOutputAdapter extends ChangeOutputAdapter {
    static get adapterName() { return 'console'; }

    get description() {
        return '在控制台输出变更事件，仅用于开发调试';
    }

    constructor(options) {
        super(options);
        this.level = (options && options.level) || 'log'; // log | info | warn
    }

    async emit(event) {
        var data = event.toJSON();
        var fn = console[this.level] || console.log;
        fn('[ChangeEvent]', data.type, '| task:', data.taskId, '| payload:', data.payload);
    }
}

// ==================== 变更数据流管理器 ====================

/**
 * ChangeStream - 变更数据流管理器
 * 统一入口：应用内所有数据变更都通过此管理器发布，
 * 由已注册的输出适配器分发给各个消费端。
 */
class ChangeStream {
    constructor(options) {
        this.options = options || {};
        this._adapters = new Map();
        this._enabled = true;
        // 自动注册内置适配器（根据配置）
        this._registerBuiltins();
    }

    _registerBuiltins() {
        // 默认注册控制台适配器（方便调试）
        if (!this.options.silent) {
            this.subscribe(new ConsoleOutputAdapter());
        }
    }

    /**
     * 注册（订阅）输出适配器
     * @param {ChangeOutputAdapter} adapter
     * @returns {ChangeStream}
     */
    subscribe(adapter) {
        if (!(adapter instanceof ChangeOutputAdapter)) {
            throw new Error('只能订阅 ChangeOutputAdapter 实例');
        }
        this._adapters.set(adapter.name, adapter);
        if (adapter.init) adapter.init();
        return this;
    }

    /**
     * 注销（取消订阅）输出适配器
     * @param {string} name
     * @returns {ChangeStream}
     */
    unsubscribe(name) {
        var adapter = this._adapters.get(name);
        if (adapter) {
            if (adapter.destroy) adapter.destroy();
            this._adapters.delete(name);
        }
        return this;
    }

    /**
     * 发布单个变更事件
     * @param {string} type    - 变更类型
     * @param {string} taskId  - 任务 ID
     * @param {object} payload - 变更内容 { oldValue, newValue, ... }
     * @param {object} meta    - 额外元数据
     */
    publish(type, taskId, payload, meta) {
        if (!this._enabled) return;
        var event = new ChangeEvent(type, taskId, payload, meta);
        this._adapters.forEach(function (adapter) {
            try {
                adapter.emit(event);
            } catch (err) {
                console.error('[ChangeStream] 适配器错误:', adapter.name, err);
            }
        });
    }

    /**
     * 批量发布多个变更事件
     * @param {Array<{type, taskId, payload, meta}>} events
     */
    publishBatch(events) {
        var self = this;
        events.forEach(function (e) {
            self.publish(e.type, e.taskId, e.payload, e.meta);
        });
    }

    /**
     * 快捷方式：传入回调函数订阅所有变更
     * @param {Function} callback
     * @returns {Function} 取消订阅函数
     */
    onChange(callback) {
        var adapter = new CallbackOutputAdapter({ callback: callback });
        this.subscribe(adapter);
        var self = this;
        return function () { self.unsubscribe(adapter.name); };
    }

    /**
     * 快捷方式：按类型订阅
     * @param {string} type
     * @param {Function} callback
     * @returns {Function} 取消订阅函数
     */
    on(type, callback) {
        var bus = this._ensureEventBus();
        return bus.on(type, callback);
    }

    /**
     * 获取已注册适配器列表
     * @returns {Array<{name: string, description: string}>}
     */
    list() {
        return Array.from(this._adapters.values()).map(function (a) {
            return { name: a.name, description: a.description };
        });
    }

    /** 启用/禁用流 */
    setEnabled(enabled) {
        this._enabled = enabled;
    }

    /** 获取 EventBus 适配器（内部使用，用于 on() 快捷方法） */
    _ensureEventBus() {
        var bus = this._adapters.get('event-bus');
        if (!bus) {
            bus = new EventBusOutputAdapter();
            this.subscribe(bus);
        }
        return bus;
    }
}

// ==================== UMD 导出 ====================

var DataOutputExports = {
    ChangeEvent: ChangeEvent,
    ChangeOutputAdapter: ChangeOutputAdapter,
    CallbackOutputAdapter: CallbackOutputAdapter,
    EventBusOutputAdapter: EventBusOutputAdapter,
    ApiPushOutputAdapter: ApiPushOutputAdapter,
    LocalStorageOutputAdapter: LocalStorageOutputAdapter,
    ConsoleOutputAdapter: ConsoleOutputAdapter,
    ChangeStream: ChangeStream,
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataOutputExports;
}
if (typeof window !== 'undefined') {
    Object.keys(DataOutputExports).forEach(function (k) {
        window[k] = DataOutputExports[k];
    });
}
