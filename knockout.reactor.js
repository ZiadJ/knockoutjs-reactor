// Deep observer plugin for Knockout http://knockoutjs.com/
// (c) Ziad Jeeroburkhan
// License: MIT (http://www.opensource.org/licenses/mit-license.php)
// Version 1.2.0 beta

ko.subscribable.fn['watch'] = function (targetOrEvaluatorCallback, options, evaluatorCallback) {
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
    ///     { beforeWatch: function(parents, child) {...} } -> Function called prior to creating a subscription. Returning false aborts the operation and ignores its children.<br/>
    ///     { wrap: true } -> Makes sure all fields are wrapped into observables. This happens on the fly for new array items.<br/>
    ///     { beforeWrap: function(parents, field, value) {...} } -> Function called prior to wrapping a value into an observable. Returning false leaves it as such.<br/>
    ///     { tagParentsWithName: true } -> Add the property '_fieldName' under each parent for easy idenfication.<br/>
    ///     { keepOldValues: 3 } -> Keep the last three values for each subscribable under the property 'oldValues'.<br/>
    /// </param>
    /// <param name="evaluatorCallback" type="function">
    ///     The  callback function called during changes. Any return value is assigned to the chained observable.
    /// </param>

    var targetType = typeof targetOrEvaluatorCallback;
        
    if (targetType === 'boolean') {
        // Setting the target as false prevents it from being watched later on.
        ko.watch(context || this, { enabled: targetOrEvaluatorCallback });
    } else if (targetType === 'function' && !ko.isSubscribable(targetOrEvaluatorCallback) ) {
        // When no target subscribable or object is provided the chained subscribable itself becomes the target.
        ko.watch(this, options || {}, targetOrEvaluatorCallback);
    } else {
        ko.watch(targetOrEvaluatorCallback, options, evaluatorCallback, this);
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
    ///     { beforeWatch: function(parents, child) {...} } -> Function called prior to creating a subscription. Returning false aborts the operation and ignores its children.<br/>
    ///     { wrap: true } -> Makes sure all fields are wrapped into observables. This happens on the fly for new array items.<br/>
    ///     { beforeWrap: function(parents, field, value) {...} } -> Function called prior to wrapping a value into an observable. Returning false leaves it as such.<br/>
    ///     { tagParentsWithName: true } -> Add the property '_fieldName' under each parent for easy idenfication.<br/>
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

            // Merge parents. Using a fresh array so it is not referenced in the next recursion.
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
                                    // Deleted or brand new array item.
                                    var returnValue = evaluatorCallback.call(context, parents, child, item);
                                    if (returnValue !== undefined)
                                        context(returnValue);

                                    // Unwatch or watch it.
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

                                // Clean up any before-change subscriptions used for tracking old values.
                                if (options.keepOldValues > 0)
                                    for (var i = 0; i < subsc.beforeChange ? subsc.beforeChange.length : 0; i++)
                                        subsc.beforeChange[i].dispose();

                                watchChildren(child(), (notInParentList ? null : child), parents, false, true)

                            } else {

                                if (options.enabled === true && child.watchEnabled === false)
                                    // Only waking up a watcher. There's no need to subscribe again.
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
                                    // Automatically wrap simple objects and arrays into observables.
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

    watchChildren(target, null, []);
}
