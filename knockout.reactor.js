// Deep observer plugin for Knockout http://knockoutjs.com/
// (c) Ziad Jeeroburkhan
// License: MIT (http://www.opensource.org/licenses/mit-license.php)
// Version 1.2.6 beta

ko.subscribable.fn['watch'] = function (targetOrEvaluatorCallback, options, evaluatorCallback, context) {
    /// <summary>
    ///     Track and manage changes within the chained observable down to any given level. 
    /// </summary>
    /// <param name="options" type="object">
    ///     false -> Disables tracking on the chained observable.
    ///     { depth: 2 } -> Track all nested subscribables down to the 2nd level(default is 1).<br/>
    ///     { depth: -1 } -> Track all nested subscribables.<br/>
    ///     { hide: [...] } -> Property or array of properties to be ignored.<br/>
    ///     { hideArrays: true } -> Ignore all nested arrays.<br/>
    ///     { hideWrappedValues: true } -> Ignore observables wrapped under yet another parent observable.<br/>
    ///     { mutable: true } -> Dynamically adapt to changes within the target structure(provided they're made through a subscribable).<br/>
    ///     { watchedOnly: true } -> Watch only subscribables with .watch(true).<br/>
    ///     { beforeWatch: function(parents, child) {...} } -> Function called prior to creating a subscription. Returning false aborts the operation and ignores its children.<br/>
    ///     { wrap: true } -> Makes sure all fields are wrapped into observables. This happens on the fly for new array items(or child objects when mutable is set to true).<br/>
    ///     { beforeWrap: function(parents, field, value) {...} } -> Function called prior to wrapping a value into an observable. Returning false leaves it as it is.<br/>
    ///     { tagParentsWithName: true } -> Add the property '_fieldName' under each parent for easy identification.<br/>
    ///     { keepOldValues: 3 } -> Keep the last three values for each subscribable under the property 'oldValues'.<br/>
    /// </param>
    /// <param name="evaluatorCallback" type="function">
    ///     The  callback function called during changes. Any return value is assigned to the chained observable.
    /// </param>

    var targetType = typeof targetOrEvaluatorCallback;

    if (targetType === 'boolean' || targetType === 'undefined') {
        // Turn on or off the watcher for the specified target along with any of its children.
        ko.watch(this, { enabled: targetOrEvaluatorCallback !== false });
    } else if (targetType === 'function' && !ko.isSubscribable(targetOrEvaluatorCallback)) {
        // Target the chained subscribable itself if no target subscribable or object was passed.
        ko.watch(this, options || {}, targetOrEvaluatorCallback, context || this);
    } else {
        ko.watch(targetOrEvaluatorCallback, options, evaluatorCallback, context || this);
    }

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
    ///     { depth: 2 } -> Track all nested subscribables down to the 2nd level(default is 1).<br/>
    ///     { depth: -1 } -> Track all nested subscribables.<br/>
    ///     { hide: [...] } -> Property or array of properties to be ignored.<br/>
    ///     { hideArrays: true } -> Ignore all nested arrays.<br/>
    ///     { hideWrappedValues: true } -> Ignore observables wrapped under yet another parent observable.<br/>
    ///     { mutable: true } -> Dynamically adapt to changes within the target structure(provided they're made through a subscribable).<br/>
    ///     { watchedOnly: true } -> Watch only subscribables with .watch(true).<br/>
    ///     { beforeWatch: function(parents, child) {...} } -> Function called prior to creating a subscription. Returning false aborts the operation and ignores its children.<br/>
    ///     { wrap: true } -> Makes sure all fields are wrapped into observables. This happens on the fly for new array items(or child objects when mutable is set to true).<br/>
    ///     { beforeWrap: function(parents, field, value) {...} } -> Function called prior to wrapping a value into an observable. Returning false leaves it as it is.<br/>
    ///     { tagParentsWithName: true } -> Add the property '_fieldName' under each parent for easy identification.<br/>
    ///     { keepOldValues: 3 } -> Keep the last three values for each subscribable under the property 'oldValues'.<br/>
    /// </param>
    /// <param name="evaluatorCallback" type="function">
    ///     The callback function called during changes.
    /// </param>

    if (typeof options === 'function') {
        context = context || evaluatorCallback;
        evaluatorCallback = options;
        options = {};
    }

    var context = context || this;

    function watchChildren(child, parent, grandParents, untrack, keepOffParentList) {

        if (child && options.depth !== 0 && (options.depth === -1 || grandParents.length < (options.depth || 1))) {

            // Proceed on watched children only when in watched-only mode.
            if (options.watchedOnly && !child.watchable && child != target)
                return;

            // Setting the target as false prevents it from being watched later on.
            if (options.enabled === false || options.enabled === true)
                child.watchable = options.enabled;

            // Ignore watch-disabled objects.
            if (child.watchable === false)
                return;

            // Bypass circular references.
            if (child === parent || ko.utils.arrayIndexOf(grandParents, child) > -1)
                return;

            // Merge parents. Using a fresh array so it is not referenced in the next recursion.
            var parents = [].concat(grandParents, parent && parent !== target ? parent : []);

            // Ignore hidden objects. Also applies to any of their children.
            if (options.hide)
                if (typeof options.hide === 'object'
                    ? options.hide === child
                    : ko.utils.arrayIndexOf(options.hide, child) > -1)
                    return;

            if (ko.isSubscribable(child)) {
                if (evaluatorCallback) {
                    if (untrack === true || !options.beforeWatch || options.beforeWatch.call(context, parents, child) !== false) {
                        if (typeof child.pop === 'function') {
                            // Child is an observable array. Watch all item changes within it.
                            child.subscribe(function (changes) {
                                ko.utils.arrayForEach(changes, function (item) {
                                    // Deleted, brand new or moved item.
                                    var returnValue = evaluatorCallback.call(context, parents, child, item);
                                    if (returnValue != undefined)
                                        context(returnValue);

                                    // Unwatch or watch it if it's not just being moved.
                                    if (item.moved == undefined) {
                                        setTimeout(function () {
                                            watchChildren(item.value, (keepOffParentList ? null : child), parents, item.status === 'deleted');
                                        }, 0);
                                    }
                                });
                            }, undefined, 'arrayChange');

                            watchChildren(child(), (keepOffParentList ? null : child), parents, untrack, true);

                            return true;

                        } else {
                            if (untrack === true) {
                                // A subscribable was removed from an array or mutable object.
                                // Clean up all change subscriptions associated with it.
                                var subsc = child._subscriptions;
                                for (var i = 0; i < subsc.change ? subsc.change.length : 0; i++)
                                    subsc.change[i].dispose();

                                if (options.keepOldValues > 0)
                                    // Also clean up any before-change subscriptions used for tracking old values.
                                    for (var i = 0; i < subsc.beforeChange ? subsc.beforeChange.length : 0; i++)
                                        subsc.beforeChange[i].dispose();

                                watchChildren(child(), (keepOffParentList ? null : child), parents, true, true)

                            } else {

                                if (options.enabled === true && child.watchable === false)
                                    // Only waking up an existing watcher. Let's not add another.
                                    return;

                                if (options.keepOldValues > 0 || options.mutable) {
                                    child.subscribe(function (oldValue) {
                                        if (options.keepOldValues > 0) {
                                            // Add old value to history list before every update.
                                            var values = (child['oldValues']
                                                ? child['oldValues']
                                                : child['oldValues'] = []);

                                            values.unshift(oldValue);

                                            while (values.length > options.keepOldValues)
                                                values.pop();
                                        }

                                        if (options.mutable && typeof oldValue === 'object')
                                            // Clean up all subscriptions for the old child object.
                                            watchChildren(oldValue, (keepOffParentList ? null : child), parents, true, true);

                                    }, null, 'beforeChange');
                                }

                                child.subscribe(function () {
                                    if (child.watchable !== false) {
                                        var returnValue = evaluatorCallback.call(context, parents, child);
                                        if (returnValue != undefined)
                                            context(returnValue);

                                        if (options.mutable && typeof child() === 'object')
                                            // Watch down the new child object tree.
                                            watchChildren(child(), (keepOffParentList ? null : child), parents);
                                    }
                                }, null, 'change');

                                if (options.hideWrappedValues !== true)
                                    watchChildren(child(), (keepOffParentList ? null : child), parents);
                            }
                        }
                    }
                }

            } else {
                switch (Object.prototype.toString.call(child)) {
                    case '[object Object]':
                        ko.utils.objectForEach(child, function (property, sub) {
                            if (options.wrap) {
                                // Wrap simple objects and arrays into observables.
                                var type = Object.prototype.toString.call(sub);
                                if (type !== '[object Function]' && type !== '[object Object]') {
                                    if (!options.beforeWrap || options.beforeWrap.call(context, parents, child, sub) !== false) {
                                        sub = child[property] = type === '[object Array]'
                                            ? ko.observableArray(sub)
                                            : ko.observable(sub);
                                    }
                                }
                            }

                            var subHasChildren = watchChildren(sub, (keepOffParentList ? null : child), parents, untrack);

                            if (subHasChildren && options.tagParentsWithName === true && !sub['_fieldName'])
                                sub['_fieldName'] = property;
                        });
                        return true;

                    case '[object Array]':
                        if (options.hideArrays !== true)
                            for (var i = 0; i < child.length; i++)
                                watchChildren(child[i], (keepOffParentList ? null : child), parents, untrack);
                        return true;
                }
            }
        }
    }

    // Use a computed when targeting a non-watchable function.
    if (typeof target === 'function' && !ko.isSubscribable(target))
        return ko.computed(target, evaluatorCallback, options);

    watchChildren(target, null, []);
}
