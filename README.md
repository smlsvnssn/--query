<content>
<!--<code class="runnable test">ö('.test').move(100,0,500).wait(500).hide(500).wait(500).show(500)</code>
<code class="runnable test">ö('.test').ease('ease-in-expo').move(() => ö.random(1000, 5000)+'px', 0, 1000).wait(1000).ease('ease-out-back').move(0, 0, 1500)</code>
<!-- 	<code class="runnable">ö('code').removeAllClasses();</code> -->
	<!--<code class="runnable test">let cb = e => {
		ö.log(e.target, e);
		e.target.dispatchEvent(new Event('bastuba'));
	};
	ö.registerCustomEvent('bastuba', element => element.addEventListener('click', cb), element => element.removeEventListener('click', cb));
	let f = e => null; 
	ö('code.test').on('bastuba', e => ö.log(e.type));
	ö('code.test').hide(0, true)
	.on('enterview', e => ö(e.target).show(500))
	.on('exitview', f)
	.on('clickoutside', f).off('exitview', f)</code>
-->
	
# ö**🍳**uery,
##### or: you can't make an omelette without breaking a few eggs.
___

**ö🍳uery** is a tiny DOM and events lib, with chainable async, some basic animation, and a few useful utilities. Its main usage is for hacking, playing and prototyping, when you have an idea and want to sketch it out fast. If you're courageous, it's probably stable enough for smaller projects, where you don't need a massive framework.
	
ö🍳uery is partially a subset of jQuery and Zepto, but it's simpler, smaller, faster, and doesn't care about IE.

It is also excellent with a swedish keyboard (If you happen to own a non-Swedish keyboard, simply reassign `ö` to for example `è`, `ü`, `Ω` or `ß`). It relies heavily on ES2017/18 features, and aims to be compatible with as few browsers as possible 🤪. Chrome and Firefox works, latest versions of Safari and Edge seem to work pretty well as well.

**Run code examples by clicking them.**

