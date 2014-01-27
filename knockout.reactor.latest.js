// Observer plugin for Knockout http://knockoutjs.com/
// (c) Ziad Jeeroburkhan
// License: MIT (http://www.opensource.org/licenses/mit-license.php)
// Version 1.1.3 beta

ko['watch'] = function (target, options, callback) {
    /// <summary>
    ///     React to changes in a specific target object or function.
    /// </summary>
    /// <param name="target">
    ///     The object/method containing targeted subscribables or the subscribable itself.
    ///     Note that chaining the watch method to a subscribable with a false value causes
    ///     the latter to be ignored by eventual listeners.
    /// </param>
    /// <param name="options" type="object">
    ///     { recurse: 1 } -> Listen to 1st level subscribables only(default).
    ///     { recurse: 2 } -> Listen to nested subscribables down to the 2nd level.
    ///     { recurse: true } -> Listen to all nested subscribables.
    ///     { exclude: [...] } -> Property or array of properties to be ignored.
    ///     { excludeMethods: true } -> Ignore all nested methods.
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
    ///     The object/method containing targeted subscribables or the subscribable itself.
    ///     Note that chaining the watch method to a subscribable with a false value causes
    ///     the latter to be ignored by eventual listeners.
    /// </param>
    /// <param name="options" type="object">
    ///     { recurse: 1 } -> Listen to 1st level subscribables only(default).
    ///     { recurse: 2 } -> Listen to nested subscribables down to the 2nd level.
    ///     { recurse: true } -> Listen to all nested subscribables.
    ///     { exclude: [...] } -> Property or array of properties to be ignored.
    ///     { excludeMethods: true } -> Ignore all nested methods.
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
    var trackedSubscriptions = []; // List of volatile subscriptions particularly occuring in arrays

    function watchChildren(child, recurse, keepTrack) {
        if (recurse === true || recurse >= 0) {

            if (options.exclude
                && typeof options.exclude === 'object'
                    ? ko.utils.arrayIndexOf(options.exclude, child) >= 0
                    : options.exclude === child)
                return;

            if (ko.isSubscribable(child)) {
                if (Object.prototype.toString.call(child()) === "[object Array]") {
                    var previousValue;
                    child.subscribe(function (e) { previousValue = e.slice(0); }, undefined, 'beforeChange')
                    child.subscribe(function (e) {
                        var editScript = ko.utils.compareArrays(previousValue, e);
                        ko.utils.arrayForEach(editScript, function (item) {
                            switch (item.status) {
                                case 'deleted':
                                    setTimeout(function () {
                                        watchChildren(item.value, recurse === true || Number(recurse) - 1, false); // Deleted array item - unwatch it
                                    }, 0);
                                    valueEvaluatorFunction.call(context, child, item.value, 'deleted');
                                    break;
                                case 'added':
                                    watchChildren(item.value, recurse === true || Number(recurse) - 1, true); // Brand new array item - watch it
                                    valueEvaluatorFunction.call(context, child, item.value, 'added');
                                    break;
                            }
                        });
                        previousValue = undefined;
                    });
                    watchChildren(child(), recurse === true || Number(recurse) - 1, true);

                } else {
                    if (keepTrack === false) {
                        var subscription = ko.utils.arrayFirst(trackedSubscriptions, function (item) {
                            return item.key === child;
                        });
                        if (subscription) {
                            subscription.value.dispose();
                            ko.utils.arrayRemoveItem(trackedSubscriptions, subscription);
                        }
                    } else {
                        var newSubscription = child.subscribe(function (e) {
                            if (!context.isPaused) {
                                var returnValue = valueEvaluatorFunction.call(context, target, child);
                                if (returnValue !== undefined)
                                    context(returnValue);
                            }
                        });
                        if (keepTrack === true)
                            trackedSubscriptions.push({ key: child, value: newSubscription });
                    }
                }

            } else if (typeof child === 'object') {
                for (var property in child)
                    watchChildren(child[property], recurse === true || Number(recurse) - 1, keepTrack);

            } else if (Object.prototype.toString.call(child) === "[object Array]") {
                for (var i = 0; i < child.length; i++)
                    watchChildren(child[i], recurse === true || Number(recurse) - 1, keepTrack);

            } else {
                if (options.excludeMethods !== true) {
                    ko.computed({
                        read: function () {
                            child(); // Evaluated for tracking purposes only.
                            if (!context.isPaused) {
                                // Bypass change detection for valueEvaluatorFunction during its evaluation.
                                setTimeout(function () {
                                    returnValue = valueEvaluatorFunction.call(context, target, child);
                                    // Check that a return value exists.
                                    if (returnValue !== undefined && returnValue !== context())
                                        context(returnValue);
                                }, 0);
                            }
                        }
                    , deferEvaluation: true
                    });
                }
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