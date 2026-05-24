import { parseL3, parseL3Exp, unparseL3 } from "../../L3/L3-ast";
import { bind, isFailure, makeFailure, makeOk, Result } from "../../shared/result";
import { parse as p } from "../../shared/parser";

const parseExp = (x: string) =>
    bind(p(x), parseL3Exp);

const parseUnparseExp = (x: string): Result<string> =>
    bind(parseExp(x), exp => makeOk(unparseL3(exp)));

const parseUnparseProgram = (x: string): Result<string> =>
    bind(parseL3(x), exp => makeOk(unparseL3(exp)));

const expectParseFailure = (x: string): void => {
    let res: Result<unknown> = makeFailure("parse did not run");
    expect(() => {
        res = parseExp(x);
    }).not.toThrow();
    expect(isFailure(res)).toStrictEqual(true);
};

describe("Q2A parser custom grader checks", () => {
    it("parses and unparses a class with no fields", () => {
        expect(parseUnparseExp(`
            (class ()
                ((answer (lambda () 42))))
        `)).toStrictEqual(makeOk(`(class () ((answer (lambda () 42))))`));
    });

    it("parses and unparses parameterized methods", () => {
        expect(parseUnparseExp(`
            (class (x y)
                ((first (lambda () x))
                 (shift (lambda (dx dy) (+ x y dx dy)))))
        `)).toStrictEqual(makeOk(`(class (x y) ((first (lambda () x)) (shift (lambda (dx dy) (+ x y dx dy)))))`));
    });

    it("parses and unparses nested class expressions", () => {
        expect(parseUnparseExp(`
            ((lambda (base)
                (class (x)
                    ((sum (lambda () (+ base x))))))
             10)
        `)).toStrictEqual(makeOk(`((lambda (base) (class (x) ((sum (lambda () (+ base x)))))) 10)`));
    });

    it("parses and unparses classes inside a full program", () => {
        expect(parseUnparseProgram(`
            (L3
                (define box (class (x) ((get (lambda () x)))))
                (let ((make-pair (class (a b) ((sum (lambda () (+ a b)))))))
                    (make-pair 1 2)))
        `)).toStrictEqual(makeOk(`(L3 (define box (class (x) ((get (lambda () x))))) (let ((make-pair (class (a b) ((sum (lambda () (+ a b))))))) (make-pair 1 2)))`));
    });

    it("rejects class forms with missing operands", () => {
        expectParseFailure(`(class ((get (lambda () x))))`);
    });

    it("rejects class forms with too many operands", () => {
        expectParseFailure(`(class (x) ((get (lambda () x))) extra)`);
    });

    it("rejects non-list fields", () => {
        expectParseFailure(`(class x ((get (lambda () x))))`);
    });

    it("rejects non-identifier fields", () => {
        expectParseFailure(`(class (x 1) ((get (lambda () x))))`);
    });

    it("rejects methods that are not a list of bindings", () => {
        expectParseFailure(`(class (x) (get (lambda () x)))`);
    });

    it("rejects non-identifier method names", () => {
        expectParseFailure(`(class (x) ((1 (lambda () x))))`);
    });

    it("rejects empty method bindings without throwing", () => {
        expectParseFailure(`(class (x) (()))`);
    });

    it("rejects method bindings missing a value without throwing", () => {
        expectParseFailure(`(class (x) ((get)))`);
    });
});
