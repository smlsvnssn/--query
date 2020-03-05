<content>
	
# ö**🍳**uery,
##### or: you can't make an omelette without breaking a few eggs.
___

**ö🍳uery** is a tiny DOM and events lib, with chainable async, and some basic animation. It is partially a subset of jQuery, but it's simpler, smaller, faster, and doesn't care about IE. It is also excellent with a swedish keyboard (If you happen to own a non-Swedish keyboard, simply reassign `ö` to for example `è`, `ü`, `Ω` or `ß`). It relies on ES2017 features, and aims to be compatible with as few browsers as possible :-) Latest versions of Chrome and Firefox works, Fixefox must have `dom.moduleScripts.enabled = true` in `about:config` for module support. Latest versions of Safari and Edge seem to work pretty well as well.

**Run code examples by clicking them.**


## Usage
Use: <code class="runnable">ö('code').html('🤘');</code> 
instead of: <code class="runnable">for (let e of document.querySelectorAll('code')) e.innerHTML = '👎';</code>

Call `ö(selector)` in order to create `Ö` collections. The `ö` object is written to `window` upon initialisation. `ö` is not writable/extendable, but the `Ö` class is extendable via `Ö.prototype.anyPropOrMethod`. `Ö` extends `Array`, so all `Array` methods can be used to manipulate `Ö` collections. 

`Ö` is instantiated mainly by calls to `ö(selector)` factory. `new Ö(...iterable)` is slightly faster than `ö(selector)`though, so if you happen to have an iterable full of `Element`s lying around, feel free to call `new Ö(...iterable)` directly.

`window` dispatches the event `'öQuery'` when `ö` is initialised.

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

#### t
Time in milliseconds, or, optionally for sync functions, a function with arguments `index, element` that returns `Number`.

Example: <code class="runnable">ö('code').rotate(180, (i) => i**2 )</code>

#### key
Property, attribute, style or custom data key to be retrieved or set. To get values, `key` can be either a single property key or a space-separated string, i.e. `'background-color display'`, specifying several keys. If only one key, the key's value is returned. If more than one, an object with `{ keys: values }` is returned. The value is retrieved from the first `Element` in the `Ö` collection.

Example: <code class="runnable">ö('code').each( (e) => e.html(e.prop('offsetTop')) )</code>

To set values, you can pass an object with `{ keys: newValues }`.

#### value
A value or a function returning a value. Functions are called for every `Element`, with `index, prevValue` as arguments.

Example: <code class="runnable">ö('code').prop( 'innerText', (i, v) => v.split('').reverse().join('') )</code>


## Outputs
Almost all methods return `this`, and are chainable. Some methods, such as `prop()` act as getters if `value` is not provided. The util methods do not output `this`.

`waitForQueue()` returns a `Promise` resolved when the running queue is finished, and the util methods return new `Ö` collections or other values.
	
## Queue 
All methods that return `this` are queueable. The queue is local to an `Ö` instance, use `await ö.wait, await ö.waitFor` etc for global async.

Sync methods are called immediately, but queueing can be forced by first calling `startQueue()`, delaying execution to next tick. This can be useful if you want to loop the queue.
	
#### queue( f ) => this 
Arbitrary functions can be queued by passing them to `queue()`. Functions are called with `this` as argument. If you need to pass other arguments, use a closure.
	
#### startQueue( t ) => this
Forces subsequently queued methods into the queue, with optional delay. 

Example: <code class="runnable">ö('code').html(':-)').rotate(90).startQueue().rotate(135, 1000).wait(1000).rotate(45, 1000).wait(1000).loop()</code>
	
#### stopQueue() => this
Stops queue, and rejects `waitForQueue()`.

#### pause() => this
Pauses queue and `waitFor()` listener.

#### unpause() => this
Unpauses queue and `waitFor()` listener.
	
#### loop( n = 0, reverse = false ) => this
Loops all functions in active queue, also subsequent calls. Loops back and forth if `reverse = true`. Loops n times, or infinitely if n is zero.

Example: 
<code class="runnable">ö('code').loop(4, true)
	.html(1).wait(300).html(2).wait(300).html(3)</code>



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
	
#### load( url, f ) => this
Loads html from `url` and inserts it into current collection.
Optional callback with arguments `html, index, element`, called for every element in collection.

Example: 
<code class="runnable">ö('code').html('Waiting...')
	.load('https://codepen.io/smlsvnssn/pen/dJBzVy.html', 
		() => ö('code').on('click', e => ö(e.target).move(ö.random(300)-150, ö.random(300)-150) ) )</code>

#### delay( f, t = 1, removePrev = false ) => this
Delayed async callback, pauses running queue and awaits callback. If `removePrev` is true, previous pending delay gets cleared.

	
### Thenable/awaitable
	
