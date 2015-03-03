// Deep observer plugin for Knockout http://knockoutjs.com/
// (c) Ziad Jeeroburkhan
// License: MIT (http://www.opensource.org/licenses/mit-license.php)
// Version 1.3.4 beta

ko.subscribable.fn['watch'] = function (targetOrCallback, options, evaluatorCallback, context, unwatch) {
    /// <summary>
    ///     Track and manage changes within the chained observable down to any given level. 
    /// </summary>
    /// <param name="targetOrCallback">
    ///      The subscription callback function or an object containing the subscribables to be watched.
    /// </param>
    /// <param name="options" type="object">
    ///     false -> Disables tracking on the chained observable.
    ///     { depth: 2 } -> Track all nested subscribables down to the 2nd level(default is 1).<br/>
    ///     { depth: -1 } -> Track all nested subscribables.<br/>
    ///     { hide: [...] } -> Property or array of properties to be ignored.<br/>
    ///     { hideArrays: true } -> Ignore all nested arrays.<br/>
    ///     { hideWrappedValues: true } -> Ignore observables wrapped under yet another parent observable.<br/>
    ///     { mutable: true } -> Dynamically adapt to changes made to the target structure through any subscribable.<br/>
    ///     { watchedOnly: true } -> Watch only subscribables tagged with a .watch().<br/>
    ///     { beforeWatch: function(parents, child) {...} } -> Function called prior to creating a subscription. Returning false aborts the operation and ignores its children.<br/>
    ///     { wrap: true } -> Wrap all fields into observables. This happens on the fly for new array items(or child objects when mutable is set to true).<br/>
    ///     { beforeWrap: function(parents, field, value) {...} } -> Function called prior to wrapping a value into an observable. Returning false leaves it as it is.<br/>
    ///     { tagFields: true } -> Add the property '_fieldName' under each property for identification purposes.<br/>
    ///     { tagFields: 'parentsOnly' } -> Same as above except that it is limited to parent properties only.<br/>
    ///     { oldValues: 3 } -> Keep the last three values for each subscribable under the property 'oldValues'.<br/>
    ///     { seal: true } -> Prevent any subsequent watcher from watching the target.<br/>
    /// </param>
    /// <param name="evaluatorCallback" type="function">
    ///     The  callback function called during changes. Any return value is assigned to the chained observable.
    /// </param>

    var targetType = typeof targetOrCallback;

    if (targetType === 'boolean' || targetType === 'undefined') {
        // Turn on or off the watcher for the specified target along with any of its children.
        ko.watch(this, { enabled: targetOrCallback !== false });
    } else if (targetType === 'function' && !ko.isSubscribable(targetOrCallback)) {
        // Target the chained subscribable itself if no target subscribable or object was passed.
        ko.watch(this, options || {}, targetOrCallback, context || this);
    } else {
        ko.watch(targetOrCallback, options, evaluatorCallback, context || this);
    }

    return this;
};

ko.subscribable.fn['unwatch'] = function (targetOrCallback, options, evaluatorCallback, context) {
  return ko.subscribable.fn['watch'](targetOrCallback, options, evaluatorCallback, context, true);
};

