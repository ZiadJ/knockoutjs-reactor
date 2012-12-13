// Observer plugin for Knockout http://knockoutjs.com/
// (c) Ziad Jeeroburkhan
// License: MIT (http://www.opensource.org/licenses/mit-license.php)
// Version 0.9

ko.watch = function (target, options, callback) {
    /// <summary>
    ///     React to changes in a specific target object or function.
    /// </summary>
    /// <param name="target">
    ///     The target subscribable or object/function containing subscribables.
    /// </param>
    /// <param name="options" type="object">
    ///     { recurse: 1 } -> Listen to 1st level children only(default).
    ///     { recurse: 2 } -> Listen to nested children down to the 2nd level.
    ///     { recurse: true } -> Listen to all nested children.
    ///     { exclude: [...] } -> Property or array of properties to be excluded.
    ///     This parameter is optional.
    /// </param>
    /// <param name="callback" type="function">
    ///     The callback function called when changes occur.
    /// </param>
    return ko.observable().watch(target, options, callback);
}

ko.subscribable.fn.watch = function (target, options, valueEvaluatorFunction) {
    /// <summary>
    ///     React to changes in a specific target object or function.
    /// </summary>
    /// <param name="target">
    ///     The target subscribable or object/function containing the subscribable(s).
    /// </param>
    /// <param name="options" type="object">
    ///     { recurse: 1 } -> Listen to 1st level children only(default).
    ///     { recurse: 2 } -> Listen to nested children down to the 2nd level.
    ///     { recurse: true } -> Listen to all nested children.
    ///     { exclude: [...] } -> Property or array of properties to be excluded.
    ///     This parameter is optional.
    /// </param>
    /// <param name="valueEvaluatorFunction" type="function">
    ///     The evaluator or function used to update the value during changes.
    /// </param>

    if (valueEvaluatorFunction == undefined) {
        valueEvaluatorFunction = options;
        options = {};
    }

    this.isPaused = false;
    var context = this;

    if (typeof target == "object") {
        function watchChildren(object, recurse) {
            // Listen to all subscribables within target object.
            for (var property in object) {
                if (recurse && (recurse === true || recurse >= 0) && typeof target[property] == 'object')
                    watchChildren(object[property], recurse === true || Number(recurse) - 1);
                else if (ko.isSubscribable(object[property]))
                    context.watch(object[property], options, valueEvaluatorFunction);
            }
        }
        options.targetParent = target;
        watchChildren(target, options.recurse);
    } else {
        if (options.exclude && ko.utils.arrayIndexOf(typeof options.exclude == 'object' ? options.exclude : [options.exclude], target) >= 0)
            return;

        if (ko.isSubscribable(target)) {
            // For performance reasons lets use a subscription instead of a computed when targeting subscribables.
            target.subscribe(function (targetValue) {
                if (!context.isPaused) {
                    var returnValue = valueEvaluatorFunction.call(context, options.targetParent || target, target);
                    if (returnValue !== undefined)
                        context(returnValue);
                }
            });
        } else {
            ko.computed(function () {
                var targetValue = target();
                if (!context.isPaused) {
                    // Bypass change detection for valueEvaluatorFunction during its evaluation.
                    setTimeout(function () {
                        returnValue = valueEvaluatorFunction.call(context, options.targetParent || target, target);
                        // Check that a return value exists and make sure it is new before allowing an update.
                        if (returnValue !== undefined && returnValue !== context())
                            context(returnValue);
                    }, 0);
                }
            });
        }
    }

    this.pauseWatch = function () {
        context.isPaused = true;
    };

    this.resumeWatch = function () {
        context.isPaused = false;
    };

    return this;
}
