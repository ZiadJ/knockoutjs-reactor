KO-Reactor
===========

Yet another way to add dependencies to any KnockoutJs subscribable.

<b>Usage:</b>

    this.myProperty = ko.observable().reactTo(targetObjectOrFunction, valueEvaluatorFunction);

or

    this.myProperty = ko.observable().reactTo(targetObjectOrFunction, options, valueEvaluatorFunction);

The target parameter can be a subscribable or a function/object containing at least one subscribable. The 
valueEvaluatorFunction parameter accepts a function returning a new value when changes occur in the target object or
function.

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
    
The observable <b>this.data</b> above listens to changes in all subscribables within <b>this.params</b> but no additional listeners 
are created for subcribables used within the evaluator function.

The callback parameter <b>trigger</b> is being used to determine what's been modified such that changes to <b>this.params.showSearch</b>
can be ignored but yet another way to achieve this is to simply rearrange our target object like so:

    this.params = {
        name: ko.observable(),
        surname: ko.observable(),
        show: { 
            search: ko.observable() 
        }
    };

This works because only first level subscribables are considered by default. However it is possible to make it fully 
recursive as follows:

    this.data = ko.observable().reactTo(this.params, { recurse: true } , function (params, trigger) {
        ...
    }

Finally pausing and resuming the reactor is also possible like this:

    this.data.pauseReactor();
    //...do work
    this.data.resumeReactor();

