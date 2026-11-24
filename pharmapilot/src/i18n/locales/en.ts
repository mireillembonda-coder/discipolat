import type { Dictionary } from "./fr";

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

/**
 * Traduction anglaise partielle : prépare l'internationalisation.
 * Les clés absentes retombent automatiquement sur le français (fallbackLng).
 */
const en: DeepPartial<Dictionary> = {
  app: {
    tagline: "Your pharmacy. Your data. Better decisions.",
    short: "Business intelligence for pharmacy owners",
  },
  common: {
    loading: "Loading…",
    save: "Save",
    cancel: "Cancel",
    search: "Search",
    seeAll: "See all",
    export: "Export",
    period: "Period",
    days7: "7 days",
    days30: "30 days",
    days90: "90 days",
    vsPrevious: "vs previous period",
    noData: "No data to display.",
    tableView: "Table view",
    chartView: "Chart view",
    toConnect: "To connect",
    demoData: "Sample data",
    logout: "Sign out",
    language: "Language",
    menu: "Menu",
    close: "Close",
  },
  nav: {
    sectionPilot: "Management",
    sectionTools: "Tools",
    sectionAccount: "Account",
    overview: "Overview",
    sales: "Sales",
    stock: "Inventory",
    orders: "Orders",
    alerts: "Alerts",
    reports: "Reports",
    assistant: "AI Assistant",
    import: "Data import",
    users: "Users",
    settings: "Settings",
    subscription: "Subscription",
  },
  pharmacy: { selectorLabel: "Pharmacy", switchTo: "Switch pharmacy", add: "Add a pharmacy" },
  demo: {
    banner: "Demo mode — all data shown is fictitious and does not come from any real pharmacy.",
    badge: "Demo",
    exit: "Exit demo",
    enter: "Explore the demo",
    enterHint: "No account needed, sample data only.",
  },
  auth: {
    loginTitle: "Sign in",
    loginSubtitle: "Access your pharmacy dashboard.",
    signupTitle: "Create an account",
    email: "Email",
    password: "Password",
    fullName: "Full name",
    pharmacyName: "Pharmacy name",
    submitLogin: "Sign in",
    submitSignup: "Create my account",
    forgot: "Forgot password?",
    noAccount: "No account yet?",
    hasAccount: "Already have an account?",
    toSignup: "Create an account",
    toLogin: "Sign in",
    or: "or",
  },
  status: {
    live: "Live data",
    demo: "Demo",
    toConnectTitle: "Feature to connect",
    remaining: "Still to connect",
  },
  overview: { title: "Overview", subtitle: "Your pharmacy's key indicators." },
  settings: { language: "Interface language" },
};

export default en;
