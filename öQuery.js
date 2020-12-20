/*

© 2018-2020 lhli.net

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
	// thx https://stackoverflow.com/questions/14365318/delay-to-next-d-in-method-chain
	
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
			this.q.isRunning = new Promise( async (resolve, reject) => { // returned by waitForQueue()
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
			}).catch((e) => ö.log(ö.message(e), this)); 
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
		this.q.push( async () => { 
			await new Promise(resolve => setTimeout(resolve, t)) 
		});
		this._runQueue();
		return this;
	}
	
	waitFor(selector, event) { 
		this.q.push( async () => { 
			await new Promise(resolve => {
				let element = ö(selector)[0];
				this.q.aWF = { el: element, e: event, cb: resolve } // save listener in q for de/reactivation
				element.addEventListener(event, resolve, { once: true })
			})
		});
		this._runQueue();
		return this;
	}
		
	waitFrames(t) {
		this.q.push( async () => { 
			await ö.waitFrames(t) 
		});
		this._runQueue();
		return this;
	}
	
	load(url, f, isJSON = false) { // optional callback
		this.q.push( async () => { 
			const result = await ö.load(url, (typeof f === 'boolean') ? f : isJSON); // callback is optional
			if (typeof f !== 'function') this.html( result );
			else
				for (let [index, element] of this.entries())
					await f.call(this, result, index, element)
		});
		this._runQueue();
		return this;
	}
	
	// delayed async callback, pauses running queue and awaits callback.
	delay(f, t = 1, removePrev = false) {
		return this.queue(() => {
			if (removePrev && this.q.aD !== undefined) clearTimeout(this.q.aD);
			this.q.aD = setTimeout( async () => {  // save and remove prev
				this.pause();
				await f();
				this.unpause();
			}, t)
		}) 
	}
	
	//
	// sync
	//
	
	// events
	// event can take space-separated string ('load DOMContentLoaded'), or object with { event: callback }
	// todo: once is weird, triggers per event type with multiple events and other stuff. Fix.
	on(event = {}, f, off = false, trigger = false, once = false, oncePerElement = false) {
		const events = typeof event === 'object' ? event : (o => {
						for (let e of event.split(' '))
							o[e] = f;
						return o;
					})({}), // if string, convert to object
					removeAll = e => { // set as callback if !oncePerElement
						for (let element of elements)
							ö.removeEvent(element[0], element[1], removeAll)
						events[e.type](e); // call callback
						elements = [];
					}
		let elements = [];
		this._cache();
		return this.queue(() => {
			if (once) elements = [];
			for (let element of this) {
				if (off && !Object.keys(events).length) ö.removeEvent(element) // remove all
				else {
					for (let event in events) {
						if (off) ö.removeEvent(element, event, events[event]); // remove specified
						else if (trigger) element.dispatchEvent(new Event(event)); // todo: handle custom events with detail prop.
						else if (once) {
							if (!oncePerElement) elements.push([element, event]);
							ö.addEvent(element, event, (oncePerElement ? events[event] : removeAll), true);
						}
						else ö.addEvent(element, event, events[event]);
					}		
				}
			}
		});
	}
	
	off(event, f) { return this.on(event, f, true) }
	
	trigger(event) { return this.on(event, null, false, true) }
	
	once(event, f, oncePerElement) { return this.on(event, f, false, false, true, oncePerElement) }
	
	hover(over, out) { return out !== undefined ? this.on({ mouseenter:over, mouseleave:out }) : this.on('mouseenter mouseleave', over) }
	
	debounce(event, f, t = 50, immediately = false) { return this.on(event, ö.throttle(f, t, true, immediately)) }
	
	throttle(event, f, t = 50) { return this.on(event, ö.throttle(f, t)) }
	
	onAnimationFrame(event, f) { return this.on(event, ö.onAnimationFrame(f)) }
	
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
	detatch() { return this.remove() } // alias for remove
	
	empty() { return this.prop('innerHTML', '') }
	
	// properties get/set
	/*
	// get variable from inline style
element.style.getPropertyValue("--my-var");

// get variable from wherever
getComputedStyle(element).getPropertyValue("--my-var");

// set variable on inline style
element.style.setProperty("--my-var", jsVar + 4);
	*/
	prop(key, value, isAttr = false, isStyle = false, t) { // handles get/set property, get/set attribute, and get/set style. Style can take a time value.
		const setStyle = (key, value, t, index, element) => {
						if (t !== undefined) {
							this._setTransition(element, [[ ö.toKebabCase(key), ( typeof t === 'function' ? t(index, element) : t )/1000 ]])
							setTimeout(() => element.style.setProperty(ö.toKebabCase(key), value), 0) // delay to next tick
						} else element.style.setProperty(ö.toKebabCase(key), value);
					},
					getStyle = (key, element) => window.getComputedStyle(element).getPropertyValue(ö.toKebabCase(key))
		// get
		if (value === undefined && typeof key === 'string'){
			const keys = key.split(' ');
			return keys.length === 1 ? // if only one element
					isAttr ? this[0].getAttribute(key) : 
					isStyle ? getStyle(key, this[0]) :
					this[0][key] // return value
				: (() => {
						let props = {};
						for (let k of keys)
							props[k] = isAttr ? this[0].getAttribute(k) : 
												 isStyle ? getStyle(k, this[0]) : 
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
													 isStyle ? getStyle(key, element) : 
													 element[key], 
										element) 
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
	
	value(str) { return this.val(str) } // alias
	
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
	
	// Easing
	
	ease(easing) { 
		const easings = {
			'ease-in-back':  'cubic-bezier(0.36, 0, 0.66, -0.56)',
			'ease-out-back': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
			'ease-in-expo':  'cubic-bezier(0.7, 0, 0.84, 0)',
			'ease-out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)'
		};
		this._cache();
		if (easing !== undefined) {
			return this.queue(() => {
				for (let element of this) 
					ö.data(element, 'ö_cache').style.ö_ease = easings[easing] ? easings[easing] : easing;
			});
		} else return ö.data(this[0], 'ö_cache').style.ö_ease;
	}
	
	// style convenience methods (x, y, t, args array can take functions with arguments index, element)
	
	hide(t = 0, visibility = false) {
		this._cache();
		return this.queue(() => { 
			for (let [index, element] of this.entries()) {
				let thisT = typeof t === 'function' ? t(index, element) : t;
				this._setTransition(element, [[ 'opacity', thisT/1000 ]])
				setTimeout(() => element.style.setProperty('opacity', 0), 0) // delay to next tick
				setTimeout(() => visibility ? element.style.visibility = 'hidden' : element.style.display = 'none', thisT) // hide on complete
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
				setTimeout(() => element.style.opacity = thisCache.style.opacity, 0) // delay to next tick
			}
		})
	}
	
	hideShow(f, t = 300) {
		return this.hide(t, true).wait(t).queue(f).show(t);
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
	
	bg(value, t) { return this.style( 'background-color', value, t ) }
	
	clr(value, t) { return this.style( 'color', value, t ) }
	
	b(value = true) { return this.style( 'font-weight', value ? 'bold' : 'normal' ) }
	
	i(value = true) { return this.style( 'font-style', value ? 'italic' : 'normal' ) }
	
	u(value = true) { return this.style( 'text-decoration', value ? 'underline' : 'none' ) }
	
	// Internals
	
	_cache() {
		if (!this.cached) { // run only once. Cannot use queued methods.
			for (let element of this) {
				if (!ö.data(element, 'ö_cache')) // run only once per element.
					ö.data(element, 'ö_cache', { 
						style : ( element instanceof Element 
							? { // Don't read style from window/document
									display: window.getComputedStyle(element).display === 'none' ? 'block': window.getComputedStyle(element).display, 
									opacity: window.getComputedStyle(element).opacity || 1,
									transform: window.getComputedStyle(element).transform === 'none' ? '' : window.getComputedStyle(element).transform, // cache computed transforms so they can be reapplied
									transition: window.getComputedStyle(element).transition || 'all 0s', // set default for created elements
									ö_transform: {}, 
									ö_transition: {}, 
									ö_ease: 'ease', // set default
								} 
							: {} ),
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
			cache.ö_transition[val[0]] = { t: val[1], ease: cache.ö_ease } // write to cache
		
		for (let type in cache.ö_transition) 
			str += `, ${ type } ${ cache.ö_transition[type].t }s ${ cache.ö_transition[type].ease }`; // read cache

		element.style.setProperty('transition', str);
	}
	
	// class
	
	addClass(list, type = 'add', all = false) {
		return this.queue(() => {
			for (let element of this) 
				all && type === 'remove' 
					? element.classList.remove(...element.classList) // remove all
					: element.classList[type](...list.split(' ')); // add/remove list
		});
	}
	
	removeClass(list) { return this.addClass(list, 'remove') }
	
	removeAllClasses() { return this.addClass(null, 'remove', true) }
	
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
	
	isInView(completely = false, all = true) { // all=false = any element is in viewport, all=true = all are in viewport
		const inView = element => {
			const r = element.getBoundingClientRect();
			return (completely) 
				? ( r.top >= 0 && r.left >= 0 && r.bottom <= window.innerHeight && r.right <= window.innerWidth )
				: ( r.bottom >= 0 && r.right >= 0 && r.top <= window.innerHeight && r.left <= window.innerWidth )
		}
		for (let element of this)
				if (inView(element, completely)) {
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
		return result.length 
			? new Ö(...result) 
			: ö.log(ö.message(`Sorry, could not find descendants for input: ${ selector }.`), this), new Ö(...result); // if empty, say sorry.
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
	if ( window.ö !== ö ) return init();
	
	//if ( selector === undefined ) return ö.toString();
	
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
				: ( selector.slice(0,3) === 'svg' && selector[selector.length-1] === '>' ) 
				? [ ö.createElement(selector.slice(3), true) ]
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
		ö.warn(e);
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
				ö.error(`Oops, NaN input: ${ [start, end, step].join(', ') }`);
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
			let a = arr.slice(); // no mutation
			for (let i = a.length - 1; i > 0; i--) {
					const j = Math.floor(Math.random() * (i + 1));
					[a[i], a[j]] = [a[j], a[i]];
			}
			return a;
		}
		
		// thx https://hackernoon.com/3-javascript-performance-mistakes-you-should-stop-doing-ebf84b9de951
		 //ö.sum = arr => arr.reduce( (a, v) => a + Number(v) , 0); //<= 10xslower
		ö.sum = arr => {
			let a = 0;
			for (let i = 0; i<arr.length; i++) a += Number(arr[i]);
			return a;
		};
		
		ö.mean = arr => ö.sum(arr)/arr.length;
		
		ö.median = arr => {
			const a = arr.slice().sort( (a, b) => Number(a) - Number(b) ), // no mutation
			 			m = Math.floor(arr.length/2);
			return (m % 2) ? (Number(a[m-1]) + Number(a[m]))/2 : Number(a[m]);
		}
		
		ö.max = arr => Math.max(...arr);
		
		ö.min = arr => Math.min(...arr);
		
		// Colours
		
		ö.hsla = (h, s = 70, l = 50, a = 1) => 
			`hsla(${ (h % 360) }, ${ s }%, ${ l }%, ${ a })`;
		
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
		}
		
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
		
		// Events

		ö.addEvent = (element, event, f, once = false) => {
			ö.data(element, 'ö_cache').events.add([event, f]);

			// handle custom events
			if (customEvents[event] !== undefined)
				customEvents[event].on(element); // lookup and call observer

			element.addEventListener(event, f, { once: once });
		}

		ö.removeEvent = (element, event, f) => {
			const unobserve = new Set(), // handle custom events
						cache = ö.data(element, 'ö_cache').events,
						clearEvent = e => {
							if (customEvents[e[0]] !== undefined) unobserve.add(e[0]); // check for custom event, flag for unobserve
							element.removeEventListener(...e);
							cache.delete(e);
						},
						clearObservers = () => { 
							for (let e of unobserve) customEvents[e].off(element) 
						}; // remove unused observers			
				
			if (event === undefined) { 			// clear all events
				for (let e of cache) clearEvent(e);
				cache.clear();
				clearObservers();
				return;  // break
			} else if (f === undefined) { 	// clear events of type
				for (let e of cache) if (e[0] === event) clearEvent(e);
			} else { 												// clear single event
				for (let e of cache) if (e[0] === event && e[1] === f) clearEvent(e);
			}
			
			if (unobserve.size) { // check for multiple listeners of same type, unflag
				for (let e of cache)
					if (unobserve.has(e[0])) unobserve.delete(e[0]);
				
				clearObservers();
			}
		}
		
		// Custom events
		let wpInit = true, enterview, exitview;
		const 
			// enterview, exitview
			viewChange = entries => {
				ö.log(entries)
				if (!wpInit) { // do not dispatch events on initialisation
					for (let entry of entries) 
						entry.target.dispatchEvent(new Event(
							entry.isIntersecting ? 'enterview' : 'exitview'
						))
				} else wpInit = false;
			},
			observeEnterview = element => {
				if (!enterview) enterview = new IntersectionObserver(viewChange);
				enterview.observe(element)
			},
			observeExitview = element => {
				if (!exitview) exitview = new IntersectionObserver(viewChange);
				exitview.observe(element)
			},
			unobserveEnterview = element => enterview.unobserve(element),
			unobserveExitview = element => exitview.unobserve(element),
			
			// clickoutside
			clickOutsideListeners = new Set(),
			clickOutside = e => {
				for (let element of clickOutsideListeners){
					if (!element.contains(e.target) && element !== e.target) 
						element.dispatchEvent(new Event('clickoutside'));
				}
			},
			observeClickOutside = element => {
				if (!clickOutsideListeners.size) document.addEventListener('click', clickOutside); // check if empty
				clickOutsideListeners.add(element);
			},
			unobserveClickOutside = element => {
				clickOutsideListeners.delete(element);
				if (!clickOutsideListeners.size) document.removeEventListener('click', clickOutside); // check if empty
			},
					
			// container for custom events, extendable via registerCustomEvent()
			customEvents = {
				enterview: 		{ on: observeEnterview, 		off: unobserveEnterview },
				exitview: 		{ on: observeExitview, 			off: unobserveExitview },
				clickoutside: { on: observeClickOutside, 	off: unobserveClickOutside },
			};
		
		ö.registerCustomEvent = (event, on, off) => customEvents[event] = { on: on, off: off };
		
		// mathy
		ö.random = (min, max, float = false) => {
			float = typeof max === 'boolean' ? max : float; // max can be omitted
			[min, max] = max === undefined || typeof max === 'boolean' 
				? ( min === undefined ? [0, 2] : [0, +min] ) // with no parameters, defaults to 0 or 1
				: [+min, +max]
			return float ? Math.random()*(max-min)+min : Math.floor(Math.random()*(max-min))+min;
		}
		
		ö.randomNormal = (mean = 0, sigma = 1) => {
			const samples = 6;
			let sum = 0, i = 0;
			for (i; i < samples; i++) sum += Math.random();
			return (sigma * 8.35 * (sum - samples/2)) / samples + mean;
												// ^ hand made spread constant :-) 
		}
		
		ö.round = (n, precision = 0) => Math.round(n * 10**precision + Number.EPSILON) / 10**precision;
		
		ö.nthRoot = (x, n) => x**(1/Math.abs(n));
		
		ö.clamp = (n, min, max) => Math.min(Math.max(n, min), max);
		
		ö.between = (n, min, max) => n >= min && n < max;
		
		ö.normalize = (n, min, max) => ö.clamp((n-min)/(max-min), 0, 1);
		
		// string
		ö.prettyNumber = (n, locale = 'sv-SE', precision = 2)	=> {
			[locale, precision] = typeof locale === 'number' ? ['sv-SE', locale] : [locale, precision] // lacale can be omitted
			return ö.round(n, precision).toLocaleString(locale);
		}
		
		ö.wrapFirstWords = (s, numWords = 3, startWrap = '<span>', endWrap = '</span>', startAtChar = 0) => 
			s.slice(0, startAtChar) 
			+ s.slice(startAtChar)
				.replace(
					new RegExp('([\\s]*[a-zA-ZåäöÅÄÖøØ0-9\'’\-]+){0,' + (numWords) + '}\\S?'), 
					startWrap + '$&' + endWrap
				);
		
		ö.toCamelCase = s => s.match(/^\-\-/) ? s // is css var, so leave it alone
			: s.replace(/([-_])([a-z])/g, (m, _, c, o) => o ? c.toUpperCase(): c);
		
		ö.toKebabCase = s => s.match(/^\-\-/) ? s // is css var, so leave it alone
			: s.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase(); // thx https://gist.github.com/nblackburn/875e6ff75bc8ce171c758bf75f304707
		
		// Colours
		ö.hsla = (h, s = 70, l = 50, a = 1) => 
			`hsla(${ (h % 360) }, ${ s }%, ${ l }%, ${ a })`;
		
		// async
		let timeout, rejectPrev; // wow! Closure just works!
		ö.wait = async (t = 1, f, resetPrevCall = false) => {
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
		
		ö.nextFrame = async f => { 
			return new Promise(resolve => requestAnimationFrame(async () => {
				if (typeof f === 'function') await f();
				resolve();
			}));
		}
		
		ö.waitFrames = async (n = 1, f, everyFrame = false) => {
			while (n-- > 0) await ö.nextFrame(everyFrame ? f : undefined);
			if (typeof f === 'function' && !everyFrame) await f();
		}
		
		ö.waitFor = async (selector, event, f) => {
			return new Promise(resolve => {
				document.querySelector(selector).addEventListener(event, async e => {
					if (typeof f === 'function') await f(e);
					resolve();
				}, { once: true })
			})
		}
		
		ö.load = async (url, isJSON = true) => { // JSON or text
			try {
				const response = await fetch(url); 
				return await isJSON ? response.json() : response.text();
			} catch (e) { ö.error(e) }
		}
		
		// throttle, debounce, onAnimationFrame
		
		ö.throttle = (f, t = 50, debounce = false, immediately = false) => {
			let timeout, lastRan, running = false;
			return function () {
				const context = this, args = arguments;
				if (!lastRan || (debounce && !running)) { // first run or debounce rerun
					if (!debounce || immediately) f.apply(context, args);
					lastRan = Date.now();
				} else {
					clearTimeout(timeout);
					timeout = setTimeout(
						() => {
							if (Date.now() - lastRan >= t) {
								f.apply(context, args);
								lastRan = Date.now();
								running = false;
							}
						},
						debounce ? t : t - (Date.now() - lastRan)
					);
				}
				running = true;
			};
		};
		
		ö.debounce = (f, t = 50, immediately = false) => ö.throttle(f, t, true, immediately)

		ö.onAnimationFrame = (f) => {
			let timeout;
			return function () {
				const context = this, args = arguments;
				cancelAnimationFrame(timeout);
				timeout = requestAnimationFrame( () => f.apply(context, args) );
			};
		};
		
		// todo: color methods (lighten/darken, to rgba, to hex) ?
		
		// verbose errors
		let isVerbose = true, isThrowing = false;
		ö.verbose = (v, t = false) => (v === undefined) ? isVerbose : (isThrowing = !!t, isVerbose = !!v);
				
		ö.error = (e, ...r) => {
			if (isVerbose){
				if (isThrowing) throw new Error(e);
				else console.error(ö.message(e), ...r);
			}
		}
		
		ö.warn = (msg, ...r) => { if (isVerbose) console.warn(ö.message(msg), ...r) }
		
		ö.log = (...msg) => { if (isVerbose) console.log(...msg) }
		
		ö.message = s => `ö🍳uery says: ${s}\n`;
		
		// stuff		
		ö.toString = () => `Hello ö🍳uery!`;
		
		ö.rorövovarorsospoproråkoketot = s => (s || '').replace(/[bcdfghjklmnpqrstvwxyz]/gi, m => m+'o'+m.toLowerCase());
		
		// write to window
		Object.freeze(ö);
		Object.defineProperty(window, 'ö', {value: ö})
		Object.defineProperty(window, 'Ö', {value: Ö}) // write Ö to window as well, to bypass export weirdness
		ö.wait(1, () => window.dispatchEvent(new Event('öQuery')) ) // wait one tick for Firefox to catch up :-)
	}
})()
