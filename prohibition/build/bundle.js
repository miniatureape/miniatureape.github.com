
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }
    function set_store_value(store, ret, value) {
        store.set(value);
        return ret;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.44.1' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    function fade(node, { delay = 0, duration = 400, easing = identity } = {}) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }

    function getListenerName() {
        return 'ontouchend' in window ? 'touchstart' : 'click'
    }

    function max(prev, current) {
        return Math.abs(current[0] - current[1]) > prev ? Math.abs(current[0] - current[1]) : prev
    }

    function total(prev, current) {
        return Math.abs(current[0] - current[1]) + prev
    }

    function normalize(seq) {
        if (seq.length == 1) {
            return [.5];
        }
        const min = Math.min(...seq);
        const max = Math.max(...seq) - min;
        return seq.map(ts => (ts - min) / max)
    }

    function finishRecord() {
        this.removeListener();
        this.fire('recordDone', this.knock);
    }

    function finishGuard() {
        this.removeListener();
        this.fire('guardDone', this.knock);
    }

    const Knocker = function(elem, opts = {}) {

        let options = Object.assign({
            defaultTimeout: 1500, // ms
        }, opts);

        let timer;

        let events = {};

        return {

            knock: [],
            maxThreshold: .03,
            totalThreshold: .05,

            setFinisher: function(finisher) {
                this.finisher = finisher;
            },

            start: function() {
                this.knock = [];
                this.handler = this.handleKnock.bind(this);
                elem.addEventListener(getListenerName(), this.handler);
            },

            handleKnock: function(e) {
                this.fire('knock', e);
                this.knock.push(e.timeStamp);
                this.knock.last = e.timeStamp;
                this.fire('knockChanged', this.knock);
                if (timer) {
                    timer = clearTimeout(timer);
                }
                timer = setTimeout(this.finish.bind(this), options.defaultTimeout);
            },

            finish: function() {
                timer = clearTimeout(timer);
                this.finisher();
            },

            removeListener: function() {
                elem.removeEventListener(getListenerName(), this.handler);
            },

            fire: function(name, args) {
                if (events[name]) {
                    events[name].forEach((fn) => fn(args));
                }
            },

            getKnock: function() {
                return this.knock;
            },

            setKnock: function(knock) {
                this.knock = knock;
            },

            listen: function(name, fn) {
                if (!events[name]) {
                    events[name] = [];
                }
                events[name].push(fn);
            },

            test: function(secretKnock) {
                if (this.knock.length != secretKnock.length) {
                    return false
                }

                let nKnock = normalize(this.knock);
                let nSecretKnock = normalize(secretKnock);
                let pairs = nKnock.map((k, i) => [k, nSecretKnock[i]]);

                let maxDiff = pairs.reduce(max, 0);
                let totalDiff = pairs.reduce(total, 0);
                console.log(maxDiff, totalDiff, this.maxThreshold, this.totalThreshold);
                return maxDiff < this.maxThreshold && totalDiff < this.totalThreshold;
            },

            stop: function() {
                this.removeListener();
            },

            reset: function() {
                this.stop();
                this.start();
            }
        }

    };

    const Prohibition = {

        /**
         * Initialized with a dom element, this returns
         * and object that can listen to knocks (`knock` event)
         * and after a short wait will fire a `recordDone` event.
         *
         * It has a method `getKnock` that will return the knock
         * as an array of a normalized timestamps.
         */
        getRecorder: function (elem, opts) {
            let recorder = Knocker(elem, opts);
            recorder.setFinisher(finishRecord.bind(recorder));
            return recorder
        },

        /**
         * Initialized with a dom element, this returns
         * and object that can listen to knocks (`knock` event)
         * and after a short wait will fire a `guardDone` event.
         *
         * It has a test event that can test a knock.
         */
        getGuard: function(elem, opts) {
            let guard = Knocker(elem, opts);
            guard.setFinisher(finishGuard.bind(guard));
            return guard
        },

    };

    const createDOMRenderer = function(mount, opts) {

        const defaults = {
            width: 400,
            height: 50,
            horizontalPadding: 10,
            knockHeight: 10,
            knockWidth: 10,
            bgColor: "#EFEFEF",
            fgColor: "#AFAFAF",
            knockColor: "#9F9F9F",
        };

        let options = Object.assign(defaults, opts);
        let knocks = [];
        let knockEls = [];
        let surface;

        function element(name, attrs) {
            let elem = document.createElement(name);
            for (const [key, value] of Object.entries(attrs)) {
                elem.setAttribute(key, value);
            }
            return elem
        }

        function rebalanceKnocks() {
            let normKnocks = normalize(knocks);
            normKnocks.forEach((k, i) => {
                setTimeout(function() {
                    let left = Math.max(options.horizontalPadding, (k * (options.width - options.horizontalPadding - options.knockWidth))) + "px";
                    knockEls[i].style.left = left;
                    knockEls[i].style.opacity = 1;
                }, 1);
            });
        }

        return {
            drawContainer: function() {
                surface = element('div', {'class': 'prohibition-container'});
                const line = element('div', {'class': 'prohibition-spine'});
                surface.appendChild(line);
                mount.appendChild(surface);
                return surface
            },
            updateKnock: function(knock) {
                console.log('updateKnock', knock);
                let numEls = knockEls.length;
                if (knock.length > numEls) {
                    for (let i = numEls; i < knock.length; i++) {
                        let knockEl = element('div', {
                            'class': 'prohibition-knock',
                        });
                        knockEls.push(knockEl);
                        surface.appendChild(knockEl);
                    }
                } else if (knock.length < numEls) {
                    while(knock.length != knockEls.length) {
                        surface.removeChild(knockEls.pop());
                    }
                }
                knocks = knock;
                rebalanceKnocks();
            },
        }
    };

    /* src/App.svelte generated by Svelte v3.44.1 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let div21;
    	let div0;
    	let h1;
    	let t1;
    	let p0;
    	let t3;
    	let div14;
    	let div13;
    	let div12;
    	let div1;
    	let t4;
    	let div11;
    	let div2;
    	let t5;
    	let div10;
    	let div4;
    	let div3;
    	let t6;
    	let div5;
    	let t7;
    	let div7;
    	let div6;
    	let t8;
    	let div8;
    	let t9;
    	let div9;
    	let div11_class_value;
    	let t10;
    	let span0;
    	let span1;
    	let t13;
    	let div20;
    	let label;
    	let input;
    	let t14;
    	let div15;
    	let t15;
    	let span2;
    	let t17;
    	let div17;
    	let div16;
    	let t18;
    	let div19;
    	let div18;
    	let t19;
    	let p1;
    	let t21;
    	let h20;
    	let t23;
    	let p2;
    	let t25;
    	let p3;
    	let t27;
    	let p4;
    	let t29;
    	let p5;
    	let t31;
    	let h21;
    	let t33;
    	let p6;
    	let t35;
    	let h22;
    	let t37;
    	let p7;
    	let t39;
    	let p8;
    	let t41;
    	let pre0;
    	let span3;
    	let t43;
    	let span4;
    	let t45;
    	let span5;
    	let t47;
    	let span6;
    	let t49;
    	let span7;
    	let t51;
    	let span8;
    	let t53;
    	let span9;
    	let t55;
    	let span10;
    	let t57;
    	let span11;
    	let t59;
    	let t60;
    	let p9;
    	let t61;
    	let span12;
    	let t63;
    	let t64;
    	let pre1;
    	let span13;
    	let t66;
    	let span14;
    	let t68;
    	let span15;
    	let t70;
    	let span16;
    	let t72;
    	let span17;
    	let t74;
    	let t75;
    	let p10;
    	let t76;
    	let span18;
    	let t78;
    	let t79;
    	let pre2;
    	let t80;
    	let span19;
    	let t82;
    	let span21;
    	let span20;
    	let t84;
    	let t85;
    	let span22;
    	let t87;
    	let t88;
    	let p11;
    	let t90;
    	let p12;
    	let t92;
    	let pre3;
    	let t93;
    	let span23;
    	let t95;
    	let span24;
    	let t97;
    	let span25;
    	let t99;
    	let span27;
    	let span26;
    	let t101;
    	let t102;
    	let span28;
    	let t104;
    	let t105;
    	let p13;
    	let t107;
    	let p14;
    	let t108;
    	let span29;
    	let t110;
    	let span30;
    	let t112;
    	let t113;
    	let h23;
    	let t115;
    	let p15;
    	let div21_class_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			main = element("main");
    			div21 = element("div");
    			div0 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Prohibition";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "Secret Knock Authentication";
    			t3 = space();
    			div14 = element("div");
    			div13 = element("div");
    			div12 = element("div");
    			div1 = element("div");
    			t4 = space();
    			div11 = element("div");
    			div2 = element("div");
    			t5 = space();
    			div10 = element("div");
    			div4 = element("div");
    			div3 = element("div");
    			t6 = space();
    			div5 = element("div");
    			t7 = space();
    			div7 = element("div");
    			div6 = element("div");
    			t8 = space();
    			div8 = element("div");
    			t9 = space();
    			div9 = element("div");
    			t10 = space();
    			span0 = element("span");
    			span0.textContent = "Scram!";
    			span1 = element("span");
    			span1.textContent = "Come in.";
    			t13 = space();
    			div20 = element("div");
    			label = element("label");
    			input = element("input");
    			t14 = space();
    			div15 = element("div");
    			t15 = space();
    			span2 = element("span");
    			span2.textContent = "rec";
    			t17 = space();
    			div17 = element("div");
    			div16 = element("div");
    			t18 = space();
    			div19 = element("div");
    			div18 = element("div");
    			t19 = space();
    			p1 = element("p");
    			p1.textContent = "knock on the door to record your own secret knock";
    			t21 = space();
    			h20 = element("h2");
    			h20.textContent = "What is this?";
    			t23 = space();
    			p2 = element("p");
    			p2.textContent = "Prohibition is a javascript library providing \"secret knock\" authentication.";
    			t25 = space();
    			p3 = element("p");
    			p3.textContent = "It allows you to 'record' secret knocks (taps and clicks) and then test knocks against the recording.";
    			t27 = space();
    			p4 = element("p");
    			p4.textContent = "You can supply a callback that is told if knock succeeded or not.";
    			t29 = space();
    			p5 = element("p");
    			p5.textContent = "You can use it wire up a fun—but very insecure—authentication system.";
    			t31 = space();
    			h21 = element("h2");
    			h21.textContent = "Who is this for?";
    			t33 = space();
    			p6 = element("p");
    			p6.textContent = "Me and maybe someone creating a website for a speakeasy? Might be good for hiding easter eggs.";
    			t35 = space();
    			h22 = element("h2");
    			h22.textContent = "How do I use it?";
    			t37 = space();
    			p7 = element("p");
    			p7.textContent = "If you really want to, download and import the codes.";
    			t39 = space();
    			p8 = element("p");
    			p8.textContent = "A secret knock is just an array of timestamps (more on this below).";
    			t41 = space();
    			pre0 = element("pre");
    			span3 = element("span");
    			span3.textContent = "let";
    			t43 = text(" ");
    			span4 = element("span");
    			span4.textContent = "secretKnock";
    			t45 = text(" = [ ");
    			span5 = element("span");
    			span5.textContent = "2452";
    			t47 = text(", ");
    			span6 = element("span");
    			span6.textContent = "2889";
    			t49 = text(", ");
    			span7 = element("span");
    			span7.textContent = "3177";
    			t51 = text(", ");
    			span8 = element("span");
    			span8.textContent = "3346";
    			t53 = text(", ");
    			span9 = element("span");
    			span9.textContent = "3782";
    			t55 = text(", ");
    			span10 = element("span");
    			span10.textContent = "4697";
    			t57 = text(", ");
    			span11 = element("span");
    			span11.textContent = "5163";
    			t59 = text(" ];");
    			t60 = space();
    			p9 = element("p");
    			t61 = text("Make a \"Guard\" by passing a DOM element to ");
    			span12 = element("span");
    			span12.textContent = "getGuard";
    			t63 = text(" and start it.");
    			t64 = space();
    			pre1 = element("pre");
    			span13 = element("span");
    			span13.textContent = "let";
    			t66 = text(" ");
    			span14 = element("span");
    			span14.textContent = "door";
    			t68 = text(" = document.querySelector('");
    			span15 = element("span");
    			span15.textContent = "#door')";
    			t70 = text("\n");
    			span16 = element("span");
    			span16.textContent = "let";
    			t72 = text(" ");
    			span17 = element("span");
    			span17.textContent = "guard";
    			t74 = text(" = Prohibition.getGuard(\nguard.start()");
    			t75 = space();
    			p10 = element("p");
    			t76 = text("This element will now listen to knocks. If enough time passes, a ");
    			span18 = element("span");
    			span18.textContent = "guardDone";
    			t78 = text(" event will fire. Listen to it and perform a test:");
    			t79 = space();
    			pre2 = element("pre");
    			t80 = text("door.listen(");
    			span19 = element("span");
    			span19.textContent = "'guardDone'";
    			t82 = text(", ");
    			span21 = element("span");
    			span20 = element("span");
    			span20.textContent = "()";
    			t84 = text(" =>");
    			t85 = text(" ");
    			span22 = element("span");
    			span22.textContent = "console";
    			t87 = text(".log(guard.test(secretKnock)) }");
    			t88 = space();
    			p11 = element("p");
    			p11.textContent = "The test function will return true if the secretKnock is close to the knock your user has just performed.";
    			t90 = space();
    			p12 = element("p");
    			p12.textContent = "In order to make a secret knock, you can create a recorder. It's almost exactly the same as a Guard:";
    			t92 = space();
    			pre3 = element("pre");
    			t93 = text("let door = ");
    			span23 = element("span");
    			span23.textContent = "document";
    			t95 = text(".querySelector(");
    			span24 = element("span");
    			span24.textContent = "'#door'";
    			t97 = text(")\nlet recorder = Prohibition.getRecorder(door)\nrecorder.listen(");
    			span25 = element("span");
    			span25.textContent = "'recordDone'";
    			t99 = text(", ");
    			span27 = element("span");
    			span26 = element("span");
    			span26.textContent = "(secretKnock)";
    			t101 = text(" =>");
    			t102 = text(" ");
    			span28 = element("span");
    			span28.textContent = "console";
    			t104 = text(".log(secretKnock) }\nrecorder.start()");
    			t105 = space();
    			p13 = element("p");
    			p13.textContent = "You can paste those values right into an array or store them programatically.";
    			t107 = space();
    			p14 = element("p");
    			t108 = text("There are a few other events you can listen to: ");
    			span29 = element("span");
    			span29.textContent = "knock";
    			t110 = text(", ");
    			span30 = element("span");
    			span30.textContent = "knockChanged";
    			t112 = text(".");
    			t113 = space();
    			h23 = element("h2");
    			h23.textContent = "What else?";
    			t115 = space();
    			p15 = element("p");
    			p15.textContent = "The \"testing\" function is very simple. It normalizes all the values and checks how close they are against the reference. Feel free to write your own machine learning powered detector.";
    			attr_dev(h1, "class", "svelte-1u11mpd");
    			add_location(h1, file, 146, 4, 3161);
    			attr_dev(p0, "class", "subhead svelte-1u11mpd");
    			add_location(p0, file, 147, 4, 3186);
    			attr_dev(div0, "class", "wrapper");
    			add_location(div0, file, 145, 2, 3135);
    			attr_dev(div1, "id", "room");
    			attr_dev(div1, "class", "svelte-1u11mpd");
    			add_location(div1, file, 152, 8, 3330);
    			attr_dev(div2, "id", "knob");
    			attr_dev(div2, "class", "svelte-1u11mpd");
    			add_location(div2, file, 154, 10, 3415);
    			attr_dev(div3, "class", "ball svelte-1u11mpd");
    			add_location(div3, file, 157, 14, 3520);
    			attr_dev(div4, "class", "eye left svelte-1u11mpd");
    			add_location(div4, file, 156, 10, 3483);
    			attr_dev(div5, "class", "brow left svelte-1u11mpd");
    			add_location(div5, file, 159, 12, 3576);
    			attr_dev(div6, "class", "ball svelte-1u11mpd");
    			add_location(div6, file, 161, 14, 3656);
    			attr_dev(div7, "class", "eye right svelte-1u11mpd");
    			add_location(div7, file, 160, 12, 3618);
    			attr_dev(div8, "class", "brow right svelte-1u11mpd");
    			add_location(div8, file, 163, 12, 3712);
    			attr_dev(div9, "id", "slat");
    			attr_dev(div9, "class", "checking svelte-1u11mpd");
    			add_location(div9, file, 164, 12, 3755);
    			attr_dev(div10, "id", "slat-container");
    			attr_dev(div10, "class", "svelte-1u11mpd");
    			add_location(div10, file, 155, 10, 3447);
    			attr_dev(div11, "id", "door");
    			attr_dev(div11, "class", div11_class_value = "door-open " + /*knocking*/ ctx[0] + " svelte-1u11mpd");
    			add_location(div11, file, 153, 8, 3360);
    			attr_dev(span0, "class", "speech scram svelte-1u11mpd");
    			add_location(span0, file, 167, 8, 3830);
    			attr_dev(span1, "class", "speech ok svelte-1u11mpd");
    			add_location(span1, file, 167, 48, 3870);
    			attr_dev(div12, "id", "mask");
    			attr_dev(div12, "class", "svelte-1u11mpd");
    			add_location(div12, file, 151, 6, 3306);
    			attr_dev(div13, "class", "wrapper");
    			add_location(div13, file, 150, 4, 3278);
    			attr_dev(div14, "id", "door-container");
    			attr_dev(div14, "class", "svelte-1u11mpd");
    			add_location(div14, file, 149, 2, 3248);
    			attr_dev(input, "class", "toggle-checkbox");
    			attr_dev(input, "type", "checkbox");
    			add_location(input, file, 173, 6, 4000);
    			attr_dev(div15, "class", "toggle-switch");
    			add_location(div15, file, 174, 6, 4080);
    			attr_dev(span2, "class", "toggle-label");
    			add_location(span2, file, 175, 6, 4120);
    			attr_dev(label, "class", "toggle");
    			add_location(label, file, 172, 4, 3971);
    			attr_dev(div16, "id", "recorded-knock");
    			add_location(div16, file, 178, 6, 4214);
    			attr_dev(div17, "id", "visualization-wrapper");
    			attr_dev(div17, "class", "svelte-1u11mpd");
    			add_location(div17, file, 177, 4, 4175);
    			attr_dev(div18, "id", "recording-knock");
    			add_location(div18, file, 181, 6, 4310);
    			attr_dev(p1, "class", "caption svelte-1u11mpd");
    			add_location(p1, file, 182, 6, 4349);
    			attr_dev(div19, "id", "recording-visualization-wrapper");
    			attr_dev(div19, "class", "svelte-1u11mpd");
    			add_location(div19, file, 180, 4, 4261);
    			attr_dev(h20, "class", "svelte-1u11mpd");
    			add_location(h20, file, 184, 4, 4437);
    			add_location(p2, file, 185, 4, 4464);
    			add_location(p3, file, 186, 4, 4552);
    			add_location(p4, file, 187, 4, 4665);
    			add_location(p5, file, 188, 4, 4742);
    			attr_dev(h21, "class", "svelte-1u11mpd");
    			add_location(h21, file, 190, 4, 4836);
    			add_location(p6, file, 191, 4, 4866);
    			attr_dev(h22, "class", "svelte-1u11mpd");
    			add_location(h22, file, 193, 4, 4973);
    			add_location(p7, file, 194, 4, 5003);
    			add_location(p8, file, 195, 4, 5068);
    			attr_dev(span3, "class", "hljs-keyword");
    			set_style(span3, "color", "rgb(203, 120, 50)");
    			add_location(span3, file, 196, 163, 5306);
    			attr_dev(span4, "class", "hljs-attr");
    			add_location(span4, file, 196, 235, 5378);
    			attr_dev(span5, "class", "hljs-number");
    			set_style(span5, "color", "rgb(104, 150, 186)");
    			add_location(span5, file, 196, 282, 5425);
    			attr_dev(span6, "class", "hljs-number");
    			set_style(span6, "color", "rgb(104, 150, 186)");
    			add_location(span6, file, 196, 356, 5499);
    			attr_dev(span7, "class", "hljs-number");
    			set_style(span7, "color", "rgb(104, 150, 186)");
    			add_location(span7, file, 196, 430, 5573);
    			attr_dev(span8, "class", "hljs-number");
    			set_style(span8, "color", "rgb(104, 150, 186)");
    			add_location(span8, file, 196, 504, 5647);
    			attr_dev(span9, "class", "hljs-number");
    			set_style(span9, "color", "rgb(104, 150, 186)");
    			add_location(span9, file, 196, 578, 5721);
    			attr_dev(span10, "class", "hljs-number");
    			set_style(span10, "color", "rgb(104, 150, 186)");
    			add_location(span10, file, 196, 652, 5795);
    			attr_dev(span11, "class", "hljs-number");
    			set_style(span11, "color", "rgb(104, 150, 186)");
    			add_location(span11, file, 196, 726, 5869);
    			attr_dev(pre0, "class", "hljs");
    			set_style(pre0, "display", "block");
    			set_style(pre0, "overflow-x", "auto");
    			set_style(pre0, "padding", "0.5em");
    			set_style(pre0, "background", "rgb(43, 43, 43) none repeat scroll 0% 0%");
    			set_style(pre0, "color", "rgb(186, 186, 186)");
    			add_location(pre0, file, 196, 6, 5149);
    			attr_dev(span12, "class", "code svelte-1u11mpd");
    			add_location(span12, file, 197, 50, 6001);
    			add_location(p9, file, 197, 4, 5955);
    			attr_dev(span13, "class", "hljs-keyword");
    			set_style(span13, "color", "rgb(203, 120, 50)");
    			add_location(span13, file, 198, 161, 6215);
    			attr_dev(span14, "class", "hljs-attr");
    			add_location(span14, file, 198, 233, 6287);
    			attr_dev(span15, "class", "hljs-comment");
    			set_style(span15, "color", "rgb(127, 127, 127)");
    			add_location(span15, file, 198, 295, 6349);
    			attr_dev(span16, "class", "hljs-keyword");
    			set_style(span16, "color", "rgb(203, 120, 50)");
    			add_location(span16, file, 199, 0, 6426);
    			attr_dev(span17, "class", "hljs-attr");
    			add_location(span17, file, 199, 72, 6498);
    			attr_dev(pre1, "class", "hljs");
    			set_style(pre1, "display", "block");
    			set_style(pre1, "overflow-x", "auto");
    			set_style(pre1, "padding", "0.5em");
    			set_style(pre1, "background", "rgb(43, 43, 43) none repeat scroll 0% 0%");
    			set_style(pre1, "color", "rgb(186, 186, 186)");
    			add_location(pre1, file, 198, 4, 6058);
    			attr_dev(span18, "class", "code svelte-1u11mpd");
    			add_location(span18, file, 201, 72, 6651);
    			add_location(p10, file, 201, 4, 6583);
    			attr_dev(span19, "class", "hljs-string");
    			set_style(span19, "color", "rgb(224, 196, 108)");
    			add_location(span19, file, 202, 173, 6914);
    			attr_dev(span20, "class", "hljs-params");
    			set_style(span20, "color", "rgb(185, 185, 185)");
    			add_location(span20, file, 202, 282, 7023);
    			attr_dev(span21, "class", "hljs-function");
    			add_location(span21, file, 202, 254, 6995);
    			attr_dev(span22, "class", "hljs-built_in");
    			set_style(span22, "color", "rgb(224, 196, 108)");
    			add_location(span22, file, 202, 366, 7107);
    			attr_dev(pre2, "class", "hljs");
    			set_style(pre2, "display", "block");
    			set_style(pre2, "overflow-x", "auto");
    			set_style(pre2, "padding", "0.5em");
    			set_style(pre2, "background", "rgb(43, 43, 43) none repeat scroll 0% 0%");
    			set_style(pre2, "color", "rgb(186, 186, 186)");
    			add_location(pre2, file, 202, 4, 6745);
    			add_location(p11, file, 203, 4, 7226);
    			add_location(p12, file, 204, 4, 7343);
    			attr_dev(span23, "class", "hljs-built_in");
    			set_style(span23, "color", "rgb(224, 196, 108)");
    			add_location(span23, file, 205, 172, 7623);
    			attr_dev(span24, "class", "hljs-string");
    			set_style(span24, "color", "rgb(224, 196, 108)");
    			add_location(span24, file, 205, 265, 7716);
    			attr_dev(span25, "class", "hljs-string");
    			set_style(span25, "color", "rgb(224, 196, 108)");
    			add_location(span25, file, 207, 16, 7854);
    			attr_dev(span26, "class", "hljs-params");
    			set_style(span26, "color", "rgb(185, 185, 185)");
    			add_location(span26, file, 207, 126, 7964);
    			attr_dev(span27, "class", "hljs-function");
    			add_location(span27, file, 207, 98, 7936);
    			attr_dev(span28, "class", "hljs-built_in");
    			set_style(span28, "color", "rgb(224, 196, 108)");
    			add_location(span28, file, 207, 221, 8059);
    			attr_dev(pre3, "class", "hljs");
    			set_style(pre3, "display", "block");
    			set_style(pre3, "overflow-x", "auto");
    			set_style(pre3, "padding", "0.5em");
    			set_style(pre3, "background", "rgb(43, 43, 43) none repeat scroll 0% 0%");
    			set_style(pre3, "color", "rgb(186, 186, 186)");
    			add_location(pre3, file, 205, 4, 7455);
    			add_location(p13, file, 209, 4, 8183);
    			attr_dev(span29, "class", "code svelte-1u11mpd");
    			add_location(span29, file, 210, 55, 8323);
    			attr_dev(span30, "class", "code svelte-1u11mpd");
    			add_location(span30, file, 210, 88, 8356);
    			add_location(p14, file, 210, 4, 8272);
    			attr_dev(h23, "class", "svelte-1u11mpd");
    			add_location(h23, file, 211, 4, 8404);
    			add_location(p15, file, 212, 4, 8428);
    			attr_dev(div20, "class", "wrapper");
    			add_location(div20, file, 171, 2, 3945);
    			attr_dev(div21, "class", div21_class_value = "" + (null_to_empty(/*state*/ ctx[1]) + " svelte-1u11mpd"));
    			add_location(div21, file, 144, 0, 3111);
    			add_location(main, file, 143, 0, 3104);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div21);
    			append_dev(div21, div0);
    			append_dev(div0, h1);
    			append_dev(div0, t1);
    			append_dev(div0, p0);
    			append_dev(div21, t3);
    			append_dev(div21, div14);
    			append_dev(div14, div13);
    			append_dev(div13, div12);
    			append_dev(div12, div1);
    			append_dev(div12, t4);
    			append_dev(div12, div11);
    			append_dev(div11, div2);
    			append_dev(div11, t5);
    			append_dev(div11, div10);
    			append_dev(div10, div4);
    			append_dev(div4, div3);
    			append_dev(div10, t6);
    			append_dev(div10, div5);
    			append_dev(div10, t7);
    			append_dev(div10, div7);
    			append_dev(div7, div6);
    			append_dev(div10, t8);
    			append_dev(div10, div8);
    			append_dev(div10, t9);
    			append_dev(div10, div9);
    			append_dev(div12, t10);
    			append_dev(div12, span0);
    			append_dev(div12, span1);
    			append_dev(div21, t13);
    			append_dev(div21, div20);
    			append_dev(div20, label);
    			append_dev(label, input);
    			input.checked = /*$recording*/ ctx[2];
    			append_dev(label, t14);
    			append_dev(label, div15);
    			append_dev(label, t15);
    			append_dev(label, span2);
    			append_dev(div20, t17);
    			append_dev(div20, div17);
    			append_dev(div17, div16);
    			append_dev(div20, t18);
    			append_dev(div20, div19);
    			append_dev(div19, div18);
    			append_dev(div19, t19);
    			append_dev(div19, p1);
    			append_dev(div20, t21);
    			append_dev(div20, h20);
    			append_dev(div20, t23);
    			append_dev(div20, p2);
    			append_dev(div20, t25);
    			append_dev(div20, p3);
    			append_dev(div20, t27);
    			append_dev(div20, p4);
    			append_dev(div20, t29);
    			append_dev(div20, p5);
    			append_dev(div20, t31);
    			append_dev(div20, h21);
    			append_dev(div20, t33);
    			append_dev(div20, p6);
    			append_dev(div20, t35);
    			append_dev(div20, h22);
    			append_dev(div20, t37);
    			append_dev(div20, p7);
    			append_dev(div20, t39);
    			append_dev(div20, p8);
    			append_dev(div20, t41);
    			append_dev(div20, pre0);
    			append_dev(pre0, span3);
    			append_dev(pre0, t43);
    			append_dev(pre0, span4);
    			append_dev(pre0, t45);
    			append_dev(pre0, span5);
    			append_dev(pre0, t47);
    			append_dev(pre0, span6);
    			append_dev(pre0, t49);
    			append_dev(pre0, span7);
    			append_dev(pre0, t51);
    			append_dev(pre0, span8);
    			append_dev(pre0, t53);
    			append_dev(pre0, span9);
    			append_dev(pre0, t55);
    			append_dev(pre0, span10);
    			append_dev(pre0, t57);
    			append_dev(pre0, span11);
    			append_dev(pre0, t59);
    			append_dev(div20, t60);
    			append_dev(div20, p9);
    			append_dev(p9, t61);
    			append_dev(p9, span12);
    			append_dev(p9, t63);
    			append_dev(div20, t64);
    			append_dev(div20, pre1);
    			append_dev(pre1, span13);
    			append_dev(pre1, t66);
    			append_dev(pre1, span14);
    			append_dev(pre1, t68);
    			append_dev(pre1, span15);
    			append_dev(pre1, t70);
    			append_dev(pre1, span16);
    			append_dev(pre1, t72);
    			append_dev(pre1, span17);
    			append_dev(pre1, t74);
    			append_dev(div20, t75);
    			append_dev(div20, p10);
    			append_dev(p10, t76);
    			append_dev(p10, span18);
    			append_dev(p10, t78);
    			append_dev(div20, t79);
    			append_dev(div20, pre2);
    			append_dev(pre2, t80);
    			append_dev(pre2, span19);
    			append_dev(pre2, t82);
    			append_dev(pre2, span21);
    			append_dev(span21, span20);
    			append_dev(span21, t84);
    			append_dev(pre2, t85);
    			append_dev(pre2, span22);
    			append_dev(pre2, t87);
    			append_dev(div20, t88);
    			append_dev(div20, p11);
    			append_dev(div20, t90);
    			append_dev(div20, p12);
    			append_dev(div20, t92);
    			append_dev(div20, pre3);
    			append_dev(pre3, t93);
    			append_dev(pre3, span23);
    			append_dev(pre3, t95);
    			append_dev(pre3, span24);
    			append_dev(pre3, t97);
    			append_dev(pre3, span25);
    			append_dev(pre3, t99);
    			append_dev(pre3, span27);
    			append_dev(span27, span26);
    			append_dev(span27, t101);
    			append_dev(pre3, t102);
    			append_dev(pre3, span28);
    			append_dev(pre3, t104);
    			append_dev(div20, t105);
    			append_dev(div20, p13);
    			append_dev(div20, t107);
    			append_dev(div20, p14);
    			append_dev(p14, t108);
    			append_dev(p14, span29);
    			append_dev(p14, t110);
    			append_dev(p14, span30);
    			append_dev(p14, t112);
    			append_dev(div20, t113);
    			append_dev(div20, h23);
    			append_dev(div20, t115);
    			append_dev(div20, p15);

    			if (!mounted) {
    				dispose = listen_dev(input, "change", /*input_change_handler*/ ctx[4]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*knocking*/ 1 && div11_class_value !== (div11_class_value = "door-open " + /*knocking*/ ctx[0] + " svelte-1u11mpd")) {
    				attr_dev(div11, "class", div11_class_value);
    			}

    			if (dirty & /*$recording*/ 4) {
    				input.checked = /*$recording*/ ctx[2];
    			}

    			if (dirty & /*state*/ 2 && div21_class_value !== (div21_class_value = "" + (null_to_empty(/*state*/ ctx[1]) + " svelte-1u11mpd"))) {
    				attr_dev(div21, "class", div21_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function handleState(state, evt) {
    	let states = {
    		scanning: {
    			events: { knock: 'waiting', recording: 'recording' }
    		},
    		waiting: {
    			events: { success: 'accepted', failure: 'rejected' }
    		},
    		rejected: {
    			events: {
    				wait: 'scanning',
    				'recording': 'recording'
    			}
    		},
    		recording: {
    			events: {
    				'recording-cancel': 'scanning',
    				'recording-finish': 'scanning'
    			}
    		},
    		accepted: { events: { 'recording': 'recording' } }
    	};

    	if (evt in states[state].events) {
    		return states[state].events[evt];
    	}

    	return state;
    }

    function getDownEvent() {
    	return 'ontouchstart' in window ? 'touchstart' : 'mousedown';
    }

    function getUpEvent() {
    	return 'ontouchend' in window ? 'touchend' : 'mouseup';
    }

    function instance($$self, $$props, $$invalidate) {
    	let $recording;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let door;
    	let guard;
    	let recorder;
    	let renderer;
    	let recordingRenderer;
    	let knocking = "";
    	let state = "scanning";
    	let secretKnock = [2452, 2889, 3177, 3346, 3782, 4697, 5163];
    	let recording = writable(false);
    	validate_store(recording, 'recording');
    	component_subscribe($$self, recording, value => $$invalidate(2, $recording = value));

    	onMount(() => {
    		initialize();
    	});

    	recording.subscribe(() => {
    		$$invalidate(1, state = handleState(state, $recording ? 'recording' : 'recording-cancel'));

    		if ($recording) {
    			guard.stop();
    			recorder.start();
    		} else {
    			if (guard && recorder) {
    				guard.start();
    				recorder.stop();
    			}
    		}
    	});

    	function handleKnockStart(e) {
    		e.preventDefault();

    		if (['scanning', 'waiting'].includes(state)) {
    			$$invalidate(0, knocking = 'knocking');
    		}
    	}

    	function handleKnockEnd(e) {
    		e.preventDefault();

    		if (['scanning', 'waiting'].includes(state)) {
    			$$invalidate(0, knocking = '');
    		}
    	}

    	function initialize() {
    		renderer = createDOMRenderer(document.getElementById('recorded-knock'));
    		renderer.drawContainer();
    		renderer.updateKnock(secretKnock);
    		recordingRenderer = createDOMRenderer(document.getElementById('recording-knock'));
    		recordingRenderer.drawContainer();
    		door = document.querySelector('#door');
    		guard = Prohibition.getGuard(door);
    		recorder = Prohibition.getRecorder(door);

    		guard.listen('knock', function () {
    			$$invalidate(1, state = handleState(state, 'knock'));
    		});

    		guard.listen('guardDone', function () {
    			door.addEventListener('animationend', () => {
    				$$invalidate(1, state = handleState(state, 'wait'));
    			});

    			let evt = '';

    			if (guard.test(secretKnock)) {
    				evt = 'success';
    			} else {
    				evt = 'failure';
    			}

    			guard.reset();
    			$$invalidate(1, state = handleState(state, evt));
    		});

    		guard.start();

    		recorder.listen('recordDone', function () {
    			secretKnock = recorder.knock;
    			renderer.updateKnock(recorder.knock);
    			recordingRenderer.updateKnock([]);
    			set_store_value(recording, $recording = false, $recording);
    		});

    		recorder.listen('knockChanged', function (newKnock) {
    			recordingRenderer.updateKnock(newKnock);
    		});

    		// setup "knock" feedback outside of prohibition
    		door.addEventListener(getDownEvent(), handleKnockStart);

    		door.addEventListener(getUpEvent(), handleKnockEnd);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function input_change_handler() {
    		$recording = this.checked;
    		recording.set($recording);
    	}

    	$$self.$capture_state = () => ({
    		onMount,
    		writable,
    		fade,
    		Prohibition,
    		createDOMRenderer,
    		door,
    		guard,
    		recorder,
    		renderer,
    		recordingRenderer,
    		knocking,
    		state,
    		secretKnock,
    		recording,
    		handleState,
    		getDownEvent,
    		getUpEvent,
    		handleKnockStart,
    		handleKnockEnd,
    		initialize,
    		$recording
    	});

    	$$self.$inject_state = $$props => {
    		if ('door' in $$props) door = $$props.door;
    		if ('guard' in $$props) guard = $$props.guard;
    		if ('recorder' in $$props) recorder = $$props.recorder;
    		if ('renderer' in $$props) renderer = $$props.renderer;
    		if ('recordingRenderer' in $$props) recordingRenderer = $$props.recordingRenderer;
    		if ('knocking' in $$props) $$invalidate(0, knocking = $$props.knocking);
    		if ('state' in $$props) $$invalidate(1, state = $$props.state);
    		if ('secretKnock' in $$props) secretKnock = $$props.secretKnock;
    		if ('recording' in $$props) $$invalidate(3, recording = $$props.recording);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [knocking, state, $recording, recording, input_change_handler];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
