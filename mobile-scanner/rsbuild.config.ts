import { defineConfig } from '@rsbuild/core';

export default defineConfig({
    html: { template: './src/index.html', title: 'Document Scanner' },
    tools: {},
    source: {
        alias: {
            '@config': process.env.NODE_ENV == "development" ? "../js_shared/config_dev.ts" : "../js_shared/config.ts"
        }
    }
});
