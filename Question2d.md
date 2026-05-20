# PPL Assignment 2 - Question 2.d: Class to Proc Transformation

Below is the equivalent program where the `ClassExp` representing the `circle` has been syntactically transformed into nested `ProcExp`s (lambdas) with a conditional dispatch chain, as specified in section 2.c.

## Transformed Program

```scheme
(define pi 3.14)

(define square (lambda (x) (* x x)))

(define circle
  (lambda (x y radius)
    (lambda (msg)
      (if (eq? msg 'area)
          (* (square radius) pi)
          (if (eq? msg 'perimeter)
              (* 2 pi radius)
              'error)))))

(define c (circle 0 0 3))

(c 'area)