// Observer plugin for Knockout http://knockoutjs.com/
// (c) Ziad Jeeroburkhan
// License: MIT (http://www.opensource.org/licenses/mit-license.php)
// Version 1.0

ko.subscribable.fn.reactTo = function (target, options, valueEvaluatorFunction) {
    /// <summary>
    ///     React to changes in a specific target object or function.
    /// </summary>
    /// <param name="target">
    ///     The target subscribable or object/function containing subscribables.
    /// </param>
    /// <param name="options" type="object">
    ///     { recurse: true } -> Listen to all nested children if any.
    ///     This parameter can be omitted.
    /// </param>
    /// <param name="valueEvaluatorFunction" type="function">
    ///     The evaluator or function used to update the value as changes occur.
    /// </param>

    if (valueEvaluatorFunction == undefined) {
        valueEvaluatorFunction = options;
        options = {};
    }

    this.isPaused = false;
    var context = this;

    if (typeof target == "object") {
        function reactToChildren(object, recurse) {
            // Listen to all subscribables within target object.
            for (var property in object) {
                if (recurse && typeof target[property] == 'object')
                    reactToChildren(object[property]);
                else if (ko.isSubscribable(object[property], recurse))
                    context.reactTo(object[property], options, valueEvaluatorFunction);
            }
        }
        options.targetParent = target;
        reactToChildren(target, options.recurse);
    } else if (ko.isSubscribable(target)) {
        // For performance reasons lets use a subscription instead of a computed when targeting subscribables.
        target.subscribe(function (targetValue) {
            if (!context.isPaused) {
                var returnValue = valueEvaluatorFunction.call(context, options.targetParent || targetValue);
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
                    returnValue = valueEvaluatorFunction.call(context, options.targetParent || targetValue);
                    // Check that a return value exists and make sure it is new before allowing an update.
                    if (returnValue !== undefined && returnValue !== context())
                        context(returnValue);
                }, 0);
            }
        });
    }

    this.pauseReactor = function () {
        context.isPaused = true;
    };

    this.resumeReactor = function () {
        context.isPaused = false;
    };

    return this;
};
