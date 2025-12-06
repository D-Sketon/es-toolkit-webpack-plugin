import { afterEach, describe, expect, it } from "vitest";
import webpack from "webpack";
import fs from "fs";
import path from "path";
import WebpackEsToolkitPlugin from "../src";

const ENTRY = path.resolve(__dirname, "test.js");
const OUTPUT = path.resolve(__dirname, "dist/main.js");

// 检�?es-toolkit 版本
function getEsToolkitVersion(): string {
  try {
    const pkgPath = require.resolve('es-toolkit/package.json');
    const pkg = require(pkgPath);
    return pkg.version;
  } catch {
    return '0.0.0';
  }
}

function compareVersion(version: string, target: string): number {
  const v1 = version.split('.').map(Number);
  const v2 = target.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (v1[i] > v2[i]) return 1;
    if (v1[i] < v2[i]) return -1;
  }
  return 0;
}

const esToolkitVersion = getEsToolkitVersion();
const supportsCompatSubpath = compareVersion(esToolkitVersion, '1.39.5') >= 0;

const isFunctionPath = supportsCompatSubpath
  ? "/node_modules/es-toolkit/dist/compat/predicate/isFunction.mjs"
  : "/node_modules/es-toolkit/dist/predicate/isFunction.mjs";

const defaultConfig: any = {
  entry: ENTRY,
  mode: "production",
  optimization: {
    minimize: false,
  },
  devtool: false,
  plugins: [new WebpackEsToolkitPlugin()],
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "main.js",
    library: {
      type: "commonjs2",
    },
  },
};

const webpackBuilder = (
  src: string,
  contains: string[],
  notContains: string[],
  done: (value?: any | PromiseLike<any>) => void,
  options?: any,
  executor?: (requireOutput: any) => void
) => {
  fs.writeFileSync(ENTRY, src);
  webpack({ ...defaultConfig, ...options }, (err, stats) => {
    if (err) {
      return done(Promise.reject(err));
    }
    if (stats?.hasErrors()) {
      return done(Promise.reject(new Error(stats.toString())));
    }

    try {
      const output = fs.readFileSync(OUTPUT, "utf-8");
      contains.forEach((c) => expect(output).toContain(c));
      notContains.forEach((c) => expect(output).not.toContain(c));
      
      // Execute the generated code if executor is provided
      if (executor) {
        // Clear the require cache to ensure fresh module load
        delete require.cache[OUTPUT];
        const outputModule = require(OUTPUT);
        executor(outputModule);
      }
      
      done();
    } catch (error) {
      done(Promise.reject(error));
    }
  });
};

