import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../assets/Logo';
import { Linkedin, Facebook, Twitter } from 'lucide-react';
const Footer: React.FC = () => {
  return <footer className="bg-white border-t border-gray-200 pt-10 pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Logo and Description */}
          <div className="flex flex-col">
            <Logo variant="default" className="mb-3" />
            <p className="text-sm text-gray-600 max-w-xs">
              专业的实习机会平台，连接学生与企业，共建美好职业未来。
            </p>
            
          </div>

          {/* Pages */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">页面</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-sm text-gray-600 hover:text-stages-blue transition-colors">
                  首页
                </Link>
              </li>
              <li>
                <Link to="/offres" className="text-sm text-gray-600 hover:text-stages-blue transition-colors">
                  实习职位
                </Link>
              </li>
              <li>
                
              </li>
              <li>
                
              </li>
            </ul>
          </div>

          {/* Liens Utiles */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">有用链接</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/contact" className="text-sm text-gray-600 hover:text-stages-blue transition-colors">
                  联系我们
                </Link>
              </li>
              
              
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-200 pt-4">
          <p className="text-sm text-gray-600 text-center">
            © {new Date().getFullYear()} 实习网. 版权所有.
          </p>
        </div>
      </div>
    </footer>;
};
export default Footer;