KO-Reactor
===========

Yet another way to add dependencies to any KnockoutJs subscribable.

<b>Usage:</b>

    this.myProperty = ko.observable().reactTo(targetObjectOrFunction, valueEvaluatorFunction);

or

    this.myProperty = ko.observable().reactTo(targetObjectOrFunction, options, valueEvaluatorFunction);

The target parameter can be a subscribable or a function/object containing at least one subscribable. The valueEvaluatorFunction 
parameter is the response function that returns the new value. It gets called with two parameters the first being the target 
itself and the second being child property that was modified.

For example:
    
    self = this;

    this.params = {
        name: ko.observable(),
        surname: ko.observable(),
        showSearch: ko.observable()
    };

    this.data = ko.observable().reactTo(this.params, function (params, trigger) {
        if (trigger != params.showSearch) { // We do not want to react to changes in showSearch.
            params = ko.toJS(params); // unwrap observables.
            var result = getDataFromCache(params); // Read from cache.
            if (result) {
                return result; // update value synchronously.
            } else {
                var data = this; // Save context.
                getDataAsync(params, function (result) { // Read from web service.
                    data(result); // Update value asynchronously(self.data can also be used).
                });
            }
        }
    }).extend({ throttle: 200 });
    
The code above creates an observable <b>this.data</b> that reacts to changes within <b>this.params</b> in a more intuitive
manner.

The parameter <b>trigger</b> which determines which property has changed is used to ignore changes to <b>this.params.showSearch</b> 
but since only first level subscribables are listened to by default we could achieve the same results like so:

    this.params = {
        name: ko.observable(),
        surname: ko.observable(),
        show: { 
            search: ko.observable() 
        }
    };

Or we could use the following instead:

    this.data = ko.observable().reactTo({ this.params.name(), this.params.surname }, function (params, trigger) {
        ...
    }

To create a fully recursive reactor we can pass in { recursive: true } as the options parameter:

    this.data = ko.observable().reactTo(this.params, { recurse: true } , function (params, trigger) {
        ...
    }
    
Note that no additional listeners are created for subcribables used within the evaluator function as it might be the case
with the ko.computed function.

Finally pausing and resuming our reactor can be done like so:

    this.data.pauseReactor();
    //...do work
    this.data.resumeReactor();

