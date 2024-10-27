import * as esToolkitCompat from "es-toolkit/compat";
import type { Compiler } from "webpack";
import type {
  Identifier,
  ImportDeclaration,
  ImportSpecifier,
  Literal,
  VariableDeclaration,
  MemberExpression,
  PrivateIdentifier,
} from "acorn";

const lodashSinglePattern = /^lodash\/\w+\.js$/;
const lodashEsSinglePattern = /^lodash-es\/\w+\.js$/;
const lodashDotSinglePattern = /^lodash\.\w+$/;

export interface WebpackEsToolkitPluginOptions {
  excludes?: string[];
}

export default class WebpackEsToolkitPlugin {
  supportedFunctions: string[];
  excludes: string[];

  constructor(options: WebpackEsToolkitPluginOptions = {}) {
    this.excludes = options.excludes || [];
    this.supportedFunctions = Object.keys(esToolkitCompat);
    this.excludes.forEach((fn) => {
      const index = this.supportedFunctions.indexOf(fn);
      if (index !== -1) {
        this.supportedFunctions.splice(index, 1);
      }
    });
  }

  isSupportedFunction(name: string): boolean {
    return this.supportedFunctions.includes(name);
  }

  isUnsupportedFunction(name: string): boolean {
    return !this.isSupportedFunction(name);
  }

  private warnUnsupportedFunction(names: string[]): void {
    console.warn(
      `Unsupported lodash function${names.length > 1 ? "s" : ""}: ${names.join(
        ", "
      )}`
    );
  }

  private checkSpecifiers(node: ImportDeclaration): {
    hasDefault: boolean;
    hasSpecifier: boolean;
  } {
    let hasDefault = false,
      hasSpecifier = false;
    node.specifiers.forEach((specifier) => {
      if (specifier.type === "ImportDefaultSpecifier") hasDefault = true;
      else if (specifier.type === "ImportSpecifier") hasSpecifier = true;
    });
    return { hasDefault, hasSpecifier };
  }

  private checkSourceHasUnsupportedFunctions(
    originalSource: string,
    importName: string
  ): boolean {
    const globalImportUsages = originalSource.match(
      new RegExp(`\\b${importName}\\.\\w+`, "g")
    );

    if (!globalImportUsages) {
      // since there are no usages, we don't need to do anything
      return true;
    }
    const usedFunctions = globalImportUsages.map(
      (usage) => usage.split(".")[1] || ""
    );
    const unsupportedFunctions = usedFunctions.filter((fn) =>
      this.isUnsupportedFunction(fn)
    );
    if (unsupportedFunctions.length) {
      this.warnUnsupportedFunction(unsupportedFunctions);
      return true;
    }
    return false;
  }

