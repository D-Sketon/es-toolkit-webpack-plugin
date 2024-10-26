import { describe, expect, it } from "vitest";
import webpack from "webpack";
import fs from "fs";
import path from "path";
import WebpackEsToolkitPlugin from "../src";
import { VueLoaderPlugin } from "vue-loader";

const defaultConfig: any = {
  mode: "production",
  optimization: {
    minimize: false,
  },
  devtool: false,
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
  },
};

describe("loader", () => {
  it("vue-loader", () => {
    return new Promise<void>((done) => {
      const vueSrc = `<template>
  <div>{{ value }}</div>
</template>

<script setup>
import _ from 'lodash';
import { ref } from 'vue';

const value = ref(_.isEqual({}, {}));
</script>`;

      fs.writeFileSync(path.resolve(__dirname, "test.vue"), vueSrc);

      const src = `import { createApp } from 'vue';
import App from './test.vue';

createApp(App).mount('#app');`;
      fs.writeFileSync(path.resolve(__dirname, "index.js"), src);
      webpack(
        {
          ...defaultConfig,
          plugins: [new VueLoaderPlugin(), new WebpackEsToolkitPlugin()],
          entry: path.resolve(__dirname, "index.js"),
          module: {
            rules: [
              {
                test: /\.vue$/,
                loader: "vue-loader",
              },
            ],
          },
        },
        () => {
          const output = fs.readFileSync(
            path.resolve(__dirname, "dist/bundle.js"),
            "utf-8"
          );
          expect(output).toContain(
            `./node_modules/es-toolkit/dist/predicate/isEqual.mjs`
          );
          expect(output).not.toContain(`Lodash <https://lodash.com/>`);

          fs.unlinkSync(path.resolve(__dirname, "index.js"));
          fs.unlinkSync(path.resolve(__dirname, "test.vue"));
          fs.unlinkSync(path.resolve(__dirname, "dist/bundle.js"));
          done();
        }
      );
    });
  });

  it("babel-loader with jsx", () => {
    return new Promise<void>((done) => {
      const src = `import React from 'react';
import ReactDOM from 'react-dom';
import _ from 'lodash';

const App = () => {
  const [value, setValue] = React.useState(_.isEqual({}, {}));
  return <div>{value.toString()}</div>;
};

ReactDOM.render(<App />, document.getElementById('app'));`;

      fs.writeFileSync(path.resolve(__dirname, "index.jsx"), src);
      webpack(
        {
          ...defaultConfig,
          plugins: [new WebpackEsToolkitPlugin()],
          entry: path.resolve(__dirname, "index.jsx"),
          module: {
            rules: [
              {
                test: /\.jsx$/,
                loader: "babel-loader",
                options: {
                  presets: ["@babel/preset-react"],
                },
              },
            ],
          },
        },
        () => {
          const output = fs.readFileSync(
            path.resolve(__dirname, "dist/bundle.js"),
            "utf-8"
          );
          expect(output).toContain(
            `./node_modules/es-toolkit/dist/predicate/isEqual.mjs`
          );
          expect(output).not.toContain(`Lodash <https://lodash.com/>`);
          fs.unlinkSync(path.resolve(__dirname, "index.jsx"));
          fs.unlinkSync(path.resolve(__dirname, "dist/bundle.js"));
          done();
        }
      );
    });
  });
});
