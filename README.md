KO-Reactor
===========

A neater way to watch objects recursively and/or add dependencies to any KnockoutJs subscribable.

<b>Usage:</b>

    ko.watch(targetObjectOrFunction, options, valueEvaluatorFunction);

or

    this.myProperty = ko.observable().watch(targetObjectOrFunction, options, valueEvaluatorFunction);


The target ```targetObjectOrFunction``` supports any subscribable or function/object containing the targeted subscribables. 
```options``` is optional and can be replaced by ```valueEvaluatorFunction``` which is the response function.
It is called with two parameters the first being the target itself and the second being the child property that was modified.

<b>Basic Example:</b><br/>
```js
var params = {
    p1 = ko.observable(),
    p2 = ko.observable(),
    p3 = ko.observable()
}
```
If we'd like to update a variable say ```items``` whenever any of the parameters within ```params``` change we would most
probably use any of the two samples below:
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
However by taking advantage of the chaining abilities in JS we only need to write this instead:
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

    this.data = ko.observable().watch({ 1: params.p1, 2: params.p2 }, function (params, trigger) {
        ...
    }

Or we could tell the listener to not listen to ```p3``` by using the ```exclude``` option:

    this.data = ko.observable().watch(this.params, { exclude: params.p3 } , function (params, trigger) {
        ...
    }
    
But the easiest way would be to simply tag ```p3``` as non-watchable like so:

    var params = {
        p1: ko.observable(),
        p2: ko.observable(),
        p3: ko.observable().watch(false) 
    };

<b>Object Recursion:</b><br/>
To create a fully recursive reactor we can pass in ```{ recurse: true }``` as the options parameter:

    this.data = ko.observable().watch(this.params, { recurse: true } , function (params, trigger) {
        ...
    }
    
To limit the recursion to say 2 levels we can pass in ```{ recurse: 2 }``` instead.

<b>Pausing the listener:</b><br/>
Pausing and resuming our reactor can be done like so:

    this.data.pauseWatch();
    //...do work
    this.data.resumeWatch();
    
<br/>
Note that unlike ```ko.computed``` no listeners are created for subcribables within the evaluator function. 
So we no longer have to concerned about creating unintended triggers as the code gets more complex.

    
    

