# Q2C transformation tests

This version keeps the Q2C implementation aligned with the assignment wording.

Q2C assumes class methods have no parameters, so custom tests should not require `(lambda (x) ...)` methods to be preserved as callable method values. A no-argument method may still return a lambda from its body, and that case is tested.

The parser also rejects classes with empty method lists because Q2A defines class methods as `<binding>+`. The Q2C custom test now expects that parse failure instead of expecting a transformed empty dispatcher.

The source transformation itself was not changed: the official Q2C tests already pass.

## Provided Q2A test correction

The original downloaded `test/q2a.test.ts` failed in the test named `test parse wrong class`.

The malformed input is:

```scheme
(class ((first (lambda () a)) (second (lambda () b)) (sum (lambda () (+ a b)))))
```

This input is missing the required fields list. A class must have the shape:

```scheme
(class (<field>+) (<binding>+))
```

The parser correctly returns:

```ts
{ tag: "Failure", message: "Bad class" }
```

The original test failed because it compared that `Failure` object directly to the predicate function `isFailure`:

```ts
expect(bind(p(`...`), parseL3Exp)).toStrictEqual(isFailure);
```

That assertion compares an object to a function, so it cannot pass. A correct assertion would call the predicate:

```ts
expect(isFailure(bind(p(`...`), parseL3Exp))).toStrictEqual(true);
```

or compare to the exact failure value:

```ts
expect(bind(p(`...`), parseL3Exp)).toStrictEqual(makeFailure("Bad class"));
```

The mail-provided correction changes the test to call the predicate:

```ts
expect(isFailure(bind(p(`...`), parseL3Exp))).toStrictEqual(true);
```

After applying that correction locally, the given Q2 tests pass.

Do not change the parser to return `isFailure` just to satisfy this test. That would make this one assertion pass, but it would violate the project-wide `Result<T>` contract because parsers are expected to return `makeOk(...)` or `makeFailure(...)` objects, not predicate functions. Hidden tests that call `isFailure(result)` or inspect `result.tag` would then fail.
