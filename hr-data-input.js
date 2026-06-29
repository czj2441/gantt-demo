/**
 * ============================================================
 * HR Gantt - 数据输入适配器模块 (Data Input Adapter Module)
 * ============================================================
 * 提供统一的、可插拔的数据输入接口，支持多种数据源接入：
 *   - JSON 对象直接注入
 *   - JSON 文件上传
 *   - 粘贴 JSON 文本
 *   - 远程 API 拉取
 *   - localStorage 读取
 *   - 自定义适配器扩展
 *
 * 设计原则：
 *   1. 接口统一：所有输入源返回标准化的 { people, tasks }
 *   2. 插件化：通过 DataInputManager.register() 注册新适配器
 *   3. 错误隔离：单个适配器失败不影响其他适配器
 *   4. 零依赖：纯 JavaScript，不依赖框架
 * ============================================================
 */

// ==================== 基类接口 ====================

/**
 * 数据输入适配器基类
 * 所有输入源必须继承此类并实现必要方法
 */
class DataInputAdapter {
    constructor(options = {}) {
        this.options = options;
        this._name = options.name || this.constructor.adapterName || 'unknown';
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
     * 加载数据（子类必须实现）
     * @returns {Promise<{people: Array, tasks: Array}>}
     */
    async load() {
        throw new Error('[' + this.name + '] 必须实现 load() 方法');
    }

    /**
     * 验证原始数据格式
     * @param {any} rawData
     * @returns {{valid: boolean, error?: string, data?: object}}
     */
    validate(rawData) {
        if (!rawData || typeof rawData !== 'object') {
            return { valid: false, error: '数据格式错误：需要一个包含 people 和 tasks 的 JSON 对象' };
        }
        if (!Array.isArray(rawData.people) || rawData.people.length === 0) {
            return { valid: false, error: '数据格式错误：people 必须是非空数组' };
        }
        if (!Array.isArray(rawData.tasks) || rawData.tasks.length === 0) {
            return { valid: false, error: '数据格式错误：tasks 必须是非空数组' };
        }
        return { valid: true, data: rawData };
    }

    /**
     * 转换原始数据为内部标准格式（复用 hr-data.js 的 loadExternalData）
     * @param {object} rawData
     * @returns {{people: Array, tasks: Array}}
     */
    _normalize(rawData) {
        if (typeof loadExternalData === 'function') {
            return loadExternalData(rawData);
        }
        // 降级：如果 hr-data.js 未加载，做基础转换
        return this._basicNormalize(rawData);
    }

    _basicNormalize(data) {
        var colorPool = ['#4285f4', '#ea4335', '#34a853', '#fbbc04', '#9c27b0', '#ff6d00', '#00acc1', '#7c4dff'];
        var people = data.people.map(function (p, idx) {
            return {
                id: p.id,
                name: p.name,
                color: p.color || colorPool[idx % colorPool.length],
                custom_class: p.custom_class || ('person-' + p.id),
            };
        });
        var tasks = data.tasks.map(function (t) {
            var s = new Date(t.start);
            var e = t.end ? new Date(t.end) : new Date(s.getTime() + (parseInt(t.duration || '1') - 1) * 86400000);
            var person = people.find(function (p) { return p.id === t.person_id; });
            return {
                id: t.id,
                name: t.name,
                start: s,
                end: e,
                duration: (Math.round((e.getTime() - s.getTime()) / 86400000) + 1) + 'd',
                progress: typeof t.progress === 'number' ? t.progress : 0,
                custom_class: person ? person.custom_class : (t.custom_class || ''),
                person_id: t.person_id,
                person_name: person ? person.name : (t.person_name || ''),
                dependencies: t.dependencies || '',
            };
        });
        return { people: people, tasks: tasks };
    }
}

// ==================== 具体适配器实现 ====================

/**
 * JSON 对象输入适配器
 * 用途：从 JavaScript 对象直接加载（程序代码注入、测试、其他应用调用）
 */
class JsonObjectInputAdapter extends DataInputAdapter {
    static get adapterName() { return 'json-object'; }

    get description() {
        return '直接从 JavaScript 对象加载数据，供程序代码或其他应用调用';
    }

    constructor(options) {
        super(options);
        this._data = options && options.data ? options.data : null;
    }

