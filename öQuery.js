/*

© 2018 lhli.net.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

https://opensource.org/licenses/MIT

*/

class Ö extends Array { // Instantiated by calls to ö(selector) factory, should not be used directly.
  constructor(...nodes) {
		super(...nodes);
		this.q = [];
  }
	
	//
	// queue management
	//
	
	// All methods that return 'this' or a queued method are queueable. 
	// The queue is local to Ö instance, use await ö.wait, ö.waitFor etc for global async.
	// Arbitrary methods can be queued by passing them to queue().
	// Sync methods are called immediately, but queueing can be forced by first calling startQueue(), delaying execution to next tick.
	// thx https://stackoverflow.com/questions/14365318/delay-to-next-function-in-method-chain
	
	queue(f) {
		if (typeof f === 'function') {
			this.q.length ? this.q.push(f) : f(this);
		}
		return this;
	}
	
	startQueue(t) { return this.wait(t) }
	
	stopQueue() { // Rejects waitForQueue.
		if (this.q.aWF) this.q.aWF.el.removeEventListener(this.q.aWF.e, this.q.aWF.cb);
		if (this.q.stopQ) this.q.stopQ('Queue stopped.')
		this.q = [];
		return this;
	}
	
	// pause / resume. this.q.aWF = { el: element, e: event, cb: resolve }
	pause(){ 
		if (this.q.aWF) this.q.aWF.el.removeEventListener(this.q.aWF.e, this.q.aWF.cb); // check for active waitFor listener
		this.q.paused = true;
		return this;
	}
	
	unpause(){
		if (this.q.paused && this.q.unpause) this.q.unpause();
		if (this.q.aWF) this.q.aWF.el.addEventListener(this.q.aWF.e, this.q.aWF.cb, { once: true })
		delete this.q.paused;
		return this;
	}
	
	loop(n = 0, reverse = false) { // loops entire queue, also subsequent calls. Loops back and forth if reverse = true. Loops n times, or infinitely if !n>0
		if (!this.q.isRunning) this.startQueue();
		this.q.loop = n > 0 ? n : Infinity; 
		this.q.reverseQ = reverse ? true : false;
		return this;
	}
	
	// "private"
	async _runQueue() {
		if (this.q.length === 1){ // only if first in queue
			let self = this, c, loopC = 0;
			this.q.isRunning = new Promise( async function(resolve, reject){ // returned by waitForQueue()
				self.q.stopQ = reject;
				self.q.loop = self.q.loop ? self.q.loop : 1;
				while (self.q.loop > loopC++){
					c = 0;
					while (self.q.length > c) {
						if(self.q.paused) await new Promise( resolve => self.q.unpause = resolve );
						await self.q[c++](self) // run queue
					}
					if (self.q.reverseQ) {
						c-=2; // skip last item, first and last in queue only run once per loop
						while (c > 0) { // skip first item
							if(self.q.paused) await new Promise( resolve => self.q.unpause = resolve );
							await self.q[c--](self) // run queue in reverse
						}
					}
				} 
				if (self.q.reverseQ) await self.q[0](self) // if reverse, finish with first item
				
				self.q = []; // reset q
				resolve('Queue finished.');
			}).catch((e) => ö.log(ö.message(e), this)); // 
		}
	}
	
	//
	// async
	//
	
	//thenable/awaitable
	
	// resolved by _runQueue(), rejected by stopQueue().
	waitForQueue() { return this.q.isRunning ? this.q.isRunning : Promise.resolve('Queue not running.') }
	
	//chainable, returns this (async versions are found in ö)
	
	wait(t = 1) { 
		this.q.push( async function() { 
			await new Promise(resolve => setTimeout(resolve, t)) 
		});
		this._runQueue();
		return this;
	}
	
	waitFor(selector, event) { 
		const self = this;
		this.q.push( async function() { 
			await new Promise(resolve => {
				let element = ö(selector)[0];
				self.q.aWF = { el: element, e: event, cb: resolve } // save listener in q for de/reactivation
				element.addEventListener(event, resolve, { once: true })
			})
		});
		this._runQueue();
		return this;
	}
		
