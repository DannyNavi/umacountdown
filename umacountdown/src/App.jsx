import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css"
import HomePage from "./components/HomePage";
import BannerCountdown from "./components/BannerCountdown"
import OshiWars from "./components/OshiWars"
import TopBar from "./components/TopBar"
import Schwarma from "./components/Schwarma"
import Ozy from "./components/Ozy";
import Shaz from "./components/Shaz";
import Club from "./components/Club";
import Parent from "./components/Parent";
import VisitTracker from "./components/VisitTracker";

export default function App() {

  return (
    <div>
      <BrowserRouter>
      <header><TopBar/></header>
        <VisitTracker />
        <Routes>
          <Route path="/" element={<HomePage/>}/>
          <Route path="countdown" element={<BannerCountdown/>}/>
          <Route path="oshiwars" element={<OshiWars/>}/>
          <Route path="schwarma" element={<Schwarma/>}/>
          <Route path="ozy" element={<Ozy/>}/>
          <Route path="shaz" element={<Shaz/>}/>
          <Route path="club" element={<Club/>}/>
          <Route path="parent" element={<Parent/>}/>
          <Route path="parent/:id" element={<Parent/>}/>
        </Routes>
      </BrowserRouter>
    </div>
  );
}