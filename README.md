KO-Reactor
===========

Yet another way to add dependencies to any KnockoutJs subscribable.

<b>Usage:</b>

    this.myProperty = ko.observable().reactTo(targetObjectOrFunction, valueEvaluatorFunction);

or

    this.myProperty = ko.observable().reactTo(targetObjectOrFunction, options, valueEvaluatorFunction);

The target parameter can be a subscribable or a function/object containing at least one subscribable. The valueEvaluatorFunction 
parameter accepts the response function with two parameters the first being the target itself and the second being the
child property that was modified. It returns a new value for the subscribable it is chained to.

The options parameter can be used to create a recursive reactor in case the target contains nested subscribables.

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
    
The code above creates an observable <b>this.data</b> that reacts to changes within <b>this.params</b>. Note that no additional listeners 
are created for subcribables used within the evaluator function as it might be the case with the ko.computed function.

The parameter <b>trigger</b> determines which property has changed. In our case it is used to ignore changes to <b>this.params.showSearch</b>.
But since only first level subscribables are listened to by default we could achieve the same results like so:

    this.params = {
        name: ko.observable(),
        surname: ko.observable(),
        show: { 
            search: ko.observable() 
        }
    };

Or we could use the following code instead:

    this.data = ko.observable().reactTo({ this.params.name(), this.params.surname }, function (params, trigger) {
        ...
    }

To create a fully recursive reactor we can pass in { recursive: true } as the options parameter:

    this.data = ko.observable().reactTo(this.params, { recurse: true } , function (params, trigger) {
        ...
    }

Finally pausing and resuming the reactor is also possible like this:

    this.data.pauseReactor();
    //...do work
    this.data.resumeReactor();