	waitFrames(t) {
		this.q.push( async function() { 
			await ö.waitFrames(t) 
		});
		this._runQueue();
		return this;
	}
	
	load(url, f) { // optional callback
		const self = this;
		this.q.push( async function() { 
			try {
				let response = await fetch(url), html = await response.text(); // too easy!
				self.html( html );
				if (typeof f === 'function') 
					for (let [index, element] of self.entries())
						await f.call(self, html, index, element)
			} catch (e) { ö.log(ö.message(e)) }
		});
		this._runQueue();
		return this;
	}
	
	// delayed async callback, pauses running queue and awaits callback.
	delay(f, t = 1, removePrev = false) {
		const self = this;
		return this.queue(() => {
			if (removePrev && this.q.aD !== undefined) clearTimeout(this.q.aD);
			this.q.aD = setTimeout(async function(){ // save and remove prev
				self.pause();
				await f();
				self.unpause();
			}, t)
		}) 
	}
	
	//
	// sync
	//
	
	// events
	// event can take space-separated string ('load ready'), or object with { event: callback }
	// todo: once is weird, triggers per event type with multiple events and other stuff. Fix.
	on(event = {}, f, off = false, trigger = false, once = false, oncePerElement = false) {
		const events = typeof event === 'object' ? event : (o => {
						for (let e of event.split(' '))
							o[e] = f;
						return o;
					})({}), // if string, convert to object
					removeAll = e => { // set as callback if !oncePerElement
						for (let element of elements)
							this._removeEvent(element[0], element[1], removeAll)
						events[e.type](e); // call callback
						elements = [];
					}
		let elements = [];
		this._cache();
		return this.queue(() => {
			if (once) elements = [];
			for (let element of this) {
				if (off && !Object.keys(events).length) this._removeEvent(element) // remove all
				else {
					for (let event in events) {
						if (off) this._removeEvent(element, event, events[event]); // remove specified
						else if (trigger) element.dispatchEvent(new Event(event)); // todo: handle custom events with detail prop.
						else if (once) {
							if (!oncePerElement) elements.push([element, event]);
							this._addEvent(element, event, (oncePerElement ? events[event] : removeAll), true);
						}
						else this._addEvent(element, event, events[event]);
					}		
				}
			}
		});
	}
	
	_addEvent(element, event, f, once = false) {
		ö.data(element, 'ö_cache').events.add([event, f]);
		element.addEventListener(event, f, { once: once });
	}
	
	_removeEvent(element, event, f) {
		let cache = ö.data(element, 'ö_cache').events;
		if (event === undefined) { // clear all events
			for (let e of cache) 
				element.removeEventListener(...e);				
			cache.clear(0);
		} else if (f === undefined) { // clear events of type
			for (let e of cache) 
				if (e[0] === event) {
					element.removeEventListener(...e);
					cache.delete(e);
				}
		} else { // clear single event
			for (let e of cache) 
				if (e[0] === event && e[1] === f) {
					element.removeEventListener(...e);
					cache.delete(e);
				}
		}
 	}
	
	off(event, f) { return this.on(event, f, true) }
	
	trigger(event) { return this.on(event, null, false, true) }
	
	once(event, f, oncePerElement) { return this.on(event, f, false, false, true, oncePerElement) }
	
	hover(over, out) { return out !== undefined ? this.on({ mouseenter:over, mouseleave:out }) : this.on('mouseenter mouseleave', over) }
	
	// iteration
	
	each(f) { // wraps element in ö() as argument, use forEach or for of to iterate over pure elements
		return this.queue(() => {
			for (let [index, element] of this.entries()) 
				f(new Ö(element), index, this) // conforms to forEach syntax
		});
	}
	
	// dom
	
	append(selector, to = false, type = 'beforeend') { 
		const appendable = ( selector instanceof Ö ) ? selector : 
				typeof selector === 'function' ? [0] : ö(selector), // if function, create iterable with dummy item.
			doClone = (list, element) => list.length > 1 ? element.cloneNode(true) : element; // Clones nodes if length > 1.
		return this.queue(() => {
			for (let [index, element] of this.entries())
				for (let a of appendable) {
					if ( typeof selector === 'function' ) a = ö(selector(index, element.innerHTML, element))[0];
					if (to) a.insertAdjacentElement(type, doClone(appendable, element));
					else 		element.insertAdjacentElement(type, doClone(this, a));
				}
		});
	}
	