  private walkAst(ast: any, originalSource: string) {
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
            const { hasDefault, hasSpecifier } = this.checkSpecifiers(node);
            // if both are present, then we need to separate them
            if (hasDefault && hasSpecifier) {
              const clonedNode = esToolkitCompat.cloneDeep(node);
              // remove the ImportDefaultSpecifier from node
              node.specifiers = node.specifiers.filter(
                (specifier) => specifier.type !== "ImportDefaultSpecifier"
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

            if (hasDefault) {
              // import _ from 'lodash';
              // assume that there is only one specifier
              const specifier = node.specifiers[0];
              const defaultImportName = specifier.local.name;

              if (
                this.checkSourceHasUnsupportedFunctions(
                  originalSource,
                  defaultImportName
                )
              ) {
                continue;
              }

              // -> import * as _ from 'es-toolkit/compat';
              node.source.value = "es-toolkit/compat";
              node.source.raw = "'es-toolkit/compat'";
              specifier.type = "ImportNamespaceSpecifier";
            } else if (hasSpecifier) {
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
                // -> import { isEqual, isEqualWith } from 'es-toolkit/compat';
                node.source.value = "es-toolkit/compat";
                node.source.raw = "'es-toolkit/compat'";
              } else if (
                unsupportedImportNodes.length !== node.specifiers.length
              ) {
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
                const newImportDeclaration = esToolkitCompat.cloneDeep(node);
                newImportDeclaration.specifiers = unsupportedImportNodes;
                newImportDeclaration.source.value = oldSourceValue;
                newImportDeclaration.source.raw = oldSourceRaw;
                // add the new ImportDeclaration after the current node
                ast.body.splice(i + 1, 0, newImportDeclaration);
                i++;
              }
            }
          } else if (
            typeof node.source.value === "string" &&
            (node.source.value.match(lodashSinglePattern) ||
              node.source.value.match(lodashEsSinglePattern))
          ) {
            // import isEqual from 'lodash/isEqual.js';
            if (
              node.specifiers.length !== 1 ||
              node.specifiers[0].type !== "ImportDefaultSpecifier"
            ) {
              // assume that there is only one specifier
              // else we don't need to do anything
              continue;
            }
            const specifier = node.specifiers[0] as unknown as ImportSpecifier;
            const singleImportFileName = node.source.value
              .split("/")[1]
              .split(".")[0];

            // check supported function
            if (this.isSupportedFunction(singleImportFileName)) {
              // -> import { isEqual } from 'es-toolkit/compat';
              node.source.value = "es-toolkit/compat";
              node.source.raw = "'es-toolkit/compat'";
              specifier.type = "ImportSpecifier";
              specifier.imported = esToolkitCompat.cloneDeep(specifier.local);
              specifier.imported.name = singleImportFileName;
            }
          } else if (
            typeof node.source.value === "string" &&
            node.source.value.match(lodashDotSinglePattern)
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
              // -> import { isEqual } from 'es-toolkit/compat';
              const specifier = node.specifiers[0] as ImportSpecifier;
              node.source.value = "es-toolkit/compat";
              node.source.raw = "'es-toolkit/compat'";
              specifier.type = "ImportSpecifier";
              specifier.imported = esToolkitCompat.cloneDeep(specifier.local);
              specifier.imported.name = singleImportFileName;
            }
          }
          break;
        }
        case "VariableDeclaration": {
          // const _ = require('lodash');
          const node = declaration as VariableDeclaration;
          if (
            node.declarations.length === 1 &&
            node.declarations[0].init?.type === "CallExpression" &&
            node.declarations[0].init.callee.type === "Identifier" &&
            node.declarations[0].init.callee.name === "require"
          ) {
            // check if the argument is 'lodash'
            const requireArgument = node.declarations[0].init.arguments[0];
            if (
              requireArgument.type === "Literal" &&
              (requireArgument.value === "lodash" ||
                requireArgument.value === "lodash-es")
            ) {
              const variableName = (node.declarations[0].id as Identifier).name;
              if (typeof variableName !== "string") {
                continue;
              }

              if (
                this.checkSourceHasUnsupportedFunctions(
                  originalSource,
                  variableName
                )
              ) {
                continue;
              }

              // -> const _ = require('es-toolkit/compat');
              (node.declarations[0].init.arguments[0] as Literal).value =
                "es-toolkit/compat";
              (node.declarations[0].init.arguments[0] as Literal).raw =
                "'es-toolkit/compat'";
            } else if (
              requireArgument.type === "Literal" &&
              ((requireArgument.value as string).match(lodashSinglePattern) ||
                (requireArgument.value as string).match(lodashEsSinglePattern))
            ) {
              // const isEqual = require('lodash/isEqual.js');
              const functionName = (requireArgument.value as string)
                .split("/")[1]
                .split(".")[0];
              if (this.isSupportedFunction(functionName)) {
                // -> const isEqual = require('es-toolkit/compat').isEqual;
                // this may increase the size of the bundle
                // TODO find a way to import only the required function
                // change init from CallExpression to MemberExpression
                const callExpression = esToolkitCompat.cloneDeep(
                  node.declarations[0].init
                );
                (callExpression.arguments[0] as Literal).value =
                  "es-toolkit/compat";
                (callExpression.arguments[0] as Literal).raw =
                  "'es-toolkit/compat'";
                const memberExpression = node.declarations[0]
                  .init as unknown as MemberExpression;
                memberExpression.type = "MemberExpression";
                memberExpression.object = callExpression;
                memberExpression.property = esToolkitCompat.cloneDeep(
                  node.declarations[0].id
                ) as unknown as PrivateIdentifier;
                memberExpression.property.name = functionName;
                memberExpression.computed = false;
                memberExpression.optional = false;
              }
            } else if (
              requireArgument.type === "Literal" &&
              (requireArgument.value as string).match(lodashDotSinglePattern)
            ) {
              // const isEqual = require('lodash.isequal');
              const functionName = (requireArgument.value as string).split(
                "."
              )[1];
              let singleImportFileName: string | undefined;
              if (
                (singleImportFileName = this.supportedFunctions.find(
                  (i) => i.toLowerCase() === functionName.toLowerCase()
                ))
              ) {
                // -> const isEqual = require('es-toolkit/compat').isEqual;
                // this may increase the size of the bundle
                // TODO find a way to import only the required function
                // change init from CallExpression to MemberExpression
                const callExpression = esToolkitCompat.cloneDeep(
                  node.declarations[0].init
                );
                (callExpression.arguments[0] as Literal).value =
                  "es-toolkit/compat";
                (callExpression.arguments[0] as Literal).raw =
                  "'es-toolkit/compat'";
                const memberExpression = node.declarations[0]
                  .init as unknown as MemberExpression;
                memberExpression.type = "MemberExpression";
                memberExpression.object = callExpression;
                memberExpression.property = esToolkitCompat.cloneDeep(
                  node.declarations[0].id
                ) as unknown as PrivateIdentifier;
                memberExpression.property.name = functionName;
                memberExpression.computed = false;
                memberExpression.optional = false;
              }
            }
          }
          break;
        }
      }
    }
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

              this.walkAst(ast, originalSource);
            });
          });
      }
    );
  }
}
