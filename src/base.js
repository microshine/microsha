function isString(v) {
    return typeof v == "string"
}

function isNumber(v) {
    return typeof v == "number"
}

function isBoolean(v) {
    return typeof v == "boolean"
}

function isObject(v) {
    return typeof v == "object"
}

function isFunction(v) {
    return typeof v == "function"
}

function isArray(v) {
    return Array.isArray(v)
}

function isUndefined(v) {
    return v === undefined
}

function isNull(v) {
    return v === null
}

function isEmpty(v) {
    return isUndefined(v) || isNull(v)
}

function isType(v, t) {
    if (isFunction(t)) {
        var n = functionName(t);
        switch (n) {
            case "String":
                t = "string";
                break;
            case "Number":
                t = "number";
                break;
            case "Boolean":
                t = "boolean";
                break;
        }
    }
    if (isString(t)) {
        return typeof v == t;
    } else {
        if (instanceOf(v, functionName(t))) {
            return true;
        }
        return v instanceof t;
    }
}

function functionName(fn) {
    if (!isFunction(fn))
        throw TypeError("Parameter 1 must be Function");
    var reg = /function ([\w]+)/;
    var res = null;
    if (res = reg.exec(fn.toString()))
        res = res[1];
    else
        throw new Error("Error on get function name");
    return res;
}

function extend(a, b) {
    a.__type = isObject(a) ? functionName(a.constructor) : functionName(a);
    a.__proto__ = new b();
}

function instanceOf(el, s) {
    if (isEmpty(el))
        return false;
    if (el.__type) {
        if (el.__type == s)
            return true;
        return instanceOf(el.__proto__, s);
    }
    return false
}

function hasProperty(obj, n) {
    if (!isObject(obj))
        throw new TypeError("Parameter 1 must be Object");
    if (!isString(n))
        throw new TypeError("Parameter 2 must be String");
    return (n in obj);
}

function query(s, t) {
    var p = t || document;
    return p.querySelector(s)
}

function queryAll(s, t) {
    var p = t || document;
    return p.querySelectorAll(s);
}

//Create Node from html string
function createNode(html) {
    var div = document.createElement("div");
    div.innerHTML = html;
    return div.childNodes[0];
}

function BaseObject() {
    var that = this;
    this.__type = "BaseObject"

    var _data = {};
    this.defineProperty = function (n, value, readOnly, options) {
        _data[n] = value;
        this[n] = function (v) {
            if (!isUndefined(v) && !readOnly) {
                var e = {
                    name: n,
                    value: v,
                    cancel: false
                };
                that.trigger("beforeChange", [e]);
                if (!e.cancel) {
                    _data[n] = e.value;
                    that.trigger("change", [{ name: n, value: e.value }]);
                }
            }
            return _data[n]
        };
        var attrs = this[n].attributes = {};
        attrs.isProperty = true;
        for (var i in options)
            attrs[i] = options[i];
        for (var i in options) {
            var attr = BaseObject.__attributes[i];
            if (attr)
                attr.trigger("apply", [{ target: this, value: options }]);
        }
    }

    this.hasProperty = function (n) {
        return hasProperty(this, n);
    }

    this.clearProperty = function (n) {
        if (this.hasProperty(n)) {
            _data[n] = null;
            return true;
        }
        return false;
    }

    this.toJSON = function () {
        var obj = {};
        for (var i in this) {
            var attrs = this[i].attributes;
            if (attrs && attrs.isProperty && hasProperty(attrs, "json")) {
                var name = attrs.json.name || i;
                var val = this[i]();
                if (isObject(val))
                    obj[name] = (hasProperty(val, "toJSON")) ? val.toJSON() : val;
                else
                    obj[name] = val;
            }
        }
        return obj;
    }

    var _events = {};
    this.on = function (n, cb) {
        if (!isString(n))
            throw new TypeError("Parameter 1 must be String");
        if (!isFunction(cb))
            throw new TypeError("Parameter 2 must be Function");
        if (!(n in _events)) {
            _events[n] = {}
        }
        var e_count = Object.keys(_events[n]).length;
        _events[n][e_count] = cb;
    }

    this.trigger = function (n, args) {
        if (n in _events) {
            for (var i in _events[n])
                _events[n][i].apply(this, args);
        }
    }

    this.off = function (n, fn) {
        var e = _events[n];
        if (isFunction(fn)) {
            for (var i in e)
                if (e[i] == fn)
                    e[i] = function () { };
        }
        else
            delete _events[n]
        return true;
    }

    this.applyOptions = function (options) {
        if (!isEmpty(options)) {
            if (!isObject(options))
                throw new TypeError("Parameter 1 must be Object");
            for (var i in options) {
                var prop = this[i];
                if (prop) {
                    if (isFunction(prop))
                        prop.call(this, options[i]);
                }

            }
        }
    }
}

BaseObject.__attributes = {};

BaseObject.defineAttribute = function (name, fn) {
    var attrs = BaseObject.__attributes;
    if (!isString(name))
        throw new TypeError("Parameter 1 msut be String");
    if (hasProperty(attrs, name))
        throw new Error("Attribute '" + name + "' already exists");
    attrs[name] = new Attribute({ name: name, callback: fn });
}

