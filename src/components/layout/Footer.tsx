import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-[#172337] text-white py-12 text-sm mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
          {/* ABOUT */}
          <div>
            <h3 className="text-[#878787] mb-4 font-medium text-xs">ABOUT</h3>
            <ul className="space-y-2 text-xs font-medium">
              <li>
                <Link href="/contact" className="hover:underline">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[#454d5e] mt-12 pt-8 flex flex-col md:flex-row justify-between items-center text-xs">
          <div className="flex items-center space-x-4 mb-4 md:mb-0">
            <Link href="#" className="flex items-center gap-2 hover:underline">
              <span className="text-yellow-400">★</span> Help Center
            </Link>
          </div>
          <div>© 2025 SwitchCV.com</div>
        </div>
      </div>
    </footer>
  );
}
