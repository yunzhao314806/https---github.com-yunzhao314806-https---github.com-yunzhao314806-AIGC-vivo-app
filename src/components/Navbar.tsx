import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../assets/Logo';
import { Menu, X } from 'lucide-react';
const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen) {
        const navbar = document.getElementById('mobile-menu');
        if (navbar && !navbar.contains(event.target as Node)) {
          setIsOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);
  return <nav className={`fixed top-0 left-0 right-0 w-full py-3 z-50 transition-all duration-300 ${isScrolled ? 'bg-white shadow-md' : 'bg-white border-b border-gray-200'}`}>
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <Logo variant="default" className="h-8" />
            </Link>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/offres" className="text-gray-700 hover:text-stages-blue hover:bg-stages-light-blue transition-colors px-3 py-2 rounded-md">
              实习职位
            </Link>
            <Link to="/entreprises" className="text-gray-700 hover:text-stages-blue hover:bg-stages-light-blue transition-colors px-3 py-2 rounded-md">
             合作伙伴
            </Link>
            <Link to="/about" className="text-gray-700 hover:text-stages-blue hover:bg-stages-light-blue transition-colors px-3 py-2 rounded-md">
               关于我们
            </Link>
          </div>

          

          <div className="md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="text-gray-700 hover:text-stages-blue focus:outline-none">
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {isOpen && <div id="mobile-menu" className="md:hidden bg-white py-4 px-4 shadow-lg animate-fade-in w-full absolute left-0">
          <div className="flex flex-col space-y-4">
            <Link to="/offres" className="text-gray-700 hover:text-stages-blue hover:bg-stages-light-blue transition-colors py-2 px-3 rounded-md" onClick={() => setIsOpen(false)}>
              实习职位
            </Link>
            <Link to="/entreprises" className="text-gray-700 hover:text-stages-blue hover:bg-stages-light-blue transition-colors py-2 px-3 rounded-md" onClick={() => setIsOpen(false)}>
              合作伙伴
            </Link>
            <Link to="/about" className="text-gray-700 hover:text-stages-blue hover:bg-stages-light-blue transition-colors py-2 px-3 rounded-md" onClick={() => setIsOpen(false)}>
              关于我们
            </Link>
          </div>
        </div>}
    </nav>;
};
export default Navbar;