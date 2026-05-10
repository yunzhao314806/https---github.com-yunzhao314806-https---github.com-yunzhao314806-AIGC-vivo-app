
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, LogOut, Settings, FileText, LayoutDashboard, Plus, Home, Bell, Users, ClipboardCheck ,Building } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UserType } from '../types/auth';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserMenuProps {
  userType?: UserType;
  userName?: string;
  userImage?: string;
}

const UserMenu: React.FC<UserMenuProps> = ({ 
  userType = null, 
  userName = "", 
  userImage = "" 
}) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  

  
  const handleLogout = () => {
    logout();
    navigate('/');
  };
  
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger className="flex items-center gap-2 focus:outline-none">
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
          {userImage ? (
            <img src={userImage} alt={userName} className="w-full h-full object-cover" />
          ) : (
            <User size={20} className="text-gray-500" />
          )}
        </div>
        <div className="flex items-center">
          <span className="text-gray-700 font-medium">{userName || "Utilisateur"}</span>
          <svg 
            className={`ml-1 h-4 w-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-white p-2 shadow-lg rounded-md border border-gray-200">
        {userType === 'company' && (
          <>
            <DropdownMenuItem asChild>
              <Link to="/entreprise/:name" className="flex items-center w-full">
                <User size={16} className="mr-2" />
                <span>Profil</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/entreprise/dashboard" className="flex items-center w-full">
                <LayoutDashboard size={16} className="mr-2" />
                <span>Tableau de bord</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/entreprise/publier-offre" className="flex items-center w-full">
                <Plus size={16} className="mr-2" />
                <span>Créer une offre</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/entreprise/candidats-recommandes" className="flex items-center w-full relative">
                <Users size={16} className="mr-2" />
                <span>Recommandations</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
          <Link to="/entreprise/parametres" className="flex items-center w-full">
            <Settings size={16} className="mr-2" />
            <span>Paramètres</span>
          </Link>
        </DropdownMenuItem>
          </>
        )}
        
        {userType === 'student' && (
          <>
            <DropdownMenuItem asChild>
              <Link to="/" className="flex items-center w-full">
                <Home size={16} className="mr-2" />
                <span>Accueil</span>
              </Link>
            </DropdownMenuItem>
            
            <DropdownMenuItem asChild>
              <Link to="/etudiant/dashboard" className="flex items-center w-full">
                <LayoutDashboard size={16} className="mr-2" />
                <span>Tableau de bord</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/etudiant/recommandations" className="flex items-center w-full">
                <Bell size={16} className="mr-2" />
                <span>Recommandations de stage</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
          <Link to="/etudiant/parametres" className="flex items-center w-full">
            <Settings size={16} className="mr-2" />
            <span>Paramètres</span>
          </Link>
        </DropdownMenuItem>
            </>
        )}
        

        {userType === 'admin' && (
          <>
            <DropdownMenuItem asChild>
              <Link to="/admin" className="flex items-center w-full">
                <LayoutDashboard size={16} className="mr-2" />
                <span>Tableau de bord Admin</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/admin/companies" className="flex items-center w-full">
                <Building size={16} className="mr-2" />
                <Building size={16} className="mr-2" />
                <span>Gestion des entreprises</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/admin/students" className="flex items-center w-full">
                <Users size={16} className="mr-2" />
                <span>Gestion des candidats</span>
                <Users size={16} className="mr-2" />
                <span>Gestion des candidats</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/admin/offers" className="flex items-center w-full">
                <FileText size={16} className="mr-2" />
                <span>Gestion des offres</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/admin/applications" className="flex items-center w-full">
                <ClipboardCheck size={16} className="mr-2" />
                <ClipboardCheck size={16} className="mr-2" />
                <span>Gestion des candidatures</span>
              </Link>
            </DropdownMenuItem>
          </>
        )}
        

        
        <DropdownMenuItem onClick={handleLogout} className="flex items-center w-full text-red-600">
          <LogOut size={16} className="mr-2" />
          <span>Déconnexion</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