#### waitForQueue() => Promise
Resolved when queue finishes, rejected by `stopQueue()`. Use as last call for awaiting or thening a queue, like so: <code class="runnable">ö('code').waitFor('body', 'click').scale(1.2, 500).wait(500).scale(1, 500).wait(500).waitForQueue().then( () => ö('p').rotate(180, 1000) ) </code>


	
## Sync
Sync methods modify an `Ö` collection's `Element`s in various ways. All sync methods are chainable, but some methods, such as `prop()`, act as getters if `value` is not provided. 
	
### Events
Event methods take an event name or a space-separated string, i.e. `'click mouseover'`, or an object with `{ eventtype: f }`, and a callback function. The callback receives the `Event` object as argument. If multiple event names, the same callback is added for all of them.

All listeners added by `Ö` methods are cached internally, and can be removed with `off()` without reference to the original callback, much like jQuery.


#### on( event, f ) => this
Adds event listeners to elements in collection. Yeah, that's it, really.
	
#### off( event, f ) => this
Removes event listeners added by `Ö` methods from elements in collection. `off()` removes all events, `off('eventtype')` removes all events with specified type/s, and `off('eventtype', f)` removes a specific listener. 
	
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

#### append( selector ) => this
Appends `selector` to each `Element` in collection.

Example: <code class="runnable">ö('code').append('\<b\> ö! \</b\>')</code>
	
#### appendTo( selector ) => this
Appends current collection to each `Element` in `selector`.

Example: <code class="runnable">ö('\<b\> ö! \</b\>').appendTo(ö('code'))</code>
	
#### prepend( selector ) => this
Prepends `selector` to each `Element` in collection.
	
#### prependTo( selector ) => this
Prepends current collection to each `Element` in `selector`.
	
#### after( selector ) => this
Inserts `selector` after each `Element` in collection.

#### insertAfter( selector ) => this
Inserts current collection after each `Element` in `selector`.
	
#### before( selector ) => this
Inserts `selector` before each `Element` in collection.
	
#### insertBefore( selector ) => this
Inserts current collection before each `Element` in `selector`.
	
#### wrap( selector ) => this
Wraps current collection with `selector`.

Example: <code class="runnable">ö('code').wrap('\<code\>\<b\>\<i\>Hello  \</i\>!\</b\>\</code\>')</code>
	
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

To set values, you can pass an object with `{ keys: newValues }`, specify a value or a function returning a value. Functions are called for every `Element`, with `index, prevValue` as arguments.

	
#### prop( key, value ) => this, value, object with values
Get/set properties of `Element`s. Properties are faster than attributes, use properties whenever possible.
	
#### attr( key, value ) => this, value, object with values
Get/set attributes of `Element`s.

#### data( key, value ) => this, value
Get/set custom data on `Element`s. If no key is provided, the entire `data` object is returned. `data()` cannot take space-separated keys as input, use it without `key` instead. `data` is populated with data from `Element.dataset`, i.e `data-`attributes.

`data` is associated with `Element`s via a `WeakMap` internally. `Ö` keeps a cache in the `data` object, prefixed with `ö_`. Please do not mess with it.

Functions as `value` are called with `index, prevValue, element` as arguments. If you want to store a function with `data()`, wrap it in a function, since functions get executed for return values, like so:
<code class="runnable">ö(document).data('clickHandler', () => e => ö(e.target).html('Disco!'));
ö('code').on('click', ö(document).data('clickHandler'));</code>

You can also use `ö.data(element, key, value)`, which doesn't run functions on input.
	
#### css / style( key, value, t ) => this, value, object with values
Get/set style properties of `Element`s. `style()` takes an optional `t` value, affecting styles that can be `transition`ed. All animations are handled with css transitions.