    /** 设置要加载的数据 */
    setData(data) {
        this._data = data;
        return this;
    }

    async load() {
        if (!this._data) throw new Error('[' + this.name + '] 未设置数据，请先调用 setData()');
        var validation = this.validate(this._data);
        if (!validation.valid) throw new Error('[' + this.name + '] ' + validation.error);
        return this._normalize(validation.data);
    }
}

/**
 * JSON 文件输入适配器
 * 用途：用户通过 <input type="file"> 上传 JSON 文件
 */
class JsonFileInputAdapter extends DataInputAdapter {
    static get adapterName() { return 'json-file'; }

    get description() {
        return '从用户上传的 JSON 文件加载数据';
    }

    constructor(options) {
        super(options);
        this._file = options && options.file ? options.file : null;
    }

    /** 设置要读取的文件 */
    setFile(file) {
        this._file = file;
        return this;
    }

    async load() {
        if (!this._file) throw new Error('[' + this.name + '] 未设置文件，请先调用 setFile()');
        var text = await this._readFile(this._file);
        var jsonData = JSON.parse(text);
        var validation = this.validate(jsonData);
        if (!validation.valid) throw new Error('[' + this.name + '] ' + validation.error);
        return this._normalize(validation.data);
    }

    _readFile(file) {
        return new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onload = function (e) { resolve(e.target.result); };
            reader.onerror = function () { reject(new Error('文件读取失败')); };
            reader.readAsText(file);
        });
    }
}

/**
 * 粘贴 JSON 输入适配器
 * 用途：用户从剪贴板粘贴 JSON 文本
 */
class PasteJsonInputAdapter extends DataInputAdapter {
    static get adapterName() { return 'paste-json'; }

    get description() {
        return '从用户粘贴的 JSON 文本加载数据';
    }

    constructor(options) {
        super(options);
        this._text = options && options.text ? options.text : '';
    }

    /** 设置要解析的文本 */
    setText(text) {
        this._text = text;
        return this;
    }

    async load() {
        if (!this._text || !this._text.trim()) {
            throw new Error('[' + this.name + '] 文本为空，请先调用 setText()');
        }
        var jsonData = JSON.parse(this._text);
        var validation = this.validate(jsonData);
        if (!validation.valid) throw new Error('[' + this.name + '] ' + validation.error);
        return this._normalize(validation.data);
    }
}

/**
 * 远程 API 输入适配器
 * 用途：从远程服务器 API 拉取数据（供外部应用集成）
 */
class ApiInputAdapter extends DataInputAdapter {
    static get adapterName() { return 'api'; }

    get description() {
        return '从远程 API 拉取数据，支持自定义 URL、请求方法和请求头';
    }

    constructor(options) {
        super(options);
        this.url = (options && options.url) || '';
        this.method = (options && options.method) || 'GET';
        this.headers = (options && options.headers) || {};
        this.body = (options && options.body) || null;
    }

    /** 配置 API 参数 */
    configure(url, method, headers, body) {
        if (url) this.url = url;
        if (method) this.method = method;
        if (headers) this.headers = headers;
        if (body) this.body = body;
        return this;
    }

    async load() {
        if (!this.url) throw new Error('[' + this.name + '] 未配置 API URL');
        var opts = {
            method: this.method,
            headers: Object.assign({ 'Content-Type': 'application/json' }, this.headers)
        };
        if (this.body) opts.body = typeof this.body === 'string' ? this.body : JSON.stringify(this.body);

        var response = await fetch(this.url, opts);
        if (!response.ok) throw new Error('[' + this.name + '] API 请求失败: HTTP ' + response.status);
        var jsonData = await response.json();
        var validation = this.validate(jsonData);
        if (!validation.valid) throw new Error('[' + this.name + '] ' + validation.error);
        return this._normalize(validation.data);
    }
}

/**
 * localStorage 输入适配器
 * 用途：从浏览器本地存储恢复数据
 */
class LocalStorageInputAdapter extends DataInputAdapter {
    static get adapterName() { return 'local-storage'; }

    get description() {
        return '从浏览器 localStorage 读取持久化数据';
    }

    constructor(options) {
        super(options);
        this.key = (options && options.key) || 'hr-gantt-data';
    }