	appendTo(selector) { return this.append(selector, true) }
	
	prepend(selector) {	return this.append(selector, false, 'afterbegin') }
	
	prependTo(selector) {	return this.append(selector, true, 'afterbegin') }
	
	after(selector) {	return this.append(selector, false, 'afterend') }
	
	insertAfter(selector) {	return this.append(selector, true, 'afterend') }
	
	before(selector) {	return this.append(selector, false, 'beforebegin') }
	
	insertBefore(selector) {	return this.append(selector, true, 'beforebegin') }
	
	wrap(selector, all = false) {
		const wrapper = ( selector instanceof Ö ) ? selector[0] : ö(selector)[0];
		return this.queue(() => {
			if (all) {
				const deepest = ö.deepest(wrapper);
				this[0].parentNode.insertBefore(wrapper, this[0]);
				for (let element of this) {
					deepest.appendChild(element);
				}
			} else {
				let thisWrapper;
				for (let element of this) {
					thisWrapper = wrapper.cloneNode(true);
					element.parentNode.insertBefore(thisWrapper, element);
					ö.deepest(thisWrapper).appendChild(element);
				}
			}
		});
	}
	
	wrapAll(selector) { return this.wrap(selector, true) }

	remove() {
		return this.queue(() => {
			for (let element of this) 
				element.parentElement.removeChild(element);
		});
	}
	detatch() { return remove() } // alias for remove
	
	empty() { return this.prop('innerHTML', '') }
	
	// properties get/set
	
	prop(key, value, isAttr = false, isStyle = false, t) { // handles get/set property, get/set attribute, and get/set style. Style can take a time value.
		const toCamelCase = s => s.replace(/(-)([a-z])/g, (m, _, c, o) => o ? c.toUpperCase(): c),
					toKebabCase = s => s.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase(), // thx https://gist.github.com/nblackburn/875e6ff75bc8ce171c758bf75f304707
					setStyle = (key, value, t, index, element) => {
						if (t !== undefined) {
							this._setTransition(element, [[ toKebabCase(key), ( typeof t === 'function' ? t(index, element) : t )/1000 ]])
							setTimeout(() => element.style[toCamelCase(key)] = value, 0) // delay to next tick
						} else element.style[toCamelCase(key)] = value;
					}
		// get
		if (value === undefined && typeof key === 'string'){
			const keys = key.split(' ');
			return keys.length === 1 ? // if only one element
					isAttr ? this[0].getAttribute(key) : 
					isStyle ? window.getComputedStyle(this[0])[ toCamelCase(key) ] : 
					this[0][key] // return value
				: (() => {
						let props = {};
						for (let k of keys)
							props[k] = isAttr ? this[0].getAttribute(k) : 
												 isStyle ? props[k] = window.getComputedStyle(this[0])[ toCamelCase(k) ] : 
												 this[0][k];
						return props;
					})(); // else return object with values
		}
		// set
		if (typeof key === 'object'){
			return this.queue(() => {
				for (let [index, element] of this.entries()) 
					for (let k in key) {
						if (isAttr) element.setAttribute(k, key[k]); // attr
						else if (isStyle) setStyle(k, key[k], t, index, element) // style
						else element[k] = key[k]; // prop
					}
			});
		} else {
			return this.queue(() => {
				for (let [index, element] of this.entries()) {
					let thisValue = typeof value === 'function' ? 
							value(index, isAttr ? element.getAttribute(key) : 
													 isStyle ? window.getComputedStyle(element)[toCamelCase(key)] : 
													 element[key], element) 
						: value;
					if (isAttr) element.setAttribute(key, thisValue); // attr
					else if (isStyle) setStyle(key, thisValue, t, index, element) // style
					else element[key] = thisValue; // prop
				} 
			});
		}
	}
	
	attr(key, value) { return this.prop(key, value, true) }
	
