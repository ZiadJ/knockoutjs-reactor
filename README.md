KO-Reactor
===========

A KnockoutJS plugin that adds the ability to track changes to a view model recursively and interact with the changes as they occur.

<b>Usage:</b>

    ko.watch(targetObjectOrFunction, options, evaluatorCallback, context);

or

    var property = ko.observable().watch(targetObjectOrFunction, options, evaluatorCallback, context);


```targetObjectOrFunction``` accepts any subscribable or function/object containing the targeted subscribables.<br/>
```options``` is only optional and can be replaced by ```evaluatorCallback``` the response and evaluation function.

<b>Deep Watching:</b><br/>
KO-Reactor can centrally track all CRUD operations on an object graph no exception made. Subscriptions are 
auto generated for nested observables when new array items are added which are then automatically disposed when the items are removed.

The ```depth``` option determines how deep we want the watch process to go. The default value 1 limits it to a flat view model but we can use a value of -1 to make it fully recursive as seen below:

	var viewModel = { ... };
	ko.watch(viewModel, { depth: -1 }, function(parents, child, item) {
		...
	});
	
The callback function provides three arguments:<br/>
1. ```parents```: A list of all parents above the changed property.<br/>
2. ```child```: The child property that was changed.<br/>
3. ```item```: Used to determine whether an item has been added or deleted to an array.

<b>Plain Object Support:</b><br/>
Plain view models can be processed right away even if they don't contain any observables initially. When the ```makeObservable``` option is set to ```true``` the watcher will make sure that all fields are replaced by their observable counterparts during initialization.

<b>Chaining It:</b><br/>
The support for chaining enables some new scenarios. First let's consider this simple view model:
```js
var params = {
    p1 = ko.observable(),
    p2 = ko.observable(),
    p3 = ko.observable()
}
```
If we want to update a variable say ```items``` whenever any of the parameters 
within ```params``` change we would most probably write something along those lines:
```js
var items = ko.observableArray();               var items = ko.computed(function() {
ko.computed = function() {                          var p1 = self.params.p1();
    var p1 = self.params.p1();                      var p2 = self.params.p2();
    var p2 = self.params.p2();                      var p3 = self.params.p3();
    var p3 = self.params.p3();                  
                                                    var newItems = ...;
    var newItems = ...;                             return newItems;
    self.items(newItems);                       }
}                                       
```
However using the plugin we can simply watch ```params``` as a whole and update  ```items``` by any of those methods:
```js
var items = ko.observableArray();               var items = ko.observableArray();
ko.watch(params, function() {                   items.watch(params, function() {    
    var newItems = ...;                             var newItems = ...;                 
    self.items(newItems);                           return newItems;                    
});                                             }); 
```
But once we've chained it together we end up with a minimal version finally making it obvious that the value of ```items``` depends on ```params```:
```js
var items = ko.observableArray().watch(params, function() {
    var newItems = ...;
    return newItems;    
});    
```

<b>Selective Subscription:</b><br/>
What if we want to avoid watching say the variable ```p3```? 
To achieve this we might want to move ```p3``` to another level like so since only top level subscribables are listened to by default:

    var params = {
        p1: ko.observable(),
        p2: ko.observable(),
        ignored: {
            p3: ko.observable() 
        }
    };

Alternatively we can pass in a new object made up of ```p1``` and ```p2``` only as shown below:

    ko.watch({ 1: params.p1, 2: params.p2 }, function (parents, child, item) {
        ...
    }

Or we can just tell the listener to not listen to ```p3``` by using the ```exclude``` option:

    ko.watch(this.params, { exclude: params.p3 }, function (parents, child, item) {
        ...
    }

But the easiest way is to simply tag ```p3``` as non-watchable on the view model:

    var params = {
        p1: ko.observable(),
        p2: ko.observable(),
        p3: ko.observable().watch(false) 
    };

For more advanced cases however we can make use of the ```beforeSubscribe``` option like so:

    ko.watch(this.params, {
        beforeSubscribe: function (parents, child) {
            if (<some condition not to subscribe>)
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
    
<br/>
Unlike ```ko.computed``` no listeners are created for subcribables within the evaluator function. 
So we no longer have to concerned about creating unintended triggers as the code gets more complex.

Please refer to the ```param``` section of the source code for a full list of available options.


