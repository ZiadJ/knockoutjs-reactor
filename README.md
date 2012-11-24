KO-Reactor
===========

A neater way to add dependencies to any KnockoutJs subscribable.

<b>Usage:</b>

    this.myProperty = ko.observable().watch(targetObjectOrFunction, valueEvaluatorFunction);

or

    this.myProperty = ko.observable().watch(targetObjectOrFunction, options, valueEvaluatorFunction);

The target parameter supports any subscribable or function/object containing the targeted subscribables. <b>valueEvaluatorFunction</b> is
the response function which aquires two parameters the first being the target itself and the second being the child property 
that was modified. Its return value is used to update the subscribable to which it is chained.

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
    
The code above creates an observable <b>this.data</b> that reacts to changes within <b>this.params</> within one line of code. 
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

    this.data = ko.observable().watch({ this.params.name(), this.params.surname }, function (params, trigger) {
        ...
    }

To create a fully recursive reactor we can pass in <b>{ recursive: true }</b> as the options parameter:

    this.data = ko.observable().watch(this.params, { recurse: true } , function (params, trigger) {
        ...
    }
    
Note that no additional listeners are created for subcribables used within the evaluator function as it might be the case
with the <b>ko.computed</b> function.

Finally pausing and resuming our reactor can be done like so:

    this.data.pauseWatch();
    //...do work
    this.data.resumeWatch();
