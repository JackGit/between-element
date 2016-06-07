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

    function BetweenElements(options) {
        var defaultOptions = {
            easing: 'ease',
            duration: 300,   // ms
            removeFromElement: false
        };

        this.options = Object.assign(defaultOptions, options);

        this.fromElement = null;
        this.fromStyle = null;
        this.fromBCR = null;
        this.clonedElement = null;
        this.toElements = []; // {el, BRC, style}

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
            var toElement = this.toElements[0];

            // if there is only a text node child, then do deep clone
            if(this.fromElement.childNodes.length === 1 && this.fromElement.childNodes[0].nodeType === 3)
                this.clonedElement = this.fromElement.cloneNode(true);
            else
                this.clonedElement = this.fromElement.cloneNode();

            // position the cloned element
            this.clonedElement.style.position = 'fixed';
            this.clonedElement.style.top = this.fromBCR.top + 'px';
            this.clonedElement.style.left = this.fromBCR.left + 'px';
            this.clonedElement.style.transition = this._transitionValue(toElement.options.duration, toElement.options.easing);

            // need to set margin as 0, coz getBoundingClientRect doesn't contain margin
            this.clonedElement.style.margin = '0';

            // remove the origin from element
            if(toElement.options.removeFromElement || toElement.className) {
                this.fromElement.style.transition = 'none';
                this.fromElement.style.opacity = 0;
                this.fromElement.style.pointerEvents = 'none';
            }

            document.body.appendChild(this.clonedElement);
        },

        _transition: function() {
            var that = this;
            var toStyle = this.toElements[0].style;
            var toBCR = this.toElements[0].BCR;

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
                this._trigger('complete');

                // consume next toElement from the array
                if(this.toElements.length > 0)
                    requestAnimationFrame(this._start.bind(this));
                else
                    this._trigger('allComplete');

                return;
            }

            var from = this.toElements.shift();

            this.status = 'end';
            this.fromElement = from.el;
            this.fromBCR = from.BCR;
            this.fromStyle = from.style;
            this.clonedElement.remove();

            if(from.className) {
                from.removeClass ?
                    this.fromElement.classList.remove(from.className) :
                    this.fromElement.classList.add(from.className);

                this.fromElement.style.transition = this.fromStyle.transition;
                this.fromElement.style.opacity = this.fromStyle.opacity;
                this.fromElement.style.pointerEvents = this.fromStyle.pointerEvents;
            }
        },

        _trigger: function(event) {
            (this.eventHandlers[event] || []).forEach(function(callback) {
                if(typeof callback === 'function')
                    callback();
            });
        },

        _start: function() {
            if(!this.fromElement || this.toElements.length === 0) {
                console.error('[BetweenElement] please set from and to element');
                return;
            }

            this.status = 'transitioning';
            this._clone();
            this._transition();
        },

        from: function(el) {
            this.fromElement = el;
            this.fromBCR = el.getBoundingClientRect();
            this.fromStyle = Object.assign({}, getComputedStyle(this.fromElement));
            return this;
        },

        to: function(el, options) {
            if(this.fromElement === el)
                return;

            var style;

            options = Object.assign({}, this.options, options);

            // el is another element
            style = Object.assign({}, getComputedStyle(el));
            this.toElements.push({
                el: el,
                BCR: el.getBoundingClientRect(),
                style: style,
                options: options
            });

            if(this.status !== 'transitioning')
                this._start();

            return this;
        },

        addClass: function(className, options) {
            if(this.fromElement.classList.contains(className))
                return;

            var style;

            options = Object.assign({}, this.options, options);
            this.fromElement.classList.add(className);

            style = Object.assign({}, getComputedStyle(this.fromElement));
            style.opacity = this.fromStyle.opacity;
            style.transition = this.fromStyle.transition;
            style.pointerEvents = this.fromStyle.pointerEvents;

            this.toElements.push({
                el: this.fromElement,
                className: className,
                removeClass: false,
                BCR: this.fromElement.getBoundingClientRect(),
                style: style,
                options: options
            });

            this.fromElement.classList.remove(className);

            if(this.status !== 'transitioning')
                this._start();

            return this;
        },

        removeClass: function(className, options) {
            if(!this.fromElement.classList.contains(className))
                return;

            var style;

            options = Object.assign({}, this.options, options);
            this.fromElement.classList.remove(className);

            style = Object.assign({}, getComputedStyle(this.fromElement));
            style.opacity = this.fromStyle.opacity;
            style.transition = this.fromStyle.transition;
            style.pointerEvents = this.fromStyle.pointerEvents;

            this.toElements.push({
                el: this.fromElement,
                className: className,
                removeClass: true,
                BCR: this.fromElement.getBoundingClientRect(),
                style: style,
                options: options
            });

            this.fromElement.classList.add(className);

            if(this.status !== 'transitioning')
                this._start();

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
