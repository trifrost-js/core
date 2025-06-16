import {describe, it, expect, beforeEach} from 'vitest';
import {getActiveScriptEngine, setActiveScriptEngine} from '../../../../../lib/modules/JSX/script/use';
import {ScriptEngine} from '../../../../../lib/modules/JSX/script/Engine';

describe('Modules - JSX - Script - use', () => {
    let instance: ScriptEngine;

    beforeEach(() => {
        instance = new ScriptEngine();
        setActiveScriptEngine(null); // always reset
    });

    it('Returns null by default', () => {
        expect(getActiveScriptEngine()).toBe(null);
    });

    it('Sets and gets the active engine', () => {
        const result = setActiveScriptEngine(instance);
        expect(result).toBe(instance);
        expect(getActiveScriptEngine()).toBe(instance);
    });

    it('Allows setting to null', () => {
        setActiveScriptEngine(instance);
        expect(getActiveScriptEngine()).toBe(instance);

        setActiveScriptEngine(null);
        expect(getActiveScriptEngine()).toBe(null);
    });

    it('Returns the same instance when set twice', () => {
        const engineA = new ScriptEngine();
        const engineB = new ScriptEngine();

        setActiveScriptEngine(engineA);
        expect(getActiveScriptEngine()).toBe(engineA);

        setActiveScriptEngine(engineB);
        expect(getActiveScriptEngine()).toBe(engineB);
    });
});
