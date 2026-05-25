import { isProgram, parseL3, parseL3Exp, unparseL3 } from "../../L3/L3-ast";
import { evalL3program } from "../../L3/L3-eval-env";
import { transform } from "../../L3/SyntacticTransformation";
import { bind, makeFailure, makeOk, Result } from "../../shared/result";
import { parse as p } from "../../shared/parser";

const transformUnparseExp = (x: string): Result<string> =>
    bind(bind(bind(p(x), parseL3Exp), transform), exp => makeOk(unparseL3(exp)));

const transformUnparseProgram = (x: string): Result<string> =>
    bind(bind(parseL3(x), transform), exp => makeOk(unparseL3(exp)));

describe("Q2C transformation custom grader checks", () => {
    it("transforms a single-method class into nested lambdas", () => {
        expect(transformUnparseExp(`
            (class (x) ((get (lambda () x))))
        `)).toStrictEqual(makeOk(`(lambda (x) (lambda (msg) (if (eq? msg 'get) x 'error)))`));
    });

    it("rejects a class with zero methods before transformation", () => {
        expect(transformUnparseExp(`
            (class (x) ())
        `)).toStrictEqual(makeFailure("Invalid fields or methods for ClassExp"));
    });

    it("transforms all methods in order into a dispatch chain", () => {
        expect(transformUnparseExp(`
            (class (a b)
                ((first (lambda () a))
                 (second (lambda () b))
                 (sum (lambda () (+ a b)))))
        `)).toStrictEqual(makeOk(`(lambda (a b) (lambda (msg) (if (eq? msg 'first) a (if (eq? msg 'second) b (if (eq? msg 'sum) (+ a b) 'error)))))`));
    });

    it("preserves lambdas returned by zero-argument methods", () => {
        expect(transformUnparseExp(`
            (class (x)
                ((make-adder (lambda () (lambda (y) (+ x y))))))
        `)).toStrictEqual(makeOk(`(lambda (x) (lambda (msg) (if (eq? msg 'make-adder) (lambda (y) (+ x y)) 'error)))`));
    });

    it("recursively transforms classes inside condition branches", () => {
        expect(transformUnparseExp(`
            (if #t
                (class (x) ((get (lambda () x))))
                (class (y) ((get (lambda () y)))))
        `)).toStrictEqual(makeOk(`(if #t (lambda (x) (lambda (msg) (if (eq? msg 'get) x 'error))) (lambda (y) (lambda (msg) (if (eq? msg 'get) y 'error))))`));
    });

    it("recursively transforms classes inside lambda bodies and applications", () => {
        expect(transformUnparseExp(`
            ((lambda (make)
                (make 1))
             (class (x) ((get (lambda () x)))))
        `)).toStrictEqual(makeOk(`((lambda (make) (make 1)) (lambda (x) (lambda (msg) (if (eq? msg 'get) x 'error))))`));
    });

    it("recursively transforms classes inside let bindings and bodies", () => {
        expect(transformUnparseExp(`
            (let ((box (class (x) ((get (lambda () x))))))
                (class (y) ((get (lambda () y)))))
        `)).toStrictEqual(makeOk(`(let ((box (lambda (x) (lambda (msg) (if (eq? msg 'get) x 'error))))) (lambda (y) (lambda (msg) (if (eq? msg 'get) y 'error))))`));
    });

    it("transforms every class in a full program", () => {
        expect(transformUnparseProgram(`
            (L3
                (define box (class (x) ((get (lambda () x)))))
                (define pair (class (a b) ((sum (lambda () (+ a b))))))
                (box 1))
        `)).toStrictEqual(makeOk(`(L3 (define box (lambda (x) (lambda (msg) (if (eq? msg 'get) x 'error)))) (define pair (lambda (a b) (lambda (msg) (if (eq? msg 'sum) (+ a b) 'error)))) (box 1))`));
    });

    it("transformed zero-argument methods preserve simple dispatch semantics", () => {
        const original = parseL3(`
            (L3
                (define box (class (x) ((get (lambda () x)))))
                (define b (box 9))
                (b 'get))
        `);
        const transformed = bind(parseL3(`
            (L3
                (define box (class (x) ((get (lambda () x)))))
                (define b (box 9))
                (b 'get))
        `), transform);

        expect(bind(original, evalL3program)).toStrictEqual(makeOk(9));
        expect(bind(transformed, ast =>
            isProgram(ast) ? evalL3program(ast) : makeFailure("Expected transformed Program")
        )).toStrictEqual(makeOk(9));
    });
});
