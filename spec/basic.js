'use strict';

var listener = function(answers, parents, child, item) {
  var pNames = [];
  for(var i = 0; i < parents.length; i++) {
    if (typeof parents[i]._fieldName !== 'undefined') {
      var step = parents[i]._fieldName;
      if (ko.isObservable(parents[i])) step += '()';
      pNames.push(step);
    } else if (i > 0 && typeof parents[i-1].pop == 'function') {
      var parentArray = ko.isObservable(parents[i - 1]) ? ko.utils.peekObservable(parents[i - 1]) : parents[i - 1];
      var pos = ko.utils.arrayIndexOf(parentArray, parents[i]);
      var base = pNames.pop();
      if (pos != -1) {
        pNames.push(base+"[" + pos + "]");
      } else {
        pNames.push(base+'[???!!!]');
      }
    } else {
      pNames.push('???');
    }
    
  }
  var pLast = typeof child._fieldName !== 'undefined' ? child._fieldName : '???';
  pLast += ko.isObservable(child) ? '('+ko.toJSON(child)+')' : ' = '+ko.toJSON(child);
  if (typeof item !== 'undefined') pLast += ' {'+ko.toJSON(item)+'}';
  pNames.push(pLast);

  if (pNames.join('.').indexOf('???') > 0) {
    console.error("Unexpected parent ", parents, child, item);
  }

  var output = "model."+pNames.join('.')+(typeof child.oldValues !== 'undefined' ? (' ['+ko.toJSON(child.oldValues[0])+']') : '');
  console.log("<<<<< ", output);

  answers.push(output);

  console.debug("Listener", "parents[]._fieldName", pNames, "child._fieldName", typeof child._fieldName !== 'undefined' ? child._fieldName: '???', ko.utils.unwrapObservable(child), 'item', item, 'oldValue', typeof child.oldValues !== 'undefined' ? child.oldValues[0] : '???');
};

