import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = () => {
    const [collapsed, setCollapsed] = useState(false);
    const [curriculumOpen, setCurriculumOpen] = useState(false);
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const toggleSidebar = () => {
        setCollapsed(!collapsed);
        // Close curriculum menu when collapsing sidebar
        if (!collapsed) {
            setCurriculumOpen(false);
        }
    };

    const toggleCurriculum = (e) => {
        e.preventDefault();
        setCurriculumOpen(!curriculumOpen);
    };

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    return (
        <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
            <button className="toggle-btn" onClick={toggleSidebar}>
                {collapsed ? '→' : '←'}
            </button>
            
            {/* Logo and brand */}
            <div className="logo-container">
                <div className="brand-logo">
                    <img src="/favicon.svg" alt="AI Academia" className="brain-icon" />
                    {!collapsed && <span className="brand-name">AI Academia</span>}
                </div>
                {!collapsed && <p className="brand-tagline">The Tirana school of AI where we make the government of Albania more efficient</p>}
            </div>
            
            {/* User profile section */}
            <div className="user-profile">
                {user ? (
                    <div className="user-info">
                        <div className="user-avatar">
                            {user.username ? user.username.charAt(0).toUpperCase() : '?'}
                        </div>
                        {!collapsed && (
                            <div className="user-details">
                                <div className="user-name">{user.username} {user.surname}</div>
                                <div className="user-email">{user.email}</div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="user-info">
                        <div className="user-avatar">?</div>
                        {!collapsed && <div className="user-details">Not logged in</div>}
                    </div>
                )}
            </div>
            
            <ul className="main-menu">
                <li>
                    <Link to="/chat" className="menu-link">
                        <i className="icon-home"></i>
                        {!collapsed && <span>Home</span>}
                    </Link>
                </li>
                <li className={curriculumOpen ? 'active' : ''}>
                    <a href="#" className="menu-link" onClick={toggleCurriculum}>
                        <i className="icon-curriculum"></i>
                        {!collapsed && <span>Curriculum</span>}
                        {!collapsed && <i className={`icon-arrow ${curriculumOpen ? 'open' : ''}`}></i>}
                    </a>
                    {(curriculumOpen || collapsed) && (
                        <ul className={`submenu ${curriculumOpen ? 'open' : ''}`}>
                            <li>
                                <a href="#" className="menu-link">
                                    <i className="icon-module"></i>
                                    <span>Module 1</span>
                                </a>
                            </li>
                            <li>
                                <a href="#" className="menu-link">
                                    <i className="icon-module"></i>
                                    <span>Module 2</span>
                                </a>
                            </li>
                            <li>
                                <a href="#" className="menu-link">
                                    <i className="icon-module"></i>
                                    <span>Module 3</span>
                                </a>
                            </li>
                        </ul>
                    )}
                </li>
                {user ? (
                    <li>
                        <a href="#" className="menu-link" onClick={handleLogout}>
                            <i className="icon-logout"></i>
                            {!collapsed && <span>Logout</span>}
                        </a>
                    </li>
                ) : (
                    <>
                        <li>
                            <Link to="/login" className="menu-link">
                                <i className="icon-login"></i>
                                {!collapsed && <span>Login</span>}
                            </Link>
                        </li>
                        <li>
                            <Link to="/register" className="menu-link">
                                <i className="icon-register"></i>
                                {!collapsed && <span>Register</span>}
                            </Link>
                        </li>
                    </>
                )}
                <li>
                    <Link to="/settings" className="menu-link">
                        <i className="icon-settings"></i>
                        {!collapsed && <span>Settings</span>}
                    </Link>
                </li>
            </ul>
        </div>
    );
};

export default Sidebar;