ko['watch'] = function (target, options, evaluatorCallback, context, unwatch) {
    /// <summary>
    ///     Track and manage changes within a specific target object down to any given level.
    /// </summary>
    /// <param name="target">
    ///     An object or function containing the targeted subscribable(s).
    /// </param>
    /// <param name="options" type="object">
    ///     { depth: 2 } -> Track all nested subscribables down to the 2nd level(default is 1).<br/>
    ///     { depth: -1 } -> Track all nested subscribables.<br/>
    ///     { hide: [...] } -> Property or array of properties to be ignored.<br/>
    ///     { hideArrays: true } -> Ignore all nested arrays.<br/>
    ///     { hideWrappedValues: true } -> Ignore observables wrapped under yet another parent observable.<br/>
    ///     { mutable: true } -> Dynamically adapt to changes made to the target structure through any subscribable.<br/>
    ///     { watchedOnly: true } -> Watch only subscribables tagged with a .watch().<br/>
    ///     { beforeWatch: function(parents, child) {...} } -> Function called prior to creating a subscription. Returning false aborts the operation and ignores its children.<br/>
    ///     { wrap: true } -> Wrap all fields into observables. This happens on the fly for new array items(or child objects when mutable is set to true).<br/>
    ///     { beforeWrap: function(parents, field, value) {...} } -> Function called prior to wrapping a value into an observable. Returning false leaves it as it is.<br/>
    ///     { tagFields: true } -> Add the property '_fieldName' under each property for identification purposes.<br/>
    ///     { tagFields: 'parentsOnly' } -> Same as above except that it is limited to parent properties only.<br/>
    ///     { oldValues: 3 } -> Keep the last three values for each subscribable under the property 'oldValues'.<br/>
    ///     { seal: true } -> Prevent any subsequent watcher from watching the target.<br/>
    /// </param>
    /// <param name="evaluatorCallback" type="function">
    ///     The callback function called during changes.
    /// </param>

    if (typeof options === 'function') {
        context = context || evaluatorCallback;
        evaluatorCallback = options;
        options = {};
    }

    context = context || this;

    function watchChildren(child, parent, grandParents, unwatch, keepOffParentList) {

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

            // Prevent subsequent watchers from watching the target when sealed.
            if (options.seal === true)
                child.watchable = false;

            // Bypass circular references.
            if (child === parent || ko.utils.arrayIndexOf(grandParents, child) > -1)
                return;

            // Merge parents. Using a fresh array so it is not referenced in the next recursion if any.
            var parents = [].concat(grandParents, parent && parent !== target ? parent : []);

            // Ignore hidden objects. Also applies to any of their children.
            if (options.hide)
                if (ko.utils.arrayIndexOf(options.hide, child) > -1)
                    return;

            if (ko.isSubscribable(child)) {
                if (evaluatorCallback) {
                    if (options.enabled === true && child.watchable === false)
                        // Only waking up an existing watcher. Let's not add another.
                        return;

                    if (unwatch || !options.beforeWatch || options.beforeWatch.call(context, parents, child) !== false) {
                        if (typeof child.pop === 'function') {
                            if (unwatch)
                                disposeWatcher(child);
                            else
                                assignWatcher(child, true, parents, keepOffParentList);

                            watchChildren(child(), (keepOffParentList ? null : child), parents, false, true);
                            return true;
                        } else {
                            if (unwatch)
                                disposeWatcher(child);
                            else
                                assignWatcher(child, false, parents, keepOffParentList);

                            if (options.hideWrappedValues !== true)
                                return watchChildren(child(), (keepOffParentList ? null : child), parents, false, true);
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

                            var hasChildren = watchChildren(sub, (keepOffParentList ? null : child), parents, unwatch);

                            if (options.tagFields)
                                if ((hasChildren || options.tagFields !== 'parentsOnly') && sub._fieldName === undefined)
                                    sub._fieldName = property;
                        });
                        return true;

                    case '[object Array]':
                        if (options.hideArrays !== true)
                            for (var i = 0; i < child.length; i++)
                                watchChildren(child[i], (keepOffParentList ? null : child), parents, unwatch);
                        return true;
                }
            }
        }
    }

    var subscriptionField;
    if (typeof ko.DEBUG !== 'undefined') subscriptionField = '_subscriptions';
    else if (ko.version == "3.0.0") subscriptionField = 'F';
    else if (ko.version == "3.1.0") subscriptionField = 'H';
    else if (ko.version == "3.2.0") subscriptionField = 'M';
    else if (ko.version == "3.3.0") subscriptionField = 'G';
    else throw "Unsupported minimized Knockout version "+ko.version+" (supported DEBUG or minimized 3.0.0 ... 3.3.0)";

    function disposeWatcher(child) {
        // Subscriptions are stored under either H or _subscriptions
        // depending on whether KnockoutJS is minified or not.
        var subsc = child[subscriptionField];
        var i;

        if (subsc) {
            if (subsc.change)
                for (i = subsc.change.length - 1; i >= 0; i--)
                    if (subsc.change[i]._watcher === context)
                        subsc.change[i].dispose();

            if (subsc.beforeChange && options.oldValues > 0)
                // Also clean up any before-change subscriptions used for tracking old values.
                for (i = subsc.beforeChange.length - 1; i >= 0; i--)
                    if (subsc.beforeChange[i]._watcher === context)
                        subsc.beforeChange[i].dispose();
        } else {
            throw "Subscription field (."+subscriptionField+") not defined for observable child";
        }
    }

    function assignWatcher(child, isArray, parents, keepOffParentList) {
        if (isArray) {
            // Child is an observable array. Watch all item changes within it.
            child.subscribe(function (changes) {
                ko.utils.arrayForEach(changes, function (item) {
                    var returnValue = evaluatorCallback.call(context, parents, child, item);
                    if (returnValue !== undefined)
                        context(returnValue);

                    if (!item.moved) {
                        // Deleted or brand new item. Unwatch or watch it accordingly.
                        setTimeout(function () {
                            watchChildren(item.value, (keepOffParentList ? null : child), parents, item.status === 'deleted');
                        }, 0);
                    }
                });
            }, undefined, 'arrayChange');

        } else {
            child.subscribe(function () {
                if (child.watchable !== false) {
                    var returnValue = evaluatorCallback.call(context, parents, child);

                    if (returnValue !== undefined)
                        context(returnValue);

                    if (options.mutable && typeof child() === 'object')
                        // Watch the new comer object.
                        watchChildren(child(), (keepOffParentList ? null : child), parents);
                }

            }, null, 'change')._watcher = context;

            if (options.oldValues > 0 || options.mutable) {
                child.subscribe(function (oldValue) {
                    if (options.oldValues > 0) {
                        // Add old value to history list before every update.
                        var values = (child['oldValues']
                            ? child['oldValues']
                            : child['oldValues'] = []);

                        values.unshift(oldValue);

                        while (values.length > options.oldValues)
                            values.pop();
                    }

                    if (options.mutable && typeof oldValue === 'object')
                        // Clean up all subscriptions for the old child object.
                        watchChildren(oldValue, (keepOffParentList ? null : child), parents, false, true);

                }, null, 'beforeChange')._watcher = context;
            }
        }
    }

    // Use a computed when targeting a non-watchable function.
    if (typeof target === 'function' && !ko.isSubscribable(target))
        return ko.computed(target, evaluatorCallback, options);

    watchChildren(target, null, [], unwatch);
};

ko['unwatch'] = function(target, options, evaluatorCallback, context) {
  return ko['watch'](target, options, evaluatorCallback, context, true);
};
