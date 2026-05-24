import { evalL3program as evalSubProgram } from "../../L3/L3-eval-sub";
import { evalL3program as evalEnvProgram } from "../../L3/L3-eval-env";
import { parseL3, Program } from "../../L3/L3-ast";
import { SExpValue, Value, valueToString } from "../../L3/L3-value";
import { bind, isFailure, isOk, makeFailure, makeOk, Result } from "../../shared/result";

type EvalProgram = (program: Program) => Result<Value>;

const evaluators: { name: string; evalProgram: EvalProgram }[] = [
    { name: "substitution model", evalProgram: evalSubProgram },
    { name: "environment model", evalProgram: evalEnvProgram }
];

const evalP = (evalProgram: EvalProgram, x: string): Result<Value> =>
    bind(parseL3(x), evalProgram);

const evalP2String = (evalProgram: EvalProgram, x: string): string => {
    const res: Result<SExpValue> = bind(parseL3(x), evalProgram);
    return isOk(res) ? valueToString(res.value) : res.message;
};

describe.each(evaluators)("Q2B evaluator custom grader checks for $name", ({ evalProgram }) => {
    it("evaluates class and object values", () => {
        expect(evalP2String(evalProgram, `
            (L3
                (define box (class (x) ((get (lambda () x)))))
                box)
        `)).toStrictEqual("Class");

        expect(evalP2String(evalProgram, `
            (L3
                (define box (class (x) ((get (lambda () x)))))
                (define b (box 7))
                b)
        `)).toStrictEqual("Object");
    });

    it("dispatches zero-argument methods that read fields", () => {
        expect(evalP(evalProgram, `
            (L3
                (define pair
                    (class (a b)
                        ((first (lambda () a))
                         (second (lambda () b))
                         (sum (lambda () (+ a b))))))
                (define p (pair 3 4))
                (+ (p 'first) (p 'second) (p 'sum)))
        `)).toStrictEqual(makeOk(14));
    });

    it("keeps field values separate across object instances", () => {
        expect(evalP(evalProgram, `
            (L3
                (define box (class (x) ((get (lambda () x)))))
                (define b1 (box 1))
                (define b2 (box 10))
                (+ (b1 'get) (b2 'get)))
        `)).toStrictEqual(makeOk(11));
    });

    it("field names shadow outer bindings", () => {
        expect(evalP(evalProgram, `
            (L3
                (define x 100)
                (define box (class (x) ((get (lambda () x)))))
                (define b (box 5))
                (b 'get))
        `)).toStrictEqual(makeOk(5));
    });

    it("supports methods with parameters", () => {
        expect(evalP(evalProgram, `
            (L3
                (define linear
                    (class (a b)
                        ((at (lambda (x) (+ (* a x) b))))))
                (define f (linear 2 3))
                (f 'at 10))
        `)).toStrictEqual(makeOk(23));
    });

    it("supports methods returning closures over fields and method parameters", () => {
        expect(evalP(evalProgram, `
            (L3
                (define box
                    (class (x)
                        ((make-adder (lambda (n)
                            (lambda (z) (+ x n z)))))))
                (define b (box 5))
                ((b 'make-adder 7) 3))
        `)).toStrictEqual(makeOk(15));
    });

    it("supports nested object construction and dispatch", () => {
        expect(evalP(evalProgram, `
            (L3
                ((lambda (obj) (obj 'sum))
                    ((class (a b)
                        ((sum (lambda () (+ a b)))))
                     6 8)))
        `)).toStrictEqual(makeOk(14));
    });

    it("fails on wrong constructor arity", () => {
        expect(evalP(evalProgram, `
            (L3
                (define pair (class (a b) ((sum (lambda () (+ a b))))))
                (pair 1))
        `)).toStrictEqual(makeFailure("Wrong number of arguments to class, expected 2 but got 1"));
    });

    it("fails when dispatch receives no method name", () => {
        const res = evalP(evalProgram, `
            (L3
                (define box (class (x) ((get (lambda () x)))))
                (define b (box 1))
                (b))
        `);

        expect(isFailure(res)).toStrictEqual(true);
        if (isFailure(res)) {
            expect(res.message.startsWith("No method name supplied:")).toStrictEqual(true);
        }
    });

    it("fails when method name is not a quoted symbol", () => {
        expect(evalP(evalProgram, `
            (L3
                (define box (class (x) ((get (lambda () x)))))
                (define b (box 1))
                (b 1))
        `)).toStrictEqual(makeFailure("Method name must be a symbol: 1"));
    });

    it("fails on unknown method names", () => {
        expect(evalP(evalProgram, `
            (L3
                (define box (class (x) ((get (lambda () x)))))
                (define b (box 1))
                (b 'missing))
        `)).toStrictEqual(makeFailure("Unrecognized method: missing"));
    });

    it("fails when a method body references an unknown field", () => {
        expect(evalP(evalProgram, `
            (L3
                (define broken
                    (class (x)
                        ((bad (lambda () (+ x y))))))
                (define b (broken 1))
                (b 'bad))
        `)).toStrictEqual(makeFailure("var not found: y"));
    });

    it("fails when a method receives the wrong number of arguments", () => {
        const res = evalP(evalProgram, `
            (L3
                (define linear
                    (class (a b)
                        ((at (lambda (x) (+ (* a x) b))))))
                (define f (linear 2 3))
                (f 'at))
        `);

        expect(isFailure(res)).toStrictEqual(true);
    });
});
