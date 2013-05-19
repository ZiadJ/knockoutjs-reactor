// Observer plugin for Knockout http://knockoutjs.com/
// (c) Ziad Jeeroburkhan
// License: MIT (http://www.opensource.org/licenses/mit-license.php)
// Version 1.1.0 beta

ko['watch'] = function (target, options, callback) {
    /// <summary>
    ///     React to changes in a specific target object or function.
    /// </summary>
    /// <param name="target">
    ///     The target subscribable or object/function containing subscribables.
    ///     Note that the value false can be used to prevent a subscribable from being watched.
    /// </param>
    /// <param name="options" type="object">
    ///     { recurse: 1 } -> Listen to 1st level subscribables only(default).
    ///     { recurse: 2 } -> Listen to nested subscribables down to the 2nd level.
    ///     { recurse: true } -> Listen to all nested subscribables.
    ///     { exclude: [...] } -> Property or array of properties to be ignored.
    ///     This parameter is optional.
    /// </param>
    /// <param name="callback" type="function">
    ///     The callback function called when changes occur.
    /// </param>
    return ko.observable().watch(target, options, callback);
}
    
ko.subscribable.fn['watch'] = function (target, options, valueEvaluatorFunction) {
    /// <summary>
    ///     React to changes in a specific target object or function.
    /// </summary>
    /// <param name="target">
    ///     The target subscribable or object/function containing the subscribable(s).
    ///     Note that the value false can be used to prevent a subscribable from being watched.
    /// </param>
    /// <param name="options" type="object">
    ///     { recurse: 1 } -> Listen to 1st level subscribables only(default).
    ///     { recurse: 2 } -> Listen to nested subscribables down to the 2nd level.
    ///     { recurse: true } -> Listen to all nested subscribables.
    ///     { exclude: [...] } -> Property or array of properties to be ignored.
    ///     This parameter is optional.
    /// </param>
    /// <param name="valueEvaluatorFunction" type="function">
    ///     The evaluator or function used to update the value of the subscribable during changes.
    /// </param>

    // Setting the target as false prevents it from being watched later on.
    if (target === false || target === true)
        target.watchable = target;

    if (target.watchable === false)
        return;

    if (valueEvaluatorFunction == undefined) {
        valueEvaluatorFunction = options;
        options = {};
    }

    this.isPaused = false;
    var context = this;

    function watchChildren(targ, recurse) {
        if (recurse === true || recurse >= 0) {

            if (options.exclude && typeof options.exclude === 'object'
                ? ko.utils.arrayIndexOf(options.exclude, targ) >= 0
                : options.exclude === targ)
                return;

            if (ko.isSubscribable(targ)) {
                if (targ() instanceof Array) {
                    var previousValue;
                    targ.subscribe(function (e) { previousValue = e.slice(0); }, undefined, 'beforeChange');
                    targ.subscribe(function (e) {
                        var editScript = ko.utils.compareArrays(previousValue, e);
                        ko.utils.arrayForEach(editScript, function () {
                            switch (this.status) {
                                case 'deleted':
                                    // TODO: Deleted items need to be unsubscribed here if KnockoutJS doesn't already do it under the hood.
                                    valueEvaluatorFunction.call(context, target, targ, 'deleted');
                                    break;
                                case 'added':
                                    watchChildren(this.value, recurse === true || Number(recurse) -1);
                                    valueEvaluatorFunction.call(context, target, targ, 'added');
                                    break;
                            }
                        });
                        previousValue = undefined;
                    });

                    watchChildren(targ(), recurse === true || Number(recurse) - 1);

                } else {
                    targ.subscribe(function (targetValue) {
                        if (!context.isPaused) {
                            var returnValue = valueEvaluatorFunction.call(context, target, targ);
                            if (returnValue !== undefined)
                                context(returnValue);
                        }
                    });
                }

            } else if (typeof targ === 'object') {
                for (var property in targ)
                    watchChildren(targ[property], recurse === true || Number(recurse) - 1);

            } else if (targ instanceof Array) {
                for (var i = 0; i < targ.length; i++)
                    watchChildren(targ[i], recurse === true || Number(recurse) - 1);

            } else {
                ko.computed(function () {
                    var targetValue = targ();
                    if (!context.isPaused) {
                        // Bypass change detection for valueEvaluatorFunction during its evaluation.
                        setTimeout(function () {
                            returnValue = valueEvaluatorFunction.call(context, target, targ);
                            // Check that a return value exists.
                            if (returnValue !== undefined && returnValue !== context())
                                context(returnValue);
                        }, 0);
                    }
                });
            }
        }
    }

    watchChildren(target, options.recurse || 1);

    this.pauseWatch = function () {
        context.isPaused = true;
    }
    this.resumeWatch = function () {
        context.isPaused = false;
    }

    return this;
}
