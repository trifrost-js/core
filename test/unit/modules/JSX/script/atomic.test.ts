import {describe, it, expect} from 'vitest';
import {ATOMIC_GLOBAL, ATOMIC_VM_BEFORE, ATOMIC_VM_AFTER} from '../../../../../lib/modules/JSX/script/atomic';

describe('Modules - JSX - script - atomic', () => {
    describe('ATOMIC_GLOBAL', () => {
        it('Should be minified correct', () => {
            expect(ATOMIC_GLOBAL).toBe([
                'if(!w.$tfr){',
                'const topics=Object.create(null);',
                'Object.defineProperty(w,"$tfr",{',
                'value:Object.freeze({',
                'publish:(msg,data)=>{',
                'if(typeof msg !=="string" || !topics[msg])return;',
                'for(let i=0;i<topics[msg].length;i++)try{topics[msg][i].fn(data)}catch{}',
                '},',
                'subscribe:(vmid,msg,fn)=>{',
                'if(',
                'typeof vmid !=="string" || ',
                'typeof msg !=="string" || ',
                'typeof fn !=="function"',
                ')return;',
                'const subs=(topics[msg]??=[]);',
                'const idx=subs.findIndex(el=>el.id===vmid);',
                'if(idx>=0)subs[idx].fn=fn;',
                'else subs.push({id:vmid,fn});',
                '},',
                'unsubscribe:(vmid,msg)=>{',
                'if(typeof vmid !=="string")return;',
                'if(typeof msg==="string"){',
                'if(!(msg in topics))return;',
                'topics[msg]=topics[msg].filter(el=>el.id !==vmid);',
                '}else{',
                'for(const key of Object.keys(topics)){',
                'topics[key]=topics[key].filter(el=>el.id !==vmid);',
                '}',
                '}',
                '}',
                '}),',
                'writable:!1,',
                'configurable:!1',
                '});',
                '}',
                'if(!w.$tfo){',
                'const observer=new MutationObserver(e=>{',
                'for(let x of e){',
                'for(let nRemoved of x.removedNodes){',
                'if(nRemoved.$tfVM){',
                'if(typeof nRemoved.$unmount==="function")try{nRemoved.$unmount()}catch{}',
                'w.$tfr?.unsubscribe(nRemoved.$uid)',
                '}',
                '}',
                '}',
                '});',
                'observer.observe(d.body,{childList:!0,subtree:!0});',
                'w.$tfo=observer;',
                '}',
                'if(!w.$tfs){',
                'const store=Object.create(null);',
                'Object.defineProperty(w,"$tfs",{',
                'value:Object.freeze({',
                'get:key=>{',
                'if(typeof key !=="string" || !key)return undefined;',
                'return store[key]',
                '},',
                'set:(key,val)=>{',
                'if(typeof key !=="string" || !key)return;',
                'store[key]=val;',
                'w.$tfr.publish("$store:"+key,val);',
                '},',
                '}),',
                'writable:!1,',
                'configurable:!1',
                '});',
                '}',
            ].join(''));
        });
    });

    describe('ATOMIC_VM_BEFORE', () => {
        it('Should be minified correct', () => {
            expect(ATOMIC_VM_BEFORE).toBe([
                'if(!n.$tfVM){',
                'const i=crypto.randomUUID?.()|| Math.random().toString(36).slice(2);',
                'Object.defineProperties(n,{',
                '$uid:{get:()=>i,configurable:!1},',
                '$subscribe:{value:(msg,fn)=>w.$tfr.subscribe(i,msg,fn),configurable:!1,writable:!1},',
                '$unsubscribe:{value:msg=>w.$tfr.unsubscribe(i,msg),configurable:!1,writable:!1},',
                '$publish:{value:(msg,data)=>w.$tfr.publish(msg,data),configurable:!1,writable:!1},',
                '$storeGet:{value:w.$tfs.get,configurable:!1,writable:!1},',
                '$storeSet:{value:w.$tfs.set,configurable:!1,writable:!1},',
                '$tfVM:{get:()=>!0,configurable:!1},',
                '});',
                '}',
            ].join(''));
        });
    });

    describe('ATOMIC_VM_AFTER', () => {
        it('Should be minified correct', () => {
            expect(ATOMIC_VM_AFTER).toBe([
                'if(typeof n.$mount==="function")try{n.$mount()}catch{}',
            ].join(''));
        });
    });
});
