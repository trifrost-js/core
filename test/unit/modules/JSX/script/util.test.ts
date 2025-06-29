import {describe, it, expect} from 'vitest';
import {atomicMinify} from '../../../../../lib/modules/JSX/script/util';

describe('Modules - JSX - script - util', () => {
    describe('atomicMinify', () => {
        it('Removes spaces between symbols', () => {
            const input = `if ( a === b ) { return x + y ; }`;
            const output = `if(a===b){return x+y;}`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Preserves space between identifiers', () => {
            const input = `return true`;
            const output = `return true`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Removes line comments', () => {
            const input = `const x = 42; // this is a comment\nconst y = 5;`;
            const output = `const x=42;const y=5;`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Removes space before and after symbols', () => {
            const input = `let x = ( a + b ) * c ;`;
            const output = `let x=(a+b)*c;`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Preserves string literals with spaces', () => {
            const input = `const str = "a string with spaces";`;
            const output = `const str="a string with spaces";`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Handles single quotes correctly', () => {
            const input = `const s = 'hello world';`;
            const output = `const s='hello world';`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Does not collapse required spacing between identifiers', () => {
            const input = `let letx = 1;`; // ‘letx’ is legal identifier, should not be ‘let x’
            const output = `let letx=1;`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Removes space around colons and commas in object literals', () => {
            const input = `const obj = { a : 1 , b : 2 };`;
            const output = `const obj={a:1,b:2};`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Strips space between `!` and ident', () => {
            const input = `if ( ! x ) return;`;
            const output = `if(!x)return;`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Compacts simple arrow function', () => {
            const input = `(a , b ) => { return a + b ; }`;
            const output = `(a,b)=>{return a+b;}`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Minifies multiline function body with nested control flow', () => {
            const input = `
                function hydrate(vm) {
                    if (vm === null) {
                        return;
                    }

                    const id = vm.id;

                    if (id && typeof id === "string") {
                        registry[id] = vm;
                    }
                }
            `;
            const output = `function hydrate(vm){if(vm===null){return;}const id=vm.id;if(id&&typeof id==="string"){registry[id]=vm;}}`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Handles nested ternaries and logical expressions', () => {
            const input = `
                const result = a && b ? c : d === e ? f : g;
            `;
            const output = `const result=a&&b?c:d===e?f:g;`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Preserves string content and ignores comment formatting', () => {
            const input = `
                const template = "Hello, " + name + "!"; // greet user
                const warning = '  caution:  space-sensitive  ';
            `;
            const output = `const template="Hello, "+name+"!";const warning='  caution:  space-sensitive  ';`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Preserves template literals with embedded expressions', () => {
            const input = `
                const name = "TriFrost";
                const msg = \`Hello, \${name}! You have \${count} new messages.\`;
            `;
            const output = `const name="TriFrost";const msg=\`Hello, \${name}! You have \${count} new messages.\`;`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Handles escape characters in strings', () => {
            const input = `
                const newline = "\\n";
                const quote = '\\"quoted\\"';
            `;
            const output = `const newline="\\n";const quote='\\"quoted\\"';`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Minifies full atomic-style function with reactivity', () => {
            const input = `
                if (!window.$tfclone) {
                    window.$tfclone = v => (
                        v === undefined || v === null || typeof v !== "object"
                    ) ? v : structuredClone(v);
                }

                if (!window.$tfequal) {
                    const equal = (a, b) => {
                        if (a === b) return true;
                        if (typeof a !== typeof b) return false;
                        return JSON.stringify(a) === JSON.stringify(b);
                    };
                    window.$tfequal = equal;
                }
            `;
            const output = `if(!window.$tfclone){window.$tfclone=v=>(v===undefined||v===null||typeof v!=="object")?v:structuredClone(v);}if(!window.$tfequal){const equal=(a,b)=>{if(a===b)return true;if(typeof a!==typeof b)return false;return JSON.stringify(a)===JSON.stringify(b);};window.$tfequal=equal;}`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Preserves escaped double quotes inside double-quoted strings', () => {
            const input = `const str = "this is a \\"quoted\\" word";`;
            const output = `const str="this is a \\"quoted\\" word";`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Preserves escaped single quotes inside single-quoted strings', () => {
            const input = `const str = 'It\\'s okay';`;
            const output = `const str='It\\'s okay';`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Preserves backslashes inside strings', () => {
            const input = `const path = "C:\\\\Program Files\\\\TriFrost";`;
            const output = `const path="C:\\\\Program Files\\\\TriFrost";`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Strips simple block comments', () => {
            const input = `const x = 1; /* remove this */ const y = 2;`;
            const output = `const x=1;const y=2;`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Strips multiline block comments', () => {
            const input = `
                const x = 1; /*
                    multiline
                    comment
                */ const y = 2;
            `;
            const output = `const x=1;const y=2;`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Preserves contents inside strings with block comment syntax', () => {
            const input = `const str = "not /* a comment */";`;
            const output = `const str="not /* a comment */";`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Handles escaped backticks in template literals', () => {
            const input = 'const s = `This is a \\` backtick`;';
            const output = 'const s=`This is a \\` backtick`;';
            expect(atomicMinify(input)).toBe(output);
        });

        it('Handles multiline template literals', () => {
            const input = `
                const msg = \`Line 1
Line 2
Line 3\`;
            `;
            const output = 'const msg=`Line 1\nLine 2\nLine 3`;';
            expect(atomicMinify(input)).toBe(output);
        });

        it('Preserves spacing around template expressions', () => {
            const input = `
                const name = "Tri";
                const msg = \`Hello, \${ name }!\`;
            `;
            const output = 'const name="Tri";const msg=`Hello, ${name}!`;';
            expect(atomicMinify(input)).toBe(output);
        });

        it('Handles deeply nested expressions in template literals', () => {
            const input = `
                const msg = \`Total: \${ items.reduce((sum, item) => sum + item.price, 0) }\`;
            `;
            const output = 'const msg=`Total: ${items.reduce((sum,item)=>sum+item.price,0)}`;';
            expect(atomicMinify(input)).toBe(output);
        });

        it('Strips consecutive semicolons safely', () => {
            const input = `let x = 1;; let y = 2;;;`;
            const output = `let x=1;let y=2;`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Preserves return statements followed by object literals', () => {
            const input = `
                function f() {
                    return {
                        a: 1
                    };
                }
            `;
            const output = `function f(){return {a:1};}`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Handles optional chaining and nullish coalescing', () => {
            const input = `const val = user?.profile?.name ?? "Anonymous";`;
            const output = `const val=user?.profile?.name??"Anonymous";`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Handles arrow functions with implicit return', () => {
            const input = `const fn = x => x + 1;`;
            const output = `const fn=x=>x+1;`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Minifies chained method calls', () => {
            const input = `
                const result = arr
                    .map(x => x * 2)
                    .filter(x => x > 10)
                    .join(", ");
            `;
            const output = `const result=arr.map(x=>x*2).filter(x=>x>10).join(", ");`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Handles class methods and static fields', () => {
            const input = `
                class Example {
                    static count = 0;
                    log() {
                        console.log("Example");
                    }
                }
            `;
            const output = `class Example{static count=0;log(){console.log("Example");}}`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Handles regex literals and does not treat as comments', () => {
            const input = `
                const re = /\\/\\/*.+/g;
            `;
            const output = `const re=/\\/\\/*.+/g;`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Handles nested template expressions with string literals', () => {
            const input = `
              const greet = name => \`Hello \${name ? \`dear \${name}\` : "guest"}!\`;
            `;
            const output = `const greet=name=>\`Hello \${name?\`dear \${name}\`:"guest"}!\`;`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Handles object in template expression', () => {
            const input = `
              const msg = \`Value: \${JSON.stringify({ a: 1, b: 2 })}\`;
            `;
            const output = `const msg=\`Value: \${JSON.stringify({a:1,b:2})}\`;`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Handles function call with multiple args in template expression', () => {
            const input = `
              const msg = \`Sum: \${sum(1, 2, 3)}\`;
            `;
            const output = `const msg=\`Sum: \${sum(1,2,3)}\`;`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Handles template expressions containing ternary with logical expressions', () => {
            const input = `
              const out = \`Result: \${(a && b) ? x : y}\`;
            `;
            const output = `const out=\`Result: \${(a&&b)?x:y}\`;`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Handles backslash escapes in template expressions', () => {
            const input = `
              const val = \`Escaped \${"\\\\"} path\`;
            `;
            const output = `const val=\`Escaped \${"\\\\"} path\`;`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Handles regular expression in template expression', () => {
            const input = `
              const re = \`Check: \${/\\d+/.test("123")}\`;
            `;
            const output = `const re=\`Check: \${/\\d+/.test("123")}\`;`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Handles deeply nested ternary in template expression', () => {
            const input = `
              const val = \`Mode: \${flag ? (x ? "A" : "B") : "C"}\`;
            `;
            const output = `const val=\`Mode: \${flag?(x?"A":"B"):"C"}\`;`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Handles template with nested template inside expression', () => {
            const input = `
              const out = \`Nested: \${\`Inner: \${a + b}\`}\`;
            `;
            const output = `const out=\`Nested: \${\`Inner: \${a+b}\`}\`;`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Handles unterminated string literals gracefully', () => {
            const input = `const s = "unterminated;`;
            const output = `const s="unterminated;`; // should be unchanged
            expect(atomicMinify(input)).toBe(output);
        });

        it('Ignores unterminated block comments gracefully', () => {
            const input = `const x = 1; /* start comment`;
            const output = `const x=1;`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Handles escaped slash inside regex', () => {
            const input = `const re = /\\//g;`;
            const output = `const re=/\\//g;`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Distinguishes division from regex literal', () => {
            const input = `const ratio = x / y;`;
            const output = `const ratio=x/y;`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Handles object literals correctly inside ${...}', () => {
            const input = 'const x = `Value: ${ { a: 1, b: 2 } }`;';
            const output = 'const x=`Value: ${{a:1,b:2}}`;';
            expect(atomicMinify(input)).toBe(output);
        });

        it('Preserves multiline comment inside template string', () => {
            const input = 'const x = `/* not a comment */`;';
            const output = 'const x=`/* not a comment */`;';
            expect(atomicMinify(input)).toBe(output);
        });

        it('Ignores angle brackets in string content (e.g. JSX like)', () => {
            const input = 'const html = "<div>content</div>";';
            const output = 'const html="<div>content</div>";';
            expect(atomicMinify(input)).toBe(output);
        });

        it('Preserves slashes in URLs inside strings', () => {
            const input = 'const url = "https://example.com/foo/bar";';
            const output = 'const url="https://example.com/foo/bar";';
            expect(atomicMinify(input)).toBe(output);
        });

        it('Preserves contents inside eval strings', () => {
            const input = `eval("if (a > b) { console.log(a); }");`;
            const output = `eval("if (a > b) { console.log(a); }");`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Handles escaped backslashes before interpolation in template', () => {
            const input = 'const s = `Path: \\\\${folder}`;';
            const output = 'const s=`Path: \\\\${folder}`;';
            expect(atomicMinify(input)).toBe(output);
        });

        it('Preserves spacing between keywords and identifiers', () => {
            const input = `return null;`;
            const output = `return null;`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Preserves spacing between keywords and identifiers when if-wrapped', () => {
            const input = `if (x > 10) return null;`;
            const output = `if(x>10)return null;`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Preserves spacing between keywords and identifiers when if-with-braces wrapped', () => {
            const input = `if (x > 10) { return null; }`;
            const output = `if(x>10){return null;}`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Preserves spacing between keywords when function wrapped', () => {
            const input = `["query", (n, q) => {
                    if (!n?.querySelector || typeof q !== "string") return null;
                    const scopable = n.nodeType === Node.ELEMENT_NODE && !q.trimStart().startsWith(":scope");

                    try {
                        return n.querySelector(scopable ? ":scope " + q : q);
                    } catch {
                        return null;
                    }
                }],`;
            expect(atomicMinify(input)).toBe(
                [
                    '["query",(n,q)=>{',
                    'if(!n?.querySelector||typeof q!=="string")return null;',
                    'const scopable=n.nodeType===Node.ELEMENT_NODE&&!q.trimStart().startsWith(":scope");',
                    'try{',
                    'return n.querySelector(scopable?":scope "+q:q);',
                    '}catch{',
                    'return null;',
                    '}',
                    '}],',
                ].join(''),
            );
        });

        it('Preserves spacing between keyword and unicode identifier', () => {
            const input = `return 名字;`;
            const output = `return 名字;`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Minifies expressions using unicode identifiers', () => {
            const input = `if (数据 === 值) { return 结果; }`;
            const output = `if(数据===值){return 结果;}`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Handles unicode in strings', () => {
            const input = `const emoji = "✅ ✅ ✅";`;
            const output = `const emoji="✅ ✅ ✅";`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Handles unicode escapes in strings', () => {
            const input = `const check = "\\u2714";`;
            const output = `const check="\\u2714";`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Handles unicode content inside template literal', () => {
            const input = 'const msg = `你好，世界`;';
            const output = 'const msg=`你好，世界`;';
            expect(atomicMinify(input)).toBe(output);
        });

        it('Handles unicode content inside template expression', () => {
            const input = 'const msg = `名字: ${名字}`;';
            const output = 'const msg=`名字: ${名字}`;';
            expect(atomicMinify(input)).toBe(output);
        });

        it('Does not inject sentinel after method call with unicode identifier', () => {
            const input = `对象.返回({ a: 1 });`;
            const output = `对象.返回({a:1});`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Handles emojis and surrogate pairs in strings correctly', () => {
            const input = `const smile = "😊";`;
            const output = `const smile="😊";`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Handles unicode and emoji identifiers (ES2022+)', () => {
            const input = `const 🧊TriFrost = "cold"; return 🧊TriFrost;`;
            const output = `const 🧊TriFrost="cold";return 🧊TriFrost;`;
            expect(atomicMinify(input)).toBe(output);
        });

        it('Minifies complex multiline logic with nested expressions, templates, strings, comments', () => {
            const input = `
                // User greeting
                function greet(user) {
                    const name = user?.name ?? "Guest";
                    const info = {
                        id: user.id,
                        active: true
                    };

                    const msg = \`Welcome, \${name}!
        Your ID is: \${info.id}
        Status: \${info.active ? "Active" : "Inactive"}\`;

                    /* log the message */
                    console.log(msg);

                    return {
                        raw: msg,
                        summary: \`[\${name}] - \${info.active ? "✅" : "❌"}\`
                    };
                }
            `;
            const output = `function greet(user){const name=user?.name??"Guest";const info={id:user.id,active:true};const msg=\`Welcome, \${name}!
        Your ID is: \${info.id}
        Status: \${info.active?"Active":"Inactive"}\`;console.log(msg);return {raw:msg,summary:\`[\${name}] - \${info.active?"✅":"❌"}\`};}`;
            expect(atomicMinify(input)).toBe(output);
        });
    });
});
