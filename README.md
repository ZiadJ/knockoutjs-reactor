KO-Reactor
===========

A KnockoutJS plugin that adds the ability to track changes to a view model recursively and process the changes as they occur. The latest version largely improves performance with large arrays but requires Knockout v3.0.

<b>Usage:</b>

    ko.watch(targetObjectOrFunction, options, evaluatorCallback, context);

or

    var property = ko.observable().watch(targetObjectOrFunction, options, evaluatorCallback, context);


```targetObjectOrFunction``` accepts any subscribable or function/object containing the targeted subscribables.<br/>
```options``` is only optional and can be replaced by ```evaluatorCallback``` the response and evaluation function.

<b>Deep Watcher:</b><br/>
KO-Reactor provides the ability to seamlessly track changes for whole object graph within a view model. It achieves this by
recursively subscribing to all observables within a view model. It also creates new subscriptions on the fly as new array 
items are added.

The ```depth``` option can be used to limit the recursion depth. Note that the default value is 1, which limits it to a flat view model, 
but a value of -1 will fully unleash it as shown below:

	var viewModel = { ... };
	ko.watch(viewModel, { depth: -1 }, function(parents, child, item) {
		...
	});
	
The callback function provides three arguments:<br/>
1. ```parents```: A list of all parents above the changed property.<br/>
2. ```child```: The child property that was changed.<br/>
3. ```item```: Used to determine whether an item has been added or deleted to an array.

<b>Auto Wrapper:</b><br/>
By setting the ```wrap``` option to ```true``` the watcher will make sure that all fields within a view model are wrapped within an observable
even when new array items are added.

<b>Chaining Support:</b><br/>
Its chaining abilities makes it more readable. For example let's consider this simple view model:
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
And once we've chained it together we end up with a minimal version which makes it clear that the value of ```items``` depends on ```params```:
```js
var items = ko.observableArray().watch(params, function() {
    var newItems = ...;
    return newItems;    
});    
```

<b>Selective Subscription:</b><br/>
There are many ways we can go about making our watcher more selective. Let's suppose we want to avoid watching the variable ```p3```. 
To achieve this we might want to move ```p3``` to another level like so:

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

For more advanced cases however we can make use of the ```beforeWatch``` option to fully take control over the subscription process:

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

    this.data.watchEnabled = false;
    //...do work
    this.data.watchEnabled = true;
    
<b>Further Notes:</b><br/>
Unlike ```ko.computed``` no listeners are created for subcribables within the evaluator function. 
So we no longer have to concerned about creating unintended triggers as the code gets more complex.

A full list of available options is available in the ```param``` sections of the source code.
