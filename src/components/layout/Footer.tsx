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
              <li>
                <Link href="/about" className="hover:underline">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/careers" className="hover:underline">
                  Careers
                </Link>
              </li>
              <li>
                <Link href="/press" className="hover:underline">
                  Press
                </Link>
              </li>
              <li>
                <Link href="/corporate" className="hover:underline">
                  Corporate Information
                </Link>
              </li>
            </ul>
          </div>

          {/* GROUP COMPANIES */}
          <div>
            <h3 className="text-[#878787] mb-4 font-medium text-xs">
              GROUP COMPANIES
            </h3>
            <ul className="space-y-2 text-xs font-medium">
              <li>
                <Link href="#" className="hover:underline">
                  SwitchCV Labs
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:underline">
                  SwitchCV Enterprise
                </Link>
              </li>
            </ul>
          </div>

          {/* HELP */}
          <div>
            <h3 className="text-[#878787] mb-4 font-medium text-xs">HELP</h3>
            <ul className="space-y-2 text-xs font-medium">
              <li>
                <Link href="/payments" className="hover:underline">
                  Payments
                </Link>
              </li>
              <li>
                <Link href="/shipping" className="hover:underline">
                  Shipping
                </Link>
              </li>
              <li>
                <Link href="/cancellation" className="hover:underline">
                  Cancellation & Returns
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:underline">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* CONSUMER POLICY */}
          <div>
            <h3 className="text-[#878787] mb-4 font-medium text-xs">
              CONSUMER POLICY
            </h3>
            <ul className="space-y-2 text-xs font-medium">
              <li>
                <Link href="/cancellation" className="hover:underline">
                  Cancellation & Returns
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:underline">
                  Terms Of Use
                </Link>
              </li>
              <li>
                <Link href="/security" className="hover:underline">
                  Security
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:underline">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/sitemap" className="hover:underline">
                  Sitemap
                </Link>
              </li>
            </ul>
          </div>

          {/* MAIL US & REGISTERED OFFICE */}
          <div className="lg:col-span-2 border-l border-[#454d5e] pl-8 hidden lg:block">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h3 className="text-[#878787] mb-4 font-medium text-xs">
                  Mail Us:
                </h3>
                <p className="text-xs leading-5 text-white">
                  SwitchCV Internet Private Limited,
                  <br />
                  Buildings Alyssa, Begonia &
                  <br />
                  Clove Embassy Tech Village,
                  <br />
                  Outer Ring Road, Devarabeesanahalli Village,
                  <br />
                  Bengaluru, 560103,
                  <br />
                  Karnataka, India
                </p>
                <div className="mt-6">
                  <h3 className="text-[#878787] mb-4 font-medium text-xs">
                    Social:
                  </h3>
                  <div className="flex space-x-4">
                    <Link href="#" className="hover:text-blue-400">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                      </svg>
                    </Link>
                    <Link href="#" className="hover:text-blue-400">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
                      </svg>
                    </Link>
                    <Link href="#" className="hover:text-red-500">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"></path>
                        <path d="m10 15 5-3-5-3z"></path>
                      </svg>
                    </Link>
                    <Link href="#" className="hover:text-pink-500">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect
                          width="20"
                          height="20"
                          x="2"
                          y="2"
                          rx="5"
                          ry="5"
                        ></rect>
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line>
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-[#878787] mb-4 font-medium text-xs">
                  Registered Office Address:
                </h3>
                <p className="text-xs leading-5 text-white">
                  SwitchCV Internet Private Limited,
                  <br />
                  Buildings Alyssa, Begonia &
                  <br />
                  Clove Embassy Tech Village,
                  <br />
                  Outer Ring Road, Devarabeesanahalli Village,
                  <br />
                  Bengaluru, 560103,
                  <br />
                  Karnataka, India
                  <br />
                  CIN : U51109KA2012PTC066107
                  <br />
                  Telephone: <span className="text-blue-500">044-45614700</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-[#454d5e] mt-12 pt-8 flex flex-col md:flex-row justify-between items-center text-xs">
          <div className="flex items-center space-x-4 mb-4 md:mb-0">
            <Link href="#" className="flex items-center gap-2 hover:underline">
              <span className="text-yellow-400">★</span> Become a Seller
            </Link>
            <Link href="#" className="flex items-center gap-2 hover:underline">
              <span className="text-yellow-400">★</span> Advertise
            </Link>
            <Link href="#" className="flex items-center gap-2 hover:underline">
              <span className="text-yellow-400">★</span> Gift Cards
            </Link>
            <Link href="#" className="flex items-center gap-2 hover:underline">
              <span className="text-yellow-400">★</span> Help Center
            </Link>
          </div>
          <div>© 2007-2025 SwitchCV.com</div>
        </div>
      </div>
    </footer>
  );
}
