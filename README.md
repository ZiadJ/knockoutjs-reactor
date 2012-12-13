KO-Reactor
===========

A neater way to watch objects and add dependencies to any KnockoutJs subscribable.

<b>Usage:</b>

    ko.watch(targetObjectOrFunction, options, valueEvaluatorFunction);

or

    this.myProperty = ko.observable().watch(targetObjectOrFunction, options, valueEvaluatorFunction);

The target parameter supports any subscribable or function/object containing the targeted subscribables. <b>valueEvaluatorFunction</b> is
the response function which aquires two parameters the first being the target itself and the second being the child property 
that was modified. In the second case the return value is used to update the subscribable to which it is chained. 

Note that the parameter <b>options</b> is optional and can be omitted.


For example:
    
    self = this;

    this.params = {
        name: ko.observable(),
        surname: ko.observable(),
        showSearch: ko.observable()
    };

    this.data = ko.observable().watch(this.params, function (params, trigger) {
        if (trigger != params.showSearch) { // We do not want to react to changes in showSearch.
            var data = this; // Save context for async use.
            params = ko.toJS(params); // unwrap observables.
            var result = getDataFromCache(params); // Read from cache.
            return result || getDataAsync(params, function (result) { // Set new value if found or read from web service.
                data(result); // Update value asynchronously(self.data can also be used).
            });
        }
    }).extend({ throttle: 200 });
    
The code above creates an observable <b>this.data</b> that reacts to changes within <b>this.params</b> within one line of code. 
The parameter <b>trigger</b> which determines which property has changed is used to ignore changes in <b>this.params.showSearch</b>.

However since only first level subscribables are listened to by default we could achieve the same results like so:

    this.params = {
        name: ko.observable(),
        surname: ko.observable(),
        show: { 
            search: ko.observable() 
        }
    };

Or we could use the following instead:

    this.data = ko.observable().watch({ 1: this.params.name, 2: this.params.surname }, function (params, trigger) {
        ...
    }

To create a fully recursive reactor we can pass in <b>{ recurse: true }</b> as the options parameter:

    this.data = ko.observable().watch(this.params, { recurse: true } , function (params, trigger) {
        ...
    }
    
To limit the recursion to say 2 levels we can pass in <b>{ recurse: 2 }</b> instead.
    
We can also tell the listener to not listen to <b>params.showSearch</b> as follows:

    this.data = ko.observable().watch(this.params, { exclude: params.showSearch } , function (params, trigger) {
        ...
    }

And to make several exclusions we can pass them as an array instead.

Unlike <b>ko.computed</b> however no listeners are created for subcribables within the evaluator function. 
So we no longer have to concerned about creating unintended triggers as the code gets more complex.

Finally pausing and resuming our reactor can be done like so:

    this.data.pauseWatch();
    //...do work
    this.data.resumeWatch();
