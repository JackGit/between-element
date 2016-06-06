(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
        typeof define === 'function' && define.amd ? define(factory) :
            (global.BetweenElements = factory());
}(this, function () {
    'use strict';

    function BetweenElements() {
        this.fromElement = null;
        this.fromBCR = null;
        this.fromStyle = null;

        this.toElement = null;
        this.toBCR = null;
        this.toStyle = null;
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
            cloneElement.style.transition = 'all .3s ease';

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
            //this.toStyle.width = this.toBCR.width + 'px';
            //this.toStyle.height = this.toBCR.height + 'px';
            this.toStyle.transition = 'all .3s ease';
            this.toStyle.margin = this.toStyle.marginLeft = this.toStyle.marginRight = this.toStyle.marginTop = this.toStyle.marginBottom = 0;
           // this.fromElement.style = this.toStyle;

            setTimeout(function() {
                ['top', 'left', 'width', 'height', 'background', 'border', 'borderRadius', 'padding'].forEach(function(name) {
                    this.fromElement.style[name] = this.toStyle[name];
                }, this);
            }.bind(this), 10);

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
            drawBoundingClientRect(el)
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