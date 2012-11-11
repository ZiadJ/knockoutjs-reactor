KO-Reactor
===========

Yet another way to add dependencies to any KnockoutJs subscribable.

<b>Usage:</b>

    this.someProperty = ko.observable().reactTo(target, valueEvaluatorFunction);

or

    this.someProperty = ko.observable().reactTo(target, options, valueEvaluatorFunction);

The target parameter can be a subscribable or a function/object containing at least one subscribable. The 
valueEvaluatorFunction parameter accepts a function returning a new value when changes occur in the target.

For example:
    
    self = this;

    this.params = {
        name: ko.observable(),
        surname: ko.observable(),
        showSearch: ko.observable()
    };

    this.data = ko.observable().reactTo(this.params, function (params, trigger) {
        if (trigger != params.showSearch) { // Ignore changes in showSearch.
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
    
The observable this.data above listens to changes in all subscribables within this.params only. However to avoid unnecessary/unexpected 
callbacks no listeners are created for the remaining subcribables within the evaluator function.


To avoid listening to changes in this.params.showSearch our object can be rearranged as follows:

    this.params = {
        name: ko.observable(),
        surname: ko.observable(),
        show: { 
            search: ko.observable() 
        }
    };

This works because only first level subscribables are considered by default. However it is possible to make it fully 
recursive as follows:

    this.data = ko.observable().reactTo(this.params, { recurse: true } , function (params, modifiedProperty) {
        ...
    }

Pausing and resuming the reactor is also possible like so:

    this.data.pauseReactor();
    //...do work
    this.data.resumeReactor();

