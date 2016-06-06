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

    function BetweenElements() {
        this.fromElement = null;
        this.fromBCR = null;
        this.fromStyle = null;

        this.toElement = null;
        this.toBCR = null;
        this.toStyle = null;

        this.transitionEnd = false;
    }


    BetweenElements.prototype = {

        constructor: BetweenElements,

        _clone: function() {
            var cloneElement;

            // if there is only a text node child, then do deep clone
            if(this.fromElement.childNodes.length === 1 && this.fromElement.childNodes[0].nodeType === 3)
                cloneElement = this.fromElement.cloneNode(true);
            else
                cloneElement = this.fromElement.cloneNode();

            // position the cloned element
            cloneElement.style.position = 'fixed';
            cloneElement.style.top = this.fromBCR.top + 'px';
            cloneElement.style.left = this.fromBCR.left + 'px';
            //cloneElement.style.width = this.fromBCR.width + 'px';
            //cloneElement.style.height = this.fromBCR.height + 'px';
            cloneElement.style.transition = 'all 3s ease';

            // need to set margin as 0, coz getBoundingClientRect doesn't contain margin
            cloneElement.style.margin = '0';

            // remove the origin from element
            // this.fromElement.parentElement.removeChild(this.fromElement); // remove will coz reflow of element in the same page
            this.fromElement.style.opacity = 0;

            // set new from element
            this.fromElement = cloneElement;
            document.body.appendChild(cloneElement);
        },

        _transition: function() {
            this.toStyle.position = 'fixed';
            this.toStyle.top = this.toBCR.top + 'px';
            this.toStyle.left = this.toBCR.left + 'px';
            this.toStyle.transition = 'all 3s ease';
            this.toStyle.margin
                = this.toStyle.marginLeft
                = this.toStyle.marginRight
                = this.toStyle.marginTop
                = this.toStyle.marginBottom
                = 0;

            var _end = function() {
                if(this.transitionEnd) {
                    this.fromElement.removeEventListener('transitionend', _end);
                    return;
                }

                console.log('transition end');
                this.transitionEnd = true;
                this.fromElement.remove();
            }.bind(this);

            this.fromElement.addEventListener('transitionend', _end);
            this.transitionEnd = false;

            requestAnimationFrame(function() {
                var style = getComputedStyle(this.fromElement);

                TRANSITION_PROPERTIES.forEach(function(name) {
                    if(style[name] != this.toStyle[name])
                        this.fromElement.style[name] = this.toStyle[name];
                }, this);
            }.bind(this));

        },

        start: function() {
            if(!this.fromElement || !this.toElement) {
                console.error('[BetweenElement] please set from and to element');
                return;
            }

            this._clone();
            // this.toElement.style.opacity = 0;
            this._transition();
        },

        stop: function() {

        },

        cancel: function() {
            this.fromElement.remove();
        },

        rollback: function() {

        },

        from: function(el) {
            this.fromElement = el;
            this.fromBCR = el.getBoundingClientRect();
            this.fromStyle = Object.assign({}, getComputedStyle(el));
            return this;
        },

        to: function(el) {
            this.toElement = el;
            this.toBCR = el.getBoundingClientRect();
            this.toStyle = Object.assign({}, getComputedStyle(el));
            return this;
        }
    };

    function clone(e) {
        var cloneElement;

        // if there is only a text node child, then do deep clone
        if(e.childNodes.length === 1 && e.childNodes[0].nodeType === 3)
            cloneElement = e.cloneNode(true);
        else
            cloneElement = e.cloneNode();

        // need to set margin as 0, coz getBoundingClientRect doesn't contain margin
        cloneElement.style.margin = '0';

        return cloneElement;
    }

    function drawBoundingClientRect(e) {
        var rect = e.getBoundingClientRect();
        var overlay = document.createElement('div');

        overlay.style.position = 'fixed';
        overlay.style.top = rect.top + 'px';
        overlay.style.left = rect.left + 'px';
        overlay.style.width = rect.width + 'px';
        overlay.style.height = rect.height + 'px';
        overlay.style.backgroundColor = 'black';
        overlay.style.opacity = 0.4;

        document.body.appendChild(overlay);

    }

    return BetweenElements;
}));