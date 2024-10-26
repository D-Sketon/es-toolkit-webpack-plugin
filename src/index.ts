import * as esToolkitCompat from "es-toolkit/compat";
import type { Compiler } from "webpack";
import type {
  Identifier,
  ImportDeclaration,
  ImportSpecifier,
  Literal,
  VariableDeclaration,
} from "acorn";

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
            parser.hooks.program.tap("MyPlugin", (ast: any) => {
              const originalSource: string = parser.state?.module
                .originalSource()
                ?.source()
                .toString();

              if (!originalSource) {
                return;
              }

              for (let i = 0; i < ast.body.length; i++) {
                const declaration = ast.body[i];
                switch (declaration.type) {
                  case "ImportDeclaration": {
                    const node = declaration as ImportDeclaration;
                    if (
                      node.source.value === "lodash-es" ||
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
                        } else if (
                          specifier.type === "ImportNamespaceSpecifier"
                        ) {
                          hasNamespaceSpecifier = true;
                        }
                      });
                      // if both are present, then we need to separate them
                      if (hasDefaultSpecifier && hasImportSpecifier) {
                        const clonedNode = esToolkitCompat.cloneDeep(node);
                        // remove the ImportDefaultSpecifier from node
                        node.specifiers = node.specifiers.filter(
                          (specifier) =>
                            specifier.type !== "ImportDefaultSpecifier"
                        );
                        // remove the ImportSpecifier from clonedNode
                        clonedNode.specifiers = clonedNode.specifiers.filter(
                          (specifier) => specifier.type !== "ImportSpecifier"
                        );
                        // add the clonedNode after the current node
                        ast.body.splice(i + 1, 0, clonedNode);
                        i--;
                        continue;
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

                        const unsupportedFunctions = usedFunctions.filter(
                          (fn) => this.isUnsupportedFunction(fn)
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
                        const unsupportedImportNodes = (
                          node.specifiers as ImportSpecifier[]
                        ).filter((specifier) =>
                          this.isUnsupportedFunction(
                            (specifier.imported as Identifier).name
                          )
                        );
                        if (unsupportedImportNodes.length === 0) {
                          // all functions are supported
                          // import { isEqual, isEqualWith } from 'es-toolkit/compat';
                          node.source.value = "es-toolkit/compat";
                          node.source.raw = "'es-toolkit/compat'";
                        } else if (
                          unsupportedImportNodes.length ===
                          node.specifiers.length
                        ) {
                          // all functions are unsupported
                          // do nothing
                        } else {
                          // we need to separate the supported and unsupported functions
                          const supportedImportNodes = (
                            node.specifiers as ImportSpecifier[]
                          ).filter(
                            (specifier) =>
                              !this.isUnsupportedFunction(
                                (specifier.imported as Identifier).name
                              )
                          );
                          const oldSourceValue = node.source.value;
                          const oldSourceRaw = node.source.raw;
                          node.specifiers = supportedImportNodes;
                          node.source.value = "es-toolkit/compat";
                          node.source.raw = "'es-toolkit/compat'";
                          // add a new ImportDeclaration for the unsupported functions
                          const newImportDeclaration =
                            esToolkitCompat.cloneDeep(node);
                          newImportDeclaration.specifiers =
                            unsupportedImportNodes;
                          newImportDeclaration.source.value = oldSourceValue;
                          newImportDeclaration.source.raw = oldSourceRaw;
                          // add the new ImportDeclaration after the current node
                          ast.body.splice(i + 1, 0, newImportDeclaration);
                          i++;
                        }
                      }
                    } else if (
                      typeof node.source.value === "string" &&
                      (node.source.value.match(/^lodash\/\w+\.js$/) ||
                        node.source.value.match(/^lodash-es\/\w+\.js$/))
                    ) {
                      // import isEqual from 'lodash/isEqual.js';
                      // -> import { isEqual } from 'es-toolkit/compat';
                      // assume that there is only one specifier
                      const specifier = node.specifiers[0] as ImportSpecifier;
                      const singleImportFileName = node.source.value
                        .split("/")[1]
                        .split(".")[0];

                      // check supported function
                      if (this.isSupportedFunction(singleImportFileName)) {
                        node.source.value = "es-toolkit/compat";
                        node.source.raw = "'es-toolkit/compat'";
                        specifier.type = "ImportSpecifier";
                        specifier.imported = esToolkitCompat.cloneDeep(
                          specifier.local
                        );
                        specifier.imported.name = singleImportFileName;
                      }
                    } else if (
                      typeof node.source.value === "string" &&
                      node.source.value.match(/^lodash\.\w+$/)
                    ) {
                      // import isEqual from 'lodash.isequal';
                      // get the function name
                      const functionName = node.source.value.split(".")[1];
                      let singleImportFileName: string | undefined;
                      if (
                        (singleImportFileName = this.supportedFunctions.find(
                          (i) => i.toLowerCase() === functionName.toLowerCase()
                        ))
                      ) {
                        // import { isEqual } from 'es-toolkit/compat';
                        const specifier = node.specifiers[0] as ImportSpecifier;
                        node.source.value = "es-toolkit/compat";
                        node.source.raw = "'es-toolkit/compat'";
                        specifier.type = "ImportSpecifier";
                        specifier.imported = esToolkitCompat.cloneDeep(
                          specifier.local
                        );
                        specifier.imported.name = singleImportFileName;
                      }
                    }
                    break;
                  }
                  case "VariableDeclaration": {
                    // check if const _ = require('lodash');
                    const node = declaration as VariableDeclaration;
                    if (
                      node.declarations.length === 1 &&
                      node.declarations[0].init?.type === "CallExpression" &&
                      node.declarations[0].init.callee.type === "Identifier" &&
                      node.declarations[0].init.callee.name === "require"
                    ) {
                      // check if the argument is 'lodash'
                      const requireArgument =
                        node.declarations[0].init.arguments[0];
                      if (
                        requireArgument.type === "Literal" &&
                        (requireArgument.value === "lodash" ||
                          requireArgument.value === "lodash-es")
                      ) {
                        const variableName = (
                          node.declarations[0].id as Identifier
                        ).name;
                        if (typeof variableName !== "string") {
                          return;
                        }
                        const globalImportUsages = originalSource.match(
                          new RegExp(`\\b${variableName}\\.\\w+`, "g")
                        );

                        if (!globalImportUsages) {
                          // since there are no usages, we don't need to do anything
                          return;
                        }

                        const usedFunctions = globalImportUsages.map(
                          (usage) => usage.split(".")[1] || ""
                        );

                        const unsupportedFunctions = usedFunctions.filter(
                          (fn) => this.isUnsupportedFunction(fn)
                        );

                        if (unsupportedFunctions.length) {
                          this.warnUnsupportedFunction(unsupportedFunctions);
                          return;
                        }

                        // const _ = require('es-toolkit/compat');
                        (
                          node.declarations[0].init.arguments[0] as Literal
                        ).value = "es-toolkit/compat";
                        (
                          node.declarations[0].init.arguments[0] as Literal
                        ).raw = "'es-toolkit/compat'";
                      }
                    }
                    break;
                  }
                }
              }
            });
          });
      }
    );
  }
}