	style(key, value, t) { return this.prop(key, value, false, true, t) }
	css(key, value, t) { return this.style(key, value, t) } // alias for style
	
	html(str) { return this.prop('innerHTML', str) }
	
	text(str) { return this.prop('innerText', str) }
	
	val(str) { return this.prop('value', str) }
	
	removeAttr(name) {
		return this.queue(() => {
			for (let element of this) 
				element.removeAttribute(name);
		});
	}
	
	data(key, value) {
		if (value !== undefined || typeof key === 'object') {
			return this.queue(() => {
				for (let [index, element] of this.entries())
					ö.data(element, key, typeof value === 'function' ? value(index, ö.data(element, key), element) : value);
			});
		} else return ö.data(this[0], key);
	}
	
	// style convenience methods (x, y, t, args array can take functions with arguments index, element)
	
	hide(t = 0, visibility = false) {
		this._cache();
		return this.queue(() => { 
			for (let [index, element] of this.entries()) {
				let thisT = typeof t === 'function' ? t(index, element) : t;
				element.style.opacity = 0;
				this._setTransition(element, [[ 'opacity', thisT/1000 ]])
				setTimeout(() => visibility ? element.style.visibility = 'hidden' : element.style.display = 'none', thisT)
			}
		})
	}
	
	show(t = 0) {
		let thisCache;
		this._cache();
		return this.queue(() => {
			for (let [index, element] of this.entries()) {
				thisCache = ö.data(element, 'ö_cache');
				element.style.display = thisCache.style.display;
				element.style.visibility = 'visible';
				this._setTransition(element, [[ 'opacity', ( typeof t === 'function' ? t(index, element) : t )/1000 ]]);
				setTimeout(() => element.style.opacity = thisCache.style.opacity, 1) // delay to next tick
			}
		})
	}
	
	pos(x, y, t = 0, forceFixed = false) { 
		if (x === undefined) { // get
			let rect = this[0].getBoundingClientRect();
			return Object.assign(rect, { 
				offsetX: this[0].offsetLeft, 
				offsetY: this[0].offsetTop, 
				offsetParent: this[0].offsetParent,
				scrollX: window.scrollX,
				scrollY: window.scrollY,
				documentX: rect.x + window.scrollX,
				documentY: rect.y + window.scrollY,
			});
		}
		// set (simply sets left & top, optionally with transition. position: fixed can be forced)
		return this.queue(() => {
			for (let [index, element] of this.entries()) {
				let thisT = typeof t === 'function' ? t(index, element) : t,
					thisX = typeof x === 'function' ? x(index, element) : typeof x === 'number' ? x+'px' : x,
					thisY = typeof y === 'function' ? y(index, element) : typeof y === 'number' ? y+'px' : y;
				if (forceFixed) element.style.position = 'fixed';
				if (t !== undefined) {
					if (!element.style.left) element.style.left = window.getComputedStyle(element).left; // force defaults
					if (!element.style.top) element.style.top = window.getComputedStyle(element).top;
					window.getComputedStyle(element).top === 'auto' ? element.style.left = 0 : null;
					this._setTransition(element, [[ 'left', thisT/1000 ],[ 'top', thisT/1000 ]])
					setTimeout(() => {
						element.style.left = thisX;
						element.style.top = thisY;
					}, 1) // delay to next tick
				} else {
					element.style.left = thisX;
					element.style.top = thisY;
				}
			}
		})
	}
	position(x, y, t, forceFixed) { return this.pos(x, y, t, forceFixed) } // alias for pos
	
	transform(type, args = [], t) {
		this._cache();
		return this.queue(() => {
			let cache, thisArgs = [];
			for (let [index, element] of this.entries()) {
				if (type === false || type === 'none') { // reset by passing 'none' or false.
					element.style.transform = null;
					ö.data(element, 'ö_cache').style.ö_transform = {}; // clear cache
				} else {
					cache = ö.data(element, 'ö_cache').style;
					let str = cache.transform+' '; // read computed styles
					for (let [i, arg] of args.entries()) // call functions in args, save values
						thisArgs[i] = ( typeof arg === 'function' ? arg(index, element) : arg )
					cache.ö_transform[type] = thisArgs; // write to cache
					for (let type in cache.ö_transform) 
						str += `${ type }(${ cache.ö_transform[type] }) `; // read cache

					if (t !== undefined) {
						this._setTransition(element, [[ 'transform', ( typeof t === 'function' ? t(index, element) : t )/1000 ]])
						setTimeout(() => element.style.transform = str, 1) // delay to next tick
					} else element.style.transform = str;
				}
			}
		})
	}
	
