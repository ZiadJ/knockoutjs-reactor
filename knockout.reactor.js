// Deep observer plugin for Knockout http://knockoutjs.com/
// (c) Ziad Jeeroburkhan
// License: MIT (http://www.opensource.org/licenses/mit-license.php)
// Version 1.1.9 beta

ko.subscribable.fn['watch'] = function (options, evaluatorCallback, context) {
    /// <summary>
    ///     Track and manage changes within the chained observable down to any given level. 
    /// </summary>
    /// <param name="options" type="object">
    ///     false -> Disables tracking on the chained observable.
    ///     { depth: 1 } -> Track 1st level subscribables only(default).<br/>
    ///     { depth: 2 } -> Track all nested subscribables down to the 2nd level.<br/>
    ///     { depth: -1 } -> Track all nested subscribables.<br/>
    ///     { hide: [...] } -> Property or array of properties to be ignored.<br/>
    ///     { hideArrays: true } -> Ignore all nested arrays.<br/>
    ///     { hideWrappedValues: true } -> Ignore observables wrapped under a parent observable.<br/>
    ///     { beforeWatch: function(parents, child) {...} } -> Function called prior to creating a subscription. Returning false aborts the operation and ignores its children.<br/>
    ///     { wrap: true } -> Makes sure all fields are wrapped as observables.<br/>
    ///     { beforeWrap: function(parents, field, value) {...} } -> Function called prior to wrapping a value into an observable. Returning false leaves it as such.<br/>
    ///     { tagParentsWithName: true } -> Add the property '_fieldName' under each parent for easy idenfication.<br/>
    ///     { keepOldValues: 3 } -> Keep the last three values for each subscribable under the property 'oldValues'.<br/>
    /// </param>
    /// <param name="evaluatorCallback" type="function">
    ///     The  callback function called during changes. Any return value is assigned to the chained observable.
    /// </param>

    // Setting the target as false prevents it from being watched later on.
    if (options === false || options === true)
        options = { enabled: options };

    ko.watch(this, options, evaluatorCallback, context);

    return this;
}

