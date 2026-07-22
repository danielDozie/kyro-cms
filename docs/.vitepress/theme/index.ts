import DefaultTheme from "vitepress/theme";
import { h } from "vue";
import "./style.css";
import DocsHome from "./components/DocsHome.vue";
import FeatureGrid from "./components/FeatureGrid.vue";
import ArchitectureDiagram from "./components/ArchitectureDiagram.vue";
import ComparisonTable from "./components/ComparisonTable.vue";
import LogoMarquee from "./components/LogoMarquee.vue";
import VersionBadge from "./components/VersionBadge.vue";
import DoDont from "./components/DoDont.vue";
import CalloutBlock from "./components/CalloutBlock.vue";
import AnnouncementBanner from "./components/AnnouncementBanner.vue";

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      "layout-top": () => [
        h(AnnouncementBanner),
        h("div", { class: "kyro-noise", "aria-hidden": "true" }),
      ],
    });
  },
  enhanceApp({ app }) {
    app.component("DocsHomePage", DocsHome);
    app.component("FeatureGrid", FeatureGrid);
    app.component("ArchitectureDiagram", ArchitectureDiagram);
    app.component("ComparisonTable", ComparisonTable);
    app.component("LogoMarquee", LogoMarquee);
    app.component("VersionBadge", VersionBadge);
    app.component("DoDont", DoDont);
    app.component("Callout", CalloutBlock);
  },
};