## Usage
<!--<code class="runnable test">ö('code.test').on('clickoutside', e => ö.log(ö.verbose(true, false), ö.error('apa')));</code> -->
For codepen projects, simply `import 'https://codepen.io/smlsvnssn/pen/BrQjRm.js';` and use it as is. You can also use [this template](https://codepen.io/smlsvnssn/pen/wmWBax).

There is a [github repo for öQuery](https://github.com/smlsvnssn/--query) as well, with a minified version (13K), that gets updated fairly sporadically, since this pen is master for the project.
	
Use: 
<code class="runnable">ö('code').html('🤘');</code> 
instead of: 
<code class="runnable">for (let e of document.querySelectorAll('code')) e.innerHTML = '👎';</code>

Call `ö(selector)` in order to create `Ö` collections. The `ö` object is written to `window` upon initialisation. `ö` is not writable/extendable, but the `Ö` class is extendable via `Ö.prototype.anyPropOrMethod`. `Ö` extends `Array`, so all `Array` methods can be used to manipulate `Ö` collections. 

`Ö` is instantiated mainly by calls to `ö(selector)` factory. `new Ö(...iterable)` is slightly faster than `ö(selector)`though, so if you happen to have an iterable full of `Element`s lying around, feel free to call `new Ö(...iterable)` directly.

`window` dispatches the event `'öQuery'` when `ö` is initialised, listen for it like so:
`window.addEventListener('öQuery', e => { yourStuffHere }, { once: true });`

#### ö( selector ) => Ö collection of Elements
`ö` eats `Element`, `Window`, `Document`,  `HTMLCollection`, `Nodelist`, `Ö`, `Array`, `Function` and `String`, and outputs an `Ö` collection of `Element`s. `Element`, `HTMLCollection`, `Nodelist` and `Ö` get converted directly, `Array`s are filtered for `Element`s only.

`String`s behave pretty much like jQuery, meaning you can create elements by passing `ö('<tag>')`, and select elements by passing `ö('#cssSelector')`. Css selectors are handled by `document.querySelectorAll()`, so there's no support for jQuery custom pseudo selectors like `:has()`. 

`Window` and `Document` are mostly there for event handling and custom data, most other functions assume `Element`s.
	
`Function` gets executed after `DOMContentLoaded`.

Unlike jQuery, you can create `SVGElement`s by prefixing a tag with svg, like so: `'svg<circle>'`.


## Inputs
#### selector
Anything that can convert to a list of `Element`s via `ö(selector)`.

#### f
Any sync or async function as callback. Event callbacks get the event object as argument.

#### event
An event name or space-separated string, i.e. 
<code class="runnable">ö('code').on( 'click mousemove', e => ö(e.target).html('👻') )</code> , 
or object with `{ eventtype: f }` (except for `waitFor()`, which takes a single event only).

Supports custom events `enterview` and `exitview`, emitted when an `element`'s bounding box enters or exits the viewport, and `clickoutside`, emitted on click outside `element`. You can register your own custom eventtypes with `ö.registerCustomEvent()`.
	
#### t
Time in milliseconds, or, optionally for sync functions, a function with arguments `index, element` that returns `Number`.

Example: <code class="runnable">ö('code').rotate(180, (i) => i**2 )</code>

#### key
Property, attribute, style or custom data key to be retrieved or set. To get values, `key` can be either a single property key or a space-separated string, i.e. `'background-color display'`, specifying several keys. If only one key, the key's value is returned. If more than one, an object with `{ keys: values }` is returned. The value is retrieved from the first `Element` in the `Ö` collection.

Example: <code class="runnable">ö('code').each( e => e.html(e.prop('offsetTop')) )</code>

To set values, you can pass an object with `{ keys: newValues }`.

#### value
A value or a function returning a value. Functions are called for every `Element`, with `index, prevValue, element` as arguments.

Example: <code class="runnable">ö('code').prop( 'innerText', (i, v) => v.split('').reverse().join('') )</code>


## Outputs
Almost all methods return `this`, and are chainable. Some methods, such as `prop()` act as getters if `value` is not provided. The util methods do not output `this`, they return new `Ö` collections or other values.

`waitForQueue()` returns a `Promise` resolved when the running queue is finished.
	
## Queue 
All methods that return `this` are queueable. The queue is local to an `Ö` instance, use `await ö.wait, await ö.waitFor` etc for global async.

Sync methods are called immediately, but queueing can be forced by first calling `startQueue()`, delaying execution to next tick. This can be useful if you want to loop the queue.
	
#### queue( f ) => this 
Arbitrary functions can be queued by passing them to `queue()`. Functions are called with `this` as argument. If you need to pass other arguments, use a closure.
	
#### startQueue( t ) => this
Forces subsequently queued methods into the queue, with optional delay. 

Example: <code class="runnable">ö('code').html('🕺').startQueue().rotate(25, 500).wait(500).rotate(-25, 500).wait(500).loop()</code>
	
#### stopQueue() => this
Stops queue, and rejects `waitForQueue()`.

#### pause() => this
Pauses queue and `waitFor()` listener.

#### unpause() => this
Unpauses queue and `waitFor()` listener.
	
#### loop( n = 0, reverse = false ) => this
Loops all functions in active queue, also subsequent calls. Loops back and forth if `reverse == true`. Loops n times, or infinitely if n is zero.

Example: 
<code class="runnable">ö('code').loop(4, true).html('🥇').wait(300).html('🥈').wait(300).html('🥉')</code>



## Async
Async methods delay queue execution in various ways. Most are chainable, executed and awaited internally when queue runs. Await entire queue with `waitForQueue()`.


### Chainable
Cannot be awaited. Thenable/awaitable versions are found in `ö`. 
`delay()` is a sync method, but pauses/unpauses queue after delay.

#### wait( t = 1 ) => this
Delays queue by `t` milliseconds.
	
#### waitFor( selector, event ) => this
Delays queue until event occurs. Takes only one element, and one event type.
		
#### waitFrames( n ) => this
Delays queue by `n` frames.
	
#### load( url, f, isJSON = false ) => this
Loads html from `url` and inserts it into elements in current collection, unless callback is provided. Optional callback with arguments `result, index, element`, called for every element in collection.
	
Optionally load `JSON` instead. Use `JSON` with a callback, or strange things will happen 😊.

Example: 
<code class="runnable">ö('code').html('Waiting...').load('https://randomuser.me/api/?results='+ö('code').length, (r, i, e) => ö(e).html(r.results[i].name.first + ' ' + r.results[i].name.last), true )</code>

#### delay( f, t = 1, removePrev = false ) => this
Delayed async callback, pauses running queue after `t` milliseconds and awaits callback. If `removePrev` is true, previous pending delay gets cleared.

	
### Thenable/awaitable
	
#### waitForQueue() => Promise
Resolved when queue finishes, rejected by `stopQueue()`. Use as last call for awaiting or thening a queue, like so: <code class="runnable">ö('code').waitFor('body', 'click').scale(1.2, 500).wait(500).scale(1, 500).wait(500).waitForQueue().then( () => ö('p').rotate(180, 1000) ) </code>


	
## Sync
Sync methods modify an `Ö` collection's `Element`s in various ways. All sync methods are chainable, but some methods, such as `prop()`, act as getters if `value` is not provided. 
	
### Events
Event methods take an event name or a space-separated string, i.e. `'click mouseover'`, or an object with `{ eventtype: f }`, and a callback function. The callback receives the `Event` object as argument. If multiple event names, the same callback is added for all of them.

All listeners added by `Ö` methods are cached internally, and can be removed with `off()` without reference to the original callback, much like jQuery.

#### Custom events
öQuery supports listening for the custom events `enterview`, `exitview` and `clickoutside`. 
	
`enterview` and `exitview` emit when an `element`'s bounding box enters or exits the viewport, like so (scroll to see the effect): <code class="runnable">ö('code').hide(0, true).on('enterview', e => ö(e.target).show(500))</code>
	
These events are not emitted upon initialisation, so if you want to determine if an `Element` is in the viewport, use `isInView()` instead.
	
`clickoutside` emits on click outside the element.


#### on( event, f ) => this
Adds event listeners to elements in collection. Yeah, that's it, really.
	
#### off( event, f ) => this
Removes event listeners added by `Ö` methods from elements in collection. `off()` removes all events, `off('eventtype')` removes all events with specified type/s, and `off('eventtype', f)` removes a specific listener. 

#### throttle( event, f , t = 50 ) => this
Adds event listeners, and throttles event handling to one call per `t` milliseconds. If called multiple times per period, the last call gets executed.

`throttle()`, `debounce()` and `onAnimationFrame()` are wrappers for corresponding methods in `ö`, returning new functions. If you need to keep a reference to the event handler passed to these three methods, call the `ö` methods directly instead, like so: 
`const handler = ö.throttle( e => yourFunctionHere );
ö('code').on('mousemove', handler);`
	
#### debounce( event, f, t = 50, immediately = false ) => this
Adds event listeners, and debounces event handling until no calls are made within `t` milliseconds. If called multiple times per period, the last call gets executed. If `immediately` is set to `true`, the first call gets executed as well.
	
#### onAnimationFrame( event, f ) => this
Defers event handling to next animation frame. If called multiple times per frame, the last call gets executed. Useful for for example `scroll` and `mousemove` event listeners.
	
#### trigger( event ) => this
Dispatches event/s from elements in collection.
	
#### once( event, f, oncePerElement = false) => this
Adds event listeners that triggers once to elements in collection. If `oncePerElement = true`, event/s are triggered once per element and event type, otherwise once per collection.
	
#### hover( over, out ) => this
Convenience method for `mouseenter` and `mouseleave`. Takes one or two functions. If only one, function is called for both events.

Example: <code class="runnable">ö('code').hover( e => ö(e.target).scale(2, 1000), e => ö(e.target).scale(1, 1000) )</code>


	
### Iteration
Since `Ö` extends `Array`, it's easy to `filter`, `map` etc. `Array` methods return `Ö` objects, for example: 
<code class="runnable">ö('code').filter( e => e.innerHTML.match(/Iteration/) ).scale(2, 3000)</code> 

If you want to iterate over a collection with `Element`s as `Ö` objects, use `each()`.

	
#### each( f ) => this
Wraps each element in collection with `ö()`. Receives `ö(element), index, this` as arguments. Use `forEach()` or `for of` if you want to iterate over pure elements.

	
### DOM
DOM methods add or remove `Element`s from the DOM tree. If there are more than one `Element` in the collection, inserted `Element`s are cloned, otherwise moved.

Methods `append` through `insertBefore` can take a function returning an element, called with arguments `index, element.innerHTML, element` for each `element` in collection. 

#### append( selector ) => this
Appends `selector` to each `Element` in collection.

Example: <code class="runnable">ö('code').append('\<b\> 👈 \</b\>')</code>
	
#### appendTo( selector ) => this
Appends current collection to each `Element` in `selector`.

Example: <code class="runnable">ö('\<b\> 👈 \</b\>').appendTo(ö('code'))</code>
	
#### prepend( selector ) => this
Prepends `selector` to each `Element` in collection.
	
Example: <code class="runnable">ö('code').prepend('\<b\> 👉 \</b\>')</code>
	
#### prependTo( selector ) => this
Prepends current collection to each `Element` in `selector`.
	
#### after( selector ) => this
Inserts `selector` after each `Element` in collection.
	
Example: <code class="runnable">ö('code').after('\<b\> 👈 \</b\>')</code>

#### insertAfter( selector ) => this
Inserts current collection after each `Element` in `selector`.
	
#### before( selector ) => this
Inserts `selector` before each `Element` in collection.
	
Example: <code class="runnable">ö('code').before('\<b\> 👉 \</b\>')</code>
	
#### insertBefore( selector ) => this
Inserts current collection before each `Element` in `selector`.
	
#### wrap( selector ) => this
Wraps current collection with `selector`.

Example: <code class="runnable">ö('code').wrap('\<b\>\<i\> 👉 \</i\> 👈 \</b\>')</code>
	
#### wrapAll( selector ) => this
Wraps each `Element` in current collection with `selector`.

#### remove / detatch() => this
Removes all `Element`s in collection from the DOM.

Example: <code class="runnable">ö('code').remove()</code>
	
#### empty() => this
Removes all children of `Element`s in collection.
	

### Properties 
These methods handle getting and setting of values of `Element` properties. If `value` is not set, these methods act as getters, otherwise they return `this`.

To get values, `key` can be either a single property key or a space-separated string, i.e. `'background-color display'`, specifying several keys. If only one key, the key's value is returned. If more than one, an object with `{ keys: values }` is returned. The value is retrieved from the first `Element` in the `Ö` collection.

To set values, you can pass an object with `{ keys: newValues }`, specify a value or a function returning a value. Functions are called for every `Element`, with `index, prevValue, element` as arguments.

	
#### prop( key, value ) => this, value, object with values
Get/set properties of `Element`s. Properties are faster than attributes, use properties whenever possible.
	
#### attr( key, value ) => this, value, object with values
Get/set attributes of `Element`s.

#### data( key, value ) => this, value
Get/set custom data on `Element`s. If no key is provided, the entire `data` object is returned. `data()` cannot take space-separated keys as input, use it without `key` instead. `data` is populated with data from `Element.dataset`, i.e `data-`attributes.

`data` is associated with `Element`s via a `WeakMap` internally. `Ö` keeps a cache in the `data` object, prefixed with `ö_`. Please do not mess with it.

Functions as `value` are called with `index, prevValue, element` as arguments. If you want to store a function with `data()`, wrap it in a function, since functions get executed for return values, like so:
<code class="runnable">ö(document).data('clickHandler', () => e => ö(e.target).html('🧶'));
ö('code').on('click', ö(document).data('clickHandler'));</code>

You can also use `ö.data(element, key, value)`, which doesn't run functions on input.
	
#### css / style( key, value, t ) => this, value, object with values
Get/set style properties of `Element`s. Takes an optional `t` value, affecting styles that can be transitioned. All animations are handled with css transitions. Takes both `camelCased` and `kebab-cased` property names, as well as `--customVariables`.

Example: <code class="runnable">ö('code').style('text-shadow', i => \`0 ${i}px ${i/5}px #0000\`, i => i**1.5)</code>

	
#### html( value ) => this, value
Shortcut for `prop('innerHTML', value)`.

#### text( value ) => this, value
Shortcut for `prop('innerText', value)`.
	
#### val / value( value ) => this, value
Shortcut for `prop('value', value)`, for forms and the like.
	
#### removeAttr( name ) => this
Removes attribute.
	
### Easing
Handles easing for transitions applied by `Ö`. Supports shorthands for some nice `cubic-bezier` functions, `ease-in-back`, `ease-out-back` (bouncy), `ease-in-expo` and `ease-out-expo` (fast).
	
The same easing function get applied for all transitions handled by `Ö` methods on an `Element` at any one time. If you need different easing functions for different properties, use css classes instead. Transitions defined in css are not affected by `ease()`.
	
#### ease( easing ) => this
Gets/sets easing (`ease`, `ease-in-out` and the like) for all transitions applied by `Ö` methods on `Element`s in collection. 
	
Example: <code class="runnable">ö('code').ease('ease-in-expo').move(() => ö.random(1000, 5000)+'px', 0, 1000).wait(1000).ease('ease-out-back').move(0, 0, 1500)</code>

	
### Style 
Convenience methods for setting css styles. All arguments for these methods (except for booleans) can take functions with arguments `index, element`.

If numbers are given as arguments, `px` is assumed. Functions must specify units, i.e `value+'px'`.
	
#### hide( t = 0, visibility = false ) => this
Hides `Element`s in collection. Takes an optional `t` value, which animates to `opacity: 0`, then sets `display: none`, optionally sets `visibility: hidden` instead.

Example: <code class="runnable">ö('code').hide(2500, true)</code>
	
#### show( t = 0 ) => this
Shows `Element`s in collection. Sets `display` to cached value, or to `block` if `none`. Takes an optional `t` value, which animates to `opacity: cachedValue`.

Example: <code class="runnable">ö('code').hide(0, true).wait().show(2500)</code> 
( `wait()` is needed to delay one tick, since `hide()` waits one tick to set `display: none` )

#### hideShow( f, t = 300 ) => this
Convenience method for fading out, changing, and fading in `Element`s in collection. The callback receives `this` as argument.
	
Example: <code class="runnable">ö('code').hideShow(o => o.rotate(180))</code>

#### position / pos( x, y, t = 0, forceFixed = false ) => this, positions object
With no arguments, gets `positions` object, with lots of useful properties, retreieved from first `Element` in collection. `x` and `y` simply sets `left` and `top` style properties, optionally with `t`. `position: fixed` can be forced by setting `forceFixed = true`. 

`pos()` animates slowly, use `move()` for fast animation.

Example: <code class="runnable">ö('code').pos('50%', '50%', 2000, true).move('-50%', '-50%', 2000)</code>
	
#### transform( type, args = [value, ...], t ) => this
Applies transformations to `Element`s in collection, optionally with `transition` set by `t`. `type` takes the name of a [transform function](https://developer.mozilla.org/en-US/docs/Web/CSS/transform-function), `args` must have the correct number of arguments for that function in an array. No errors are thrown if inputs are badly formed, it fails silently. Arguments must specify css unit, i.e. `px` or the like. Values in `args` can be functions, called with `index, element` as arguments.

Transformations already applied via css are cached, read and reapplied before adding new transformations.

Example: <code class="runnable">ö('code').transform( 'rotateY', [ i => i**2+'deg' ], 2500 )</code>
	
### Move, rotate, scale
Shortcuts for useful transformations. If `Number`s are given as arguments, the appropriate unit is assumed.

Uses `translate3d()`, `rotate3d()` and `scale3d()` internally.

#### move( x, y, t ) => this
Functions must specify unit, i.e `value+'px'`, `value+'rem'` etc.

Example: <code class="runnable">ö('code').move(2000, 0, () => ö.random(10000))</code>
	
#### rotate( deg, t ) => this
Functions must specify unit, i.e `value+'deg'`.

Example: <code class="runnable">ö('code').rotate(() => ö.random(360)+'deg', 2500)</code>
	
#### scale( amount, t ) => this
Example: <code class="runnable">ö('code').scale(0, 2500)</code>
	

### Style shortcuts
Shortcuts for common css properties.
	
#### bg( value, t ) => this
Gets/sets `background-color`, optionally with `t`.

Example: <code class="runnable">ö('code').bg('#ff0', 2500)</code>

#### clr( value, t ) => this
Gets/sets `color`, optionally with `t`.

Example: <code class="runnable">ö('code').clr(i => ö.hsla(i*15), 2500)</code>
	
#### b( value = true ) => this
Sets `font-weight` to either `bold` or `normal`.

#### i( value = true ) => this
Sets `font-style` to either `italic` or `normal`.
	
#### u( value = true ) => this
Sets `text-decoration` to either `underline` or `none`.

Example: <code class="runnable">ö('code').b().wait(200).i().wait(200).u().wait(200).u(false).wait(200).i(false).wait(200).b(false)</code>
	
### Class 
Manipulates classes on `Element`s in collection.
	
#### addClass( list ) => this
Adds class/es to `Element`s in collection. Takes `'class'` or `'class1 class2'` as input.

#### removeClass( list ) => this
Removes class/es from `Element`s in collection. Takes `'class'` or `'class1 class2'` as input.
	
#### removeAllClasses() => this
Removes all classes from `Element`s in collection.
	
#### toggleClass( str ) => this
Toggles a class on `Element`s in collection.
	
#### replaceClass( str, replace ) => this
Replaces a class on `Element`s in collection.

	
## Util
These methods return new `Ö` collections, `Element`s, `Boolean`s or index values.
	
#### hasClass( list, all = false ) => Boolean
Determines if `Element`s in collection have specified class/es. If `all == false`, returns `true` if any `Element` has any class. If `all == true`, returns `true` if all `Element`s have all classes.
	
#### isInView( completely = false, all = true ) => Boolean 
Determines if `Element`s in collection are in the viewport. If `completely == true`, returns `true` if `Element`s are completely within viewport. If `completely == false`, returns `true` if any part of `Element`s bounding box are in viewport. If `all == true`, returns `true` if all `Element`s are in viewport. If `all == false`, returns `true` if any `Element` is in viewport.
	
#### equals( selector, strict = false ) => Boolean
Compares every `Element` in collection with `Element`s defined by `selector`. If `strict == false`, comparision is done with `Element.isEqualNode()`. If `strict == true`, comparision is done with strict `===` equality.
	
#### index / getIndex( element ) => index or -1
Finds the index value for an `Element`, or the first `Element` in an `Ö` collection.

If input is an `Element` or an `Ö` collection, the search is performed within the current `Ö` collection.

If input is a `selector` string, the search is performed within the matching `Ö` collection, for the first `Element` in the current `Ö` collection.

If input is `undefined`, the search is performed within the parent of the first `Element` in the current `Ö` collection.
	
#### get / e( index = 0 ) => Element
Returns the `Element` at `index`.
	
#### find( selector ) => Ö
Finds descendants within current `Ö` collection.

If input is an `Element` or an `Ö` collection, the search is performed with `Element.contains()`.
If input is a `selector` string, the search is performed with `Element.querySelectorAll()`.
	
#### clone() => Ö
Clones an `Ö` collection and its `Element`s. The queue is not cloned.
	
#### parent( selector ) => Ö
Returns the parent/s of `Element`s in the current `Ö` collection, optionally filtered by `selector`.
	
#### prev( selector ) => Ö
Returns the previous sibling/s of `Element`s in the current `Ö` collection, optionally filtered by `selector`.

#### next( selector ) => Ö
Returns the next sibling/s of `Element`s in the current `Ö` collection, optionally filtered by `selector`.

#### eq / atIndex( index ) => Ö
Returns the `Element` at `index` wrapped in `Ö`.


## ö util methods
These methods aim to be useful in various ways. Some of them are used internally by `Ö`. Call them directly on the global `ö` object, like so: <code class="runnable">ö('code').html(ö.message(ö.toString()));</code>

### Range
#### ö.range( start, end, step = 1 ) yields Number 
Generator that yields `Number`s within specified range. Parameters `end` and `step` are optional. If `end` is not provided, range starts with `0`, and ends with `start`. Handles negative values. Useful in `for of` loops, for example `for (let i of ö.range(100)) doStuff(i)`.


### Array
#### ö.rangeArray( start, end, step = 1 ) => Array
Returns an `Array` populated with given range.

Example: <code class="runnable">ö('code').html((_, v) => ö.rangeArray(v.length/2).join(''));</code>

#### ö.unique( arr ) => Array
Returns an `Array` with unique entries.
	
#### ö.shuffle( arr ) => Array
Returns a new shuffled `Array`.
	
Example: <code class="runnable">ö('code').html((_, v) => ö.shuffle(Array.from(v)).join(''));</code>

#### ö.sum( arr ) => Number
Sums `arr`, with `Number` coercion. 
		
#### ö.mean( arr ) => Number
Calculates mean value of `arr`, with `Number` coercion.
	
#### ö.median( arr ) => Number
Calculates median value of `arr`, with `Number` coercion.

#### ö.max( arr ) => Number
Returns largest value in `arr`.
	
#### ö.min( arr ) => Number
Returns smallest value in `arr`.
	
		
### Mathy
#### ö.random( min, max, float = false ) => integer, Number
Shorthand for random integers between `min` and `max`-1. If `max` is omitted or `Boolean`, assumes a `min` value of 0. If `max` is `Boolean`, `float` is assumed. If `float` is true, returns float instead of integer.
	
#### ö.randomNormal( mean = 0, sigma = 1 ) => Number
Returns random number from reasonably approximated normal distribution, centered around `mean`, with [more or less 68.2% of the sample set](https://en.wikipedia.org/wiki/68%E2%80%9395%E2%80%9399.7_rule) within ± `sigma`. Values max out at a bit above ± 3 `sigma`, with extreme outliers up to about  ± 4 `sigma`. There are [more mathematically accurate methods](https://observablehq.com/@d3/d3-random#normal) to do this, but this method is fast, and good enough for most people. Use it for fun and visuals, not for statistical analysis 🤓.
	
Example: <code class="runnable">for (let i of ö.range(200)) ö('\<blip>').appendTo(ö('content'))
.move(ö.randomNormal(0, window.innerWidth / 2), ö.randomNormal(0, window.innerHeight / 2), 3000).scale(ö.random(1, 10), 3000).hide(3000);</code>
	
#### ö.round( n, precision = 0 ) => Number
Returns `n` rounded to `precision` decimals.

#### ö.clamp( n, min, max ) => Number
Clamps `n` between `min` and `max`.
	
#### ö.between( n, min, max ) => Boolean
Checks if `n` is between `min` and `max`.
	
#### ö.normalize( n, min, max ) => Number
Normalizes `n` to a value between 0 and 1, within range given by `min` and `max`. If value of `n` is out of range, the value is clamped. 
	
#### ö.nthRoot( x, n ) => Number
Returns nth root of positive number, for example `ö.nthRoot( 256, 8 ) == 2`
	

### String
#### ö.prettyNumber( n, locale = 'sv-SE', precision = 2 )	=> String
Returns `n` rounded to `precision` decimals and formatted by `n.toLocaleString()`. Defaults to swedish formatting, because why not! `locale` is optional, if second argument is `Number`, `precision` is set instead. <code class="runnable">ö('code').html(() => ö.prettyNumber(ö.random(2**32, true)));</code>
	
#### ö.wrapFirstWords( s, numWords = 3, startWrap = '\<span\>', endWrap = '\</span\>', startAtChar = 0 ) => String
Returns `s` with first `numWords` words wrapped in `startWrap` and `endWrap`. Matches first words up to and including first punctuation. Optionally starts matching at index `startAtChar`. Matches special chars for nordic languages as well as \', ’ and -.
	
Example: <code class="runnable">ö('p').html((_, v) => ö.wrapFirstWords(v, 2, '\<b\>', '\</b\>'));</code>
	
#### ö.hsla( h, s = 70, l = 50, a = 1 ) => String
Convenience method for returning colour string in `hsla` format. `hsla` is great! Use `hsla`!
	
Example: <code class="runnable">let hue = ö.random(360); 
ö('body').css({'--bgcolor': ö.hsla(hue, 70, 20), '--codecolor': ö.hsla(hue+180, 70, 80)});</code>
	
#### ö.toCamelCase( str ) => String
Returns kebab-case or snake_case string converted to camelCase. Leaves `--custom-properties` alone.
		
#### ö.toKebabCase( str ) => String
Returns camelCase string converted to kebab-case. Leaves `--customProperties` alone.

		
### Async
Awaitable wrappers for `setTimeout`, `requestAnimationFrame` and events. Takes an optional awaited `f` with no arguments.

#### ö.wait( t = 0, f, resetPrevCall = false ) => Promise
Waits `t` milliseconds. If `resetPrevCall == true`, previous pending call is rejected.
		
#### ö.nextFrame( f ) => Promise
Waits one frame.
		
#### ö.waitFrames ( n = 1, f, everyFrame = false ) => Promise
Waits `n` frames. If `everyFrame == true`, callback is executed every frame.
		
#### ö.waitFor( selector, event, f ) => Promise
Waits for specified event. Takes only one element, and one event type.
	
#### ö.load( url, isJSON = true ) => Promise
Loads (and parses) JSON. Optionally loads HTML. Super simple fetch wrapper.
	

### Throttling
#### ö.throttle( f, t = 50 ) => Function
Throttles execution of `f` to one call per `t` milliseconds. If called multiple times per period, the last call gets executed.
	
#### ö.debounce( f, t = 50, immediately = false ) => Function
Debounces execution of `f` until no calls are made within `t` milliseconds. If called multiple times per period, the last call gets executed. If `immediately` is set to `true`, the first call gets executed as well.
	
#### ö.onAnimationFrame( f ) => Function
Defers execution of `f` to next animation frame. If called multiple times per frame, the last call gets executed.
	

### Event handling	
#### ö.addEvent( element, event, f, once = false )
Caches events using `ö.data()`, handles custom events, and adds event listeners to `element`.
	
#### ö.removeEvent( element, event, f )
Removes event listeners from cache and `element`, and unobserves custom events. If `event` is omitted, all events on `element` get removed. If `event` is provided, all events of that type get removed. If `f` is provided and matches an active listener, that specific listener gets removed. 	
	
#### ö.registerCustomEvent( eventtype, on, off )
Registers a custom `eventtype`, enabling listening for the eventtype through the `ö` event handling system. Requires an `eventtype` as `string`, an `on` handler with `element` as argument, responsible for dispatching an event from `element` as desired, and an `off` handler with `element` as argument, responsible for turning off event dispatching for `element`.
	
In its simplest form it would look like this, by simply hijacking the `click` event:

<pre>
const callback = e => {
	e.target.dispatchEvent(new Event('myCustomEvent'));
};
ö.registerCustomEvent(
	'myCustomEvent', 
	element => element.addEventListener('click', callback), 
	element => element.removeEventListener('click', callback)
);
ö('code').on('myCustomEvent', e => ö.log(e.type));
</pre>

	
### Error handling and logging	
#### ö.verbose( isVerbose, isThrowing = false ) => Boolean
Get/set `isVerbose`, turns off error/message logging when set to `false`. Defaults to `true`. Optionally set `isThrowing` to `true`, in order to throw errors instead.
	
#### ö.error( error, ...rest ) => console.error or thrown Error
Logs errors to console, optionally throws instead. Can be silenced globally by calling `ö.verbose(false)`.
	
#### ö.warn( message, ...rest ) = console.warn
Outputs arguments to console. Can be silenced globally by calling `ö.verbose(false)`.
	
#### ö.log( ...messages ) = console.log
Outputs arguments to console. Can be silenced globally by calling `ö.verbose(false)`.
		
#### ö.message( str ) => 'ö🍳uery says: ${str}'
Wrapper for internal messages.


### Internal
#### ö.createElement( html, isSvg = false ) => Element
Creates an `Element` from an html string. Optionally creates an `SVGElement`.
		
#### ö.parseDOMStringMap( o ) => Object
Parses a `DOMStringMap` as `JSON`. Used internally when reading from `Element.dataset`.

#### ö.data( element, key, value ) => data, data.key
Get/sets `data` on an `Element`. If no `key`, returns `data` object. Associates `Element` with `data` via `WeakMap`.

#### ö.deepest( element, selector = '\*' ) => Element
Finds deepest `Element` in `element`, optionally matching `selector`.

	
### Random stuff
#### ö.toString() => 'Hello ö🍳uery!'
Politeness.

#### ö.rorövovarorsospoproråkoketot( str ) => String
Converts string to Rövarspråket, like so: <code class="runnable">ö('code').text((_, v) => ö.rorövovarorsospoproråkoketot(v) );</code> 
___
##### © 2018-2020 [lhli.net](https://lhli.net)
##### Licence: [MIT](https://opensource.org/licenses/MIT)

</content>
