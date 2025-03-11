import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Sidebar.css';

const Sidebar = () => {
    const [collapsed, setCollapsed] = useState(false);
    const [curriculumOpen, setCurriculumOpen] = useState(false);
    const { user } = useAuth();

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

    return (
        <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
            <button className="toggle-btn" onClick={toggleSidebar}>
                {collapsed ? '→' : '←'}
            </button>
            
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
                    <a href="#" className="menu-link">
                        <i className="icon-home"></i>
                        {!collapsed && <span>Home</span>}
                    </a>
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
                <li>
                    <a href="#" className="menu-link">
                        <i className="icon-settings"></i>
                        {!collapsed && <span>Settings</span>}
                    </a>
                </li>
            </ul>
        </div>
    );
};

export default Sidebar;
