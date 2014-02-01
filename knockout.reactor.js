// Deep observer plugin for Knockout http://knockoutjs.com/
// (c) Ziad Jeeroburkhan
// License: MIT (http://www.opensource.org/licenses/mit-license.php)
// Version 1.1.8 beta

ko.subscribable.fn['watch'] = function (target, options, evaluatorCallback, context) {
    /// <summary>
    ///     Track and manage changes within a specific target object down to any given level. 
    /// </summary>
    /// <param name="target">
    ///     An object or function containing targeted subscribables or the subscribable itself.
    ///     Note that chaining a watch method with a 'false' argument to a subscribable will
    ///     cancel any tracking on it.
    /// </param>
    /// <param name="options" type="object">
    ///     { depth: 1 } -> Track 1st level subscribables(default).<br/>
    ///     { depth: 2 } -> Track all nested subscribables down to the 2nd level.<br/>
    ///     { depth: -1 } -> Track all nested subscribables.<br/>
    ///     { exclude: [...] } -> Property or array of properties to be ignored.<br/>
    ///     { excludeArrays: true } -> Ignore all nested arrays.<br/>
    ///     { beforeSubscribe: function(parents, child) {...} } -> Function called prior to creating a subscription. Returning false aborts the operation and ignores its children.<br/>
    ///     { makeObservable: true } -> Makes sure all fields are made into observables. A callback function can be used instead.<br/>
    ///     { makeObservable: function(parents, field, value) {...} } -> Function called prior to making a value an observable. Returning false leaves it as such.<br/>
    ///     { tagParents: true } -> Tag each parent with their name under the property '__fieldName' for identification purposes.<br/>
    ///     { tagParents: 'SomePropertyName' } -> Tag each parent their name under the property 'SomePropertyName' for identification purposes.<br/>
    /// </param>
    /// <param name="evaluatorCallback" type="function">
    ///     The  callback function called during changes. Any return value is assigned to the target.
    /// </param>

    // Setting the target as false prevents it from being watched later on.
    if (target === false || target === true) {
        options = options || {};
        options.enabled = target;
        target = this;
    }

    ko.watch(target, options, evaluatorCallback, context || this);

    return this;
}

