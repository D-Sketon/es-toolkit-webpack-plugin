import * as esToolkitCompat from "es-toolkit/compat";
import { Compiler } from "webpack";

export default class WebpackEsToolkitPlugin {
  supportedFunctions: string[];

  constructor() {
    this.supportedFunctions = Object.keys(esToolkitCompat);
  }

  isSupportedFunction(name: string): boolean {
    return this.supportedFunctions.includes(name);
  }

  isUnsupportedFunction(name: string): boolean {
    return !this.isSupportedFunction(name);
  }

  warnUnsupportedFunction(names: string[]): void {
    console.warn(
      `Unsupported lodash function${names.length > 1 ? "s" : ""}: ${names.join(
        ", "
      )}`
    );
  }

  apply(compiler: Compiler) {
    compiler.hooks.normalModuleFactory.tap(
      "ModifyImportsWebpackPlugin",
      (normalModuleFactory) => {
        normalModuleFactory.hooks.parser
          .for("javascript/auto")
          .tap("ModifyImportsWebpackPlugin", (parser) => {
            parser.hooks.program.tap("MyPlugin", (ast) => {
              const originalSource = parser.state?.module
                .originalSource()
                ?.source()
                .toString();

              for (let i = 0; i < ast.body.length; i++) {
                const node = ast.body[i];
                if (
                  node.type === "ImportDeclaration" &&
                  node.source.value === "lodash"
                ) {
                  // check if both ImportDefaultSpecifier and ImportSpecifier are present
                  let hasDefaultSpecifier = false;
                  let hasImportSpecifier = false;
                  let hasNamespaceSpecifier = false;
                  node.specifiers.forEach((specifier) => {
                    if (specifier.type === "ImportDefaultSpecifier") {
                      hasDefaultSpecifier = true;
                    } else if (specifier.type === "ImportSpecifier") {
                      hasImportSpecifier = true;
                    } else if (specifier.type === "ImportNamespaceSpecifier") {
                      hasNamespaceSpecifier = true;
                    }
                  });
                  // if both are present, then we need to separate them
                  // TODO this will be implemented in the next version
                  // currently, we are assuming that there is only one specifier
                  // which means import _, { isEqual } from 'lodash'; will not work
                  if (hasDefaultSpecifier && hasImportSpecifier) {
                    return;
                  }

                  if (hasDefaultSpecifier) {
                    // import _ from 'lodash';
                    // assume that there is only one specifier
                    const specifier = node.specifiers[0];
                    const defaultImportName = specifier.local.name;

                    const globalImportUsages = originalSource.match(
                      new RegExp(`\\b${defaultImportName}\\.\\w+`, "g")
                    );

                    if (!globalImportUsages) {
                      // since there are no usages, we don't need to do anything
                      return;
                    }

                    const usedFunctions = globalImportUsages.map(
                      (usage) => usage.split(".")[1] || ""
                    );

                    const unsupportedFunctions = usedFunctions.filter((fn) =>
                      this.isUnsupportedFunction(fn)
                    );

                    if (unsupportedFunctions.length) {
                      this.warnUnsupportedFunction(unsupportedFunctions);
                      return;
                    }

                    // import * as _ from 'es-toolkit/compat';
                    node.source.value = "es-toolkit/compat";
                    node.source.raw = "'es-toolkit/compat'";
                    node.specifiers[0].type = "ImportNamespaceSpecifier";
                  } else if (hasImportSpecifier) {
                    // import { isEqual, isEqualWith } from 'lodash';
                    const unsupportedImportNodes: any[] =
                      node.specifiers.filter((specifier) =>
                        this.isUnsupportedFunction(specifier.imported.name)
                      );
                    if (unsupportedImportNodes.length === 0) {
                      // all functions are supported
                      // import { isEqual, isEqualWith } from 'es-toolkit/compat';
                      node.source.value = "es-toolkit/compat";
                      node.source.raw = "'es-toolkit/compat'";
                    } else if (
                      unsupportedImportNodes.length === node.specifiers.length
                    ) {
                      // all functions are unsupported
                      // do nothing
                    } else {
                      // we need to separate the supported and unsupported functions
                      const supportedImportNodes: any[] =
                        node.specifiers.filter(
                          (specifier) =>
                            !this.isUnsupportedFunction(specifier.imported.name)
                        );
                      node.specifiers = supportedImportNodes;
                      node.source.value = "es-toolkit/compat";
                      node.source.raw = "'es-toolkit/compat'";
                      // add a new ImportDeclaration for the unsupported functions
                      const newImportDeclaration = structuredClone(node);
                      newImportDeclaration.specifiers = unsupportedImportNodes;
                      newImportDeclaration.source.value = "lodash";
                      newImportDeclaration.source.raw = "'lodash'";
                      // add the new ImportDeclaration after the current node
                      ast.body.splice(i + 1, 0, newImportDeclaration);
                      i++;
                    }
                  }
                } else if (
                  node.type === "ImportDeclaration" &&
                  node.source.value.match(/^lodash\/\w+\.js$/)
                ) {
                  // import isEqual from 'lodash/isEqual.js';
                  // -> import isEqual from 'es-toolkit/compat';
                  // assume that there is only one specifier
                  const specifier = node.specifiers[0];
                  const singleImportFileName = node.source.value
                    .split("/")[1]
                    .split(".")[0];

                  // check supported function
                  if (this.isSupportedFunction(singleImportFileName)) {
                    node.source.value = "es-toolkit/compat";
                    node.source.raw = "'es-toolkit/compat'";
                    specifier.type = "ImportSpecifier";
                    specifier.imported = structuredClone(specifier.local);
                    specifier.imported.name = singleImportFileName;
                  }
                } else if (
                  node.type === "ImportDeclaration" &&
                  node.source.value === "lodash-es"
                ) {
                  // TODO
                } else if (node.type === "ImportDeclaration" &&
                  node.source.value.match(/^lodash\/\w+$/)
                ) {
                  // TODO
                }
              }
            });
          });
      }
    );
  }
}
