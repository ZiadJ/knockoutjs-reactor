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
    ///     Note that chaining the watch method to a subscribable with a false value causes
    ///     the latter to be ignored by eventual listeners.
    /// </param>
    /// <param name="options" type="object">
    ///     { depth: 1 } -> Listen to 1st level subscribables only(default).
    ///     { depth: 2 } -> Listen to nested subscribables down to the 2nd level.
    ///     { depth: -1 } -> Listen to all nested subscribables.
    ///     { exclude: [...] } -> Property or array of properties to be ignored.
    ///     { excludeMethods: true } -> Ignore all nested methods.
    ///     { excludeArrays: true } -> Ignore all nested methods.
    ///     { excludeObjects: true } -> Ignore all nested methods.
    ///     { beforeSubscribe: function(e) {...} } -> Function called prior to creating a subscription. Returning false prevents it and applies to its children.
    ///     { makeObservable: true } -> Makes sure all fields are made into observables. A callback function can be used instead.
    ///     { makeObservable: function(parents, field, value) {...} } -> Function called prior to making a value an observable. Returning false leaves it as such.
    ///     { fieldNames: true } -> Inject the field name into each parent as '__fieldNames' for easy identification.
    ///     { fieldNames: 'SomeName' } -> Inject the field name into each parent as 'SomeName' for easy identification.
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
    ///     Note that chaining the watch method to a subscribable with a false value causes
    ///     the latter to be ignored by eventual listeners.
    /// </param>
    /// <param name="options" type="object">
    ///     { depth: 1 } -> Listen to 1st level subscribables only(default).
    ///     { depth: 2 } -> Listen to nested subscribables down to the 2nd level.
    ///     { depth: -1 } -> Listen to all nested subscribables.
    ///     { exclude: [...] } -> Property or array of properties to be ignored.
    ///     { excludeMethods: true } -> Ignore all nested methods.
    ///     { excludeArrays: true } -> Ignore all nested methods.
    ///     { excludeObjects: true } -> Ignore all nested methods.
    ///     { beforeSubscribe: function(e) {...} } -> Function called prior to creating a subscription. Returning false prevents it and applies to its children.
    ///     { makeObservable: true } -> Makes sure all fields are made into observables. A callback function can be used instead.
    ///     { makeObservable: function(parents, field, value) {...} } -> Function called prior to making a value an observable. Returning false leaves it as such.
    ///     { fieldNames: true } -> Inject the field name into each parent as '__fieldNames' for easy identification.
    ///     { fieldNames: 'SomeName' } -> Inject the field name into each parent as 'SomeName' for easy identification.
    /// </param>
    /// <param name="evaluatorCallback" type="function">
    ///     The evaluator or function used to update the value of the subscribable during changes.
    /// </param>

    // Setting the target as false prevents it from being watched later on.
    if (target === false || target === true)
        target.watchable = target;

    if (target.watchable === false)
        return;

    if (evaluatorCallback == undefined || typeof evaluatorCallback === 'object') {
        context = evaluatorCallback;
        evaluatorCallback = options;
        options = {};
    }

    var fieldNames = options.fieldNames === true ? '__fieldName' : options.fieldNames;

    // List of subscriptions nested within arrays that are not automatically disposed of by KnockoutJs.
    var volatileSubscriptions = [];

    var context = context || this;

    function watchChildren(child, parent, rootParents, keepTrack, notInParentList) {

        // rootParrents being passed by reference lets make a new private array from it.
        var parents = [];
        if (rootParents)
            parents = parents.concat(rootParents);
        if (parent)
            parents.push(parent);

        if (options.depth === -1 || parents.length <= (options.depth === undefined ? 1 : options.depth)) {

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
                if (options.beforeSubscribe && options.beforeSubscribe.call(parents, target, child) === false)
                    return;

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
                        var subscription = ko.utils.arrayFirst(volatileSubscriptions, function (item) {
                            return item.key === child;
                        });
                        if (subscription) {
                            subscription.value.dispose();
                            ko.utils.arrayRemoveItem(volatileSubscriptions, subscription);
                        }
                    } else {
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
            } else if (childType === '[object Object]') {
                for (var property in child) {
                    var sub = child[property];
                    if (sub) {
                        var simpleType = watchChildren(sub, notInParentList ? null : child, parents, keepTrack);

                        // Whenever the makeObservable option is set to true or has a callback value
                        // and contains a simple value or array turn the field into an observable.
                        if (simpleType && options.makeObservable) {
                            if (options.makeObservable === true || options.makeObservable.call(context, parents, child, sub) !== false) {
                                if (simpleType === '[object Array]')
                                    child[property] = ko.observableArray(sub);
                                else
                                    child[property] = ko.observable(sub);
                            }

                            watchChildren(child[property], notInParentList ? null : child, parents, keepTrack);
                        }

                        if (fieldNames)
                            child[property][fieldNames] = property;
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
                            // Bypass change detection for evaluatorCallback during its evaluation.
                            setTimeout(function () {
                                returnValue = evaluatorCallback.call(context, parents, child);
                                // Check that a return value exists.
                                if (returnValue !== undefined && returnValue !== context())
                                    context(returnValue);
                            }, 0);
                        }
                    }
                , deferEvaluation: true
                });
            }

            return childType;
        }
    }

    watchChildren(target);

    return context;
}