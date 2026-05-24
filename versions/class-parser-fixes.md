# Class parser fixes

This version fixes four Q2A class parser/AST consistency issues.

1. `isCompoundExp` did not recognize `ClassExp`.
   `ClassExp` was added to the `CompoundExp` type, but the runtime predicate still returned `false` for class expressions. This made `isCExp` inconsistent with the AST type definition.

2. Class fields accepted non-identifiers.
   The parser used `isString` for class field names, so malformed fields such as `(class (x 1) ...)` were accepted because parser tokens are strings. Class fields are variable declarations, so they must satisfy `isIdentifier`.

3. Class method bindings could crash when missing a value.
   A malformed method binding such as `((get))` passed the shared binding shape check and later tried to parse an undefined method value, causing a JavaScript `TypeError`. Class parsing now requires every method binding to contain exactly a method name and a method expression, returning `Failure` for malformed input.

4. Empty class field and method lists were accepted.
   The class grammar uses one-or-more fields and one-or-more method bindings. Class parsing now rejects `(class () ...)` and `(class (x) ())` instead of accepting empty class shapes.

The stricter method validation is local to class parsing and does not change the shared `isGoodBindings` helper used by `let`.

## Q2B environment model fix

The environment-model evaluator did not support class methods that call the class constructor by name. The assignment example uses:

```scheme
(scale (lambda (k) (pair (* k a) (* k b))))
```

Before the fix, `(define pair (class ...))` evaluated the class before `pair` was added to the environment, so `((p34 'scale 2) 'second)` failed with `var not found: pair` in the environment model.

The fix special-cases class definitions in `L3-eval-env.ts`: when defining a class, the class value is placed in an extended environment that binds the class name, and the class captures that extended environment. This lets methods resolve the constructor name while preserving the existing behavior for ordinary definitions.

One follow-up error path also had to be made safe: applying an object without a method name, such as `(p34)`, used to build the failure message by formatting the whole object. After the constructor-name fix, class values intentionally reference their own environment, so formatting the whole object could throw on a circular structure instead of returning `Failure`. The error now reports `No method name supplied: Object` without formatting the circular value.

## Q2B method dispatch robustness

Method dispatch now checks method arity before applying the method closure. This matters for calls such as `(p34 'scale)` where the method exists but the required method parameter is missing. Before this fix, the substitution-model evaluator could continue into substitution with a missing argument and crash with a JavaScript `TypeError`. Now both evaluators return a normal `Failure`:

```scheme
Wrong number of arguments to method scale, expected 1 but got 0
```

This check is local to object method dispatch in the two Q2B evaluator files.
