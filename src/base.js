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
    if (isString(t))
        return typeof v == t
    return v instanceof t
}

function extend(a, b) {
    a.__proto__ = new b();
    a.type = arguments.callee.caller.name;
}

function instanceOf(el, s) {
    if (el.type) {
        if (el.type == s)
            return true;
        return instanceOf(el.__proto__, s);
    }
    return false
}

function hasProperty(obj, n) {
    if (!isObject(obj))
        throw new TypeError("Parameter 1 must be Object");
    if (!isString(obj))
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
    this.type = "BaseObject"

    var _data = {};
    this.defineProperty = function (n, value, readOnly) {
        _data[n] = value;
        this[n] = function (v) {
            if (!isEmpty(v) && !readOnly) {
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
        }
    }

    var _events = {};
    this.on = function (n, cb) {
        if (!isString(n))
            throw new TypeError("Parameter 1 must be String");
        if (!isFunction(cb))
            throw new TypeError("Parameter 2 must be Function");
        if (!(n in _events)) {
            _events[n] = []
        }
        _events[n].push(cb);
    }

    this.trigger = function (n, args) {
        if (n in _events) {
            for (var i in _events[n])
                _events[n][i].apply(this, args);
        }
    }

    this.off = function (n) {
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
            val[j++] = val[i];
            if (i != j)
                delete val[i];
        }
    }

    this.removeAt = function (index) {
        var e = {
            value: item,
            cancel: false
        }
        this.trigger("beforeRemove", [e])
        if (!e.cancel) {
            delete _items[index];
            refreshIndexes(_items);
            this.trigger("remove", [e])
        }
    }
    function compareBase(el, val) {
        if (el.type) {
            if (el.type == val.type)
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

    this.create = function (s) {
        s = s || "div";
        var html = "<" + s + "/>";
        this.node(createNode(html));

        var that = this;
        this.node().addEventListener("click", function () {
            that.trigger("click", arguments);
        })
    }

    this.instanceOf = function (s) {
        return instanceOf(this, s);
    }

    this.query = function (s, t) {
        var p = t || document;
        return p.querySelector(s)
    }

    this.queryAll = function (s, t) {
        var p = t || document;
        return p.querySelectorAll(s);
    }

    this.appendTo = function (node) {
        if (instanceOf(node, "Element"))
            node.appendChild(this.node());
        else {
            var _node = node;
            if (isString(node))
                _node = this.query(node);
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

    this.hasProperty = function (n) {
        return hasProperty(this, n);
    }

    this.text = function (s) {
        if (!isEmpty(s)) {
            if (!isString(s)) {
                throw new TypeError("Value must be String");
                this.node().textContent = s;
            }
        }
        return this.node().textContent;
    }

    this.html = function (s) {
        if (!isEmpty(s)) {
            if (!isString(s)) {
                throw new TypeError("Value must be String");
                this.node().innerHTML = s;
            }
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