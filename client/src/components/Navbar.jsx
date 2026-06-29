import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Moon, Sparkles, Sun, X, LogOut } from "lucide-react";

const navLinks = [
  { title: "Text Summarizer", type: "tab", value: "text", href: "#summarize" },
  { title: "YouTube Summarizer", type: "tab", value: "youtube", href: "#summarize" },
  { title: "RAG Q&A", type: "scroll", href: "#rag" },
  { title: "History", type: "scroll", href: "#history" },
];


export default function Navbar({ apiStatus = "checking", theme = "light", onToggleTheme, userEmail, isAuthenticated, onLogout, activeTab, setActiveTab }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hoveredLink, setHoveredLink] = useState(null);
  
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
      <div className="fixed left-0 right-0 top-0 z-50 flex justify-center px-4 py-4 md:px-8">
        <motion.nav
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className={`w-full max-w-7xl rounded-full border transition-all duration-300 ${
            isScrolled
              ? "bg-[var(--nav-bg)] border-[var(--panel-border)] shadow-lg backdrop-blur-md py-2 px-6"
              : "bg-transparent border-transparent py-4 px-4"
          } flex items-center justify-between`}
        >
          {/* Brand Logo */}
          <a href="#summarize" className="brand-lockup z-50" onClick={closeMobileMenu}>
            <motion.span 
              whileHover={{ rotate: 15, scale: 1.08 }}
              className="brand-mark shadow-sm"
            >
              <Sparkles className="h-4 w-4 text-[var(--accent)]" />
            </motion.span>
            <span className="font-bold tracking-tight bg-gradient-to-r from-[var(--text)] to-[var(--subtle)] bg-clip-text">
              AHT Summarizer
            </span>
          </a>

          {/* Desktop Navigation Links */}
          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.title}
                href={link.href}
                onClick={() => {
                  if (link.type === "tab") {
                    setActiveTab(link.value);
                  }
                }}
                className="nav-link relative px-4 py-2 text-sm font-semibold transition-colors"
                onMouseEnter={() => setHoveredLink(link.title)}
                onMouseLeave={() => setHoveredLink(null)}
              >
                {(hoveredLink === link.title || (link.type === "tab" && activeTab === link.value)) && (
                  <motion.span
                    layoutId="nav-hover-pill"
                    className="absolute inset-0 -z-10 rounded-full bg-[var(--accent-soft)]"
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  />
                )}
                <span className={(hoveredLink === link.title || (link.type === "tab" && activeTab === link.value)) ? "text-[var(--accent-strong)]" : "text-[var(--subtle)]"}>
                  {link.title}
                </span>
              </a>
            ))}
          </div>

          {/* Desktop Right Actions */}
          <div className="hidden items-center gap-3 md:flex">
            {userEmail && (
              <div className="flex items-center gap-2 px-3 py-1 bg-[var(--accent-soft)] border border-[var(--panel-border)] rounded-full">
                <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
                <span className="text-xs font-semibold text-[var(--accent-strong)] max-w-[120px] truncate" title={userEmail}>
                  {userEmail.split("@")[0]}
                </span>
              </div>
            )}
            
            {isAuthenticated && (
              <button
                onClick={onLogout}
                className="theme-toggle flex items-center gap-1 hover:bg-[var(--danger-bg)] hover:text-[var(--danger-text)] hover:border-[var(--danger-border)] cursor-pointer"
                title="Log Out"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Log Out</span>
              </button>
            )}

            <button
              onClick={onToggleTheme}
              className="theme-toggle cursor-pointer"
              aria-label={`Switch to ${isDarkMode ? "light" : "dark"} theme`}
              title={`Switch to ${isDarkMode ? "light" : "dark"} theme`}
            >
              {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-500" />}
              <span>{isDarkMode ? "Light" : "Dark"}</span>
            </button>
          </div>

          {/* Mobile Actions Menu */}
          <div className="z-50 flex items-center gap-2 md:hidden">
            <button
              onClick={onToggleTheme}
              className="icon-button cursor-pointer"
              aria-label="Switch Theme"
            >
              {isDarkMode ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-indigo-500" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen((isOpen) => !isOpen)}
              className="icon-button cursor-pointer"
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
        </motion.nav>
      </div>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="mobile-drawer fixed inset-0 z-40 flex flex-col px-6 pt-24 md:hidden bg-[var(--app-bg)]/98 backdrop-blur-xl"
          >
            <div className="mt-8 flex flex-col gap-6">
              {navLinks.map((link, i) => (
                <motion.a
                  key={link.title}
                  href={link.href}
                  onClick={() => {
                    if (link.type === "tab") {
                      setActiveTab(link.value);
                    }
                    closeMobileMenu();
                  }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.35, ease: "easeOut" }}
                  className={`mobile-nav-link border-b border-[var(--panel-border)] pb-4 text-2xl font-bold hover:text-[var(--accent)] ${(link.type === "tab" && activeTab === link.value) ? "text-[var(--accent-strong)]" : "text-[var(--text)]"}`}
                >
                  {link.title}
                </motion.a>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.35 }}
              className="mt-auto mb-12 flex flex-col gap-4"
            >
              {isAuthenticated && (
                <div className="flex flex-col gap-2 p-4 bg-[var(--accent-soft)] rounded-2xl border border-[var(--panel-border)]">
                  {userEmail && (
                    <span className="text-xs font-semibold text-[var(--accent-strong)] text-center">
                      Signed in as {userEmail}
                    </span>
                  )}
                  <button
                    onClick={() => {
                      closeMobileMenu();
                      onLogout();
                    }}
                    className="theme-toggle w-full justify-center hover:bg-[var(--danger-bg)] hover:text-[var(--danger-text)] cursor-pointer"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Log Out
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
