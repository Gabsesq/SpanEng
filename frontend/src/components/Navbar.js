import React from "react";

const Navbar = ({ currentView, setView }) => {
  return (
    <nav className="navbar">
      <ul>
        <li
          className={currentView === "main" ? "active" : ""}
          onClick={() => setView("main")}
        >
          Main
        </li>
        <li
          className={currentView === "saved" ? "active" : ""}
          onClick={() => setView("saved")}
        >
          Saved Words
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;