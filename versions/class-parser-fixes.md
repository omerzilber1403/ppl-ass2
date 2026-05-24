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
