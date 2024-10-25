import { afterEach, describe, expect, it } from "vitest";
import webpack from "webpack";
import fs from "fs";
import path from "path";
import WebpackEsToolkitPlugin from "../src";

const defaultConfig: any = {
  entry: path.resolve(__dirname, "test.js"),
  mode: "production",
  optimization: {
    minimize: false,
  },
  devtool: false,
  plugins: [new WebpackEsToolkitPlugin()],
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "main.js",
  },
};

describe.sequential("lodash", () => {
  afterEach(() => {
    fs.unlinkSync(path.resolve(__dirname, "test.js"));
    fs.unlinkSync(path.resolve(__dirname, "dist/main.js"));
  });

  describe("default import", () => {
    it("should replace default import from lodash with named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        const src = `import _ from 'lodash';
  _.isEqual({}, {});
  _.isFunction(() => {});`;
        fs.writeFileSync(path.resolve(__dirname, "test.js"), src);
        webpack(defaultConfig, (err, stats) => {
          const output = fs.readFileSync(
            path.resolve(__dirname, "dist/main.js"),
            "utf-8"
          );
          expect(output).toContain(
            `./node_modules/es-toolkit/dist/predicate/isEqual.mjs`
          );
          expect(output).toContain(
            `./node_modules/es-toolkit/dist/predicate/isFunction.mjs`
          );
          expect(output).not.toContain(`Lodash <https://lodash.com/>`);
          done();
        });
      });
    });

    it("should keep default import from lodash if an unsupported function is imported", () => {
      return new Promise<void>((done) => {
        const src = `import _ from 'lodash';
  _.sortedIndex([30, 50], 40);
  _.isFunction(() => {});`;

        fs.writeFileSync(path.resolve(__dirname, "test.js"), src);
        webpack(defaultConfig, (err, stats) => {
          const output = fs.readFileSync(
            path.resolve(__dirname, "dist/main.js"),
            "utf-8"
          );
          expect(output).not.toContain(
            `./node_modules/es-toolkit/dist/predicate/isFunction.mjs`
          );
          expect(output).toContain(`Lodash <https://lodash.com/>`);
          done();
        });
      });
    });

    it("should not raise false positives for unsupported functions", () => {
      return new Promise<void>((done) => {
        const src = `import lodash from 'lodash';
  totallynotlodash.sortedIndex([30, 50], 40);
  lodash.isEqual({}, {});`;
        fs.writeFileSync(path.resolve(__dirname, "test.js"), src);
        webpack(defaultConfig, (err, stats) => {
          const output = fs.readFileSync(
            path.resolve(__dirname, "dist/main.js"),
            "utf-8"
          );
          expect(output).toContain(
            `./node_modules/es-toolkit/dist/predicate/isEqual.mjs`
          );
          expect(output).not.toContain(`Lodash <https://lodash.com/>`);
          done();
        });
      });
    });
  });

  describe("named import", () => {
    it("should replace named import from lodash with named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        const src = `import { isEqual } from 'lodash';isEqual({}, {});`;

        fs.writeFileSync(path.resolve(__dirname, "test.js"), src);
        webpack(defaultConfig, (err, stats) => {
          const output = fs.readFileSync(
            path.resolve(__dirname, "dist/main.js"),
            "utf-8"
          );
          expect(output).toContain(
            `./node_modules/es-toolkit/dist/predicate/isEqual.mjs`
          );
          expect(output).not.toContain(`Lodash <https://lodash.com/>`);
          done();
        });
      });
    });

    it("should keep unsupported named imports from lodash", () => {
      return new Promise<void>((done) => {
        const src = `import { sortedIndex } from 'lodash';sortedIndex([30, 50], 40)`;

        fs.writeFileSync(path.resolve(__dirname, "test.js"), src);
        webpack(defaultConfig, (err, stats) => {
          const output = fs.readFileSync(
            path.resolve(__dirname, "dist/main.js"),
            "utf-8"
          );
          expect(output).toContain(`Lodash <https://lodash.com/>`);
          done();
        });
      });
    });

    it("should replace multiple named imports from lodash with named imports from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        const src = `import { isEqual, isFunction } from 'lodash';
isEqual({}, {});
isFunction(() => {});`;

        fs.writeFileSync(path.resolve(__dirname, "test.js"), src);
        webpack(defaultConfig, (err, stats) => {
          const output = fs.readFileSync(
            path.resolve(__dirname, "dist/main.js"),
            "utf-8"
          );
          expect(output).toContain(
            `./node_modules/es-toolkit/dist/predicate/isEqual.mjs`
          );
          expect(output).toContain(
            `./node_modules/es-toolkit/dist/predicate/isFunction.mjs`
          );
          expect(output).not.toContain(`Lodash <https://lodash.com/>`);
          done();
        });
      });
    });

    it("should replace renamed named import from lodash with named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        const src = `import { isEqual as lodashIsEqual } from 'lodash';lodashIsEqual({}, {});`;

        fs.writeFileSync(path.resolve(__dirname, "test.js"), src);
        webpack(defaultConfig, (err, stats) => {
          const output = fs.readFileSync(
            path.resolve(__dirname, "dist/main.js"),
            "utf-8"
          );
          expect(output).toContain(
            `./node_modules/es-toolkit/dist/predicate/isEqual.mjs`
          );
          expect(output).not.toContain(`Lodash <https://lodash.com/>`);
          done();
        });
      });
    });

    it("should replace multiple renamed named imports from lodash with named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        const src = `import { isEqual as lodashIsEqual, isFunction as lodashIsFunction } from 'lodash';
lodashIsEqual({}, {});
lodashIsFunction(() => {});`;

        fs.writeFileSync(path.resolve(__dirname, "test.js"), src);
        webpack(defaultConfig, (err, stats) => {
          const output = fs.readFileSync(
            path.resolve(__dirname, "dist/main.js"),
            "utf-8"
          );
          expect(output).toContain(
            `./node_modules/es-toolkit/dist/predicate/isEqual.mjs`
          );
          expect(output).toContain(
            `./node_modules/es-toolkit/dist/predicate/isFunction.mjs`
          );
          expect(output).not.toContain(`Lodash <https://lodash.com/>`);
          done();
        });
      });
    });

    it("should replace named import from lodash with named import from es-toolkit/compat and keep unsupported named imports from lodash", () => {
      return new Promise<void>((done) => {
        const src = `import { sortedIndex, isEqual } from 'lodash';isEqual({}, {});sortedIndex([30, 50], 40)`;

        fs.writeFileSync(path.resolve(__dirname, "test.js"), src);
        webpack(defaultConfig, (err, stats) => {
          const output = fs.readFileSync(
            path.resolve(__dirname, "dist/main.js"),
            "utf-8"
          );
          expect(output).toContain(
            `./node_modules/es-toolkit/dist/predicate/isEqual.mjs`
          );
          expect(output).toContain(`Lodash <https://lodash.com/>`);
          done();
        });
      });
    });
  });

  describe("import from lodash/*.js", () => {
    it("should replace default import from lodash/*.js with named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        const src = `import isEqual from 'lodash/isEqual.js';isEqual({}, {});`;

        fs.writeFileSync(path.resolve(__dirname, "test.js"), src);
        webpack(defaultConfig, (err, stats) => {
          const output = fs.readFileSync(
            path.resolve(__dirname, "dist/main.js"),
            "utf-8"
          );
          expect(output).toContain(
            `./node_modules/es-toolkit/dist/predicate/isEqual.mjs`
          );
          expect(output).not.toContain(`Lodash <https://lodash.com/>`);
          done();
        });
      });
    });

    it("should replace renamed default import from lodash/*.js with renamed named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        const src = `import lodashIsEqual from 'lodash/isEqual.js';lodashIsEqual({}, {});`;

        fs.writeFileSync(path.resolve(__dirname, "test.js"), src);
        webpack(defaultConfig, (err, stats) => {
          const output = fs.readFileSync(
            path.resolve(__dirname, "dist/main.js"),
            "utf-8"
          );
          expect(output).toContain(
            `./node_modules/es-toolkit/dist/predicate/isEqual.mjs`
          );
          expect(output).not.toContain(`Lodash <https://lodash.com/>`);
          done();
        });
      });
    });

    it("should keep unsupported default imports from lodash/*.js", () => {
      return new Promise<void>((done) => {
        const src = `import sortedIndex from 'lodash/sortedIndex.js';sortedIndex([30, 50], 40)`;

        fs.writeFileSync(path.resolve(__dirname, "test.js"), src);
        webpack(defaultConfig, (err, stats) => {
          const output = fs.readFileSync(
            path.resolve(__dirname, "dist/main.js"),
            "utf-8"
          );
          expect(output).toContain(`Uses a binary search to determine the lowest index at which \`value\``);
          done();
        });
      });
    });
  });
});