function Attribute() {
    extend(this, BaseObject);
    var that = this;

    this.defineProperty("name");
    this.defineProperty("callback");

    this.remove = function () {
        delete BaseObject.__attributes[this.name()];
    }

    this.on("beforeChange", function (e) {
        switch (e.name) {
            case "callback":
                if (!isFunction(e.value))
                    throw new Error("Attribute.callback: Value must be Function");
                break;
        }
    })

    this.on("apply", function (e) {
        that.callback().call(e.target, e.value);
    })

    function init() {
        this.applyOptions(arguments[0])
    }
    init.apply(this, arguments);
}

//Collection
function Collection() {
    extend(this, BaseObject);

    var _items = {};
    this.items = function (index) {
        return _items[index];
    }

    this.length = function () {
        var res = Object.keys(_items).length;
        return res;
    }

    this.add = function (item) {
        var e = {
            value: item,
            cancel: false
        }
        this.trigger("beforeAdd", [e])
        if (!e.cancel) {
            var len = this.length();
            _items[len] = e.value;
            this.trigger("add", [{ value: e.value, index: this.length() }])
        }
    }

    function refreshIndexes(val) {
        var j = 0;
        for (var i in val) {
            if (i != j) {
                var v = val[i]
                delete val[i];
                val[j++] = v;
            }
            else {
                j++;
            }
        }
    }

    this.removeAt = function (index) {
        var e = {
            value: _items[index],
            cancel: false
        }
        this.trigger("beforeRemove", [e])
        if (!e.cancel) {
            delete _items[index];
            refreshIndexes(_items);
            this.trigger("remove", [e])
        }
    }

    this.remove = function (obj) {
        var i = this.indexOf(obj);
        if (i >= 0)
            this.removeAt(i);
    }

    function compareBase(el, val) {
        if (el.__type) {
            if (el.__type == val.__type)
                return el == val;
            return compareBase(el.__proto__, val);
        }
        return false;
    }
    this.indexOf = function (val) {
        var res = -1;
        for (var i in _items)
            if (compareBase(_items[i], val)) {
                res = +i;
                break;
            }
        return res;
    }

    function init() {

    }
    init.apply(this, arguments);
}

//Element
function Element() {
    extend(this, BaseObject);
    var that = this;

    this.defineProperty("node");
    this.defineProperty("class");
    this.defineProperty("visible");
    this.on("beforeChange", function (e) {
        switch (e.name) {
            case "class":
                if (!isString(e.value))
                    throw new TypeError("Value must be String");
                that.node().classList.remove(that.class());
                that.node().classList.add(e.value);
                break;
        }
    })

    this.on("change", function (e) {
        switch (e.name) {
            case "node":
                e.value.addEventListener("click", function () {
                    that.trigger("click", arguments);
                })
                break;
            case "visible":
                if (e.value)
                    that.node().style.display = "";
                else
                    that.node().style.display = "none";
                break;
        }
    })

    this.create = function (s) {
        s = s || "div";
        var html = "<" + s + "/>";
        this.node(createNode(html));
    }

    this.instanceOf = function (s) {
        return instanceOf(this, s);
    }

    this.query = function (s) {
        return query(s, this.node())
    }

    this.queryAll = function (s) {
        return queryAll(s, this.node());
    }

    this.appendTo = function (node, t) {
        if (instanceOf(node, "Element"))
            node.node().appendChild(this.node());
        else {
            var _node = node;
            if (isString(node))
                _node = query(node, t);
            _node.appendChild(this.node());
        }
    }

    this.addClass = function (s) {
        this.node().classList.add(s);
    }

    this.removeClass = function (s) {
        this.node().classList.remove(s);
    }

    this.hasClass = function (s) {
        return this.node().classList.contains(s);
    }

    this.attr = function (n, val) {
        if (isNull(val))
            this.node().removeAttribute(n);
        else if (isUndefined(val)) {
            return this.node().getAttribute(n);
        }
        else {
            this.node().setAttribute(n, val);
            return val;
        }
    }

    this.text = function (s) {
        if (!isEmpty(s)) {
            this.node().textContent = s;
        }
        return this.node().textContent;
    }

    this.html = function (s) {
        if (!isEmpty(s)) {
            if (!isString(s))
                throw new TypeError("Value must be String");
            this.node().innerHTML = s;
        }
        return this.node().innerHTML;
    }

    this.show = function () {
        this.node().classList.remove("hidden");
    }

    this.hide = function () {
        this.node().classList.add("hidden");
    }

    this.append = function (node) {
        if (instanceOf(node, "Element")) {
            node = node.node();
        }
        this.node().appendChild(node);
    }

    this.width = function (n) {
        if (n !== undefined)
            this.node().style.width = n;
        return this.node().clientWidth;
    }

    this.height = function (n) {
        if (n !== undefined)
            this.node().style.height = n;
        return this.node().clientHeight;
    }

    this.size = function (h, w) {
        if (arguments.length = 2) {
            this.width(w);
            this.height(h);
        }
        return { height: this.height(), width: this.width() }
    }

    this.x = this.left = function (n) {
        if (n !== undefined) {
            this.node().style.left = n;
            this.trigger("move");
        }
        return this.node().offsetLeft;
    }

    this.y = this.top = function (n) {
        if (n !== undefined) {
            this.node().style.top = n;
            this.trigger("move");
        }
        return this.node().offsetTop;
    }

    this.position = function (o) {
        if (o) {
            this.node().style.left = o.x || o.left;
            this.node().style.top = o.y || o.top;
            this.trigger("move");
        }
        return { x: this.x(), y: this.y() }
    }

    function init() {
    }

    init.apply(this, arguments);
}