/**
 * restrictions:
 *  1. addClass/removeClass only applies for siblings elements
 *  2. and z-index needs to be handle by yourself
 *
 * best cross page transition is make less overlap of below three:
 *  1. outgoing animation
 *  2. shared element transition
 *  3. incoming animation
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
        typeof define === 'function' && define.amd ? define(factory) :
            (global.BetweenElements = factory());
}(this, function () {
    'use strict';

    var TRANSITION_PROPERTIES = [
        'background', 'border', 'borderRadius', 'boxShadow', 'boxSizing', 'clip', 'color', 'opacity',
        'font', 'letterSpacing', 'lineHeight', 'textAlign', 'textAnchor', 'textShadow', 'textIndent', 'textDecoration', 'textOverflow', 'textRendering',
        'top', 'left', 'right', 'bottom',
        'height', 'width',
        //'maxHeight', 'maxWidth', 'minHeight', 'minWidth',
        //'margin',
        'padding',
        //'zIndex',
        'overflow',
        //'perspective', 'perspectiveOrigin',
        //'transform', 'transformOrigin' // translate will be handled by BCR, but scale/skew/rotate can't be handled
    ];

    function BetweenElements(el, options) {
        var defaultOptions = {
            easing: 'ease',
            duration: 300,   // ms
            overrideIncomingOpacity: true
        };

        this.options = Object.assign(defaultOptions, options);

        this.el = el;
        this.clonedElement = null;
        this.currentCommand = null;
        this.queue = []; // {type: '', element: el, className: '', BRC: '', style: '', options: {}}
        this.firstState = null;
        this.lastState = null;

        this.status = ''; // '' -> 'transitioning' -> 'end'
        this.transitionEndHandler = this._end.bind(this);
        this.eventHandlers = {};
    }

    BetweenElements.prototype = {

        constructor: BetweenElements,

        _transitionValue: function(duration, easing) {
            return 'all ' + duration + 'ms ' + easing;
        },

        _clone: function() {
            var element = this.el;
            var actionType = this.currentCommand.type;
            var options = this.currentCommand.options;
            var BCR = this.firstState.BCR;

            // if there is only a text node child, then do deep clone
            if(element.childNodes.length === 1 && element.childNodes[0].nodeType === 3)
                this.clonedElement = element.cloneNode(true);
            else
                this.clonedElement = element.cloneNode();

            // position the cloned element
            this.clonedElement.style.position = 'fixed';
            this.clonedElement.style.top = BCR.top + 'px';
            this.clonedElement.style.left = BCR.left + 'px';
            this.clonedElement.style.transition = this._transitionValue(options.duration, options.easing);

            // need to set margin as 0, coz getBoundingClientRect doesn't contain margin
            this.clonedElement.style.margin = '0';

            // remove the origin from element
            if(['addClass', 'removeClass', 'moveToElement'].indexOf(actionType) !== -1) {
                element.style.transition = 'none';
                element.style.opacity = 0;
                element.style.pointerEvents = 'none';
            }

            document.body.appendChild(this.clonedElement);
        },

        _transition: function() {
            var that = this;
            var toStyle = this.lastState.style;
            var toBCR = this.lastState.BCR;

            toStyle.position = 'fixed';
            toStyle.top = toBCR.top + 'px';
            toStyle.left = toBCR.left + 'px';
            toStyle.margin
                = toStyle.marginLeft
                = toStyle.marginRight
                = toStyle.marginTop
                = toStyle.marginBottom
                = 0;

            this.clonedElement.addEventListener('transitionend', this.transitionEndHandler);

            requestAnimationFrame(function() {
                var style = getComputedStyle(that.clonedElement);

                TRANSITION_PROPERTIES.forEach(function(name) {
                    if(style[name] != toStyle[name])
                        that.clonedElement.style[name] = toStyle[name];
                });
            });
        },

        _end: function() {
            if(this.status === 'end') {
                this.clonedElement.removeEventListener('transitionend', this.transitionEndHandler);
                this.clonedElement = null;
                this._trigger('done');

                // consume next toElement from the array
                if(this.queue.length > 0)
                    requestAnimationFrame(this._execute.bind(this));
                else
                    this._trigger('allDone');

                return;
            }

            var element = this.currentCommand.el;
            var oldStyle = this.firstState.style;

            element.style.opacity = oldStyle.opacity;
            element.style.pointerEvents = oldStyle.pointerEvents;

            // add or remove class for class operations
            // and set transition as none before it
            // and set transition back after it
            element.style.transition = 'none';
            if(this.currentCommand.type === 'addClass')
                element.classList.add(this.currentCommand.className);
            else if(this.currentCommand.type === 'removeClass')
                element.classList.remove(this.currentCommand.className);
            element.style.transition = oldStyle.transition;

            if(['copyToElement', 'moveToElement'].indexOf(this.currentCommand.type) !== -1)
                this.el = this.currentCommand.el;

            this.clonedElement.remove();
            this.firstState = null;
            this.lastState = null;
            this.currentCommand = null;
            this.status = 'end';
        },

        _trigger: function(event) {
            (this.eventHandlers[event] || []).forEach(function(callback) {
                if(typeof callback === 'function')
                    callback();
            });
        },

        _transit: function() {
            this.status = 'transitioning';
            this._clone();
            this._transition();
        },

        _execute: function() {
            if(this.queue.length === 0)
                return;

            this.currentCommand = this.queue.shift();

            switch(this.currentCommand.type) {
                case 'addClass':
                    this._execAddClass();
                    break;
                case 'removeClass':
                    this._execRemoveClass();
                    break;
                case 'moveToElement':
                case 'copyToElement':
                    this._execToElement();
                    break;
                default:
                    break;
            }
        },

        _styleSnapshot: function(el) {
            return Object.assign({}, getComputedStyle(el));
        },

        _execAddClass: function() {
            var el = this.currentCommand.el;
            var className = this.currentCommand.className;

            if(el.classList.contains(className))
                return;

            // assign first state
            this.firstState = {
                BCR: el.getBoundingClientRect(),
                style: this._styleSnapshot(el)
            };

            // add class and assign last state
            el.classList.add(className);

            this.lastState = {
                BCR: el.getBoundingClientRect(),
                style: this._styleSnapshot(el)
            };

            el.classList.remove(className);
            this._transit();
        },

        _execRemoveClass: function() {
            var el = this.currentCommand.el;
            var className = this.currentCommand.className;

            if(!el.classList.contains(className))
                return;

            // assign first state
            this.firstState = {
                BCR: el.getBoundingClientRect(),
                style: this._styleSnapshot(el)
            };

            // add class and assign last state
            el.classList.remove(className);

            this.lastState = {
                BCR: el.getBoundingClientRect(),
                style: this._styleSnapshot(el)
            };

            el.classList.add(className);
            this._transit();
        },

        _execToElement: function() {
            var fromEl = this.el;
            var toEl = this.currentCommand.el;
            var newStyle;

            if(fromEl === toEl)
                return;

            this.firstState = {
                BCR: fromEl.getBoundingClientRect(),
                style: this._styleSnapshot(fromEl)
            };

            newStyle = this._styleSnapshot(toEl);

            if(this.options.overrideIncomingOpacity) {
                newStyle.opacity = 1; // override incoming opacity as always 1
                toEl.style.opacity = 0;
            }


            this.lastState = {
                BCR: toEl.getBoundingClientRect(),
                style: newStyle
            };

            this._transit();
        },

        copyToElement: function(el, options) {
            var command = {
                type: 'copyToElement',
                el: el,
                options: Object.assign({}, this.options, options)
            };

            this.queue.push(command);
            if(this.queue.length === 1 && this.status !== 'transitioning')
                this._execute();

            return this;
        },

        moveToElement: function(el, options) {
            var command = {
                type: 'moveToElement',
                el: el,
                options: Object.assign({}, this.options, options)
            };

            this.queue.push(command);
            if(this.queue.length === 1 && this.status !== 'transitioning')
                this._execute();

            return this;
        },

        addClass: function(className, options) {
            var command = {
                type: 'addClass',
                el: this.el,
                className: className,
                options: Object.assign({}, this.options, options)
            };

            this.queue.push(command);
            if(this.queue.length === 1 && this.status !== 'transitioning')
                this._execute();

            return this;
        },

        removeClass: function(className, options) {
            var command = {
                type: 'removeClass',
                el: this.el,
                className: className,
                options: Object.assign({}, this.options, options)
            };

            this.queue.push(command);
            if(this.queue.length === 1 && this.status !== 'transitioning')
                this._execute();

            return this;
        },

        on: function(event, callback) {
            if(!this.eventHandlers[event])
                this.eventHandlers[event] = [];

            this.eventHandlers[event].push(callback);
            return this;
        }
    };


    return BetweenElements;
}));