ko['watch'] = function (target, options, evaluatorCallback, context) {
    /// <summary>
    ///     Track and manage changes within a specific target object down to any given level.
    /// </summary>
    /// <param name="target">
    ///     An object or function containing targeted subscribables or the subscribable itself.
    ///     Note that chaining a watch method with a 'false' argument to a subscribable will
    ///     cancel any tracking on it.
    /// </param>
    /// <param name="options" type="object">
    ///     { depth: 1 } -> Track 1st level subscribables only(default).<br/>
    ///     { depth: 2 } -> Track all nested subscribables down to the 2nd level.<br/>
    ///     { depth: -1 } -> Track all nested subscribables.<br/>
    ///     { exclude: [...] } -> Property or array of properties to be ignored.<br/>
    ///     { excludeArrays: true } -> Ignore all nested arrays.<br/>
    ///     { beforeSubscribe: function(parents, child) {...} } -> Function called prior to creating a subscription. Returning false aborts the operation and ignores its children.<br/>
    ///     { makeObservable: true } -> Makes sure all fields are made into observables. A callback function can be used instead.<br/>
    ///     { makeObservable: function(parents, field, value) {...} } -> Function called prior to making a value an observable. Returning false leaves it as such.<br/>
    ///     { tagParents: true } -> Tag each parent with their name under the property '__fieldName' for identification purposes.<br/>
    ///     { tagParents: 'SomePropertyName' } -> Tag each parent their name under the property 'SomePropertyName' for identification purposes.<br/>
    /// </param>
    /// <param name="evaluatorCallback" type="function">
    ///     The callback function called during changes.
    /// </param>

    if (typeof options === 'function') {
        context = evaluatorCallback;
        evaluatorCallback = options;
        options = {};
    }

    var context = context || this;

    var tagName = options.tagParents === true ? '__fieldName' : options.tagParents;

    function watchChildren(child, parent, grandParents, keepTrack, notInParentList) {

        // 'grandParents' being passed by reference lets make a new private array for it before adding 'parent'.
        var parents = [].concat(grandParents ? grandParents : [], parent ? parent : []);

        if (options.depth === -1 || parents.length <= (options.depth === undefined ? 1 : options.depth)) {

            // Setting the target as false prevents it from being watched later on.
            if (options.enabled === false || options.enabled === true)
                child.watchEnabled = options.enabled;

            // Byass watch disabled objects.
            if (child.watchEnabled === false)
                return;

            // Bypass circular references.
            if (parents.indexOf(child) > -1)
                return;

            // Bypass excluded objects.
            if (options.exclude
                && typeof options.exclude === 'object'
                    ? ko.utils.arrayIndexOf(options.exclude, child) > -1
                    : options.exclude === child)
                return;

            var isSubscribable = ko.isSubscribable(child),
                childType = Object.prototype.toString.call(isSubscribable ? child() : child);

            if (isSubscribable) {
                if (keepTrack === false || !options.beforeSubscribe || options.beforeSubscribe.call(context, parents, child) !== false) {
                    if (childType === '[object Array]') {
                        child.subscribe(function (changes) {
                            ko.utils.arrayForEach(changes, function (item) {
                                // Brand new or deleted array item.
                                var returnValue = evaluatorCallback.call(context, parents, child, item);
                                if (returnValue !== undefined)
                                    context(returnValue);

                                // Watch or unwatch it.
                                setTimeout(function () {
                                    watchChildren(item.value, (notInParentList ? null : child), parents, item.status === 'added');
                                }, 0);
                            });
                        }, undefined, 'arrayChange');

                        // Watch the underlying array without adding it to the parent list.
                        watchChildren(child(), (notInParentList ? null : child), parents, keepTrack, true);
                        return true;

                    } else {
                        if (keepTrack === false) {
                            // Remove subscription.
                            ko.utils.arrayForEach(child._subscriptions.change, function (subscription) {
                                subscription.dispose();
                            });
                        } else {
                            // Add subscription if it's not just being re-enabled.
                            if (options.enabled === true && child.watchEnabled === false)
                                return;

                            child.subscribe(function () {
                                if (child.watchEnabled !== false) {
                                    var returnValue = evaluatorCallback.call(context, parents, child);
                                    if (returnValue !== undefined)
                                        context(returnValue);
                                }
                            }, undefined, 'change');
                        }
                    }
                }

            } else if (childType === '[object Object]') {
                ko.utils.objectForEach(child, function (property, sub) {
                    if (options.makeObservable) {
                        // Turn simple objects and arrays into observables.
                        var type = Object.prototype.toString.call(sub);
                        if (type !== '[object Function]' && type !== '[object Object]') {
                            if (options.makeObservable === true || options.makeObservable.call(context, parents, child, sub) !== false) {
                                sub = child[property] = type === '[object Array]'
                                    ? ko.observableArray(sub)
                                    : ko.observable(sub);
                            }
                        }
                    }

                    var isParent = watchChildren(sub, (notInParentList ? null : child), parents, keepTrack);

                    if (isParent && tagName)
                        sub[tagName] = property;
                });

                return true;

            } else if (childType === '[object Array]' && options.excludeArrays !== true) {
                for (var i = 0; i < child.length; i++)
                    watchChildren(child[i], (notInParentList ? null : child), parents, keepTrack);

                return true;
            }
        }
    }

    if (typeof target === 'function' && !ko.isSubscribable(target)) {
        // Target is a function - track it via computed.
        ko.computed(function () {
            target(); // Evaluated for tracking purposes only.
            if (target.watchEnabled !== false) {
                // Use setTimeout to bypass change detection for evaluatorCallback value.
                setTimeout(function () {
                    returnValue = evaluatorCallback.call(context, [], target);
                    // Check that a return value exists then assign it to the context.
                    if (returnValue !== undefined)
                        context(returnValue);
                }, 0);
            }
        });
    } else {
        watchChildren(target);
    }

    return context;
}
