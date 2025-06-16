import {type ScriptEngine} from './Engine';

let active_engine:ScriptEngine|null = null;

export function setActiveScriptEngine <T extends ScriptEngine|null> (engine:T):T {
    active_engine = engine;
    return engine;
}

export function getActiveScriptEngine () {
    return active_engine;
}
