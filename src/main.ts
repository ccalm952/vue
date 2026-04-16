import { createApp } from "vue";
import { createPinia } from "pinia";
import "./styles/filter-section.css";
import "./styles/scrollbar-hide.css";

import App from "./App.vue";
import router from "./router";
// 需要放在 Element Plus 样式之后，避免覆盖掉 :root 上定义的字体变量。
import "./styles/typography.css";

const app = createApp(App);

app.use(createPinia());
app.use(router);

app.mount("#app");
