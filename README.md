KO-Reactor
===========

A KnockoutJS plugin that lets you track all changes within a view model seamlessly with the ability to pin point and process them on the fly. It does not require any modifications to the markup or view model itself which makes it ideal for testing and quick prototyping.

<b>Usage:</b>

    ko.watch(targetObjectOrFunction, options, evaluatorCallback, context);

or

    var property = ko.observable().watch(targetObjectOrFunction, options, evaluatorCallback, context);


```targetObjectOrFunction``` accepts any subscribable or function/object containing the targeted subscribables.<br/>
```options``` is only optional and can be replaced by ```evaluatorCallback``` the response and evaluation function.

<b>Deep Watcher:</b><br/>
The ```depth``` option is used to limit the recursion depth. Its default value 1 limits it to a flat view model but a value of -1, as shown below, will 
fully unleash it:

	var viewModel = { ... };
	ko.watch(viewModel, { depth: -1 }, function(parents, child, item) {
		...
	});

The callback function provides three arguments:<br/>
1. ```parents```: A list of all parents above the changed property.<br/>
2. ```child```: The child property that changed.<br/>
3. ```item```: Used to determine whether an array item has been added, moved or removed.

Note that for observable arrays, subscriptions are created or destroyed on the fly as new items are added or removed. 
To keep up with changes in the model structure itself however the ```mutable``` option needs to be set to ```true```.

<b>Auto Wrapper:</b><br/>
Setting the ```wrap``` option to ```true``` will make sure that all fields within the targeted object are wrapped within an observable even if new array items are added later on.

<b>Chaining Support:</b><br/>
The chaining support provided adds in more ways to simplify the code and make it more readable. For example let's consider this simple view model:
```js
var params = {
    p1 = ko.observable(),
    p2 = ko.observable(),
    p3 = ko.observable()
}
```
To update a variable, say ```items```, whenever any parameter within ```params``` changes we would most probably write something along those lines:
```js
var items = ko.observableArray();      	 	        var items = ko.computed(function() {
ko.computed = function() {             	    	        var p1 = self.params.p1();
    var p1 = self.params.p1();         	    	        var p2 = self.params.p2();
    var p2 = self.params.p2();         	OR	            var p3 = self.params.p3();
    var p3 = self.params.p3();         	         
														var newItems = ...;
    var newItems = ...;                     	        return newItems;
    self.items(newItems);               	        }
}                                       
```
However, using the plugin, we can just watch ```params``` right away like so and let it do the rest:
```js
var items = ko.observableArray();         	    	var items = ko.observableArray();
ko.watch(params, function() {              		    items.watch(params, function() {    
    var newItems = ...;                 OR   	    	var newItems = ...;                 
    self.items(newItems);                   	        return newItems;                    
});                                       	      	}); 
```
Finally adding a bit of fluency to the mix we end up with the single block below:
```js
var items = ko.observableArray().watch(params, function() {
    var newItems = ...;
    return newItems;    
});
```

Note that by omitting the target parameter we obtain a chainable version of ```.subscribe```. 
So instead of creating a subscription separately like so:
```js
var someProperty = ko.observable();
someProperty.subscribe(someFunction, options);
```
We can do away with the redundancy like so:
```js
var someProperty = ko.observable().watch(someFunction, options);
```

<b>Selective Subscription:</b><br/>
There are many ways we can go about making a selective watcher. Suppose we want to avoid watching the variable ```p3```. 
To achieve this we could move ```p3``` to another level like so:

    var params = {
        p1: ko.observable(),
        p2: ko.observable(),
        ignored: {
            p3: ko.observable() 
        }
    };

But this assumes that the depth option is set to 1. To avoid this we can pass in a new object made up of ```p1``` and ```p2``` only:

    ko.watch({ 1: params.p1, 2: params.p2 }, function (parents, child, item) {
        ...
    }

Or we can just use the ```hide``` option this way:

    ko.watch(this.params, { hide: params.p3 }, function (parents, child, item) {
        ...
    }

The easiest way however is to simply tag ```p3``` as non-watchable like so:

    var params = {
        p1: ko.observable(),
        p2: ko.observable(),
        p3: ko.observable().watch(false) 
    };

For more advanced cases however we can make use of the ```beforeWatch``` option which gives us full control over the subscription process:

    ko.watch(this.params, {
        beforeWatch: function (parents, child) {
            if (<some reason not to subscribe>)
                return false; // cancel subscription
        }
    }, function (parents, child, item) {
		...
    });

<b>Pausable Listener:</b><br/>
Pausing and resuming a reactor on any property can be done like so:

    this.data.watch(false);
    //...do work
    this.data.watch(true);

<b>Projects using KO-Reactor:</b><br/>
As of now I'm only aware of this excellent undo manager by Stefano Bagnara:

https://github.com/bago/knockout-undomanager

Here's a Plunker showing it in action on an array within an array:

http://plnkr.co/edit/nB2129?p=preview

Reactor is also used (via Undomanager) in Mosaico the first opensource Email Template Editor:

https://github.com/voidlabs/mosaico

Do feel free to let me know if you have anything related to share and I'll gladly mention it here.

<b>Further Notes:</b><br/>
Unlike ```ko.computed``` no listeners are created for subcribables within the evaluator function. 
So we no longer have to concerned about creating unintended triggers as the code gets more complex.

Yet another usage not mentioned above example involves calling ```watch``` on a function as shown below:

    ko.watch(function() { ... }, options);

However it is nothing more than a cosmetic enhancement since it only returns a ```computed``` of the function being passed in.

For an extensive list of available options please consult the ```param``` sections of the source code.