    setKey(key) {
        this.key = key;
        return this;
    }

    async load() {
        var stored = localStorage.getItem(this.key);
        if (!stored) throw new Error('[' + this.name + '] localStorage 键 "' + this.key + '" 无数据');
        var jsonData = JSON.parse(stored);
        var validation = this.validate(jsonData);
        if (!validation.valid) throw new Error('[' + this.name + '] ' + validation.error);
        return this._normalize(validation.data);
    }
}

// ==================== 管理器 ====================

/**
 * 数据输入管理器
 * 统一管理所有输入适配器的注册、发现和加载
 */
class DataInputManager {
    constructor() {
        this._adapters = new Map();
        // 自动注册内置适配器
        this._registerBuiltins();
    }

    _registerBuiltins() {
        this.register(new JsonObjectInputAdapter());
        this.register(new JsonFileInputAdapter());
        this.register(new PasteJsonInputAdapter());
        this.register(new ApiInputAdapter());
        this.register(new LocalStorageInputAdapter());
    }

    /**
     * 注册输入适配器
     * @param {DataInputAdapter} adapter
     * @returns {DataInputManager}
     */
    register(adapter) {
        if (!(adapter instanceof DataInputAdapter)) {
            throw new Error('只能注册 DataInputAdapter 实例');
        }
        this._adapters.set(adapter.name, adapter);
        return this;
    }

    /**
     * 注销输入适配器
     * @param {string} name
     * @returns {DataInputManager}
     */
    unregister(name) {
        this._adapters.delete(name);
        return this;
    }

    /**
     * 获取指定适配器
     * @param {string} name
     * @returns {DataInputAdapter|undefined}
     */
    get(name) {
        return this._adapters.get(name);
    }

    /**
     * 获取所有适配器信息
     * @returns {Array<{name: string, description: string}>}
     */
    list() {
        return Array.from(this._adapters.values()).map(function (a) {
            return { name: a.name, description: a.description };
        });
    }

    /**
     * 从指定适配器加载数据
     * @param {string} name - 适配器名称
     * @returns {Promise<{people: Array, tasks: Array}>}
     */
    async load(name) {
        var adapter = this._adapters.get(name);
        if (!adapter) throw new Error('未找到输入适配器: ' + name);
        return adapter.load();
    }

    // ===== 快捷方法 =====

    /**
     * 从 JSON 对象加载（供外部应用直接注入数据）
     * @param {object} data
     */
    async loadFromObject(data) {
        var adapter = this._adapters.get('json-object');
        adapter.setData(data);
        return adapter.load();
    }

    /**
     * 从文件加载
     * @param {File} file
     */
    async loadFromFile(file) {
        var adapter = this._adapters.get('json-file');
        adapter.setFile(file);
        return adapter.load();
    }

    /**
     * 从粘贴文本加载
     * @param {string} text
     */
    async loadFromPaste(text) {
        var adapter = this._adapters.get('paste-json');
        adapter.setText(text);
        return adapter.load();
    }

    /**
     * 从 API 加载
     * @param {string} url
     * @param {object} options
     */
    async loadFromApi(url, options) {
        var adapter = this._adapters.get('api');
        adapter.configure(url, (options && options.method) || 'GET', (options && options.headers) || {}, (options && options.body) || null);
        return adapter.load();
    }

    /**
     * 从 localStorage 加载
     * @param {string} key
     */
    async loadFromStorage(key) {
        var adapter = this._adapters.get('local-storage');
        if (key) adapter.setKey(key);
        return adapter.load();
    }
}

// ==================== UMD 导出 ====================

var DataInputExports = {
    DataInputAdapter: DataInputAdapter,
    JsonObjectInputAdapter: JsonObjectInputAdapter,
    JsonFileInputAdapter: JsonFileInputAdapter,
    PasteJsonInputAdapter: PasteJsonInputAdapter,
    ApiInputAdapter: ApiInputAdapter,
    LocalStorageInputAdapter: LocalStorageInputAdapter,
    DataInputManager: DataInputManager,
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataInputExports;
}
if (typeof window !== 'undefined') {
    Object.keys(DataInputExports).forEach(function (k) {
        window[k] = DataInputExports[k];
    });
}