describe('watching nested models', function() {

  it('should correctly notify parents', function() {

    var context = {};

    var subModel = {
      c: ko.observable(1),
      d: ko.observable(0)
    };

    var subModelB = {
      e: ko.observable(0),
      f: ko.observable(1)
    };

    var model = {
      a: ko.observable(1),
      b: {
        g: ko.observable(0),
        h: ko.observable(0),
      },
      sub: ko.observable(subModel),
    };

    var answers = [];

    var w = ko.watch(model, { depth: -1, oldValues: 1, mutable: true, /* tagParentsWithName: true */ tagFields: true, async: false }, listener.bind(undefined, answers), context);
    
    console.log("##### ", "model.a(2) [1]");
    model.a(2);
    expect(answers.pop()).toEqual("model.a(2) [1]");
    console.log("##### ", "model.sub().c(3) [1]");
    model.sub().c(3);
    expect(answers.pop()).toEqual("model.sub().c(3) [1]");
    console.log("##### ", 'model.b.g(6) [0]');
    model.b.g(6);
    expect(answers.pop()).toEqual('model.b.g(6) [0]');

    // should notify full observable objects correctly
    console.log("##### ", 'model.sub({"e":0,"f":1}) [{"c":3,"d":0}]');
    model.sub(subModelB);
    expect(answers.pop()).toEqual('model.sub({"e":0,"f":1}) [{"c":3,"d":0}]');

    // should NOT notify changes on removed objects
    // Should not be listened
    subModel.c(4);
    expect(answers.pop()).toEqual(undefined);

    // Should notify changes on newly added objects
    console.log("##### ", 'model.sub().f(5) [1]');
    model.sub().f(5);
    expect(answers.pop()).toEqual('model.sub().f(5) [1]');

    // should notify changes on re-added objects
    console.log("##### ", 'model.sub({"c":4,"d":0}) [{"e":0,"f":5}]');
    model.sub(subModel);
    expect(answers.pop()).toEqual('model.sub({"c":4,"d":0}) [{"e":0,"f":5}]');
    console.log("##### ", 'model.sub().c(7) [4]');
    model.sub().c(7);
    expect(answers.pop()).toEqual('model.sub().c(7) [4]');
    console.log("##### ", 'model.sub({"e":0,"f":5}) [{"c":7,"d":0}]');
    model.sub(subModelB);
    expect(answers.pop()).toEqual('model.sub({"e":0,"f":5}) [{"c":7,"d":0}]');
    console.log("##### ", 'model.sub().f(8) [5]');
    model.sub().f(8);
    expect(answers.pop()).toEqual('model.sub().f(8) [5]');

    // should STOP notifying when disposed
    w.dispose();
    // No output console.log("##### ", "model.sub().f(8) [5]");
    model.sub().f(2);
    expect(answers.pop()).toEqual(undefined);
  });

  it('should deal with simple array notifications', function() {

    var context = {};

    var model = {
      arr: ko.observableArray(['a', 'b']),
    };

    var answers = [];

    var w = ko.watch(model, { depth: -1, oldValues: 1, mutable: true, /* tagParentsWithName: true */ tagFields: true }, listener.bind(undefined, answers), context);
    
    console.log("##### ", "model.arr.push('c')");
    model.arr.push('c');
    expect(answers.pop()).toEqual('model.arr(["a","b","c"]) {{"status":"added","value":"c","index":2}}');

    console.log("##### ", "model.arr.unshift()");
    var res = model.arr.shift();
    expect(answers.pop()).toEqual('model.arr(["b","c"]) {{"status":"deleted","value":"a","index":0}}');
    expect(res).toEqual('a');
    expect(ko.toJSON(model.arr)).toEqual(ko.toJSON(["b","c"]));

    console.log("##### ", "model.arr(['c', 'a'])");
    model.arr(['c', 'a']);
    expect(answers.pop()).toEqual('model.arr(["c","a"]) {{"status":"added","value":"a","index":1}}');
    expect(answers.pop()).toEqual('model.arr(["c","a"]) {{"status":"deleted","value":"b","index":0}}');
    expect(answers.pop()).toEqual(undefined);

    console.log("##### ", "model.arr.splice(0,1,'d','e');");
    model.arr.splice(0,1,'d','e');
    expect(answers.pop()).toEqual('model.arr(["d","e","a"]) {{"status":"added","value":"e","index":1}}');
    expect(answers.pop()).toEqual('model.arr(["d","e","a"]) {{"status":"added","value":"d","index":0}}');
    expect(answers.pop()).toEqual('model.arr(["d","e","a"]) {{"status":"deleted","value":"c","index":0}}');
    expect(answers.pop()).toEqual(undefined);

    // should STOP notifying when disposed
    w.dispose();
  });

  it('should deal with simple single array notifications', function() {

    var context = {};

    var model = {
      arr: ko.observableArray(['a', 'b']),
    };

    var answers = [];

    var w = ko.watch(model, { depth: -1, oldValues: 1, mutable: true, /* tagParentsWithName: true */ tagFields: true, splitArrayChanges: false }, listener.bind(undefined, answers), context);
    
    console.log("##### ", "model.arr.push('c')");
    model.arr.push('c');
    expect(answers.pop()).toEqual('model.arr(["a","b","c"]) {[{"status":"added","value":"c","index":2}]}');

    console.log("##### ", "model.arr.unshift()");
    var res = model.arr.shift();
    expect(answers.pop()).toEqual('model.arr(["b","c"]) {[{"status":"deleted","value":"a","index":0}]}');
    expect(res).toEqual('a');
    expect(ko.toJSON(model.arr)).toEqual(ko.toJSON(["b","c"]));

    console.log("##### ", "model.arr(['c', 'a'])");
    model.arr(['c', 'a']);
    expect(answers.pop()).toEqual('model.arr(["c","a"]) {[{"status":"deleted","value":"b","index":0},{"status":"added","value":"a","index":1}]}');
    expect(answers.pop()).toEqual(undefined);

    console.log("##### ", "model.arr.splice(0,1,'d','e');");
    model.arr.splice(0,1,'d','e');
    expect(answers.pop()).toEqual('model.arr(["d","e","a"]) {[{"status":"deleted","value":"c","index":0},{"status":"added","value":"d","index":0},{"status":"added","value":"e","index":1}]}');
    expect(answers.pop()).toEqual(undefined);

    // should STOP notifying when disposed
    w.dispose();
  });


  it('should deal with array of observable notifications', function() {

    var context = {};

    var a = { p: ko.observable('a') };
    var b = { p: ko.observable('b') };
    var c = { p: ko.observable('c') };
    var d = { p: ko.observable('d') };
    var e = { p: ko.observable('e') };

    var model = {
      arr: ko.observableArray([a, b]),
    };

    var answers = [];

    var w = ko.watch(model, { depth: -1, oldValues: 1, mutable: true, /* tagParentsWithName: true */ tagFields: true, async: false }, listener.bind(undefined, answers), context);

    console.log("##### ", "model.arr()[1].p('b2')");
    model.arr()[1].p('b2');
    expect(answers.pop()).toEqual('model.arr()[1].p("b2") ["b"]');

    
    console.log("##### ", "model.arr.push(c)");
    model.arr.push(c);
    expect(answers.pop()).toEqual('model.arr([{"p":"a"},{"p":"b2"},{"p":"c"}]) {{"status":"added","value":{"p":"c"},"index":2}}');

    console.log("##### ", "model.arr.unshift()");
    var res = model.arr.shift();
    expect(answers.pop()).toEqual('model.arr([{"p":"b2"},{"p":"c"}]) {{"status":"deleted","value":{"p":"a"},"index":0}}');
    expect(res).toEqual(a);
    expect(ko.toJSON(model.arr)).toEqual(ko.toJSON([b, c]));

    console.log("##### ", "model.arr([c, a])");
    model.arr([c, a]);
    expect(answers.pop()).toEqual('model.arr([{"p":"c"},{"p":"a"}]) {{"status":"added","value":{"p":"a"},"index":1}}');
    expect(answers.pop()).toEqual('model.arr([{"p":"c"},{"p":"a"}]) {{"status":"deleted","value":{"p":"b2"},"index":0}}');
    expect(answers.pop()).toEqual(undefined);

    console.log("##### ", "model.arr.splice(0,1,d,e);");
    model.arr.splice(0,1,d,e);
    expect(answers.pop()).toEqual('model.arr([{"p":"d"},{"p":"e"},{"p":"a"}]) {{"status":"added","value":{"p":"e"},"index":1}}');
    expect(answers.pop()).toEqual('model.arr([{"p":"d"},{"p":"e"},{"p":"a"}]) {{"status":"added","value":{"p":"d"},"index":0}}');
    expect(answers.pop()).toEqual('model.arr([{"p":"d"},{"p":"e"},{"p":"a"}]) {{"status":"deleted","value":{"p":"c"},"index":0}}');
    expect(answers.pop()).toEqual(undefined);

    expect(model.arr()[1].p()).toEqual('e');

    console.log("##### ", "model.arr()[1].p('e2')");
    model.arr()[1].p('e2');
    expect(answers.pop()).toEqual('model.arr()[1].p("e2") ["e"]');
    expect(model.arr()[1].p()).toEqual('e2');

    // should STOP notifying when disposed
    w.dispose();
  });



});