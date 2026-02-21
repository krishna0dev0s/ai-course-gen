import Link from "next/link";

const Footer = () => {
  return (
    <footer className="mt-10 border-t border-border/60 py-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 px-6 text-sm text-muted-foreground md:flex-row">
        <p>Built by Krishna Gupta</p>
        <div className="flex items-center gap-4">
          <Link href="https://github.com/krishna0dev0s" target="_blank" className="hover:text-foreground">
            GitHub
          </Link>
          <Link href="https://www.linkedin.com/in/krishna-gupta-9178192a1?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app" target="_blank" className="hover:text-foreground">
            LinkedIn
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
