import { defineConfig } from '@rsbuild/core';

export default defineConfig({
    html: {
        template({ entryName }) {
            const templates = {
                index: './src/main/index.html',
                "scanner/index": './src/scanner/index.html',
            };
            return templates[entryName] || './src/main/index.html';
        },
    },
    tools: {},
    source: {
        entry: {
            index: './src/main/index.ts',
            "scanner/index": './src/scanner/index.ts'
        },
    },
    environments: {
        local: {
            source: {
                alias: {
                    '@config': "./src/config-dev.ts"
                }
            }
        },
        next: {
            source: {
                alias: {
                    '@config': "./src/config-next.ts"
                }
            }
        },
        prd: {
            source: {
                alias: {
                    '@config': "./src/config-prd.ts"
                }
            }
        },
    }
});
