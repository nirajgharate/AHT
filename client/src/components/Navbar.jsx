import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, CircleAlert, Clock3, Menu, Moon, Search, Sparkles, Sun, X } from "lucide-react";

const navLinks = [
  { title: "Summarize", href: "#summarize" },
  { title: "RAG Q&A", href: "#rag" },
  { title: "History", href: "#history" },
];

const statusCopy = {
  checking: {
    label: "Checking API",
    title: "Checking the Node API and MongoDB connection",
    icon: Clock3,
    className: "status-badge is-checking",
  },
  online: {
    label: "Storage online",
    title: "Node API is reachable. MongoDB connected when the server started.",
    icon: CheckCircle2,
    className: "status-badge is-online",
  },
  offline: {
    label: "API offline",
    title: "Start the Node server, then refresh this page.",
    icon: CircleAlert,
    className: "status-badge is-offline",
  },
};

export default function Navbar({ apiStatus = "checking", theme = "light", onToggleTheme }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const status = statusCopy[apiStatus] || statusCopy.checking;
  const StatusIcon = status.icon;
  const isDarkMode = theme === "dark";

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mobileMenuOpen]);

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`app-navbar fixed left-0 right-0 top-0 z-50 transition-all duration-300 ease-out ${
          isScrolled || mobileMenuOpen ? "is-scrolled py-3" : "py-5"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 md:px-12">
          <a href="#summarize" className="brand-lockup z-50" onClick={closeMobileMenu}>
            <span className="brand-mark">
              <Sparkles className="h-4 w-4" />
            </span>
            <span>AHT Summarizer</span>
          </a>

          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <a key={link.title} href={link.href} className="nav-link">
                {link.title}
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <button
              onClick={onToggleTheme}
              className="theme-toggle"
              aria-label={`Switch to ${isDarkMode ? "light" : "dark"} theme`}
              title={`Switch to ${isDarkMode ? "light" : "dark"} theme`}
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span>{isDarkMode ? "Light" : "Dark"}</span>
            </button>
            <span className={status.className} title={status.title}>
              <StatusIcon className="h-4 w-4" />
              {status.label}
            </span>
          </div>

          <div className="z-50 flex items-center gap-3 md:hidden">
            <button
              onClick={onToggleTheme}
              className="icon-button"
              aria-label={`Switch to ${isDarkMode ? "light" : "dark"} theme`}
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen((isOpen) => !isOpen)}
              className="icon-button"
              aria-label="Open navigation menu"
            >
              <AnimatePresence mode="wait">
                {mobileMenuOpen ? (
                  <motion.span
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <X className="h-6 w-6" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Menu className="h-6 w-6" />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </motion.nav>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="mobile-drawer fixed inset-0 z-40 flex flex-col px-6 pt-24 md:hidden"
          >
            <div className="mt-8 flex flex-col gap-6">
              {navLinks.map((link, i) => (
                <motion.a
                  key={link.title}
                  href={link.href}
                  onClick={closeMobileMenu}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.35, ease: "easeOut" }}
                  className="mobile-nav-link"
                >
                  {link.title === "RAG Q&A" ? <Search className="h-6 w-6" /> : null}
                  {link.title}
                </motion.a>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.35 }}
              className="mt-auto mb-12"
            >
              <span className={status.className} title={status.title}>
                <StatusIcon className="h-4 w-4" />
                {status.label}
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
