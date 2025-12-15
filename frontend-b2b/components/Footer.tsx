import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-secondary-bg py-10">
      <div className="section-container">
        <div className="flex flex-col items-center text-center space-y-4">
          <Link href="/" className="text-base font-bold text-primary">
            Three-Body Entropy
          </Link>
          
          <p className="text-text-secondary text-sm">
            &copy; {new Date().getFullYear()} Three-Body Entropy Slots
          </p>
          
          <div className="flex items-center space-x-4">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-text-secondary text-text-secondary text-xs font-bold">
              18+
            </span>
            <span className="text-text-secondary text-xs">
              Play Responsibly
            </span>
          </div>
          
          <p className="text-text-secondary text-xs">
            Built with Three-Body Entropy RNG&trade;
          </p>
        </div>
      </div>
    </footer>
  );
}
