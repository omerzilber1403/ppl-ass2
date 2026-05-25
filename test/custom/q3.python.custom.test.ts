import { parseL3, parseL3Exp } from "../../L3/L3-ast";
import { l2ToPython } from "../../q3";
import { bind, isFailure, makeOk, Result } from "../../shared/result";
import { parse as p } from "../../shared/parser";

const l2ToPythonResult = (x: string): Result<string> =>
    bind(bind(p(x), parseL3Exp), l2ToPython);

describe("Q3 L2 to Python custom grader checks", () => {
    it("translates atomic expressions", () => {
        expect(l2ToPythonResult(`17`)).toStrictEqual(makeOk(`17`));
        expect(l2ToPythonResult(`#t`)).toStrictEqual(makeOk(`True`));
        expect(l2ToPythonResult(`#f`)).toStrictEqual(makeOk(`False`));
        expect(l2ToPythonResult(`"hello"`)).toStrictEqual(makeOk(`"hello"`));
        expect(l2ToPythonResult(`x`)).toStrictEqual(makeOk(`x`));
    });

    it("translates arithmetic and comparison primitives", () => {
        expect(l2ToPythonResult(`(+ 1 2 3)`)).toStrictEqual(makeOk(`(1 + 2 + 3)`));
        expect(l2ToPythonResult(`(- 10 4)`)).toStrictEqual(makeOk(`(10 - 4)`));
        expect(l2ToPythonResult(`(* (+ 1 2) (- 7 3))`)).toStrictEqual(makeOk(`((1 + 2) * (7 - 3))`));
        expect(l2ToPythonResult(`(/ 8 2)`)).toStrictEqual(makeOk(`(8 / 2)`));
        expect(l2ToPythonResult(`(< x 10)`)).toStrictEqual(makeOk(`(x < 10)`));
        expect(l2ToPythonResult(`(> x y)`)).toStrictEqual(makeOk(`(x > y)`));
        expect(l2ToPythonResult(`(= x y)`)).toStrictEqual(makeOk(`(x == y)`));
        expect(l2ToPythonResult(`(eq? x y)`)).toStrictEqual(makeOk(`(x == y)`));
    });

    it("translates boolean primitives", () => {
        expect(l2ToPythonResult(`(and #t #f)`)).toStrictEqual(makeOk(`(True and False)`));
        expect(l2ToPythonResult(`(or #f b)`)).toStrictEqual(makeOk(`(False or b)`));
        expect(l2ToPythonResult(`(not (= x 0))`)).toStrictEqual(makeOk(`(not (x == 0))`));
    });

    it("translates supported type predicates", () => {
        expect(l2ToPythonResult(`(number? 5)`)).toStrictEqual(makeOk(`(lambda x : (type(x) == int or type(x) == float))(5)`));
        expect(l2ToPythonResult(`(boolean? #t)`)).toStrictEqual(makeOk(`(lambda x : (type(x) == bool))(True)`));
    });

    it("translates conditionals", () => {
        expect(l2ToPythonResult(`(if (> x 0) (+ x 1) (- x 1))`)).toStrictEqual(makeOk(`((x + 1) if (x > 0) else (x - 1))`));
    });

    it("translates lambdas with one and multiple parameters", () => {
        expect(l2ToPythonResult(`(lambda (x) (+ x 1))`)).toStrictEqual(makeOk(`(lambda x : (x + 1))`));
        expect(l2ToPythonResult(`(lambda (x y) (* x y))`)).toStrictEqual(makeOk(`(lambda x,y : (x * y))`));
    });

    it("translates direct and higher-order function applications", () => {
        expect(l2ToPythonResult(`((lambda (x) (* x x)) 7)`)).toStrictEqual(makeOk(`(lambda x : (x * x))(7)`));
        expect(l2ToPythonResult(`((f 1) (+ 2 3))`)).toStrictEqual(makeOk(`f(1)((2 + 3))`));
    });

    it("translates programs with definitions and expression results", () => {
        expect(bind(parseL3(`
            (L3
                (define truth #t)
                (define s "hi")
                (define f (lambda (x) (not (= x 0))))
                (f 5)
                (if truth s "no"))
        `), l2ToPython)).toStrictEqual(makeOk(`truth = True\ns = "hi"\nf = (lambda x : (not (x == 0)))\nf(5)\n(s if truth else "no")`));
    });

    it("returns failures for unsupported L3 constructs", () => {
        expect(isFailure(l2ToPythonResult(`(let ((x 1)) x)`))).toStrictEqual(true);
        expect(isFailure(l2ToPythonResult(`'x`))).toStrictEqual(true);
        expect(isFailure(l2ToPythonResult(`(class (x) ((get (lambda () x))))`))).toStrictEqual(true);
        expect(isFailure(l2ToPythonResult(`(cons 1 '())`))).toStrictEqual(true);
    });

});