	// Translate, rotate, scale.

	move(x, y, t) { 
		return this.transform( 'translate3d', [ (typeof x === 'number') ? x+'px' : x , (typeof y === 'number') ? y+'px' : y , 0 ], t )
	}
	
	rotate(deg, t) { 
		return this.transform( 'rotate3d', [ 0, 0, 1, (typeof deg === 'number') ? deg+'deg' : deg ], t )
	}
	
	scale(amount, t) { 
		return this.transform( 'scale3d', [ amount, amount, 1 ], t )
	}
	
	// Shortcuts
	
	ease(easing) { return this.style( 'transition-timing-function', easing ) }
	
	bg(value, t) { return this.style( 'background-color', value, t ) }
	
	clr(value, t) { return this.style( 'color', value, t ) }
	
	// Internals
	
	_cache() {
		if (!this.cached) { // run only once. Cannot use queued methods.
			for (let element of this) {
				if (!ö.data(element, 'ö_cache')) // run only once per element.
					ö.data(element, 'ö_cache', { 
						style : ( element instanceof Element ? { // Don't read style from window/document
							display: window.getComputedStyle(element).display === 'none' ? 'block': window.getComputedStyle(element).display, 
							opacity: window.getComputedStyle(element).opacity || 1,
							transform: window.getComputedStyle(element).transform === 'none' ? '' : window.getComputedStyle(element).transform, // cache computed transforms so they can be reapplied
							transition: window.getComputedStyle(element).transition || 'all 0s', // set default for created elements
							ö_transform: {}, 
							ö_transition: {}, 
						} : {} ),
						events : new Set()
					});
			}
			this.cached = true;
		}
	}
	
	_setTransition(element, values) {
		this._cache();
		let cache = ö.data(element, 'ö_cache').style, str = cache.transition;
		for (let val of values)
			cache.ö_transition[val[0]] = val[1] // write to cache
		for (let type in cache.ö_transition) 
			str += `, ${ type } ${cache.ö_transition[type]}s`; // read cache
		element.style.transition = str;
	}
	
	// class
	
	addClass(list, type = 'add') {
		return this.queue(() => {
			for (let element of this) 
				element.classList[type](...list.split(' '));
		});
	}
	
	removeClass(list) { return this.addClass(list, 'remove') }
	
	toggleClass(str) {
		return this.queue(() => {
			for (let element of this) 
				element.classList.toggle(str);
		});
	}
	
	replaceClass(str, replace) {
		return this.queue(() => {
			for (let element of this) 
				element.classList.replace(str, replace);
		});
	}
	
	// util
	
	hasClass(list, all = false) { // all=false = any element has any class, all=true = all elements have all classes
		const classes = list.split(' ');
		for (let element of this)
			for (let str of classes) 
				if (element.classList.contains(str)) {
					if (!all) return true;
				} else if (all) return false;
		return all ? true : false;
	}
	
	equals(selector, strict = false) { // compares every element, with isEqualNode() or strict equality
		const comparable = ( selector instanceof Ö ) ? selector : ö(selector);
		if (this.length !== comparable.length) return false;
		for (let [index, element] of this.entries()) 
			if (strict){
				if (element !== comparable[index]) return false;
			} else {
				if (!element.isEqualNode(comparable[index])) return false;
			}
		return true;
	}
	
