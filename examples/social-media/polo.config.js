import viteSwaggerInline from "@polojs/swagger-inline-plugin/src/vite.js";

export default {
  viteConfig: {
    plugins: [viteSwaggerInline()]
  }
}