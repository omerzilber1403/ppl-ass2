import {
    ClassExp, ProcExp, Exp, Program, CExp, Binding,
    isProgram, isDefineExp, isClassExp, isProcExp, isIfExp, isAppExp, isLetExp,
    makeProgram, makeDefineExp, makeProcExp, makeVarDecl, makeVarRef,
    makePrimOp, makeAppExp, makeIfExp, makeBinding, makeLetExp, makeLitExp
} from "./L3-ast";
import { makeSymbolSExp } from "./L3-value";
import { Result, makeOk, bind, mapResult, mapv } from "../shared/result";

/*
Purpose: Transform ClassExp to ProcExp
Signature: class2proc(classExp)
Type: ClassExp => ProcExp
*/
export const class2proc = (exp: ClassExp): ProcExp =>
    makeProcExp(exp.fields, [
        makeProcExp([makeVarDecl("msg")], [makeMethodDispatch(exp.methods)])
    ]);

const methodBody = (method: Binding): CExp =>
    isProcExp(method.val) ? method.val.body[0] : method.val;

const makeMethodDispatch = (methods: Binding[]): CExp =>
    methods.length === 0 ?
        makeLitExp(makeSymbolSExp("error")) :
        makeIfExp(
            makeAppExp(makePrimOp("eq?"), [
                makeVarRef("msg"),
                makeLitExp(makeSymbolSExp(methods[0].var.var))
            ]),
            methodBody(methods[0]),
            makeMethodDispatch(methods.slice(1))
        );


/*
Purpose: Transform all class forms in the given AST to procs
Signature: transform(AST)
Type: [Exp | Program] => Result<Exp | Program>
*/

export const transform = (exp: Exp | Program): Result<Exp | Program> =>
    isProgram(exp) ?
        mapv(mapResult(transformExp, exp.exps), (exps: Exp[]) => makeProgram(exps)) :
        transformExp(exp);

const transformExp = (exp: Exp): Result<Exp> =>
    isDefineExp(exp) ?
        mapv(transformCExp(exp.val), (val: CExp) => makeDefineExp(exp.var, val)) :
        transformCExp(exp);

const transformClassExp = (exp: ClassExp): Result<ProcExp> =>
    mapv(
        mapResult(
            (method: Binding) =>
                mapv(transformCExp(method.val), (val: CExp) =>
                    makeBinding(method.var.var, val)),
            exp.methods
        ),
        (methods: Binding[]) => class2proc({ ...exp, methods })
    );

const transformCExp = (exp: CExp): Result<CExp> =>
    isClassExp(exp) ? transformClassExp(exp) :
    isProcExp(exp) ?
        mapv(mapResult(transformCExp, exp.body), (body: CExp[]) =>
            makeProcExp(exp.args, body)) :
    isIfExp(exp) ?
        bind(transformCExp(exp.test), (test: CExp) =>
            bind(transformCExp(exp.then), (then: CExp) =>
                mapv(transformCExp(exp.alt), (alt: CExp) =>
                    makeIfExp(test, then, alt)))) :
    isAppExp(exp) ?
        bind(transformCExp(exp.rator), (rator: CExp) =>
            mapv(mapResult(transformCExp, exp.rands), (rands: CExp[]) =>
                makeAppExp(rator, rands))) :
    isLetExp(exp) ?
        bind(
            mapResult(
                (binding: Binding) =>
                    mapv(transformCExp(binding.val), (val: CExp) =>
                        makeBinding(binding.var.var, val)),
                exp.bindings
            ),
            (bindings: Binding[]) =>
                mapv(mapResult(transformCExp, exp.body), (body: CExp[]) =>
                    makeLetExp(bindings, body))
        ) :
    makeOk(exp);