ko['watch'] = function (target, options, evaluatorCallback, context) {
    /// <summary>
    ///     Track and manage changes within a specific target object down to any given level.
    /// </summary>
    /// <param name="target">
    ///     An object or function containing targeted subscribables or the subscribable itself.
    /// </param>
    /// <param name="options" type="object">
    ///     { depth: 1 } -> Track 1st level subscribables only(default).<br/>
    ///     { depth: 2 } -> Track all nested subscribables down to the 2nd level.<br/>
    ///     { depth: -1 } -> Track all nested subscribables.<br/>
    ///     { hide: [...] } -> Property or array of properties to be ignored.<br/>
    ///     { hideArrays: true } -> Ignore all nested arrays.<br/>
    ///     { hideWrappedValues: true } -> Ignore observables wrapped under a parent observable.<br/>
    ///     { beforeWatch: function(parents, child) {...} } -> Function called prior to creating a subscription. Returning false aborts the operation and ignores its children.<br/>
    ///     { wrap: true } -> Makes sure all fields are wrapped as observables.<br/>
    ///     { beforeWrap: function(parents, field, value) {...} } -> Function called prior to wrapping a value into an observable. Returning false leaves it as such.<br/>
    ///     { tagParentsWithName: true } -> Add the property '_fieldName' under each parent for easy idenfication.<br/>
    ///     { keepOldValues: 3 } -> Keep the last three values for each subscribable under the property 'oldValues'.<br/>
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

    function watchChildren(child, parent, grandParents, keepTrack, notInParentList) {

        if (child && options.depth !== 0 && (options.depth === -1 || grandParents.length < (options.depth || 1))) {

            // Setting the target as false prevents it from being watched later on.
            if (options.enabled === false || options.enabled === true)
                child.watchEnabled = options.enabled;

            // Ignore watch-disabled objects.
            if (child.watchEnabled === false)
                return;

            // Bypass circular references.
            if (child === parent || grandParents.indexOf(child) > -1)
                return;

            // Merge parents. Using a fresh array to avoid it being referenced within the next recursion.
            var parents = [].concat(grandParents, parent && parent !== target ? parent : []);

            // Ignore user specified hidden objects and their children if any.
            if (options.hide)
                if (typeof options.hide === 'object'
                    ? options.hide === child
                    : ko.utils.arrayIndexOf(options.hide, child) > -1)
                    return;

            if (ko.isSubscribable(child)) {
                if (evaluatorCallback) {
                    if (keepTrack === false || !options.beforeWatch || options.beforeWatch.call(context, parents, child) !== false) {
                        if (typeof child.pop === 'function') {
                            // Child is an observable array.
                            child.subscribe(function (changes) {
                                ko.utils.arrayForEach(changes, function (item) {
                                    // Brand new or deleted array item.
                                    var returnValue = evaluatorCallback.call(context, parents, child, item);
                                    if (returnValue !== undefined)
                                        context(returnValue);

                                    // Watch new or unwatch deleted items.
                                    setTimeout(function () {
                                        watchChildren(item.value, (notInParentList ? null : child), parents, item.status === 'added');
                                    }, 0);
                                });
                            }, undefined, 'arrayChange');

                            watchChildren(child(), (notInParentList ? null : child), parents, keepTrack, true);

                            return true;

                        } else {
                            if (keepTrack === false) {
                                var subsc = child._subscriptions;

                                // An array item was removed. Clean up all associated change subscriptions.
                                for (var i = 0; i < subsc.change ? subsc.change.length : 0; i++)
                                    subsc.change[i].dispose();

                                // Clean up any before change subscriptions used for tracking old values.
                                if (options.keepOldValues > 0)
                                    for (var i = 0; i < subsc.beforeChange ? subsc.beforeChange.length : 0; i++)
                                        subsc.beforeChange[i].dispose();

                                watchChildren(child(), (notInParentList ? null : child), parents, false, true)

                            } else {

                                if (options.enabled === true && child.watchEnabled === false)
                                    // Watch is just being re-enabled. Avoid subscribing twice.
                                    return;

                                if (options.keepOldValues > 0) {
                                    // Add old value to history list before every update.
                                    child.subscribe(function (oldValue) {
                                        var values = (child['oldValues']
                                            ? child['oldValues']
                                            : child['oldValues'] = []);

                                        values.unshift(oldValue);

                                        while (values.length > options.keepOldValues)
                                            values.pop();
                                    }, null, 'beforeChange');
                                }

                                child.subscribe(function () {
                                    if (child.watchEnabled !== false) {
                                        var returnValue = evaluatorCallback.call(context, parents, child);
                                        if (returnValue !== undefined)
                                            context(returnValue);
                                    }
                                }, null, 'change');

                                if (options.hideWrappedValues !== true)
                                    watchChildren(child(), (notInParentList ? null : child), parents);
                            }
                        }
                    }
                }

            } else {
                switch (Object.prototype.toString.call(child)) {
                    case '[object Object]':
                        ko.utils.objectForEach(child, function (property, sub) {
                            if (sub) {

                                if (options.wrap) {
                                    // Convert simple objects or arrays into their observable counterpart.
                                    var type = Object.prototype.toString.call(sub);
                                    if (type !== '[object Function]' && type !== '[object Object]') {
                                        if (options.wrap === true) {
                                            if (!options.beforeWrap || options.beforeWrap.call(context, parents, child, sub) !== false) {
                                                sub = child[property] = type === '[object Array]'
                                                    ? ko.observableArray(sub)
                                                    : ko.observable(sub);
                                            }
                                        }
                                    }
                                }

                                var subHasChildren = watchChildren(sub, (notInParentList ? null : child), parents, keepTrack);

                                if (subHasChildren && options.tagParentsWithName === true && !sub['_fieldName'])
                                    sub['_fieldName'] = property;
                            }
                        });
                        return true;

                    case '[object Array]':
                        if (options.hideArrays !== true)
                            for (var i = 0; i < child.length; i++)
                                watchChildren(child[i], (notInParentList ? null : child), parents, keepTrack);
                        return true;
                }
            }
        }
    }

    if (typeof target === 'function' && !ko.isSubscribable(target)) {
        // Target is a non-subscribable function. Let's track it.
        ko.computed(function () {
            // Evaluate the function to activate tracking.
            target();
            if (target.watchEnabled !== false) {
                // Use setTimeout to bypass change detection for the evaluatorCallback value.
                setTimeout(function () {
                    returnValue = evaluatorCallback.call(context, [], target);
                    // Check that a return value exists and assign it to the context.
                    if (returnValue !== undefined)
                        context(returnValue);
                }, 0);
            }
        });
    } else {
        watchChildren(target, null, []);
    }
}