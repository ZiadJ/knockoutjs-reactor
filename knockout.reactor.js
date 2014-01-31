// Observer plugin for Knockout http://knockoutjs.com/
// (c) Ziad Jeeroburkhan
// License: MIT (http://www.opensource.org/licenses/mit-license.php)
// Version 1.1.6 beta

ko.subscribable.fn['watch'] = function (target, options, evaluatorCallback, context) {
    /// <summary>
    ///     React to changes in a specific target object or function.
    /// </summary>
    /// <param name="target">
    ///     The object/method containing targeted subscribables or the subscribable itself.
    ///     Note that chaining the watch method to a subscribable with a false value as 
    ///     argument causes the latter to be ignored by eventual listeners.
    /// </param>
    /// <param name="options" type="object">
    ///     { depth: 1 } -> Listen to 1st level subscribables only(default).
    ///     { depth: 2 } -> Listen to nested subscribables down to the 2nd level.
    ///     { depth: -1 } -> Listen to all nested subscribables.
    ///     { exclude: [...] } -> Property or array of properties to be ignored.
    ///     { excludeMethods: true } -> Ignore all nested methods.
    ///     { excludeArrays: true } -> Ignore all nested arrays.
    ///     { beforeSubscribe: function(parents, child) {...} } -> Function called prior to creating a subscription. Returning false aborts the operation and ignores its children.
    ///     { makeObservable: true } -> Makes sure all fields are made into observables. A callback function can be used instead.
    ///     { makeObservable: function(parents, field, value) {...} } -> Function called prior to making a value an observable. Returning false leaves it as such.
    ///     { fieldNames: true } -> Inject the field name into each parent under the property '__fieldNames' for easy identification.
    ///     { fieldNames: 'SomeName' } -> Inject the field name into each parent under the property 'SomeName' for easy identification.
    /// </param>
    /// <param name="callback" type="function">
    ///     The callback function called when changes occur.
    /// </param>

    ko.watch(target, options, evaluatorCallback, this);

    return this;
}