	getIndex(elem) {
		if (elem instanceof Ö || elem instanceof Element) { // search inside this
			const findable = ( elem instanceof Ö ) ? elem[0] : elem;
			for (let [index, element] of this.entries()) 
				if (element === findable) return index;
		} else if (!elem || typeof elem === 'string'){ // search for this[0] in parent or selector
			const searchIn = ( typeof elem === 'string' ) ? ö(elem) : Array.from(this[0].parentElement.children);
			for (let [index, element] of searchIn.entries()) 
				if (element === this[0]) return index;
		}
		return -1;
	}
	index(elem) { return this.getIndex(elem) } // alias for getIndex
	
	find(selector){
		let result = [];
		if (selector instanceof Ö || selector instanceof Element) { // search by element.contains
			const findable = ( selector instanceof Ö ) ? selector : [selector];
			for (let element of this)
				for (let f of findable)
				if (element !== f && element.contains(f)) result.push(f);
		} else { // search by selector
			for (let element of this)
				result = result.concat(Array.from(element.querySelectorAll(selector)))
		}
		return result.length ? new Ö(...result) : 
			ö.log(ö.message(`Sorry, could not find descendants for input: ${ selector }.`)), new Ö(...result); // if empty, say sorry.
	}
	
	clone() { 
		let cloned = [];
			for (let element of this)
				cloned.push(element.cloneNode(true));
		return new Ö(...cloned); // direct instantiation of Ö, to bypass ö() Array checking.
	}
	
	parent(selector, prev = false, next = false) { 
		let result = new Set(), e;
		for (let element of this) {
			e = prev ? element.previousElementSibling : 
					next ? element.nextElementSibling : 
					element.parentElement;
			if (e && (!selector || e.matches(selector)))
				result.add(e);
		}
		return new Ö(...result)
	}
	
	prev(selector) { return this.parent(selector, true) }
	
	next(selector) { return this.parent(selector, false, true) }
	
	atIndex(index) { return new Ö([this[index]]) }
	eq(index) { return this.atIndex(index) } // alias for atIndex
	
	get(index = 0) { return this[index] }
	e(index) { return this.get(index) } // alias for get
}

