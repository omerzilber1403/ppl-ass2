# Q3 Python translation tests

This version keeps `q3.ts` unchanged because the implementation already passes the given Q3 tests.

The custom Q3 tests were aligned with the exact assignment wording:

- Zero-argument lambdas are not included in the assignment examples, so the custom test for `(lambda () 5)` was removed.
- Multi-expression lambda bodies are out of scope because the assignment says we may assume lambda bodies contain only one expression, so the custom failure test for `(lambda (x) (+ x 1) (* x 2))` was removed.

The remaining custom tests check the assignment-relevant behavior:

- atomic expressions
- arithmetic, comparison, and boolean primitives
- `number?` and `boolean?`
- `if`
- one-argument and multi-argument lambdas
- direct and higher-order application
- definitions and full programs
- failures for unsupported non-L2 constructs
