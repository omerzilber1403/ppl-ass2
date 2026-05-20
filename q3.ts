import {
    Exp, Program, CExp, AppExp, PrimOp,
    isProgram, isDefineExp, isNumExp, isBoolExp, isStrExp, isPrimOp,
    isVarRef, isIfExp, isProcExp, isAppExp
} from './L3/L3-ast';
import { Result, makeOk, makeFailure, bind, mapResult, mapv } from './shared/result';

/*
Purpose: Transform L2 AST to Python program string
Signature: l2ToPython(l2AST)
Type: [Parsed | Error] => Result<string>
*/
export const l2ToPython = (exp: Exp | Program): Result<string> =>
    isProgram(exp) ?
        mapv(mapResult(l2ExpToPython, exp.exps), (exps: string[]) => exps.join("\n")) :
        l2ExpToPython(exp);

const l2ExpToPython = (exp: Exp): Result<string> =>
    isDefineExp(exp) ?
        mapv(l2CExpToPython(exp.val), (val: string) => `${exp.var.var} = ${val}`) :
        l2CExpToPython(exp);

const l2CExpToPython = (exp: CExp): Result<string> =>
    isNumExp(exp) ? makeOk(exp.val.toString()) :
    isBoolExp(exp) ? makeOk(exp.val ? "True" : "False") :
    isStrExp(exp) ? makeOk(`"${exp.val}"`) :
    isPrimOp(exp) ? makeOk(primOpToPython(exp)) :
    isVarRef(exp) ? makeOk(exp.var) :
    isIfExp(exp) ? bind(l2CExpToPython(exp.test), (test: string) =>
        bind(l2CExpToPython(exp.then), (then: string) =>
            mapv(l2CExpToPython(exp.alt), (alt: string) =>
                `(${then} if ${test} else ${alt})`))) :
    isProcExp(exp) ? mapv(l2CExpToPython(exp.body[0]), (body: string) =>
        `(lambda ${exp.args.map((arg) => arg.var).join(",")} : ${body})`) :
    isAppExp(exp) ? appExpToPython(exp) :
    makeFailure(`Unsupported L2 expression: ${exp.tag}`);

const appExpToPython = (exp: AppExp): Result<string> =>
    isPrimOp(exp.rator) ?
        primitiveAppToPython(exp.rator, exp.rands) :
        bind(l2CExpToPython(exp.rator), (rator: string) =>
            mapv(mapResult(l2CExpToPython, exp.rands), (rands: string[]) =>
                `${rator}(${rands.join(",")})`));

const primitiveAppToPython = (op: PrimOp, rands: CExp[]): Result<string> =>
    op.op === "not" ?
        mapv(l2CExpToPython(rands[0]), (rand: string) => `(not ${rand})`) :
    isInfixOp(op.op) ?
        mapv(mapResult(l2CExpToPython, rands), (rands: string[]) =>
            `(${rands.join(` ${primOpToPython(op)} `)})`) :
        mapv(mapResult(l2CExpToPython, rands), (rands: string[]) =>
            `${primOpToPython(op)}(${rands.join(",")})`);

const isInfixOp = (op: string): boolean =>
    ["+", "-", "*", "/", "<", ">", "=", "eq?", "and", "or"].includes(op);

const primOpToPython = (op: PrimOp): string =>
    op.op === "=" || op.op === "eq?" ? "==" :
    op.op === "number?" ? "(lambda x : (type(x) == int or type(x) == float))" :
    op.op === "boolean?" ? "(lambda x : (type(x) == bool))" :
    op.op;
