import wesker from "../images/weskerimpressed.png"
import { FaExternalLinkAlt } from "react-icons/fa";
import { useState } from "react";

import "./Shaz.css"

import creek from "../images/creek2.png"
import spark from "../images/spark.png"

export default function Shaz(){
    const [displayTierlist, setDisplayTierlist] = useState(false)
    const [showSpark, setShowSpark] = useState(false)
    const [openPDF, setOpenPDF] = useState(false)


    return(
        <div className="Schwarma-Container">
            <h1>Shaz's Parent Production Plant</h1>

            <div className="DocLinkContainer">
                <h2>Parent and Gene Doc</h2>
                <a className="external-link" href="https://docs.google.com/document/d/1Q3IJKbtkplmuY-PAJMNjYiLtasv0eU0aIBEqp8_C3tg/edit?tab=t.0">
                    <FaExternalLinkAlt />
                </a>
            </div>
            <div className="DocLinkContainer">
                <h2>Skills to Loop Doc</h2>
                <a className="external-link" href="https://docs.google.com/spreadsheets/d/1pWBnsoH2h7NDm9Q5ZRZ-s9JuyMN-aAI5wJbIEqACCt4/edit?usp=drivesdk">
                    <FaExternalLinkAlt />
                </a>
            </div>
            <div className="DocLinkContainer">
                <h2>Parent Math Video</h2>
                <a className="external-link" href="https://youtu.be/R5OgWmemd5A?si=z8GjoJ-CKAq0DwDm">
                    <FaExternalLinkAlt />
                </a>
            </div>
            <div>
                <img src={spark} width="500em"/>
            </div>

            
        </div>
    )
}