Example: <code class="runnable">ö('code').style('text-shadow', i => \`0 ${i}px ${i/5}px rgba(0,0,0,0)\`, i => i**1.5)</code>

	
#### html( value ) => this, value
Shortcut for `prop('innerHTML', value)`.

#### text( value ) => this, value
Shortcut for `prop('innerText', value)`.
	
#### val( value ) => this, value
Shortcut for `prop('value', value)`, for forms and the like.
	
#### removeAttr( name ) => this
Removes attribute.

	
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

#### position / pos( x, y, t = 0, forceFixed = false ) => this, positions object
With no arguments, gets `positions` object, with lots of useful properties, retreieved from first `Element` in collection. `x` and `y` simply sets `left` and `top` style properties, optionally with `t`. `position: fixed` can be forced by setting `forceFixed = false`. 

`pos()` animates slowly, use `move()` for fast animation.

Example: <code class="runnable">ö('code').pos('50%', '50%', 2000, true).move('-50%', '-50%', 2000)</code>
	
#### transform( type, args = [], t ) => this
Applies transformations to `Element`s in collection, optionally with `transition` set by `t`. `type` takes the name of a [transform function](https://developer.mozilla.org/en-US/docs/Web/CSS/transform-function), `args` must have the correct number of arguments for that function in an array. No errors are thrown if inputs are badly formed, it fails silently. Arguments must specify css unit, i.e. `px` or the like.

Transformations already applied via css are cached, read and reapplied before adding new transformations.

Example: <code class="runnable">ö('code').transform( 'rotateY', [ '180deg' ], 2500 )</code>

	
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
	
#### ease( easing ) => this
Gets/sets `transition-timing-function`.
	
#### bg( value, t ) => this
Gets/sets `background-color`, optionally with `t`.

Example: <code class="runnable">ö('code').bg('#ff0', 2500)</code>

#### clr( value, t ) => this
Gets/sets `color`, optionally with `t`.

Example: <code class="runnable">ö('code').clr(() => \`rgb(${ ö.random(255) },${ ö.random(255) } ,${ ö.random(255) } )\`, 2500)</code>

	
### Class 
Manipulates classes on `Element`s in collection.
	
#### addClass( list ) => this
Adds class/es to `Element`s in collection. Takes `'class'` or `'class1 class2'` as input.

#### removeClass( list ) => this
Removes class/es from `Element`s in collection. Takes `'class'` or `'class1 class2'` as input.
	
#### toggleClass( str ) => this
Toggles a class on `Element`s in collection.
	
#### replaceClass( str, replace ) => this
Replaces a class on `Element`s in collection.

	
## Util
These methods return new `Ö` collections, `Element`s, `Boolean`s or index values.

#### hasClass( list, all = false ) => Boolean
Determines if `Element`s in collection have specified class/es. If `all == false`, returns `true` if any `Element` has any class. If `all == true`, returns `true` if all `Element`s have all classes.
	
#### equals( selector, strict = false ) => Boolean
Compares every `Element` in collection with `Element`s defined by `selector`. If `strict == false`, comparision is done with `Element.isEqualNode()`. If `strict == true`, comparision is done with strict `===` equality.
	
#### index / getIndex( element ) => index or -1
Finds the index value for an `Element`, or the first `Element` in an `Ö` collection.

If input is an `Element` or an `Ö` collection, the search is performed within the current `Ö` collection.

If input is a `selector` string, the search is performed within the matching `Ö` collection, for the first `Element` in the current `Ö` collection.

If input is `undefined`, the search is performed within the parent of the first `Element` in the current `Ö` collection.
	
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
	
#### get / e( index = 0 ) => Element
Returns the `Element` at `index`.



## ö util methods
These methods aim to be useful in various ways. Some of them are used internally by `Ö`.

Call them directly on the global `ö` object, like so: <code class="runnable">ö('code').html(ö.message(ö.toString()));</code>

### Range
		
#### ö.range( start, end, step = 1 ) yields Number 
Generator that yields `Number`s within specified range. Parameters `end` and `step` are optional. If `end` is not provided, range starts with `0`, and ends with `start`. Handles negative values. Useful in `for of` loops, for example `for (let i of ö.range(100)) doStuff(i)`.


### Array

#### ö.rangeArray( start, end, step = 1 ) => Array
Returns an `Array` populated with given range.

Example: <code class="runnable">ö('code').html(() => ö.rangeArray(ö.random(20)));</code>

#### ö.unique( arr ) => Array
Returns an `Array` with unique entries.
	
#### ö.shuffle( arr ) => Array
Returns a new shuffled `Array`.
	
Example: <code class="runnable">ö('code').html(() => ö.shuffle(ö.rangeArray(20)));</code>
	
		
### Mathy

#### ö.random( n ) => integer
Shorthand for random integers between 0 and `n`-1.
		
#### ö.nthRoot( x, n ) => Number
Returns nth root of positive number, for example `ö.nthRoot( 256, 8 ) == 2`

		
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

#### ö.log() = console.log
Write "console" a hundred times!
		
#### ö.message( str ) => 'ö🍳uery says: ${str}'
Wrapper for internal messages.
		
#### ö.toString() => 'Hello ö🍳uery!'
Politeness.

___
##### © 2018 lhli.net.
##### Licence: [MIT](https://opensource.org/licenses/MIT)

</content>
<toc></toc>
<script>
	window.addEventListener('öQuery', () => {
		const content = ö('content').html(),
			toc = ö('toc'),
			body = ö('body'),
			renderToc = () => {
				headlines.clone()
					.on('click', e => {
								headlines
									.filter( el => el.innerText === e.target.innerText )
									.e().scrollIntoView({behavior: 'smooth', block: 'start'});
							})
					.appendTo('toc');
				toc.hover(() => {
					toc.addClass('active')
						.wait(300).addClass('open');
					body.addClass('noScroll');
				}, () => {
					toc.stopQueue().removeClass('active open');
					body.removeClass('noScroll');
					})
				}, 
			run = e => {
				ö(e.target).off();
				Function(ö(e.target).text())();
				ö('content')
					.wait(3000)
					.queue(reset)
				},
			reset = () => {
				ö('content')
					.html(content)
					.wait()
					.find('.runnable')
					.on('click', run);
				headlines = ö('h2, h3, h4');
			}
		let headlines = ö('h2, h3, h4');
		renderToc();
		ö('.runnable').on('click', run);
	}, { once: true })
</script>