describe.sequential("lodash", () => {
  afterEach(() => {
    try {
      fs.unlinkSync(ENTRY);
      fs.unlinkSync(OUTPUT);
    } catch {}
  });

  describe("default import", () => {
    it("should replace default import from lodash with named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import _ from 'lodash';
          export const result1 = _.isEqual({a: 1}, {a: 1});
          export const result2 = _.isEqual({a: 1}, {a: 2});
          export const result3 = _.isFunction(() => {});
          export const result4 = _.isFunction(123);`,
          [
            "/node_modules/es-toolkit/dist/predicate/isEqual.mjs",
            isFunctionPath,
          ],
          ["Lodash <https://lodash.com/>"],
          done,
          undefined,
          (output) => {
            expect(output.result1).toBe(true);
            expect(output.result2).toBe(false);
            expect(output.result3).toBe(true);
            expect(output.result4).toBe(false);
          }
        );
      });
    });

    it("should keep default import from lodash if an unsupported function is imported", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import _ from 'lodash';
          export const result1 = _.sortedUniq([1, 1, 2, 2, 3]);
          export const result2 = _.isFunction(() => {});`,
          ["Lodash <https://lodash.com/>"],
          [isFunctionPath],
          done,
          undefined,
          (output) => {
            expect(output.result1).toEqual([1, 2, 3]);
            expect(output.result2).toBe(true);
          }
        );
      });
    });

    it("should not raise false positives for unsupported functions", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import lodash from 'lodash';
          const totallynotlodash = { sortedUniq: (arr) => arr };
          export const result1 = totallynotlodash.sortedUniq([1, 1, 2]);
          export const result2 = lodash.isEqual({a: 1}, {a: 1});`,
          ["/node_modules/es-toolkit/dist/predicate/isEqual.mjs"],
          ["Lodash <https://lodash.com/>"],
          done,
          undefined,
          (output) => {
            expect(output.result1).toEqual([1, 1, 2]);
            expect(output.result2).toBe(true);
          }
        );
      });
    });
  });

  describe("named import", () => {
    it("should replace named import from lodash with named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import { isEqual } from 'lodash';
          export const result1 = isEqual({a: 1}, {a: 1});
          export const result2 = isEqual([1, 2, 3], [1, 2, 3]);`,
          ["/node_modules/es-toolkit/dist/predicate/isEqual.mjs"],
          ["Lodash <https://lodash.com/>"],
          done,
          undefined,
          (output) => {
            expect(output.result1).toBe(true);
            expect(output.result2).toBe(true);
          }
        );
      });
    });

    it("should keep unsupported named imports from lodash", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import { sortedUniq } from 'lodash';
          export const result = sortedUniq([1, 1, 2, 2, 3]);`,
          ["Lodash <https://lodash.com/>"],
          [],
          done,
          undefined,
          (output) => {
            expect(output.result).toEqual([1, 2, 3]);
          }
        );
      });
    });

    it("should replace multiple named imports from lodash with named imports from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import { isEqual, isFunction } from 'lodash';
          export const result1 = isEqual({}, {});
          export const result2 = isFunction(() => {});`,
          [
            "/node_modules/es-toolkit/dist/predicate/isEqual.mjs",
            isFunctionPath,
          ],
          ["Lodash <https://lodash.com/>"],
          done,
          undefined,
          (output) => {
            expect(output.result1).toBe(true);
            expect(output.result2).toBe(true);
          }
        );
      });
    });

    it("should replace renamed named import from lodash with named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import { isEqual as lodashIsEqual } from 'lodash';
          export const result = lodashIsEqual({x: 1, y: 2}, {x: 1, y: 2});`,
          ["/node_modules/es-toolkit/dist/predicate/isEqual.mjs"],
          ["Lodash <https://lodash.com/>"],
          done,
          undefined,
          (output) => {
            expect(output.result).toBe(true);
          }
        );
      });
    });

    it("should replace multiple renamed named imports from lodash with named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import { isEqual as lodashIsEqual, isFunction as lodashIsFunction } from 'lodash';
          export const result1 = lodashIsEqual({x: 1}, {x: 1});
          export const result2 = lodashIsFunction(Array.isArray);`,
          [
            "/node_modules/es-toolkit/dist/predicate/isEqual.mjs",
            isFunctionPath,
          ],
          ["Lodash <https://lodash.com/>"],
          done,
          undefined,
          (output) => {
            expect(output.result1).toBe(true);
            expect(output.result2).toBe(true);
          }
        );
      });
    });

    it("should replace named import from lodash with named import from es-toolkit/compat and keep unsupported named imports from lodash", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import { sortedUniq, isEqual } from 'lodash';
          export const result1 = isEqual([1, 2], [1, 2]);
          export const result2 = sortedUniq([1, 1, 2, 3, 3]);`,
          [
            "/node_modules/es-toolkit/dist/predicate/isEqual.mjs",
            "Lodash <https://lodash.com/>",
          ],
          [],
          done,
          undefined,
          (output) => {
            expect(output.result1).toBe(true);
            expect(output.result2).toEqual([1, 2, 3]);
          }
        );
      });
    });
  });

  describe("import from lodash/*.js", () => {
    it("should replace default import from lodash/*.js with named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import isEqual from 'lodash/isEqual.js';
          export const result = isEqual([1, 2], [1, 2]);`,
          ["/node_modules/es-toolkit/dist/predicate/isEqual.mjs"],
          ["Lodash <https://lodash.com/>"],
          done,
          undefined,
          (output) => {
            expect(output.result).toBe(true);
          }
        );
      });
    });

    it("should replace renamed default import from lodash/*.js with renamed named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import lodashIsEqual from 'lodash/isEqual.js';
          export const result = lodashIsEqual('test', 'test');`,
          ["/node_modules/es-toolkit/dist/predicate/isEqual.mjs"],
          ["Lodash <https://lodash.com/>"],
          done,
          undefined,
          (output) => {
            expect(output.result).toBe(true);
          }
        );
      });
    });

    it("should keep unsupported default imports from lodash/*.js", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import sortedUniq from 'lodash/sortedUniq.js';
          export const result = sortedUniq([1, 1, 2, 3, 3]);`,
          [
            "This method is like `_.uniq` except that it's designed and optimized",
          ],
          [],
          done,
          undefined,
          (output) => {
            expect(output.result).toEqual([1, 2, 3]);
          }
        );
      });
    });
  });

  describe("default and named import", () => {
    it("should replace default and named import from lodash with named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import _, { isEqual } from 'lodash';
          export const result1 = _.isFunction(() => {});
          export const result2 = _.isFunction('not a function');
          export const result3 = isEqual({a: 1}, {a: 1});`,
          [
            isFunctionPath,
            "/node_modules/es-toolkit/dist/predicate/isEqual.mjs",
          ],
          [],
          done,
          undefined,
          (output) => {
            expect(output.result1).toBe(true);
            expect(output.result2).toBe(false);
            expect(output.result3).toBe(true);
          }
        );
      });
    });

    it("should replace default and renamed named import from lodash with named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import _, { isEqual as lodashIsEqual } from 'lodash';
          export const result1 = _.isFunction(Date.now);
          export const result2 = lodashIsEqual('hello', 'hello');`,
          [
            isFunctionPath,
            "/node_modules/es-toolkit/dist/predicate/isEqual.mjs",
          ],
          [],
          done,
          undefined,
          (output) => {
            expect(output.result1).toBe(true);
            expect(output.result2).toBe(true);
          }
        );
      });
    });

    it("should keep unsupported default and named imports from lodash", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import _, { sortedUniq } from 'lodash';
          export const result1 = _.isFunction(() => {});
          export const result2 = sortedUniq([1, 1, 2, 3, 3]);`,
          [
            isFunctionPath,
            "Lodash <https://lodash.com/>",
          ],
          [],
          done,
          undefined,
          (output) => {
            expect(output.result1).toBe(true);
            expect(output.result2).toEqual([1, 2, 3]);
          }
        );
      });
    });

    it("should replace default and named import from lodash with named import from es-toolkit/compat and keep unsupported named imports from lodash", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import _, { sortedUniq, isEqual } from 'lodash';
          export const result1 = _.isFunction(parseInt);
          export const result2 = isEqual({key: 'val'}, {key: 'val'});
          export const result3 = sortedUniq([1, 1, 2, 2, 3]);`,
          [
            isFunctionPath,
            "/node_modules/es-toolkit/dist/predicate/isEqual.mjs",
            "Lodash <https://lodash.com/>",
          ],
          [],
          done,
          undefined,
          (output) => {
            expect(output.result1).toBe(true);
            expect(output.result2).toBe(true);
            expect(output.result3).toEqual([1, 2, 3]);
          }
        );
      });
    });
  });

  describe("require", () => {
    it("should replace require from lodash with named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `const _ = require('lodash');
          module.exports = { result: _.isEqual({a: 1}, {a: 1}) };`,
          [
            `function isEqual(a, b) {`,
            `return isEqualWith.isEqualWith(a, b, noop.noop);`,
          ],
          ["Lodash <https://lodash.com/>"],
          done,
          undefined,
          (output) => {
            expect(output.result).toBe(true);
          }
        );
      });
    });

    it("should keep require from lodash if an unsupported function is imported", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `const _ = require('lodash');
          module.exports = { result: _.sortedUniq([1, 1, 2, 3, 3]) };`,
          ["Lodash <https://lodash.com/>"],
          [],
          done,
          undefined,
          (output) => {
            expect(output.result).toEqual([1, 2, 3]);
          }
        );
      });
    });

    it("should replace require lodash/*.js from lodash with named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `const isEqual = require('lodash/isEqual.js');
          module.exports = { result: isEqual({a: 1}, {a: 1}) };`,
          [
            `function isEqual(a, b) {`,
            `return isEqualWith.isEqualWith(a, b, noop.noop);`,
          ],
          ["Lodash <https://lodash.com/>"],
          done,
          undefined,
          (output) => {
            expect(output.result).toBe(true);
          }
        );
      });
    });

    it("should keep require lodash/*.js from lodash if an unsupported function is imported", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `const sortedUniq = require('lodash/sortedUniq.js');
          module.exports = { result: sortedUniq([1, 1, 2, 2, 3]) };`,
          [
            "This method is like `_.uniq` except that it's designed and optimized",
          ],
          [],
          done,
          undefined,
          (output) => {
            expect(output.result).toEqual([1, 2, 3]);
          }
        );
      });
    });
  });
});

describe.sequential("lodash-es", () => {
  afterEach(() => {
    try {
      fs.unlinkSync(ENTRY);
      fs.unlinkSync(OUTPUT);
    } catch {}
  });

  describe("default import", () => {
    it("should replace default import from lodash-es with named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import _ from 'lodash-es';
          export const result1 = _.isEqual({a: 1, b: 2}, {a: 1, b: 2});
          export const result2 = _.isFunction(() => {});`,
          [
            "/node_modules/es-toolkit/dist/predicate/isEqual.mjs",
            isFunctionPath,
          ],
          [],
          done,
          undefined,
          (output) => {
            expect(output.result1).toBe(true);
            expect(output.result2).toBe(true);
          }
        );
      });
    });

    it("should keep default import from lodash-es if an unsupported function is imported", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import _ from 'lodash-es';
          export const result1 = _.sortedUniq([1, 1, 2, 3, 3]);
          export const result2 = _.isFunction(() => {});`,
          ["/node_modules/lodash-es/sortedUniq.js"],
          [isFunctionPath],
          done,
          undefined,
          (output) => {
            expect(output.result1).toEqual([1, 2, 3]);
            expect(output.result2).toBe(true);
          }
        );
      });
    });

    it("should not raise false positives for unsupported functions", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import lodash from 'lodash-es';
          const totallynotlodash = { sortedUniq: (arr) => arr };
          export const result1 = totallynotlodash.sortedUniq([1, 1, 2]);
          export const result2 = lodash.isEqual({x: 1}, {x: 1});`,
          ["/node_modules/es-toolkit/dist/predicate/isEqual.mjs"],
          ["/node_modules/lodash-es/sortedUniq.js"],
          done,
          undefined,
          (output) => {
            expect(output.result1).toEqual([1, 1, 2]);
            expect(output.result2).toBe(true);
          }
        );
      });
    });
  });

  describe("named import", () => {
    it("should replace named import from lodash-es with named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import { isEqual } from 'lodash-es';
          export const result = isEqual([1, 2, 3], [1, 2, 3]);`,
          ["/node_modules/es-toolkit/dist/predicate/isEqual.mjs"],
          [],
          done,
          undefined,
          (output) => {
            expect(output.result).toBe(true);
          }
        );
      });
    });

    it("should keep unsupported named imports from lodash-es", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import { sortedUniq } from 'lodash-es';
          export const result = sortedUniq([1, 1, 2, 3, 3]);`,
          ["/node_modules/lodash-es/sortedUniq.js"],
          [],
          done,
          undefined,
          (output) => {
            expect(output.result).toEqual([1, 2, 3]);
          }
        );
      });
    });

    it("should replace multiple named imports from lodash-es with named imports from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import { isEqual, isFunction } from 'lodash-es';
          export const result1 = isEqual({a: 1}, {a: 1});
          export const result2 = isFunction(() => {});`,
          [
            "/node_modules/es-toolkit/dist/predicate/isEqual.mjs",
            isFunctionPath,
          ],
          [],
          done,
          undefined,
          (output) => {
            expect(output.result1).toBe(true);
            expect(output.result2).toBe(true);
          }
        );
      });
    });

    it("should replace renamed named import from lodash-es with named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import { isEqual as lodashIsEqual } from 'lodash-es';
          export const result = lodashIsEqual('test', 'test');`,
          ["/node_modules/es-toolkit/dist/predicate/isEqual.mjs"],
          [],
          done,
          undefined,
          (output) => {
            expect(output.result).toBe(true);
          }
        );
      });
    });

    it("should replace multiple renamed named imports from lodash-es with named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import { isEqual as lodashIsEqual, isFunction as lodashIsFunction } from 'lodash-es';
          export const result1 = lodashIsEqual({x: 1}, {x: 1});
          export const result2 = lodashIsFunction(Boolean);`,
          [
            "/node_modules/es-toolkit/dist/predicate/isEqual.mjs",
            isFunctionPath,
          ],
          [],
          done,
          undefined,
          (output) => {
            expect(output.result1).toBe(true);
            expect(output.result2).toBe(true);
          }
        );
      });
    });

    it("should replace named import from lodash-es with named import from es-toolkit/compat and keep unsupported named imports from lodash", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import { sortedUniq, isEqual } from 'lodash-es';
          export const result1 = isEqual([1], [1]);
          export const result2 = sortedUniq([1, 1, 2, 2, 3]);`,
          [
            "/node_modules/es-toolkit/dist/predicate/isEqual.mjs",
            "/node_modules/lodash-es/sortedUniq.js",
          ],
          [],
          done,
          undefined,
          (output) => {
            expect(output.result1).toBe(true);
            expect(output.result2).toEqual([1, 2, 3]);
          }
        );
      });
    });
  });

  describe("import from lodash-es/*.js", () => {
    it("should replace default import from lodash-es/*.js with named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import isEqual from 'lodash-es/isEqual.js';
          export const result = isEqual({a: 1}, {a: 1});`,
          ["/node_modules/es-toolkit/dist/predicate/isEqual.mjs"],
          [],
          done,
          undefined,
          (output) => {
            expect(output.result).toBe(true);
          }
        );
      });
    });

    it("should replace renamed default import from lodash-es/*.js with renamed named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import lodashIsEqual from 'lodash-es/isEqual.js';
          export const result = lodashIsEqual([1, 2], [1, 2]);`,
          ["/node_modules/es-toolkit/dist/predicate/isEqual.mjs"],
          [],
          done,
          undefined,
          (output) => {
            expect(output.result).toBe(true);
          }
        );
      });
    });

    it("should keep unsupported default imports from lodash-es/*.js", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import sortedUniq from 'lodash-es/sortedUniq.js';
          export const result = sortedUniq([1, 1, 2, 3, 3]);`,
          [
            "This method is like `_.uniq` except that it's designed and optimized",
          ],
          [],
          done,
          undefined,
          (output) => {
            expect(output.result).toEqual([1, 2, 3]);
          }
        );
      });
    });
  });

  describe("default and named import", () => {
    it("should replace default and named import from lodash-es with named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import _, { isEqual } from 'lodash-es';
          export const result1 = _.isFunction(Math.max);
          export const result2 = isEqual([1, 2, 3], [1, 2, 3]);`,
          [
            isFunctionPath,
            "/node_modules/es-toolkit/dist/predicate/isEqual.mjs",
          ],
          [],
          done,
          undefined,
          (output) => {
            expect(output.result1).toBe(true);
            expect(output.result2).toBe(true);
          }
        );
      });
    });
    it("should replace default and renamed named import from lodash-es with named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import _, { isEqual as lodashIsEqual } from 'lodash-es';
          export const result1 = _.isFunction(() => 'test');
          export const result2 = lodashIsEqual('hello', 'hello');`,
          [
            isFunctionPath,
            "/node_modules/es-toolkit/dist/predicate/isEqual.mjs",
          ],
          [],
          done,
          undefined,
          (output) => {
            expect(output.result1).toBe(true);
            expect(output.result2).toBe(true);
          }
        );
      });
    });

    it("should keep unsupported default and named imports from lodash-es", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import _, { sortedUniq } from 'lodash-es';
          export const result1 = _.isFunction(() => {});
          export const result2 = sortedUniq([1, 1, 2, 3, 3]);`,
          [
            isFunctionPath,
            "/node_modules/lodash-es/sortedUniq.js",
          ],
          [],
          done,
          undefined,
          (output) => {
            expect(output.result1).toBe(true);
            expect(output.result2).toEqual([1, 2, 3]);
          }
        );
      });
    });

    it("should replace default and named import from lodash-es with named import from es-toolkit/compat and keep unsupported named imports from lodash-es", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import _, { sortedUniq, isEqual } from 'lodash-es';
          export const result1 = _.isFunction(Number);
          export const result2 = isEqual({key: 1}, {key: 1});
          export const result3 = sortedUniq([1, 1, 2, 3, 3]);`,
          [
            isFunctionPath,
            "/node_modules/es-toolkit/dist/predicate/isEqual.mjs",
            "/node_modules/lodash-es/sortedUniq.js",
          ],
          [],
          done,
          undefined,
          (output) => {
            expect(output.result1).toBe(true);
            expect(output.result2).toBe(true);
            expect(output.result3).toEqual([1, 2, 3]);
          }
        );
      });
    });
  });

  describe("require", () => {
    it("should replace require from lodash-es with named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `const _ = require('lodash-es');
          module.exports = { result: _.isEqual({x: 1}, {x: 1}) };`,
          [
            `function isEqual(a, b) {`,
            `return isEqualWith.isEqualWith(a, b, noop.noop);`,
          ],
          [`Lodash <https://lodash.com/>`],
          done,
          undefined,
          (output) => {
            expect(output.result).toBe(true);
          }
        );
      });
    });

    it("should keep require from lodash-es if an unsupported function is imported", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `const _ = require('lodash-es');
          module.exports = { result: _.sortedUniq([1, 1, 2, 3, 3]) };`,
          [`lodash_es_sortedUniq`],
          [],
          done,
          undefined,
          (output) => {
            expect(output.result).toEqual([1, 2, 3]);
          }
        );
      });
    });

    it("should replace require lodash-es/*.js from lodash with named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `const isEqual = require('lodash-es/isEqual.js');
          module.exports = { result: isEqual({a: 1}, {a: 1}) };`,
          [
            `function isEqual(a, b) {`,
            `return isEqualWith.isEqualWith(a, b, noop.noop);`,
          ],
          ["Lodash <https://lodash.com/>"],
          done,
          undefined,
          (output) => {
            expect(output.result).toBe(true);
          }
        );
      });
    });

    it("should keep require lodash-es/*.js from lodash if an unsupported function is imported", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `const sortedUniqModule = require('lodash-es/sortedUniq.js');
          const sortedUniq = sortedUniqModule.default || sortedUniqModule;
          module.exports = { result: sortedUniq([1, 1, 2, 3, 3]) };`,
          [
            "This method is like `_.uniq` except that it's designed and optimized",
          ],
          [],
          done,
          undefined,
          (output) => {
            expect(output.result).toEqual([1, 2, 3]);
          }
        );
      });
    });
  });
});

describe.sequential("lodash-separate", () => {
  afterEach(() => {
    try {
      fs.unlinkSync(ENTRY);
      fs.unlinkSync(OUTPUT);
    } catch {}
  });

  it("support function", () => {
    return new Promise<void>((done) => {
      webpackBuilder(
        `import lodashIsEqual from 'lodash.isequal';
        export const result = lodashIsEqual({key: 'value'}, {key: 'value'});`,
        ["/node_modules/es-toolkit/dist/predicate/isEqual.mjs"],
        [],
        done,
        undefined,
        (output) => {
          expect(output.result).toBe(true);
        }
      );
    });
  });

  it("unsupported function", () => {
    return new Promise<void>((done) => {
      webpackBuilder(
        `import lodashSortedUniq from 'lodash.sorteduniq';
        export const result = lodashSortedUniq([1, 1, 2, 3, 3]);`,
        [
          "This method is like `_.uniq` except that it's designed and optimized",
        ],
        [],
        done,
        undefined,
        (output) => {
          expect(output.result).toEqual([1, 2, 3]);
        }
      );
    });
  });

  it("should replace require from lodash with named import from es-toolkit/compat", () => {
    return new Promise<void>((done) => {
      webpackBuilder(
        `const lodashIsEqual = require('lodash.isequal');
        module.exports = { result1: lodashIsEqual({a: 1}, {a: 1}), result2: lodashIsEqual({a: 1}, {a: 2}) };`,
        [
          `function isEqual(a, b) {`,
          `return isEqualWith.isEqualWith(a, b, noop.noop);`,
        ],
        [`Lodash <https://lodash.com/>`],
        done,
        undefined,
        (output) => {
          expect(output.result1).toBe(true);
          expect(output.result2).toBe(false);
        }
      );
    });
  });

  it("should keep require from lodash if an unsupported function is imported", () => {
    return new Promise<void>((done) => {
      webpackBuilder(
        `const lodashSortedUniq = require('lodash.sorteduniq');
        module.exports = { result: lodashSortedUniq([1, 1, 2, 3, 3]) };`,
        [
          "This method is like `_.uniq` except that it's designed and optimized",
        ],
        [],
        done,
        undefined,
        (output) => {
          expect(output.result).toEqual([1, 2, 3]);
        }
      );
    });
  });
});

describe.sequential("options", () => {
  afterEach(() => {
    try {
      fs.unlinkSync(ENTRY);
      fs.unlinkSync(OUTPUT);
    } catch {}
  });

  it('should exclude functions from "excludes" option', () => {
    return new Promise<void>((done) => {
      webpackBuilder(
        `import { isEqual, isFunction } from 'lodash';
        export const result1 = isEqual({a: 1}, {a: 1});
        export const result2 = isFunction(() => {});`,
        ["/node_modules/es-toolkit/dist/predicate/isEqual.mjs"],
        [isFunctionPath],
        done,
        {
          plugins: [new WebpackEsToolkitPlugin({ excludes: ["isFunction"] })],
        },
        (output) => {
          expect(output.result1).toBe(true);
          expect(output.result2).toBe(true);
        }
      );
    });
  });
});

