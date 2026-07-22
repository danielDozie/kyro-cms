import ts from "typescript";

const compilerOptions = {
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    baseUrl: ".",
};
const host = ts.createCompilerHost(compilerOptions);
const resolved = ts.resolveModuleName("@kyro-cms/core/client", "src/pages/preview/[collection]/[id].astro", compilerOptions, host);
console.log(resolved.resolvedModule);
