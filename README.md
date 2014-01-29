KO-Reactor
===========

A KnockoutJS plugin that adds the ability to watch all observables and child observables within an object in one go. The latest version enables dynamic monitoring of array data subscribables as well.

<b>Usage:</b>

    ko.watch(targetObjectOrFunction, options, evaluatorCallback, context);

or

    this.myProperty = ko.observable().watch(targetObjectOrFunction, options, evaluatorCallback, context);


The target ```targetObjectOrFunction``` supports any subscribable or function/object containing the targeted subscribables. 
```options``` is optional and can be replaced by ```evaluatorCallback``` which is the response function.

<b>Deep Watching:</b><br/>
KO-Reactor can centrally monitor all CRUD operations on the object graph for the view model no exception made. A new subscription is
created when an array element is created which is then automatically disposed after the item is removed.
To enable it set the ```depth``` option to a value of more than one or -1 if no depth limit is required shown below:

	var viewModel = { ... };
	ko.watch(viewModel, { depth: -1 }, function(parents, child, item) {
		...
	});    
	
The callback provides three arguments:
1. ```parents```: A list of all parents above the changed property.
2. ```child```: The child property that was changed.
3. ```item```: Used to determine whether an item has been added or deleted to an array.

<b>No Observables Required:</b>
Even a view model with no observables assigned to it can be watch right away. By simply setting the ```makeObservable``` 
option to ```true``` the watcher will ensure that all fields are turned into observables while being launched.

<b>Chaining:</b><br/>
```js
var params = {
    p1 = ko.observable(),
    p2 = ko.observable(),
    p3 = ko.observable()
}
```
The support for chaining enables some new scenarios. Let's say we'd like to update a variable say ```items``` whenever any of the parameters 
within ```params``` change we would most probably use one of the two samples below:
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
Using the plugin we no longer need to evaluate each parameter and end up with this:
```js
var items = ko.observableArray();               var items = ko.observableArray();
ko.watch(params, function() {                   items.watch(params, function() {    
    var newItems = ...;                             var newItems = ...;                 
    self.items(newItems);                           return newItems;                    
});                                             }); 
```
However by taking advantage of the chaining abilities we only need to write this instead:
```js
var items = ko.observableArray().watch(params, function() {
    var newItems = ...;
    return newItems;    
});    
```
<b>Selective Subscription:</b><br/>
Note that only first level subscribables are listened to by default. So if we could want to avoid watching say the
variable ```p3``` we can achieve this by moving it to another level like so:

    var params = {
        p1: ko.observable(),
        p2: ko.observable(),
        ignored: { 
            p3: ko.observable() 
        }
    };

We might also pass in a new object made up of ```p1``` and ```p2``` only as shown below:

    this.data = ko.observable().watch({ 1: params.p1, 2: params.p2 }, function (context, trigger) {
        ...
    }

Or we could tell the listener to not listen to ```p3``` by using the ```exclude``` option:

    this.data = ko.observable().watch(this.params, { exclude: params.p3 } , function (context, trigger) {
        ...
    }
    
But the easiest way would be to simply tag ```p3``` as non-watchable like so:

    var params = {
        p1: ko.observable(),
        p2: ko.observable(),
        p3: ko.observable().watch(false) 
    };

<b>Pausable Listener:</b><br/>
Pausing and resuming a reactor on any property can be done like so:

    this.data.watchEnabled = false;
    //...do work
    this.data.watchEnabled = true;
    
<br/>
<br/>
Unlike ```ko.computed``` no listeners are created for subcribables within the evaluator function. 
So we no longer have to concerned about creating unintended triggers as the code gets more complex.

Please refer to the source code for a full list of available options.


