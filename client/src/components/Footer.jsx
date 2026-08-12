export default function Footer() {
  return (
    <footer className="w-full bg-surface-container-low py-lg border-t border-outline-variant/30">
      <div className="max-w-7xl mx-auto px-gutter flex flex-col md:flex-row justify-between items-center gap-md">
        <div className="text-label-sm font-label-sm text-on-surface-variant">
          © 2026 IVORY AND GOLD EVENTS.INVOICE GENERATOR.
        {/* </div>
        <div className="flex gap-md">
          <a
            className="text-label-sm font-label-sm text-on-surface-variant hover:text-primary transition-colors"
            href="#"
          >
            Privacy Policy
          </a>
          <a
            className="text-label-sm font-label-sm text-on-surface-variant hover:text-primary transition-colors"
            href="#"
          >
            Support
          </a> */}
        </div>
      </div>
    </footer>
  );
}
