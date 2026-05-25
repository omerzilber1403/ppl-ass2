# Q2C transformation tests

This version keeps the Q2C implementation aligned with the assignment wording.

Q2C assumes class methods have no parameters, so custom tests should not require `(lambda (x) ...)` methods to be preserved as callable method values. A no-argument method may still return a lambda from its body, and that case is tested.

The parser also rejects classes with empty method lists because Q2A defines class methods as `<binding>+`. The Q2C custom test now expects that parse failure instead of expecting a transformed empty dispatcher.

The source transformation itself was not changed: the official Q2C tests already pass.
