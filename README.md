KO-Reactor
===========

A KnockoutJS plugin which essentially adds the ability to track changes to a view model recursively and process the changes as they occur.

<b>Usage:</b>

    ko.watch(targetObjectOrFunction, options, evaluatorCallback, context);

or

    var property = ko.observable().watch(targetObjectOrFunction, options, evaluatorCallback, context);


```targetObjectOrFunction``` accepts any subscribable or function/object containing the targeted subscribables.<br/>
```options``` is only optional and can be replaced by ```evaluatorCallback``` the response and evaluation function.

<b>Deep Watcher:</b><br/>
The ```depth``` option is used to limit the recursion depth. Its default value 1 limits it to a flat view model but a value of -1, as shown below, will fully unleash it:

	var viewModel = { ... };
	ko.watch(viewModel, { depth: -1 }, function(parents, child, item) {
		...
	});
	
The callback function provides three arguments:<br/>
1. ```parents```: A list of all parents above the changed property.<br/>
2. ```child```: The child property that was changed.<br/>
3. ```item```: Used to determine whether an item has been added or deleted to an array.

KO-Reactor seamlessly tracks changes for the whole object graph within a view model by recursively subscribing to all its observables. 
For observable arrays, subscriptions are created or destroyed on the fly as new items are added or removed. However when the view model structure itself is meant to be modified the ```mutable: true``` option must be used.

<b>Auto Wrapper:</b><br/>
By setting the ```wrap``` option to ```true``` the watcher will make sure that all fields within the targeted object are wrapped within an observable
even when new array items are added.

<b>Chaining Support:</b><br/>
The chaining support provided adds in more ways to simplify the code and make it more readable. For example let's consider this simple view model:
```js
var params = {
    p1 = ko.observable(),
    p2 = ko.observable(),
    p3 = ko.observable()
}
```
To update a variable, say ```items```, whenever any parameter within ```params``` change we would most probably write something along those lines:
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
However, using the plugin, we can just watch ```params``` instead like so:
```js
var items = ko.observableArray();         	    	var items = ko.observableArray();
ko.watch(params, function() {              		    items.watch(params, function() {    
    var newItems = ...;                 OR   	    	var newItems = ...;                 
    self.items(newItems);                   	        return newItems;                    
});                                       	      	}); 
```
And chaining it together helps remove the clutter so it clearly shows how ```items``` depends on ```params```:
```js
var items = ko.observableArray().watch(params, function() {
    var newItems = ...;
    return newItems;    
});    
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
As of now I'm only aware of this one:

https://github.com/bago/knockout-undomanager

So feel free to let me know if you have something to bring in and I'll mention it here.

<b>Further Notes:</b><br/>
Unlike ```ko.computed``` no listeners are created for subcribables within the evaluator function. 
So we no longer have to concerned about creating unintended triggers as the code gets more complex.

Two alternative usage examples which were not mentioned above but which might come in handy are:

	ko.watch(function() { ... }, options);

which simply returns a computed and:

	var property = ko.observable().watch(function() { ... }, options);

which provides a chainable version of ```.subscribe```.


For a full list of available options please consult the ```param``` sections of the source code.
