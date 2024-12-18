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
        <li
          className={currentView === "journal" ? "active" : ""}
          onClick={() => setView("journal")}
        >
          Journal
        </li>
        <li
          className={currentView === "worksheet" ? "active" : ""}
          onClick={() => setView("worksheet")}
        >
          Worksheet
        </li>
        <li
          className={currentView === "vocabulary" ? "active" : ""}
          onClick={() => setView("vocabulary")}
        >
          Vocabulary
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;