describe.sequential("lodash-es", () => {
  afterEach(() => {
    fs.unlinkSync(path.resolve(__dirname, "test.js"));
    fs.unlinkSync(path.resolve(__dirname, "dist/main.js"));
  });

  describe("default import", () => {
    it("should replace default import from lodash-es with named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        const src = `import _ from 'lodash-es';
  _.isEqual({}, {});
  _.isFunction(() => {});`;
        fs.writeFileSync(path.resolve(__dirname, "test.js"), src);
        webpack(defaultConfig, (err, stats) => {
          const output = fs.readFileSync(
            path.resolve(__dirname, "dist/main.js"),
            "utf-8"
          );
          expect(output).toContain(
            `./node_modules/es-toolkit/dist/predicate/isEqual.mjs`
          );
          expect(output).toContain(
            `./node_modules/es-toolkit/dist/predicate/isFunction.mjs`
          );
          expect(output).not.toContain(`./node_modules/lodash-es/sortedIndex.js`);
          done();
        });
      });
    });

    it("should keep default import from lodash-es if an unsupported function is imported", () => {
      return new Promise<void>((done) => {
        const src = `import _ from 'lodash-es';
  _.sortedIndex([30, 50], 40);
  _.isFunction(() => {});`;

        fs.writeFileSync(path.resolve(__dirname, "test.js"), src);
        webpack(defaultConfig, (err, stats) => {
          const output = fs.readFileSync(
            path.resolve(__dirname, "dist/main.js"),
            "utf-8"
          );
          expect(output).not.toContain(
            `./node_modules/es-toolkit/dist/predicate/isFunction.mjs`
          );
          expect(output).toContain(`./node_modules/lodash-es/sortedIndex.js`);
          done();
        });
      });
    });

    it("should not raise false positives for unsupported functions", () => {
      return new Promise<void>((done) => {
        const src = `import lodash from 'lodash-es';
  totallynotlodash.sortedIndex([30, 50], 40);
  lodash.isEqual({}, {});`;
        fs.writeFileSync(path.resolve(__dirname, "test.js"), src);
        webpack(defaultConfig, (err, stats) => {
          const output = fs.readFileSync(
            path.resolve(__dirname, "dist/main.js"),
            "utf-8"
          );
          expect(output).toContain(
            `./node_modules/es-toolkit/dist/predicate/isEqual.mjs`
          );
          expect(output).not.toContain(`./node_modules/lodash-es/sortedIndex.js`);
          done();
        });
      });
    });
  });

  describe("named import", () => {
    it("should replace named import from lodash-es with named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        const src = `import { isEqual } from 'lodash-es';isEqual({}, {});`;

        fs.writeFileSync(path.resolve(__dirname, "test.js"), src);
        webpack(defaultConfig, (err, stats) => {
          const output = fs.readFileSync(
            path.resolve(__dirname, "dist/main.js"),
            "utf-8"
          );
          expect(output).toContain(
            `./node_modules/es-toolkit/dist/predicate/isEqual.mjs`
          );
          expect(output).not.toContain(`./node_modules/lodash-es/sortedIndex.js`);
          done();
        });
      });
    });

    it("should keep unsupported named imports from lodash-es", () => {
      return new Promise<void>((done) => {
        const src = `import { sortedIndex } from 'lodash-es';sortedIndex([30, 50], 40)`;

        fs.writeFileSync(path.resolve(__dirname, "test.js"), src);
        webpack(defaultConfig, (err, stats) => {
          const output = fs.readFileSync(
            path.resolve(__dirname, "dist/main.js"),
            "utf-8"
          );
          expect(output).toContain(`./node_modules/lodash-es/sortedIndex.js`);
          done();
        });
      });
    });

    it("should replace multiple named imports from lodash-es with named imports from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        const src = `import { isEqual, isFunction } from 'lodash-es';
isEqual({}, {});
isFunction(() => {});`;

        fs.writeFileSync(path.resolve(__dirname, "test.js"), src);
        webpack(defaultConfig, (err, stats) => {
          const output = fs.readFileSync(
            path.resolve(__dirname, "dist/main.js"),
            "utf-8"
          );
          expect(output).toContain(
            `./node_modules/es-toolkit/dist/predicate/isEqual.mjs`
          );
          expect(output).toContain(
            `./node_modules/es-toolkit/dist/predicate/isFunction.mjs`
          );
          expect(output).not.toContain(`./node_modules/lodash-es/sortedIndex.js`);
          done();
        });
      });
    });

    it("should replace renamed named import from lodash-es with named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        const src = `import { isEqual as lodashIsEqual } from 'lodash-es';lodashIsEqual({}, {});`;

        fs.writeFileSync(path.resolve(__dirname, "test.js"), src);
        webpack(defaultConfig, (err, stats) => {
          const output = fs.readFileSync(
            path.resolve(__dirname, "dist/main.js"),
            "utf-8"
          );
          expect(output).toContain(
            `./node_modules/es-toolkit/dist/predicate/isEqual.mjs`
          );
          expect(output).not.toContain(`./node_modules/lodash-es/sortedIndex.js`);
          done();
        });
      });
    });

    it("should replace multiple renamed named imports from lodash-es with named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        const src = `import { isEqual as lodashIsEqual, isFunction as lodashIsFunction } from 'lodash-es';
lodashIsEqual({}, {});
lodashIsFunction(() => {});`;

        fs.writeFileSync(path.resolve(__dirname, "test.js"), src);
        webpack(defaultConfig, (err, stats) => {
          const output = fs.readFileSync(
            path.resolve(__dirname, "dist/main.js"),
            "utf-8"
          );
          expect(output).toContain(
            `./node_modules/es-toolkit/dist/predicate/isEqual.mjs`
          );
          expect(output).toContain(
            `./node_modules/es-toolkit/dist/predicate/isFunction.mjs`
          );
          expect(output).not.toContain(`./node_modules/lodash-es/sortedIndex.js`);
          done();
        });
      });
    });

    it("should replace named import from lodash-es with named import from es-toolkit/compat and keep unsupported named imports from lodash", () => {
      return new Promise<void>((done) => {
        const src = `import { sortedIndex, isEqual } from 'lodash-es';isEqual({}, {});sortedIndex([30, 50], 40)`;

        fs.writeFileSync(path.resolve(__dirname, "test.js"), src);
        webpack(defaultConfig, (err, stats) => {
          const output = fs.readFileSync(
            path.resolve(__dirname, "dist/main.js"),
            "utf-8"
          );
          expect(output).toContain(
            `./node_modules/es-toolkit/dist/predicate/isEqual.mjs`
          );
          expect(output).toContain(`./node_modules/lodash-es/sortedIndex.js`);
          done();
        });
      });
    });
  });

  describe("import from lodash-es/*.js", () => {
    it("should replace default import from lodash-es/*.js with named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        const src = `import isEqual from 'lodash-es/isEqual.js';isEqual({}, {});`;

        fs.writeFileSync(path.resolve(__dirname, "test.js"), src);
        webpack(defaultConfig, (err, stats) => {
          const output = fs.readFileSync(
            path.resolve(__dirname, "dist/main.js"),
            "utf-8"
          );
          expect(output).toContain(
            `./node_modules/es-toolkit/dist/predicate/isEqual.mjs`
          );
          expect(output).not.toContain(`./node_modules/lodash-es/sortedIndex.js`);
          done();
        });
      });
    });

    it("should replace renamed default import from lodash-es/*.js with renamed named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        const src = `import lodashIsEqual from 'lodash-es/isEqual.js';lodashIsEqual({}, {});`;

        fs.writeFileSync(path.resolve(__dirname, "test.js"), src);
        webpack(defaultConfig, (err, stats) => {
          const output = fs.readFileSync(
            path.resolve(__dirname, "dist/main.js"),
            "utf-8"
          );
          expect(output).toContain(
            `./node_modules/es-toolkit/dist/predicate/isEqual.mjs`
          );
          expect(output).not.toContain(`./node_modules/lodash-es/sortedIndex.js`);
          done();
        });
      });
    });

    it("should keep unsupported default imports from lodash-es/*.js", () => {
      return new Promise<void>((done) => {
        const src = `import sortedIndex from 'lodash-es/sortedIndex.js';sortedIndex([30, 50], 40)`;

        fs.writeFileSync(path.resolve(__dirname, "test.js"), src);
        webpack(defaultConfig, (err, stats) => {
          const output = fs.readFileSync(
            path.resolve(__dirname, "dist/main.js"),
            "utf-8"
          );
          expect(output).toContain(`Uses a binary search to determine the lowest index at which \`value\``);
          done();
        });
      });
    });
  });
});