ko['watch'] = function (target, options, evaluatorCallback, context) {
    /// <summary>
    ///     React to changes in a specific target object or function.
    /// </summary>
    /// <param name="target">
    ///     The object/method containing targeted subscribables or the subscribable itself.
    ///     Note that chaining the watch method to a subscribable with a false value as 
    ///     argument causes the latter to be ignored by eventual listeners.
    /// </param>
    /// <param name="options" type="object">
    ///     { depth: 1 } -> Listen to 1st level subscribables only(default).
    ///     { depth: 2 } -> Listen to nested subscribables down to the 2nd level.
    ///     { depth: -1 } -> Listen to all nested subscribables.
    ///     { exclude: [...] } -> Property or array of properties to be ignored.
    ///     { excludeMethods: true } -> Ignore all nested methods.
    ///     { excludeArrays: true } -> Ignore all nested arrays.
    ///     { beforeSubscribe: function(parents, child) {...} } -> Function called prior to creating a subscription. Returning false aborts the operation and ignores its children.
    ///     { makeObservable: true } -> Makes sure all fields are made into observables. A callback function can be used instead.
    ///     { makeObservable: function(parents, field, value) {...} } -> Function called prior to making a value an observable. Returning false leaves it as such.
    ///     { fieldNames: true } -> Inject the field name into each parent under the property '__fieldNames' for easy identification.
    ///     { fieldNames: 'SomeName' } -> Inject the field name into each parent under the property 'SomeName' for easy identification.
    /// </param>
    /// <param name="evaluatorCallback" type="function">
    ///     The evaluator or function used to update the value of the subscribable during changes.
    /// </param>

    // Setting the target as false prevents it from being watched later on.
    if (target === false || target === true)
        target.watchable = target;

    if (target.watchable === false)
        return;

    if (typeof evaluatorCallback !== 'function') {
        context = evaluatorCallback;
        evaluatorCallback = options;
        options = {};
    }

    var fieldNames = options.fieldNames === true ? '__fieldName' : options.fieldNames;

    // List of subscriptions nested within arrays that are not automatically disposed of by KnockoutJs.
    var volatileSubscriptions = [];

    var context = context || this;

    function watchChildren(child, parent, grandParents, keepTrack, notInParentList) {

        // grandParents being passed by reference let's make a new private array for the parent & grandparents.
        var parents = [].concat(grandParents ? grandParents : [], parent ? parent : []);

        if (options.depth === -1 || parents.length <= (options.depth === undefined ? 1 : options.depth)) {

            // Prevent circular referencing.
            if (parents.indexOf(child) > -1)
                return;

            if (options.exclude
                && typeof options.exclude === 'object'
                    ? ko.utils.arrayIndexOf(options.exclude, child) >= 0
                    : options.exclude === child)
                return;

            var isSubscribable = ko.isSubscribable(child),
                childType = Object.prototype.toString.call(isSubscribable ? child() : child);

            if (isSubscribable) {
                if (keepTrack === false || !options.beforeSubscribe || options.beforeSubscribe.call(context, parents, child) !== false) {
                    if (childType === '[object Array]') {
                        var previousValue;
                        child.subscribe(function (e) { previousValue = e.slice(0); }, undefined, 'beforeChange')
                        child.subscribe(function (e) {
                            if (child.watchEnabled !== false) {
                                var editScript = ko.utils.compareArrays(previousValue, e);
                                ko.utils.arrayForEach(editScript, function (item) {
                                    if (item.status === 'deleted' || item.status === 'added') {
                                        // Brand new or deleted array item.
                                        var returnValue = evaluatorCallback.call(context, parents, child, item);
                                        if (returnValue !== undefined)
                                            context(returnValue);

                                        // Watch or unwatch it.
                                        setTimeout(function () {
                                            watchChildren(item.value, notInParentList ? null : child, parents, item.status === 'added');
                                        }, 0);
                                    }
                                });
                                previousValue = undefined;
                            }
                        });
                        watchChildren(child(), notInParentList ? null : child, parents, true, true);
                    } else {
                        if (keepTrack === false) {
                            // Remove subscription.
                            var subscription = ko.utils.arrayFirst(volatileSubscriptions, function (item) {
                                return item.key === child;
                            });
                            if (subscription) {
                                subscription.value.dispose();
                                ko.utils.arrayRemoveItem(volatileSubscriptions, subscription);
                            }
                        } else {
                            // Add subscription.
                            var newSubscription = child.subscribe(function (e) {
                                if (child.watchEnabled !== false) {
                                    var returnValue = evaluatorCallback.call(context, parents, child);
                                    if (returnValue !== undefined)
                                        context(returnValue);
                                }
                            });
                            if (keepTrack === true)
                                volatileSubscriptions.push({ key: child, value: newSubscription });
                        }
                    }
                }

            } else if (childType === '[object Object]') {
                for (var property in child) {
                    var sub = child[property];
                    if (sub) {
                        if (options.makeObservable) {
                            // Make sure values and arrays are turned into observables.
                            var type = Object.prototype.toString.call(sub);
                            if (type !== '[object Function]' && type !== '[object Object]') {
                                if (options.makeObservable === true || options.makeObservable.call(context, parents, child, sub) !== false) {
                                    sub = child[property] = type === '[object Array]'
                                          ? ko.observableArray(sub)
                                          : ko.observable(sub);
                                }
                            }
                        }

                        watchChildren(sub, notInParentList ? null : child, parents, keepTrack);

                        if (fieldNames)
                            sub[fieldNames] = property;
                    }
                }

            } else if (childType === '[object Array]' && options.excludeArrays !== true) {
                for (var i = 0; i < child.length; i++)
                    watchChildren(child[i], notInParentList ? null : child, parents, keepTrack);

            } else if (childType === '[object Function]' && options.excludeMethods !== true) {
                ko.computed({
                    read: function () {
                        child(); // Evaluated for tracking purposes only.
                        if (child.watchEnabled !== false) {
                            // Use setTimeout to bypass change detection for evaluatorCallback value.
                            setTimeout(function () {
                                returnValue = evaluatorCallback.call(context, parents, child);
                                // Check that a return value exists then assign it to the context.
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

    watchChildren(target);

    return context;
}