(function ö(selector){
	if ( window.ö !== ö ) init();
	
	if ( selector === undefined ) return ö.toString();
	
	if ( typeof selector === 'function' ) // if function, call, not before on DOMContentLoaded
		return ( document.readyState === 'interactive' ) ? selector() : window.addEventListener('DOMContentLoaded', selector, { once: true });
	
	try {
		// if Element, make iterable. If Nodelist or Ö, pass on.
		// if Array, check if any items are Element, and filter them out.
		// if String, create Element or SVGElement or query document.
		// SVGElements must be prefixed with 'svg', i.e. 'svg<circle>'
		const nodes = 
			( typeof selector === 'string') 
			? ( selector[0] === '<' && selector[selector.length-1] === '>' ) 
				? [ ö.createElement(selector) ]
				: ( selector.substr(0,3) === 'svg' && selector[selector.length-1] === '>' ) 
				? [ ö.createElement(selector.substr(3), true) ]
				:	document.querySelectorAll(selector)
			: ( selector instanceof Element || selector === document || selector === window ) 
			? [ selector ]
			: ( selector instanceof Ö || selector instanceof HTMLCollection || selector instanceof NodeList )
			? Array.from(selector)
			: ( selector instanceof Array ) 
			? selector.filter( e => e instanceof Element )
			: [];
		
		if (!nodes.length) throw new Error(`Sorry, could not find or create elements from input: ${ selector }.
Valid inputs are: String as '<html>' or 'svg<svg>' or 'selector', Element, NodeList, HTMLCollection, Ö, or Array of elements.`)
		
		return new Ö( ...nodes );
		
	} catch (e) { 
		ö.log(ö.message(e));
		return new Ö();
	}
	
	function init(){
		//
		// define some nice utilities
		//
		
		// range
		
		ö.range = function* (start, end, step = 1) {
			[start, end, step] = (end === undefined) ? [0, +start, +step] : [+start, +end, +step]
			if (!Number.isFinite([start, end, step].reduce((a, i) => a+i))) 
				throw new RangeError(ö.message(`Oops, NaN input: ${ [start, end, step].join(', ') }`));
			const count = (start < end) 
				? () => (start += step) < end 
				: () => (start -= step) > end;
			do { yield start } while (count()); 
		}
		
		ö.rangeArray = (start, end, step = 1) => {
			let arr = [], i = 0;
			for (let n of ö.range(start, end, step)) arr[i++] = n;
			return arr;
		}
		
		ö.unique = arr => Array.from(new Set(arr));
		
		ö.shuffle = arr => {
			let a = Array.from(arr); // no mutation
			for (let i = a.length - 1; i > 0; i--) {
					const j = Math.floor(Math.random() * (i + 1));
					[a[i], a[j]] = [a[j], a[i]];
			}
			return a;
		}
		
		// DOM
		
		ö.createElement = (html, isSvg = false) => {
			let template = document.createElement('template');
			if (isSvg) {
				template.innerHTML = `<svg>${ html.trim() }</svg>`;
				return template.content.firstChild.firstChild;
			} else {
				template.innerHTML = html.trim();
				return template.content.firstChild;
			}
		}
		
		ö.parseDOMStringMap = o => { // convert from DOMStringMap to object
			o = Object.assign({}, o);
			for(let key in o) 
				try { o[key] = JSON.parse(o[key]); } catch (e) {} // parse what's parseable
			return o;
		};
		
		const d = new WeakMap(); // global data storage
		ö.data = (element, key, value) => {
			let thisData = d.has(element) ? 
					d.get(element) : ö.parseDOMStringMap(element.dataset);
			if (value !== undefined || typeof key === 'object')
				d.set(element, Object.assign( thisData, typeof key === 'object' ? key : { [key]: value } ));
			return typeof key === 'string' ? thisData[key] : thisData;
		}
		
		// Finds deepestElement in element matching selector.
		// thx https://stackoverflow.com/questions/16831523/how-to-find-deepest-element-from-a-html-tree-with-a-certain-class
		// A teensy bit above my head. Potential performance hog for deep DOM structures.
		ö.deepest = (element, selector = '*') => {
			return Array.from(element.querySelectorAll(selector))
				.reduce((deepest, el) => {
							for (var d = 0, e = el; e !== element; d++, e = e.parentNode);
							return d > deepest.d ? {d: d, deepestElement: el} : deepest;
						}, {d: 0, deepestElement: element}
					).deepestElement;
		}
		
		// mathy
		ö.random = n => Math.floor(Math.random()*n);
		
		ö.nthRoot = (x, n) => x ** (1/Math.abs(n));
		
		// async
		let timeout, rejectPrev; // wow! Closure just works!
		ö.wait = async function (t = 1, f, resetPrevCall = false){
			resetPrevCall = typeof f === 'boolean' ? f : resetPrevCall; // callback is optional
			if (resetPrevCall && rejectPrev) {
				clearTimeout(timeout);
				rejectPrev();
			}
			try {
				await new Promise((resolve, reject) => {
					timeout = setTimeout(resolve, t)
					rejectPrev = reject;
				})
				if (typeof f === 'function') await f();
			} catch (e){}
		}
		
		ö.nextFrame = async function (f) { 
			return new Promise(resolve => requestAnimationFrame(async function() {
				if (typeof f === 'function') await f();
				resolve();
			}));
		}
		
		ö.waitFrames = async function (n = 1, f, everyFrame = false){
			while (n-- > 0) await ö.nextFrame(everyFrame ? f : undefined);
			if (typeof f === 'function' && !everyFrame) await f();
		}
		
		ö.waitFor = async function(selector, event, f){
			return new Promise(resolve => {
				document.querySelector(selector).addEventListener(event, async function(e) {
					if (typeof f === 'function') await f(e);
					resolve();
				}, { once: true })
			})
		}
		
		// todo: color methods (lighten/darken, to rgba, to hex) ?
		
		// stuff
		ö.log = console.log;
		
		ö.message = str => `ö🍳uery says: ${str}`;
		
		ö.toString = () => `Hello ö🍳uery!`;
		
		// write to window
		Object.freeze(ö);
		Object.defineProperty(window, 'ö', {value: ö})
		ö.wait(1, () => window.dispatchEvent(new Event('öQuery')) ) // wait one tick for Firefox to catch up :-)
		}
})()
