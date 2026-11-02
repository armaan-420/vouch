import { AsyncLocalStorage } from 'node:async_hooks';
const contexts=new AsyncLocalStorage<ExecutionContext>();
export function withExecutionContext<T>(ctx:ExecutionContext,run:()=>T):T{return contexts.run(ctx,run)}
export function getExecutionContext(){return contexts.getStore()}
